/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { Messages } from '@salesforce/core';
import { LocalFileScanner, type MergedArtifact, type ScannedInstruction } from '../../../services/localFileScanner.js';
import { BaseTypedListCommand } from './baseTypedListCommand.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('sf-aidev', 'aidev.list.instructions');

export type ListInstructionsResult = {
  instructions: MergedArtifact[];
  counts: {
    total: number;
  };
};

// eslint-disable-next-line sf-plugin/only-extend-SfCommand
export default class ListInstructions extends BaseTypedListCommand<ListInstructionsResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly enableJsonFlag = true;

  // No flags needed - instructions are local-only

  public async run(): Promise<ListInstructionsResult> {
    await this.parse(ListInstructions);
    return this.runList();
  }

  // eslint-disable-next-line class-methods-use-this
  protected getArtifactType(): 'instruction' {
    return 'instruction';
  }

  // eslint-disable-next-line class-methods-use-this
  protected getSectionTitle(): string {
    return 'Instructions';
  }

  // eslint-disable-next-line class-methods-use-this
  protected async scanLocal(projectPath: string): Promise<ScannedInstruction[]> {
    return LocalFileScanner.scanInstructions(projectPath);
  }

  // eslint-disable-next-line class-methods-use-this
  protected buildResult(merged: MergedArtifact[]): ListInstructionsResult {
    return {
      instructions: merged,
      counts: {
        total: merged.length,
      },
    };
  }

  // eslint-disable-next-line class-methods-use-this
  protected getMessages(): Messages<string> {
    return messages;
  }
}
