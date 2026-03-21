/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages, SfError } from '@salesforce/core';
import { Separator } from '@inquirer/prompts';
import { ArtifactService, type InstallResult, type AvailableArtifact } from '../../../services/artifactService.js';
import { AiDevConfig } from '../../../config/aiDevConfig.js';
import { isInteractive, promptCheckboxGeneric, CHECKBOX_THEME } from '../../../ui/interactivePrompts.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('sf-aidev', 'aidev.add.prompt');

/**
 * Result type for single prompt installation
 */
export type AddPromptResult = InstallResult | AddPromptMultiResult;

/**
 * Result type for multiple prompt installation (interactive mode)
 */
export type AddPromptMultiResult = {
  installed: InstallResult[];
  skipped: Array<{ name: string }>;
  total: number;
};

/**
 * Checkbox choice type for interactive selection
 */
type CheckboxChoice = {
  name: string;
  value: AvailableArtifact;
};

export default class AddPrompt extends SfCommand<AddPromptResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly enableJsonFlag = true;

  public static readonly flags = {
    name: Flags.string({
      char: 'n',
      summary: messages.getMessage('flags.name.summary'),
      required: false,
    }),
    source: Flags.string({
      char: 's',
      summary: messages.getMessage('flags.source.summary'),
    }),
  };

  public async run(): Promise<AddPromptResult> {
    const { flags } = await this.parse(AddPrompt);

    const globalConfig = await AiDevConfig.create({ isGlobal: true });
    const localConfig = await AiDevConfig.create({ isGlobal: false });
    const service = new ArtifactService(globalConfig, localConfig, process.cwd());

    // If name is provided, install directly (non-interactive mode)
    if (flags.name) {
      return this.installSingle(service, flags.name, flags.source);
    }

    // Interactive mode - name not provided
    if (!isInteractive()) {
      throw new SfError(messages.getMessage('error.NonInteractive'), 'NonInteractiveError', [
        messages.getMessage('error.NonInteractiveActions'),
      ]);
    }

    return this.runInteractive(service, flags.source);
  }

  /**
   * Prompt user with a multi-select checkbox.
   * Extracted for test stubbing.
   */
  // eslint-disable-next-line class-methods-use-this
  protected async promptCheckbox(
    message: string,
    choices: Array<CheckboxChoice | Separator>,
  ): Promise<AvailableArtifact[]> {
    return promptCheckboxGeneric<AvailableArtifact>({
      message,
      choices,
      pageSize: 15,
      theme: CHECKBOX_THEME,
    });
  }

  /**
   * Install a single prompt by name (non-interactive mode).
   */
  private async installSingle(service: ArtifactService, name: string, source?: string): Promise<InstallResult> {
    const result: InstallResult = await service.install(name, { type: 'prompt', source });

    if (!result.success) {
      throw new SfError(
        messages.getMessage('error.InstallFailed', [name, result.error ?? 'Unknown error']),
        'InstallError',
      );
    }

    this.log(messages.getMessage('info.PromptInstalled', [result.artifact, result.installedPath]));
    return result;
  }

  /**
   * Run interactive mode - show checkbox list of available prompts.
   */
  private async runInteractive(service: ArtifactService, source?: string): Promise<AddPromptMultiResult> {
    // Ensure a tool is configured
    const tool = service.getActiveTool();
    if (!tool) {
      throw new SfError(messages.getMessage('error.NoTool'), 'NoToolError', [
        messages.getMessage('error.NoToolActions'),
      ]);
    }

    // Fetch available artifacts filtered to prompts only
    this.spinner.start(messages.getMessage('info.Fetching'));
    const available = await service.listAvailable({ source, type: 'prompt' });
    this.spinner.stop();

    // Filter out already installed
    const notInstalled = available.filter((a) => !a.installed);

    if (available.length === 0) {
      this.log(messages.getMessage('info.NoArtifacts'));
      return { installed: [], skipped: [], total: 0 };
    }

    if (notInstalled.length === 0) {
      this.log(messages.getMessage('info.AllInstalled'));
      return { installed: [], skipped: [], total: 0 };
    }

    // Build choices
    const choices = this.buildChoices(notInstalled);

    // Prompt user to select prompts
    const selected = await this.promptCheckbox(messages.getMessage('prompt.Select'), choices);

    if (selected.length === 0) {
      this.log(messages.getMessage('info.NoneSelected'));
      return { installed: [], skipped: [], total: 0 };
    }

    // Install selected prompts
    const installed: InstallResult[] = [];
    const skipped: Array<{ name: string }> = [];

    this.spinner.start(messages.getMessage('info.Installing', [selected.length.toString()]));

    for (const artifact of selected) {
      // Double-check if prompt was installed in the meantime
      if (service.isInstalled(artifact.name, 'prompt')) {
        skipped.push({ name: artifact.name });
        continue;
      }

      // eslint-disable-next-line no-await-in-loop
      const result = await service.install(artifact.name, {
        type: 'prompt',
        source: artifact.source,
      });
      installed.push(result);
    }

    this.spinner.stop();

    // Report results
    this.reportResults(installed, skipped);

    return {
      installed,
      skipped,
      total: selected.length,
    };
  }

  /**
   * Build checkbox choices from available artifacts.
   */
  // eslint-disable-next-line class-methods-use-this
  private buildChoices(artifacts: AvailableArtifact[]): Array<CheckboxChoice | Separator> {
    return artifacts.map((artifact) => {
      const displayName = artifact.description ? `${artifact.name} - ${artifact.description}` : artifact.name;
      return {
        name: displayName,
        value: artifact,
      };
    });
  }

  /**
   * Report installation results to the user.
   */
  private reportResults(installed: InstallResult[], skipped: Array<{ name: string }>): void {
    const successful = installed.filter((r) => r.success);
    const failed = installed.filter((r) => !r.success);

    if (successful.length > 0) {
      this.log(messages.getMessage('info.Installed', [successful.length.toString()]));
      for (const result of successful) {
        this.log(`  - ${result.artifact} -> ${result.installedPath}`);
      }
    }

    if (skipped.length > 0) {
      this.log(messages.getMessage('info.Skipped', [skipped.length.toString()]));
      for (const item of skipped) {
        this.log(`  - ${item.name}`);
      }
    }

    if (failed.length > 0) {
      this.warn(messages.getMessage('warning.Failed', [failed.length.toString()]));
      for (const result of failed) {
        this.log(`  - ${result.artifact}: ${result.error ?? 'Unknown error'}`);
      }
    }
  }
}
