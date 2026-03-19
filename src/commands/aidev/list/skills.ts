/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import { ArtifactService } from '../../../services/artifactService.js';
import { LocalFileScanner, type MergedArtifact } from '../../../services/localFileScanner.js';
import { AiDevConfig } from '../../../config/aiDevConfig.js';
import { InteractiveTable } from '../../../ui/interactiveTable.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('sf-aidev', 'aidev.list.skills');

export type ListSkillsResult = {
  skills: MergedArtifact[];
  counts: {
    installed: number;
    available: number;
    total: number;
  };
};

export default class ListSkills extends SfCommand<ListSkillsResult> {
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

  public async run(): Promise<ListSkillsResult> {
    const { flags } = await this.parse(ListSkills);

    const globalConfig = await AiDevConfig.create({ isGlobal: true });
    const localConfig = await AiDevConfig.create({ isGlobal: false });
    const projectPath = process.cwd();

    // Scan local skills
    const localSkills = await LocalFileScanner.scanSkills(projectPath);

    // Fetch available skills from sources
    const service = new ArtifactService(globalConfig, localConfig, projectPath);
    const availableArtifacts = await service.listAvailable({ source: flags.source, type: 'skill' });

    // Merge local with manifest artifacts
    const merged = LocalFileScanner.mergeArtifacts(localSkills, availableArtifacts);

    // Sort alphabetically
    merged.sort((a, b) => a.name.localeCompare(b.name));

    // Display results
    if (!this.jsonEnabled()) {
      InteractiveTable.renderSection(merged, 'Skills', (msg) => this.log(msg));
    }

    const installed = merged.filter((a) => a.installed).length;
    const available = merged.filter((a) => !a.installed).length;

    return {
      skills: merged,
      counts: {
        installed,
        available,
        total: merged.length,
      },
    };
  }
}
