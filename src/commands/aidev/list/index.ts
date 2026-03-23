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
import { isInteractive, toExpandableChoices } from '../../../ui/interactivePrompts.js';
import { expandableSelect } from '../../../ui/expandableSelect.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('sf-aidev', 'aidev.list');

export type ListResult = {
  agents: MergedArtifact[];
  skills: MergedArtifact[];
  prompts: MergedArtifact[];
  commands: MergedArtifact[];
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

    // Get installed artifacts for source enrichment
    const installedArtifacts = localConfig.getInstalledArtifacts();

    // Merge local with manifest artifacts (with source filtering)
    const merged = LocalFileScanner.mergeArtifacts(
      localArtifacts,
      availableArtifacts,
      installedArtifacts,
      flags.source
    );

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
      commands: groups.commands,
      instructions: groups.instructions,
      counts: {
        installed: counts.installed,
        available: counts.available,
        total: InteractiveTable.getTotalCount(groups),
      },
    };
  }

  /**
   * Run interactive list with expandable descriptions.
   * Users can press Enter to toggle inline description display.
   */
  protected async runInteractive(groups: GroupedArtifacts, service: ArtifactService): Promise<void> {
    const choices = toExpandableChoices(groups);

    if (choices.length === 0) {
      this.log(messages.getMessage('info.NoArtifacts'));
      return;
    }

    await this.runExpandableSelect(choices, service);
  }

  /**
   * Run the expandable select prompt.
   * Extracted for test stubbing.
   */
  // eslint-disable-next-line class-methods-use-this
  protected async runExpandableSelect(
    choices: ReturnType<typeof toExpandableChoices>,
    service: ArtifactService
  ): Promise<void> {
    await expandableSelect({
      message: messages.getMessage('prompt.Select'),
      choices,
      onFetchDescription: async (artifact: MergedArtifact): Promise<string | undefined> => {
        // Instructions don't have source descriptions
        if (artifact.type === 'instruction' || !artifact.source) {
          return artifact.description;
        }

        // Fetch content and extract frontmatter description
        try {
          const content = await service.fetchArtifactContent(artifact.name, {
            source: artifact.source,
            type: artifact.type,
          });

          if (content) {
            const frontmatterDesc = FrontmatterParser.extractDescription(content);
            return frontmatterDesc ?? artifact.description;
          }
        } catch {
          // Fall back to manifest description on error
        }

        return artifact.description;
      },
      pageSize: 15,
    });
  }

  private displayResults(groups: GroupedArtifacts): void {
    InteractiveTable.renderPlainText(groups, (msg) => this.log(msg));
  }
}
