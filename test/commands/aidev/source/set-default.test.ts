/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { Config } from '@oclif/core';
import SourceSetDefault from '../../../../src/commands/aidev/source/set-default.js';
import { SourceService } from '../../../../src/services/sourceService.js';
import { AiDevConfig } from '../../../../src/config/aiDevConfig.js';
import type { SourceConfig } from '../../../../src/types/config.js';

describe('aidev source set-default', () => {
  let sandbox: sinon.SinonSandbox;
  let hasStub: sinon.SinonStub;
  let getDefaultStub: sinon.SinonStub;
  let setDefaultStub: sinon.SinonStub;
  let oclifConfig: Config;

  const oldDefault: SourceConfig = {
    repo: 'old/repo',
    isDefault: true,
    addedAt: '2024-01-01T00:00:00.000Z',
  };

  const newDefault: SourceConfig = {
    repo: 'new/repo',
    isDefault: false,
    addedAt: '2024-01-02T00:00:00.000Z',
  };

  before(async () => {
    oclifConfig = await Config.load({ root: process.cwd() });
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.stub(AiDevConfig, 'create').resolves({
      getDefaultSource: () => undefined,
      getInstalledArtifacts: () => [],
    } as unknown as AiDevConfig);
    hasStub = sandbox.stub(SourceService.prototype, 'has');
    getDefaultStub = sandbox.stub(SourceService.prototype, 'getDefault');
    setDefaultStub = sandbox.stub(SourceService.prototype, 'setDefault');
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('successful set default', () => {
    it('sets a new default source with positional arg', async () => {
      hasStub.returns(true);
      getDefaultStub.returns(oldDefault);
      setDefaultStub.resolves({ success: true });

      const result = await SourceSetDefault.run(['new/repo'], oclifConfig);

      expect(result.repo).to.equal('new/repo');
      expect(result.previousDefault).to.equal('old/repo');
      expect(setDefaultStub.calledOnce).to.be.true;
      expect(setDefaultStub.calledWith('new/repo')).to.be.true;
    });

    it('sets a new default source with --repo flag', async () => {
      hasStub.returns(true);
      getDefaultStub.returns(oldDefault);
      setDefaultStub.resolves({ success: true });

      const result = await SourceSetDefault.run(['--repo', 'new/repo'], oclifConfig);

      expect(result.repo).to.equal('new/repo');
      expect(result.previousDefault).to.equal('old/repo');
      expect(setDefaultStub.calledOnce).to.be.true;
      expect(setDefaultStub.calledWith('new/repo')).to.be.true;
    });

    it('sets default using short flag -r', async () => {
      hasStub.returns(true);
      getDefaultStub.returns(oldDefault);
      setDefaultStub.resolves({ success: true });

      const result = await SourceSetDefault.run(['-r', 'new/repo'], oclifConfig);

      expect(result.repo).to.equal('new/repo');
    });

    it('positional arg takes precedence over --repo flag', async () => {
      hasStub.returns(true);
      getDefaultStub.returns(oldDefault);
      setDefaultStub.resolves({ success: true });

      const result = await SourceSetDefault.run(['positional/repo', '--repo', 'flag/repo'], oclifConfig);

      expect(result.repo).to.equal('positional/repo');
      expect(setDefaultStub.calledWith('positional/repo')).to.be.true;
    });

    it('returns undefined previousDefault when setting same source', async () => {
      hasStub.returns(true);
      getDefaultStub.returns({ ...newDefault, isDefault: true });
      setDefaultStub.resolves({ success: true });

      const result = await SourceSetDefault.run(['--repo', 'new/repo'], oclifConfig);

      expect(result.repo).to.equal('new/repo');
      expect(result.previousDefault).to.be.undefined;
    });

    it('returns undefined previousDefault when no previous default', async () => {
      hasStub.returns(true);
      getDefaultStub.returns(undefined);
      setDefaultStub.resolves({ success: true });

      const result = await SourceSetDefault.run(['--repo', 'new/repo'], oclifConfig);

      expect(result.repo).to.equal('new/repo');
      expect(result.previousDefault).to.be.undefined;
    });

    it('handles repos with dots in name', async () => {
      hasStub.returns(true);
      getDefaultStub.returns(oldDefault);
      setDefaultStub.resolves({ success: true });

      const result = await SourceSetDefault.run(['--repo', 'owner.name/repo.name'], oclifConfig);

      expect(result.repo).to.equal('owner.name/repo.name');
    });

    it('handles repos with hyphens and underscores', async () => {
      hasStub.returns(true);
      getDefaultStub.returns(oldDefault);
      setDefaultStub.resolves({ success: true });

      const result = await SourceSetDefault.run(['--repo', 'owner-name/repo_name'], oclifConfig);

      expect(result.repo).to.equal('owner-name/repo_name');
    });
  });

  describe('error handling', () => {
    it('throws SfError when neither arg nor flag provided', async () => {
      const cmd = new SourceSetDefault([], oclifConfig);

      try {
        await cmd.run();
        expect.fail('Should have thrown SfError');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.include('Repository is required');
      }
    });

    it('throws SfError when source not configured', async () => {
      hasStub.returns(false);

      const cmd = new SourceSetDefault(['--repo', 'nonexistent/repo'], oclifConfig);

      try {
        await cmd.run();
        expect.fail('Should have thrown SfError');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.include('not configured');
      }
    });

    it('throws SfError when setDefault fails', async () => {
      hasStub.returns(true);
      getDefaultStub.returns(oldDefault);
      setDefaultStub.resolves({ success: false, error: 'Internal error' });

      const cmd = new SourceSetDefault(['--repo', 'new/repo'], oclifConfig);

      try {
        await cmd.run();
        expect.fail('Should have thrown SfError');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.include('Internal error');
      }
    });

    it('throws SfError with unknown error when no message', async () => {
      hasStub.returns(true);
      getDefaultStub.returns(oldDefault);
      setDefaultStub.resolves({ success: false });

      const cmd = new SourceSetDefault(['--repo', 'new/repo'], oclifConfig);

      try {
        await cmd.run();
        expect.fail('Should have thrown SfError');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.include('Unknown error');
      }
    });
  });

  describe('command metadata', () => {
    it('has required static properties', () => {
      expect(SourceSetDefault.summary).to.be.a('string').and.not.be.empty;
      expect(SourceSetDefault.description).to.be.a('string').and.not.be.empty;
      expect(SourceSetDefault.examples).to.be.an('array').and.have.length.greaterThan(0);
      expect(SourceSetDefault.enableJsonFlag).to.be.true;
    });

    it('has correct flag definitions', () => {
      expect(SourceSetDefault.flags).to.have.property('repo');
    });

    it('repo flag is not required (positional arg can be used instead)', () => {
      expect(SourceSetDefault.flags.repo.required).to.be.false;
    });

    it('has args definition for positional repo', () => {
      expect(SourceSetDefault.args).to.have.property('repo');
      expect(SourceSetDefault.args.repo.required).to.be.false;
    });
  });

  describe('log output', () => {
    it('logs success message', async () => {
      hasStub.returns(true);
      getDefaultStub.returns(oldDefault);
      setDefaultStub.resolves({ success: true });

      const cmd = new SourceSetDefault(['--repo', 'new/repo'], oclifConfig);
      const logStub = sandbox.stub(cmd, 'log');

      await cmd.run();

      expect(logStub.calledOnce).to.be.true;
      expect(logStub.firstCall.args[0]).to.include('new/repo');
      expect(logStub.firstCall.args[0]).to.include('default');
    });
  });
});
