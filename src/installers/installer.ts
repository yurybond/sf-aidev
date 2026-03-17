/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Artifact, ArtifactType } from '../types/manifest.js';
import { GitHubFetcher } from '../sources/gitHubFetcher.js';

/**
 * Abstract base class for artifact installers.
 * Each artifact type (skill, agent, prompt) has its own installer implementation.
 */
export abstract class Installer {
  /**
   * The artifact type this installer handles.
   */
  public abstract readonly artifactType: ArtifactType;

  /**
   * Install an artifact to the project.
   *
   * @param artifact - The artifact definition from the manifest.
   * @param tool - The target AI tool (e.g., 'copilot', 'claude').
   * @param sourceRepo - The source repository in owner/repo format.
   * @param projectPath - The absolute path to the project root.
   * @param fetcher - The GitHubFetcher class to use (for dependency injection in tests).
   * @returns The absolute path where the artifact was installed.
   */
  public abstract install(
    artifact: Artifact,
    tool: string,
    sourceRepo: string,
    projectPath: string,
    fetcher?: typeof GitHubFetcher
  ): Promise<string>;

  /**
   * Uninstall an artifact from the project.
   *
   * @param name - The artifact name.
   * @param tool - The target AI tool.
   * @param projectPath - The absolute path to the project root.
   */
  public abstract uninstall(name: string, tool: string, projectPath: string): Promise<void>;
}
