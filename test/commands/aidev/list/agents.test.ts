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
  const sandbox = sinon.createSandbox();
  let oclifConfig: Config;
  let originalStdinTTY: boolean | undefined;
  let originalStdoutTTY: boolean | undefined;

  before(async () => {
    oclifConfig = await Config.load({ root: process.cwd() });
  });

  beforeEach(() => {
    originalStdinTTY = process.stdin.isTTY;
    originalStdoutTTY = process.stdout.isTTY;
  });

  afterEach(() => {
    Object.defineProperty(process.stdin, 'isTTY', {
      value: originalStdinTTY,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(process.stdout, 'isTTY', {
      value: originalStdoutTTY,
      configurable: true,
      writable: true,
    });
    sandbox.restore();
  });

  it('lists all agents in non-interactive mode', async () => {
    sandbox.stub(AiDevConfig, 'create').resolves({
      getSources: () => [{ repo: 'test/repo', isDefault: true, addedAt: '' }],
      getInstalledArtifacts: () => [],
      getTool: () => 'copilot',
    } as unknown as AiDevConfig);
    sandbox.stub(LocalFileScanner, 'scanAgents').resolves([]);
    sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
      artifacts: [
        { name: 'agent1', type: 'agent', source: 'test/repo', installed: false },
        { name: 'agent2', type: 'agent', source: 'test/repo', installed: false, description: 'An agent' },
      ],
      errors: [],
      partialSuccess: false,
    });

    const result = await ListAgents.run(['--json'], oclifConfig);

    expect(result.agents.length).to.equal(2);
    expect(result.counts.available).to.equal(2);
    expect(result.counts.installed).to.equal(0);
  });

  it('returns JSON output with --json flag', async () => {
    sandbox.stub(AiDevConfig, 'create').resolves({
      getSources: () => [],
      getInstalledArtifacts: () => [],
      getTool: () => 'copilot',
    } as unknown as AiDevConfig);
    sandbox.stub(LocalFileScanner, 'scanAgents').resolves([]);
    sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
      artifacts: [],
      errors: [],
      partialSuccess: false,
    });

    const result = await ListAgents.run(['--json'], oclifConfig);

    expect(result).to.have.property('agents');
    expect(result).to.have.property('counts');
  });

  it('merges local and available agents', async () => {
    sandbox.stub(AiDevConfig, 'create').resolves({
      getSources: () => [{ repo: 'test/repo', isDefault: true, addedAt: '' }],
      getInstalledArtifacts: () => [],
      getTool: () => 'copilot',
    } as unknown as AiDevConfig);
    sandbox
      .stub(LocalFileScanner, 'scanAgents')
      .resolves([{ name: 'local-agent', type: 'agent', installed: true, path: '/path/to/agent.md' }]);
    sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
      artifacts: [
        { name: 'local-agent', type: 'agent', source: 'test/repo', installed: true, description: 'From manifest' },
        { name: 'remote-agent', type: 'agent', source: 'test/repo', installed: false },
      ],
      errors: [],
      partialSuccess: false,
    });

    const result = await ListAgents.run(['--json'], oclifConfig);

    expect(result.agents.length).to.equal(2);
    expect(result.counts.installed).to.equal(1);
    expect(result.counts.available).to.equal(1);
  });

  it('filters by source when --source flag is provided', async () => {
    sandbox.stub(AiDevConfig, 'create').resolves({
      getSources: () => [
        { repo: 'source1/repo', isDefault: true, addedAt: '' },
        { repo: 'source2/repo', isDefault: false, addedAt: '' },
      ],
      getInstalledArtifacts: () => [],
      getTool: () => 'copilot',
    } as unknown as AiDevConfig);
    sandbox.stub(LocalFileScanner, 'scanAgents').resolves([]);

    const listAvailableStub = sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors');
    listAvailableStub.resolves({
      artifacts: [],
      errors: [],
      partialSuccess: false,
    });

    await ListAgents.run(['--source', 'source1/repo', '--json'], oclifConfig);

    expect(listAvailableStub.calledOnce).to.equal(true);
    expect(listAvailableStub.firstCall.args[0]).to.deep.include({
      source: 'source1/repo',
      type: 'agent',
    });
  });

  it('shows warnings for failed sources', async () => {
    sandbox.stub(AiDevConfig, 'create').resolves({
      getSources: () => [{ repo: 'failing/repo', isDefault: true, addedAt: '' }],
      getInstalledArtifacts: () => [],
      getTool: () => 'copilot',
    } as unknown as AiDevConfig);
    sandbox.stub(LocalFileScanner, 'scanAgents').resolves([]);
    sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
      artifacts: [],
      errors: [{ source: 'failing/repo', error: 'Network error' }],
      partialSuccess: false,
    });

    const result = await ListAgents.run(['--json'], oclifConfig);

    // Command should complete successfully even with errors
    expect(result.agents).to.be.an('array');
  });

  it('shows warnings for failed sources in non-JSON mode', async () => {
    sandbox.stub(AiDevConfig, 'create').resolves({
      getSources: () => [{ repo: 'failing/repo', isDefault: true, addedAt: '' }],
      getInstalledArtifacts: () => [],
      getTool: () => 'copilot',
    } as unknown as AiDevConfig);
    sandbox.stub(LocalFileScanner, 'scanAgents').resolves([]);
    sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
      artifacts: [{ name: 'test-agent', type: 'agent', source: 'test/repo', installed: false }],
      errors: [
        { source: 'failing/repo', error: 'Network error' },
        { source: 'another/repo', error: 'Timeout' },
      ],
      partialSuccess: true,
    });

    const result = await ListAgents.run([], oclifConfig);

    // Command should complete successfully even with errors
    expect(result.agents).to.be.an('array');
    expect(result.agents.length).to.equal(1);
  });

  it('sorts agents alphabetically', async () => {
    sandbox.stub(AiDevConfig, 'create').resolves({
      getSources: () => [{ repo: 'test/repo', isDefault: true, addedAt: '' }],
      getInstalledArtifacts: () => [],
      getTool: () => 'copilot',
    } as unknown as AiDevConfig);
    sandbox.stub(LocalFileScanner, 'scanAgents').resolves([]);
    sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
      artifacts: [
        { name: 'zebra-agent', type: 'agent', source: 'test/repo', installed: false },
        { name: 'alpha-agent', type: 'agent', source: 'test/repo', installed: false },
        { name: 'beta-agent', type: 'agent', source: 'test/repo', installed: false },
      ],
      errors: [],
      partialSuccess: false,
    });

    const result = await ListAgents.run(['--json'], oclifConfig);

    expect(result.agents[0].name).to.equal('alpha-agent');
    expect(result.agents[1].name).to.equal('beta-agent');
    expect(result.agents[2].name).to.equal('zebra-agent');
  });

  it('handles interactive mode with runExpandableSelect', async () => {
    try {
      Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true, writable: true });
      Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true, writable: true });

      sandbox.stub(AiDevConfig, 'create').resolves({
        getSources: () => [{ repo: 'test/repo', isDefault: true, addedAt: '' }],
        getInstalledArtifacts: () => [],
        getTool: () => 'copilot',
      } as unknown as AiDevConfig);
      sandbox.stub(LocalFileScanner, 'scanAgents').resolves([]);
      sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
        artifacts: [{ name: 'test-agent', type: 'agent', source: 'test/repo', installed: false }],
        errors: [],
        partialSuccess: false,
      });

      // Stub runExpandableSelect to simulate user exiting immediately
      sandbox.stub(ListAgents.prototype, 'runExpandableSelect' as keyof ListAgents).resolves();

      const result = await ListAgents.run([], oclifConfig);

      expect(result.agents.length).to.equal(1);
    } finally {
      Object.defineProperty(process.stdin, 'isTTY', {
        value: originalStdinTTY,
        configurable: true,
        writable: true,
      });
      Object.defineProperty(process.stdout, 'isTTY', {
        value: originalStdoutTTY,
        configurable: true,
        writable: true,
      });
    }
  });

  it('skips interactive mode when no agents available', async () => {
    try {
      Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true, writable: true });
      Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true, writable: true });

      sandbox.stub(AiDevConfig, 'create').resolves({
        getSources: () => [],
        getInstalledArtifacts: () => [],
        getTool: () => 'copilot',
      } as unknown as AiDevConfig);
      sandbox.stub(LocalFileScanner, 'scanAgents').resolves([]);
      sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
        artifacts: [],
        errors: [],
        partialSuccess: false,
      });

      const runExpandableSelectStub = sandbox.stub(ListAgents.prototype, 'runExpandableSelect' as keyof ListAgents);
      runExpandableSelectStub.resolves();

      const result = await ListAgents.run([], oclifConfig);

      expect(result.counts.total).to.equal(0);
      expect(runExpandableSelectStub.called).to.equal(false);
    } finally {
      Object.defineProperty(process.stdin, 'isTTY', {
        value: originalStdinTTY,
        configurable: true,
        writable: true,
      });
      Object.defineProperty(process.stdout, 'isTTY', {
        value: originalStdoutTTY,
        configurable: true,
        writable: true,
      });
    }
  });

  it('uses non-interactive display when TTY is not available', async () => {
    sandbox.stub(AiDevConfig, 'create').resolves({
      getSources: () => [{ repo: 'test/repo', isDefault: true, addedAt: '' }],
      getInstalledArtifacts: () => [],
      getTool: () => 'copilot',
    } as unknown as AiDevConfig);
    sandbox.stub(LocalFileScanner, 'scanAgents').resolves([]);
    sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
      artifacts: [{ name: 'test-agent', type: 'agent', source: 'test/repo', installed: false }],
      errors: [],
      partialSuccess: false,
    });

    const runExpandableSelectStub = sandbox.stub(ListAgents.prototype, 'runExpandableSelect' as keyof ListAgents);

    const result = await ListAgents.run([], oclifConfig);

    expect(result.agents.length).to.equal(1);
    expect(runExpandableSelectStub.called).to.be.false;
  });
});
