/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { expect } from 'chai';
import { AiDevConfig } from '../../src/config/aiDevConfig.js';
import { ArtifactService } from '../../src/services/artifactService.js';
import type { Manifest } from '../../src/types/manifest.js';

describe('ArtifactService', () => {
  let tempDir: string;
  let config: AiDevConfig;
  let service: ArtifactService;
  let installedFiles: string[] = [];

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
        tools: ['copilot'],
      },
      {
        name: 'claude-only',
        type: 'prompt',
        description: 'Claude only prompt',
        files: [{ source: 'prompts/test.md' }],
        tools: ['claude'],
      },
    ],
  };

  const mockFetcher = {
    fetchManifest: async (): Promise<Manifest> => testManifest,
    fetchFile: async (repo: string, filePath: string): Promise<string> => `# Content from ${repo}/${filePath}`,
  } as unknown as typeof import('../../src/sources/gitHubFetcher.js').GitHubFetcher;

  beforeEach(async () => {
    tempDir = path.join(process.cwd(), '.test-artifact-service-' + Date.now());
    await fs.mkdir(tempDir, { recursive: true });
    await fs.mkdir(path.join(tempDir, '.sf'), { recursive: true });
    await fs.mkdir(path.join(tempDir, '.github'), { recursive: true });

    // Create Copilot indicator file
    await fs.writeFile(path.join(tempDir, '.github', 'copilot-instructions.md'), '# Copilot');

    config = await AiDevConfig.create({
      isGlobal: false,
      rootFolder: tempDir,
    });

    config.addSource({
      repo: 'test/repo',
      isDefault: true,
      addedAt: new Date().toISOString(),
    });

    service = new ArtifactService(config, tempDir, mockFetcher);
    installedFiles = [];
  });

  afterEach(async () => {
    try {
      await Promise.all(
        installedFiles.map(async (file) => {
          try {
            await fs.unlink(file);
          } catch {
            // Ignore
          }
        })
      );
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('detectTools', () => {
    it('detects tools in project', async () => {
      const tools = await service.detectTools();
      expect(tools).to.include('copilot');
    });

    it('sets active tool when requested', async () => {
      await service.detectTools(true);
      expect(service.getActiveTool()).to.equal('copilot');
    });
  });

  describe('getActiveTool', () => {
    it('returns undefined when no tool set', () => {
      expect(service.getActiveTool()).to.be.undefined;
    });

    it('returns set tool', async () => {
      await service.setActiveTool('copilot');
      expect(service.getActiveTool()).to.equal('copilot');
    });
  });

  describe('setActiveTool', () => {
    it('sets the active tool', async () => {
      await service.setActiveTool('claude');
      expect(service.getActiveTool()).to.equal('claude');
    });
  });

  describe('listAvailable', () => {
    it('lists all available artifacts', async () => {
      const artifacts = await service.listAvailable();
      expect(artifacts).to.have.length(3);
    });

    it('filters by type', async () => {
      const skills = await service.listAvailable({ type: 'skill' });
      expect(skills).to.have.length(1);
      expect(skills[0].type).to.equal('skill');
    });

    it('filters by tool compatibility', async () => {
      await service.setActiveTool('copilot');
      const artifacts = await service.listAvailable();

      // Should not include claude-only prompt
      const claudeOnly = artifacts.find((a) => a.name === 'claude-only');
      expect(claudeOnly).to.be.undefined;
    });

    it('marks installed artifacts', async () => {
      config.addInstalledArtifact({
        name: 'test-skill',
        type: 'skill',
        path: '/fake/path',
        source: 'test/repo',
        installedAt: new Date().toISOString(),
      });

      const artifacts = await service.listAvailable();
      const skill = artifacts.find((a) => a.name === 'test-skill');
      expect(skill?.installed).to.be.true;
    });
  });

  describe('install', () => {
    beforeEach(async () => {
      await service.setActiveTool('copilot');
    });

    it('returns error when no tool configured', async () => {
      config.setTool(undefined as unknown as string);
      const newService = new ArtifactService(config, tempDir, mockFetcher);

      const result = await newService.install('test-skill');
      expect(result.success).to.be.false;
      expect(result.error).to.include('No active tool configured');
    });

    it('returns error when artifact not found', async () => {
      const result = await service.install('non-existent');
      expect(result.success).to.be.false;
      expect(result.error).to.include('not found');
    });

    it('installs an artifact successfully', async () => {
      const result = await service.install('test-skill');
      expect(result.success).to.be.true;
      expect(result.artifact).to.equal('test-skill');
      expect(result.type).to.equal('skill');
      expect(result.installedPath).to.be.a('string').that.is.not.empty;

      installedFiles.push(result.installedPath);

      // Verify recorded in config
      expect(service.isInstalled('test-skill')).to.be.true;
    });

    it('installs to specific tool when specified', async () => {
      // Create Claude directory
      await fs.mkdir(path.join(tempDir, '.claude'), { recursive: true });

      const result = await service.install('test-skill', { tool: 'claude' });
      expect(result.success).to.be.true;
      expect(result.tool).to.equal('claude');

      installedFiles.push(result.installedPath);
    });
  });

  describe('uninstall', () => {
    beforeEach(async () => {
      await service.setActiveTool('copilot');
    });

    it('returns error when artifact not installed', async () => {
      const result = await service.uninstall('not-installed');
      expect(result.success).to.be.false;
      expect(result.error).to.include('not installed');
    });

    it('uninstalls an installed artifact', async () => {
      // First install
      const installResult = await service.install('test-skill');
      expect(installResult.success).to.be.true;

      // Then uninstall
      const uninstallResult = await service.uninstall('test-skill');
      expect(uninstallResult.success).to.be.true;

      // Verify removed from config
      expect(service.isInstalled('test-skill')).to.be.false;
    });
  });

  describe('listInstalled', () => {
    it('returns empty array when nothing installed', () => {
      const installed = service.listInstalled();
      expect(installed).to.be.an('array').that.is.empty;
    });

    it('returns installed artifacts', async () => {
      config.addInstalledArtifact({
        name: 'test-skill',
        type: 'skill',
        path: '/fake/path',
        source: 'test/repo',
        installedAt: new Date().toISOString(),
      });

      const installed = service.listInstalled();
      expect(installed).to.have.length(1);
    });

    it('filters by type', async () => {
      config.addInstalledArtifact({
        name: 'test-skill',
        type: 'skill',
        path: '/fake/skill-path',
        source: 'test/repo',
        installedAt: new Date().toISOString(),
      });
      config.addInstalledArtifact({
        name: 'test-agent',
        type: 'agent',
        path: '/fake/agent-path',
        source: 'test/repo',
        installedAt: new Date().toISOString(),
      });

      const skills = service.listInstalled({ type: 'skill' });
      expect(skills).to.have.length(1);
      expect(skills[0].type).to.equal('skill');
    });
  });

  describe('isInstalled', () => {
    it('returns false when not installed', () => {
      expect(service.isInstalled('test-skill')).to.be.false;
    });

    it('returns true when installed', async () => {
      config.addInstalledArtifact({
        name: 'test-skill',
        type: 'skill',
        path: '/fake/path',
        source: 'test/repo',
        installedAt: new Date().toISOString(),
      });

      expect(service.isInstalled('test-skill')).to.be.true;
    });
  });

  describe('verifyInstalled', () => {
    it('returns exists true for path that exists', async () => {
      const testFile = path.join(tempDir, 'test-file.md');
      await fs.writeFile(testFile, 'test');

      config.addInstalledArtifact({
        name: 'test-skill',
        type: 'skill',
        path: testFile,
        source: 'test/repo',
        installedAt: new Date().toISOString(),
      });

      const results = await service.verifyInstalled();
      expect(results).to.have.length(1);
      expect(results[0].exists).to.be.true;

      installedFiles.push(testFile);
    });

    it('returns exists false for missing path', async () => {
      config.addInstalledArtifact({
        name: 'test-skill',
        type: 'skill',
        path: '/non/existent/file.md',
        source: 'test/repo',
        installedAt: new Date().toISOString(),
      });

      const results = await service.verifyInstalled();
      expect(results).to.have.length(1);
      expect(results[0].exists).to.be.false;
    });
  });

  describe('clearCache', () => {
    it('clears manifest cache', async () => {
      // Populate cache
      await service.listAvailable();

      // Clear
      service.clearCache();

      // Should not throw
      expect(() => service.clearCache()).to.not.throw();
    });
  });
});
