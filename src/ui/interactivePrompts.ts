/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { select, checkbox, Separator } from '@inquirer/prompts';
import type { GroupedArtifacts, MergedArtifact } from '../services/localFileScanner.js';
import type { ArtifactType } from '../types/manifest.js';

/**
 * Square checkbox characters for consistent display.
 */
const CHECKBOX_CHECKED = '\u2611'; // Checked box (filled square)
const CHECKBOX_UNCHECKED = '\u2610'; // Unchecked box (empty square)

/**
 * Keyboard help text for different prompt types.
 */
const SELECT_HELP = '(↑↓ navigate, Enter select, Esc exit)';
const CHECKBOX_HELP = '(↑↓ navigate, Space toggle, Enter confirm, Esc cancel)';
const ACTION_HELP = '(↑↓ navigate, Enter select, Esc back)';

/**
 * Custom theme for @inquirer/checkbox prompt with square checkboxes.
 */
export const CHECKBOX_THEME = {
  icon: {
    checked: CHECKBOX_CHECKED,
    unchecked: CHECKBOX_UNCHECKED,
    cursor: '\u25B6', // Right-pointing triangle as cursor
  },
} as const;

/**
 * Action types for the artifact action menu.
 */
export type ArtifactAction = 'view' | 'install' | 'remove' | 'back';

/**
 * Result of the action prompt.
 */
export type ActionResult = {
  action: ArtifactAction;
  artifact: MergedArtifact;
};

/**
 * Check if stdin/stdout supports interactive prompts.
 *
 * @returns True if the environment supports interactive prompts.
 */
