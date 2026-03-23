/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { Flags } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import { LocalFileScanner, type MergedArtifact, type ScannedArtifact } from '../../../services/localFileScanner.js';
import { BaseTypedListCommand } from './baseTypedListCommand.js';

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

// eslint-disable-next-line sf-plugin/only-extend-SfCommand
export default class ListSkills extends BaseTypedListCommand<ListSkillsResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly enableJsonFlag = true;

  // eslint-disable-next-line sf-plugin/spread-base-flags
  public static readonly flags = {
    source: Flags.string({
      char: 's',
      summary: messages.getMessage('flags.source.summary'),
    }),
  };

  public async run(): Promise<ListSkillsResult> {
    const { flags } = await this.parse(ListSkills);
    return this.runList(flags.source);
  }

  // eslint-disable-next-line class-methods-use-this
  protected getArtifactType(): 'skill' {
    return 'skill';
  }

  // eslint-disable-next-line class-methods-use-this
  protected getSectionTitle(): string {
    return 'Skills';
  }

  // eslint-disable-next-line class-methods-use-this
  protected async scanLocal(projectPath: string): Promise<ScannedArtifact[]> {
    return LocalFileScanner.scanSkills(projectPath);
  }

  // eslint-disable-next-line class-methods-use-this
  protected buildResult(merged: MergedArtifact[]): ListSkillsResult {
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

  // eslint-disable-next-line class-methods-use-this
  protected getMessages(): Messages<string> {
    return messages;
  }
}
