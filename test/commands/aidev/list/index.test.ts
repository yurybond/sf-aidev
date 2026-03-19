/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { Config } from '@oclif/core';
import List from '../../../../src/commands/aidev/list/index.js';
import { ArtifactService } from '../../../../src/services/artifactService.js';
import { LocalFileScanner } from '../../../../src/services/localFileScanner.js';
import { AiDevConfig } from '../../../../src/config/aiDevConfig.js';

describe('aidev list', () => {
  let sandbox: sinon.SinonSandbox;
  let scanAllStub: sinon.SinonStub;
  let scanInstructionsStub: sinon.SinonStub;
  let listAvailableStub: sinon.SinonStub;
  let oclifConfig: Config;

  before(async () => {
    oclifConfig = await Config.load({ root: process.cwd() });
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.stub(AiDevConfig, 'create').resolves({} as AiDevConfig);
    scanAllStub = sandbox.stub(LocalFileScanner, 'scanAll');
    scanInstructionsStub = sandbox.stub(LocalFileScanner, 'scanInstructions');
    listAvailableStub = sandbox.stub(ArtifactService.prototype, 'listAvailable');
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('list all artifacts', () => {
    it('should list merged local and available artifacts', async () => {
      scanAllStub.resolves([{ name: 'local-skill', type: 'skill', installed: true, path: '/path' }]);
      scanInstructionsStub.resolves([{ name: 'CLAUDE.md', type: 'instruction', installed: true, path: '/path' }]);
      listAvailableStub.resolves([
        { name: 'remote-skill', type: 'skill', description: 'A skill', source: 'owner/repo', installed: false },
      ]);

      const result = await List.run([], oclifConfig);

      expect(result.skills).to.have.lengthOf(2);
      expect(result.instructions).to.have.lengthOf(1);
      expect(result.counts.total).to.equal(3);
    });

    it('should return empty arrays when no artifacts exist', async () => {
      scanAllStub.resolves([]);
      scanInstructionsStub.resolves([]);
      listAvailableStub.resolves([]);

      const result = await List.run([], oclifConfig);

      expect(result.agents).to.deep.equal([]);
      expect(result.skills).to.deep.equal([]);
      expect(result.prompts).to.deep.equal([]);
      expect(result.instructions).to.deep.equal([]);
      expect(result.counts.total).to.equal(0);
    });

    it('should deduplicate artifacts that exist locally and in manifest', async () => {
      scanAllStub.resolves([{ name: 'shared-skill', type: 'skill', installed: true, path: '/path' }]);
      scanInstructionsStub.resolves([]);
      listAvailableStub.resolves([
        { name: 'shared-skill', type: 'skill', description: 'Shared', source: 'owner/repo', installed: true },
      ]);

      const result = await List.run([], oclifConfig);

      expect(result.skills).to.have.lengthOf(1);
      expect(result.skills[0].installed).to.be.true;
    });
  });

  describe('--source flag', () => {
    it('should pass source to listAvailable', async () => {
      scanAllStub.resolves([]);
      scanInstructionsStub.resolves([]);
      listAvailableStub.resolves([]);

      await List.run(['--source', 'owner/repo'], oclifConfig);

      expect(listAvailableStub.firstCall.args[0]).to.deep.include({ source: 'owner/repo' });
    });

    it('should work with short flag -s', async () => {
      scanAllStub.resolves([]);
      scanInstructionsStub.resolves([]);
      listAvailableStub.resolves([]);

      await List.run(['-s', 'other/repo'], oclifConfig);

      expect(listAvailableStub.firstCall.args[0]).to.deep.include({ source: 'other/repo' });
    });
  });

  describe('counts', () => {
    it('should return correct installed and available counts', async () => {
      scanAllStub.resolves([
        { name: 'installed-agent', type: 'agent', installed: true, path: '/path' },
        { name: 'installed-skill', type: 'skill', installed: true, path: '/path' },
      ]);
      scanInstructionsStub.resolves([]);
      listAvailableStub.resolves([
        { name: 'available-skill', type: 'skill', source: 'owner/repo', installed: false },
        { name: 'available-prompt', type: 'prompt', source: 'owner/repo', installed: false },
      ]);

      const result = await List.run([], oclifConfig);

      expect(result.counts.installed).to.equal(2);
      expect(result.counts.available).to.equal(2);
      expect(result.counts.total).to.equal(4);
    });
  });

  describe('command metadata', () => {
    it('should have required static properties', () => {
      expect(List.summary).to.be.a('string').and.not.be.empty;
      expect(List.description).to.be.a('string').and.not.be.empty;
      expect(List.examples).to.be.an('array').and.have.length.greaterThan(0);
      expect(List.enableJsonFlag).to.be.true;
    });

    it('should have source flag', () => {
      expect(List.flags).to.have.property('source');
    });
  });
});
