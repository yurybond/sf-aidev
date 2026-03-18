/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { Config } from '@oclif/core';
import { SfCommand } from '@salesforce/sf-plugins-core';
import Init from '../../../src/commands/aidev/init.js';
import { ArtifactService } from '../../../src/services/artifactService.js';
import { SourceService } from '../../../src/services/sourceService.js';
import { AiDevConfig } from '../../../src/config/aiDevConfig.js';
import { DetectorRegistry } from '../../../src/detectors/registry.js';
import type { AvailableArtifact, InstallResult } from '../../../src/services/artifactService.js';

describe('aidev init', () => {
  let sandbox: sinon.SinonSandbox;
  let detectAllStub: sinon.SinonStub;
  let setActiveToolStub: sinon.SinonStub;
  let listAvailableStub: sinon.SinonStub;
  let installStub: sinon.SinonStub;
  let getDefaultStub: sinon.SinonStub;
  let hasSourceStub: sinon.SinonStub;
  let addSourceStub: sinon.SinonStub;
  let confirmStub: sinon.SinonStub;
  let oclifConfig: Config;

  const availableArtifacts: AvailableArtifact[] = [
    { name: 'skill-1', type: 'skill', source: 'owner/repo', installed: false },
    { name: 'agent-1', type: 'agent', source: 'owner/repo', installed: false },
  ];

  const installSuccess: InstallResult = {
    success: true,
    artifact: 'skill-1',
    type: 'skill',
    tool: 'copilot',
    installedPath: '.github/copilot-skills/skill-1.md',
  };

  before(async () => {
    oclifConfig = await Config.load({ root: process.cwd() });
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.stub(AiDevConfig, 'create').resolves({} as AiDevConfig);
    detectAllStub = sandbox.stub(DetectorRegistry, 'detectAll');
    setActiveToolStub = sandbox.stub(ArtifactService.prototype, 'setActiveTool').resolves();
    listAvailableStub = sandbox.stub(ArtifactService.prototype, 'listAvailable');
    installStub = sandbox.stub(ArtifactService.prototype, 'install');
    getDefaultStub = sandbox.stub(SourceService.prototype, 'getDefault');
    hasSourceStub = sandbox.stub(SourceService.prototype, 'has');
    addSourceStub = sandbox.stub(SourceService.prototype, 'add');
    confirmStub = sandbox.stub(SfCommand.prototype, 'confirm');
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('tool detection', () => {
    it('uses single detected tool automatically', async () => {
      detectAllStub.resolves(['copilot']);
      getDefaultStub.returns({ repo: 'owner/repo' });
      hasSourceStub.returns(true);
      listAvailableStub.resolves([]);

      const result = await Init.run(['--no-prompt'], oclifConfig);

      expect(result.tool).to.equal('copilot');
      expect(result.detectedTools).to.deep.equal(['copilot']);
      expect(setActiveToolStub.calledWith('copilot')).to.be.true;
    });

    it('uses provided --tool flag over detection', async () => {
      detectAllStub.resolves(['copilot']);
      getDefaultStub.returns({ repo: 'owner/repo' });
      hasSourceStub.returns(true);
      listAvailableStub.resolves([]);

      const result = await Init.run(['--tool', 'claude', '--no-prompt'], oclifConfig);

      expect(result.tool).to.equal('claude');
      expect(setActiveToolStub.calledWith('claude')).to.be.true;
    });

    it('throws error when no tools detected and no --tool flag', async () => {
      detectAllStub.resolves([]);

      const cmd = new Init([], oclifConfig);
      try {
        await cmd.run();
        expect.fail('Should have thrown SfError');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.include('No AI tools detected');
      }
    });

    it('auto-selects copilot when multiple tools detected with --no-prompt', async () => {
      detectAllStub.resolves(['claude', 'copilot']);
      getDefaultStub.returns({ repo: 'owner/repo' });
      hasSourceStub.returns(true);
      listAvailableStub.resolves([]);

      const result = await Init.run(['--no-prompt'], oclifConfig);

      expect(result.tool).to.equal('copilot');
    });

    it('prompts for tool confirmation when multiple detected', async () => {
      detectAllStub.resolves(['claude', 'copilot']);
      confirmStub.resolves(true);
      getDefaultStub.returns({ repo: 'owner/repo' });
      hasSourceStub.returns(true);
      listAvailableStub.resolves([]);

      const result = await Init.run([], oclifConfig);

      expect(result.tool).to.equal('copilot');
      expect(confirmStub.called).to.be.true;
    });

    it('selects alternate tool when user denies preferred', async () => {
      detectAllStub.resolves(['claude', 'copilot']);
      confirmStub.resolves(false);
      getDefaultStub.returns({ repo: 'owner/repo' });
      hasSourceStub.returns(true);
      listAvailableStub.resolves([]);

      const result = await Init.run([], oclifConfig);

      expect(result.tool).to.equal('claude');
    });

    it('auto-selects first tool when copilot not available with --no-prompt', async () => {
      detectAllStub.resolves(['claude', 'cursor']);
      getDefaultStub.returns({ repo: 'owner/repo' });
      hasSourceStub.returns(true);
      listAvailableStub.resolves([]);

      const result = await Init.run(['--no-prompt'], oclifConfig);

      // When copilot is not in the list, should select the first tool (claude)
      expect(result.tool).to.equal('claude');
    });
  });

  describe('source configuration', () => {
    it('uses provided --source flag', async () => {
      detectAllStub.resolves(['copilot']);
      hasSourceStub.returns(false);
      addSourceStub.resolves({ success: true });
      listAvailableStub.resolves([]);

      const result = await Init.run(['--source', 'custom/repo', '--no-prompt'], oclifConfig);

      expect(result.source).to.equal('custom/repo');
    });

    it('uses default source when available', async () => {
      detectAllStub.resolves(['copilot']);
      getDefaultStub.returns({ repo: 'owner/repo' });
      hasSourceStub.returns(true);
      listAvailableStub.resolves([]);

      const result = await Init.run(['--no-prompt'], oclifConfig);

      expect(result.source).to.equal('owner/repo');
    });

    it('throws error when no source available', async () => {
      detectAllStub.resolves(['copilot']);
      getDefaultStub.returns(undefined);

      const cmd = new Init(['--no-prompt'], oclifConfig);
      try {
        await cmd.run();
        expect.fail('Should have thrown SfError');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.include('No source repository configured');
      }
    });

    it('adds new source when not already configured', async () => {
      detectAllStub.resolves(['copilot']);
      hasSourceStub.returns(false);
      addSourceStub.resolves({ success: true });
      listAvailableStub.resolves([]);

      await Init.run(['--source', 'new/repo', '--no-prompt'], oclifConfig);

      expect(addSourceStub.calledWith('new/repo')).to.be.true;
    });

    it('throws error when source add fails', async () => {
      detectAllStub.resolves(['copilot']);
      hasSourceStub.returns(false);
      addSourceStub.resolves({ success: false, error: 'Network error' });

      const cmd = new Init(['--source', 'bad/repo', '--no-prompt'], oclifConfig);
      try {
        await cmd.run();
        expect.fail('Should have thrown SfError');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.include('Failed to add source');
      }
    });

    it('throws error when source add fails without error property', async () => {
      detectAllStub.resolves(['copilot']);
      hasSourceStub.returns(false);
      addSourceStub.resolves({ success: false });

      const cmd = new Init(['--source', 'bad/repo', '--no-prompt'], oclifConfig);
      try {
        await cmd.run();
        expect.fail('Should have thrown SfError');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.include('Unknown error');
      }
    });
  });

  describe('artifact installation', () => {
    beforeEach(() => {
      detectAllStub.resolves(['copilot']);
      getDefaultStub.returns({ repo: 'owner/repo' });
      hasSourceStub.returns(true);
    });

    it('installs available artifacts with --no-prompt', async () => {
      listAvailableStub.resolves(availableArtifacts);
      installStub.resolves(installSuccess);

      const result = await Init.run(['--no-prompt'], oclifConfig);

      expect(installStub.callCount).to.equal(2);
      expect(result.installedArtifacts).to.have.lengthOf(2);
    });

    it('skips installation with --no-install flag', async () => {
      const result = await Init.run(['--no-install', '--no-prompt'], oclifConfig);

      expect(listAvailableStub.called).to.be.false;
      expect(installStub.called).to.be.false;
      expect(result.installedArtifacts).to.have.lengthOf(0);
    });

    it('skips already installed artifacts', async () => {
      listAvailableStub.resolves([{ ...availableArtifacts[0], installed: true }, availableArtifacts[1]]);
      installStub.resolves(installSuccess);

      const result = await Init.run(['--no-prompt'], oclifConfig);

      expect(installStub.callCount).to.equal(1);
      expect(result.installedArtifacts).to.have.lengthOf(1);
    });

    it('reports no artifacts available', async () => {
      listAvailableStub.resolves([]);

      const result = await Init.run(['--no-prompt'], oclifConfig);

      expect(installStub.called).to.be.false;
      expect(result.installedArtifacts).to.have.lengthOf(0);
    });

    it('reports all artifacts already installed', async () => {
      listAvailableStub.resolves([{ ...availableArtifacts[0], installed: true }]);

      await Init.run(['--no-prompt'], oclifConfig);

      expect(installStub.called).to.be.false;
    });

    it('prompts for install confirmation', async () => {
      listAvailableStub.resolves(availableArtifacts);
      confirmStub.onFirstCall().resolves(true); // tool confirmation not called for single tool
      confirmStub.resolves(true);
      installStub.resolves(installSuccess);

      await Init.run([], oclifConfig);

      expect(confirmStub.called).to.be.true;
    });

    it('cancels installation when user denies', async () => {
      listAvailableStub.resolves(availableArtifacts);
      confirmStub.resolves(false);

      const result = await Init.run([], oclifConfig);

      expect(installStub.called).to.be.false;
      expect(result.installedArtifacts).to.have.lengthOf(0);
    });

    it('handles mixed install results', async () => {
      listAvailableStub.resolves(availableArtifacts);
      installStub.onFirstCall().resolves(installSuccess);
      installStub.onSecondCall().resolves({
        ...installSuccess,
        success: false,
        error: 'Install failed',
      });

      const result = await Init.run(['--no-prompt'], oclifConfig);

      expect(result.installedArtifacts).to.have.lengthOf(2);
      expect(result.installedArtifacts.filter((r) => r.success)).to.have.lengthOf(1);
      expect(result.installedArtifacts.filter((r) => !r.success)).to.have.lengthOf(1);
    });

    it('handles install failure without error property', async () => {
      listAvailableStub.resolves([availableArtifacts[0]]);
      installStub.resolves({
        success: false,
        artifact: 'skill-1',
        type: 'skill',
        tool: 'copilot',
        installedPath: '',
        // No error property set
      });

      const result = await Init.run(['--no-prompt'], oclifConfig);

      expect(result.installedArtifacts).to.have.lengthOf(1);
      expect(result.installedArtifacts[0].success).to.be.false;
    });
  });

  describe('command metadata', () => {
    it('has required static properties', () => {
      expect(Init.summary).to.be.a('string').and.not.be.empty;
      expect(Init.description).to.be.a('string').and.not.be.empty;
      expect(Init.examples).to.be.an('array').and.have.length.greaterThan(0);
      expect(Init.enableJsonFlag).to.be.true;
    });

    it('has correct flag definitions', () => {
      expect(Init.flags).to.have.property('tool');
      expect(Init.flags).to.have.property('source');
      expect(Init.flags).to.have.property('no-install');
      expect(Init.flags).to.have.property('no-prompt');
    });
  });
});
