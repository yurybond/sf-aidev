/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { promises as fs } from 'node:fs';
import { AiDevConfig } from '../config/aiDevConfig.js';
import { DetectorRegistry } from '../detectors/registry.js';
import { AgentInstaller } from '../installers/agentInstaller.js';
import { PromptInstaller } from '../installers/promptInstaller.js';
import { SkillInstaller } from '../installers/skillInstaller.js';
import type { Installer } from '../installers/installer.js';
import { GitHubFetcher } from '../sources/gitHubFetcher.js';
import type { Artifact, ArtifactType, Manifest } from '../types/manifest.js';
import type { InstalledArtifact, SourceConfig } from '../types/config.js';

/**
 * Result of listing available artifacts from a source
 */
export interface AvailableArtifact {
  name: string;
  type: ArtifactType;
  description?: string;
  source: string;
  installed: boolean;
}

/**
 * Result of an installation operation
 */
export interface InstallResult {
  success: boolean;
  artifact: string;
  type: ArtifactType;
  tool: string;
  installedPath: string;
  error?: string;
}

/**
 * Options for listing artifacts
 */
export interface ListOptions {
  source?: string;
  type?: ArtifactType;
  tool?: string;
}

/**
 * Service layer for artifact operations.
 * Coordinates detection, fetching, and installation of AI tool artifacts.
 */
export class ArtifactService {
  private config: AiDevConfig;
  private projectPath: string;
  private fetcher: typeof GitHubFetcher;
  private installers: Map<ArtifactType, Installer>;
  private manifestCache: Map<string, Manifest> = new Map();

  public constructor(config: AiDevConfig, projectPath: string, fetcher: typeof GitHubFetcher = GitHubFetcher) {
    this.config = config;
    this.projectPath = projectPath;
    this.fetcher = fetcher;
    this.installers = new Map([
      ['skill', new SkillInstaller()],
      ['agent', new AgentInstaller()],
      ['prompt', new PromptInstaller()],
    ]);
  }

  /**
   * Detect AI tools in the project and optionally set the active tool
   */
  public async detectTools(setActive = false): Promise<string[]> {
    const detected = await DetectorRegistry.detectAll(this.projectPath);

    if (setActive && detected.length > 0) {
      // Prefer copilot if both detected, otherwise use first
      const tool = detected.includes('copilot') ? 'copilot' : detected[0];
      this.config.setTool(tool);
      await this.config.write();
    }

    return detected;
  }

  /**
   * Get the currently active tool
   */
  public getActiveTool(): string | undefined {
    return this.config.getTool();
  }

  /**
   * Set the active tool
   */
  public async setActiveTool(tool: string): Promise<void> {
    this.config.setTool(tool);
    await this.config.write();
  }

  /**
   * List available artifacts from configured sources
   */
  public async listAvailable(options: ListOptions = {}): Promise<AvailableArtifact[]> {
    const sources = this.config.getSources();
    const installed = this.config.getInstalledArtifacts();
    const activeTool = options.tool ?? this.config.getTool();

    const sourcesToQuery = options.source ? sources.filter((s) => s.repo === options.source) : sources;

    const perSource = await Promise.all(
      sourcesToQuery.map(async (source) => {
        try {
          const manifest = await this.getManifest(source);
          return manifest.artifacts
            .filter((artifact) => {
              if (options.type && artifact.type !== options.type) return false;
              if (activeTool && artifact.tools && !artifact.tools.includes(activeTool)) return false;
              return true;
            })
            .map((artifact) => ({
              name: artifact.name,
              type: artifact.type,
              description: artifact.description,
              source: source.repo,
              installed: installed.some(
                (i) => i.name === artifact.name && i.type === artifact.type && i.source === source.repo
              ),
            }));
        } catch {
          return [];
        }
      })
    );

    return perSource.flat();
  }

