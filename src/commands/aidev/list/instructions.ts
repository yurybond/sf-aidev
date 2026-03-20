/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { select } from '@inquirer/prompts';
import { SfCommand } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import { LocalFileScanner, type MergedArtifact } from '../../../services/localFileScanner.js';
import { InteractiveTable } from '../../../ui/interactiveTable.js';
import { isInteractive } from '../../../ui/interactivePrompts.js';

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
      if (isInteractive() && merged.length > 0) {
        await this.runInteractive(merged);
      } else {
        InteractiveTable.renderSection(merged, 'Instructions', (msg) => this.log(msg));
      }
    }

    return {
      instructions: merged,
      counts: {
        total: merged.length,
      },
    };
  }

  /**
   * Run interactive list - view only for instructions.
   */
  protected async runInteractive(instructions: MergedArtifact[]): Promise<void> {
    let continueLoop = true;

    while (continueLoop) {
      // eslint-disable-next-line no-await-in-loop
      const selected = await this.promptSelect(instructions, messages.getMessage('prompt.Select'));

      if (!selected) {
        continueLoop = false;
        break;
      }

      this.displayInstructionDetails(selected);
    }
  }

  /**
   * Display detailed information about an instruction.
   */
  protected displayInstructionDetails(instruction: MergedArtifact): void {
    this.log('');
    this.log(`File: ${instruction.name}`);
    this.log('Type: Instruction');
    this.log('Status: Local file');
    this.log('');
    this.log(messages.getMessage('info.InstructionNote'));
    this.log('');
  }

  /**
   * Prompt user to select an instruction from the list.
   */
  // eslint-disable-next-line class-methods-use-this
  protected async promptSelect(instructions: MergedArtifact[], message: string): Promise<MergedArtifact | null> {
    const choices = InteractiveTable.toCheckboxChoices(instructions);

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
}
