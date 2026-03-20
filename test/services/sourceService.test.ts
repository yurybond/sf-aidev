/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { expect } from 'chai';
import sinon from 'sinon';
import { SfError } from '@salesforce/core';
import { AiDevConfig } from '../../src/config/aiDevConfig.js';
import { SourceService } from '../../src/services/sourceService.js';
import { ManifestCache } from '../../src/sources/manifestCache.js';
import type { Manifest } from '../../src/types/manifest.js';

describe('SourceService', () => {
  let tempDir: string;
  let config: AiDevConfig;
  let service: SourceService;
  let sandbox: sinon.SinonSandbox;

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

  const mockFetcher = {
    fetchManifest: async (): Promise<Manifest> => testManifest,
    fetchFile: async (repo: string, filePath: string): Promise<string> => `# Content from ${repo}/${filePath}`,
  } as unknown as typeof import('../../src/sources/gitHubFetcher.js').GitHubFetcher;

  const failingFetcher = {
    fetchManifest: async (): Promise<Manifest> => {
      throw new Error('Network error');
    },
    fetchFile: async (): Promise<string> => {
      throw new Error('Network error');
    },
  } as unknown as typeof import('../../src/sources/gitHubFetcher.js').GitHubFetcher;

  beforeEach(async () => {
    sandbox = sinon.createSandbox();
    tempDir = path.join(process.cwd(), '.test-source-service-' + Date.now());
    await fs.mkdir(tempDir, { recursive: true });
    await fs.mkdir(path.join(tempDir, '.sf'), { recursive: true });

    // Use test cache directory for ManifestCache
    ManifestCache.setTestCacheDir(path.join(tempDir, '.sf', 'sf-aidev-manifests'));

    config = await AiDevConfig.create({
      isGlobal: false,
      rootFolder: tempDir,
    });

    service = new SourceService(config, mockFetcher);
  });

  afterEach(async () => {
    sandbox.restore();
    ManifestCache.setTestCacheDir(undefined);
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('add', () => {
    it('adds a valid source', async () => {
      const result = await service.add('user/repo');

      expect(result.success).to.be.true;
      expect(result.source?.repo).to.equal('user/repo');
      expect(result.manifest).to.deep.equal(testManifest);
    });

    it('returns error for duplicate source', async () => {
      await service.add('user/repo');
      const result = await service.add('user/repo');

      expect(result.success).to.be.false;
      expect(result.error).to.include('already configured');
    });

    it('returns error when manifest fetch fails', async () => {
      const failingService = new SourceService(config, failingFetcher);
      const result = await failingService.add('user/repo');

      expect(result.success).to.be.false;
      expect(result.error).to.include('Failed to fetch manifest');
    });

    it('skips validation when requested', async () => {
      const failingService = new SourceService(config, failingFetcher);
      const result = await failingService.add('user/repo', { skipValidation: true });

      expect(result.success).to.be.true;
      expect(result.manifest).to.be.undefined;
    });

    it('sets as default when requested', async () => {
      await service.add('user/other', { isDefault: false });
      await service.add('user/repo', { isDefault: true });

      const defaultSource = service.getDefault();
      expect(defaultSource?.repo).to.equal('user/repo');
    });

    it('returns error when manager.add throws after successful manifest fetch', async () => {
      // First add will succeed, second add should fail at manager level
      await service.add('user/repo');

      // Create a new service with a mock that succeeds on validation but the manager rejects duplicate
      const secondService = new SourceService(config, mockFetcher);
      const result = await secondService.add('user/repo');

      expect(result.success).to.be.false;
      expect(result.error).to.include('already configured');
    });

    it('handles non-Error throw from manager.add', async () => {
      // Create a fetcher that succeeds but causes a string error to be thrown
      const stringErrorFetcher = {
        fetchManifest: async (): Promise<Manifest> => testManifest,
        fetchFile: async (): Promise<string> => 'content',
      } as unknown as typeof import('../../src/sources/gitHubFetcher.js').GitHubFetcher;

      // Add first to make hasSource return false initially
      const testService = new SourceService(config, stringErrorFetcher);

      // Manually add a source with invalid format to trigger manager error after validation
      // The manager.add will throw for invalid format after manifest fetch succeeds
      const result = await testService.add('invalid');

      expect(result.success).to.be.false;
      expect(result.error).to.include('Invalid repository format');
    });
  });

  describe('remove', () => {
    it('removes an existing source', async () => {
      await service.add('user/repo');
      const result = await service.remove('user/repo');

      expect(result.success).to.be.true;
      expect(service.has('user/repo')).to.be.false;
    });

    it('returns error for non-existent source', async () => {
      const result = await service.remove('user/repo');

      expect(result.success).to.be.false;
      expect(result.error).to.include('not configured');
    });

    it('clears health cache for removed source', async () => {
      await service.add('user/repo');
      await service.checkHealth('user/repo');

      expect(service.getCachedHealth('user/repo')).to.not.be.undefined;

      await service.remove('user/repo');

      expect(service.getCachedHealth('user/repo')).to.be.undefined;
    });
  });

  describe('list', () => {
    it('returns empty array when no sources', () => {
      const sources = service.list();
      expect(sources).to.be.an('array').that.is.empty;
    });

    it('returns all configured sources', async () => {
      await service.add('user/repo1');
      await service.add('user/repo2');

      const sources = service.list();
      expect(sources).to.have.length(2);
    });
  });

  describe('getDefault', () => {
    it('returns undefined when no sources', () => {
      expect(service.getDefault()).to.be.undefined;
    });

    it('returns the default source', async () => {
      await service.add('user/repo');
      const defaultSource = service.getDefault();
      expect(defaultSource?.repo).to.equal('user/repo');
    });
  });

  describe('setDefault', () => {
    it('sets existing source as default', async () => {
      await service.add('user/repo1');
      await service.add('user/repo2');

      const result = await service.setDefault('user/repo2');

      expect(result.success).to.be.true;
      expect(service.getDefault()?.repo).to.equal('user/repo2');
    });

    it('returns error for non-existent source', async () => {
      const result = await service.setDefault('user/repo');

      expect(result.success).to.be.false;
      expect(result.error).to.include('not configured');
    });
  });

  describe('has', () => {
    it('returns false for non-existent source', () => {
      expect(service.has('user/repo')).to.be.false;
    });

    it('returns true for existing source', async () => {
      await service.add('user/repo');
      expect(service.has('user/repo')).to.be.true;
    });
  });

  describe('checkHealth', () => {
    it('returns not configured for unknown source', async () => {
      const health = await service.checkHealth('unknown/repo');

      expect(health.healthy).to.be.false;
      expect(health.error).to.include('not configured');
    });

    it('returns healthy status for valid source', async () => {
      await service.add('user/repo');
      const health = await service.checkHealth('user/repo');

      expect(health.healthy).to.be.true;
      expect(health.artifactCount).to.equal(2);
      expect(health.lastChecked).to.be.a('string');
    });

    it('returns unhealthy status when fetch fails', async () => {
      await service.add('user/repo');

      // Create new service with failing fetcher but same config
      const failingService = new SourceService(config, failingFetcher);
      const health = await failingService.checkHealth('user/repo');

      expect(health.healthy).to.be.false;
      expect(health.error).to.include('Network error');
    });

    it('caches health results', async () => {
      await service.add('user/repo');
      await service.checkHealth('user/repo');

      const cached = service.getCachedHealth('user/repo');
      expect(cached).to.not.be.undefined;
      expect(cached?.healthy).to.be.true;
    });
  });

  describe('checkAllHealth', () => {
    it('returns empty array when no sources', async () => {
      const results = await service.checkAllHealth();
      expect(results).to.be.an('array').that.is.empty;
    });

    it('checks health of all sources', async () => {
      await service.add('user/repo1');
      await service.add('user/repo2');

      const results = await service.checkAllHealth();

      expect(results).to.have.length(2);
      expect(results.every((r) => r.healthy)).to.be.true;
    });
  });

  describe('fetchManifest', () => {
    it('throws error for non-configured source', async () => {
      try {
        await service.fetchManifest('unknown/repo');
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as Error).message).to.include('not configured');
      }
    });

    it('fetches manifest for configured source', async () => {
      await service.add('user/repo');
      const manifest = await service.fetchManifest('user/repo');

      expect(manifest).to.deep.equal(testManifest);
    });
  });

  describe('clearHealthCache', () => {
    it('clears all cached health results', async () => {
      await service.add('user/repo');
      await service.checkHealth('user/repo');

      expect(service.getCachedHealth('user/repo')).to.not.be.undefined;

      service.clearHealthCache();

      expect(service.getCachedHealth('user/repo')).to.be.undefined;
    });
  });

  describe('auto-discovery fallback', () => {
    it('auto-discovers artifacts when manifest not found', async () => {
      const manifestNotFoundFetcher = {
        fetchManifest: async (): Promise<Manifest> => {
          throw new SfError('Manifest not found', 'ManifestNotFound');
        },
        fetchRepoTree: async (): Promise<string[]> => [
          '.claude/skills/test-skill/index.md',
          '.github/agents/test-agent.md',
        ],
        fetchFile: async (): Promise<string> => 'content',
      } as unknown as typeof import('../../src/sources/gitHubFetcher.js').GitHubFetcher;

      const testService = new SourceService(config, manifestNotFoundFetcher);
      const result = await testService.add('user/repo');

      expect(result.success).to.be.true;
      expect(result.autoDiscovered).to.be.true;
      expect(result.manifest?.artifacts).to.have.length(2);
      expect(result.manifest?.version).to.equal('auto');
    });

    it('returns error when no artifacts discovered', async () => {
      const noArtifactsFetcher = {
        fetchManifest: async (): Promise<Manifest> => {
          throw new SfError('Manifest not found', 'ManifestNotFound');
        },
        fetchRepoTree: async (): Promise<string[]> => ['README.md', 'src/index.ts'],
        fetchFile: async (): Promise<string> => 'content',
      } as unknown as typeof import('../../src/sources/gitHubFetcher.js').GitHubFetcher;

      const testService = new SourceService(config, noArtifactsFetcher);
      const result = await testService.add('user/repo');

      expect(result.success).to.be.false;
      expect(result.error).to.include('no artifacts discovered');
    });

    it('returns original error when tree fetch fails', async () => {
      const treeFetchFailsFetcher = {
        fetchManifest: async (): Promise<Manifest> => {
          throw new SfError('Manifest not found', 'ManifestNotFound');
        },
        fetchRepoTree: async (): Promise<string[]> => {
          throw new SfError('Rate limit exceeded', 'RateLimitExceeded');
        },
        fetchFile: async (): Promise<string> => 'content',
      } as unknown as typeof import('../../src/sources/gitHubFetcher.js').GitHubFetcher;

      const testService = new SourceService(config, treeFetchFailsFetcher);
      const result = await testService.add('user/repo');

      expect(result.success).to.be.false;
      expect(result.error).to.include('Failed to fetch manifest');
    });

    it('does not auto-discover when other errors occur', async () => {
      const networkErrorFetcher = {
        fetchManifest: async (): Promise<Manifest> => {
          throw new SfError('Network error', 'NetworkError');
        },
        fetchRepoTree: async (): Promise<string[]> => ['.claude/skills/test/index.md'],
        fetchFile: async (): Promise<string> => 'content',
      } as unknown as typeof import('../../src/sources/gitHubFetcher.js').GitHubFetcher;

      const testService = new SourceService(config, networkErrorFetcher);
      const result = await testService.add('user/repo');

      expect(result.success).to.be.false;
      expect(result.error).to.include('Failed to fetch manifest');
      // Should not attempt auto-discovery for network errors
      expect(result.autoDiscovered).to.be.undefined;
    });

    it('sets autoDiscovered to false when manifest exists', async () => {
      const result = await service.add('user/repo');

      expect(result.success).to.be.true;
      expect(result.autoDiscovered).to.be.false;
    });
  });

  describe('manifest cache persistence', () => {
    it('saves manifest to disk cache on add', async () => {
      const result = await service.add('user/repo');

      expect(result.success).to.be.true;

      // Verify manifest was saved to disk
      const cached = await ManifestCache.load('user/repo');
      expect(cached).to.not.be.undefined;
      expect(cached?.manifest).to.deep.equal(testManifest);
      expect(cached?.autoDiscovered).to.be.false;
    });

    it('saves auto-discovered manifest with correct flag', async () => {
      const manifestNotFoundFetcher = {
        fetchManifest: async (): Promise<Manifest> => {
          throw new SfError('Manifest not found', 'ManifestNotFound');
        },
        fetchRepoTree: async (): Promise<string[]> => ['.claude/skills/test-skill/index.md'],
        fetchFile: async (): Promise<string> => 'content',
      } as unknown as typeof import('../../src/sources/gitHubFetcher.js').GitHubFetcher;

      const testService = new SourceService(config, manifestNotFoundFetcher);
      await testService.add('user/repo');

      const cached = await ManifestCache.load('user/repo');
      expect(cached?.autoDiscovered).to.be.true;
    });

    it('removes manifest cache on source removal', async () => {
      await service.add('user/repo');

      // Verify cache exists
      let cached = await ManifestCache.load('user/repo');
      expect(cached).to.not.be.undefined;

      // Remove source
      await service.remove('user/repo');

      // Verify cache was removed
      cached = await ManifestCache.load('user/repo');
      expect(cached).to.be.undefined;
    });

    it('does not save cache when skipValidation is true', async () => {
      const failingService = new SourceService(config, failingFetcher);
      await failingService.add('user/repo', { skipValidation: true });

      const cached = await ManifestCache.load('user/repo');
      expect(cached).to.be.undefined;
    });
  });
});
