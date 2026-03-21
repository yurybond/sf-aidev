/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import * as readline from 'node:readline';
import { select, checkbox, confirm, Separator } from '@inquirer/prompts';
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
 * Cancellable promise type returned by @inquirer/prompts.
 */
type CancellablePromise<T> = Promise<T> & { cancel: () => void };

/**
 * Wrap a cancellable prompt with Escape key handling.
 *
 * @inquirer/prompts doesn't handle Escape key natively - only Ctrl+C.
 * This wrapper listens for Escape and calls the prompt's cancel() method.
 */
async function withEscapeHandling<T>(prompt: CancellablePromise<T>): Promise<T> {
  // Set up raw mode to capture Escape key
  if (process.stdin.isTTY) {
    const onKeypress = (_chunk: string, key: readline.Key): void => {
      if (key && key.name === 'escape') {
        prompt.cancel();
      }
    };

    // Enable keypress events
    if (!process.stdin.listenerCount('keypress')) {
      readline.emitKeypressEvents(process.stdin);
    }
    process.stdin.on('keypress', onKeypress);

    try {
      return await prompt;
    } finally {
      process.stdin.removeListener('keypress', onKeypress);
    }
  }

  return prompt;
}

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
 * Check if an error indicates user cancellation.
 * - ExitPromptError: thrown when user presses Ctrl+C (SIGINT)
 * - CancelPromptError: thrown when prompt.cancel() is called (e.g., on Escape)
 *
 * @param error - The error to check.
 * @returns True if the error indicates user cancellation.
 */
function isCancelledError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.name === 'ExitPromptError' || error.name === 'CancelPromptError';
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
    // Cast needed because @inquirer/prompts types don't expose CancelablePromise
    return await withEscapeHandling(
      select<MergedArtifact>({
        message: `${message} ${SELECT_HELP}`,
        choices,
        pageSize: 15,
      }) as CancellablePromise<MergedArtifact>,
    );
  } catch (error) {
    if (isCancelledError(error)) {
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
    // Cast needed because @inquirer/prompts types don't expose CancelablePromise
    return await withEscapeHandling(
      select<ArtifactAction>({
        message: `Action for "${artifact.name}" (${TYPE_LABELS[artifact.type]}): ${ACTION_HELP}`,
        choices,
      }) as CancellablePromise<ArtifactAction>,
    );
  } catch (error) {
    if (isCancelledError(error)) {
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
    // Cast needed because @inquirer/prompts types don't expose CancelablePromise
    return await withEscapeHandling(
      checkbox<MergedArtifact>({
        message: `${message} ${CHECKBOX_HELP}`,
        choices,
        pageSize: 15,
        theme: CHECKBOX_THEME,
      }) as CancellablePromise<MergedArtifact[]>,
    );
  } catch (error) {
    if (isCancelledError(error)) {
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
    // Cast needed because @inquirer/prompts types don't expose CancelablePromise
    return await withEscapeHandling(
      checkbox<MergedArtifact>({
        message: `${message} ${CHECKBOX_HELP}`,
        choices,
        pageSize: 15,
        theme: CHECKBOX_THEME,
      }) as CancellablePromise<MergedArtifact[]>,
    );
  } catch (error) {
    if (isCancelledError(error)) {
      return [];
    }
    throw error;
  }
}

/**
 * Prompt user for confirmation with Escape key support.
 * Returns false if user cancels (Escape/Ctrl+C).
 *
 * @param message - The confirmation message to display.
 * @param defaultValue - Default value (default: false).
 * @returns True if confirmed, false otherwise.
 */
export async function promptConfirm(message: string, defaultValue = false): Promise<boolean> {
  try {
    // Cast needed because @inquirer/prompts types don't expose CancelablePromise
    return await withEscapeHandling(
      confirm({
        message,
        default: defaultValue,
      }) as CancellablePromise<boolean>,
    );
  } catch (error) {
    if (isCancelledError(error)) {
      return false;
    }
    throw error;
  }
}

/**
 * Generic checkbox prompt with Escape key support.
 * Returns empty array if user cancels (Escape/Ctrl+C).
 *
 * @param config - Checkbox configuration (message, choices, pageSize, theme).
 * @returns Array of selected values.
 */
export async function promptCheckboxGeneric<T>(config: {
  message: string;
  choices: Array<{ name: string; value: T } | Separator>;
  pageSize?: number;
  theme?: typeof CHECKBOX_THEME;
}): Promise<T[]> {
  if (config.choices.length === 0) {
    return [];
  }

  try {
    // Cast needed because @inquirer/prompts types don't expose CancelablePromise
    return await withEscapeHandling(
      checkbox<T>({
        message: config.message,
        choices: config.choices,
        pageSize: config.pageSize ?? 15,
        theme: config.theme ?? CHECKBOX_THEME,
      }) as CancellablePromise<T[]>,
    );
  } catch (error) {
    if (isCancelledError(error)) {
      return [];
    }
    throw error;
  }
}
