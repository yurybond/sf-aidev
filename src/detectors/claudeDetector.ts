/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { Detector } from './detector.js';

/**
 * Paths that indicate Claude Code is configured in a project.
 */
const CLAUDE_PATHS = ['.claude'];

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Detector for Claude Code configuration.
 */
export class ClaudeDetector extends Detector {
  public readonly toolName = 'claude';
  public readonly displayName = 'Claude Code';

  /**
   * Detect Claude Code by checking for the .claude directory.
   */
  // eslint-disable-next-line class-methods-use-this
  public async detect(projectPath: string): Promise<boolean> {
    const checks = CLAUDE_PATHS.map((relativePath) => pathExists(join(projectPath, relativePath)));

    const results = await Promise.all(checks);
    return results.some((exists) => exists);
  }
}
