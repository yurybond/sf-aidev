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
  isBackspaceKey,
  type KeypressEvent,
} from '@inquirer/core';
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

  // Normalize and memoize items
  const items = useMemo(() => config.choices, [config.choices]);

  // Calculate initial active index (first selectable item)
  const initialActive = useMemo(() => {
    const first = items.findIndex(isSelectable);
    return first >= 0 ? first : 0;
  }, [items]);

  // State management - initialize active to first selectable item
  const [active, setActive] = useState(initialActive);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);
  const [descriptions, setDescriptions] = useState<Map<number, string | undefined>>(new Map());
  const [filterTerm, setFilterTerm] = useState('');

  // Filter items based on search term
  const filteredItems = useMemo(() => {
    if (!filterTerm) {
      return items;
    }
    const lowerFilter = filterTerm.toLowerCase();
    return items.filter((item) => {
      if (isSeparator(item)) {
        return false; // Hide separators when filtering
      }
      return item.value.name.toLowerCase().includes(lowerFilter);
    });
  }, [items, filterTerm]);

  // Determine which items array to use
  const itemsToUse = filterTerm ? filteredItems : items;

  // Reset active index to first item when filter changes
  if (filterTerm && active >= itemsToUse.length) {
    const first = itemsToUse.findIndex(isSelectable);
    if (first >= 0) {
      setActive(first);
    }
  }

  // Handle keypress events
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useKeypress((key: KeypressEvent, rl: any) => {
    // Handle backspace for filter editing
    if (isBackspaceKey(key)) {
      if (filterTerm.length > 0) {
        setFilterTerm(filterTerm.slice(0, -1));
        setExpandedIndex(null); // Collapse any expanded items
      }
      return;
    }

    // Handle escape - clear filter first, then exit
    if (key.name === 'escape') {
      if (filterTerm) {
        // Clear filter if active
        setFilterTerm('');
        setExpandedIndex(null);
      } else {
        // Exit the prompt
        done();
      }
      return;
    }

    if (isEnterKey(key)) {
      const currentItem = itemsToUse[active];
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
            config
              .onFetchDescription(currentItem.value)
              .then((description) => {
                const newDescriptions = new Map(descriptions);
                newDescriptions.set(active, description);
                setDescriptions(newDescriptions);
              })
              .catch(() => {
                // Silently handle errors
              })
              .finally(() => {
                setLoadingIndex(null);
              });
          }
        }
      }
      return;
    }

    if (isUpKey(key) || isDownKey(key)) {
      // Clear the current line to prepare for re-render
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      rl.clearLine(0);

      const offset = isUpKey(key) ? -1 : 1;
      let next = active;
      do {
        next = (next + offset + itemsToUse.length) % itemsToUse.length;
      } while (!isSelectable(itemsToUse[next]) && next !== active);

      // Only update if we found a valid selectable item AND it's different
      if (isSelectable(itemsToUse[next]) && next !== active) {
        setActive(next);
      }
      return;
    }

    // Capture printable character input for filtering
    if (key.name && key.name.length === 1 && !key.ctrl) {
      setFilterTerm(filterTerm + key.name);
      setExpandedIndex(null); // Collapse any expanded items
    }
  });

  firstRender.current = false;

  // Build the rendered output with keys in white and text in grey
  const helpTip = filterTerm
    ? `(${RESET}↑↓${GREY} navigate • ${RESET}⏎${GREY} toggle • ${RESET}Esc${GREY} clear filter${RESET})`
    : `(${RESET}↑↓${GREY} navigate • ${RESET}⏎${GREY} toggle • ${RESET}Esc${GREY} exit${RESET})`;

  // Render items with pagination
  const page = usePagination({
    items: itemsToUse,
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

  // Build output with filter display
  let output = config.message;

  // Show filter term if active
  if (filterTerm) {
    output += `\n${GREY}Filter: ${RESET}${filterTerm}`;
  }

  // Show message if no items match
  if (filterTerm && itemsToUse.length === 0) {
    output += `\n${GREY}No items match your filter${RESET}`;
  } else {
    output += `\n${page}`;
  }

  output += `\n${helpTip}`;

  return output;
});
