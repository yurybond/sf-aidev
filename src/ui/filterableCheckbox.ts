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
  isSpaceKey,
  type KeypressEvent,
} from '@inquirer/core';

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
 * Filterable checkbox choice type.
 */
export type FilterableCheckboxChoice<Value> = {
  name: string;
  value: Value;
};

/**
 * Separator type for grouping choices.
 */
export type FilterableCheckboxSeparator = {
  type: 'separator';
  separator: string;
};

/**
 * Union type for all choice types.
 */
export type FilterableCheckboxItem<Value> = FilterableCheckboxChoice<Value> | FilterableCheckboxSeparator;

/**
 * Configuration for the filterable checkbox prompt.
 */
export type FilterableCheckboxConfig<Value> = {
  message: string;
  choices: Array<FilterableCheckboxItem<Value>>;
  pageSize?: number;
  required?: boolean;
  theme?: {
    icon?: {
      checked?: string;
      unchecked?: string;
      cursor?: string;
    };
    style?: {
      highlight?: (text: string) => string;
    };
  };
};

/**
 * Default theme for the filterable checkbox prompt.
 */
const filterableCheckboxTheme = {
  icon: {
    checked: CHECKBOX_CHECKED,
    unchecked: CHECKBOX_UNCHECKED,
    cursor: CURSOR,
  },
  style: {
    highlight: (text: string): string => `\x1b[36m${text}\x1b[0m`, // Cyan highlight
  },
};

/**
 * Check if an item is a separator.
 */
export function isSeparator<Value>(item: FilterableCheckboxItem<Value>): item is FilterableCheckboxSeparator {
  return 'type' in item && item.type === 'separator';
}

/**
 * Check if an item is selectable (not a separator).
 */
export function isSelectable<Value>(item: FilterableCheckboxItem<Value>): item is FilterableCheckboxChoice<Value> {
  return !isSeparator(item);
}

/**
 * Custom filterable checkbox prompt using @inquirer/core.
 *
 * Features:
 * - Type to filter items by name (case-insensitive)
 * - Backspace to edit filter
 * - Space to toggle current item
 * - + to select all (filtered items when filtering active)
 * - - to invert selection (filtered items when filtering active)
 * - Arrow keys to navigate
 * - Enter to confirm selection
 * - First Escape clears filter (if active), second Escape exits
 */
