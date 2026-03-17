/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { Config } from '@oclif/core';
import ListArtifacts from '../../../../src/commands/aidev/list/artifacts.js';
import { ArtifactService } from '../../../../src/services/artifactService.js';
import { AiDevConfig } from '../../../../src/config/aiDevConfig.js';
import type { InstalledArtifact } from '../../../../src/types/config.js';
import type { AvailableArtifact } from '../../../../src/services/artifactService.js';

describe('aidev list artifacts', () => {
  let sandbox: sinon.SinonSandbox;
  let listInstalledStub: sinon.SinonStub;
  let listAvailableStub: sinon.SinonStub;
  let oclifConfig: Config;

  const installedArtifacts: InstalledArtifact[] = [
    {
      name: 'my-skill',
      type: 'skill',
      path: '.github/copilot-skills/my-skill.md',
      source: 'owner/repo',
      installedAt: '2024-01-01T00:00:00Z',
    },
    {
      name: 'my-agent',
      type: 'agent',
      path: '.github/agents/my-agent/',
      source: 'owner/repo',
      installedAt: '2024-01-02T00:00:00Z',
    },
  ];

  const availableArtifacts: AvailableArtifact[] = [
    {
      name: 'my-skill',
      type: 'skill',
      description: 'A test skill',
      source: 'owner/repo',
      installed: true,
    },
    {
      name: 'other-skill',
      type: 'skill',
      description: 'Another skill',
      source: 'owner/repo',
      installed: false,
    },
    {
      name: 'my-agent',
      type: 'agent',
      source: 'other/repo',
      installed: false,
    },
  ];

  before(async () => {
    oclifConfig = await Config.load({ root: process.cwd() });
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.stub(AiDevConfig, 'create').resolves({} as AiDevConfig);
    listInstalledStub = sandbox.stub(ArtifactService.prototype, 'listInstalled');
    listAvailableStub = sandbox.stub(ArtifactService.prototype, 'listAvailable');
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('list all artifacts', () => {
    it('lists both installed and available artifacts', async () => {
      listInstalledStub.returns(installedArtifacts);
      listAvailableStub.resolves(availableArtifacts);

      const result = await ListArtifacts.run([], oclifConfig);

      expect(result.installed).to.deep.equal(installedArtifacts);
      expect(result.available).to.deep.equal(availableArtifacts);
      expect(listInstalledStub.calledOnce).to.be.true;
      expect(listAvailableStub.calledOnce).to.be.true;
    });

    it('returns empty arrays when no artifacts', async () => {
      listInstalledStub.returns([]);
      listAvailableStub.resolves([]);

      const result = await ListArtifacts.run([], oclifConfig);

      expect(result.installed).to.deep.equal([]);
      expect(result.available).to.deep.equal([]);
    });
  });

  describe('--installed flag', () => {
    it('shows only installed artifacts', async () => {
      listInstalledStub.returns(installedArtifacts);

      const result = await ListArtifacts.run(['--installed'], oclifConfig);

      expect(result.installed).to.deep.equal(installedArtifacts);
      expect(result.available).to.deep.equal([]);
      expect(listInstalledStub.calledOnce).to.be.true;
      expect(listAvailableStub.called).to.be.false;
    });

    it('works with short flag -i', async () => {
      listInstalledStub.returns(installedArtifacts);

      const result = await ListArtifacts.run(['-i'], oclifConfig);

      expect(result.installed).to.deep.equal(installedArtifacts);
      expect(listAvailableStub.called).to.be.false;
    });
  });

  describe('--available flag', () => {
    it('shows only available artifacts', async () => {
      listAvailableStub.resolves(availableArtifacts);

      const result = await ListArtifacts.run(['--available'], oclifConfig);

      expect(result.installed).to.deep.equal([]);
      expect(result.available).to.deep.equal(availableArtifacts);
      expect(listInstalledStub.called).to.be.false;
      expect(listAvailableStub.calledOnce).to.be.true;
    });

    it('works with short flag -a', async () => {
      listAvailableStub.resolves(availableArtifacts);

      const result = await ListArtifacts.run(['-a'], oclifConfig);

      expect(result.available).to.deep.equal(availableArtifacts);
      expect(listInstalledStub.called).to.be.false;
    });
  });

  describe('--type flag', () => {
    it('filters by artifact type', async () => {
      listInstalledStub.returns([installedArtifacts[0]]);
      listAvailableStub.resolves([availableArtifacts[0], availableArtifacts[1]]);

      const result = await ListArtifacts.run(['--type', 'skill'], oclifConfig);

      expect(listInstalledStub.firstCall.args[0]).to.deep.equal({ type: 'skill' });
      expect(listAvailableStub.firstCall.args[0]).to.deep.include({ type: 'skill' });
      expect(result.installed).to.have.lengthOf(1);
      expect(result.available).to.have.lengthOf(2);
    });

    it('works with short flag -t', async () => {
      listInstalledStub.returns([]);
      listAvailableStub.resolves([]);

      await ListArtifacts.run(['-t', 'agent'], oclifConfig);

      expect(listInstalledStub.firstCall.args[0]).to.deep.equal({ type: 'agent' });
    });
  });

  describe('--source flag', () => {
    it('filters available artifacts by source', async () => {
      listInstalledStub.returns(installedArtifacts);
      listAvailableStub.resolves([availableArtifacts[0], availableArtifacts[1]]);

      await ListArtifacts.run(['--source', 'owner/repo'], oclifConfig);

      expect(listAvailableStub.firstCall.args[0]).to.deep.include({ source: 'owner/repo' });
    });

    it('works with short flag -s', async () => {
      listInstalledStub.returns([]);
      listAvailableStub.resolves([]);

      await ListArtifacts.run(['-s', 'other/repo'], oclifConfig);

      expect(listAvailableStub.firstCall.args[0]).to.deep.include({ source: 'other/repo' });
    });
  });

  describe('combined flags', () => {
    it('combines --available and --type flags', async () => {
      listAvailableStub.resolves([availableArtifacts[2]]);

      const result = await ListArtifacts.run(['--available', '--type', 'agent'], oclifConfig);

      expect(result.installed).to.deep.equal([]);
      expect(listInstalledStub.called).to.be.false;
      expect(listAvailableStub.firstCall.args[0]).to.deep.include({ type: 'agent' });
    });

    it('combines --installed and --type flags', async () => {
      listInstalledStub.returns([installedArtifacts[1]]);

      const result = await ListArtifacts.run(['--installed', '--type', 'agent'], oclifConfig);

      expect(result.available).to.deep.equal([]);
      expect(listAvailableStub.called).to.be.false;
      expect(listInstalledStub.firstCall.args[0]).to.deep.equal({ type: 'agent' });
    });
  });

  describe('command metadata', () => {
    it('has required static properties', () => {
      expect(ListArtifacts.summary).to.be.a('string').and.not.be.empty;
      expect(ListArtifacts.description).to.be.a('string').and.not.be.empty;
      expect(ListArtifacts.examples).to.be.an('array').and.have.length.greaterThan(0);
      expect(ListArtifacts.enableJsonFlag).to.be.true;
    });

    it('has correct flag definitions', () => {
      expect(ListArtifacts.flags).to.have.property('type');
      expect(ListArtifacts.flags).to.have.property('installed');
      expect(ListArtifacts.flags).to.have.property('available');
      expect(ListArtifacts.flags).to.have.property('source');
    });
  });
});