export function isInteractive(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

/**
 * Check if an error is an ExitPromptError (user pressed Escape or Ctrl+C).
 *
 * @param error - The error to check.
 * @returns True if the error indicates user cancellation.
 */
function isExitPromptError(error: unknown): boolean {
  if (error instanceof Error) {
    // @inquirer/prompts throws ExitPromptError when user presses Escape or Ctrl+C
    return error.name === 'ExitPromptError';
  }
  return false;
}

/**
 * Format artifact display name with installation status indicator.
 * Used for select prompts where we need to show status visually.
 *
 * @param artifact - The artifact to format.
 * @returns Formatted display string with checkbox icon.
 */
function formatArtifactDisplay(artifact: MergedArtifact): string {
  const statusIcon = artifact.installed ? CHECKBOX_CHECKED : CHECKBOX_UNCHECKED;
  const description = artifact.description ? ` - ${artifact.description}` : '';
  return `${statusIcon} ${artifact.name}${description}`;
}

/**
 * Format artifact name without status indicator.
 * Used for checkbox prompts where the built-in checkbox shows status.
 *
 * @param artifact - The artifact to format.
 * @returns Formatted display string without checkbox icon.
 */
function formatArtifactName(artifact: MergedArtifact): string {
  const description = artifact.description ? ` - ${artifact.description}` : '';
  return `${artifact.name}${description}`;
}

/**
 * Map of artifact types to display labels.
 */
const TYPE_LABELS: Record<ArtifactType | 'instruction', string> = {
  agent: 'Agents',
  skill: 'Skills',
  prompt: 'Prompts',
  instruction: 'Instructions',
};

/**
 * Convert grouped artifacts to select prompt choices.
 *
 * @param groups - Grouped artifacts object.
 * @returns Array of choices for select prompt.
 */
export function toSelectChoices(groups: GroupedArtifacts): Array<{ name: string; value: MergedArtifact } | Separator> {
  const choices: Array<{ name: string; value: MergedArtifact } | Separator> = [];
  const typeOrder: Array<keyof GroupedArtifacts> = ['agents', 'skills', 'prompts', 'instructions'];

  for (const groupKey of typeOrder) {
    const group = groups[groupKey];
    if (group.length === 0) continue;

    // Derive type label from group key (agents -> Agents, etc.)
    const typeLabel = groupKey.charAt(0).toUpperCase() + groupKey.slice(1);
    choices.push(new Separator(`--- ${typeLabel} ---`));

    for (const artifact of group) {
      choices.push({
        name: formatArtifactDisplay(artifact),
        value: artifact,
      });
    }
  }

  return choices;
}

/**
 * Convert artifacts to checkbox prompt choices, optionally filtered.
 * Does NOT include manual checkbox icons - relies on @inquirer/checkbox's built-in display.
 *
 * @param artifacts - Array of artifacts.
 * @param filter - Optional filter: 'installed' or 'available'.
 * @returns Array of checkbox choices without status prefix.
 */
export function toCheckboxChoices(
  artifacts: MergedArtifact[],
  filter?: 'installed' | 'available',
): Array<{ name: string; value: MergedArtifact }> {
  let filtered = artifacts;

  if (filter === 'installed') {
    filtered = artifacts.filter((a) => a.installed);
  } else if (filter === 'available') {
    filtered = artifacts.filter((a) => !a.installed);
  }

  return filtered.map((artifact) => ({
    name: formatArtifactName(artifact),
    value: artifact,
  }));
}

/**
 * Convert grouped artifacts to checkbox choices, grouped by type.
 * Does NOT include manual checkbox icons - relies on @inquirer/checkbox's built-in display.
 *
 * @param groups - Grouped artifacts object.
 * @param filter - Optional filter: 'installed' or 'available'.
 * @returns Array of checkbox choices with separators.
 */
export function toGroupedCheckboxChoices(
  groups: GroupedArtifacts,
  filter?: 'installed' | 'available',
): Array<{ name: string; value: MergedArtifact } | Separator> {
  const choices: Array<{ name: string; value: MergedArtifact } | Separator> = [];
  const typeOrder: Array<keyof GroupedArtifacts> = ['agents', 'skills', 'prompts'];

  for (const groupKey of typeOrder) {
    let group = groups[groupKey];

    if (filter === 'installed') {
      group = group.filter((a) => a.installed);
    } else if (filter === 'available') {
      group = group.filter((a) => !a.installed);
    }

    if (group.length === 0) continue;

    const typeLabel = groupKey.charAt(0).toUpperCase() + groupKey.slice(1);
    choices.push(new Separator(`--- ${typeLabel} ---`));

    for (const artifact of group) {
      choices.push({
        name: formatArtifactName(artifact),
        value: artifact,
      });
    }
  }

  return choices;
}

/**
 * Prompt user to select an artifact from grouped list.
 * Returns null if user cancels (Escape/Ctrl+C).
 *
 * @param groups - Grouped artifacts object.
 * @param message - Prompt message to display.
 * @returns Selected artifact or null if cancelled.
 */
export async function promptArtifactList(groups: GroupedArtifacts, message: string): Promise<MergedArtifact | null> {
  const choices = toSelectChoices(groups);

  if (choices.length === 0) {
    return null;
  }

  try {
    return await select<MergedArtifact>({
      message: `${message} ${SELECT_HELP}`,
      choices,
      pageSize: 15,
    });
  } catch (error) {
    if (isExitPromptError(error)) {
      return null;
    }
    throw error;
  }
}

/**
 * Prompt user to select an action for an artifact.
 * Returns null if user cancels (Escape/Ctrl+C).
 *
 * @param artifact - The artifact to act on.
 * @returns Selected action or null if cancelled.
 */
export async function promptArtifactAction(artifact: MergedArtifact): Promise<ArtifactAction | null> {
  const choices: Array<{ name: string; value: ArtifactAction }> = [{ name: 'View details', value: 'view' }];

  if (artifact.installed) {
    choices.push({ name: 'Remove', value: 'remove' });
  } else {
    choices.push({ name: 'Install', value: 'install' });
  }

  choices.push({ name: 'Back to list', value: 'back' });

  try {
    return await select<ArtifactAction>({
      message: `Action for "${artifact.name}" (${TYPE_LABELS[artifact.type]}): ${ACTION_HELP}`,
      choices,
    });
  } catch (error) {
    if (isExitPromptError(error)) {
      return null;
    }
    throw error;
  }
}

/**
 * Prompt user to select multiple artifacts via checkbox.
 * Returns empty array if user cancels (Escape/Ctrl+C).
 *
 * @param artifacts - Array of artifacts to select from.
 * @param message - Prompt message to display.
 * @param filter - Optional filter: 'installed' or 'available'.
 * @returns Array of selected artifacts.
 */
export async function promptArtifactCheckbox(
  artifacts: MergedArtifact[],
  message: string,
  filter?: 'installed' | 'available',
): Promise<MergedArtifact[]> {
  const choices = toCheckboxChoices(artifacts, filter);

  if (choices.length === 0) {
    return [];
  }

  try {
    return await checkbox<MergedArtifact>({
      message: `${message} ${CHECKBOX_HELP}`,
      choices,
      pageSize: 15,
      theme: CHECKBOX_THEME,
    });
  } catch (error) {
    if (isExitPromptError(error)) {
      return [];
    }
    throw error;
  }
}

/**
 * Prompt user to select multiple artifacts from grouped list via checkbox.
 * Returns empty array if user cancels (Escape/Ctrl+C).
 *
 * @param groups - Grouped artifacts object.
 * @param message - Prompt message to display.
 * @param filter - Optional filter: 'installed' or 'available'.
 * @returns Array of selected artifacts.
 */
export async function promptGroupedCheckbox(
  groups: GroupedArtifacts,
  message: string,
  filter?: 'installed' | 'available',
): Promise<MergedArtifact[]> {
  const choices = toGroupedCheckboxChoices(groups, filter);

  if (choices.length === 0) {
    return [];
  }

  try {
    return await checkbox<MergedArtifact>({
      message: `${message} ${CHECKBOX_HELP}`,
      choices,
      pageSize: 15,
      theme: CHECKBOX_THEME,
    });
  } catch (error) {
    if (isExitPromptError(error)) {
      return [];
    }
    throw error;
  }
}
