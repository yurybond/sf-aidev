/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { AiDevConfig } from '../config/aiDevConfig.js';
import { GitHubFetcher } from '../sources/gitHubFetcher.js';
import { SourceManager } from '../sources/sourceManager.js';
import type { Manifest } from '../types/manifest.js';
import type { SourceConfig } from '../types/config.js';

/**
 * Health check result for a source
 */
export interface SourceHealth {
  repo: string;
  healthy: boolean;
  artifactCount?: number;
  error?: string;
  lastChecked: string;
}

/**
 * Result of adding a source
 */
export interface AddSourceResult {
  success: boolean;
  source?: SourceConfig;
  manifest?: Manifest;
  error?: string;
}

/**
 * Service layer for source repository operations.
 * Provides high-level operations with validation and health checks.
 */
export class SourceService {
  private manager: SourceManager;
  private config: AiDevConfig;
  private fetcher: typeof GitHubFetcher;
  private healthCache: Map<string, SourceHealth> = new Map();

  public constructor(config: AiDevConfig, fetcher: typeof GitHubFetcher = GitHubFetcher) {
    this.config = config;
    this.fetcher = fetcher;
    this.manager = new SourceManager(config);
  }

  /**
   * Add a source with validation
   * Verifies the source has a valid manifest before adding
   */
  public async add(
    repo: string,
    options: { isDefault?: boolean; skipValidation?: boolean } = {}
  ): Promise<AddSourceResult> {
    // Check if already exists
    if (this.manager.has(repo)) {
      return {
        success: false,
        error: `Source "${repo}" is already configured`,
      };
    }

    // Validate manifest exists unless skipped
    let manifest: Manifest | undefined;
    if (!options.skipValidation) {
      try {
        manifest = await this.fetcher.fetchManifest(repo);
      } catch (error) {
        return {
          success: false,
          error: `Failed to fetch manifest from "${repo}": ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    }

    try {
      await this.manager.add(repo, options.isDefault);

      const source = this.config.getSources().find((s) => s.repo === repo);
      return {
        success: true,
        source,
        manifest,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Remove a source
   */
  public async remove(repo: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.manager.remove(repo);
      this.healthCache.delete(repo);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * List all configured sources
   */
  public list(): SourceConfig[] {
    return this.manager.list();
  }

  /**
   * Get the default source
   */
  public getDefault(): SourceConfig | undefined {
    return this.manager.getDefault();
  }

  /**
   * Set the default source
   */
  public async setDefault(repo: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.manager.setDefault(repo);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Check if a source exists
   */
  public has(repo: string): boolean {
    return this.manager.has(repo);
  }

  /**
   * Check health of a source
   */
  public async checkHealth(repo: string): Promise<SourceHealth> {
    const source = this.config.getSources().find((s) => s.repo === repo);

    if (!source) {
      return {
        repo,
        healthy: false,
        error: 'Source not configured',
        lastChecked: new Date().toISOString(),
      };
    }

    try {
      const manifest = await this.fetcher.fetchManifest(repo);
      const health: SourceHealth = {
        repo,
        healthy: true,
        artifactCount: manifest.artifacts.length,
        lastChecked: new Date().toISOString(),
      };

      this.healthCache.set(repo, health);
      return health;
    } catch (error) {
      const health: SourceHealth = {
        repo,
        healthy: false,
        error: error instanceof Error ? error.message : String(error),
        lastChecked: new Date().toISOString(),
      };

      this.healthCache.set(repo, health);
      return health;
    }
  }

  /**
   * Check health of all configured sources
   */
  public async checkAllHealth(): Promise<SourceHealth[]> {
    const sources = this.config.getSources();
    return Promise.all(sources.map((source) => this.checkHealth(source.repo)));
  }

  /**
   * Get cached health status
   */
  public getCachedHealth(repo: string): SourceHealth | undefined {
    return this.healthCache.get(repo);
  }

  /**
   * Fetch manifest from a source
   */
  public async fetchManifest(repo: string): Promise<Manifest> {
    const source = this.config.getSources().find((s) => s.repo === repo);

    if (!source) {
      throw new Error(`Source "${repo}" is not configured`);
    }

    return this.fetcher.fetchManifest(repo);
  }

  /**
   * Clear health cache
   */
  public clearHealthCache(): void {
    this.healthCache.clear();
  }
}
