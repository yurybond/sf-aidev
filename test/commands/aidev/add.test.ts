/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { Config } from '@oclif/core';
import { Separator } from '@inquirer/prompts';
import Add, { type CheckboxChoice } from '../../../src/commands/aidev/add.js';
import { ArtifactService } from '../../../src/services/artifactService.js';
import { AiDevConfig } from '../../../src/config/aiDevConfig.js';
import type { AvailableArtifact, InstallResult } from '../../../src/services/artifactService.js';

describe('aidev add', () => {
  let sandbox: sinon.SinonSandbox;
  let getActiveToolStub: sinon.SinonStub;
  let listAvailableStub: sinon.SinonStub;
  let installStub: sinon.SinonStub;
  let isInstalledStub: sinon.SinonStub;
  let promptCheckboxStub: sinon.SinonStub;
  let oclifConfig: Config;

  const availableArtifacts: AvailableArtifact[] = [
    { name: 'agent-1', type: 'agent', description: 'An agent', source: 'owner/repo', installed: false },
    { name: 'skill-1', type: 'skill', description: 'A skill', source: 'owner/repo', installed: false },
    { name: 'skill-2', type: 'skill', source: 'owner/repo', installed: false },
    { name: 'prompt-1', type: 'prompt', description: 'A prompt', source: 'owner/repo', installed: false },
  ];

  const installSuccess: InstallResult = {
    success: true,
    artifact: 'skill-1',
    type: 'skill',
    tool: 'copilot',
    installedPath: '.github/copilot-skills/skill-1.md',
  };

  const installFailure: InstallResult = {
    success: false,
    artifact: 'agent-1',
    type: 'agent',
    tool: 'copilot',
    installedPath: '',
    error: 'Network error',
  };

  before(async () => {
    oclifConfig = await Config.load({ root: process.cwd() });
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.stub(AiDevConfig, 'create').resolves({} as AiDevConfig);
    getActiveToolStub = sandbox.stub(ArtifactService.prototype, 'getActiveTool');
    listAvailableStub = sandbox.stub(ArtifactService.prototype, 'listAvailable');
    installStub = sandbox.stub(ArtifactService.prototype, 'install');
    isInstalledStub = sandbox.stub(ArtifactService.prototype, 'isInstalled');
    promptCheckboxStub = sandbox.stub(Add.prototype, 'promptCheckbox' as keyof Add);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('happy path - select and install artifacts', () => {
    it('installs selected artifacts successfully', async () => {
      getActiveToolStub.returns('copilot');
      listAvailableStub.resolves(availableArtifacts);
      isInstalledStub.returns(false);
      promptCheckboxStub.resolves([availableArtifacts[1], availableArtifacts[2]]);
      installStub.resolves(installSuccess);

      const result = await Add.run([], oclifConfig);

      expect(result.installed).to.have.lengthOf(2);
      expect(result.skipped).to.have.lengthOf(0);
      expect(result.total).to.equal(2);
      expect(installStub.callCount).to.equal(2);
    });

    it('passes source flag to listAvailable', async () => {
      getActiveToolStub.returns('copilot');
      listAvailableStub.resolves([]);

      await Add.run(['--source', 'custom/repo'], oclifConfig);

      expect(listAvailableStub.calledWith({ source: 'custom/repo' })).to.be.true;
    });
  });

  describe('grouped choices', () => {
    it('builds choices grouped by type with Separators', async () => {
      getActiveToolStub.returns('copilot');
      listAvailableStub.resolves(availableArtifacts);
      isInstalledStub.returns(false);
      promptCheckboxStub.resolves([]);

      await Add.run([], oclifConfig);

      expect(promptCheckboxStub.calledOnce).to.be.true;
      const choices = promptCheckboxStub.firstCall.args[1] as Array<CheckboxChoice | Separator>;
      expect(choices).to.be.an('array');

      // Verify separators exist for each type
      const separators = choices.filter((c) => c instanceof Separator);
      expect(separators.length).to.be.at.least(3);
    });

    it('shows artifact name with description when available', async () => {
      getActiveToolStub.returns('copilot');
      listAvailableStub.resolves([availableArtifacts[1]]); // skill-1 has description
      isInstalledStub.returns(false);
      promptCheckboxStub.resolves([]);

      await Add.run([], oclifConfig);

      const choices = promptCheckboxStub.firstCall.args[1] as Array<CheckboxChoice | Separator>;
      const skillChoice = choices.find((c): c is CheckboxChoice => 'name' in c && c.name?.includes('skill-1'));
      expect(skillChoice?.name).to.include('A skill');
    });

    it('shows only artifact name when no description', async () => {
      getActiveToolStub.returns('copilot');
      listAvailableStub.resolves([availableArtifacts[2]]); // skill-2 has no description
      isInstalledStub.returns(false);
      promptCheckboxStub.resolves([]);

      await Add.run([], oclifConfig);

      const choices = promptCheckboxStub.firstCall.args[1] as Array<CheckboxChoice | Separator>;
      const skillChoice = choices.find((c): c is CheckboxChoice => 'name' in c && c.name === 'skill-2');
      expect(skillChoice).to.exist;
    });
  });

  describe('no artifacts available', () => {
    it('returns empty result when no artifacts available', async () => {
      getActiveToolStub.returns('copilot');
      listAvailableStub.resolves([]);

      const result = await Add.run([], oclifConfig);

      expect(result.installed).to.have.lengthOf(0);
      expect(result.skipped).to.have.lengthOf(0);
      expect(result.total).to.equal(0);
      expect(promptCheckboxStub.called).to.be.false;
    });
  });

  describe('all already installed', () => {
    it('returns empty result when all artifacts are installed', async () => {
      getActiveToolStub.returns('copilot');
      listAvailableStub.resolves([{ ...availableArtifacts[0], installed: true }]);

      const result = await Add.run([], oclifConfig);

      expect(result.installed).to.have.lengthOf(0);
      expect(result.total).to.equal(0);
      expect(promptCheckboxStub.called).to.be.false;
    });
  });

  describe('nothing selected', () => {
    it('returns empty result when user selects nothing', async () => {
      getActiveToolStub.returns('copilot');
      listAvailableStub.resolves(availableArtifacts);
      promptCheckboxStub.resolves([]);

      const result = await Add.run([], oclifConfig);

      expect(result.installed).to.have.lengthOf(0);
      expect(result.total).to.equal(0);
      expect(installStub.called).to.be.false;
    });
  });

  describe('skips duplicates', () => {
    it('skips artifact if it becomes installed before installation', async () => {
      getActiveToolStub.returns('copilot');
      listAvailableStub.resolves(availableArtifacts);
      promptCheckboxStub.resolves([availableArtifacts[0], availableArtifacts[1]]);
      isInstalledStub.onFirstCall().returns(true); // agent-1 now installed
      isInstalledStub.onSecondCall().returns(false); // skill-1 still not installed
      installStub.resolves(installSuccess);

      const result = await Add.run([], oclifConfig);

      expect(result.skipped).to.have.lengthOf(1);
      expect(result.skipped[0].name).to.equal('agent-1');
      expect(result.installed).to.have.lengthOf(1);
      expect(installStub.callCount).to.equal(1);
    });
  });

  describe('no tool configured', () => {
    it('throws SfError when no tool is configured', async () => {
      getActiveToolStub.returns(undefined);

      const cmd = new Add([], oclifConfig);
      try {
        await cmd.run();
        expect.fail('Should have thrown SfError');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.include('No AI tool is configured');
      }
    });
  });

  describe('mixed results', () => {
    it('reports both successful and failed installations', async () => {
      getActiveToolStub.returns('copilot');
      listAvailableStub.resolves(availableArtifacts);
      promptCheckboxStub.resolves([availableArtifacts[0], availableArtifacts[1]]);
      isInstalledStub.returns(false);
      installStub.onFirstCall().resolves(installFailure);
      installStub.onSecondCall().resolves(installSuccess);

      const result = await Add.run([], oclifConfig);

      expect(result.installed).to.have.lengthOf(2);
      const successful = result.installed.filter((r) => r.success);
      const failed = result.installed.filter((r) => !r.success);
      expect(successful).to.have.lengthOf(1);
      expect(failed).to.have.lengthOf(1);
    });

    it('handles install failure without error property', async () => {
      getActiveToolStub.returns('copilot');
      listAvailableStub.resolves([availableArtifacts[0]]);
      promptCheckboxStub.resolves([availableArtifacts[0]]);
      isInstalledStub.returns(false);
      installStub.resolves({ ...installFailure, error: undefined });

      const result = await Add.run([], oclifConfig);

      expect(result.installed).to.have.lengthOf(1);
      expect(result.installed[0].success).to.be.false;
    });
  });

  describe('non-interactive mode', () => {
    it('throws SfError with --json flag', async () => {
      const cmd = new Add(['--json'], oclifConfig);
      try {
        await cmd.run();
        expect.fail('Should have thrown SfError');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.include('interactive terminal');
      }
    });

    it('throws SfError with --no-prompt flag', async () => {
      const cmd = new Add(['--no-prompt'], oclifConfig);
      try {
        await cmd.run();
        expect.fail('Should have thrown SfError');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.include('interactive terminal');
      }
    });
  });

  describe('command metadata', () => {
    it('has required static properties', () => {
      expect(Add.summary).to.be.a('string').and.not.be.empty;
      expect(Add.description).to.be.a('string').and.not.be.empty;
      expect(Add.examples).to.be.an('array').and.have.length.greaterThan(0);
      expect(Add.enableJsonFlag).to.be.true;
    });

    it('has correct flag definitions', () => {
      expect(Add.flags).to.have.property('source');
      expect(Add.flags).to.have.property('no-prompt');
    });
  });
});
