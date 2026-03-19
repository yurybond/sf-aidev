/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { SfError } from '@salesforce/core';
import { AiDevConfig } from '../config/aiDevConfig.js';
import { SourceConfig } from '../types/config.js';

/**
 * Manages source repository configurations.
 * Provides CRUD operations for source repos stored in AiDevConfig.
 */
export class SourceManager {
  /**
   * Create a new SourceManager.
   *
   * @param config - The AiDevConfig instance to use for storage.
   */
  public constructor(private config: AiDevConfig) {}

  /**
   * Validate repository format (owner/repo).
   */
  private static isValidRepoFormat(repo: string): boolean {
    // Basic format: owner/repo, with alphanumeric, hyphens, underscores
    return /^[\w.-]+\/[\w.-]+$/.test(repo);
  }

  /**
   * Add a new source repository.
   *
   * @param repo - Repository in owner/repo format.
   * @param setDefault - Whether to make this the default source.
   * @throws SfError if the source already exists.
   */
  public async add(repo: string, setDefault = false): Promise<void> {
    // Validate repo format
    if (!SourceManager.isValidRepoFormat(repo)) {
      throw new SfError(`Invalid repository format: ${repo}. Expected format: owner/repo`, 'InvalidRepoFormat', [
        'Use the format "owner/repo", for example: "salesforce/ai-dev-lifecycle"',
      ]);
    }

    // Check if already exists
    if (this.config.hasSource(repo)) {
      throw new SfError(`Source ${repo} already exists`, 'SourceAlreadyExists');
    }

    const source: SourceConfig = {
      repo,
      isDefault: setDefault,
      addedAt: new Date().toISOString(),
    };

    this.config.addSource(source);
    await this.config.write();
  }

  /**
   * Remove a source repository.
   *
   * @param repo - Repository in owner/repo format.
   * @throws SfError if the source doesn't exist.
   */
  public async remove(repo: string): Promise<void> {
    const removed = this.config.removeSource(repo);

    if (!removed) {
      throw new SfError(`Source ${repo} is not configured`, 'SourceNotFound');
    }

    await this.config.write();
  }

  /**
   * List all configured source repositories.
   *
   * @returns Array of source configurations.
   */
  public list(): SourceConfig[] {
    return this.config.getSources();
  }

  /**
   * Get the default source repository.
   *
   * @returns The default source, or undefined if none configured.
   */
  public getDefault(): SourceConfig | undefined {
    return this.config.getDefaultSource();
  }

  /**
   * Set a source as the default.
   *
   * @param repo - Repository in owner/repo format.
   * @throws SfError if the source doesn't exist.
   */
  public async setDefault(repo: string): Promise<void> {
    const success = this.config.setDefaultSource(repo);

    if (!success) {
      throw new SfError(`Source ${repo} is not configured`, 'SourceNotFound');
    }

    await this.config.write();
  }

  /**
   * Check if a repository is configured as a source.
   *
   * @param repo - Repository in owner/repo format.
   * @returns True if the source exists.
   */
  public has(repo: string): boolean {
    return this.config.hasSource(repo);
  }
}
