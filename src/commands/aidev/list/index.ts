/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import { ArtifactService } from '../../../services/artifactService.js';
import { LocalFileScanner, type GroupedArtifacts, type MergedArtifact } from '../../../services/localFileScanner.js';
import { AiDevConfig } from '../../../config/aiDevConfig.js';
import { InteractiveTable } from '../../../ui/interactiveTable.js';
import { FrontmatterParser } from '../../../utils/frontmatterParser.js';
import {
  isInteractive,
  promptArtifactList,
  promptArtifactAction,
  type ArtifactAction,
} from '../../../ui/interactivePrompts.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('sf-aidev', 'aidev.list');

export type ListResult = {
  agents: MergedArtifact[];
  skills: MergedArtifact[];
  prompts: MergedArtifact[];
  instructions: MergedArtifact[];
  counts: {
    installed: number;
    available: number;
    total: number;
  };
};

export default class List extends SfCommand<ListResult> {
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

  public async run(): Promise<ListResult> {
    const { flags } = await this.parse(List);

    const globalConfig = await AiDevConfig.create({ isGlobal: true });
    const localConfig = await AiDevConfig.create({ isGlobal: false });
    const projectPath = process.cwd();

    // Scan local artifacts
    const localArtifacts = await LocalFileScanner.scanAll(projectPath);
    const instructions = await LocalFileScanner.scanInstructions(projectPath);

    // Fetch available artifacts from sources with error tracking
    const service = new ArtifactService(globalConfig, localConfig, projectPath);
    const { artifacts: availableArtifacts, errors } = await service.listAvailableWithErrors({
      source: flags.source,
    });

    // Show warnings for failed sources
    if (errors.length > 0 && !this.jsonEnabled()) {
      for (const { source, error } of errors) {
        this.warn(messages.getMessage('warning.SourceFailed', [source, error]));
      }
    }

    // Merge local with manifest artifacts
    const merged = LocalFileScanner.mergeArtifacts(localArtifacts, availableArtifacts);

    // Group by type
    const groups = LocalFileScanner.groupByType(merged, instructions);

    // Display results
    if (!this.jsonEnabled()) {
      if (isInteractive()) {
        await this.runInteractive(groups, service);
      } else {
        this.displayResults(groups);
      }
    }

    const counts = InteractiveTable.getCounts(groups);

    return {
      agents: groups.agents,
      skills: groups.skills,
      prompts: groups.prompts,
      instructions: groups.instructions,
      counts: {
        installed: counts.installed,
        available: counts.available,
        total: InteractiveTable.getTotalCount(groups),
      },
    };
  }

  /**
   * Run interactive list with action sub-menu.
   */
  protected async runInteractive(groups: GroupedArtifacts, service: ArtifactService): Promise<void> {
    let continueLoop = true;

    while (continueLoop) {
      // eslint-disable-next-line no-await-in-loop
      const selected = await this.promptList(groups, messages.getMessage('prompt.Select'));

      if (!selected) {
        // User cancelled (Escape/Ctrl+C)
        continueLoop = false;
        break;
      }

      // eslint-disable-next-line no-await-in-loop
      const action = await this.promptAction(selected);

      if (!action || action === 'back') {
        // Continue to list
        continue;
      }

      // eslint-disable-next-line no-await-in-loop
      await this.executeAction(action, selected, service, groups);

      // After install/remove, the list needs to be refreshed
      // For simplicity, we continue with the current state
      // A full refresh would require re-scanning
    }
  }

