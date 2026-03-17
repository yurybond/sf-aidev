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
 * Paths that indicate GitHub Copilot is configured in a project.
 */
const COPILOT_PATHS = ['.github/copilot-instructions.md', '.github/agents', '.github/prompts'];

/**
 * Detector for GitHub Copilot configuration.
 */
export class CopilotDetector extends Detector {
  public readonly toolName = 'copilot';
  public readonly displayName = 'GitHub Copilot';

  /**
   * Detect GitHub Copilot by checking for configuration files/directories.
   * Returns true if any of the Copilot-specific paths exist.
   */
  // eslint-disable-next-line class-methods-use-this
  public async detect(projectPath: string): Promise<boolean> {
    const checks = COPILOT_PATHS.map((relativePath) => pathExists(join(projectPath, relativePath)));

    const results = await Promise.all(checks);
    return results.some((exists) => exists);
  }
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}
