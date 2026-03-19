/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { SfCommand } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import { LocalFileScanner, type MergedArtifact } from '../../../services/localFileScanner.js';
import { InteractiveTable } from '../../../ui/interactiveTable.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('sf-aidev', 'aidev.list.instructions');

export type ListInstructionsResult = {
  instructions: MergedArtifact[];
  counts: {
    total: number;
  };
};

export default class ListInstructions extends SfCommand<ListInstructionsResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly enableJsonFlag = true;

  // No flags needed - instructions are local-only

  public async run(): Promise<ListInstructionsResult> {
    await this.parse(ListInstructions);

    const projectPath = process.cwd();

    // Scan local instructions only (no manifest source)
    const instructions = await LocalFileScanner.scanInstructions(projectPath);

    // Convert to MergedArtifact format
    const merged: MergedArtifact[] = instructions.map((instr) => ({
      name: instr.name,
      type: 'instruction' as const,
      installed: true,
    }));

    // Sort alphabetically
    merged.sort((a, b) => a.name.localeCompare(b.name));

    // Display results
    if (!this.jsonEnabled()) {
      InteractiveTable.renderSection(merged, 'Instructions', (msg) => this.log(msg));
    }

    return {
      instructions: merged,
      counts: {
        total: merged.length,
      },
    };
  }
}
