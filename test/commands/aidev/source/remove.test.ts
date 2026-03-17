/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { Config } from '@oclif/core';
import SourceRemove from '../../../../src/commands/aidev/source/remove.js';
import { SourceService } from '../../../../src/services/sourceService.js';
import { AiDevConfig } from '../../../../src/config/aiDevConfig.js';
import type { SourceConfig } from '../../../../src/types/config.js';

describe('aidev source remove', () => {
  let sandbox: sinon.SinonSandbox;
  let hasStub: sinon.SinonStub;
  let getDefaultStub: sinon.SinonStub;
  let removeStub: sinon.SinonStub;
  let listStub: sinon.SinonStub;
  let oclifConfig: Config;

  const defaultSource: SourceConfig = {
    repo: 'owner/repo',
    isDefault: true,
    addedAt: '2024-01-01T00:00:00.000Z',
  };

  const otherSource: SourceConfig = {
    repo: 'other/repo',
    isDefault: false,
    addedAt: '2024-01-02T00:00:00.000Z',
  };

  before(async () => {
    oclifConfig = await Config.load({ root: process.cwd() });
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.stub(AiDevConfig, 'create').resolves({} as AiDevConfig);
    hasStub = sandbox.stub(SourceService.prototype, 'has');
    getDefaultStub = sandbox.stub(SourceService.prototype, 'getDefault');
    removeStub = sandbox.stub(SourceService.prototype, 'remove');
    listStub = sandbox.stub(SourceService.prototype, 'list');
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('successful removal', () => {
    it('removes a non-default source with --no-prompt', async () => {
      hasStub.returns(true);
      getDefaultStub.returns(otherSource);
      removeStub.resolves({ success: true });
      listStub.returns([otherSource]);

      const result = await SourceRemove.run(['--repo', 'owner/repo', '--no-prompt'], oclifConfig);

      expect(result.repo).to.equal('owner/repo');
      expect(result.removed).to.be.true;
      expect(removeStub.calledOnce).to.be.true;
    });

    it('removes source using short flag -r', async () => {
      hasStub.returns(true);
      getDefaultStub.returns(otherSource);
      removeStub.resolves({ success: true });
      listStub.returns([otherSource]);

      const result = await SourceRemove.run(['-r', 'owner/repo', '--no-prompt'], oclifConfig);

      expect(result.repo).to.equal('owner/repo');
      expect(result.removed).to.be.true;
    });

    it('returns new default when default source is removed', async () => {
      hasStub.returns(true);
      // First call returns the source being removed as default, second call returns new default
      getDefaultStub.onFirstCall().returns(defaultSource);
      getDefaultStub.onSecondCall().returns({ ...otherSource, isDefault: true });
      removeStub.resolves({ success: true });
      listStub.returns([{ ...otherSource, isDefault: true }]);

      const result = await SourceRemove.run(['--repo', 'owner/repo', '--no-prompt'], oclifConfig);

      expect(result.removed).to.be.true;
      expect(result.newDefault).to.equal('other/repo');
    });

    it('has no new default when last source is removed', async () => {
      hasStub.returns(true);
      getDefaultStub.onFirstCall().returns(defaultSource);
      getDefaultStub.onSecondCall().returns(undefined);
      removeStub.resolves({ success: true });
      listStub.returns([]);

      const result = await SourceRemove.run(['--repo', 'owner/repo', '--no-prompt'], oclifConfig);

      expect(result.removed).to.be.true;
      expect(result.newDefault).to.be.undefined;
    });
  });

  describe('confirmation prompt', () => {
    it('prompts for confirmation by default', async () => {
      hasStub.returns(true);
      getDefaultStub.returns(otherSource);
      removeStub.resolves({ success: true });
      listStub.returns([otherSource]);

      const cmd = new SourceRemove(['--repo', 'owner/repo'], oclifConfig);
      const confirmStub = sandbox.stub(cmd, 'confirm').resolves(true);

      await cmd.run();

      expect(confirmStub.calledOnce).to.be.true;
      expect(confirmStub.firstCall.args[0].message).to.include('owner/repo');
    });

    it('cancels when user declines confirmation', async () => {
      hasStub.returns(true);
      getDefaultStub.returns(otherSource);

      const cmd = new SourceRemove(['--repo', 'owner/repo'], oclifConfig);
      sandbox.stub(cmd, 'confirm').resolves(false);
      const logStub = sandbox.stub(cmd, 'log');

      const result = await cmd.run();

      expect(result.removed).to.be.false;
      expect(removeStub.called).to.be.false;
      expect(logStub.calledWith(sinon.match(/cancelled/i))).to.be.true;
    });

    it('skips confirmation with --no-prompt flag', async () => {
      hasStub.returns(true);
      getDefaultStub.returns(otherSource);
      removeStub.resolves({ success: true });
      listStub.returns([otherSource]);

      const cmd = new SourceRemove(['--repo', 'owner/repo', '--no-prompt'], oclifConfig);
      const confirmStub = sandbox.stub(cmd, 'confirm');

      await cmd.run();

      expect(confirmStub.called).to.be.false;
    });
  });

  describe('error handling', () => {
    it('throws SfError when source not found', async () => {
      hasStub.returns(false);

      const cmd = new SourceRemove(['--repo', 'nonexistent/repo', '--no-prompt'], oclifConfig);

      try {
        await cmd.run();
        expect.fail('Should have thrown SfError');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.include('not configured');
      }
    });

    it('throws SfError when remove fails', async () => {
      hasStub.returns(true);
      getDefaultStub.returns(otherSource);
      removeStub.resolves({ success: false, error: 'Database error' });

      const cmd = new SourceRemove(['--repo', 'owner/repo', '--no-prompt'], oclifConfig);

      try {
        await cmd.run();
        expect.fail('Should have thrown SfError');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.include('Database error');
      }
    });

    it('throws SfError with unknown error when no message', async () => {
      hasStub.returns(true);
      getDefaultStub.returns(otherSource);
      removeStub.resolves({ success: false });

      const cmd = new SourceRemove(['--repo', 'owner/repo', '--no-prompt'], oclifConfig);

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
      expect(SourceRemove.summary).to.be.a('string').and.not.be.empty;
      expect(SourceRemove.description).to.be.a('string').and.not.be.empty;
      expect(SourceRemove.examples).to.be.an('array').and.have.length.greaterThan(0);
      expect(SourceRemove.enableJsonFlag).to.be.true;
    });

    it('has correct flag definitions', () => {
      expect(SourceRemove.flags).to.have.property('repo');
      expect(SourceRemove.flags).to.have.property('no-prompt');
    });

    it('repo flag is required', () => {
      expect(SourceRemove.flags.repo.required).to.be.true;
    });

    it('no-prompt flag defaults to false', () => {
      expect(SourceRemove.flags['no-prompt'].default).to.be.false;
    });
  });

  describe('log output', () => {
    it('logs success message', async () => {
      hasStub.returns(true);
      getDefaultStub.returns(otherSource);
      removeStub.resolves({ success: true });
      listStub.returns([otherSource]);

      const cmd = new SourceRemove(['--repo', 'owner/repo', '--no-prompt'], oclifConfig);
      const logStub = sandbox.stub(cmd, 'log');

      await cmd.run();

      expect(logStub.called).to.be.true;
      expect(logStub.firstCall.args[0]).to.include('owner/repo');
    });

    it('logs new default when default is removed', async () => {
      hasStub.returns(true);
      getDefaultStub.onFirstCall().returns(defaultSource);
      getDefaultStub.onSecondCall().returns({ ...otherSource, isDefault: true });
      removeStub.resolves({ success: true });
      listStub.returns([{ ...otherSource, isDefault: true }]);

      const cmd = new SourceRemove(['--repo', 'owner/repo', '--no-prompt'], oclifConfig);
      const logStub = sandbox.stub(cmd, 'log');

      await cmd.run();

      expect(logStub.callCount).to.equal(2);
      expect(logStub.secondCall.args[0]).to.include('other/repo');
    });
  });
});
