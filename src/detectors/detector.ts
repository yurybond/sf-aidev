/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Abstract base class for AI tool detectors.
 * Each detector identifies whether a specific AI tool is configured in a project.
 */
export abstract class Detector {
  /**
   * The internal name of the tool (used in config and path resolution).
   */
  public abstract readonly toolName: string;

  /**
   * The human-readable display name of the tool.
   */
  public abstract readonly displayName: string;

  /**
   * Detect whether this AI tool is configured in the given project directory.
   *
   * @param projectPath - The absolute path to the project directory.
   * @returns Promise resolving to true if the tool is detected, false otherwise.
   */
  public abstract detect(projectPath: string): Promise<boolean>;
}
