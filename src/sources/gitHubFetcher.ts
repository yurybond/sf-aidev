/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import got, { HTTPError, RequestError } from 'got';
import { SfError } from '@salesforce/core';
import { Manifest } from '../types/manifest.js';

/**
 * GitHub Trees API tree entry.
 */
type TreeEntry = {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
};

/**
 * GitHub Trees API response.
 */
type TreeResponse = {
  sha: string;
  url: string;
  tree: TreeEntry[];
  truncated: boolean;
};

/**
 * Fetches files and manifests from GitHub repositories using raw.githubusercontent.com.
 */
export class GitHubFetcher {
  /**
   * Base URL for GitHub raw content.
   */
  private static readonly BASE_URL = 'https://raw.githubusercontent.com';

  /**
   * Request timeout in milliseconds.
   */
  private static readonly TIMEOUT = 10_000;

  /**
   * Fetch and parse the manifest.json from a source repository.
   *
   * @param repo - Repository in owner/repo format.
   * @param branch - Branch name (default: 'main').
   * @returns The parsed manifest.
   * @throws SfError if the manifest is not found or invalid.
   */
  public static async fetchManifest(repo: string, branch = 'main'): Promise<Manifest> {
    const url = `${this.BASE_URL}/${repo}/${branch}/manifest.json`;

    try {
      const response = await got(url, {
        timeout: { request: this.TIMEOUT },
        retry: { limit: 2 },
      }).json<Manifest>();

      // Validate manifest structure
      if (!response.version || !Array.isArray(response.artifacts)) {
        throw new SfError(
          `Invalid manifest structure in ${repo}. Expected 'version' and 'artifacts' fields.`,
          'InvalidManifest'
        );
      }

      return response;
    } catch (error) {
      if (error instanceof SfError) {
        throw error;
      }

      if (error instanceof HTTPError && error.response.statusCode === 404) {
        throw new SfError(
          `Manifest not found in repository ${repo}. Ensure manifest.json exists in the root of the ${branch} branch.`,
          'ManifestNotFound'
        );
      }

      if (error instanceof RequestError) {
        throw new SfError(`Network error while fetching manifest from ${repo}: ${error.message}`, 'NetworkError');
      }

      throw new SfError(`Failed to fetch manifest from ${repo}: ${(error as Error).message}`, 'FetchError');
    }
  }

  /**
   * Fetch a file's content from a source repository.
   *
   * @param repo - Repository in owner/repo format.
   * @param path - Path to the file within the repository.
   * @param branch - Branch name (default: 'main').
   * @returns The file content as a string.
   * @throws SfError if the file is not found.
   */
  public static async fetchFile(repo: string, path: string, branch = 'main'): Promise<string> {
    const url = `${this.BASE_URL}/${repo}/${branch}/${path}`;

    try {
      const response = await got(url, {
        timeout: { request: this.TIMEOUT },
        retry: { limit: 2 },
      }).text();

      return response;
    } catch (error) {
      if (error instanceof HTTPError && error.response.statusCode === 404) {
        throw new SfError(`File not found: ${path} in repository ${repo}`, 'FileNotFound');
      }

      if (error instanceof RequestError) {
        throw new SfError(`Network error while fetching ${path} from ${repo}: ${error.message}`, 'NetworkError');
      }

      throw new SfError(`Failed to fetch ${path} from ${repo}: ${(error as Error).message}`, 'FetchError');
    }
  }

  /**
   * Build the raw GitHub URL for a file.
   *
   * @param repo - Repository in owner/repo format.
   * @param path - Path to the file within the repository.
   * @param branch - Branch name (default: 'main').
   * @returns The full URL.
   */
  public static buildUrl(repo: string, path: string, branch = 'main'): string {
    return `${this.BASE_URL}/${repo}/${branch}/${path}`;
  }

  /**
   * Fetch the file tree from a GitHub repository using the Trees API.
   *
   * @param repo - Repository in owner/repo format.
   * @param branch - Branch name (default: 'main').
   * @returns Array of file paths (blobs only, not directories).
   * @throws SfError if the repo is not found or rate limited.
   */
  public static async fetchRepoTree(repo: string, branch = 'main'): Promise<string[]> {
    const url = `https://api.github.com/repos/${repo}/git/trees/${branch}?recursive=1`;

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'sf-aidev',
    };

    // Use GITHUB_TOKEN if available for higher rate limits
    const token = process.env.GITHUB_TOKEN;
    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    try {
      const response = await got(url, {
        timeout: { request: this.TIMEOUT },
        retry: { limit: 2 },
        headers,
      }).json<TreeResponse>();

      // Filter to only blob (file) entries
      return response.tree.filter((entry) => entry.type === 'blob').map((entry) => entry.path);
    } catch (error) {
      if (error instanceof HTTPError) {
        if (error.response.statusCode === 404) {
          throw new SfError(`Repository "${repo}" not found or branch "${branch}" does not exist.`, 'RepoNotFound');
        }
        if (error.response.statusCode === 403) {
          throw new SfError(
            'GitHub API rate limit exceeded. Set GITHUB_TOKEN environment variable for higher limits.',
            'RateLimitExceeded'
          );
        }
      }

      if (error instanceof RequestError) {
        throw new SfError(`Network error while fetching repo tree from ${repo}: ${error.message}`, 'NetworkError');
      }

      throw new SfError(`Failed to fetch repo tree from ${repo}: ${(error as Error).message}`, 'FetchError');
    }
  }
}
