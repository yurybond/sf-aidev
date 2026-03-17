/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect } from 'chai';
import { ClaudeDetector } from '../../src/detectors/claudeDetector.js';

describe('ClaudeDetector', () => {
  let testDir: string;
  let detector: ClaudeDetector;

  beforeEach(async () => {
    testDir = join(tmpdir(), `claude-detector-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    detector = new ClaudeDetector();
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('properties', () => {
    it('has correct toolName', () => {
      expect(detector.toolName).to.equal('claude');
    });

    it('has correct displayName', () => {
      expect(detector.displayName).to.equal('Claude Code');
    });
  });

  describe('detect', () => {
    it('returns false when no Claude directory exists', async () => {
      const result = await detector.detect(testDir);
      expect(result).to.be.false;
    });

    it('returns true when .claude directory exists', async () => {
      const claudeDir = join(testDir, '.claude');
      await mkdir(claudeDir, { recursive: true });

      const result = await detector.detect(testDir);
      expect(result).to.be.true;
    });

    it('returns true when .claude directory has contents', async () => {
      const claudeDir = join(testDir, '.claude');
      await mkdir(join(claudeDir, 'commands'), { recursive: true });

      const result = await detector.detect(testDir);
      expect(result).to.be.true;
    });
  });
});
