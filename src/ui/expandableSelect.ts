/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import {
  createPrompt,
  useState,
  useKeypress,
  useMemo,
  useRef,
  usePagination,
  makeTheme,
  isEnterKey,
  isUpKey,
  isDownKey,
  type KeypressEvent,
} from '@inquirer/core';
import type { InquirerReadline } from '@inquirer/type';
import type { MergedArtifact } from '../services/localFileScanner.js';

/**
 * ANSI escape code for grey/dim text.
 */
const GREY = '\x1b[90m';
const RESET = '\x1b[0m';

/**
 * Square checkbox characters for consistent display.
 */
const CHECKBOX_CHECKED = '\u2611'; // Checked box (filled square)
const CHECKBOX_UNCHECKED = '\u2610'; // Unchecked box (empty square)

/**
 * Cursor icon for the selected item.
 */
const CURSOR = '\u25B6'; // Right-pointing triangle

/**
 * Expandable choice type for the prompt.
 */
export type ExpandableChoice = {
  name: string;
  value: MergedArtifact;
};

/**
 * Separator type for grouping choices.
 */
export type ExpandableSeparator = {
  type: 'separator';
  separator: string;
};

/**
 * Union type for all choice types.
 */
export type ExpandableItem = ExpandableChoice | ExpandableSeparator;

/**
 * Configuration for the expandable select prompt.
 */
export type ExpandableSelectConfig = {
  message: string;
  choices: ExpandableItem[];
  onFetchDescription: (artifact: MergedArtifact) => Promise<string | undefined>;
  pageSize?: number;
};

/**
 * Default theme for the expandable select prompt.
 */
const expandableSelectTheme = {
  icon: { cursor: CURSOR },
  style: {
    highlight: (text: string): string => `\x1b[36m${text}\x1b[0m`, // Cyan highlight
    help: (text: string): string => `${GREY}${text}${RESET}`,
  },
  helpMode: 'auto' as const,
};

/**
 * Check if an item is a separator.
 */
export function isSeparator(item: ExpandableItem): item is ExpandableSeparator {
  return 'type' in item && item.type === 'separator';
}

/**
 * Check if an item is selectable (not a separator).
 */
export function isSelectable(item: ExpandableItem): item is ExpandableChoice {
  return !isSeparator(item);
}

/**
 * Format artifact display name with installation status indicator.
 */
export function formatArtifactDisplay(artifact: MergedArtifact): string {
  const statusIcon = artifact.installed ? CHECKBOX_CHECKED : CHECKBOX_UNCHECKED;
  return `${statusIcon} ${artifact.name}`;
}

/**
 * Custom expandable select prompt using @inquirer/core.
 *
 * Features:
 * - Enter toggles inline description display for the selected item
 * - Arrow keys navigate between items (expanded descriptions remain visible)
 * - Escape exits the prompt
 */
export const expandableSelect = createPrompt<void, ExpandableSelectConfig>((config, done) => {
  const { pageSize = 15 } = config;
  const theme = makeTheme(expandableSelectTheme, {});
  const firstRender = useRef(true);

  // State management
  const [active, setActive] = useState(0);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);
  const [descriptions, setDescriptions] = useState<Map<number, string | undefined>>(new Map());

  // Normalize and memoize items
  const items = useMemo(() => config.choices, [config.choices]);

  // Initialize active to first selectable item
  const initialActive = useMemo(() => {
    const first = items.findIndex(isSelectable);
    return first >= 0 ? first : 0;
  }, [items]);

  // Set initial active on first render
  if (firstRender.current && active !== initialActive) {
    setActive(initialActive);
  }

  // Handle keypress events
  useKeypress(async (key: KeypressEvent, rl: InquirerReadline) => {
    if (key.name === 'escape') {
      // Exit the prompt
      done();
      return;
    }

    if (isEnterKey(key)) {
      const currentItem = items[active];
      if (isSelectable(currentItem)) {
        if (expandedIndex === active) {
          // Toggle off - hide description
          setExpandedIndex(null);
        } else {
          // Toggle on - show description
          setExpandedIndex(active);

          // Check if we need to fetch the description
          if (!descriptions.has(active)) {
            setLoadingIndex(active);
            try {
              const description = await config.onFetchDescription(currentItem.value);
              const newDescriptions = new Map(descriptions);
              newDescriptions.set(active, description);
              setDescriptions(newDescriptions);
            } finally {
              setLoadingIndex(null);
            }
          }
        }
      }
      return;
    }

    if (isUpKey(key) || isDownKey(key)) {
      rl.clearLine(0);

      const offset = isUpKey(key) ? -1 : 1;
      let next = active;
      do {
        next = (next + offset + items.length) % items.length;
      } while (!isSelectable(items[next]) && next !== active);

      // Only update if we found a valid selectable item
      if (isSelectable(items[next])) {
        setActive(next);
      }
    }
  });

  firstRender.current = false;

  // Build the rendered output
  const helpTip = theme.style.help('(Arrow keys to navigate, Enter to toggle description, Escape to exit)');

  // Render items with pagination
  const page = usePagination({
    items,
    active,
    renderItem({ item, index, isActive }) {
      if (isSeparator(item)) {
        return ` ${item.separator}`;
      }

      const artifact = item.value;
      const displayName = formatArtifactDisplay(artifact);
      const cursor = isActive ? theme.icon.cursor : ' ';
      const color = isActive ? theme.style.highlight : (x: string): string => x;

      let line = color(`${cursor} ${displayName}`);

      // Show inline description below this item if expanded
      if (index === expandedIndex) {
        if (loadingIndex === index) {
          line += `\n   ${GREY}Loading...${RESET}`;
        } else if (descriptions.has(index)) {
          const desc = descriptions.get(index);
          if (desc) {
            line += `\n   ${GREY}${desc}${RESET}`;
          } else {
            line += `\n   ${GREY}No description available${RESET}`;
          }
        }
      }

      return line;
    },
    pageSize,
    loop: true,
  });

  return `${config.message} ${helpTip}\n${page}`;
});
