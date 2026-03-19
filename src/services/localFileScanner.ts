/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { readdir, stat } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { PathResolver } from '../installers/pathResolver.js';
import type { ArtifactType } from '../types/manifest.js';

/**
 * Represents a locally scanned artifact.
 */
export type ScannedArtifact = {
  /** Name of the artifact */
  name: string;
  /** Type of artifact */
  type: ArtifactType | 'instruction';
  /** Whether the artifact is installed locally (always true for scanned artifacts) */
  installed: boolean;
  /** Path where the artifact was found */
  path: string;
};

/**
 * Represents a locally scanned instruction file.
 */
export type ScannedInstruction = {
  /** File name */
  name: string;
  /** Type is always 'instruction' */
  type: 'instruction';
  /** Always true for local files */
  installed: boolean;
  /** Full path to the file */
  path: string;
};

/**
 * Result of merging local and manifest artifacts.
 */
export type MergedArtifact = {
  /** Name of the artifact */
  name: string;
  /** Type of artifact */
  type: ArtifactType | 'instruction';
  /** Whether the artifact is installed locally */
  installed: boolean;
  /** Description from manifest (if available) */
  description?: string;
  /** Source repository (if from manifest) */
  source?: string;
};

/**
 * Grouped artifacts by type for display.
 */
export type GroupedArtifacts = {
  agents: MergedArtifact[];
  skills: MergedArtifact[];
  prompts: MergedArtifact[];
  instructions: MergedArtifact[];
};

/**
 * Known instruction file patterns.
 */
const INSTRUCTION_PATTERNS = ['CLAUDE.md', 'CURSOR.md', 'CODEX.md', 'copilot-instructions.md'];

/**
 * Glob pattern for *.instructions.md files.
 */
const INSTRUCTION_SUFFIX = '.instructions.md';

/**
 * Supported tools for artifact scanning.
 */
const SUPPORTED_TOOLS = ['copilot', 'claude'];

/**
 * Service for scanning local project files to discover artifacts.
 */
export class LocalFileScanner {
  /**
   * Scan for all agent artifacts across all supported tools.
   *
   * @param projectPath - Absolute path to the project root.
   * @returns Array of scanned agent artifacts.
   */
  public static async scanAgents(projectPath: string): Promise<ScannedArtifact[]> {
    return this.scanArtifactType(projectPath, 'agent');
  }

  /**
   * Scan for all skill artifacts across all supported tools.
   *
   * @param projectPath - Absolute path to the project root.
   * @returns Array of scanned skill artifacts.
   */
  public static async scanSkills(projectPath: string): Promise<ScannedArtifact[]> {
    return this.scanArtifactType(projectPath, 'skill');
  }

  /**
   * Scan for all prompt artifacts across all supported tools.
   *
   * @param projectPath - Absolute path to the project root.
   * @returns Array of scanned prompt artifacts.
   */
  public static async scanPrompts(projectPath: string): Promise<ScannedArtifact[]> {
    return this.scanArtifactType(projectPath, 'prompt');
  }

