/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TestContext } from '@salesforce/core/testSetup';
import { expect } from 'chai';
import { AiDevConfig } from '../../src/config/aiDevConfig.js';
import { InstalledArtifact, SourceConfig } from '../../src/types/config.js';

describe('AiDevConfig', () => {
  const $$ = new TestContext();
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `aidev-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    $$.restore();
    await rm(testDir, { recursive: true, force: true });
  });

  describe('getFileName', () => {
    it('returns sf-aidev.json', () => {
      expect(AiDevConfig.getFileName()).to.equal('sf-aidev.json');
    });
  });

  describe('tool management', () => {
    it('returns undefined when no tool is set', async () => {
      const config = await AiDevConfig.create({
        isGlobal: false,
        rootFolder: testDir,
        filename: AiDevConfig.getFileName(),
      });

      expect(config.getTool()).to.be.undefined;
    });

    it('sets and gets tool', async () => {
      const config = await AiDevConfig.create({
        isGlobal: false,
        rootFolder: testDir,
        filename: AiDevConfig.getFileName(),
      });

      config.setTool('copilot');
      expect(config.getTool()).to.equal('copilot');
    });
  });

  describe('source management', () => {
    it('returns empty array when no sources configured', async () => {
      const config = await AiDevConfig.create({
        isGlobal: false,
        rootFolder: testDir,
        filename: AiDevConfig.getFileName(),
      });

      expect(config.getSources()).to.deep.equal([]);
    });

    it('adds a source and makes first source default', async () => {
      const config = await AiDevConfig.create({
        isGlobal: false,
        rootFolder: testDir,
        filename: AiDevConfig.getFileName(),
      });

      const source: SourceConfig = {
        repo: 'owner/repo',
        addedAt: new Date().toISOString(),
      };

      config.addSource(source);
      const sources = config.getSources();

      expect(sources).to.have.length(1);
      expect(sources[0].repo).to.equal('owner/repo');
      expect(sources[0].isDefault).to.be.true;
    });

    it('adds multiple sources with explicit default', async () => {
      const config = await AiDevConfig.create({
        isGlobal: false,
        rootFolder: testDir,
        filename: AiDevConfig.getFileName(),
      });

      config.addSource({ repo: 'owner/repo1', addedAt: new Date().toISOString() });
      config.addSource({ repo: 'owner/repo2', isDefault: true, addedAt: new Date().toISOString() });

      const sources = config.getSources();
      expect(sources).to.have.length(2);
      expect(sources[0].isDefault).to.be.false;
      expect(sources[1].isDefault).to.be.true;
    });

    it('gets default source', async () => {
      const config = await AiDevConfig.create({
        isGlobal: false,
        rootFolder: testDir,
        filename: AiDevConfig.getFileName(),
      });

      config.addSource({ repo: 'owner/repo1', addedAt: new Date().toISOString() });
      config.addSource({ repo: 'owner/repo2', isDefault: true, addedAt: new Date().toISOString() });

      const defaultSource = config.getDefaultSource();
      expect(defaultSource?.repo).to.equal('owner/repo2');
    });

    it('removes a source', async () => {
      const config = await AiDevConfig.create({
        isGlobal: false,
        rootFolder: testDir,
        filename: AiDevConfig.getFileName(),
      });

      config.addSource({ repo: 'owner/repo1', addedAt: new Date().toISOString() });
      config.addSource({ repo: 'owner/repo2', addedAt: new Date().toISOString() });

      const removed = config.removeSource('owner/repo1');
      expect(removed).to.be.true;
      expect(config.getSources()).to.have.length(1);
      expect(config.getSources()[0].repo).to.equal('owner/repo2');
    });

    it('returns false when removing non-existent source', async () => {
      const config = await AiDevConfig.create({
        isGlobal: false,
        rootFolder: testDir,
        filename: AiDevConfig.getFileName(),
      });

      const removed = config.removeSource('owner/nonexistent');
      expect(removed).to.be.false;
    });

    it('makes next source default when removing default', async () => {
      const config = await AiDevConfig.create({
        isGlobal: false,
        rootFolder: testDir,
        filename: AiDevConfig.getFileName(),
      });

      config.addSource({ repo: 'owner/repo1', isDefault: true, addedAt: new Date().toISOString() });
      config.addSource({ repo: 'owner/repo2', addedAt: new Date().toISOString() });

      config.removeSource('owner/repo1');
      expect(config.getSources()[0].isDefault).to.be.true;
    });

    it('sets default source', async () => {
      const config = await AiDevConfig.create({
        isGlobal: false,
        rootFolder: testDir,
        filename: AiDevConfig.getFileName(),
      });

      config.addSource({ repo: 'owner/repo1', addedAt: new Date().toISOString() });
      config.addSource({ repo: 'owner/repo2', addedAt: new Date().toISOString() });

      const result = config.setDefaultSource('owner/repo2');
      expect(result).to.be.true;
      expect(config.getDefaultSource()?.repo).to.equal('owner/repo2');
    });

    it('returns false when setting default for non-existent source', async () => {
      const config = await AiDevConfig.create({
        isGlobal: false,
        rootFolder: testDir,
        filename: AiDevConfig.getFileName(),
      });

      const result = config.setDefaultSource('owner/nonexistent');
      expect(result).to.be.false;
    });

    it('checks if source exists', async () => {
      const config = await AiDevConfig.create({
        isGlobal: false,
        rootFolder: testDir,
        filename: AiDevConfig.getFileName(),
      });

      config.addSource({ repo: 'owner/repo', addedAt: new Date().toISOString() });

      expect(config.hasSource('owner/repo')).to.be.true;
      expect(config.hasSource('owner/nonexistent')).to.be.false;
    });
  });

  describe('installed artifacts management', () => {
    it('returns empty array when no artifacts installed', async () => {
      const config = await AiDevConfig.create({
        isGlobal: false,
        rootFolder: testDir,
        filename: AiDevConfig.getFileName(),
      });

      expect(config.getInstalledArtifacts()).to.deep.equal([]);
    });

    it('adds an installed artifact', async () => {
      const config = await AiDevConfig.create({
        isGlobal: false,
        rootFolder: testDir,
        filename: AiDevConfig.getFileName(),
      });

      const artifact: InstalledArtifact = {
        name: 'test-skill',
        type: 'skill',
        path: '.github/copilot-skills/test-skill',
        source: 'owner/repo',
        installedAt: new Date().toISOString(),
      };

      config.addInstalledArtifact(artifact);
      const artifacts = config.getInstalledArtifacts();

      expect(artifacts).to.have.length(1);
      expect(artifacts[0].name).to.equal('test-skill');
    });

    it('replaces existing artifact with same name and type', async () => {
      const config = await AiDevConfig.create({
        isGlobal: false,
        rootFolder: testDir,
        filename: AiDevConfig.getFileName(),
      });

      const artifact1: InstalledArtifact = {
        name: 'test-skill',
        type: 'skill',
        path: '.github/copilot-skills/test-skill',
        source: 'owner/repo1',
        installedAt: new Date().toISOString(),
      };

      const artifact2: InstalledArtifact = {
        name: 'test-skill',
        type: 'skill',
        path: '.github/copilot-skills/test-skill',
        source: 'owner/repo2',
        installedAt: new Date().toISOString(),
      };

      config.addInstalledArtifact(artifact1);
      config.addInstalledArtifact(artifact2);

      const artifacts = config.getInstalledArtifacts();
      expect(artifacts).to.have.length(1);
      expect(artifacts[0].source).to.equal('owner/repo2');
    });

    it('removes an installed artifact', async () => {
      const config = await AiDevConfig.create({
        isGlobal: false,
        rootFolder: testDir,
        filename: AiDevConfig.getFileName(),
      });

      config.addInstalledArtifact({
        name: 'test-skill',
        type: 'skill',
        path: '.github/copilot-skills/test-skill',
        source: 'owner/repo',
        installedAt: new Date().toISOString(),
      });

      const removed = config.removeInstalledArtifact('test-skill', 'skill');
      expect(removed).to.be.true;
      expect(config.getInstalledArtifacts()).to.have.length(0);
    });

    it('returns false when removing non-existent artifact', async () => {
      const config = await AiDevConfig.create({
        isGlobal: false,
        rootFolder: testDir,
        filename: AiDevConfig.getFileName(),
      });

      const removed = config.removeInstalledArtifact('nonexistent', 'skill');
      expect(removed).to.be.false;
    });

    it('finds an installed artifact', async () => {
      const config = await AiDevConfig.create({
        isGlobal: false,
        rootFolder: testDir,
        filename: AiDevConfig.getFileName(),
      });

      config.addInstalledArtifact({
        name: 'test-skill',
        type: 'skill',
        path: '.github/copilot-skills/test-skill',
        source: 'owner/repo',
        installedAt: new Date().toISOString(),
      });

      const found = config.findInstalledArtifact('test-skill', 'skill');
      expect(found).to.not.be.undefined;
      expect(found?.name).to.equal('test-skill');

      const notFound = config.findInstalledArtifact('nonexistent', 'skill');
      expect(notFound).to.be.undefined;
    });
  });

  describe('persistence', () => {
    it('persists and reads config from file', async () => {
      const config1 = await AiDevConfig.create({
        isGlobal: false,
        rootFolder: testDir,
        filename: AiDevConfig.getFileName(),
      });

      config1.setTool('copilot');
      config1.addSource({ repo: 'owner/repo', addedAt: new Date().toISOString() });
      await config1.write();

      // Read the config again
      const config2 = await AiDevConfig.create({
        isGlobal: false,
        rootFolder: testDir,
        filename: AiDevConfig.getFileName(),
      });

      expect(config2.getTool()).to.equal('copilot');
      expect(config2.getSources()).to.have.length(1);
    });
  });
});
