/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { Config } from '@oclif/core';
import { SfError } from '@salesforce/core';
import SourceRefresh from '../../../../src/commands/aidev/source/refresh.js';
import { AiDevConfig } from '../../../../src/config/aiDevConfig.js';
import { GitHubFetcher } from '../../../../src/sources/gitHubFetcher.js';
import { ManifestCache } from '../../../../src/sources/manifestCache.js';
import type { Manifest } from '../../../../src/types/manifest.js';
import type { SourceConfig } from '../../../../src/types/config.js';

describe('aidev source refresh', () => {
  let sandbox: sinon.SinonSandbox;
  let getSourcesStub: sinon.SinonStub;
  let fetchManifestStub: sinon.SinonStub;
  let fetchRepoTreeStub: sinon.SinonStub;
  let manifestCacheSaveStub: sinon.SinonStub;
  let oclifConfig: Config;

  const testManifest: Manifest = {
    version: '1.0.0',
    artifacts: [
      { name: 'skill1', type: 'skill', description: 'A test skill', files: [] },
      { name: 'agent1', type: 'agent', description: 'A test agent', files: [] },
    ],
  };

  const testSources: SourceConfig[] = [
    { repo: 'owner/repo1', isDefault: true, addedAt: '2024-01-01T00:00:00.000Z' },
    { repo: 'owner/repo2', isDefault: false, addedAt: '2024-01-02T00:00:00.000Z' },
  ];

  before(async () => {
    oclifConfig = await Config.load({ root: process.cwd() });
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    getSourcesStub = sandbox.stub().returns(testSources);
    sandbox.stub(AiDevConfig, 'create').resolves({
      getSources: getSourcesStub,
    } as unknown as AiDevConfig);

    fetchManifestStub = sandbox.stub(GitHubFetcher, 'fetchManifest').resolves(testManifest);
    fetchRepoTreeStub = sandbox.stub(GitHubFetcher, 'fetchRepoTree');
    manifestCacheSaveStub = sandbox.stub(ManifestCache, 'save').resolves();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('refresh all sources', () => {
    it('refreshes all configured sources', async () => {
      const result = await SourceRefresh.run([], oclifConfig);

      expect(result.successCount).to.equal(2);
      expect(result.failedCount).to.equal(0);
      expect(result.refreshed).to.have.length(2);
      expect(fetchManifestStub.callCount).to.equal(2);
      expect(manifestCacheSaveStub.callCount).to.equal(2);
    });

    it('reports correct artifact counts', async () => {
      const result = await SourceRefresh.run([], oclifConfig);

      expect(result.refreshed[0].artifactCount).to.equal(2);
      expect(result.refreshed[1].artifactCount).to.equal(2);
    });
  });

  describe('refresh specific source', () => {
    it('refreshes specific source with positional arg', async () => {
      const result = await SourceRefresh.run(['owner/repo1'], oclifConfig);

      expect(result.successCount).to.equal(1);
      expect(result.refreshed).to.have.length(1);
      expect(result.refreshed[0].repo).to.equal('owner/repo1');
      expect(fetchManifestStub.calledOnce).to.be.true;
    });

    it('refreshes specific source with --repo flag', async () => {
      const result = await SourceRefresh.run(['--repo', 'owner/repo2'], oclifConfig);

      expect(result.successCount).to.equal(1);
      expect(result.refreshed[0].repo).to.equal('owner/repo2');
    });

    it('positional arg takes precedence over --repo flag', async () => {
      const result = await SourceRefresh.run(['owner/repo1', '--repo', 'owner/repo2'], oclifConfig);

      expect(result.refreshed[0].repo).to.equal('owner/repo1');
    });
  });

  describe('auto-discovery fallback', () => {
    it('uses auto-discovery when manifest not found', async () => {
      fetchManifestStub.rejects(new SfError('Manifest not found', 'ManifestNotFound'));
      fetchRepoTreeStub.resolves(['.claude/skills/test-skill.md', '.github/agents/test-agent.md']);

      const result = await SourceRefresh.run(['owner/repo1'], oclifConfig);

      expect(result.successCount).to.equal(1);
      expect(result.refreshed[0].autoDiscovered).to.be.true;
      expect(result.refreshed[0].artifactCount).to.equal(2);
      expect(fetchRepoTreeStub.calledOnce).to.be.true;
    });

    it('handles empty auto-discovery result', async () => {
      fetchManifestStub.rejects(new SfError('Manifest not found', 'ManifestNotFound'));
      fetchRepoTreeStub.resolves(['README.md', 'src/index.ts']);

      const result = await SourceRefresh.run(['owner/repo1'], oclifConfig);

      expect(result.successCount).to.equal(1);
      expect(result.refreshed[0].autoDiscovered).to.be.true;
      expect(result.refreshed[0].artifactCount).to.equal(0);
    });
  });

  describe('error handling', () => {
    it('throws when no sources configured', async () => {
      getSourcesStub.returns([]);

      try {
        await SourceRefresh.run([], oclifConfig);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.include('No source repositories configured');
      }
    });

    it('throws when specified source not configured', async () => {
      try {
        await SourceRefresh.run(['nonexistent/repo'], oclifConfig);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.include('not configured');
      }
    });

    it('handles fetch failure gracefully', async () => {
      fetchManifestStub.rejects(new Error('Network error'));

      const result = await SourceRefresh.run(['owner/repo1'], oclifConfig);

      expect(result.failedCount).to.equal(1);
      expect(result.refreshed[0].success).to.be.false;
      expect(result.refreshed[0].error).to.include('Network error');
    });

    it('handles tree fetch failure after manifest not found', async () => {
      fetchManifestStub.rejects(new SfError('Manifest not found', 'ManifestNotFound'));
      fetchRepoTreeStub.rejects(new Error('Rate limit exceeded'));

      const result = await SourceRefresh.run(['owner/repo1'], oclifConfig);

      expect(result.failedCount).to.equal(1);
      expect(result.refreshed[0].success).to.be.false;
      expect(result.refreshed[0].error).to.include('Rate limit');
    });

    it('continues refreshing other sources on failure', async () => {
      fetchManifestStub.onFirstCall().rejects(new Error('Network error'));
      fetchManifestStub.onSecondCall().resolves(testManifest);

      const result = await SourceRefresh.run([], oclifConfig);

      expect(result.successCount).to.equal(1);
      expect(result.failedCount).to.equal(1);
    });
  });

  describe('cache persistence', () => {
    it('saves manifest to cache on success', async () => {
      await SourceRefresh.run(['owner/repo1'], oclifConfig);

      expect(manifestCacheSaveStub.calledOnce).to.be.true;
      expect(manifestCacheSaveStub.firstCall.args[0]).to.equal('owner/repo1');
      expect(manifestCacheSaveStub.firstCall.args[1]).to.deep.equal(testManifest);
      expect(manifestCacheSaveStub.firstCall.args[2]).to.be.false; // autoDiscovered
    });

    it('saves auto-discovered manifest with flag', async () => {
      fetchManifestStub.rejects(new SfError('Manifest not found', 'ManifestNotFound'));
      fetchRepoTreeStub.resolves(['.claude/skills/test.md']);

      await SourceRefresh.run(['owner/repo1'], oclifConfig);

      expect(manifestCacheSaveStub.calledOnce).to.be.true;
      expect(manifestCacheSaveStub.firstCall.args[2]).to.be.true; // autoDiscovered
    });

    it('does not save cache on failure', async () => {
      fetchManifestStub.rejects(new Error('Network error'));

      await SourceRefresh.run(['owner/repo1'], oclifConfig);

      expect(manifestCacheSaveStub.called).to.be.false;
    });
  });

  describe('command metadata', () => {
    it('has required static properties', () => {
      expect(SourceRefresh.summary).to.be.a('string').and.not.be.empty;
      expect(SourceRefresh.description).to.be.a('string').and.not.be.empty;
      expect(SourceRefresh.examples).to.be.an('array').and.have.length.greaterThan(0);
      expect(SourceRefresh.enableJsonFlag).to.be.true;
    });

    it('has correct flag definitions', () => {
      expect(SourceRefresh.flags).to.have.property('repo');
    });

    it('has args definition for positional repo', () => {
      expect(SourceRefresh.args).to.have.property('repo');
      expect(SourceRefresh.args.repo.required).to.be.false;
    });
  });

  describe('output', () => {
    it('logs success message for each refreshed source', async () => {
      const cmd = new SourceRefresh([], oclifConfig);
      const logStub = sandbox.stub(cmd, 'log');

      await cmd.run();

      // Should log: 1 intro message + 2 success messages + 1 summary
      expect(logStub.callCount).to.be.greaterThanOrEqual(3);
    });

    it('warns on failure', async () => {
      fetchManifestStub.rejects(new Error('Network error'));

      const cmd = new SourceRefresh(['owner/repo1'], oclifConfig);
      const warnStub = sandbox.stub(cmd, 'warn');

      await cmd.run();

      expect(warnStub.calledOnce).to.be.true;
      expect(warnStub.firstCall.args[0]).to.include('Failed to refresh');
    });
  });
});
