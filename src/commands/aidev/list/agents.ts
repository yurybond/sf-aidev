/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { select } from '@inquirer/prompts';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import { ArtifactService } from '../../../services/artifactService.js';
import { LocalFileScanner, type MergedArtifact } from '../../../services/localFileScanner.js';
import { AiDevConfig } from '../../../config/aiDevConfig.js';
import { InteractiveTable } from '../../../ui/interactiveTable.js';
import { isInteractive, promptArtifactAction, type ArtifactAction } from '../../../ui/interactivePrompts.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('sf-aidev', 'aidev.list.agents');

export type ListAgentsResult = {
  agents: MergedArtifact[];
  counts: {
    installed: number;
    available: number;
    total: number;
  };
};

export default class ListAgents extends SfCommand<ListAgentsResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly enableJsonFlag = true;

  public static readonly flags = {
    source: Flags.string({
      char: 's',
      summary: messages.getMessage('flags.source.summary'),
    }),
  };

  public async run(): Promise<ListAgentsResult> {
    const { flags } = await this.parse(ListAgents);

    const globalConfig = await AiDevConfig.create({ isGlobal: true });
    const localConfig = await AiDevConfig.create({ isGlobal: false });
    const projectPath = process.cwd();

    // Scan local agents
    const localAgents = await LocalFileScanner.scanAgents(projectPath);

    // Fetch available agents from sources with error tracking
    const service = new ArtifactService(globalConfig, localConfig, projectPath);
    const { artifacts: availableArtifacts, errors } = await service.listAvailableWithErrors({
      source: flags.source,
      type: 'agent',
    });

    // Show warnings for failed sources
    if (errors.length > 0 && !this.jsonEnabled()) {
      for (const { source, error } of errors) {
        this.warn(messages.getMessage('warning.SourceFailed', [source, error]));
      }
    }

    // Merge local with manifest artifacts
    const merged = LocalFileScanner.mergeArtifacts(localAgents, availableArtifacts);

    // Sort alphabetically
    merged.sort((a, b) => a.name.localeCompare(b.name));

    // Display results
    if (!this.jsonEnabled()) {
      if (isInteractive()) {
        await this.runInteractive(merged, service);
      } else {
        InteractiveTable.renderSection(merged, 'Agents', (msg) => this.log(msg));
      }
    }

    const installed = merged.filter((a) => a.installed).length;
    const available = merged.filter((a) => !a.installed).length;

    return {
      agents: merged,
      counts: {
        installed,
        available,
        total: merged.length,
      },
    };
  }

  /**
   * Run interactive list with action sub-menu.
   */
  protected async runInteractive(agents: MergedArtifact[], service: ArtifactService): Promise<void> {
    if (agents.length === 0) {
      this.log(messages.getMessage('info.NoAgents'));
      return;
    }

    let continueLoop = true;

    while (continueLoop) {
      // eslint-disable-next-line no-await-in-loop
      const selected = await this.promptSelect(agents, messages.getMessage('prompt.Select'));

      if (!selected) {
        continueLoop = false;
        break;
      }

      // eslint-disable-next-line no-await-in-loop
      const action = await this.promptAction(selected);

      if (!action || action === 'back') {
        continue;
      }

      // eslint-disable-next-line no-await-in-loop
      await this.executeAction(action, selected, service, agents);
    }
  }

  /**
   * Execute the selected action on an artifact.
   */
  protected async executeAction(
    action: ArtifactAction,
    artifact: MergedArtifact,
    service: ArtifactService,
    agents: MergedArtifact[]
  ): Promise<void> {
    switch (action) {
      case 'view':
        this.displayArtifactDetails(artifact);
        break;

      case 'install':
        this.spinner.start(messages.getMessage('info.Installing', [artifact.name]));
        // eslint-disable-next-line no-case-declarations
        const installResult = await service.install(artifact.name, {
          type: 'agent',
          source: artifact.source,
        });
        this.spinner.stop();

        if (installResult.success) {
          this.log(messages.getMessage('info.Installed', [artifact.name, installResult.installedPath]));
          this.updateArtifactStatus(agents, artifact, true);
        } else {
          this.warn(messages.getMessage('warning.InstallFailed', [artifact.name, installResult.error ?? 'Unknown']));
        }
        break;

      case 'remove':
        this.spinner.start(messages.getMessage('info.Removing', [artifact.name]));
        // eslint-disable-next-line no-case-declarations
        const removeResult = await service.uninstall(artifact.name, { type: 'agent' });
        this.spinner.stop();

        if (removeResult.success) {
          this.log(messages.getMessage('info.Removed', [artifact.name]));
          this.updateArtifactStatus(agents, artifact, false);
        } else {
          this.warn(messages.getMessage('warning.RemoveFailed', [artifact.name, removeResult.error ?? 'Unknown']));
        }
        break;

      default:
        break;
    }
  }

  /**
   * Display detailed information about an artifact.
   */
  protected displayArtifactDetails(artifact: MergedArtifact): void {
    this.log('');
    this.log(`Name: ${artifact.name}`);
    this.log(`Type: ${artifact.type}`);
    this.log(`Status: ${artifact.installed ? 'Installed' : 'Available'}`);
    if (artifact.description) {
      this.log(`Description: ${artifact.description}`);
    }
    if (artifact.source) {
      this.log(`Source: ${artifact.source}`);
    }
    this.log('');
  }

  /**
   * Update an artifact's installed status in the list.
   */
  // eslint-disable-next-line class-methods-use-this
  protected updateArtifactStatus(agents: MergedArtifact[], artifact: MergedArtifact, installed: boolean): void {
    const found = agents.find((a) => a.name === artifact.name);
    if (found) {
      found.installed = installed;
    }
  }

  /**
   * Prompt user to select an agent from the list.
   */
  // eslint-disable-next-line class-methods-use-this
  protected async promptSelect(agents: MergedArtifact[], message: string): Promise<MergedArtifact | null> {
    const choices = InteractiveTable.toCheckboxChoices(agents);

    if (choices.length === 0) {
      return null;
    }

    try {
      return await select<MergedArtifact>({
        message,
        choices,
        pageSize: 15,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'ExitPromptError') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Prompt user to select an action for an artifact.
   */
  // eslint-disable-next-line class-methods-use-this
  protected async promptAction(artifact: MergedArtifact): Promise<ArtifactAction | null> {
    return promptArtifactAction(artifact);
  }
}
