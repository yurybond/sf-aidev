/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { Config } from '@oclif/core';
import AddSkill from '../../../../src/commands/aidev/add/skill.js';
import { ArtifactService } from '../../../../src/services/artifactService.js';
import { AiDevConfig } from '../../../../src/config/aiDevConfig.js';
import type { InstallResult } from '../../../../src/services/artifactService.js';

describe('aidev add skill', () => {
  let sandbox: sinon.SinonSandbox;
  let installStub: sinon.SinonStub;
  let oclifConfig: Config;

  const successResult: InstallResult = {
    success: true,
    artifact: 'my-skill',
    type: 'skill',
    tool: 'copilot',
    installedPath: '.github/copilot-skills/my-skill.md',
  };

  const failResult: InstallResult = {
    success: false,
    artifact: 'missing-skill',
    type: 'skill',
    tool: 'copilot',
    installedPath: '',
    error: 'Artifact "missing-skill" not found in configured sources',
  };

  const noToolResult: InstallResult = {
    success: false,
    artifact: 'my-skill',
    type: 'skill',
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
    it('installs a skill by name', async () => {
      installStub.resolves(successResult);

      const result = await AddSkill.run(['--name', 'my-skill'], oclifConfig);

      expect(result).to.deep.equal(successResult);
      expect(installStub.calledOnce).to.be.true;
      expect(installStub.firstCall.args[0]).to.equal('my-skill');
      expect(installStub.firstCall.args[1]).to.deep.equal({ type: 'skill', source: undefined });
    });

    it('installs a skill with explicit source', async () => {
      installStub.resolves({ ...successResult });

      const result = await AddSkill.run(['--name', 'my-skill', '--source', 'owner/repo'], oclifConfig);

      expect('success' in result && result.success).to.be.true;
      expect(installStub.firstCall.args[1]).to.deep.equal({ type: 'skill', source: 'owner/repo' });
    });

    it('installs a skill using short flag -n', async () => {
      installStub.resolves(successResult);

      const result = await AddSkill.run(['-n', 'my-skill'], oclifConfig);

      expect('success' in result && result.success).to.be.true;
      expect(installStub.firstCall.args[0]).to.equal('my-skill');
    });

    it('installs a skill using short source flag -s', async () => {
      installStub.resolves(successResult);

      await AddSkill.run(['-n', 'my-skill', '-s', 'owner/repo'], oclifConfig);

      expect(installStub.firstCall.args[1]).to.deep.equal({ type: 'skill', source: 'owner/repo' });
    });
  });

  describe('error handling', () => {
    it('throws SfError when skill is not found', async () => {
      installStub.resolves(failResult);

      const cmd = new AddSkill(['--name', 'missing-skill'], oclifConfig);
      try {
        await cmd.run();
        expect.fail('Should have thrown SfError');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
        expect((error as Error).message).to.include('missing-skill');
      }
    });

    it('throws SfError when no tool is configured', async () => {
      installStub.resolves(noToolResult);

      const cmd = new AddSkill(['--name', 'my-skill'], oclifConfig);
      try {
        await cmd.run();
        expect.fail('Should have thrown SfError');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
      }
    });

    it('throws SfError with generic message when error is undefined', async () => {
      installStub.resolves({ ...failResult, error: undefined });

      const cmd = new AddSkill(['--name', 'my-skill'], oclifConfig);
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
      expect(AddSkill.summary).to.be.a('string').and.not.be.empty;
      expect(AddSkill.description).to.be.a('string').and.not.be.empty;
      expect(AddSkill.examples).to.be.an('array').and.have.length.greaterThan(0);
      expect(AddSkill.enableJsonFlag).to.be.true;
    });

    it('has correct flag definitions', () => {
      expect(AddSkill.flags).to.have.property('name');
      expect(AddSkill.flags).to.have.property('source');
    });
  });
});
