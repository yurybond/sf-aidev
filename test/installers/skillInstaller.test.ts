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
import { SkillInstaller } from '../../src/installers/skillInstaller.js';
import { Artifact } from '../../src/types/manifest.js';

describe('SkillInstaller', () => {
  let testDir: string;
  let installer: SkillInstaller;

  // Mock fetcher for testing
  const mockFetcher = {
    fetchFile: async (repo: string, path: string): Promise<string> => `# Content from ${repo}/${path}`,
    fetchManifest: async () => ({ version: '1.0', artifacts: [] }),
    buildUrl: (repo: string, path: string) => `https://raw.githubusercontent.com/${repo}/main/${path}`,
  } as unknown as typeof import('../../src/sources/gitHubFetcher.js').GitHubFetcher;

  beforeEach(async () => {
    testDir = join(tmpdir(), `skill-installer-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    installer = new SkillInstaller();
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('artifactType', () => {
    it('returns skill', () => {
      expect(installer.artifactType).to.equal('skill');
    });
  });

  describe('install', () => {
    it('installs skill files to correct path for copilot', async () => {
      const artifact: Artifact = {
        name: 'test-skill',
        type: 'skill',
        description: 'Test skill',
        files: [{ source: 'skills/test/SKILL.md' }],
      };

      const installPath = await installer.install(artifact, 'copilot', 'owner/repo', testDir, mockFetcher);

      expect(installPath).to.equal(join(testDir, '.github/copilot-skills', 'test-skill'));

      // Verify file was created
      const content = await readFile(join(installPath, 'SKILL.md'), 'utf8');
      expect(content).to.include('Content from owner/repo');
    });

    it('installs skill files to correct path for claude', async () => {
      const artifact: Artifact = {
        name: 'test-skill',
        type: 'skill',
        description: 'Test skill',
        files: [{ source: 'skills/test/SKILL.md' }],
      };

      const installPath = await installer.install(artifact, 'claude', 'owner/repo', testDir, mockFetcher);

      expect(installPath).to.equal(join(testDir, '.claude/skills', 'test-skill'));
    });

    it('uses target filename when specified', async () => {
      const artifact: Artifact = {
        name: 'test-skill',
        type: 'skill',
        description: 'Test skill',
        files: [{ source: 'skills/test/skill.md', target: 'CUSTOM.md' }],
      };

      const installPath = await installer.install(artifact, 'copilot', 'owner/repo', testDir, mockFetcher);

      const content = await readFile(join(installPath, 'CUSTOM.md'), 'utf8');
      expect(content).to.include('Content from owner/repo');
    });

    it('installs multiple files', async () => {
      const artifact: Artifact = {
        name: 'test-skill',
        type: 'skill',
        description: 'Test skill',
        files: [{ source: 'skills/test/SKILL.md' }, { source: 'skills/test/README.md' }],
      };

      const installPath = await installer.install(artifact, 'copilot', 'owner/repo', testDir, mockFetcher);

      const skillContent = await readFile(join(installPath, 'SKILL.md'), 'utf8');
      const readmeContent = await readFile(join(installPath, 'README.md'), 'utf8');

      expect(skillContent).to.include('Content');
      expect(readmeContent).to.include('Content');
    });
  });

  describe('uninstall', () => {
    it('removes installed skill directory', async () => {
      // First install
      const artifact: Artifact = {
        name: 'test-skill',
        type: 'skill',
        description: 'Test skill',
        files: [{ source: 'skills/test/SKILL.md' }],
      };

      await installer.install(artifact, 'copilot', 'owner/repo', testDir, mockFetcher);

      // Then uninstall
      await installer.uninstall('test-skill', 'copilot', testDir);

      // Verify directory is gone
      try {
        await readFile(join(testDir, '.github/copilot-skills', 'test-skill', 'SKILL.md'), 'utf8');
        expect.fail('Should have thrown ENOENT');
      } catch (error) {
        expect((error as NodeJS.ErrnoException).code).to.equal('ENOENT');
      }
    });

    it('does not throw when skill does not exist', async () => {
      // Should not throw
      await installer.uninstall('nonexistent-skill', 'copilot', testDir);
    });
  });
});
