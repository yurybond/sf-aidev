/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { Config } from '@oclif/core';
import AddPrompt from '../../../../src/commands/aidev/add/prompt.js';
import { ArtifactService } from '../../../../src/services/artifactService.js';
import { AiDevConfig } from '../../../../src/config/aiDevConfig.js';
import type { InstallResult } from '../../../../src/services/artifactService.js';

describe('aidev add prompt', () => {
  let sandbox: sinon.SinonSandbox;
  let installStub: sinon.SinonStub;
  let oclifConfig: Config;

  const successResult: InstallResult = {
    success: true,
    artifact: 'my-prompt',
    type: 'prompt',
    tool: 'copilot',
    installedPath: '.github/prompts/my-prompt.md',
  };

  const failResult: InstallResult = {
    success: false,
    artifact: 'missing-prompt',
    type: 'prompt',
    tool: 'copilot',
    installedPath: '',
    error: 'Artifact "missing-prompt" not found in configured sources',
  };

  const noToolResult: InstallResult = {
    success: false,
    artifact: 'my-prompt',
    type: 'prompt',
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
    it('installs a prompt by name', async () => {
      installStub.resolves(successResult);

      const result = await AddPrompt.run(['--name', 'my-prompt'], oclifConfig);

      expect(result).to.deep.equal(successResult);
      expect(installStub.calledOnce).to.be.true;
      expect(installStub.firstCall.args[0]).to.equal('my-prompt');
      expect(installStub.firstCall.args[1]).to.deep.equal({ type: 'prompt', source: undefined });
    });

    it('installs a prompt with explicit source', async () => {
      installStub.resolves({ ...successResult });

      const result = await AddPrompt.run(['--name', 'my-prompt', '--source', 'owner/repo'], oclifConfig);

      expect(result.success).to.be.true;
      expect(installStub.firstCall.args[1]).to.deep.equal({ type: 'prompt', source: 'owner/repo' });
    });

    it('installs a prompt using short flag -n', async () => {
      installStub.resolves(successResult);

      const result = await AddPrompt.run(['-n', 'my-prompt'], oclifConfig);

      expect(result.success).to.be.true;
      expect(installStub.firstCall.args[0]).to.equal('my-prompt');
    });

    it('installs a prompt using short source flag -s', async () => {
      installStub.resolves(successResult);

      await AddPrompt.run(['-n', 'my-prompt', '-s', 'owner/repo'], oclifConfig);

      expect(installStub.firstCall.args[1]).to.deep.equal({ type: 'prompt', source: 'owner/repo' });
    });
  });

  describe('error handling', () => {
    it('throws SfError when prompt is not found', async () => {
      installStub.resolves(failResult);

      const cmd = new AddPrompt(['--name', 'missing-prompt'], oclifConfig);
      try {
        await cmd.run();
        expect.fail('Should have thrown SfError');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.include('missing-prompt');
      }
    });

    it('throws SfError when no tool is configured', async () => {
      installStub.resolves(noToolResult);

      const cmd = new AddPrompt(['--name', 'my-prompt'], oclifConfig);
      try {
        await cmd.run();
        expect.fail('Should have thrown SfError');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
      }
    });

    it('throws SfError with generic message when error is undefined', async () => {
      installStub.resolves({ ...failResult, error: undefined });

      const cmd = new AddPrompt(['--name', 'my-prompt'], oclifConfig);
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
      expect(AddPrompt.summary).to.be.a('string').and.not.be.empty;
      expect(AddPrompt.description).to.be.a('string').and.not.be.empty;
      expect(AddPrompt.examples).to.be.an('array').and.have.length.greaterThan(0);
      expect(AddPrompt.enableJsonFlag).to.be.true;
    });

    it('has correct flag definitions', () => {
      expect(AddPrompt.flags).to.have.property('name');
      expect(AddPrompt.flags).to.have.property('source');
    });
  });
});
