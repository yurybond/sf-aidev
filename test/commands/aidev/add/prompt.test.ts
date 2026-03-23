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
    sandbox.stub(AiDevConfig, 'create').resolves({
      getDefaultSource: () => undefined,
      getInstalledArtifacts: () => [],
    } as unknown as AiDevConfig);
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

      expect('success' in result && result.success).to.be.true;
      expect(installStub.firstCall.args[1]).to.deep.equal({ type: 'prompt', source: 'owner/repo' });
    });

    it('installs a prompt using short flag -n', async () => {
      installStub.resolves(successResult);

      const result = await AddPrompt.run(['-n', 'my-prompt'], oclifConfig);

      expect('success' in result && result.success).to.be.true;
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

  describe('interactive mode', () => {
    let getActiveToolStub: sinon.SinonStub;
    let listAvailableStub: sinon.SinonStub;
    let isInstalledStub: sinon.SinonStub;
    let promptCheckboxStub: sinon.SinonStub;
    let originalStdinIsTTY: boolean | undefined;
    let originalStdoutIsTTY: boolean | undefined;

    beforeEach(() => {
      // Mock interactive environment
      originalStdinIsTTY = process.stdin.isTTY;
      originalStdoutIsTTY = process.stdout.isTTY;
      Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
      Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true });

      getActiveToolStub = sandbox.stub(ArtifactService.prototype, 'getActiveTool');
      listAvailableStub = sandbox.stub(ArtifactService.prototype, 'listAvailable');
      isInstalledStub = sandbox.stub(ArtifactService.prototype, 'isInstalled');
      promptCheckboxStub = sandbox.stub(AddPrompt.prototype, 'promptCheckbox' as keyof AddPrompt);
    });

    afterEach(() => {
      // Restore original TTY values
      Object.defineProperty(process.stdin, 'isTTY', { value: originalStdinIsTTY, configurable: true });
      Object.defineProperty(process.stdout, 'isTTY', { value: originalStdoutIsTTY, configurable: true });
    });

    it('throws error when not in interactive mode and no name provided', async () => {
      // Mock non-interactive environment by stubbing process.stdin.isTTY
      const originalIsTTY = process.stdin.isTTY;
      Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });

      try {
        const cmd = new AddPrompt([], oclifConfig);
        await cmd.run();
        expect.fail('Should have thrown NonInteractiveError');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).name).to.equal('NonInteractiveError');
      } finally {
        Object.defineProperty(process.stdin, 'isTTY', { value: originalIsTTY, configurable: true });
      }
    });

    it('throws error when no tool is configured in interactive mode', async () => {
      getActiveToolStub.returns(null);

      const cmd = new AddPrompt([], oclifConfig);
      try {
        await cmd.run();
        expect.fail('Should have thrown NoToolError');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).name).to.equal('NoToolError');
      }
    });

    it('returns empty result when no artifacts available', async () => {
      getActiveToolStub.returns('copilot');
      listAvailableStub.resolves([]);

      const result = await AddPrompt.run([], oclifConfig);

      expect(result).to.deep.equal({ installed: [], skipped: [], total: 0 });
    });

    it('returns empty result when all artifacts already installed', async () => {
      getActiveToolStub.returns('copilot');
      listAvailableStub.resolves([
        { name: 'prompt-1', type: 'prompt', source: 'owner/repo', installed: true },
        { name: 'prompt-2', type: 'prompt', source: 'owner/repo', installed: true },
      ]);

      const result = await AddPrompt.run([], oclifConfig);

      expect(result).to.deep.equal({ installed: [], skipped: [], total: 0 });
    });

    it('returns empty result when user selects no artifacts', async () => {
      getActiveToolStub.returns('copilot');
      listAvailableStub.resolves([{ name: 'prompt-1', type: 'prompt', source: 'owner/repo', installed: false }]);
      promptCheckboxStub.resolves([]);

      const result = await AddPrompt.run([], oclifConfig);

      expect(result).to.deep.equal({ installed: [], skipped: [], total: 0 });
    });

    it('installs selected prompts successfully in interactive mode', async () => {
      getActiveToolStub.returns('copilot');

      const availablePrompts = [
        { name: 'prompt-1', type: 'prompt' as const, source: 'owner/repo', installed: false },
        { name: 'prompt-2', type: 'prompt' as const, source: 'owner/repo', installed: false },
      ];

      listAvailableStub.resolves(availablePrompts);
      promptCheckboxStub.resolves(availablePrompts);
      isInstalledStub.returns(false);

      installStub.onFirstCall().resolves({
        success: true,
        artifact: 'prompt-1',
        type: 'prompt',
        tool: 'copilot',
        installedPath: '.github/prompts/prompt-1.md',
      });

      installStub.onSecondCall().resolves({
        success: true,
        artifact: 'prompt-2',
        type: 'prompt',
        tool: 'copilot',
        installedPath: '.github/prompts/prompt-2.md',
      });

      const result = await AddPrompt.run([], oclifConfig);

      expect('installed' in result).to.be.true;
      if ('installed' in result) {
        expect(result.installed).to.have.length(2);
        expect(result.skipped).to.have.length(0);
        expect(result.total).to.equal(2);
      }
      expect(installStub.callCount).to.equal(2);
    });

    it('skips already installed artifacts during batch install', async () => {
      getActiveToolStub.returns('copilot');

      const availablePrompts = [
        { name: 'prompt-1', type: 'prompt' as const, source: 'owner/repo', installed: false },
        { name: 'prompt-2', type: 'prompt' as const, source: 'owner/repo', installed: false },
      ];

      listAvailableStub.resolves(availablePrompts);
      promptCheckboxStub.resolves(availablePrompts);

      // First artifact is already installed
      isInstalledStub.onFirstCall().returns(true);
      isInstalledStub.onSecondCall().returns(false);

      installStub.resolves({
        success: true,
        artifact: 'prompt-2',
        type: 'prompt',
        tool: 'copilot',
        installedPath: '.github/prompts/prompt-2.md',
      });

      const result = await AddPrompt.run([], oclifConfig);

      expect('installed' in result).to.be.true;
      if ('installed' in result) {
        expect(result.installed).to.have.length(1);
        expect(result.skipped).to.have.length(1);
        expect(result.skipped[0].name).to.equal('prompt-1');
        expect(result.total).to.equal(2);
      }
    });

    it('reports failed installations separately', async () => {
      getActiveToolStub.returns('copilot');

      const availablePrompts = [
        { name: 'prompt-1', type: 'prompt' as const, source: 'owner/repo', installed: false },
        { name: 'prompt-2', type: 'prompt' as const, source: 'owner/repo', installed: false },
      ];

      listAvailableStub.resolves(availablePrompts);
      promptCheckboxStub.resolves(availablePrompts);
      isInstalledStub.returns(false);

      installStub.onFirstCall().resolves({
        success: true,
        artifact: 'prompt-1',
        type: 'prompt',
        tool: 'copilot',
        installedPath: '.github/prompts/prompt-1.md',
      });

      installStub.onSecondCall().resolves({
        success: false,
        artifact: 'prompt-2',
        type: 'prompt',
        tool: 'copilot',
        installedPath: '',
        error: 'Installation failed',
      });

      const result = await AddPrompt.run([], oclifConfig);

      expect('installed' in result).to.be.true;
      if ('installed' in result) {
        expect(result.installed).to.have.length(2);
        expect(result.installed.filter((r: InstallResult) => r.success)).to.have.length(1);
        expect(result.installed.filter((r: InstallResult) => !r.success)).to.have.length(1);
        expect(result.skipped).to.have.length(0);
        expect(result.total).to.equal(2);
      }
    });

    it('respects source filter in interactive mode', async () => {
      getActiveToolStub.returns('copilot');
      listAvailableStub.resolves([]);

      await AddPrompt.run(['--source', 'specific/repo'], oclifConfig);

      expect(listAvailableStub.calledOnce).to.be.true;
      expect(listAvailableStub.firstCall.args[0]).to.deep.equal({
        source: 'specific/repo',
        type: 'prompt',
      });
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
