/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect } from 'chai';
import { AgentInstaller } from '../../src/installers/agentInstaller.js';
import { Artifact } from '../../src/types/manifest.js';

describe('AgentInstaller', () => {
  let testDir: string;
  let installer: AgentInstaller;

  // Mock fetcher for testing
  const mockFetcher = {
    fetchFile: async (repo: string, path: string): Promise<string> => `# Agent content from ${repo}/${path}`,
    fetchManifest: async () => ({ version: '1.0', artifacts: [] }),
    buildUrl: (repo: string, path: string) => `https://raw.githubusercontent.com/${repo}/main/${path}`,
  } as unknown as typeof import('../../src/sources/gitHubFetcher.js').GitHubFetcher;

  beforeEach(async () => {
    testDir = join(tmpdir(), `agent-installer-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    installer = new AgentInstaller();
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('artifactType', () => {
    it('returns agent', () => {
      expect(installer.artifactType).to.equal('agent');
    });
  });

  describe('install', () => {
    it('installs agent files to correct path for copilot', async () => {
      const artifact: Artifact = {
        name: 'test-agent',
        type: 'agent',
        description: 'Test agent',
        files: [{ source: 'agents/test/agent.md' }],
      };

      const installPath = await installer.install(artifact, 'copilot', 'owner/repo', testDir, mockFetcher);

      expect(installPath).to.equal(join(testDir, '.github/agents', 'test-agent'));

      const content = await readFile(join(installPath, 'agent.md'), 'utf8');
      expect(content).to.include('Agent content from owner/repo');
    });

    it('installs agent files to correct path for claude', async () => {
      const artifact: Artifact = {
        name: 'test-agent',
        type: 'agent',
        description: 'Test agent',
        files: [{ source: 'agents/test/agent.md' }],
      };

      const installPath = await installer.install(artifact, 'claude', 'owner/repo', testDir, mockFetcher);

      expect(installPath).to.equal(join(testDir, '.claude/agents', 'test-agent'));
    });
  });

  describe('uninstall', () => {
    it('removes installed agent directory', async () => {
      const artifact: Artifact = {
        name: 'test-agent',
        type: 'agent',
        description: 'Test agent',
        files: [{ source: 'agents/test/agent.md' }],
      };

      await installer.install(artifact, 'copilot', 'owner/repo', testDir, mockFetcher);

      await installer.uninstall('test-agent', 'copilot', testDir);

      try {
        await readFile(join(testDir, '.github/agents', 'test-agent', 'agent.md'), 'utf8');
        expect.fail('Should have thrown ENOENT');
      } catch (error) {
        expect((error as NodeJS.ErrnoException).code).to.equal('ENOENT');
      }
    });
  });
});
