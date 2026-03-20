/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { Separator } from '@inquirer/prompts';
import type { GroupedArtifacts, MergedArtifact } from '../services/localFileScanner.js';

/**
 * Checkbox characters for display in plain text output and select prompts.
 */
const CHECKBOX_CHECKED = '\u2611'; // Checked box
const CHECKBOX_UNCHECKED = '\u2610'; // Unchecked box

/**
 * Configuration for the interactive table display.
 */
export type TableConfig = {
  /** Whether to show the interactive scroll (TTY mode) */
  interactive?: boolean;
  /** Whether JSON mode is enabled (suppresses table output) */
  jsonEnabled?: boolean;
};

/**
 * Row representation for display.
 */
export type DisplayRow = {
  /** The formatted text to display */
  text: string;
  /** Whether this is a header row */
  isHeader: boolean;
};

/**
 * Utility for rendering grouped artifacts with checkboxes.
 * Falls back to plain text when interactive mode is not available.
 */
export class InteractiveTable {
  /**
   * Check if the current environment supports interactive display.
   *
   * @returns True if stdout is a TTY.
   */
  public static isInteractiveSupported(): boolean {
    return Boolean(process.stdout.isTTY);
  }

  /**
   * Format a single artifact row with checkbox.
   *
   * @param artifact - The artifact to format.
   * @returns Formatted string with checkbox and name.
   */
  public static formatRow(artifact: MergedArtifact): string {
    const checkbox = artifact.installed ? CHECKBOX_CHECKED : CHECKBOX_UNCHECKED;
    return `  ${checkbox} ${artifact.name}`;
  }

  /**
   * Format a section header.
   *
   * @param title - The section title.
   * @returns Formatted header string.
   */
  public static formatHeader(title: string): string {
    return title;
  }

  /**
   * Convert grouped artifacts to display rows.
   *
   * @param groups - Grouped artifacts object.
   * @returns Array of display rows.
   */
  public static toDisplayRows(groups: GroupedArtifacts): DisplayRow[] {
    const rows: DisplayRow[] = [];

    if (groups.agents.length > 0) {
      rows.push({ text: this.formatHeader('Agents'), isHeader: true });
      for (const artifact of groups.agents) {
        rows.push({ text: this.formatRow(artifact), isHeader: false });
      }
      rows.push({ text: '', isHeader: false }); // blank line
    }

    if (groups.skills.length > 0) {
      rows.push({ text: this.formatHeader('Skills'), isHeader: true });
      for (const artifact of groups.skills) {
        rows.push({ text: this.formatRow(artifact), isHeader: false });
      }
      rows.push({ text: '', isHeader: false }); // blank line
    }

    if (groups.prompts.length > 0) {
      rows.push({ text: this.formatHeader('Prompts'), isHeader: true });
      for (const artifact of groups.prompts) {
        rows.push({ text: this.formatRow(artifact), isHeader: false });
      }
      rows.push({ text: '', isHeader: false }); // blank line
    }

    if (groups.instructions.length > 0) {
      rows.push({ text: this.formatHeader('Instructions'), isHeader: true });
      for (const artifact of groups.instructions) {
        rows.push({ text: this.formatRow(artifact), isHeader: false });
      }
    }

    // Remove trailing blank line if present
    while (rows.length > 0 && rows[rows.length - 1].text === '') {
      rows.pop();
    }

    return rows;
  }

  /**
   * Render grouped artifacts as plain text.
   *
   * @param groups - Grouped artifacts object.
   * @param log - Function to output text (e.g., this.log from SfCommand).
   */
  public static renderPlainText(groups: GroupedArtifacts, log: (msg: string) => void): void {
    const rows = this.toDisplayRows(groups);

    for (const row of rows) {
      log(row.text);
    }

    // Show empty message if no artifacts
    if (rows.length === 0) {
      log('No artifacts found.');
    }
  }

  /**
   * Render grouped artifacts for a specific type only.
   *
   * @param artifacts - Array of artifacts to display.
   * @param title - Section title.
   * @param log - Function to output text.
   */
  public static renderSection(artifacts: MergedArtifact[], title: string, log: (msg: string) => void): void {
    if (artifacts.length === 0) {
      log(`No ${title.toLowerCase()} found.`);
      return;
    }

    log(this.formatHeader(title));
    for (const artifact of artifacts) {
      log(this.formatRow(artifact));
    }
  }

