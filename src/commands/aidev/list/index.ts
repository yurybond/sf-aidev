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

    // Fetch available artifacts from sources
    const service = new ArtifactService(globalConfig, localConfig, projectPath);
    const availableArtifacts = await service.listAvailable({ source: flags.source });

    // Merge local with manifest artifacts
    const merged = LocalFileScanner.mergeArtifacts(localArtifacts, availableArtifacts);

    // Group by type
    const groups = LocalFileScanner.groupByType(merged, instructions);

    // Display results
    if (!this.jsonEnabled()) {
      this.displayResults(groups);
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

  private displayResults(groups: GroupedArtifacts): void {
    InteractiveTable.renderPlainText(groups, (msg) => this.log(msg));
  }
}
