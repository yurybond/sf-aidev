/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { expect } from 'chai';
import sinon from 'sinon';
import { ManifestCache, type CachedManifestEntry } from '../../src/sources/manifestCache.js';
import type { Manifest } from '../../src/types/manifest.js';

describe('ManifestCache', () => {
  let sandbox: sinon.SinonSandbox;
  let tempCacheDir: string;

  const testManifest: Manifest = {
    version: '1.0.0',
    artifacts: [
      {
        name: 'test-skill',
        type: 'skill',
        description: 'A test skill',
        files: [{ source: 'skills/test.md' }],
      },
      {
        name: 'test-agent',
        type: 'agent',
        description: 'A test agent',
        files: [{ source: 'agents/test.agent.md' }],
      },
    ],
  };

  beforeEach(async () => {
    sandbox = sinon.createSandbox();
    tempCacheDir = path.join(process.cwd(), '.test-manifest-cache-' + Date.now());
    await fs.mkdir(tempCacheDir, { recursive: true });

    // Use test cache directory
    ManifestCache.setTestCacheDir(tempCacheDir);
  });

  afterEach(async () => {
    sandbox.restore();
    ManifestCache.setTestCacheDir(undefined);
    try {
      await fs.rm(tempCacheDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('getCacheDir', () => {
    it('returns correct cache directory path', () => {
      const cacheDir = ManifestCache.getCacheDir();
      // tempCacheDir is set as the test cache directory
      expect(cacheDir).to.equal(tempCacheDir);
    });
  });

  describe('getCachePath', () => {
    it('converts repo to safe filename', () => {
      const cachePath = ManifestCache.getCachePath('owner/repo');
      expect(cachePath).to.include('owner__repo.json');
    });

    it('handles repos with special characters', () => {
      const cachePath = ManifestCache.getCachePath('my-org/my-repo');
      expect(cachePath).to.include('my-org__my-repo.json');
    });
  });

  describe('save', () => {
    it('saves manifest to disk', async () => {
      await ManifestCache.save('owner/repo', testManifest, false);

      const cachePath = ManifestCache.getCachePath('owner/repo');
      const content = await fs.readFile(cachePath, 'utf-8');
      const entry = JSON.parse(content) as CachedManifestEntry;

      expect(entry.manifest).to.deep.equal(testManifest);
      expect(entry.repo).to.equal('owner/repo');
      expect(entry.autoDiscovered).to.be.false;
      expect(entry.cachedAt).to.be.a('string');
    });

    it('saves auto-discovered manifest', async () => {
      await ManifestCache.save('owner/repo', testManifest, true);

      const entry = await ManifestCache.load('owner/repo');
      expect(entry?.autoDiscovered).to.be.true;
    });

    it('creates cache directory if it does not exist', async () => {
      // Use a non-existent subdirectory for this test
      const nonExistentDir = path.join(tempCacheDir, 'nested', 'cache');
      ManifestCache.setTestCacheDir(nonExistentDir);

      const cacheDir = ManifestCache.getCacheDir();

      // Verify directory doesn't exist
      try {
        await fs.access(cacheDir);
        expect.fail('Directory should not exist');
      } catch {
        // Expected
      }

      await ManifestCache.save('owner/repo', testManifest, false);

      // Verify directory was created
      const stat = await fs.stat(cacheDir);
      expect(stat.isDirectory()).to.be.true;

      // Reset to normal test cache dir
      ManifestCache.setTestCacheDir(tempCacheDir);
    });

    it('overwrites existing cache', async () => {
      await ManifestCache.save('owner/repo', testManifest, false);

      const updatedManifest: Manifest = {
        version: '2.0.0',
        artifacts: [],
      };
      await ManifestCache.save('owner/repo', updatedManifest, true);

      const entry = await ManifestCache.load('owner/repo');
      expect(entry?.manifest.version).to.equal('2.0.0');
      expect(entry?.autoDiscovered).to.be.true;
    });
  });

  describe('load', () => {
    it('loads cached manifest', async () => {
      await ManifestCache.save('owner/repo', testManifest, false);

      const entry = await ManifestCache.load('owner/repo');

      expect(entry).to.not.be.undefined;
      expect(entry?.manifest).to.deep.equal(testManifest);
      expect(entry?.repo).to.equal('owner/repo');
    });

    it('returns undefined for non-existent cache', async () => {
      const entry = await ManifestCache.load('nonexistent/repo');
      expect(entry).to.be.undefined;
    });

    it('returns undefined for invalid JSON', async () => {
      const cacheDir = ManifestCache.getCacheDir();
      await fs.mkdir(cacheDir, { recursive: true });
      await fs.writeFile(path.join(cacheDir, 'invalid__repo.json'), 'not valid json', 'utf-8');

      const entry = await ManifestCache.load('invalid/repo');
      expect(entry).to.be.undefined;
    });

    it('returns undefined for cache missing required fields', async () => {
      const cacheDir = ManifestCache.getCacheDir();
      await fs.mkdir(cacheDir, { recursive: true });
      await fs.writeFile(path.join(cacheDir, 'incomplete__repo.json'), JSON.stringify({ foo: 'bar' }), 'utf-8');

      const entry = await ManifestCache.load('incomplete/repo');
      expect(entry).to.be.undefined;
    });
  });

  describe('isStale', () => {
    it('returns true for non-existent cache', async () => {
      const isStale = await ManifestCache.isStale('nonexistent/repo');
      expect(isStale).to.be.true;
    });

    it('returns false for fresh cache', async () => {
      await ManifestCache.save('owner/repo', testManifest, false);

      const isStale = await ManifestCache.isStale('owner/repo');
      expect(isStale).to.be.false;
    });

    it('returns true for stale cache', async () => {
      // Save a cache entry with old timestamp
      const cacheDir = ManifestCache.getCacheDir();
      await fs.mkdir(cacheDir, { recursive: true });

      const oldEntry: CachedManifestEntry = {
        manifest: testManifest,
        cachedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), // 8 days ago
        autoDiscovered: false,
        repo: 'owner/repo',
      };

      await fs.writeFile(path.join(cacheDir, 'owner__repo.json'), JSON.stringify(oldEntry), 'utf-8');

      const isStale = await ManifestCache.isStale('owner/repo');
      expect(isStale).to.be.true;
    });

    it('respects custom threshold', async () => {
      await ManifestCache.save('owner/repo', testManifest, false);

      // Wait a small amount to ensure time has passed
      await new Promise((resolve) => setTimeout(resolve, 10));

      // With a very short threshold (1ms), it should be stale after the delay
      const isStale = await ManifestCache.isStale('owner/repo', 1);
      expect(isStale).to.be.true;
    });
  });

  describe('remove', () => {
    it('removes cached manifest', async () => {
      await ManifestCache.save('owner/repo', testManifest, false);

      const removed = await ManifestCache.remove('owner/repo');
      expect(removed).to.be.true;

      const entry = await ManifestCache.load('owner/repo');
      expect(entry).to.be.undefined;
    });

    it('returns false for non-existent cache', async () => {
      const removed = await ManifestCache.remove('nonexistent/repo');
      expect(removed).to.be.false;
    });
  });

  describe('list', () => {
    it('returns empty array when no caches exist', async () => {
      const repos = await ManifestCache.list();
      expect(repos).to.be.an('array').that.is.empty;
    });

    it('lists all cached repositories', async () => {
      await ManifestCache.save('owner1/repo1', testManifest, false);
      await ManifestCache.save('owner2/repo2', testManifest, true);

      const repos = await ManifestCache.list();
      expect(repos).to.have.length(2);
      expect(repos).to.include('owner1/repo1');
      expect(repos).to.include('owner2/repo2');
    });

    it('ignores non-json files', async () => {
      const cacheDir = ManifestCache.getCacheDir();
      await fs.mkdir(cacheDir, { recursive: true });
      await fs.writeFile(path.join(cacheDir, 'not-json.txt'), 'hello', 'utf-8');
      await ManifestCache.save('owner/repo', testManifest, false);

      const repos = await ManifestCache.list();
      expect(repos).to.have.length(1);
      expect(repos).to.include('owner/repo');
    });
  });

  describe('clear', () => {
    it('returns 0 when no caches exist', async () => {
      const count = await ManifestCache.clear();
      expect(count).to.equal(0);
    });

    it('removes all cached manifests', async () => {
      await ManifestCache.save('owner1/repo1', testManifest, false);
      await ManifestCache.save('owner2/repo2', testManifest, true);

      const count = await ManifestCache.clear();
      expect(count).to.equal(2);

      const repos = await ManifestCache.list();
      expect(repos).to.be.empty;
    });

    it('only removes json files', async () => {
      const cacheDir = ManifestCache.getCacheDir();
      await fs.mkdir(cacheDir, { recursive: true });
      await fs.writeFile(path.join(cacheDir, 'keep-me.txt'), 'hello', 'utf-8');
      await ManifestCache.save('owner/repo', testManifest, false);

      await ManifestCache.clear();

      // The .txt file should still exist
      const stat = await fs.stat(path.join(cacheDir, 'keep-me.txt'));
      expect(stat.isFile()).to.be.true;
    });
  });
});
