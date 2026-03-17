/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SfError } from '@salesforce/core';
import { expect } from 'chai';
import { AiDevConfig } from '../../src/config/aiDevConfig.js';
import { SourceManager } from '../../src/sources/sourceManager.js';

describe('SourceManager', () => {
  let testDir: string;
  let config: AiDevConfig;
  let manager: SourceManager;

  beforeEach(async () => {
    testDir = join(tmpdir(), `source-manager-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });

    config = await AiDevConfig.create({
      isGlobal: false,
      rootFolder: testDir,
      filename: AiDevConfig.getFileName(),
    });

    manager = new SourceManager(config);
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('add', () => {
    it('adds a new source', async () => {
      await manager.add('owner/repo');

      const sources = manager.list();
      expect(sources).to.have.length(1);
      expect(sources[0].repo).to.equal('owner/repo');
    });

    it('makes first source the default', async () => {
      await manager.add('owner/repo');

      const sources = manager.list();
      expect(sources[0].isDefault).to.be.true;
    });

    it('adds source as default when specified', async () => {
      await manager.add('owner/repo1');
      await manager.add('owner/repo2', true);

      const sources = manager.list();
      expect(sources.find((s) => s.repo === 'owner/repo1')?.isDefault).to.be.false;
      expect(sources.find((s) => s.repo === 'owner/repo2')?.isDefault).to.be.true;
    });

    it('throws error for invalid repo format', async () => {
      try {
        await manager.add('invalid-format');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.instanceOf(SfError);
        expect((error as SfError).name).to.equal('InvalidRepoFormat');
      }
    });

    it('throws error for duplicate source', async () => {
      await manager.add('owner/repo');

      try {
        await manager.add('owner/repo');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.instanceOf(SfError);
        expect((error as SfError).name).to.equal('SourceAlreadyExists');
      }
    });

    it('accepts repo names with dots and underscores', async () => {
      await manager.add('my.org/my_repo-name');

      const sources = manager.list();
      expect(sources[0].repo).to.equal('my.org/my_repo-name');
    });
  });

  describe('remove', () => {
    it('removes an existing source', async () => {
      await manager.add('owner/repo');
      await manager.remove('owner/repo');

      expect(manager.list()).to.have.length(0);
    });

    it('throws error when source not found', async () => {
      try {
        await manager.remove('owner/nonexistent');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.instanceOf(SfError);
        expect((error as SfError).name).to.equal('SourceNotFound');
      }
    });
  });

  describe('list', () => {
    it('returns empty array when no sources', () => {
      expect(manager.list()).to.deep.equal([]);
    });

    it('returns all configured sources', async () => {
      await manager.add('owner/repo1');
      await manager.add('owner/repo2');

      const sources = manager.list();
      expect(sources).to.have.length(2);
    });
  });

  describe('getDefault', () => {
    it('returns undefined when no sources', () => {
      expect(manager.getDefault()).to.be.undefined;
    });

    it('returns the default source', async () => {
      await manager.add('owner/repo1');
      await manager.add('owner/repo2', true);

      const defaultSource = manager.getDefault();
      expect(defaultSource?.repo).to.equal('owner/repo2');
    });
  });

  describe('setDefault', () => {
    it('sets a source as default', async () => {
      await manager.add('owner/repo1');
      await manager.add('owner/repo2');
      await manager.setDefault('owner/repo2');

      expect(manager.getDefault()?.repo).to.equal('owner/repo2');
    });

    it('throws error when source not found', async () => {
      try {
        await manager.setDefault('owner/nonexistent');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.instanceOf(SfError);
        expect((error as SfError).name).to.equal('SourceNotFound');
      }
    });
  });

  describe('has', () => {
    it('returns true for existing source', async () => {
      await manager.add('owner/repo');
      expect(manager.has('owner/repo')).to.be.true;
    });

    it('returns false for non-existent source', () => {
      expect(manager.has('owner/repo')).to.be.false;
    });
  });
});
