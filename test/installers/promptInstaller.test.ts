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
import { PromptInstaller } from '../../src/installers/promptInstaller.js';
import { Artifact } from '../../src/types/manifest.js';

describe('PromptInstaller', () => {
  let testDir: string;
  let installer: PromptInstaller;

  // Mock fetcher for testing
  const mockFetcher = {
    fetchFile: async (repo: string, path: string): Promise<string> => `# Prompt content from ${repo}/${path}`,
    fetchManifest: async () => ({ version: '1.0', artifacts: [] }),
    buildUrl: (repo: string, path: string) => `https://raw.githubusercontent.com/${repo}/main/${path}`,
  } as unknown as typeof import('../../src/sources/gitHubFetcher.js').GitHubFetcher;

  beforeEach(async () => {
    testDir = join(tmpdir(), `prompt-installer-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    installer = new PromptInstaller();
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('artifactType', () => {
    it('returns prompt', () => {
      expect(installer.artifactType).to.equal('prompt');
    });
  });

  describe('install', () => {
    it('installs prompt files to correct path for copilot', async () => {
      const artifact: Artifact = {
        name: 'test-prompt',
        type: 'prompt',
        description: 'Test prompt',
        files: [{ source: 'prompts/test/prompt.md' }],
      };

      const installPath = await installer.install(artifact, 'copilot', 'owner/repo', testDir, mockFetcher);

      expect(installPath).to.equal(join(testDir, '.github/prompts', 'test-prompt'));

      const content = await readFile(join(installPath, 'prompt.md'), 'utf8');
      expect(content).to.include('Prompt content from owner/repo');
    });

    it('installs prompt files to correct path for claude (commands)', async () => {
      const artifact: Artifact = {
        name: 'test-prompt',
        type: 'prompt',
        description: 'Test prompt',
        files: [{ source: 'prompts/test/prompt.md' }],
      };

      const installPath = await installer.install(artifact, 'claude', 'owner/repo', testDir, mockFetcher);

      // Claude uses 'commands' directory for prompts
      expect(installPath).to.equal(join(testDir, '.claude/commands', 'test-prompt'));
    });
  });

  describe('uninstall', () => {
    it('removes installed prompt directory', async () => {
      const artifact: Artifact = {
        name: 'test-prompt',
        type: 'prompt',
        description: 'Test prompt',
        files: [{ source: 'prompts/test/prompt.md' }],
      };

      await installer.install(artifact, 'copilot', 'owner/repo', testDir, mockFetcher);

      await installer.uninstall('test-prompt', 'copilot', testDir);

      try {
        await readFile(join(testDir, '.github/prompts', 'test-prompt', 'prompt.md'), 'utf8');
        expect.fail('Should have thrown ENOENT');
      } catch (error) {
        expect((error as NodeJS.ErrnoException).code).to.equal('ENOENT');
      }
    });
  });
});
