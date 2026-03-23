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
      getDefaultSource: () => undefined,
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
      getDefaultSource: () => undefined,
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
      getDefaultSource: () => undefined,
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
      getDefaultSource: () => undefined,
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
      getDefaultSource: () => undefined,
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
      getDefaultSource: () => undefined,
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
      getDefaultSource: () => undefined,
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
      sandbox.stub(LocalFileScanner, 'scanSkills').resolves([]);
      sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
        artifacts: [{ name: 'test-skill', type: 'skill', source: 'test/repo', installed: false }],
        errors: [],
        partialSuccess: false,
      });

      // Stub runExpandableSelect to simulate user exiting immediately
      sandbox.stub(ListSkills.prototype, 'runExpandableSelect' as keyof ListSkills).resolves();

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

  it('skips interactive mode when no skills available', async () => {
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
      sandbox.stub(LocalFileScanner, 'scanSkills').resolves([]);
      sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
        artifacts: [],
        errors: [],
        partialSuccess: false,
      });

      const runExpandableSelectStub = sandbox.stub(ListSkills.prototype, 'runExpandableSelect' as keyof ListSkills);
      runExpandableSelectStub.resolves();

      const result = await ListSkills.run([], oclifConfig);

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
    sandbox.stub(LocalFileScanner, 'scanSkills').resolves([]);
    sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
      artifacts: [{ name: 'test-skill', type: 'skill', source: 'test/repo', installed: false }],
      errors: [],
      partialSuccess: false,
    });

    const runExpandableSelectStub = sandbox.stub(ListSkills.prototype, 'runExpandableSelect' as keyof ListSkills);

    const result = await ListSkills.run([], oclifConfig);

    expect(result.skills.length).to.equal(1);
    expect(runExpandableSelectStub.called).to.be.false;
  });
});
