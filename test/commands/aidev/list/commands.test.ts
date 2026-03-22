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
      sandbox.stub(LocalFileScanner, 'scanCommands').resolves([]);
      sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
        artifacts: [{ name: 'test-command', type: 'command', source: 'test/repo', installed: false }],
        errors: [],
        partialSuccess: false,
      });

      // First call returns a command, second call returns null to exit the loop
      const promptSelectStub = sandbox.stub(ListCommands.prototype, 'promptSelect' as keyof ListCommands);
      promptSelectStub.onFirstCall().resolves({ name: 'test-command', type: 'command', installed: false });
      promptSelectStub.onSecondCall().resolves(null);

      // Return 'back' action to go back to the list
      sandbox.stub(ListCommands.prototype, 'promptAction' as keyof ListCommands).resolves('back');

      const result = await ListCommands.run([], oclifConfig);

      expect(result.commands.length).to.equal(1);
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
      sandbox.stub(LocalFileScanner, 'scanCommands').resolves([]);
      sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
        artifacts: [{ name: 'test-command', type: 'command', source: 'test/repo', installed: false }],
        errors: [],
        partialSuccess: false,
      });
      sandbox.stub(ArtifactService.prototype, 'install').resolves({
        success: true,
        artifact: 'test-command',
        type: 'command',
        tool: 'copilot',
        installedPath: '/test/path',
      });

      const promptSelectStub = sandbox.stub(ListCommands.prototype, 'promptSelect' as keyof ListCommands);
      promptSelectStub
        .onFirstCall()
        .resolves({ name: 'test-command', type: 'command', installed: false, source: 'test/repo' });
      promptSelectStub.onSecondCall().resolves(null);

      sandbox.stub(ListCommands.prototype, 'promptAction' as keyof ListCommands).resolves('install');

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

  it('handles interactive mode with remove action', async () => {
    const originalStdinTTY = process.stdin.isTTY;
    const originalStdoutTTY = process.stdout.isTTY;

    try {
      Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true, writable: true });
      Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true, writable: true });

      sandbox.stub(AiDevConfig, 'create').resolves({
        getSources: () => [{ repo: 'test/repo', isDefault: true, addedAt: '' }],
        getInstalledArtifacts: () => [
          { name: 'test-command', type: 'command', path: '/test/path', source: 'test/repo', installedAt: '' },
        ],
        getTool: () => 'copilot',
        removeInstalledArtifact: sandbox.stub(),
        write: sandbox.stub().resolves(),
      } as unknown as AiDevConfig);
      sandbox
        .stub(LocalFileScanner, 'scanCommands')
        .resolves([{ name: 'test-command', type: 'command', installed: true, path: '/test/path' }]);
      sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
        artifacts: [{ name: 'test-command', type: 'command', source: 'test/repo', installed: true }],
        errors: [],
        partialSuccess: false,
      });
      sandbox.stub(ArtifactService.prototype, 'uninstall').resolves({
        success: true,
      });

      const promptSelectStub = sandbox.stub(ListCommands.prototype, 'promptSelect' as keyof ListCommands);
      promptSelectStub
        .onFirstCall()
        .resolves({ name: 'test-command', type: 'command', installed: true, source: 'test/repo' });
      promptSelectStub.onSecondCall().resolves(null);

      sandbox.stub(ListCommands.prototype, 'promptAction' as keyof ListCommands).resolves('remove');

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

  it('handles interactive mode with view action', async () => {
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
      sandbox.stub(LocalFileScanner, 'scanCommands').resolves([]);
      sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
        artifacts: [
          { name: 'test-command', type: 'command', source: 'test/repo', installed: false, description: 'Test command' },
        ],
        errors: [],
        partialSuccess: false,
      });
      sandbox
        .stub(ArtifactService.prototype, 'fetchArtifactContent')
        .resolves('---\ndescription: Detailed test command\n---\n# Test Command');

      const promptSelectStub = sandbox.stub(ListCommands.prototype, 'promptSelect' as keyof ListCommands);
      promptSelectStub.onFirstCall().resolves({
        name: 'test-command',
        type: 'command',
        installed: false,
        source: 'test/repo',
        description: 'Test command',
      });
      promptSelectStub.onSecondCall().resolves(null);

      sandbox.stub(ListCommands.prototype, 'promptAction' as keyof ListCommands).resolves('view');

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

  it('handles interactive mode with null action', async () => {
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
      sandbox.stub(LocalFileScanner, 'scanCommands').resolves([]);
      sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
        artifacts: [{ name: 'test-command', type: 'command', source: 'test/repo', installed: false }],
        errors: [],
        partialSuccess: false,
      });

      const promptSelectStub = sandbox.stub(ListCommands.prototype, 'promptSelect' as keyof ListCommands);
      promptSelectStub.onFirstCall().resolves({ name: 'test-command', type: 'command', installed: false });
      promptSelectStub.onSecondCall().resolves(null);

      // Return null action
      sandbox.stub(ListCommands.prototype, 'promptAction' as keyof ListCommands).resolves(null);

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

  it('handles interactive mode with failed install', async () => {
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
      sandbox.stub(LocalFileScanner, 'scanCommands').resolves([]);
      sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
        artifacts: [{ name: 'test-command', type: 'command', source: 'test/repo', installed: false }],
        errors: [],
        partialSuccess: false,
      });
      sandbox.stub(ArtifactService.prototype, 'install').resolves({
        success: false,
        artifact: 'test-command',
        type: 'command',
        tool: 'copilot',
        installedPath: '',
        error: 'Install failed',
      });

      const promptSelectStub = sandbox.stub(ListCommands.prototype, 'promptSelect' as keyof ListCommands);
      promptSelectStub
        .onFirstCall()
        .resolves({ name: 'test-command', type: 'command', installed: false, source: 'test/repo' });
      promptSelectStub.onSecondCall().resolves(null);

      sandbox.stub(ListCommands.prototype, 'promptAction' as keyof ListCommands).resolves('install');

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

  it('handles interactive mode with failed remove', async () => {
    const originalStdinTTY = process.stdin.isTTY;
    const originalStdoutTTY = process.stdout.isTTY;

    try {
      Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true, writable: true });
      Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true, writable: true });

      sandbox.stub(AiDevConfig, 'create').resolves({
        getSources: () => [{ repo: 'test/repo', isDefault: true, addedAt: '' }],
        getInstalledArtifacts: () => [
          { name: 'test-command', type: 'command', path: '/test/path', source: 'test/repo', installedAt: '' },
        ],
        getTool: () => 'copilot',
      } as unknown as AiDevConfig);
      sandbox
        .stub(LocalFileScanner, 'scanCommands')
        .resolves([{ name: 'test-command', type: 'command', installed: true, path: '/test/path' }]);
      sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
        artifacts: [{ name: 'test-command', type: 'command', source: 'test/repo', installed: true }],
        errors: [],
        partialSuccess: false,
      });
      sandbox.stub(ArtifactService.prototype, 'uninstall').resolves({
        success: false,
        error: 'Remove failed',
      });

      const promptSelectStub = sandbox.stub(ListCommands.prototype, 'promptSelect' as keyof ListCommands);
      promptSelectStub
        .onFirstCall()
        .resolves({ name: 'test-command', type: 'command', installed: true, source: 'test/repo' });
      promptSelectStub.onSecondCall().resolves(null);

      sandbox.stub(ListCommands.prototype, 'promptAction' as keyof ListCommands).resolves('remove');

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

  it('handles interactive mode with no commands', async () => {
    const originalStdinTTY = process.stdin.isTTY;
    const originalStdoutTTY = process.stdout.isTTY;

    try {
      Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true, writable: true });
      Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true, writable: true });

      sandbox.stub(AiDevConfig, 'create').resolves({
        getSources: () => [],
        getInstalledArtifacts: () => [],
        getTool: () => 'copilot',
      } as unknown as AiDevConfig);
      sandbox.stub(LocalFileScanner, 'scanCommands').resolves([]);
      sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
        artifacts: [],
        errors: [],
        partialSuccess: false,
      });

      const result = await ListCommands.run([], oclifConfig);

      expect(result.commands.length).to.equal(0);
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

  it('handles view action when fetchArtifactContent throws error', async () => {
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
      sandbox.stub(LocalFileScanner, 'scanCommands').resolves([]);
      sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
        artifacts: [
          { name: 'test-command', type: 'command', source: 'test/repo', installed: false, description: 'Test command' },
        ],
        errors: [],
        partialSuccess: false,
      });
      sandbox.stub(ArtifactService.prototype, 'fetchArtifactContent').rejects(new Error('Network error'));

      const promptSelectStub = sandbox.stub(ListCommands.prototype, 'promptSelect' as keyof ListCommands);
      promptSelectStub.onFirstCall().resolves({
        name: 'test-command',
        type: 'command',
        installed: false,
        source: 'test/repo',
        description: 'Test command',
      });
      promptSelectStub.onSecondCall().resolves(null);

      sandbox.stub(ListCommands.prototype, 'promptAction' as keyof ListCommands).resolves('view');

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

  it('handles view action when artifact has no source', async () => {
    const originalStdinTTY = process.stdin.isTTY;
    const originalStdoutTTY = process.stdout.isTTY;

    try {
      Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true, writable: true });
      Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true, writable: true });

      sandbox.stub(AiDevConfig, 'create').resolves({
        getSources: () => [],
        getInstalledArtifacts: () => [],
        getTool: () => 'copilot',
      } as unknown as AiDevConfig);
      sandbox
        .stub(LocalFileScanner, 'scanCommands')
        .resolves([{ name: 'local-command', type: 'command', installed: true, path: '/local/path' }]);
      sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
        artifacts: [{ name: 'local-command', type: 'command', installed: true, source: 'local' }],
        errors: [],
        partialSuccess: false,
      });

      const promptSelectStub = sandbox.stub(ListCommands.prototype, 'promptSelect' as keyof ListCommands);
      promptSelectStub.onFirstCall().resolves({
        name: 'local-command',
        type: 'command',
        installed: true,
        // No source
      });
      promptSelectStub.onSecondCall().resolves(null);

      sandbox.stub(ListCommands.prototype, 'promptAction' as keyof ListCommands).resolves('view');

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

  it('handles view action when fetchArtifactContent returns null', async () => {
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
      sandbox.stub(LocalFileScanner, 'scanCommands').resolves([]);
      sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
        artifacts: [
          { name: 'test-command', type: 'command', source: 'test/repo', installed: false, description: 'Test command' },
        ],
        errors: [],
        partialSuccess: false,
      });
      sandbox.stub(ArtifactService.prototype, 'fetchArtifactContent').resolves(null);

      const promptSelectStub = sandbox.stub(ListCommands.prototype, 'promptSelect' as keyof ListCommands);
      promptSelectStub.onFirstCall().resolves({
        name: 'test-command',
        type: 'command',
        installed: false,
        source: 'test/repo',
        description: 'Test command',
      });
      promptSelectStub.onSecondCall().resolves(null);

      sandbox.stub(ListCommands.prototype, 'promptAction' as keyof ListCommands).resolves('view');

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

  it('handles promptSelect returning choice with no choices available', async () => {
    const originalStdinTTY = process.stdin.isTTY;
    const originalStdoutTTY = process.stdout.isTTY;

    try {
      Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true, writable: true });
      Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true, writable: true });

      sandbox.stub(AiDevConfig, 'create').resolves({
        getSources: () => [],
        getInstalledArtifacts: () => [],
        getTool: () => 'copilot',
      } as unknown as AiDevConfig);
      sandbox.stub(LocalFileScanner, 'scanCommands').resolves([]);
      sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
        artifacts: [],
        errors: [],
        partialSuccess: false,
      });

      const result = await ListCommands.run([], oclifConfig);

      expect(result.commands.length).to.equal(0);
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
