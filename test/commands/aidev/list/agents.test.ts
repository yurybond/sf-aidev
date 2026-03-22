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

  before(async () => {
    oclifConfig = await Config.load({ root: process.cwd() });
  });

  afterEach(() => {
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

  it('handles interactive mode with user selecting an artifact', async () => {
    const originalStdinTTY = process.stdin.isTTY;
    const originalStdoutTTY = process.stdout.isTTY;

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

      // First call returns an agent, second call returns null to exit the loop
      const promptSelectStub = sandbox.stub(ListAgents.prototype, 'promptSelect' as keyof ListAgents);
      promptSelectStub.onFirstCall().resolves({ name: 'test-agent', type: 'agent', installed: false });
      promptSelectStub.onSecondCall().resolves(null);

      // Return 'back' action to go back to the list
      sandbox.stub(ListAgents.prototype, 'promptAction' as keyof ListAgents).resolves('back');

      const result = await ListAgents.run([], oclifConfig);

      expect(result.agents.length).to.equal(1);
      expect(promptSelectStub.callCount).to.equal(2);
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

  it('handles interactive mode with install action', async () => {
    const originalStdinTTY = process.stdin.isTTY;
    const originalStdoutTTY = process.stdout.isTTY;

    try {
      Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true, writable: true });
      Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true, writable: true });

      sandbox.stub(AiDevConfig, 'create').resolves({
        getSources: () => [{ repo: 'test/repo', isDefault: true, addedAt: '' }],
        getInstalledArtifacts: () => [],
        getTool: () => 'copilot',
        addInstalledArtifact: sandbox.stub(),
        write: sandbox.stub().resolves(),
      } as unknown as AiDevConfig);
      sandbox.stub(LocalFileScanner, 'scanAgents').resolves([]);
      sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
        artifacts: [{ name: 'test-agent', type: 'agent', source: 'test/repo', installed: false }],
        errors: [],
        partialSuccess: false,
      });
      sandbox.stub(ArtifactService.prototype, 'install').resolves({
        success: true,
        artifact: 'test-agent',
        type: 'agent',
        tool: 'copilot',
        installedPath: '/test/path',
      });

      const promptSelectStub = sandbox.stub(ListAgents.prototype, 'promptSelect' as keyof ListAgents);
      promptSelectStub
        .onFirstCall()
        .resolves({ name: 'test-agent', type: 'agent', installed: false, source: 'test/repo' });
      promptSelectStub.onSecondCall().resolves(null);

      sandbox.stub(ListAgents.prototype, 'promptAction' as keyof ListAgents).resolves('install');

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

  it('handles interactive mode with remove action', async () => {
    const originalStdinTTY = process.stdin.isTTY;
    const originalStdoutTTY = process.stdout.isTTY;

    try {
      Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true, writable: true });
      Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true, writable: true });

      sandbox.stub(AiDevConfig, 'create').resolves({
        getSources: () => [{ repo: 'test/repo', isDefault: true, addedAt: '' }],
        getInstalledArtifacts: () => [
          { name: 'test-agent', type: 'agent', path: '/test/path', source: 'test/repo', installedAt: '' },
        ],
        getTool: () => 'copilot',
        removeInstalledArtifact: sandbox.stub(),
        write: sandbox.stub().resolves(),
      } as unknown as AiDevConfig);
      sandbox
        .stub(LocalFileScanner, 'scanAgents')
        .resolves([{ name: 'test-agent', type: 'agent', installed: true, path: '/test/path' }]);
      sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
        artifacts: [{ name: 'test-agent', type: 'agent', source: 'test/repo', installed: true }],
        errors: [],
        partialSuccess: false,
      });
      sandbox.stub(ArtifactService.prototype, 'uninstall').resolves({
        success: true,
      });

      const promptSelectStub = sandbox.stub(ListAgents.prototype, 'promptSelect' as keyof ListAgents);
      promptSelectStub
        .onFirstCall()
        .resolves({ name: 'test-agent', type: 'agent', installed: true, source: 'test/repo' });
      promptSelectStub.onSecondCall().resolves(null);

      sandbox.stub(ListAgents.prototype, 'promptAction' as keyof ListAgents).resolves('remove');

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
});
