/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { Config } from '@oclif/core';
import ListSkills from '../../../../src/commands/aidev/list/skills.js';
import { ArtifactService } from '../../../../src/services/artifactService.js';
import { LocalFileScanner } from '../../../../src/services/localFileScanner.js';
import { AiDevConfig } from '../../../../src/config/aiDevConfig.js';

describe('aidev list skills', () => {
  let sandbox: sinon.SinonSandbox;
  let scanSkillsStub: sinon.SinonStub;
  let listAvailableStub: sinon.SinonStub;
  let oclifConfig: Config;

  before(async () => {
    oclifConfig = await Config.load({ root: process.cwd() });
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.stub(AiDevConfig, 'create').resolves({} as AiDevConfig);
    scanSkillsStub = sandbox.stub(LocalFileScanner, 'scanSkills');
    listAvailableStub = sandbox.stub(ArtifactService.prototype, 'listAvailable');
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('list skills', () => {
    it('should list merged local and available skills', async () => {
      scanSkillsStub.resolves([{ name: 'local-skill', type: 'skill', installed: true, path: '/path' }]);
      listAvailableStub.resolves([
        { name: 'remote-skill', type: 'skill', description: 'A skill', source: 'owner/repo', installed: false },
      ]);

      const result = await ListSkills.run([], oclifConfig);

      expect(result.skills).to.have.lengthOf(2);
      expect(result.counts.total).to.equal(2);
    });

    it('should return empty when no skills exist', async () => {
      scanSkillsStub.resolves([]);
      listAvailableStub.resolves([]);

      const result = await ListSkills.run([], oclifConfig);

      expect(result.skills).to.deep.equal([]);
      expect(result.counts.total).to.equal(0);
    });

    it('should sort skills alphabetically', async () => {
      scanSkillsStub.resolves([
        { name: 'zebra-skill', type: 'skill', installed: true, path: '/path' },
        { name: 'alpha-skill', type: 'skill', installed: true, path: '/path' },
      ]);
      listAvailableStub.resolves([]);

      const result = await ListSkills.run([], oclifConfig);

      expect(result.skills[0].name).to.equal('alpha-skill');
      expect(result.skills[1].name).to.equal('zebra-skill');
    });

    it('should deduplicate skills present both locally and in manifest', async () => {
      scanSkillsStub.resolves([{ name: 'shared-skill', type: 'skill', installed: true, path: '/path' }]);
      listAvailableStub.resolves([
        { name: 'shared-skill', type: 'skill', description: 'Shared', source: 'owner/repo', installed: true },
      ]);

      const result = await ListSkills.run([], oclifConfig);

      expect(result.skills).to.have.lengthOf(1);
      expect(result.skills[0].installed).to.be.true;
    });
  });

  describe('--source flag', () => {
    it('should filter by source and type', async () => {
      scanSkillsStub.resolves([]);
      listAvailableStub.resolves([]);

      await ListSkills.run(['--source', 'owner/repo'], oclifConfig);

      expect(listAvailableStub.firstCall.args[0]).to.deep.include({
        source: 'owner/repo',
        type: 'skill',
      });
    });

    it('should work with short flag -s', async () => {
      scanSkillsStub.resolves([]);
      listAvailableStub.resolves([]);

      await ListSkills.run(['-s', 'other/repo'], oclifConfig);

      expect(listAvailableStub.firstCall.args[0]).to.deep.include({ source: 'other/repo' });
    });
  });

  describe('counts', () => {
    it('should return correct installed and available counts', async () => {
      scanSkillsStub.resolves([
        { name: 'installed-skill', type: 'skill', installed: true, path: '/path' },
        { name: 'another-installed', type: 'skill', installed: true, path: '/path' },
      ]);
      listAvailableStub.resolves([{ name: 'available-skill', type: 'skill', source: 'owner/repo', installed: false }]);

      const result = await ListSkills.run([], oclifConfig);

      expect(result.counts.installed).to.equal(2);
      expect(result.counts.available).to.equal(1);
      expect(result.counts.total).to.equal(3);
    });
  });

  describe('command metadata', () => {
    it('should have required static properties', () => {
      expect(ListSkills.summary).to.be.a('string').and.not.be.empty;
      expect(ListSkills.description).to.be.a('string').and.not.be.empty;
      expect(ListSkills.examples).to.be.an('array').and.have.length.greaterThan(0);
      expect(ListSkills.enableJsonFlag).to.be.true;
    });

    it('should have source flag', () => {
      expect(ListSkills.flags).to.have.property('source');
    });
  });
});