  /**
   * Scan for instruction files (CLAUDE.md, *.instructions.md, etc.).
   *
   * @param projectPath - Absolute path to the project root.
   * @returns Array of scanned instruction files.
   */
  public static async scanInstructions(projectPath: string): Promise<ScannedInstruction[]> {
    const instructions: ScannedInstruction[] = [];

    // Check for known instruction files in root and common directories
    const searchPaths = [projectPath, join(projectPath, '.github'), join(projectPath, '.claude')];

    for (const searchPath of searchPaths) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const entries = await readdir(searchPath);

        for (const entry of entries) {
          if (this.isInstructionFile(entry)) {
            const fullPath = join(searchPath, entry);
            // eslint-disable-next-line no-await-in-loop
            const fileStat = await stat(fullPath);
            if (fileStat.isFile()) {
              instructions.push({
                name: entry,
                type: 'instruction',
                installed: true,
                path: fullPath,
              });
            }
          }
        }
      } catch {
        // Directory doesn't exist, skip
      }
    }

    // Deduplicate by name (prefer root location)
    const seen = new Set<string>();
    return instructions.filter((instr) => {
      if (seen.has(instr.name)) {
        return false;
      }
      seen.add(instr.name);
      return true;
    });
  }

  /**
   * Scan for all artifacts (agents, skills, prompts) across all tools.
   *
   * @param projectPath - Absolute path to the project root.
   * @returns Array of all scanned artifacts.
   */
  public static async scanAll(projectPath: string): Promise<ScannedArtifact[]> {
    const [agents, skills, prompts] = await Promise.all([
      this.scanAgents(projectPath),
      this.scanSkills(projectPath),
      this.scanPrompts(projectPath),
    ]);

    return [...agents, ...skills, ...prompts];
  }

  /**
   * Merge local artifacts with manifest available artifacts.
   * Deduplicates by name+type, keeping local (installed) entries.
   *
   * @param localArtifacts - Artifacts found locally.
   * @param manifestArtifacts - Artifacts from source manifests.
   * @returns Merged and deduplicated list.
   */
  public static mergeArtifacts(
    localArtifacts: ScannedArtifact[],
    manifestArtifacts: Array<{
      name: string;
      type: ArtifactType;
      description?: string;
      source: string;
      installed: boolean;
    }>
  ): MergedArtifact[] {
    const merged: MergedArtifact[] = [];
    const seen = new Set<string>();

    // Add all local artifacts first (they take precedence)
    for (const local of localArtifacts) {
      const key = `${local.type}:${local.name}`;
      if (!seen.has(key)) {
        seen.add(key);
        // Try to find description from manifest
        const manifestMatch = manifestArtifacts.find((m) => m.name === local.name && m.type === local.type);
        merged.push({
          name: local.name,
          type: local.type,
          installed: true,
          description: manifestMatch?.description,
          source: manifestMatch?.source,
        });
      }
    }

    // Add manifest artifacts that aren't already installed
    for (const manifest of manifestArtifacts) {
      const key = `${manifest.type}:${manifest.name}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push({
          name: manifest.name,
          type: manifest.type,
          installed: false,
          description: manifest.description,
          source: manifest.source,
        });
      }
    }

    return merged;
  }

  /**
   * Group artifacts by type for display.
   *
   * @param artifacts - Array of merged artifacts.
   * @param instructions - Array of instruction files.
   * @returns Grouped artifacts object.
   */
  public static groupByType(artifacts: MergedArtifact[], instructions: ScannedInstruction[] = []): GroupedArtifacts {
    const groups: GroupedArtifacts = {
      agents: [],
      skills: [],
      prompts: [],
      instructions: [],
    };

    for (const artifact of artifacts) {
      switch (artifact.type) {
        case 'agent':
          groups.agents.push(artifact);
          break;
        case 'skill':
          groups.skills.push(artifact);
          break;
        case 'prompt':
          groups.prompts.push(artifact);
          break;
        default:
          break;
      }
    }

    // Add instructions
    groups.instructions = instructions.map((instr) => ({
      name: instr.name,
      type: 'instruction' as const,
      installed: true,
    }));

    // Sort each group alphabetically
    groups.agents.sort((a, b) => a.name.localeCompare(b.name));
    groups.skills.sort((a, b) => a.name.localeCompare(b.name));
    groups.prompts.sort((a, b) => a.name.localeCompare(b.name));
    groups.instructions.sort((a, b) => a.name.localeCompare(b.name));

    return groups;
  }

  /**
   * Scan for a specific artifact type across all supported tools.
   */
  private static async scanArtifactType(projectPath: string, type: ArtifactType): Promise<ScannedArtifact[]> {
    const artifacts: ScannedArtifact[] = [];
    const seen = new Set<string>();

    for (const tool of SUPPORTED_TOOLS) {
      try {
        const basePath = PathResolver.getBasePath(type, tool);
        const fullPath = join(projectPath, basePath);

        // eslint-disable-next-line no-await-in-loop
        const entries = await readdir(fullPath);

        for (const entry of entries) {
          // Get artifact name from file/directory
          const name = this.getArtifactName(entry, type);

          if (!seen.has(name)) {
            seen.add(name);
            artifacts.push({
              name,
              type,
              installed: true,
              path: join(fullPath, entry),
            });
          }
        }
      } catch {
        // Directory doesn't exist for this tool, skip
      }
    }

    return artifacts;
  }

  /**
   * Extract artifact name from filename/dirname.
   * For skills, removes .md extension.
   */
  private static getArtifactName(entry: string, type: ArtifactType): string {
    if (type === 'skill' && entry.endsWith('.md')) {
      return basename(entry, '.md');
    }
    return entry;
  }

  /**
   * Check if a filename matches instruction file patterns.
   */
  private static isInstructionFile(filename: string): boolean {
    if (INSTRUCTION_PATTERNS.includes(filename)) {
      return true;
    }
    if (filename.endsWith(INSTRUCTION_SUFFIX)) {
      return true;
    }
    return false;
  }
}
