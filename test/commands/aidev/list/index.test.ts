/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { Config } from '@oclif/core';
import List from '../../../../src/commands/aidev/list/index.js';
import { AiDevConfig } from '../../../../src/config/aiDevConfig.js';
import { ArtifactService } from '../../../../src/services/artifactService.js';
import { LocalFileScanner } from '../../../../src/services/localFileScanner.js';

describe('aidev list', () => {
  const sandbox = sinon.createSandbox();
  let oclifConfig: Config;

  before(async () => {
    oclifConfig = await Config.load({ root: process.cwd() });
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('lists all artifacts in non-interactive mode', async () => {
    sandbox.stub(AiDevConfig, 'create').resolves({
      getSources: () => [{ repo: 'test/repo', isDefault: true, addedAt: '' }],
      getInstalledArtifacts: () => [],
      getTool: () => 'copilot',
    } as unknown as AiDevConfig);
    sandbox.stub(LocalFileScanner, 'scanAll').resolves([]);
    sandbox.stub(LocalFileScanner, 'scanInstructions').resolves([]);
    sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
      artifacts: [
        { name: 'skill1', type: 'skill', source: 'test/repo', installed: false },
        { name: 'agent1', type: 'agent', source: 'test/repo', installed: false },
      ],
      errors: [],
      partialSuccess: false,
    });

    const result = await List.run(['--json'], oclifConfig);

    expect(result.skills.length).to.equal(1);
    expect(result.agents.length).to.equal(1);
    expect(result.counts.total).to.equal(2);
  });

  it('returns JSON output with --json flag', async () => {
    sandbox.stub(AiDevConfig, 'create').resolves({
      getSources: () => [],
      getInstalledArtifacts: () => [],
      getTool: () => 'copilot',
    } as unknown as AiDevConfig);
    sandbox.stub(LocalFileScanner, 'scanAll').resolves([]);
    sandbox.stub(LocalFileScanner, 'scanInstructions').resolves([]);
    sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
      artifacts: [],
      errors: [],
      partialSuccess: false,
    });

    const result = await List.run(['--json'], oclifConfig);

    expect(result).to.have.property('agents');
    expect(result).to.have.property('skills');
    expect(result).to.have.property('prompts');
    expect(result).to.have.property('instructions');
    expect(result).to.have.property('counts');
  });

  it('merges local and available artifacts', async () => {
    sandbox.stub(AiDevConfig, 'create').resolves({
      getSources: () => [{ repo: 'test/repo', isDefault: true, addedAt: '' }],
      getInstalledArtifacts: () => [],
      getTool: () => 'copilot',
    } as unknown as AiDevConfig);
    sandbox
      .stub(LocalFileScanner, 'scanAll')
      .resolves([{ name: 'local-skill', type: 'skill', installed: true, path: '/path/to/skill.md' }]);
    sandbox.stub(LocalFileScanner, 'scanInstructions').resolves([]);
    sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
      artifacts: [
        { name: 'local-skill', type: 'skill', source: 'test/repo', installed: true, description: 'From manifest' },
        { name: 'remote-skill', type: 'skill', source: 'test/repo', installed: false },
      ],
      errors: [],
      partialSuccess: false,
    });

    const result = await List.run(['--json'], oclifConfig);

    expect(result.skills.length).to.equal(2);

    const localSkill = result.skills.find((s) => s.name === 'local-skill');
    expect(localSkill?.installed).to.equal(true);
    expect(localSkill?.description).to.equal('From manifest');

    const remoteSkill = result.skills.find((s) => s.name === 'remote-skill');
    expect(remoteSkill?.installed).to.equal(false);
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
    sandbox.stub(LocalFileScanner, 'scanAll').resolves([]);
    sandbox.stub(LocalFileScanner, 'scanInstructions').resolves([]);

    const listAvailableStub = sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors');
    listAvailableStub.resolves({
      artifacts: [{ name: 'skill1', type: 'skill', source: 'source1/repo', installed: false }],
      errors: [],
      partialSuccess: false,
    });

    await List.run(['--source', 'source1/repo', '--json'], oclifConfig);

    expect(listAvailableStub.calledOnce).to.equal(true);
    expect(listAvailableStub.firstCall.args[0]).to.deep.include({ source: 'source1/repo' });
  });

  it('shows warnings for failed sources', async () => {
    sandbox.stub(AiDevConfig, 'create').resolves({
      getSources: () => [{ repo: 'failing/repo', isDefault: true, addedAt: '' }],
      getInstalledArtifacts: () => [],
      getTool: () => 'copilot',
    } as unknown as AiDevConfig);
    sandbox.stub(LocalFileScanner, 'scanAll').resolves([]);
    sandbox.stub(LocalFileScanner, 'scanInstructions').resolves([]);
    sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
      artifacts: [],
      errors: [{ source: 'failing/repo', error: 'Network error' }],
      partialSuccess: false,
    });

    // The command should have completed successfully even with errors
    const result = await List.run(['--json'], oclifConfig);

    expect(result.counts.total).to.equal(0);
  });

  it('includes instructions in output', async () => {
    sandbox.stub(AiDevConfig, 'create').resolves({
      getSources: () => [],
      getInstalledArtifacts: () => [],
      getTool: () => 'copilot',
    } as unknown as AiDevConfig);
    sandbox.stub(LocalFileScanner, 'scanAll').resolves([]);
    sandbox.stub(LocalFileScanner, 'scanInstructions').resolves([
      { name: 'CLAUDE.md', type: 'instruction', installed: true, path: '/project/CLAUDE.md' },
      {
        name: 'copilot-instructions.md',
        type: 'instruction',
        installed: true,
        path: '/project/.github/copilot-instructions.md',
      },
    ]);
    sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
      artifacts: [],
      errors: [],
      partialSuccess: false,
    });

    const result = await List.run(['--json'], oclifConfig);

    expect(result.instructions.length).to.equal(2);
    expect(result.instructions[0].type).to.equal('instruction');
    expect(result.instructions.every((i) => i.installed)).to.equal(true);
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
      sandbox.stub(LocalFileScanner, 'scanAll').resolves([]);
      sandbox.stub(LocalFileScanner, 'scanInstructions').resolves([]);
      sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
        artifacts: [{ name: 'test-skill', type: 'skill', source: 'test/repo', installed: false }],
        errors: [],
        partialSuccess: false,
      });

      // First call returns a skill, second call returns null to exit the loop
      const promptListStub = sandbox.stub(List.prototype, 'promptList' as keyof List);
      promptListStub.onFirstCall().resolves({ name: 'test-skill', type: 'skill', installed: false });
      promptListStub.onSecondCall().resolves(null);

      // Return 'back' action to go back to the list
      sandbox.stub(List.prototype, 'promptAction' as keyof List).resolves('back');

      const result = await List.run([], oclifConfig);

      expect(result.skills.length).to.equal(1);
      expect(promptListStub.callCount).to.equal(2);
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
      sandbox.stub(LocalFileScanner, 'scanAll').resolves([]);
      sandbox.stub(LocalFileScanner, 'scanInstructions').resolves([]);
      sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
        artifacts: [{ name: 'test-skill', type: 'skill', source: 'test/repo', installed: false }],
        errors: [],
        partialSuccess: false,
      });
      sandbox.stub(ArtifactService.prototype, 'install').resolves({
        success: true,
        artifact: 'test-skill',
        type: 'skill',
        tool: 'copilot',
        installedPath: '/test/path',
      });

      const promptListStub = sandbox.stub(List.prototype, 'promptList' as keyof List);
      promptListStub
        .onFirstCall()
        .resolves({ name: 'test-skill', type: 'skill', installed: false, source: 'test/repo' });
      promptListStub.onSecondCall().resolves(null);

      sandbox.stub(List.prototype, 'promptAction' as keyof List).resolves('install');

      const result = await List.run([], oclifConfig);

      expect(result.skills.length).to.equal(1);
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
          { name: 'test-skill', type: 'skill', path: '/test/path', source: 'test/repo', installedAt: '' },
        ],
        getTool: () => 'copilot',
        removeInstalledArtifact: sandbox.stub(),
        write: sandbox.stub().resolves(),
      } as unknown as AiDevConfig);
      sandbox
        .stub(LocalFileScanner, 'scanAll')
        .resolves([{ name: 'test-skill', type: 'skill', installed: true, path: '/test/path' }]);
      sandbox.stub(LocalFileScanner, 'scanInstructions').resolves([]);
      sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
        artifacts: [{ name: 'test-skill', type: 'skill', source: 'test/repo', installed: true }],
        errors: [],
        partialSuccess: false,
      });
      sandbox.stub(ArtifactService.prototype, 'uninstall').resolves({
        success: true,
      });

      const promptListStub = sandbox.stub(List.prototype, 'promptList' as keyof List);
      promptListStub
        .onFirstCall()
        .resolves({ name: 'test-skill', type: 'skill', installed: true, source: 'test/repo' });
      promptListStub.onSecondCall().resolves(null);

      sandbox.stub(List.prototype, 'promptAction' as keyof List).resolves('remove');

      const result = await List.run([], oclifConfig);

      expect(result.skills.length).to.equal(1);
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