  /**
   * Execute the selected action on an artifact.
   */
  protected async executeAction(
    action: ArtifactAction,
    artifact: MergedArtifact,
    service: ArtifactService,
    groups: GroupedArtifacts,
  ): Promise<void> {
    switch (action) {
      case 'view':
        await this.displayArtifactDetails(artifact, service);
        break;

      case 'install':
        if (artifact.type === 'instruction') {
          this.log(messages.getMessage('info.CannotInstallInstruction'));
        } else {
          this.spinner.start(messages.getMessage('info.Installing', [artifact.name]));
          const installResult = await service.install(artifact.name, {
            type: artifact.type,
            source: artifact.source,
          });
          this.spinner.stop();

          if (installResult.success) {
            this.log(messages.getMessage('info.Installed', [artifact.name, installResult.installedPath]));
            // Update the artifact's installed status in the groups
            this.updateArtifactStatus(groups, artifact, true);
          } else {
            this.warn(messages.getMessage('warning.InstallFailed', [artifact.name, installResult.error ?? 'Unknown']));
          }
        }
        break;

      case 'remove':
        if (artifact.type === 'instruction') {
          this.log(messages.getMessage('info.CannotRemoveInstruction'));
        } else {
          this.spinner.start(messages.getMessage('info.Removing', [artifact.name]));
          const removeResult = await service.uninstall(artifact.name, { type: artifact.type });
          this.spinner.stop();

          if (removeResult.success) {
            this.log(messages.getMessage('info.Removed', [artifact.name]));
            // Update the artifact's installed status in the groups
            this.updateArtifactStatus(groups, artifact, false);
          } else {
            this.warn(messages.getMessage('warning.RemoveFailed', [artifact.name, removeResult.error ?? 'Unknown']));
          }
        }
        break;

      default:
        break;
    }
  }

  /**
   * Display detailed information about an artifact.
   * Fetches content from source repo to extract frontmatter description.
   */
  protected async displayArtifactDetails(artifact: MergedArtifact, service: ArtifactService): Promise<void> {
    this.log('');
    this.log(`Name: ${artifact.name}`);
    this.log(`Type: ${artifact.type}`);
    this.log(`Status: ${artifact.installed ? 'Installed' : 'Available'}`);

    // Try to fetch artifact content and extract frontmatter description
    let frontmatterDescription: string | undefined;

    if (artifact.source && artifact.type !== 'instruction') {
      this.spinner.start(messages.getMessage('info.FetchingDetails'));
      try {
        const content = await service.fetchArtifactContent(artifact.name, {
          source: artifact.source,
          type: artifact.type,
        });
        this.spinner.stop();

        if (content) {
          frontmatterDescription = FrontmatterParser.extractDescription(content);
        }
      } catch (error) {
        this.spinner.stop();
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.warn(messages.getMessage('warning.FailedToFetchDetails', [errorMsg]));
      }
    }

    // Show frontmatter description if available, otherwise fall back to manifest description
    const displayDescription = frontmatterDescription ?? artifact.description;
    if (displayDescription) {
      this.log(`Description: ${displayDescription}`);
    }

    if (artifact.source) {
      this.log(`Source: ${artifact.source}`);
    }
    this.log('');
  }

  /**
   * Update an artifact's installed status in the groups.
   */
  // eslint-disable-next-line class-methods-use-this
  protected updateArtifactStatus(groups: GroupedArtifacts, artifact: MergedArtifact, installed: boolean): void {
    const groupKey = `${artifact.type}s` as keyof GroupedArtifacts;
    const group = groups[groupKey];
    const found = group.find((a) => a.name === artifact.name);
    if (found) {
      found.installed = installed;
    }
  }

  /**
   * Prompt user to select an artifact from the list.
   * Extracted for test stubbing.
   */
  // eslint-disable-next-line class-methods-use-this
  protected async promptList(groups: GroupedArtifacts, message: string): Promise<MergedArtifact | null> {
    return promptArtifactList(groups, message);
  }

  /**
   * Prompt user to select an action for an artifact.
   * Extracted for test stubbing.
   */
  // eslint-disable-next-line class-methods-use-this
  protected async promptAction(artifact: MergedArtifact): Promise<ArtifactAction | null> {
    return promptArtifactAction(artifact);
  }

  private displayResults(groups: GroupedArtifacts): void {
    InteractiveTable.renderPlainText(groups, (msg) => this.log(msg));
  }
}
