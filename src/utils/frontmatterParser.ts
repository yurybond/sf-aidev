/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

/**
 * Parsed frontmatter data from a markdown file.
 */
export type FrontmatterData = {
  /** Any key-value pairs from frontmatter */
  [key: string]: string | undefined;
};

/**
 * Result of parsing frontmatter from content.
 */
export type FrontmatterResult = {
  /** The parsed frontmatter data, or null if no frontmatter found */
  data: FrontmatterData | null;
  /** The content after the frontmatter block */
  content: string;
};

/**
 * Regex pattern to match YAML frontmatter at the start of content.
 * Matches content between --- delimiters at the beginning of the file.
 */
const FRONTMATTER_REGEX = /^---\s*\n([\s\S]*?)\n---\s*\n?/;

/**
 * Regex pattern to parse a single YAML key-value line.
 * Supports quoted and unquoted values.
 */
const YAML_LINE_REGEX = /^\s*([a-zA-Z_][a-zA-Z0-9_-]*)\s*:\s*(.*)$/;

/**
 * Parses YAML frontmatter from markdown content.
 * Uses regex-based parsing (no external dependencies).
 */
export class FrontmatterParser {
  /**
   * Parse frontmatter from markdown content.
   *
   * @param content - The full markdown content including potential frontmatter.
   * @returns FrontmatterResult with parsed data and remaining content.
   */
  public static parse(content: string): FrontmatterResult {
    const match = content.match(FRONTMATTER_REGEX);

    if (!match) {
      return {
        data: null,
        content,
      };
    }

    const frontmatterBlock = match[1];
    const remainingContent = content.slice(match[0].length);

    const data = this.parseYamlBlock(frontmatterBlock);

    return {
      data,
      content: remainingContent,
    };
  }

  /**
   * Extract description from markdown content's frontmatter.
   * Convenience method for the common use case.
   *
   * @param content - The full markdown content.
   * @returns The description if found, undefined otherwise.
   */
  public static extractDescription(content: string): string | undefined {
    const result = this.parse(content);
    return result.data?.description;
  }

  /**
   * Check if content has frontmatter.
   *
   * @param content - The content to check.
   * @returns True if the content starts with frontmatter.
   */
  public static hasFrontmatter(content: string): boolean {
    return FRONTMATTER_REGEX.test(content);
  }

  /**
   * Parse a YAML block into key-value pairs.
   * Supports simple key: value syntax with quoted and unquoted values.
   */
  private static parseYamlBlock(block: string): FrontmatterData {
    const data: FrontmatterData = {};
    const lines = block.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      const match = trimmed.match(YAML_LINE_REGEX);
      if (match) {
        const key = match[1];
        let value = match[2].trim();

        // Remove surrounding quotes if present
        value = this.unquote(value);

        data[key] = value;
      }
    }

    return data;
  }

  /**
   * Remove surrounding quotes from a value.
   * Handles single quotes, double quotes, and escaped quotes.
   */
  private static unquote(value: string): string {
    if (!value) {
      return value;
    }

    // Check for double quotes
    if (value.startsWith('"') && value.endsWith('"')) {
      return value.slice(1, -1).replace(/\\"/g, '"');
    }

    // Check for single quotes
    if (value.startsWith("'") && value.endsWith("'")) {
      return value.slice(1, -1).replace(/''/g, "'");
    }

    return value;
  }
}