  /**
   * Install an artifact from a source
   */
  public async install(
    artifactName: string,
    options: { source?: string; type?: ArtifactType; tool?: string } = {}
  ): Promise<InstallResult> {
    const tool = options.tool ?? this.config.getTool();
    if (!tool) {
      return {
        success: false,
        artifact: artifactName,
        type: 'skill',
        tool: '',
        installedPath: '',
        error: 'No active tool configured. Run detect or set a tool first.',
      };
    }

    // Find the artifact in sources
    const { artifact, source } = await this.findArtifact(artifactName, options.source, options.type);

    if (!artifact || !source) {
      return {
        success: false,
        artifact: artifactName,
        type: options.type ?? 'skill',
        tool,
        installedPath: '',
        error: `Artifact "${artifactName}" not found in configured sources`,
      };
    }

    const installer = this.installers.get(artifact.type);
    if (!installer) {
      return {
        success: false,
        artifact: artifactName,
        type: artifact.type,
        tool,
        installedPath: '',
        error: `No installer for artifact type "${artifact.type}"`,
      };
    }

    try {
      const installedPath = await installer.install(artifact, tool, source.repo, this.projectPath, this.fetcher);

      // Record in config
      const installedArtifact: InstalledArtifact = {
        name: artifact.name,
        type: artifact.type,
        path: installedPath,
        source: source.repo,
        installedAt: new Date().toISOString(),
      };
      this.config.addInstalledArtifact(installedArtifact);
      await this.config.write();

      return {
        success: true,
        artifact: artifactName,
        type: artifact.type,
        tool,
        installedPath,
      };
    } catch (error) {
      return {
        success: false,
        artifact: artifactName,
        type: artifact.type,
        tool,
        installedPath: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Uninstall an artifact
   */
  public async uninstall(
    artifactName: string,
    options: { type?: ArtifactType; tool?: string } = {}
  ): Promise<{ success: boolean; error?: string }> {
    const tool = options.tool ?? this.config.getTool();
    if (!tool) {
      return {
        success: false,
        error: 'No active tool configured. Specify tool option or set active tool first.',
      };
    }

    const installed = this.config.getInstalledArtifacts();
    const record = installed.find((i) => i.name === artifactName && (!options.type || i.type === options.type));

    if (!record) {
      return {
        success: false,
        error: `Artifact "${artifactName}" is not installed`,
      };
    }

    const installer = this.installers.get(record.type);
    if (!installer) {
      return {
        success: false,
        error: `No installer for artifact type "${record.type}"`,
      };
    }

    try {
      await installer.uninstall(artifactName, tool, this.projectPath);
      this.config.removeInstalledArtifact(artifactName, record.type);
      await this.config.write();

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * List installed artifacts
   */
  public listInstalled(options: { type?: ArtifactType } = {}): InstalledArtifact[] {
    const installed = this.config.getInstalledArtifacts();

    if (options.type) {
      return installed.filter((i) => i.type === options.type);
    }

    return installed;
  }

  /**
   * Check if an artifact is installed
   */
  public isInstalled(name: string, type?: ArtifactType): boolean {
    const installed = this.config.getInstalledArtifacts();
    return installed.some((i) => i.name === name && (!type || i.type === type));
  }

  /**
   * Verify installed artifacts still exist on disk
   */
  public async verifyInstalled(): Promise<Array<{ artifact: InstalledArtifact; exists: boolean }>> {
    const installed = this.config.getInstalledArtifacts();

    return Promise.all(
      installed.map(async (artifact) => {
        let exists = true;
        try {
          await fs.access(artifact.path);
        } catch {
          exists = false;
        }
        return { artifact, exists };
      })
    );
  }

  /**
   * Clear the manifest cache
   */
  public clearCache(): void {
    this.manifestCache.clear();
  }

  private async getManifest(source: SourceConfig): Promise<Manifest> {
    const cacheKey = source.repo;

    if (this.manifestCache.has(cacheKey)) {
      return this.manifestCache.get(cacheKey)!;
    }

    const manifest = await this.fetcher.fetchManifest(source.repo);
    this.manifestCache.set(cacheKey, manifest);

    return manifest;
  }

  private async findArtifact(
    name: string,
    sourceRepo?: string,
    type?: ArtifactType
  ): Promise<{ artifact?: Artifact; source?: SourceConfig }> {
    const sources = this.config.getSources();
    const sourcesToSearch = sourceRepo ? sources.filter((s) => s.repo === sourceRepo) : sources;

    for (const source of sourcesToSearch) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const manifest = await this.getManifest(source);
        const artifact = manifest.artifacts.find((a) => a.name === name && (!type || a.type === type));

        if (artifact) {
          return { artifact, source };
        }
      } catch {
        continue;
      }
    }

    return {};
  }
}
