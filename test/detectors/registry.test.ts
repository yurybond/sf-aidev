/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect } from 'chai';
import { DetectorRegistry } from '../../src/detectors/registry.js';
import { CopilotDetector } from '../../src/detectors/copilotDetector.js';
import { ClaudeDetector } from '../../src/detectors/claudeDetector.js';

describe('DetectorRegistry', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `registry-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('getDetectors', () => {
    it('returns all registered detectors', () => {
      const detectors = DetectorRegistry.getDetectors();
      expect(detectors).to.have.length(2);
      expect(detectors.map((d) => d.toolName)).to.include.members(['copilot', 'claude']);
    });
  });

  describe('getDetector', () => {
    it('returns detector by tool name', () => {
      const copilotDetector = DetectorRegistry.getDetector('copilot');
      expect(copilotDetector).to.be.instanceOf(CopilotDetector);

      const claudeDetector = DetectorRegistry.getDetector('claude');
      expect(claudeDetector).to.be.instanceOf(ClaudeDetector);
    });

    it('returns undefined for unknown tool', () => {
      const detector = DetectorRegistry.getDetector('unknown');
      expect(detector).to.be.undefined;
    });
  });

  describe('getSupportedTools', () => {
    it('returns all supported tool names', () => {
      const tools = DetectorRegistry.getSupportedTools();
      expect(tools).to.deep.equal(['copilot', 'claude']);
    });
  });

  describe('detectAll', () => {
    it('returns empty array when no tools detected', async () => {
      const detected = await DetectorRegistry.detectAll(testDir);
      expect(detected).to.deep.equal([]);
    });

    it('detects Copilot when configured', async () => {
      const githubDir = join(testDir, '.github');
      await mkdir(githubDir, { recursive: true });
      await writeFile(join(githubDir, 'copilot-instructions.md'), '# Instructions');

      const detected = await DetectorRegistry.detectAll(testDir);
      expect(detected).to.deep.equal(['copilot']);
    });

    it('detects Claude when configured', async () => {
      const claudeDir = join(testDir, '.claude');
      await mkdir(claudeDir, { recursive: true });

      const detected = await DetectorRegistry.detectAll(testDir);
      expect(detected).to.deep.equal(['claude']);
    });

    it('detects multiple tools when both configured', async () => {
      const githubDir = join(testDir, '.github');
      await mkdir(githubDir, { recursive: true });
      await writeFile(join(githubDir, 'copilot-instructions.md'), '# Instructions');

      const claudeDir = join(testDir, '.claude');
      await mkdir(claudeDir, { recursive: true });

      const detected = await DetectorRegistry.detectAll(testDir);
      expect(detected).to.include.members(['copilot', 'claude']);
    });
  });

  describe('detectAllWithDetails', () => {
    it('returns details for all tools', async () => {
      const results = await DetectorRegistry.detectAllWithDetails(testDir);

      expect(results).to.have.length(2);
      expect(results.find((r) => r.toolName === 'copilot')).to.deep.include({
        toolName: 'copilot',
        displayName: 'GitHub Copilot',
        detected: false,
      });
      expect(results.find((r) => r.toolName === 'claude')).to.deep.include({
        toolName: 'claude',
        displayName: 'Claude Code',
        detected: false,
      });
    });

    it('marks detected tools correctly', async () => {
      const claudeDir = join(testDir, '.claude');
      await mkdir(claudeDir, { recursive: true });

      const results = await DetectorRegistry.detectAllWithDetails(testDir);

      const copilot = results.find((r) => r.toolName === 'copilot');
      const claude = results.find((r) => r.toolName === 'claude');

      expect(copilot?.detected).to.be.false;
      expect(claude?.detected).to.be.true;
    });
  });
});
