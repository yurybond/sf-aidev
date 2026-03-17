/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { Config } from '@oclif/core';
import AddAgent from '../../../../src/commands/aidev/add/agent.js';
import { ArtifactService } from '../../../../src/services/artifactService.js';
import { AiDevConfig } from '../../../../src/config/aiDevConfig.js';
import type { InstallResult } from '../../../../src/services/artifactService.js';

describe('aidev add agent', () => {
  let sandbox: sinon.SinonSandbox;
  let installStub: sinon.SinonStub;
  let oclifConfig: Config;

  const successResult: InstallResult = {
    success: true,
    artifact: 'my-agent',
    type: 'agent',
    tool: 'copilot',
    installedPath: '.github/agents/my-agent.md',
  };

  const failResult: InstallResult = {
    success: false,
    artifact: 'missing-agent',
    type: 'agent',
    tool: 'copilot',
    installedPath: '',
    error: 'Artifact "missing-agent" not found in configured sources',
  };

  const noToolResult: InstallResult = {
    success: false,
    artifact: 'my-agent',
    type: 'agent',
    tool: '',
    installedPath: '',
    error: 'No active tool configured. Run detect or set a tool first.',
  };

  before(async () => {
    oclifConfig = await Config.load({ root: process.cwd() });
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.stub(AiDevConfig, 'create').resolves({} as AiDevConfig);
    installStub = sandbox.stub(ArtifactService.prototype, 'install');
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('successful installation', () => {
    it('installs an agent by name', async () => {
      installStub.resolves(successResult);

      const result = await AddAgent.run(['--name', 'my-agent'], oclifConfig);

      expect(result).to.deep.equal(successResult);
      expect(installStub.calledOnce).to.be.true;
      expect(installStub.firstCall.args[0]).to.equal('my-agent');
      expect(installStub.firstCall.args[1]).to.deep.equal({ type: 'agent', source: undefined });
    });

    it('installs an agent with explicit source', async () => {
      installStub.resolves({ ...successResult });

      const result = await AddAgent.run(['--name', 'my-agent', '--source', 'owner/repo'], oclifConfig);

      expect(result.success).to.be.true;
      expect(installStub.firstCall.args[1]).to.deep.equal({ type: 'agent', source: 'owner/repo' });
    });

    it('installs an agent using short flag -n', async () => {
      installStub.resolves(successResult);

      const result = await AddAgent.run(['-n', 'my-agent'], oclifConfig);

      expect(result.success).to.be.true;
      expect(installStub.firstCall.args[0]).to.equal('my-agent');
    });

    it('installs an agent using short source flag -s', async () => {
      installStub.resolves(successResult);

      await AddAgent.run(['-n', 'my-agent', '-s', 'owner/repo'], oclifConfig);

      expect(installStub.firstCall.args[1]).to.deep.equal({ type: 'agent', source: 'owner/repo' });
    });
  });

  describe('error handling', () => {
    it('throws SfError when agent is not found', async () => {
      installStub.resolves(failResult);

      const cmd = new AddAgent(['--name', 'missing-agent'], oclifConfig);
      try {
        await cmd.run();
        expect.fail('Should have thrown SfError');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.include('missing-agent');
      }
    });

    it('throws SfError when no tool is configured', async () => {
      installStub.resolves(noToolResult);

      const cmd = new AddAgent(['--name', 'my-agent'], oclifConfig);
      try {
        await cmd.run();
        expect.fail('Should have thrown SfError');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
      }
    });

    it('throws SfError with generic message when error is undefined', async () => {
      installStub.resolves({ ...failResult, error: undefined });

      const cmd = new AddAgent(['--name', 'my-agent'], oclifConfig);
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
      expect(AddAgent.summary).to.be.a('string').and.not.be.empty;
      expect(AddAgent.description).to.be.a('string').and.not.be.empty;
      expect(AddAgent.examples).to.be.an('array').and.have.length.greaterThan(0);
      expect(AddAgent.enableJsonFlag).to.be.true;
    });

    it('has correct flag definitions', () => {
      expect(AddAgent.flags).to.have.property('name');
      expect(AddAgent.flags).to.have.property('source');
    });
  });
});
