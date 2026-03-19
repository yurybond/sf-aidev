/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { Config } from '@oclif/core';
import SourceAdd from '../../../../src/commands/aidev/source/add.js';
import { SourceService, type AddSourceResult } from '../../../../src/services/sourceService.js';
import { AiDevConfig } from '../../../../src/config/aiDevConfig.js';
import type { Manifest } from '../../../../src/types/manifest.js';

describe('aidev source add', () => {
  let sandbox: sinon.SinonSandbox;
  let addStub: sinon.SinonStub;
  let oclifConfig: Config;

  const sampleManifest: Manifest = {
    version: '1.0.0',
    artifacts: [
      { name: 'skill1', type: 'skill', description: 'A test skill', files: [] },
      { name: 'agent1', type: 'agent', description: 'A test agent', files: [] },
    ],
  };

  const successResult: AddSourceResult = {
    success: true,
    source: { repo: 'owner/repo', isDefault: false, addedAt: '2024-01-01T00:00:00.000Z' },
    manifest: sampleManifest,
  };

  const successDefaultResult: AddSourceResult = {
    success: true,
    source: { repo: 'owner/repo', isDefault: true, addedAt: '2024-01-01T00:00:00.000Z' },
    manifest: sampleManifest,
  };

  const duplicateResult: AddSourceResult = {
    success: false,
    error: 'Source "owner/repo" is already configured',
  };

  const manifestNotFoundResult: AddSourceResult = {
    success: false,
    error: 'Failed to fetch manifest from "owner/repo": 404 Not Found',
  };

  before(async () => {
    oclifConfig = await Config.load({ root: process.cwd() });
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.stub(AiDevConfig, 'create').resolves({} as AiDevConfig);
    addStub = sandbox.stub(SourceService.prototype, 'add');
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('successful addition', () => {
    it('adds a valid source repository with positional arg', async () => {
      addStub.resolves(successResult);

      const result = await SourceAdd.run(['owner/repo'], oclifConfig);

      expect(result.repo).to.equal('owner/repo');
      expect(result.artifactCount).to.equal(2);
      expect(result.isDefault).to.be.false;
      expect(addStub.calledOnce).to.be.true;
    });

    it('adds a valid source repository with --repo flag', async () => {
      addStub.resolves(successResult);

      const result = await SourceAdd.run(['--repo', 'owner/repo'], oclifConfig);

      expect(result.repo).to.equal('owner/repo');
      expect(result.artifactCount).to.equal(2);
      expect(result.isDefault).to.be.false;
      expect(addStub.calledOnce).to.be.true;
    });

    it('adds source with short flag -r', async () => {
      addStub.resolves(successResult);

      const result = await SourceAdd.run(['-r', 'owner/repo'], oclifConfig);

      expect(result.repo).to.equal('owner/repo');
    });

    it('positional arg takes precedence over --repo flag', async () => {
      addStub.resolves(successResult);

      const result = await SourceAdd.run(['positional/repo', '--repo', 'flag/repo'], oclifConfig);

      expect(result.repo).to.equal('positional/repo');
      expect(addStub.firstCall.args[0]).to.equal('positional/repo');
    });

    it('sets source as default when --set-default flag is provided with positional arg', async () => {
      addStub.resolves(successDefaultResult);

      const result = await SourceAdd.run(['owner/repo', '--set-default'], oclifConfig);

      expect(result.isDefault).to.be.true;
      expect(addStub.firstCall.args[1]).to.deep.include({ isDefault: true });
    });

    it('sets source as default when --set-default flag is provided with --repo flag', async () => {
      addStub.resolves(successDefaultResult);

      const result = await SourceAdd.run(['--repo', 'owner/repo', '--set-default'], oclifConfig);

      expect(result.isDefault).to.be.true;
      expect(addStub.firstCall.args[1]).to.deep.include({ isDefault: true });
    });

    it('returns correct artifact count from manifest', async () => {
      addStub.resolves(successResult);

      const result = await SourceAdd.run(['--repo', 'owner/repo'], oclifConfig);

      expect(result.artifactCount).to.equal(2);
    });

    it('handles source with no artifacts', async () => {
      addStub.resolves({
        ...successResult,
        manifest: { version: '1.0.0', artifacts: [] },
      });

      const result = await SourceAdd.run(['--repo', 'owner/repo'], oclifConfig);

      expect(result.artifactCount).to.equal(0);
    });

    it('handles repos with dots in name', async () => {
      addStub.resolves(successResult);

      const result = await SourceAdd.run(['--repo', 'owner.name/repo.name'], oclifConfig);

      expect(result.repo).to.equal('owner.name/repo.name');
    });

    it('handles repos with underscores in name', async () => {
      addStub.resolves(successResult);

      const result = await SourceAdd.run(['--repo', 'owner_name/repo_name'], oclifConfig);

      expect(result.repo).to.equal('owner_name/repo_name');
    });

    it('handles repos with hyphens in name', async () => {
      addStub.resolves(successResult);

      const result = await SourceAdd.run(['--repo', 'owner-name/repo-name'], oclifConfig);

      expect(result.repo).to.equal('owner-name/repo-name');
    });
  });

  describe('error handling', () => {
    it('throws SfError for invalid repo format - missing slash', async () => {
      const cmd = new SourceAdd(['--repo', 'invalidrepo'], oclifConfig);

      try {
        await cmd.run();
        expect.fail('Should have thrown SfError');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.include('Invalid repository format');
      }
    });

    it('throws SfError for invalid repo format - multiple slashes', async () => {
      const cmd = new SourceAdd(['--repo', 'owner/repo/extra'], oclifConfig);

      try {
        await cmd.run();
        expect.fail('Should have thrown SfError');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.include('Invalid repository format');
      }
    });

    it('throws SfError for invalid repo format - empty owner', async () => {
      const cmd = new SourceAdd(['--repo', '/repo'], oclifConfig);

      try {
        await cmd.run();
        expect.fail('Should have thrown SfError');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.include('Invalid repository format');
      }
    });

    it('throws SfError when neither arg nor flag provided', async () => {
      const cmd = new SourceAdd([], oclifConfig);

      try {
        await cmd.run();
        expect.fail('Should have thrown SfError');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.include('Repository is required');
      }
    });

    it('throws SfError for duplicate source', async () => {
      addStub.resolves(duplicateResult);

      const cmd = new SourceAdd(['--repo', 'owner/repo'], oclifConfig);

      try {
        await cmd.run();
        expect.fail('Should have thrown SfError');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.include('already configured');
      }
    });

    it('throws SfError when manifest not found', async () => {
      addStub.resolves(manifestNotFoundResult);

      const cmd = new SourceAdd(['--repo', 'owner/repo'], oclifConfig);

      try {
        await cmd.run();
        expect.fail('Should have thrown SfError');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.include('manifest');
      }
    });

    it('throws SfError for unknown error', async () => {
      addStub.resolves({ success: false, error: 'Network error' });

      const cmd = new SourceAdd(['--repo', 'owner/repo'], oclifConfig);

      try {
        await cmd.run();
        expect.fail('Should have thrown SfError');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.include('Network error');
      }
    });

    it('handles undefined error message', async () => {
      addStub.resolves({ success: false });

      const cmd = new SourceAdd(['--repo', 'owner/repo'], oclifConfig);

      try {
        await cmd.run();
        expect.fail('Should have thrown SfError');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.include('Unknown error');
      }
    });
  });

  describe('edge cases', () => {
    it('handles success with undefined manifest', async () => {
      addStub.resolves({
        success: true,
        source: { repo: 'owner/repo', isDefault: false, addedAt: '2024-01-01T00:00:00.000Z' },
        manifest: undefined,
      });

      const result = await SourceAdd.run(['--repo', 'owner/repo'], oclifConfig);

      expect(result.artifactCount).to.equal(0);
      expect(result.isDefault).to.be.false;
    });

    it('handles success with undefined source', async () => {
      addStub.resolves({
        success: true,
        source: undefined,
        manifest: sampleManifest,
      });

      const result = await SourceAdd.run(['--repo', 'owner/repo'], oclifConfig);

      expect(result.artifactCount).to.equal(2);
      expect(result.isDefault).to.be.false;
    });
  });

  describe('command metadata', () => {
    it('has required static properties', () => {
      expect(SourceAdd.summary).to.be.a('string').and.not.be.empty;
      expect(SourceAdd.description).to.be.a('string').and.not.be.empty;
      expect(SourceAdd.examples).to.be.an('array').and.have.length.greaterThan(0);
      expect(SourceAdd.enableJsonFlag).to.be.true;
    });

    it('has correct flag definitions', () => {
      expect(SourceAdd.flags).to.have.property('repo');
      expect(SourceAdd.flags).to.have.property('set-default');
    });

    it('repo flag is not required (positional arg can be used instead)', () => {
      expect(SourceAdd.flags.repo.required).to.be.false;
    });

    it('has args definition for positional repo', () => {
      expect(SourceAdd.args).to.have.property('repo');
      expect(SourceAdd.args.repo.required).to.be.false;
    });

    it('set-default flag defaults to false', () => {
      expect(SourceAdd.flags['set-default'].default).to.be.false;
    });
  });

  describe('log output', () => {
    it('logs success message with artifact count', async () => {
      addStub.resolves(successResult);
      const cmd = new SourceAdd(['--repo', 'owner/repo'], oclifConfig);
      const logStub = sandbox.stub(cmd, 'log');

      await cmd.run();

      expect(logStub.called).to.be.true;
      expect(logStub.firstCall.args[0]).to.include('owner/repo');
      expect(logStub.firstCall.args[0]).to.include('2');
    });

    it('logs default set message when --set-default', async () => {
      addStub.resolves(successDefaultResult);
      const cmd = new SourceAdd(['--repo', 'owner/repo', '--set-default'], oclifConfig);
      const logStub = sandbox.stub(cmd, 'log');

      await cmd.run();

      expect(logStub.callCount).to.equal(2);
      expect(logStub.secondCall.args[0]).to.include('default');
    });
  });
});
