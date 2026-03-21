/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import type { Artifact, ArtifactType, Manifest } from '../types/manifest.js';

/**
 * Discovery rule for mapping file paths to artifacts.
 */
interface DiscoveryRule {
  /** Regex pattern to match file paths */
  pattern: RegExp;
  /** Artifact type to assign */
  type: ArtifactType;
  /** Optional tool this artifact is specific to */
  tool?: string;
}

/**
 * Skill directory rule for matching files inside skill directories.
 */
interface SkillDirectoryRule {
  /** Regex pattern to match files inside skill directories (captures dirName and fileName) */
  pattern: RegExp;
  /** Optional tool this skill is specific to */
  tool?: string;
}

/**
 * Command directory rule for matching files inside command directories.
 */
interface CommandDirectoryRule {
  /** Regex pattern to match files inside command directories (captures dirName and fileName) */
  pattern: RegExp;
  /** Optional tool this command is specific to */
  tool?: string;
}

/**
 * Information about a discovered skill directory.
 */
interface SkillDirInfo {
  /** Files belonging to this skill */
  files: string[];
  /** Tool this skill is specific to (if any) */
  tool?: string;
}

/**
 * Information about a discovered command directory.
 */
interface CommandDirInfo {
  /** Files belonging to this command */
  files: string[];
  /** Tool this command is specific to (if any) */
  tool?: string;
}

/**
 * Builds a Manifest from a list of file paths by discovering artifacts
 * in well-known directories.
 */
export class ManifestBuilder {
  /**
   * Skill directory rules - match files inside skill directories.
   * Patterns capture (dirName, fileName) groups.
   */
  private static readonly SKILL_DIRECTORY_RULES: SkillDirectoryRule[] = [
    // Generic skills
    { pattern: /^skills\/([^/]+)\/(.+)$/ },
    // Claude skills
    { pattern: /^\.claude\/skills\/([^/]+)\/(.+)$/, tool: 'claude' },
    // Copilot skills
    { pattern: /^\.github\/skills\/([^/]+)\/(.+)$/, tool: 'copilot' },
    // Cursor skills
    { pattern: /^\.cursor\/skills\/([^/]+)\/(.+)$/, tool: 'cursor' },
    // Gemini skills
    { pattern: /^\.gemini\/skills\/([^/]+)\/(.+)$/, tool: 'gemini' },
    // Codex skills
    { pattern: /^\.codex\/skills\/([^/]+)\/(.+)$/, tool: 'codex' },
  ];

  /**
   * Command directory rules - match files inside command directories.
   * Patterns capture (dirName, fileName) groups.
   */
  private static readonly COMMAND_DIRECTORY_RULES: CommandDirectoryRule[] = [
    // Generic commands
    { pattern: /^commands\/([^/]+)\/(.+)$/ },
    // Claude commands
    { pattern: /^\.claude\/commands\/([^/]+)\/(.+)$/, tool: 'claude' },
    // Copilot commands
    { pattern: /^\.github\/commands\/([^/]+)\/(.+)$/, tool: 'copilot' },
  ];

  /**
   * Discovery rules table - order matters (first match wins).
   * Patterns match file paths relative to repo root.
   * Note: Skills and commands are now discovered as directories via SKILL_DIRECTORY_RULES and COMMAND_DIRECTORY_RULES.
   */
  private static readonly DISCOVERY_RULES: DiscoveryRule[] = [
    // Generic patterns (all tools) - agents, prompts, and single-file commands
    { pattern: /^agents\/[^/]+$/, type: 'agent' },
    { pattern: /^prompts\/[^/]+$/, type: 'prompt' },
    { pattern: /^commands\/[^/]+\.md$/, type: 'command' },

    // Claude patterns
    { pattern: /^\.claude\/agents\/[^/]+$/, type: 'agent', tool: 'claude' },
    { pattern: /^CLAUDE\.md$/, type: 'prompt', tool: 'claude' },
    { pattern: /^\.claude\/CLAUDE\.md$/, type: 'prompt', tool: 'claude' },
    { pattern: /^\.claude\/commands\/[^/]+\.md$/, type: 'command', tool: 'claude' },

    // Copilot patterns
    { pattern: /^\.github\/copilot-instructions\.md$/, type: 'prompt', tool: 'copilot' },
    { pattern: /^\.github\/agents\/[^/]+$/, type: 'agent', tool: 'copilot' },
    { pattern: /^\.github\/prompts\/[^/]+$/, type: 'prompt', tool: 'copilot' },
    { pattern: /^\.github\/commands\/[^/]+\.md$/, type: 'command', tool: 'copilot' },

    // Cursor patterns
    { pattern: /^\.cursor\/agents\/[^/]+$/, type: 'agent', tool: 'cursor' },
    { pattern: /^\.cursorrules$/, type: 'prompt', tool: 'cursor' },

    // Gemini patterns
    { pattern: /^\.gemini\/agents\/[^/]+$/, type: 'agent', tool: 'gemini' },

    // Codex patterns
    { pattern: /^\.codex\/agents\/[^/]+$/, type: 'agent', tool: 'codex' },
  ];

