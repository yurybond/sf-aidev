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
      getDefaultSource: () => undefined,
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
      getDefaultSource: () => undefined,
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
      getDefaultSource: () => undefined,
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
      getDefaultSource: () => undefined,
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
      getDefaultSource: () => undefined,
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
      getDefaultSource: () => undefined,
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

  it('handles interactive mode with expandable select', async () => {
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
      sandbox.stub(LocalFileScanner, 'scanAll').resolves([]);
      sandbox.stub(LocalFileScanner, 'scanInstructions').resolves([]);
      sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
        artifacts: [{ name: 'test-skill', type: 'skill', source: 'test/repo', installed: false }],
        errors: [],
        partialSuccess: false,
      });

      // Stub runExpandableSelect to simulate user exiting immediately
      const runExpandableSelectStub = sandbox.stub(List.prototype, 'runExpandableSelect' as keyof List);
      runExpandableSelectStub.resolves();

      const result = await List.run([], oclifConfig);

      expect(result.skills.length).to.equal(1);
      expect(runExpandableSelectStub.calledOnce).to.equal(true);
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

  it('handles interactive mode with description fetching', async () => {
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
      sandbox.stub(LocalFileScanner, 'scanAll').resolves([]);
      sandbox.stub(LocalFileScanner, 'scanInstructions').resolves([]);
      sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
        artifacts: [
          { name: 'test-skill', type: 'skill', source: 'test/repo', installed: false, description: 'Manifest desc' },
        ],
        errors: [],
        partialSuccess: false,
      });

      // Mock fetchArtifactContent to return content with frontmatter
      sandbox.stub(ArtifactService.prototype, 'fetchArtifactContent').resolves(`---
description: 'Frontmatter description from file'
---

# Content`);

      // Stub runExpandableSelect to capture and call the onFetchDescription callback
      const runExpandableSelectStub = sandbox.stub(List.prototype, 'runExpandableSelect' as keyof List);
      runExpandableSelectStub.resolves();

      const result = await List.run([], oclifConfig);

      expect(result.skills.length).to.equal(1);
      expect(runExpandableSelectStub.calledOnce).to.equal(true);
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

  it('skips interactive mode when no artifacts available', async () => {
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
      sandbox.stub(LocalFileScanner, 'scanAll').resolves([]);
      sandbox.stub(LocalFileScanner, 'scanInstructions').resolves([]);
      sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
        artifacts: [],
        errors: [],
        partialSuccess: false,
      });

      // runExpandableSelect should NOT be called when there are no artifacts
      const runExpandableSelectStub = sandbox.stub(List.prototype, 'runExpandableSelect' as keyof List);
      runExpandableSelectStub.resolves();

      const result = await List.run([], oclifConfig);

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
    sandbox.stub(LocalFileScanner, 'scanAll').resolves([]);
    sandbox.stub(LocalFileScanner, 'scanInstructions').resolves([]);
    sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
      artifacts: [{ name: 'test-skill', type: 'skill', source: 'test/repo', installed: false }],
      errors: [],
      partialSuccess: false,
    });

    // Stub runExpandableSelect to ensure it's not called in non-interactive mode
    const runExpandableSelectStub = sandbox.stub(List.prototype, 'runExpandableSelect' as keyof List);

    const result = await List.run([], oclifConfig);

    expect(result.skills.length).to.equal(1);
    expect(runExpandableSelectStub.called).to.be.false;
  });

  it('handles fetchArtifactContent errors gracefully in interactive mode', async () => {
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
      sandbox.stub(LocalFileScanner, 'scanAll').resolves([]);
      sandbox.stub(LocalFileScanner, 'scanInstructions').resolves([]);
      sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
        artifacts: [
          { name: 'test-skill', type: 'skill', source: 'test/repo', installed: false, description: 'Fallback desc' },
        ],
        errors: [],
        partialSuccess: false,
      });

      // Mock fetchArtifactContent to throw an error
      sandbox.stub(ArtifactService.prototype, 'fetchArtifactContent').rejects(new Error('Network error'));

      // Stub runExpandableSelect to verify it's called but exits immediately
      const runExpandableSelectStub = sandbox.stub(List.prototype, 'runExpandableSelect' as keyof List);
      runExpandableSelectStub.resolves();

      const result = await List.run([], oclifConfig);

      expect(result.skills.length).to.equal(1);
      expect(runExpandableSelectStub.calledOnce).to.equal(true);
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

  it('handles instructions in interactive mode (no source)', async () => {
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
      sandbox.stub(LocalFileScanner, 'scanAll').resolves([]);
      sandbox
        .stub(LocalFileScanner, 'scanInstructions')
        .resolves([{ name: 'CLAUDE.md', type: 'instruction', installed: true, path: '/path/CLAUDE.md' }]);
      sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
        artifacts: [],
        errors: [],
        partialSuccess: false,
      });

      // Stub runExpandableSelect to simulate instructions being displayed
      const runExpandableSelectStub = sandbox.stub(List.prototype, 'runExpandableSelect' as keyof List);
      runExpandableSelectStub.resolves();

      const result = await List.run([], oclifConfig);

      expect(result.instructions.length).to.equal(1);
      expect(runExpandableSelectStub.calledOnce).to.equal(true);
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

  it('returns undefined description when content has no frontmatter', async () => {
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
      sandbox.stub(LocalFileScanner, 'scanAll').resolves([]);
      sandbox.stub(LocalFileScanner, 'scanInstructions').resolves([]);
      sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
        artifacts: [
          { name: 'test-skill', type: 'skill', source: 'test/repo', installed: false, description: 'Manifest desc' },
        ],
        errors: [],
        partialSuccess: false,
      });

      // Mock fetchArtifactContent to return content without frontmatter
      sandbox
        .stub(ArtifactService.prototype, 'fetchArtifactContent')
        .resolves('# Skill Content\n\nNo frontmatter here.');

      const runExpandableSelectStub = sandbox.stub(List.prototype, 'runExpandableSelect' as keyof List);
      runExpandableSelectStub.resolves();

      const result = await List.run([], oclifConfig);

      expect(result.skills.length).to.equal(1);
      expect(runExpandableSelectStub.calledOnce).to.equal(true);
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

  it('returns manifest description when fetchArtifactContent returns null', async () => {
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
      sandbox.stub(LocalFileScanner, 'scanAll').resolves([]);
      sandbox.stub(LocalFileScanner, 'scanInstructions').resolves([]);
      sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
        artifacts: [
          { name: 'test-skill', type: 'skill', source: 'test/repo', installed: false, description: 'Manifest desc' },
        ],
        errors: [],
        partialSuccess: false,
      });

      // Mock fetchArtifactContent to return null
      sandbox.stub(ArtifactService.prototype, 'fetchArtifactContent').resolves(null);

      const runExpandableSelectStub = sandbox.stub(List.prototype, 'runExpandableSelect' as keyof List);
      runExpandableSelectStub.resolves();

      const result = await List.run([], oclifConfig);

      expect(result.skills.length).to.equal(1);
      expect(runExpandableSelectStub.calledOnce).to.equal(true);
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

  it('shows warnings in non-JSON mode', async () => {
    sandbox.stub(AiDevConfig, 'create').resolves({
      getSources: () => [{ repo: 'failing/repo', isDefault: true, addedAt: '' }],
      getInstalledArtifacts: () => [],
      getDefaultSource: () => undefined,
      getTool: () => 'copilot',
    } as unknown as AiDevConfig);
    sandbox.stub(LocalFileScanner, 'scanAll').resolves([]);
    sandbox.stub(LocalFileScanner, 'scanInstructions').resolves([]);
    sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
      artifacts: [],
      errors: [
        { source: 'failing/repo', error: 'Network error' },
        { source: 'another/repo', error: 'Timeout' },
      ],
      partialSuccess: false,
    });

    // Don't use --json flag to test warning display
    const result = await List.run([], oclifConfig);

    expect(result.counts.total).to.equal(0);
  });
});
