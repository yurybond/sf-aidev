/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages, SfError } from '@salesforce/core';
import { confirm } from '@inquirer/prompts';
import { ArtifactService } from '../../../services/artifactService.js';
import { LocalFileScanner, type GroupedArtifacts, type MergedArtifact } from '../../../services/localFileScanner.js';
import { AiDevConfig } from '../../../config/aiDevConfig.js';
import { isInteractive, promptGroupedCheckbox } from '../../../ui/interactivePrompts.js';
import type { ArtifactType } from '../../../types/manifest.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('sf-aidev', 'aidev.remove');

/**
 * Result of uninstalling an artifact
 */
export type UninstallResult = {
  name: string;
  type: ArtifactType;
  success: boolean;
  error?: string;
};

/**
 * Result of the interactive remove command
 */
export type RemoveResult = {
  removed: UninstallResult[];
  failed: UninstallResult[];
  total: number;
};

export default class Remove extends SfCommand<RemoveResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly enableJsonFlag = true;

  public static readonly flags = {
    'no-prompt': Flags.boolean({
      summary: messages.getMessage('flags.no-prompt.summary'),
      default: false,
    }),
  };

  public async run(): Promise<RemoveResult> {
    const { flags } = await this.parse(Remove);

    // Non-interactive mode is not supported for the parent command
    if (this.jsonEnabled() || flags['no-prompt'] || !isInteractive()) {
      throw new SfError(messages.getMessage('error.NonInteractive'), 'NonInteractiveError', [
        messages.getMessage('error.NonInteractiveActions'),
      ]);
    }

    const globalConfig = await AiDevConfig.create({ isGlobal: true });
    const localConfig = await AiDevConfig.create({ isGlobal: false });
    const projectPath = process.cwd();
    const service = new ArtifactService(globalConfig, localConfig, projectPath);

    // Scan local artifacts (installed)
    const localArtifacts = await LocalFileScanner.scanAll(projectPath);

    if (localArtifacts.length === 0) {
      this.log(messages.getMessage('info.NoArtifacts'));
      return { removed: [], failed: [], total: 0 };
    }

    // Convert to MergedArtifact format and group by type
    const merged: MergedArtifact[] = localArtifacts.map((a) => ({
      name: a.name,
      type: a.type,
      installed: true,
    }));

    const groups: GroupedArtifacts = {
      agents: merged.filter((a) => a.type === 'agent'),
      skills: merged.filter((a) => a.type === 'skill'),
      prompts: merged.filter((a) => a.type === 'prompt'),
      instructions: [],
    };

    // Prompt user to select artifacts to remove
    const selected = await this.promptCheckbox(groups, messages.getMessage('prompt.Select'));

    if (selected.length === 0) {
      this.log(messages.getMessage('info.NoneSelected'));
      return { removed: [], failed: [], total: 0 };
    }

    // Confirm removal
    const confirmed = await this.confirmRemoval(selected.length);
    if (!confirmed) {
      this.log(messages.getMessage('info.Cancelled'));
      return { removed: [], failed: [], total: 0 };
    }

    // Remove selected artifacts
    const removed: UninstallResult[] = [];
    const failed: UninstallResult[] = [];

    this.spinner.start(messages.getMessage('info.Removing', [selected.length.toString()]));

    for (const artifact of selected) {
      if (artifact.type === 'instruction') {
        // Skip instructions - they can't be uninstalled via the service
        continue;
      }

      // eslint-disable-next-line no-await-in-loop
      const result = await service.uninstall(artifact.name, { type: artifact.type });

      const uninstallResult: UninstallResult = {
        name: artifact.name,
        type: artifact.type,
        success: result.success,
        error: result.error,
      };

      if (result.success) {
        removed.push(uninstallResult);
      } else {
        failed.push(uninstallResult);
      }
    }

    this.spinner.stop();

    // Report results
    this.reportResults(removed, failed);

    return {
      removed,
      failed,
      total: selected.length,
    };
  }

  /**
   * Prompt user to select artifacts to remove via checkbox.
   * Extracted for test stubbing.
   */
  // eslint-disable-next-line class-methods-use-this
  protected async promptCheckbox(groups: GroupedArtifacts, message: string): Promise<MergedArtifact[]> {
    return promptGroupedCheckbox(groups, message, 'installed');
  }

  /**
   * Confirm removal of selected artifacts.
   * Extracted for test stubbing.
   */
  // eslint-disable-next-line class-methods-use-this
  protected async confirmRemoval(count: number): Promise<boolean> {
    try {
      return await confirm({
        message: messages.getMessage('prompt.Confirm', [count.toString()]),
        default: false,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'ExitPromptError') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Report removal results to the user.
   */
  private reportResults(removed: UninstallResult[], failed: UninstallResult[]): void {
    if (removed.length > 0) {
      this.log(messages.getMessage('info.Removed', [removed.length.toString()]));
      for (const result of removed) {
        this.log(`  - ${result.name} (${result.type})`);
      }
    }

    if (failed.length > 0) {
      this.warn(messages.getMessage('warning.Failed', [failed.length.toString()]));
      for (const result of failed) {
        this.log(`  - ${result.name}: ${result.error ?? 'Unknown error'}`);
      }
    }
  }
}
