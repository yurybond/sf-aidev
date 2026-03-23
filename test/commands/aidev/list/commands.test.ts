/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { Config } from '@oclif/core';
import ListCommands from '../../../../src/commands/aidev/list/commands.js';
import { ArtifactService } from '../../../../src/services/artifactService.js';
import { LocalFileScanner } from '../../../../src/services/localFileScanner.js';
import { AiDevConfig } from '../../../../src/config/aiDevConfig.js';

describe('aidev list commands', () => {
  const sandbox = sinon.createSandbox();
  let oclifConfig: Config;

  before(async () => {
    oclifConfig = await Config.load({ root: process.cwd() });
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('lists all commands in non-interactive mode', async () => {
    sandbox.stub(AiDevConfig, 'create').resolves({
      getSources: () => [{ repo: 'test/repo', isDefault: true, addedAt: '' }],
      getInstalledArtifacts: () => [],
      getDefaultSource: () => undefined,
      getTool: () => 'copilot',
    } as unknown as AiDevConfig);
    sandbox.stub(LocalFileScanner, 'scanCommands').resolves([]);
    sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
      artifacts: [
        { name: 'command1', type: 'command', source: 'test/repo', installed: false },
        { name: 'command2', type: 'command', source: 'test/repo', installed: false, description: 'A command' },
      ],
      errors: [],
      partialSuccess: false,
    });

    const result = await ListCommands.run(['--json'], oclifConfig);

    expect(result.commands.length).to.equal(2);
    expect(result.counts.available).to.equal(2);
    expect(result.counts.installed).to.equal(0);
  });

  it('returns JSON output with --json flag', async () => {
    sandbox.stub(AiDevConfig, 'create').resolves({
      getSources: () => [],
      getInstalledArtifacts: () => [],
      getDefaultSource: () => undefined,
      getTool: () => 'copilot',
    } as unknown as AiDevConfig);
    sandbox.stub(LocalFileScanner, 'scanCommands').resolves([]);
    sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
      artifacts: [],
      errors: [],
      partialSuccess: false,
    });

    const result = await ListCommands.run(['--json'], oclifConfig);

    expect(result).to.have.property('commands');
    expect(result).to.have.property('counts');
  });

  it('merges local and available commands', async () => {
    sandbox.stub(AiDevConfig, 'create').resolves({
      getSources: () => [{ repo: 'test/repo', isDefault: true, addedAt: '' }],
      getInstalledArtifacts: () => [],
      getDefaultSource: () => undefined,
      getTool: () => 'copilot',
    } as unknown as AiDevConfig);
    sandbox
      .stub(LocalFileScanner, 'scanCommands')
      .resolves([{ name: 'local-command', type: 'command', installed: true, path: '/path/to/command.md' }]);
    sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
      artifacts: [
        {
          name: 'local-command',
          type: 'command',
          source: 'test/repo',
          installed: true,
          description: 'From manifest',
        },
        { name: 'remote-command', type: 'command', source: 'test/repo', installed: false },
      ],
      errors: [],
      partialSuccess: false,
    });

    const result = await ListCommands.run(['--json'], oclifConfig);

    expect(result.commands.length).to.equal(2);
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
      getDefaultSource: () => undefined,
      getTool: () => 'copilot',
    } as unknown as AiDevConfig);
    sandbox.stub(LocalFileScanner, 'scanCommands').resolves([]);

    const listAvailableStub = sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors');
    listAvailableStub.resolves({
      artifacts: [],
      errors: [],
      partialSuccess: false,
    });

    await ListCommands.run(['--source', 'source1/repo', '--json'], oclifConfig);

    expect(listAvailableStub.calledOnce).to.equal(true);
    expect(listAvailableStub.firstCall.args[0]).to.deep.include({
      source: 'source1/repo',
      type: 'command',
    });
  });

  it('shows warnings for failed sources', async () => {
    sandbox.stub(AiDevConfig, 'create').resolves({
      getSources: () => [{ repo: 'failing/repo', isDefault: true, addedAt: '' }],
      getInstalledArtifacts: () => [],
      getDefaultSource: () => undefined,
      getTool: () => 'copilot',
    } as unknown as AiDevConfig);
    sandbox.stub(LocalFileScanner, 'scanCommands').resolves([]);
    sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
      artifacts: [],
      errors: [{ source: 'failing/repo', error: 'Network error' }],
      partialSuccess: false,
    });

    const result = await ListCommands.run(['--json'], oclifConfig);

    // Command should complete successfully even with errors
    expect(result.commands).to.be.an('array');
  });

  it('shows warnings for failed sources in non-JSON mode', async () => {
    sandbox.stub(AiDevConfig, 'create').resolves({
      getSources: () => [{ repo: 'failing/repo', isDefault: true, addedAt: '' }],
      getInstalledArtifacts: () => [],
      getDefaultSource: () => undefined,
      getTool: () => 'copilot',
    } as unknown as AiDevConfig);
    sandbox.stub(LocalFileScanner, 'scanCommands').resolves([]);
    sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
      artifacts: [{ name: 'test-command', type: 'command', source: 'test/repo', installed: false }],
      errors: [
        { source: 'failing/repo', error: 'Network error' },
        { source: 'another/repo', error: 'Timeout' },
      ],
      partialSuccess: true,
    });

    const result = await ListCommands.run([], oclifConfig);

    // Command should complete successfully even with errors
    expect(result.commands).to.be.an('array');
    expect(result.commands.length).to.equal(1);
  });

  it('sorts commands alphabetically', async () => {
    sandbox.stub(AiDevConfig, 'create').resolves({
      getSources: () => [{ repo: 'test/repo', isDefault: true, addedAt: '' }],
      getInstalledArtifacts: () => [],
      getDefaultSource: () => undefined,
      getTool: () => 'copilot',
    } as unknown as AiDevConfig);
    sandbox.stub(LocalFileScanner, 'scanCommands').resolves([]);
    sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
      artifacts: [
        { name: 'zebra-command', type: 'command', source: 'test/repo', installed: false },
        { name: 'alpha-command', type: 'command', source: 'test/repo', installed: false },
        { name: 'beta-command', type: 'command', source: 'test/repo', installed: false },
      ],
      errors: [],
      partialSuccess: false,
    });

    const result = await ListCommands.run(['--json'], oclifConfig);

    expect(result.commands[0].name).to.equal('alpha-command');
    expect(result.commands[1].name).to.equal('beta-command');
    expect(result.commands[2].name).to.equal('zebra-command');
  });

  it('handles interactive mode with runExpandableSelect', async () => {
    const originalStdinTTY = process.stdin.isTTY;
    const originalStdoutTTY = process.stdout.isTTY;

    try {
      Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true, writable: true });
      Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true, writable: true });

      sandbox.stub(AiDevConfig, 'create').resolves({
        getSources: () => [{ repo: 'test/repo', isDefault: true, addedAt: '' }],
        getInstalledArtifacts: () => [],
        getDefaultSource: () => undefined,
        getTool: () => 'copilot',
      } as unknown as AiDevConfig);
      sandbox.stub(LocalFileScanner, 'scanCommands').resolves([]);
      sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
        artifacts: [{ name: 'test-command', type: 'command', source: 'test/repo', installed: false }],
        errors: [],
        partialSuccess: false,
      });

      // Stub runExpandableSelect to simulate user exiting immediately
      sandbox.stub(ListCommands.prototype, 'runExpandableSelect' as keyof ListCommands).resolves();

      const result = await ListCommands.run([], oclifConfig);

      expect(result.commands.length).to.equal(1);
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

  it('skips interactive mode when no commands available', async () => {
    const originalStdinTTY = process.stdin.isTTY;
    const originalStdoutTTY = process.stdout.isTTY;

    try {
      Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true, writable: true });
      Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true, writable: true });

      sandbox.stub(AiDevConfig, 'create').resolves({
        getSources: () => [],
        getInstalledArtifacts: () => [],
        getDefaultSource: () => undefined,
        getTool: () => 'copilot',
      } as unknown as AiDevConfig);
      sandbox.stub(LocalFileScanner, 'scanCommands').resolves([]);
      sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
        artifacts: [],
        errors: [],
        partialSuccess: false,
      });

      const runExpandableSelectStub = sandbox.stub(ListCommands.prototype, 'runExpandableSelect' as keyof ListCommands);
      runExpandableSelectStub.resolves();

      const result = await ListCommands.run([], oclifConfig);

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
      getDefaultSource: () => undefined,
      getTool: () => 'copilot',
    } as unknown as AiDevConfig);
    sandbox.stub(LocalFileScanner, 'scanCommands').resolves([]);
    sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
      artifacts: [{ name: 'test-command', type: 'command', source: 'test/repo', installed: false }],
      errors: [],
      partialSuccess: false,
    });

    const runExpandableSelectStub = sandbox.stub(ListCommands.prototype, 'runExpandableSelect' as keyof ListCommands);

    const result = await ListCommands.run([], oclifConfig);

    expect(result.commands.length).to.equal(1);
    expect(runExpandableSelectStub.called).to.be.false;
  });
});
