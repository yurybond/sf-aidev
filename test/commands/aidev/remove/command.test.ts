/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { Config } from '@oclif/core';
import { SfCommand } from '@salesforce/sf-plugins-core';
import RemoveCommand from '../../../../src/commands/aidev/remove/command.js';
import { ArtifactService } from '../../../../src/services/artifactService.js';
import { AiDevConfig } from '../../../../src/config/aiDevConfig.js';

describe('aidev remove command', () => {
  let sandbox: sinon.SinonSandbox;
  let isInstalledStub: sinon.SinonStub;
  let uninstallStub: sinon.SinonStub;
  let confirmStub: sinon.SinonStub;
  let oclifConfig: Config;

  before(async () => {
    oclifConfig = await Config.load({ root: process.cwd() });
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.stub(AiDevConfig, 'create').resolves({
      getDefaultSource: () => undefined,
      getInstalledArtifacts: () => [],
    } as unknown as AiDevConfig);
    isInstalledStub = sandbox.stub(ArtifactService.prototype, 'isInstalled');
    uninstallStub = sandbox.stub(ArtifactService.prototype, 'uninstall');
    confirmStub = sandbox.stub(SfCommand.prototype, 'confirm');
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('successful removal', () => {
    it('removes a command with confirmation', async () => {
      isInstalledStub.returns(true);
      confirmStub.resolves(true);
      uninstallStub.resolves({ success: true });

      const result = await RemoveCommand.run(['--name', 'my-command'], oclifConfig);

      expect(result.success).to.be.true;
      expect(result.name).to.equal('my-command');
      expect(confirmStub.calledOnce).to.be.true;
      expect(uninstallStub.calledOnce).to.be.true;
      expect(uninstallStub.firstCall.args[0]).to.equal('my-command');
      expect(uninstallStub.firstCall.args[1]).to.deep.equal({ type: 'command' });
    });

    it('removes a command with --no-prompt flag', async () => {
      isInstalledStub.returns(true);
      uninstallStub.resolves({ success: true });

      const result = await RemoveCommand.run(['--name', 'my-command', '--no-prompt'], oclifConfig);

      expect(result.success).to.be.true;
      expect(result.name).to.equal('my-command');
      expect(confirmStub.called).to.be.false;
      expect(uninstallStub.calledOnce).to.be.true;
    });

    it('removes a command using short flag -n', async () => {
      isInstalledStub.returns(true);
      confirmStub.resolves(true);
      uninstallStub.resolves({ success: true });

      const result = await RemoveCommand.run(['-n', 'my-command'], oclifConfig);

      expect(result.success).to.be.true;
      expect(isInstalledStub.firstCall.args[0]).to.equal('my-command');
    });
  });

  describe('user cancellation', () => {
    it('returns cancelled result when user denies confirmation', async () => {
      isInstalledStub.returns(true);
      confirmStub.resolves(false);

      const result = await RemoveCommand.run(['--name', 'my-command'], oclifConfig);

      expect(result.success).to.be.false;
      expect(result.name).to.equal('my-command');
      expect(result.error).to.equal('User cancelled removal');
      expect(uninstallStub.called).to.be.false;
    });
  });

  describe('error handling', () => {
    it('throws SfError when command is not installed', async () => {
      isInstalledStub.returns(false);

      const cmd = new RemoveCommand(['--name', 'not-installed'], oclifConfig);
      try {
        await cmd.run();
        expect.fail('Should have thrown SfError');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.include('not-installed');
        expect((error as Error).message).to.include('not installed');
      }
    });

    it('throws SfError when uninstall fails', async () => {
      isInstalledStub.returns(true);
      confirmStub.resolves(true);
      uninstallStub.resolves({ success: false, error: 'Directory deletion failed' });

      const cmd = new RemoveCommand(['--name', 'my-command'], oclifConfig);
      try {
        await cmd.run();
        expect.fail('Should have thrown SfError');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.include('my-command');
        expect((error as Error).message).to.include('Directory deletion failed');
      }
    });

    it('throws SfError with generic message when error is undefined', async () => {
      isInstalledStub.returns(true);
      confirmStub.resolves(true);
      uninstallStub.resolves({ success: false });

      const cmd = new RemoveCommand(['--name', 'my-command'], oclifConfig);
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
      expect(RemoveCommand.summary).to.be.a('string').and.not.be.empty;
      expect(RemoveCommand.description).to.be.a('string').and.not.be.empty;
      expect(RemoveCommand.examples).to.be.an('array').and.have.length.greaterThan(0);
      expect(RemoveCommand.enableJsonFlag).to.be.true;
    });

    it('has correct flag definitions', () => {
      expect(RemoveCommand.flags).to.have.property('name');
      expect(RemoveCommand.flags).to.have.property('no-prompt');
    });
  });
});