  /**
   * Get the total count of artifacts in all groups.
   *
   * @param groups - Grouped artifacts object.
   * @returns Total count.
   */
  public static getTotalCount(groups: GroupedArtifacts): number {
    return groups.agents.length + groups.skills.length + groups.prompts.length + groups.instructions.length;
  }

  /**
   * Get counts by installation status.
   *
   * @param groups - Grouped artifacts object.
   * @returns Object with installed and available counts.
   */
  public static getCounts(groups: GroupedArtifacts): { installed: number; available: number } {
    const allArtifacts = [...groups.agents, ...groups.skills, ...groups.prompts, ...groups.instructions];

    const installed = allArtifacts.filter((a) => a.installed).length;
    const available = allArtifacts.filter((a) => !a.installed).length;

    return { installed, available };
  }

  /**
   * Convert grouped artifacts to select prompt choices with Separator headers.
   *
   * @param groups - Grouped artifacts object.
   * @returns Array of choices for select prompt.
   */
  public static toSelectChoices(groups: GroupedArtifacts): Array<{ name: string; value: MergedArtifact } | Separator> {
    const choices: Array<{ name: string; value: MergedArtifact } | Separator> = [];
    const typeOrder: Array<keyof GroupedArtifacts> = ['agents', 'skills', 'prompts', 'instructions'];

    for (const groupKey of typeOrder) {
      const group = groups[groupKey];
      if (group.length === 0) continue;

      const typeLabel = groupKey.charAt(0).toUpperCase() + groupKey.slice(1);
      choices.push(new Separator(`--- ${typeLabel} ---`));

      for (const artifact of group) {
        const checkbox = artifact.installed ? CHECKBOX_CHECKED : CHECKBOX_UNCHECKED;
        const description = artifact.description ? ` - ${artifact.description}` : '';
        choices.push({
          name: `${checkbox} ${artifact.name}${description}`,
          value: artifact,
        });
      }
    }

    return choices;
  }

  /**
   * Convert artifacts to select prompt choices with status checkbox prefix.
   * For use with @inquirer/select where we need to show installation status.
   *
   * @param artifacts - Array of artifacts.
   * @param filter - Optional filter: 'installed' or 'available'.
   * @returns Array of select choices with status indicator.
   */
  public static toCheckboxChoices(
    artifacts: MergedArtifact[],
    filter?: 'installed' | 'available'
  ): Array<{ name: string; value: MergedArtifact }> {
    let filtered = artifacts;

    if (filter === 'installed') {
      filtered = artifacts.filter((a) => a.installed);
    } else if (filter === 'available') {
      filtered = artifacts.filter((a) => !a.installed);
    }

    return filtered.map((artifact) => {
      const checkbox = artifact.installed ? CHECKBOX_CHECKED : CHECKBOX_UNCHECKED;
      const description = artifact.description ? ` - ${artifact.description}` : '';
      return {
        name: `${checkbox} ${artifact.name}${description}`,
        value: artifact,
      };
    });
  }

  /**
   * Convert artifacts to pure checkbox prompt choices (no manual status indicator).
   * For use with @inquirer/checkbox which has built-in checked/unchecked display.
   *
   * @param artifacts - Array of artifacts.
   * @param filter - Optional filter: 'installed' or 'available'.
   * @returns Array of checkbox choices without status prefix.
   */
  public static toPureCheckboxChoices(
    artifacts: MergedArtifact[],
    filter?: 'installed' | 'available'
  ): Array<{ name: string; value: MergedArtifact }> {
    let filtered = artifacts;

    if (filter === 'installed') {
      filtered = artifacts.filter((a) => a.installed);
    } else if (filter === 'available') {
      filtered = artifacts.filter((a) => !a.installed);
    }

    return filtered.map((artifact) => {
      const description = artifact.description ? ` - ${artifact.description}` : '';
      return {
        name: `${artifact.name}${description}`,
        value: artifact,
      };
    });
  }
}
