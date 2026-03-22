/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { Config } from '@oclif/core';
import ListSkills from '../../../../src/commands/aidev/list/skills.js';
import { AiDevConfig } from '../../../../src/config/aiDevConfig.js';
import { ArtifactService } from '../../../../src/services/artifactService.js';
import { LocalFileScanner } from '../../../../src/services/localFileScanner.js';

describe('aidev list skills', () => {
  const sandbox = sinon.createSandbox();
  let oclifConfig: Config;

  before(async () => {
    oclifConfig = await Config.load({ root: process.cwd() });
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('lists all skills in non-interactive mode', async () => {
    sandbox.stub(AiDevConfig, 'create').resolves({
      getSources: () => [{ repo: 'test/repo', isDefault: true, addedAt: '' }],
      getInstalledArtifacts: () => [],
      getTool: () => 'copilot',
    } as unknown as AiDevConfig);
    sandbox.stub(LocalFileScanner, 'scanSkills').resolves([]);
    sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
      artifacts: [
        { name: 'skill1', type: 'skill', source: 'test/repo', installed: false },
        { name: 'skill2', type: 'skill', source: 'test/repo', installed: false, description: 'A skill' },
      ],
      errors: [],
      partialSuccess: false,
    });

    const result = await ListSkills.run(['--json'], oclifConfig);

    expect(result.skills.length).to.equal(2);
    expect(result.counts.available).to.equal(2);
    expect(result.counts.installed).to.equal(0);
  });

  it('returns JSON output with --json flag', async () => {
    sandbox.stub(AiDevConfig, 'create').resolves({
      getSources: () => [],
      getInstalledArtifacts: () => [],
      getTool: () => 'copilot',
    } as unknown as AiDevConfig);
    sandbox.stub(LocalFileScanner, 'scanSkills').resolves([]);
    sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
      artifacts: [],
      errors: [],
      partialSuccess: false,
    });

    const result = await ListSkills.run(['--json'], oclifConfig);

    expect(result).to.have.property('skills');
    expect(result).to.have.property('counts');
  });

  it('merges local and available skills', async () => {
    sandbox.stub(AiDevConfig, 'create').resolves({
      getSources: () => [{ repo: 'test/repo', isDefault: true, addedAt: '' }],
      getInstalledArtifacts: () => [],
      getTool: () => 'copilot',
    } as unknown as AiDevConfig);
    sandbox
      .stub(LocalFileScanner, 'scanSkills')
      .resolves([{ name: 'local-skill', type: 'skill', installed: true, path: '/path/to/skill.md' }]);
    sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
      artifacts: [
        { name: 'local-skill', type: 'skill', source: 'test/repo', installed: true, description: 'From manifest' },
        { name: 'remote-skill', type: 'skill', source: 'test/repo', installed: false },
      ],
      errors: [],
      partialSuccess: false,
    });

    const result = await ListSkills.run(['--json'], oclifConfig);

    expect(result.skills.length).to.equal(2);
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
    sandbox.stub(LocalFileScanner, 'scanSkills').resolves([]);

    const listAvailableStub = sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors');
    listAvailableStub.resolves({
      artifacts: [],
      errors: [],
      partialSuccess: false,
    });

    await ListSkills.run(['--source', 'source1/repo', '--json'], oclifConfig);

    expect(listAvailableStub.calledOnce).to.equal(true);
    expect(listAvailableStub.firstCall.args[0]).to.deep.include({
      source: 'source1/repo',
      type: 'skill',
    });
  });

  it('shows warnings for failed sources', async () => {
    sandbox.stub(AiDevConfig, 'create').resolves({
      getSources: () => [{ repo: 'failing/repo', isDefault: true, addedAt: '' }],
      getInstalledArtifacts: () => [],
      getTool: () => 'copilot',
    } as unknown as AiDevConfig);
    sandbox.stub(LocalFileScanner, 'scanSkills').resolves([]);
    sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
      artifacts: [],
      errors: [{ source: 'failing/repo', error: 'Network error' }],
      partialSuccess: false,
    });

    const result = await ListSkills.run(['--json'], oclifConfig);

    // Command should complete successfully even with errors
    expect(result.skills).to.be.an('array');
  });

  it('shows warnings for failed sources in non-JSON mode', async () => {
    sandbox.stub(AiDevConfig, 'create').resolves({
      getSources: () => [{ repo: 'failing/repo', isDefault: true, addedAt: '' }],
      getInstalledArtifacts: () => [],
      getTool: () => 'copilot',
    } as unknown as AiDevConfig);
    sandbox.stub(LocalFileScanner, 'scanSkills').resolves([]);
    sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
      artifacts: [{ name: 'test-skill', type: 'skill', source: 'test/repo', installed: false }],
      errors: [
        { source: 'failing/repo', error: 'Network error' },
        { source: 'another/repo', error: 'Timeout' },
      ],
      partialSuccess: true,
    });

    const result = await ListSkills.run([], oclifConfig);

    // Command should complete successfully even with errors
    expect(result.skills).to.be.an('array');
    expect(result.skills.length).to.equal(1);
  });

  it('sorts skills alphabetically', async () => {
    sandbox.stub(AiDevConfig, 'create').resolves({
      getSources: () => [{ repo: 'test/repo', isDefault: true, addedAt: '' }],
      getInstalledArtifacts: () => [],
      getTool: () => 'copilot',
    } as unknown as AiDevConfig);
    sandbox.stub(LocalFileScanner, 'scanSkills').resolves([]);
    sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
      artifacts: [
        { name: 'zebra-skill', type: 'skill', source: 'test/repo', installed: false },
        { name: 'alpha-skill', type: 'skill', source: 'test/repo', installed: false },
        { name: 'beta-skill', type: 'skill', source: 'test/repo', installed: false },
      ],
      errors: [],
      partialSuccess: false,
    });

    const result = await ListSkills.run(['--json'], oclifConfig);

    expect(result.skills[0].name).to.equal('alpha-skill');
    expect(result.skills[1].name).to.equal('beta-skill');
    expect(result.skills[2].name).to.equal('zebra-skill');
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
      sandbox.stub(LocalFileScanner, 'scanSkills').resolves([]);
      sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
        artifacts: [{ name: 'test-skill', type: 'skill', source: 'test/repo', installed: false }],
        errors: [],
        partialSuccess: false,
      });

      // First call returns a skill, second call returns null to exit the loop
      const promptSelectStub = sandbox.stub(ListSkills.prototype, 'promptSelect' as keyof ListSkills);
      promptSelectStub.onFirstCall().resolves({ name: 'test-skill', type: 'skill', installed: false });
      promptSelectStub.onSecondCall().resolves(null);

      // Return 'back' action to go back to the list
      sandbox.stub(ListSkills.prototype, 'promptAction' as keyof ListSkills).resolves('back');

      const result = await ListSkills.run([], oclifConfig);

      expect(result.skills.length).to.equal(1);
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
      sandbox.stub(LocalFileScanner, 'scanSkills').resolves([]);
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

      const promptSelectStub = sandbox.stub(ListSkills.prototype, 'promptSelect' as keyof ListSkills);
      promptSelectStub
        .onFirstCall()
        .resolves({ name: 'test-skill', type: 'skill', installed: false, source: 'test/repo' });
      promptSelectStub.onSecondCall().resolves(null);

      sandbox.stub(ListSkills.prototype, 'promptAction' as keyof ListSkills).resolves('install');

      const result = await ListSkills.run([], oclifConfig);

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
        .stub(LocalFileScanner, 'scanSkills')
        .resolves([{ name: 'test-skill', type: 'skill', installed: true, path: '/test/path' }]);
      sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
        artifacts: [{ name: 'test-skill', type: 'skill', source: 'test/repo', installed: true }],
        errors: [],
        partialSuccess: false,
      });
      sandbox.stub(ArtifactService.prototype, 'uninstall').resolves({
        success: true,
      });

      const promptSelectStub = sandbox.stub(ListSkills.prototype, 'promptSelect' as keyof ListSkills);
      promptSelectStub
        .onFirstCall()
        .resolves({ name: 'test-skill', type: 'skill', installed: true, source: 'test/repo' });
      promptSelectStub.onSecondCall().resolves(null);

      sandbox.stub(ListSkills.prototype, 'promptAction' as keyof ListSkills).resolves('remove');

      const result = await ListSkills.run([], oclifConfig);

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

  it('handles interactive mode with view action to display details', async () => {
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
      sandbox.stub(LocalFileScanner, 'scanSkills').resolves([]);
      sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
        artifacts: [{ name: 'test-skill', type: 'skill', source: 'test/repo', installed: false, description: 'Test' }],
        errors: [],
        partialSuccess: false,
      });

      const promptSelectStub = sandbox.stub(ListSkills.prototype, 'promptSelect' as keyof ListSkills);
      promptSelectStub
        .onFirstCall()
        .resolves({ name: 'test-skill', type: 'skill', source: 'test/repo', installed: false });
      promptSelectStub.onSecondCall().resolves(null);

      const promptActionStub = sandbox.stub(ListSkills.prototype, 'promptAction' as keyof ListSkills);
      promptActionStub.resolves('view');

      const displayDetailsStub = sandbox.stub(ListSkills.prototype, 'displayArtifactDetails' as keyof ListSkills);
      displayDetailsStub.resolves();

      await ListSkills.run([], oclifConfig);

      expect(displayDetailsStub.calledOnce).to.be.true;
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

  it('handles failed install action', async () => {
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
      sandbox.stub(LocalFileScanner, 'scanSkills').resolves([]);
      sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
        artifacts: [{ name: 'skill1', type: 'skill', source: 'test/repo', installed: false }],
        errors: [],
        partialSuccess: false,
      });

      const promptStub = sandbox.stub(ListSkills.prototype, 'promptSelect' as keyof ListSkills);
      promptStub.onFirstCall().resolves({ name: 'skill1', type: 'skill', source: 'test/repo', installed: false });
      promptStub.onSecondCall().resolves(null);

      sandbox.stub(ListSkills.prototype, 'promptAction' as keyof ListSkills).resolves('install');

      sandbox.stub(ArtifactService.prototype, 'install').resolves({
        success: false,
        artifact: 'skill1',
        type: 'skill',
        tool: 'copilot',
        installedPath: '',
        error: 'Installation failed',
      });

      await ListSkills.run([], oclifConfig);
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

  it('handles failed remove action', async () => {
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
      sandbox
        .stub(LocalFileScanner, 'scanSkills')
        .resolves([{ name: 'skill1', type: 'skill', installed: true, path: '/path/skill1.md' }]);
      sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
        artifacts: [],
        errors: [],
        partialSuccess: false,
      });

      const promptStub = sandbox.stub(ListSkills.prototype, 'promptSelect' as keyof ListSkills);
      promptStub.onFirstCall().resolves({ name: 'skill1', type: 'skill', installed: true });
      promptStub.onSecondCall().resolves(null);

      sandbox.stub(ListSkills.prototype, 'promptAction' as keyof ListSkills).resolves('remove');

      sandbox.stub(ArtifactService.prototype, 'uninstall').resolves({ success: false, error: 'Removal failed' });

      await ListSkills.run([], oclifConfig);
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

  it('handles failed install with undefined error message', async () => {
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
      sandbox.stub(LocalFileScanner, 'scanSkills').resolves([]);
      sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
        artifacts: [{ name: 'skill1', type: 'skill', source: 'test/repo', installed: false }],
        errors: [],
        partialSuccess: false,
      });

      const promptStub = sandbox.stub(ListSkills.prototype, 'promptSelect' as keyof ListSkills);
      promptStub.onFirstCall().resolves({ name: 'skill1', type: 'skill', source: 'test/repo', installed: false });
      promptStub.onSecondCall().resolves(null);

      sandbox.stub(ListSkills.prototype, 'promptAction' as keyof ListSkills).resolves('install');

      sandbox.stub(ArtifactService.prototype, 'install').resolves({
        success: false,
        artifact: 'skill1',
        type: 'skill',
        tool: 'copilot',
        installedPath: '',
      });

      await ListSkills.run([], oclifConfig);
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

  it('handles failed remove with undefined error message', async () => {
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
      sandbox
        .stub(LocalFileScanner, 'scanSkills')
        .resolves([{ name: 'skill1', type: 'skill', installed: true, path: '/path/skill1.md' }]);
      sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
        artifacts: [],
        errors: [],
        partialSuccess: false,
      });

      const promptStub = sandbox.stub(ListSkills.prototype, 'promptSelect' as keyof ListSkills);
      promptStub.onFirstCall().resolves({ name: 'skill1', type: 'skill', installed: true });
      promptStub.onSecondCall().resolves(null);

      sandbox.stub(ListSkills.prototype, 'promptAction' as keyof ListSkills).resolves('remove');

      sandbox.stub(ArtifactService.prototype, 'uninstall').resolves({ success: false });

      await ListSkills.run([], oclifConfig);
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

  it('displays artifact details without source', async () => {
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
        .stub(LocalFileScanner, 'scanSkills')
        .resolves([{ name: 'local-skill', type: 'skill', installed: true, path: '/path/skill.md' }]);
      sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
        artifacts: [],
        errors: [],
        partialSuccess: false,
      });

      const promptStub = sandbox.stub(ListSkills.prototype, 'promptSelect' as keyof ListSkills);
      promptStub.onFirstCall().resolves({ name: 'local-skill', type: 'skill', installed: true });
      promptStub.onSecondCall().resolves(null);

      sandbox.stub(ListSkills.prototype, 'promptAction' as keyof ListSkills).resolves('view');

      const displayStub = sandbox.stub(ListSkills.prototype, 'displayArtifactDetails' as keyof ListSkills);
      displayStub.resolves();

      await ListSkills.run([], oclifConfig);

      expect(displayStub.calledOnce).to.be.true;
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

  it('handles displayArtifactDetails fetch error', async () => {
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
      sandbox.stub(LocalFileScanner, 'scanSkills').resolves([]);
      sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
        artifacts: [
          { name: 'skill1', type: 'skill', source: 'test/repo', installed: false, description: 'Test skill' },
        ],
        errors: [],
        partialSuccess: false,
      });

      const promptStub = sandbox.stub(ListSkills.prototype, 'promptSelect' as keyof ListSkills);
      promptStub
        .onFirstCall()
        .resolves({ name: 'skill1', type: 'skill', source: 'test/repo', installed: false, description: 'Test skill' });
      promptStub.onSecondCall().resolves(null);

      sandbox.stub(ListSkills.prototype, 'promptAction' as keyof ListSkills).resolves('view');

      sandbox.stub(ArtifactService.prototype, 'fetchArtifactContent').rejects(new Error('Network error'));

      await ListSkills.run([], oclifConfig);
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

  it('handles displayArtifactDetails with null content', async () => {
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
      sandbox.stub(LocalFileScanner, 'scanSkills').resolves([]);
      sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
        artifacts: [{ name: 'skill1', type: 'skill', source: 'test/repo', installed: false, description: 'Test' }],
        errors: [],
        partialSuccess: false,
      });

      const promptStub = sandbox.stub(ListSkills.prototype, 'promptSelect' as keyof ListSkills);
      promptStub
        .onFirstCall()
        .resolves({ name: 'skill1', type: 'skill', source: 'test/repo', installed: false, description: 'Test' });
      promptStub.onSecondCall().resolves(null);

      sandbox.stub(ListSkills.prototype, 'promptAction' as keyof ListSkills).resolves('view');

      sandbox.stub(ArtifactService.prototype, 'fetchArtifactContent').resolves(null);

      await ListSkills.run([], oclifConfig);
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

  it('handles empty choices in promptSelect', async () => {
    const cmd = new ListSkills([], oclifConfig);

    const result = await (
      cmd as unknown as { promptSelect: (choices: unknown[], message: string) => Promise<unknown> }
    ).promptSelect([], 'Select a skill');

    expect(result).to.be.null;
  });
});
