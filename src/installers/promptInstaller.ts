/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, basename } from 'node:path';
import { Artifact, ArtifactType } from '../types/manifest.js';
import { GitHubFetcher } from '../sources/gitHubFetcher.js';
import { Installer } from './installer.js';
import { PathResolver } from './pathResolver.js';

/**
 * Installer for prompt artifacts.
 */
export class PromptInstaller extends Installer {
  public readonly artifactType: ArtifactType = 'prompt';

  /**
   * Install a prompt to the project.
   */
  // eslint-disable-next-line class-methods-use-this
  public async install(
    artifact: Artifact,
    tool: string,
    sourceRepo: string,
    projectPath: string,
    fetcher: typeof GitHubFetcher = GitHubFetcher
  ): Promise<string> {
    const installPath = PathResolver.resolve('prompt', tool, artifact.name, projectPath);

    // Create the artifact directory
    await mkdir(installPath, { recursive: true });

    // Download and write each file
    await Promise.all(
      artifact.files.map(async (file) => {
        const content = await fetcher.fetchFile(sourceRepo, file.source);
        const targetName = file.target ?? basename(file.source);
        const targetPath = PathResolver.resolveFile('prompt', tool, artifact.name, targetName, projectPath);

        await mkdir(dirname(targetPath), { recursive: true });
        await writeFile(targetPath, content, 'utf8');
      })
    );

    return installPath;
  }

  /**
   * Uninstall a prompt from the project.
   */
  // eslint-disable-next-line class-methods-use-this
  public async uninstall(name: string, tool: string, projectPath: string): Promise<void> {
    const installPath = PathResolver.resolve('prompt', tool, name, projectPath);
    await rm(installPath, { recursive: true, force: true });
  }
}
