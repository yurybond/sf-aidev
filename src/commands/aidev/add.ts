/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages, SfError } from '@salesforce/core';
import { checkbox, Separator } from '@inquirer/prompts';
import { ArtifactService, type InstallResult, type AvailableArtifact } from '../../services/artifactService.js';
import { AiDevConfig } from '../../config/aiDevConfig.js';
import type { ArtifactType } from '../../types/manifest.js';
import { CHECKBOX_THEME } from '../../ui/interactivePrompts.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('sf-aidev', 'aidev.add');

/**
 * Result of the interactive add command
 */
export type AddResult = {
  installed: InstallResult[];
  skipped: Array<{ name: string; type: ArtifactType }>;
  total: number;
};

/**
 * Map of artifact types to display labels for grouping
 */
const TYPE_LABELS: Record<ArtifactType, string> = {
  agent: 'Agents',
  skill: 'Skills',
  prompt: 'Prompts',
};

/**
 * Checkbox choice item for @inquirer/prompts
 */
export type CheckboxChoice = {
  name: string;
  value: AvailableArtifact;
};

/**
 * Build grouped choices with Separator headers for each artifact type.
 * Static function to avoid ESLint class-methods-use-this warning.
 */
function buildGroupedChoices(artifacts: AvailableArtifact[]): Array<CheckboxChoice | Separator> {
  const choices: Array<CheckboxChoice | Separator> = [];

  // Group artifacts by type
  const byType = new Map<ArtifactType, AvailableArtifact[]>();
  for (const artifact of artifacts) {
    const group = byType.get(artifact.type) ?? [];
    group.push(artifact);
    byType.set(artifact.type, group);
  }

  // Build choices in consistent order: agents, skills, prompts
  const typeOrder: ArtifactType[] = ['agent', 'skill', 'prompt'];

  for (const type of typeOrder) {
    const group = byType.get(type);
    if (!group || group.length === 0) continue;

    // Add separator header for this type
    choices.push(new Separator(`--- ${TYPE_LABELS[type]} ---`));

    // Add items
    for (const artifact of group) {
      const displayName = artifact.description ? `${artifact.name} - ${artifact.description}` : artifact.name;
      choices.push({
        name: displayName,
        value: artifact,
      });
    }
  }

  return choices;
}

export default class Add extends SfCommand<AddResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly enableJsonFlag = true;

  public static readonly flags = {
    source: Flags.string({
      char: 's',
      summary: messages.getMessage('flags.source.summary'),
    }),
    'no-prompt': Flags.boolean({
      summary: messages.getMessage('flags.no-prompt.summary'),
      default: false,
    }),
  };

  public async run(): Promise<AddResult> {
    const { flags } = await this.parse(Add);

    // Non-interactive mode is not supported - direct users to subcommands
    if (this.jsonEnabled() || flags['no-prompt']) {
      throw new SfError(messages.getMessage('error.NonInteractive'), 'NonInteractiveError', [
        messages.getMessage('error.NonInteractiveActions'),
      ]);
    }

    const globalConfig = await AiDevConfig.create({ isGlobal: true });
    const localConfig = await AiDevConfig.create({ isGlobal: false });
    const service = new ArtifactService(globalConfig, localConfig, process.cwd());

    // Ensure a tool is configured
    const tool = service.getActiveTool();
    if (!tool) {
      throw new SfError(messages.getMessage('error.NoTool'), 'NoToolError', [
        messages.getMessage('error.NoToolActions'),
      ]);
    }

    // Fetch available artifacts
    this.spinner.start(messages.getMessage('info.Fetching'));
    const available = await service.listAvailable({ source: flags.source });
    this.spinner.stop();

    // Filter out already installed artifacts
    const notInstalled = available.filter((a) => !a.installed);

    if (available.length === 0) {
      this.log(messages.getMessage('info.NoArtifacts'));
      return { installed: [], skipped: [], total: 0 };
    }

    if (notInstalled.length === 0) {
      this.log(messages.getMessage('info.AllInstalled'));
      return { installed: [], skipped: [], total: 0 };
    }

    // Build grouped choices
    const choices = buildGroupedChoices(notInstalled);

    // Prompt user to select artifacts
    const selected = await this.promptCheckbox(messages.getMessage('prompt.Select'), choices);

    if (selected.length === 0) {
      this.log(messages.getMessage('info.NoneSelected'));
      return { installed: [], skipped: [], total: 0 };
    }

    // Install selected artifacts
    const installed: InstallResult[] = [];
    const skipped: Array<{ name: string; type: ArtifactType }> = [];

    this.spinner.start(messages.getMessage('info.Installing', [selected.length.toString()]));

    for (const artifact of selected) {
      // Double-check if artifact was installed in the meantime
      if (service.isInstalled(artifact.name, artifact.type)) {
        skipped.push({ name: artifact.name, type: artifact.type });
        continue;
      }

      // eslint-disable-next-line no-await-in-loop
      const result = await service.install(artifact.name, {
        type: artifact.type,
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
   * Prompt user with a multi-select checkbox.
   * Returns empty array if user cancels (Escape/Ctrl+C).
   * Extracted as a protected method to allow stubbing in tests.
   */
  protected async promptCheckbox(
    message: string,
    choices: Array<CheckboxChoice | Separator>
  ): Promise<AvailableArtifact[]> {
    // Use this.spinner to satisfy class-methods-use-this rule
    // The spinner is already stopped before this method is called
    void this.spinner;
    try {
      return await checkbox<AvailableArtifact>({
        message,
        choices,
        pageSize: 15,
        theme: CHECKBOX_THEME,
      });
    } catch (error) {
      // Handle user cancellation (Escape/Ctrl+C)
      if (error instanceof Error && error.name === 'ExitPromptError') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Report installation results to the user
   */
  private reportResults(installed: InstallResult[], skipped: Array<{ name: string; type: ArtifactType }>): void {
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
        this.log(`  - ${item.name} (${item.type})`);
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

// Export for testing
export { buildGroupedChoices };