export const filterableCheckbox = createPrompt(
  <Value>(config: FilterableCheckboxConfig<Value>, done: (value: Value[]) => void) => {
    const { pageSize = 15, required = false } = config;
    const theme = makeTheme(filterableCheckboxTheme, config.theme);
    const firstRender = useRef(true);

    // Normalize and memoize items
    const items = useMemo(() => config.choices, [config.choices]);

    // Calculate initial active index (first selectable item)
    const initialActive = useMemo(() => {
      const first = items.findIndex(isSelectable);
      return first >= 0 ? first : 0;
    }, [items]);

    // State management
    const [active, setActive] = useState(initialActive);
    const [filterTerm, setFilterTerm] = useState('');
    const [checked, setChecked] = useState(new Set<number>());

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
        return item.name.toLowerCase().includes(lowerFilter);
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

    // Helper to toggle item selection
    const toggleItem = (item: FilterableCheckboxChoice<Value>): void => {
      const originalIndex = items.indexOf(item);
      if (originalIndex !== -1) {
        const newChecked = new Set(checked);
        if (newChecked.has(originalIndex)) {
          newChecked.delete(originalIndex);
        } else {
          newChecked.add(originalIndex);
        }
        setChecked(newChecked);
      }
    };

    // Helper to select all items
    const selectAll = (): void => {
      const newChecked = new Set(checked);
      for (const item of itemsToUse) {
        if (isSelectable(item)) {
          const originalIndex = items.indexOf(item);
          if (originalIndex !== -1) {
            newChecked.add(originalIndex);
          }
        }
      }
      setChecked(newChecked);
    };

    // Helper to invert selection
    const invertSelection = (): void => {
      const newChecked = new Set(checked);
      for (const item of itemsToUse) {
        if (isSelectable(item)) {
          const originalIndex = items.indexOf(item);
          if (originalIndex !== -1) {
            if (newChecked.has(originalIndex)) {
              newChecked.delete(originalIndex);
            } else {
              newChecked.add(originalIndex);
            }
          }
        }
      }
      setChecked(newChecked);
    };

    // Helper to navigate up/down
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const navigate = (offset: number, rl: any): void => {
      // Clear the current line to prepare for re-render
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      rl.clearLine(0);

      let next = active;
      do {
        next = (next + offset + itemsToUse.length) % itemsToUse.length;
      } while (!isSelectable(itemsToUse[next]) && next !== active);

      // Only update if we found a valid selectable item AND it's different
      if (isSelectable(itemsToUse[next]) && next !== active) {
        setActive(next);
      }
    };

    // Handle keypress events
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useKeypress((key: KeypressEvent, rl: any) => {
      // Handle backspace for filter editing
      if (isBackspaceKey(key)) {
        if (filterTerm.length > 0) {
          setFilterTerm(filterTerm.slice(0, -1));
        }
        return;
      }

      // Handle escape - clear filter first, then exit
      if (key.name === 'escape') {
        if (filterTerm) {
          setFilterTerm('');
        } else {
          done(getSelectedValues());
        }
        return;
      }

      // Handle space - toggle current item
      if (isSpaceKey(key)) {
        const currentItem = itemsToUse[active];
        if (isSelectable(currentItem)) {
          toggleItem(currentItem);
        }
        return;
      }

      // Handle + - select all (filtered or all)
      if (key.name === '+') {
        selectAll();
        return;
      }

      // Handle - - invert selection (filtered or all)
      if (key.name === '-') {
        invertSelection();
        return;
      }

      // Handle enter - confirm selection
      if (isEnterKey(key)) {
        const selectedValues = getSelectedValues();
        if (required && selectedValues.length === 0) {
          return;
        }
        done(selectedValues);
        return;
      }

      // Handle navigation
      if (isUpKey(key)) {
        navigate(-1, rl);
        return;
      }

      if (isDownKey(key)) {
        navigate(1, rl);
        return;
      }

      // Capture printable character input for filtering
      if (key.name && key.name.length === 1 && !key.ctrl) {
        setFilterTerm(filterTerm + key.name);
      }
    });

    // Helper function to get selected values
    function getSelectedValues(): Value[] {
      const selectedValues: Value[] = [];
      for (const index of Array.from(checked).sort((a, b) => a - b)) {
        const item = items[index];
        if (isSelectable(item)) {
          selectedValues.push(item.value);
        }
      }
      return selectedValues;
    }

    firstRender.current = false;

    // Build the rendered output with keys in white and text in grey
    const helpTip = filterTerm
      ? `(${RESET}↑↓${GREY} navigate • ${RESET}Space${GREY} toggle • ${RESET}+${GREY} all • ${RESET}-${GREY} invert • ${RESET}⏎${GREY} confirm • ${RESET}Esc${GREY} clear filter${RESET})`
      : `(${RESET}↑↓${GREY} navigate • ${RESET}Space${GREY} toggle • ${RESET}+${GREY} all • ${RESET}-${GREY} invert • ${RESET}⏎${GREY} confirm • ${RESET}Esc${GREY} cancel${RESET})`;

    // Render items with pagination
    const page = usePagination({
      items: itemsToUse,
      active,
      renderItem({ item, isActive }) {
        if (isSeparator(item)) {
          return ` ${item.separator}`;
        }

        // Find the original index to check if it's checked
        const originalIndex = items.indexOf(item);
        const isChecked = originalIndex !== -1 && checked.has(originalIndex);

        const checkboxIcon = isChecked
          ? theme.icon?.checked ?? CHECKBOX_CHECKED
          : theme.icon?.unchecked ?? CHECKBOX_UNCHECKED;
        const cursor = isActive ? theme.icon?.cursor ?? CURSOR : ' ';
        const color = isActive ? theme.style?.highlight ?? ((x: string): string => x) : (x: string): string => x;

        return color(`${cursor} ${checkboxIcon} ${item.name}`);
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
  }
);
