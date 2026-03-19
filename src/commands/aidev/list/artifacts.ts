/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import { ArtifactService, type AvailableArtifact } from '../../../services/artifactService.js';
import { AiDevConfig } from '../../../config/aiDevConfig.js';
import type { InstalledArtifact } from '../../../types/config.js';
import type { ArtifactType } from '../../../types/manifest.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('sf-aidev', 'aidev.list.artifacts');

export type ListArtifactsResult = {
  installed: InstalledArtifact[];
  available: AvailableArtifact[];
};

export default class ListArtifacts extends SfCommand<ListArtifactsResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly enableJsonFlag = true;

  public static readonly flags = {
    type: Flags.string({
      char: 't',
      summary: messages.getMessage('flags.type.summary'),
      options: ['skill', 'agent', 'prompt'],
    }),
    installed: Flags.boolean({
      char: 'i',
      summary: messages.getMessage('flags.installed.summary'),
      exclusive: ['available'],
    }),
    available: Flags.boolean({
      char: 'a',
      summary: messages.getMessage('flags.available.summary'),
      exclusive: ['installed'],
    }),
    source: Flags.string({
      char: 's',
      summary: messages.getMessage('flags.source.summary'),
    }),
  };

  public async run(): Promise<ListArtifactsResult> {
    const { flags } = await this.parse(ListArtifacts);

    const config = await AiDevConfig.create({ isGlobal: false });
    const service = new ArtifactService(config, process.cwd());

    const showInstalled = !flags.available;
    const showAvailable = !flags.installed;

    let installed: InstalledArtifact[] = [];
    let available: AvailableArtifact[] = [];

    const artifactType = flags.type as ArtifactType | undefined;

    if (showInstalled) {
      installed = service.listInstalled({ type: artifactType });
    }

    if (showAvailable) {
      available = await service.listAvailable({ type: artifactType, source: flags.source });
    }

    this.displayResults(installed, available, showInstalled, showAvailable);

    return { installed, available };
  }

  private displayResults(
    installed: InstalledArtifact[],
    available: AvailableArtifact[],
    showInstalled: boolean,
    showAvailable: boolean
  ): void {
    if (showInstalled) {
      this.log(messages.getMessage('info.InstalledHeader'));
      if (installed.length === 0) {
        this.log(messages.getMessage('info.NoInstalled'));
      } else {
        for (const artifact of installed) {
          this.log(`  ${artifact.type}: ${artifact.name} (from ${artifact.source})`);
        }
      }
      this.log('');
    }

    if (showAvailable) {
      this.log(messages.getMessage('info.AvailableHeader'));
      if (available.length === 0) {
        this.log(messages.getMessage('info.NoAvailable'));
      } else {
        for (const artifact of available) {
          const status = artifact.installed ? '[installed]' : '';
          this.log(`  ${artifact.type}: ${artifact.name} ${status}`.trimEnd());
          if (artifact.description) {
            this.log(`    ${artifact.description}`);
          }
        }
      }
    }
  }
}
