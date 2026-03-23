/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { Config } from '@oclif/core';
import Remove from '../../../../src/commands/aidev/remove/index.js';
import { AiDevConfig } from '../../../../src/config/aiDevConfig.js';
import { ArtifactService } from '../../../../src/services/artifactService.js';
import { LocalFileScanner } from '../../../../src/services/localFileScanner.js';

describe('aidev remove (parent)', () => {
  const sandbox = sinon.createSandbox();
  let oclifConfig: Config;

  before(async () => {
    oclifConfig = await Config.load({ root: process.cwd() });
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('throws NonInteractiveError when --json flag is used', async () => {
    sandbox.stub(AiDevConfig, 'create').resolves({
      getDefaultSource: () => undefined,
      getInstalledArtifacts: () => [],
    } as unknown as AiDevConfig);

    try {
      await Remove.run(['--json'], oclifConfig);
      expect.fail('Should have thrown');
    } catch (error) {
      expect((error as Error).name).to.equal('NonInteractiveError');
    }
  });

  it('throws NonInteractiveError when --no-prompt flag is used (with TTY available)', async () => {
    // Store original values
    const originalStdinTTY = process.stdin.isTTY;
    const originalStdoutTTY = process.stdout.isTTY;

    try {
      // Set TTY to true via Object.defineProperty to simulate interactive environment
      Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true, writable: true });
      Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true, writable: true });

      sandbox.stub(AiDevConfig, 'create').resolves({
        getSources: () => [],
        getInstalledArtifacts: () => [],
        getTool: () => 'copilot',
      } as unknown as AiDevConfig);
      sandbox.stub(LocalFileScanner, 'scanAll').resolves([]);

      await Remove.run(['--no-prompt'], oclifConfig);
      expect.fail('Should have thrown');
    } catch (error) {
      expect((error as Error).name).to.equal('NonInteractiveError');
    } finally {
      // Restore original values
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

  it('returns empty result when no artifacts are installed', async () => {
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
      sandbox.stub(LocalFileScanner, 'scanAll').resolves([]);
      sandbox.stub(Remove.prototype, 'promptCheckbox' as keyof Remove).resolves([]);

      const result = await Remove.run([], oclifConfig);

      expect(result.removed).to.deep.equal([]);
      expect(result.failed).to.deep.equal([]);
      expect(result.total).to.equal(0);
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

  it('returns empty result when user selects nothing', async () => {
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
        .stub(LocalFileScanner, 'scanAll')
        .resolves([{ name: 'skill1', type: 'skill', installed: true, path: '/path/skill1.md' }]);
      sandbox.stub(Remove.prototype, 'promptCheckbox' as keyof Remove).resolves([]);

      const result = await Remove.run([], oclifConfig);

      expect(result.removed).to.deep.equal([]);
      expect(result.total).to.equal(0);
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

  it('returns empty result when user cancels confirmation', async () => {
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
        .stub(LocalFileScanner, 'scanAll')
        .resolves([{ name: 'skill1', type: 'skill', installed: true, path: '/path/skill1.md' }]);
      sandbox
        .stub(Remove.prototype, 'promptCheckbox' as keyof Remove)
        .resolves([{ name: 'skill1', type: 'skill', installed: true }]);
      sandbox.stub(Remove.prototype, 'confirmRemoval' as keyof Remove).resolves(false);

      const result = await Remove.run([], oclifConfig);

      expect(result.removed).to.deep.equal([]);
      expect(result.total).to.equal(0);
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

  it('removes selected artifacts successfully', async () => {
    const originalStdinTTY = process.stdin.isTTY;
    const originalStdoutTTY = process.stdout.isTTY;

    try {
      Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true, writable: true });
      Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true, writable: true });

      sandbox.stub(AiDevConfig, 'create').resolves({
        getSources: () => [],
        getInstalledArtifacts: () => [
          { name: 'skill1', type: 'skill', path: '/path/skill1.md', source: 'test/repo', installedAt: '' },
        ],
        getTool: () => 'copilot',
        removeInstalledArtifact: sandbox.stub(),
        write: sandbox.stub().resolves(),
      } as unknown as AiDevConfig);
      sandbox
        .stub(LocalFileScanner, 'scanAll')
        .resolves([{ name: 'skill1', type: 'skill', installed: true, path: '/path/skill1.md' }]);
      sandbox
        .stub(Remove.prototype, 'promptCheckbox' as keyof Remove)
        .resolves([{ name: 'skill1', type: 'skill', installed: true }]);
      sandbox.stub(Remove.prototype, 'confirmRemoval' as keyof Remove).resolves(true);
      sandbox.stub(ArtifactService.prototype, 'uninstall').resolves({ success: true });

      const result = await Remove.run([], oclifConfig);

      expect(result.removed.length).to.equal(1);
      expect(result.removed[0].name).to.equal('skill1');
      expect(result.removed[0].success).to.equal(true);
      expect(result.total).to.equal(1);
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

  it('reports failed removals', async () => {
    const originalStdinTTY = process.stdin.isTTY;
    const originalStdoutTTY = process.stdout.isTTY;

    try {
      Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true, writable: true });
      Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true, writable: true });

      sandbox.stub(AiDevConfig, 'create').resolves({
        getSources: () => [],
        getInstalledArtifacts: () => [
          { name: 'skill1', type: 'skill', path: '/path/skill1.md', source: 'test/repo', installedAt: '' },
        ],
        getTool: () => 'copilot',
      } as unknown as AiDevConfig);
      sandbox
        .stub(LocalFileScanner, 'scanAll')
        .resolves([{ name: 'skill1', type: 'skill', installed: true, path: '/path/skill1.md' }]);
      sandbox
        .stub(Remove.prototype, 'promptCheckbox' as keyof Remove)
        .resolves([{ name: 'skill1', type: 'skill', installed: true }]);
      sandbox.stub(Remove.prototype, 'confirmRemoval' as keyof Remove).resolves(true);
      sandbox.stub(ArtifactService.prototype, 'uninstall').resolves({
        success: false,
        error: 'File not found',
      });

      const result = await Remove.run([], oclifConfig);

      expect(result.failed.length).to.equal(1);
      expect(result.failed[0].name).to.equal('skill1');
      expect(result.failed[0].error).to.equal('File not found');
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

  it('skips instruction artifacts during removal', async () => {
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
        .stub(LocalFileScanner, 'scanAll')
        .resolves([{ name: 'skill1', type: 'skill', installed: true, path: '/path/skill1.md' }]);
      sandbox
        .stub(Remove.prototype, 'promptCheckbox' as keyof Remove)
        .resolves([{ name: 'CLAUDE.md', type: 'instruction', installed: true }]);
      sandbox.stub(Remove.prototype, 'confirmRemoval' as keyof Remove).resolves(true);

      const uninstallStub = sandbox.stub(ArtifactService.prototype, 'uninstall');

      const result = await Remove.run([], oclifConfig);

      // Instructions should be skipped, so uninstall should not be called
      expect(uninstallStub.called).to.be.false;
      expect(result.removed.length).to.equal(0);
      expect(result.failed.length).to.equal(0);
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

  it('handles mixed success and failure results', async () => {
    const originalStdinTTY = process.stdin.isTTY;
    const originalStdoutTTY = process.stdout.isTTY;

    try {
      Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true, writable: true });
      Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true, writable: true });

      sandbox.stub(AiDevConfig, 'create').resolves({
        getSources: () => [],
        getInstalledArtifacts: () => [
          { name: 'skill1', type: 'skill', path: '/path/skill1.md', source: 'test/repo', installedAt: '' },
          { name: 'skill2', type: 'skill', path: '/path/skill2.md', source: 'test/repo', installedAt: '' },
        ],
        getTool: () => 'copilot',
        removeInstalledArtifact: sandbox.stub(),
        write: sandbox.stub().resolves(),
      } as unknown as AiDevConfig);
      sandbox.stub(LocalFileScanner, 'scanAll').resolves([
        { name: 'skill1', type: 'skill', installed: true, path: '/path/skill1.md' },
        { name: 'skill2', type: 'skill', installed: true, path: '/path/skill2.md' },
      ]);
      sandbox.stub(Remove.prototype, 'promptCheckbox' as keyof Remove).resolves([
        { name: 'skill1', type: 'skill', installed: true },
        { name: 'skill2', type: 'skill', installed: true },
      ]);
      sandbox.stub(Remove.prototype, 'confirmRemoval' as keyof Remove).resolves(true);

      const uninstallStub = sandbox.stub(ArtifactService.prototype, 'uninstall');
      uninstallStub.onFirstCall().resolves({ success: true });
      uninstallStub.onSecondCall().resolves({ success: false, error: 'Permission denied' });

      const result = await Remove.run([], oclifConfig);

      expect(result.removed.length).to.equal(1);
      expect(result.failed.length).to.equal(1);
      expect(result.total).to.equal(2);
      expect(result.removed[0].name).to.equal('skill1');
      expect(result.failed[0].name).to.equal('skill2');
      expect(result.failed[0].error).to.equal('Permission denied');
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
