/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { Args } from '@oclif/core';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages, SfError } from '@salesforce/core';
import { AiDevConfig } from '../../../config/aiDevConfig.js';
import { GitHubFetcher } from '../../../sources/gitHubFetcher.js';
import { ManifestBuilder } from '../../../sources/manifestBuilder.js';
import { ManifestCache } from '../../../sources/manifestCache.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('sf-aidev', 'aidev.source.refresh');

/**
 * Result of refreshing a single source.
 */
export type RefreshSourceResult = {
  repo: string;
  success: boolean;
  artifactCount: number;
  autoDiscovered: boolean;
  error?: string;
};

/**
 * Result of the refresh command.
 */
export type SourceRefreshResult = {
  refreshed: RefreshSourceResult[];
  successCount: number;
  failedCount: number;
};

export default class SourceRefresh extends SfCommand<SourceRefreshResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly enableJsonFlag = true;

  public static readonly args = {
    repo: Args.string({
      description: messages.getMessage('args.repo.summary'),
      required: false,
    }),
  };

  public static readonly flags = {
    repo: Flags.string({
      char: 'r',
      summary: messages.getMessage('flags.repo.summary'),
      required: false,
    }),
  };

  public async run(): Promise<SourceRefreshResult> {
    const { args, flags } = await this.parse(SourceRefresh);

    // Resolve repo from positional arg or flag
    const targetRepo = args.repo ?? flags.repo;

    const config: AiDevConfig = await AiDevConfig.create({ isGlobal: true });
    const sources = config.getSources();

    if (sources.length === 0) {
      throw new SfError(messages.getMessage('error.NoSourcesConfigured'), 'NoSourcesConfiguredError');
    }

    // Filter to specific repo if provided
    const sourcesToRefresh = targetRepo ? sources.filter((s) => s.repo === targetRepo) : sources;

    if (targetRepo && sourcesToRefresh.length === 0) {
      throw new SfError(messages.getMessage('error.RepoNotConfigured', [targetRepo]), 'RepoNotConfiguredError');
    }

    if (sourcesToRefresh.length === 1) {
      this.log(messages.getMessage('info.RefreshingSingle', [sourcesToRefresh[0].repo]));
    } else {
      this.log(messages.getMessage('info.RefreshingAll', [sourcesToRefresh.length]));
    }

    const results: RefreshSourceResult[] = [];

    for (const source of sourcesToRefresh) {
      // eslint-disable-next-line no-await-in-loop
      const result = await this.refreshSource(source.repo);
      results.push(result);

      if (result.success) {
        if (result.autoDiscovered) {
          this.log(messages.getMessage('info.RefreshSuccessAutoDiscovered', [result.repo, result.artifactCount]));
        } else {
          this.log(messages.getMessage('info.RefreshSuccess', [result.repo, result.artifactCount]));
        }
      } else {
        this.warn(messages.getMessage('info.RefreshFailed', [result.repo, result.error ?? 'Unknown error']));
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    if (sourcesToRefresh.length > 1) {
      this.log(messages.getMessage('info.Summary', [successCount, sourcesToRefresh.length]));
    }

    return {
      refreshed: results,
      successCount,
      failedCount,
    };
  }

  /**
   * Refresh a single source repository.
   */
  // eslint-disable-next-line class-methods-use-this
  private async refreshSource(repo: string): Promise<RefreshSourceResult> {
    try {
      // First, try to fetch manifest.json from GitHub
      const manifest = await GitHubFetcher.fetchManifest(repo);

      // Save to disk cache
      await ManifestCache.save(repo, manifest, false);

      return {
        repo,
        success: true,
        artifactCount: manifest.artifacts.length,
        autoDiscovered: false,
      };
    } catch (error) {
      // Check if it's a ManifestNotFound error - try auto-discovery
      if (error instanceof SfError && error.name === 'ManifestNotFound') {
        try {
          const filePaths = await GitHubFetcher.fetchRepoTree(repo);
          const manifest = ManifestBuilder.build(filePaths);

          // Save to disk cache (even if empty, so we know we tried)
          await ManifestCache.save(repo, manifest, true);

          return {
            repo,
            success: true,
            artifactCount: manifest.artifacts.length,
            autoDiscovered: true,
          };
        } catch (treeError) {
          return {
            repo,
            success: false,
            artifactCount: 0,
            autoDiscovered: false,
            error: treeError instanceof Error ? treeError.message : String(treeError),
          };
        }
      }

      return {
        repo,
        success: false,
        artifactCount: 0,
        autoDiscovered: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
