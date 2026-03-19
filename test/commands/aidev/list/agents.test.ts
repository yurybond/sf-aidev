/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { Config } from '@oclif/core';
import ListAgents from '../../../../src/commands/aidev/list/agents.js';
import { ArtifactService } from '../../../../src/services/artifactService.js';
import { LocalFileScanner } from '../../../../src/services/localFileScanner.js';
import { AiDevConfig } from '../../../../src/config/aiDevConfig.js';

describe('aidev list agents', () => {
  let sandbox: sinon.SinonSandbox;
  let scanAgentsStub: sinon.SinonStub;
  let listAvailableStub: sinon.SinonStub;
  let oclifConfig: Config;

  before(async () => {
    oclifConfig = await Config.load({ root: process.cwd() });
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.stub(AiDevConfig, 'create').resolves({} as AiDevConfig);
    scanAgentsStub = sandbox.stub(LocalFileScanner, 'scanAgents');
    listAvailableStub = sandbox.stub(ArtifactService.prototype, 'listAvailable');
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('list agents', () => {
    it('should list merged local and available agents', async () => {
      scanAgentsStub.resolves([{ name: 'local-agent', type: 'agent', installed: true, path: '/path' }]);
      listAvailableStub.resolves([{ name: 'remote-agent', type: 'agent', source: 'owner/repo', installed: false }]);

      const result = await ListAgents.run([], oclifConfig);

      expect(result.agents).to.have.lengthOf(2);
      expect(result.counts.total).to.equal(2);
    });

    it('should return empty when no agents exist', async () => {
      scanAgentsStub.resolves([]);
      listAvailableStub.resolves([]);

      const result = await ListAgents.run([], oclifConfig);

      expect(result.agents).to.deep.equal([]);
      expect(result.counts.total).to.equal(0);
    });

    it('should sort agents alphabetically', async () => {
      scanAgentsStub.resolves([
        { name: 'zebra-agent', type: 'agent', installed: true, path: '/path' },
        { name: 'alpha-agent', type: 'agent', installed: true, path: '/path' },
      ]);
      listAvailableStub.resolves([]);

      const result = await ListAgents.run([], oclifConfig);

      expect(result.agents[0].name).to.equal('alpha-agent');
      expect(result.agents[1].name).to.equal('zebra-agent');
    });
  });

  describe('--source flag', () => {
    it('should filter by source and type', async () => {
      scanAgentsStub.resolves([]);
      listAvailableStub.resolves([]);

      await ListAgents.run(['--source', 'owner/repo'], oclifConfig);

      expect(listAvailableStub.firstCall.args[0]).to.deep.include({
        source: 'owner/repo',
        type: 'agent',
      });
    });
  });

  describe('counts', () => {
    it('should return correct installed and available counts', async () => {
      scanAgentsStub.resolves([{ name: 'installed-agent', type: 'agent', installed: true, path: '/path' }]);
      listAvailableStub.resolves([{ name: 'available-agent', type: 'agent', source: 'owner/repo', installed: false }]);

      const result = await ListAgents.run([], oclifConfig);

      expect(result.counts.installed).to.equal(1);
      expect(result.counts.available).to.equal(1);
    });
  });

  describe('command metadata', () => {
    it('should have required static properties', () => {
      expect(ListAgents.summary).to.be.a('string').and.not.be.empty;
      expect(ListAgents.description).to.be.a('string').and.not.be.empty;
      expect(ListAgents.examples).to.be.an('array').and.have.length.greaterThan(0);
      expect(ListAgents.enableJsonFlag).to.be.true;
    });
  });
});
