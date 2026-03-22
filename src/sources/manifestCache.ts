/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type { Manifest } from '../types/manifest.js';

/**
 * Cached manifest entry stored on disk.
 */
export type CachedManifestEntry = {
  /** The manifest data */
  manifest: Manifest;
  /** ISO timestamp when the manifest was cached */
  cachedAt: string;
  /** Whether the manifest was auto-discovered (no manifest.json in repo) */
  autoDiscovered: boolean;
  /** The repository identifier (owner/repo) */
  repo: string;
};

/**
 * Disk cache for repository manifests.
 * Stores cached manifests in ~/.sf/sf-aidev-manifests/ directory.
 */
export class ManifestCache {
  /** Name of the cache directory under ~/.sf/ */
  private static readonly CACHE_DIR = 'sf-aidev-manifests';

  /** Default staleness threshold in milliseconds (1 week) */
  private static readonly STALE_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;

  /** Override for testing - allows setting a custom cache directory */
  private static testCacheDir: string | undefined;

  /**
   * Set a custom cache directory for testing.
   *
   * @param dir - The directory to use, or undefined to use the default.
   */
  public static setTestCacheDir(dir: string | undefined): void {
    this.testCacheDir = dir;
  }

  /**
   * Get the cache directory path.
   * Uses ~/.sf/sf-aidev-manifests/ to match Salesforce CLI conventions.
   * In test mode, uses the test cache directory if set.
   */
  public static getCacheDir(): string {
    if (this.testCacheDir) {
      return this.testCacheDir;
    }
    return path.join(os.homedir(), '.sf', this.CACHE_DIR);
  }

  /**
   * Get the cache file path for a repository.
   * Converts owner/repo to owner__repo.json to avoid directory separators.
   *
   * @param repo - Repository in owner/repo format.
   * @returns The full path to the cache file.
   */
  public static getCachePath(repo: string): string {
    const safeKey = repo.replace('/', '__');
    return path.join(this.getCacheDir(), `${safeKey}.json`);
  }

  /**
   * Save a manifest to the disk cache.
   *
   * @param repo - Repository in owner/repo format.
   * @param manifest - The manifest to cache.
   * @param autoDiscovered - Whether the manifest was auto-discovered.
   */
  public static async save(repo: string, manifest: Manifest, autoDiscovered: boolean): Promise<void> {
    const cacheDir = this.getCacheDir();
    const cachePath = this.getCachePath(repo);

    // Ensure cache directory exists
    await fs.mkdir(cacheDir, { recursive: true });

    const entry: CachedManifestEntry = {
      manifest,
      cachedAt: new Date().toISOString(),
      autoDiscovered,
      repo,
    };

    await fs.writeFile(cachePath, JSON.stringify(entry, null, 2), 'utf-8');
  }

  /**
   * Load a manifest from the disk cache.
   *
   * @param repo - Repository in owner/repo format.
   * @returns The cached entry if it exists, undefined otherwise.
   */
  public static async load(repo: string): Promise<CachedManifestEntry | undefined> {
    const cachePath = this.getCachePath(repo);

    try {
      const content = await fs.readFile(cachePath, 'utf-8');
      const entry = JSON.parse(content) as CachedManifestEntry;

      // Validate the entry has required fields
      if (!entry.manifest || !entry.cachedAt || !entry.repo) {
        return undefined;
      }

      return entry;
    } catch {
      // File doesn't exist or is invalid
      return undefined;
    }
  }

  /**
   * Check if a cached manifest is stale (older than the threshold).
   *
   * @param repo - Repository in owner/repo format.
   * @param thresholdMs - Optional custom threshold in milliseconds.
   * @returns True if the cache is stale or doesn't exist, false otherwise.
   */
  public static async isStale(repo: string, thresholdMs: number = this.STALE_THRESHOLD_MS): Promise<boolean> {
    const entry = await this.load(repo);

    if (!entry) {
      return true;
    }

    const cachedAt = new Date(entry.cachedAt).getTime();
    const now = Date.now();

    return now - cachedAt > thresholdMs;
  }

  /**
   * Remove a cached manifest from disk.
   *
   * @param repo - Repository in owner/repo format.
   * @returns True if the file was removed, false if it didn't exist.
   */
  public static async remove(repo: string): Promise<boolean> {
    const cachePath = this.getCachePath(repo);

    try {
      await fs.unlink(cachePath);
      return true;
    } catch {
      // File doesn't exist
      return false;
    }
  }

  /**
   * List all cached repositories.
   *
   * @returns Array of repository names (owner/repo format).
   */
  public static async list(): Promise<string[]> {
    const cacheDir = this.getCacheDir();

    try {
      const files = await fs.readdir(cacheDir);
      return files.filter((file) => file.endsWith('.json')).map((file) => file.replace('.json', '').replace('__', '/'));
    } catch {
      // Directory doesn't exist
      return [];
    }
  }

  /**
   * Clear all cached manifests.
   *
   * @returns Number of cache entries removed.
   */
  public static async clear(): Promise<number> {
    const cacheDir = this.getCacheDir();

    try {
      const files = await fs.readdir(cacheDir);
      const jsonFiles = files.filter((file) => file.endsWith('.json'));

      await Promise.all(jsonFiles.map((file) => fs.unlink(path.join(cacheDir, file))));

      return jsonFiles.length;
    } catch {
      // Directory doesn't exist
      return 0;
    }
  }
}
