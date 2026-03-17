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
import { CopilotDetector } from '../../src/detectors/copilotDetector.js';

describe('CopilotDetector', () => {
  let testDir: string;
  let detector: CopilotDetector;

  beforeEach(async () => {
    testDir = join(tmpdir(), `copilot-detector-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    detector = new CopilotDetector();
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('properties', () => {
    it('has correct toolName', () => {
      expect(detector.toolName).to.equal('copilot');
    });

    it('has correct displayName', () => {
      expect(detector.displayName).to.equal('GitHub Copilot');
    });
  });

  describe('detect', () => {
    it('returns false when no Copilot files exist', async () => {
      const result = await detector.detect(testDir);
      expect(result).to.be.false;
    });

    it('returns true when copilot-instructions.md exists', async () => {
      const githubDir = join(testDir, '.github');
      await mkdir(githubDir, { recursive: true });
      await writeFile(join(githubDir, 'copilot-instructions.md'), '# Instructions');

      const result = await detector.detect(testDir);
      expect(result).to.be.true;
    });

    it('returns true when .github/agents directory exists', async () => {
      const agentsDir = join(testDir, '.github', 'agents');
      await mkdir(agentsDir, { recursive: true });

      const result = await detector.detect(testDir);
      expect(result).to.be.true;
    });

    it('returns true when .github/prompts directory exists', async () => {
      const promptsDir = join(testDir, '.github', 'prompts');
      await mkdir(promptsDir, { recursive: true });

      const result = await detector.detect(testDir);
      expect(result).to.be.true;
    });

    it('returns true when multiple Copilot paths exist', async () => {
      const githubDir = join(testDir, '.github');
      await mkdir(join(githubDir, 'agents'), { recursive: true });
      await mkdir(join(githubDir, 'prompts'), { recursive: true });
      await writeFile(join(githubDir, 'copilot-instructions.md'), '# Instructions');

      const result = await detector.detect(testDir);
      expect(result).to.be.true;
    });

    it('returns false when .github exists but no Copilot files', async () => {
      const workflowsDir = join(testDir, '.github', 'workflows');
      await mkdir(workflowsDir, { recursive: true });
      await writeFile(join(workflowsDir, 'test.yml'), 'name: test');

      const result = await detector.detect(testDir);
      expect(result).to.be.false;
    });
  });
});
