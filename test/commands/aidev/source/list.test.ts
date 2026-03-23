/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { Config } from '@oclif/core';
import SourceList from '../../../../src/commands/aidev/source/list.js';
import { SourceService } from '../../../../src/services/sourceService.js';
import { AiDevConfig } from '../../../../src/config/aiDevConfig.js';
import type { SourceConfig } from '../../../../src/types/config.js';

describe('aidev source list', () => {
  let sandbox: sinon.SinonSandbox;
  let listStub: sinon.SinonStub;
  let oclifConfig: Config;

  const sampleSources: SourceConfig[] = [
    { repo: 'owner/repo1', isDefault: true, addedAt: '2024-01-01T00:00:00.000Z' },
    { repo: 'owner/repo2', isDefault: false, addedAt: '2024-01-02T00:00:00.000Z' },
  ];

  before(async () => {
    oclifConfig = await Config.load({ root: process.cwd() });
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.stub(AiDevConfig, 'create').resolves({
      getDefaultSource: () => undefined,
      getInstalledArtifacts: () => [],
    } as unknown as AiDevConfig);
    listStub = sandbox.stub(SourceService.prototype, 'list');
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('with configured sources', () => {
    it('lists all configured sources', async () => {
      listStub.returns(sampleSources);

      const result = await SourceList.run([], oclifConfig);

      expect(result.sources).to.have.length(2);
      expect(result.sources[0].repo).to.equal('owner/repo1');
      expect(result.sources[0].isDefault).to.be.true;
      expect(result.sources[1].repo).to.equal('owner/repo2');
      expect(result.sources[1].isDefault).to.be.false;
    });

    it('returns correct structure for JSON output', async () => {
      listStub.returns(sampleSources);

      const result = await SourceList.run(['--json'], oclifConfig);

      expect(result).to.have.property('sources');
      expect(result.sources).to.be.an('array');
      expect(result.sources[0]).to.have.all.keys('repo', 'isDefault', 'addedAt');
    });

    it('handles sources with undefined isDefault', async () => {
      const sourcesWithUndefinedDefault: SourceConfig[] = [{ repo: 'owner/repo', addedAt: '2024-01-01T00:00:00.000Z' }];
      listStub.returns(sourcesWithUndefinedDefault);

      const result = await SourceList.run([], oclifConfig);

      expect(result.sources[0].isDefault).to.be.false;
    });

    it('preserves addedAt timestamp', async () => {
      listStub.returns(sampleSources);

      const result = await SourceList.run([], oclifConfig);

      expect(result.sources[0].addedAt).to.equal('2024-01-01T00:00:00.000Z');
    });

    it('handles single source', async () => {
      listStub.returns([sampleSources[0]]);

      const result = await SourceList.run([], oclifConfig);

      expect(result.sources).to.have.length(1);
      expect(result.sources[0].repo).to.equal('owner/repo1');
    });

    it('handles many sources', async () => {
      const manySources: SourceConfig[] = Array.from({ length: 10 }, (_, i) => ({
        repo: `owner/repo${i}`,
        isDefault: i === 0,
        addedAt: '2024-01-01T00:00:00.000Z',
      }));
      listStub.returns(manySources);

      const result = await SourceList.run([], oclifConfig);

      expect(result.sources).to.have.length(10);
    });
  });

  describe('with no configured sources', () => {
    it('returns empty array when no sources configured', async () => {
      listStub.returns([]);

      const result = await SourceList.run([], oclifConfig);

      expect(result.sources).to.be.an('array').that.is.empty;
    });

    it('outputs info message when no sources configured', async () => {
      listStub.returns([]);
      const cmd = new SourceList([], oclifConfig);
      const logStub = sandbox.stub(cmd, 'log');

      await cmd.run();

      expect(logStub.calledOnce).to.be.true;
      expect(logStub.firstCall.args[0]).to.include('No source repositories configured');
    });
  });

  describe('command metadata', () => {
    it('has required static properties', () => {
      expect(SourceList.summary).to.be.a('string').and.not.be.empty;
      expect(SourceList.description).to.be.a('string').and.not.be.empty;
      expect(SourceList.examples).to.be.an('array').and.have.length.greaterThan(0);
      expect(SourceList.enableJsonFlag).to.be.true;
    });

    it('summary contains relevant keywords', () => {
      expect(SourceList.summary.toLowerCase()).to.include('source');
    });
  });

  describe('table output', () => {
    interface TableColumn {
      key: string;
      name: string;
    }

    interface TableArg {
      data: Array<{ repo: string; default: string; addedAt: string }>;
      columns: TableColumn[];
    }

    it('calls table method with correct columns', async () => {
      listStub.returns(sampleSources);
      const cmd = new SourceList([], oclifConfig);
      const tableStub = sandbox.stub(cmd, 'table');

      await cmd.run();

      expect(tableStub.calledOnce).to.be.true;
      const tableArg = tableStub.firstCall.args[0] as TableArg;
      expect(tableArg).to.have.property('data');
      expect(tableArg).to.have.property('columns');
      expect(tableArg.columns).to.have.length(3);
    });

    it('formats default column correctly for default source', async () => {
      listStub.returns(sampleSources);
      const cmd = new SourceList([], oclifConfig);
      const tableStub = sandbox.stub(cmd, 'table');

      await cmd.run();

      const tableArg = tableStub.firstCall.args[0] as TableArg;

      // Check that the default column shows 'Yes' for the default source
      expect(tableArg.data[0].default).to.equal('Yes');
      expect(tableArg.data[1].default).to.equal('');
    });

    it('does not call table when no sources', async () => {
      listStub.returns([]);
      const cmd = new SourceList([], oclifConfig);
      const tableStub = sandbox.stub(cmd, 'table');

      await cmd.run();

      expect(tableStub.called).to.be.false;
    });
  });
});