  /**
   * Build a Manifest from a list of file paths.
   *
   * @param filePaths - Array of file paths relative to repo root.
   * @returns A Manifest with discovered artifacts.
   */
  public static build(filePaths: string[]): Manifest {
    const artifacts: Artifact[] = [];

    // First pass: discover skill directories
    const skillDirs = this.discoverSkillDirectories(filePaths);
    for (const [dirName, info] of skillDirs) {
      artifacts.push(this.createSkillArtifact(dirName, info.files, info.tool));
    }

    // Second pass: discover command directories
    const commandDirs = this.discoverCommandDirectories(filePaths);
    for (const [dirName, info] of commandDirs) {
      artifacts.push(this.createCommandArtifact(dirName, info.files, info.tool));
    }

    // Third pass: discover single-file artifacts (agents, prompts, single-file commands)
    for (const path of filePaths) {
      for (const rule of this.DISCOVERY_RULES) {
        if (rule.pattern.test(path)) {
          artifacts.push(this.createArtifact(path, rule.type, rule.tool));
          break; // First matching rule wins
        }
      }
    }

    return {
      version: 'auto',
      artifacts,
    };
  }

  /**
   * Discover skill directories by grouping files by their parent directory.
   *
   * @param filePaths - Array of file paths.
   * @returns Map of skill directory names to their info (files and tool).
   */
  private static discoverSkillDirectories(filePaths: string[]): Map<string, SkillDirInfo> {
    const skillDirs = new Map<string, SkillDirInfo>();

    for (const path of filePaths) {
      for (const rule of this.SKILL_DIRECTORY_RULES) {
        const match = path.match(rule.pattern);
        if (match) {
          const [, dirName] = match;
          const existing = skillDirs.get(dirName);
          if (existing) {
            existing.files.push(path);
            // Keep the most specific tool (first one wins)
          } else {
            skillDirs.set(dirName, { files: [path], tool: rule.tool });
          }
          break; // First matching rule wins
        }
      }
    }

    return skillDirs;
  }

  /**
   * Discover command directories by grouping files by their parent directory.
   *
   * @param filePaths - Array of file paths.
   * @returns Map of command directory names to their info (files and tool).
   */
  private static discoverCommandDirectories(filePaths: string[]): Map<string, CommandDirInfo> {
    const commandDirs = new Map<string, CommandDirInfo>();

    for (const path of filePaths) {
      for (const rule of this.COMMAND_DIRECTORY_RULES) {
        const match = path.match(rule.pattern);
        if (match) {
          const [, dirName] = match;
          const existing = commandDirs.get(dirName);
          if (existing) {
            existing.files.push(path);
            // Keep the most specific tool (first one wins)
          } else {
            commandDirs.set(dirName, { files: [path], tool: rule.tool });
          }
          break; // First matching rule wins
        }
      }
    }

    return commandDirs;
  }

  /**
   * Create a skill Artifact from a directory with multiple files.
   */
  private static createSkillArtifact(name: string, files: string[], tool?: string): Artifact {
    const artifact: Artifact = {
      name,
      type: 'skill',
      files: files.map((f) => ({ source: f })),
    };

    if (tool) {
      artifact.tools = [tool];
    }

    return artifact;
  }

  /**
   * Create a command Artifact from a directory with multiple files.
   */
  private static createCommandArtifact(name: string, files: string[], tool?: string): Artifact {
    const artifact: Artifact = {
      name,
      type: 'command',
      files: files.map((f) => ({ source: f })),
    };

    if (tool) {
      artifact.tools = [tool];
    }

    return artifact;
  }

  /**
   * Create an Artifact from a matched file path.
   */
  private static createArtifact(path: string, type: ArtifactType, tool?: string): Artifact {
    const name = this.extractName(path);
    const artifact: Artifact = {
      name,
      type,
      files: [{ source: path }],
    };

    if (tool) {
      artifact.tools = [tool];
    }

    return artifact;
  }

  /**
   * Extract artifact name from file path.
   * Takes the filename and removes the extension (if present).
   * Handles dotfiles (files starting with .) by keeping the full name.
   */
  private static extractName(path: string): string {
    const filename = path.split('/').pop() ?? path;
    // For dotfiles like .cursorrules, keep the full name
    // For regular files, remove extension
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex <= 0) {
      // No extension or dotfile without extension (e.g., .cursorrules)
      return filename;
    }
    return filename.substring(0, lastDotIndex);
  }
}
