/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { Config } from '@oclif/core';
import { SfCommand } from '@salesforce/sf-plugins-core';
import RemoveAgent from '../../../../src/commands/aidev/remove/agent.js';
import { ArtifactService } from '../../../../src/services/artifactService.js';
import { AiDevConfig } from '../../../../src/config/aiDevConfig.js';

describe('aidev remove agent', () => {
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
    it('removes an agent with confirmation', async () => {
      isInstalledStub.returns(true);
      confirmStub.resolves(true);
      uninstallStub.resolves({ success: true });

      const result = await RemoveAgent.run(['--name', 'my-agent'], oclifConfig);

      expect(result.success).to.be.true;
      expect(result.name).to.equal('my-agent');
      expect(confirmStub.calledOnce).to.be.true;
      expect(uninstallStub.calledOnce).to.be.true;
      expect(uninstallStub.firstCall.args[0]).to.equal('my-agent');
      expect(uninstallStub.firstCall.args[1]).to.deep.equal({ type: 'agent' });
    });

    it('removes an agent with --no-prompt flag', async () => {
      isInstalledStub.returns(true);
      uninstallStub.resolves({ success: true });

      const result = await RemoveAgent.run(['--name', 'my-agent', '--no-prompt'], oclifConfig);

      expect(result.success).to.be.true;
      expect(result.name).to.equal('my-agent');
      expect(confirmStub.called).to.be.false;
      expect(uninstallStub.calledOnce).to.be.true;
    });

    it('removes an agent using short flag -n', async () => {
      isInstalledStub.returns(true);
      confirmStub.resolves(true);
      uninstallStub.resolves({ success: true });

      const result = await RemoveAgent.run(['-n', 'my-agent'], oclifConfig);

      expect(result.success).to.be.true;
      expect(isInstalledStub.firstCall.args[0]).to.equal('my-agent');
    });
  });

  describe('user cancellation', () => {
    it('returns cancelled result when user denies confirmation', async () => {
      isInstalledStub.returns(true);
      confirmStub.resolves(false);

      const result = await RemoveAgent.run(['--name', 'my-agent'], oclifConfig);

      expect(result.success).to.be.false;
      expect(result.name).to.equal('my-agent');
      expect(result.error).to.equal('User cancelled removal');
      expect(uninstallStub.called).to.be.false;
    });
  });

  describe('error handling', () => {
    it('throws SfError when agent is not installed', async () => {
      isInstalledStub.returns(false);

      const cmd = new RemoveAgent(['--name', 'not-installed'], oclifConfig);
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

      const cmd = new RemoveAgent(['--name', 'my-agent'], oclifConfig);
      try {
        await cmd.run();
        expect.fail('Should have thrown SfError');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.include('my-agent');
        expect((error as Error).message).to.include('Directory deletion failed');
      }
    });

    it('throws SfError with generic message when error is undefined', async () => {
      isInstalledStub.returns(true);
      confirmStub.resolves(true);
      uninstallStub.resolves({ success: false });

      const cmd = new RemoveAgent(['--name', 'my-agent'], oclifConfig);
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
      expect(RemoveAgent.summary).to.be.a('string').and.not.be.empty;
      expect(RemoveAgent.description).to.be.a('string').and.not.be.empty;
      expect(RemoveAgent.examples).to.be.an('array').and.have.length.greaterThan(0);
      expect(RemoveAgent.enableJsonFlag).to.be.true;
    });

    it('has correct flag definitions', () => {
      expect(RemoveAgent.flags).to.have.property('name');
      expect(RemoveAgent.flags).to.have.property('no-prompt');
    });
  });
});
