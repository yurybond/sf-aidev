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
 * Builds a Manifest from a list of file paths by discovering artifacts
 * in well-known directories.
 */
export class ManifestBuilder {
  /**
   * Discovery rules table - order matters (first match wins).
   * Patterns match file paths relative to repo root.
   */
  private static readonly DISCOVERY_RULES: DiscoveryRule[] = [
    // Generic patterns (all tools)
    { pattern: /^agents\/[^/]+$/, type: 'agent' },
    { pattern: /^skills\/[^/]+$/, type: 'skill' },
    { pattern: /^prompts\/[^/]+$/, type: 'prompt' },

    // Claude patterns
    { pattern: /^\.claude\/agents\/[^/]+$/, type: 'agent', tool: 'claude' },
    { pattern: /^\.claude\/skills\/[^/]+$/, type: 'skill', tool: 'claude' },
    { pattern: /^CLAUDE\.md$/, type: 'prompt', tool: 'claude' },
    { pattern: /^\.claude\/CLAUDE\.md$/, type: 'prompt', tool: 'claude' },

    // Copilot patterns
    { pattern: /^\.github\/copilot-instructions\.md$/, type: 'prompt', tool: 'copilot' },
    { pattern: /^\.github\/skills\/[^/]+$/, type: 'skill', tool: 'copilot' },
    { pattern: /^\.github\/agents\/[^/]+$/, type: 'agent', tool: 'copilot' },
    { pattern: /^\.github\/prompts\/[^/]+$/, type: 'prompt', tool: 'copilot' },

    // Cursor patterns
    { pattern: /^\.cursor\/skills\/[^/]+$/, type: 'skill', tool: 'cursor' },
    { pattern: /^\.cursor\/agents\/[^/]+$/, type: 'agent', tool: 'cursor' },
    { pattern: /^\.cursorrules$/, type: 'prompt', tool: 'cursor' },

    // Gemini patterns
    { pattern: /^\.gemini\/agents\/[^/]+$/, type: 'agent', tool: 'gemini' },
    { pattern: /^\.gemini\/skills\/[^/]+$/, type: 'skill', tool: 'gemini' },

    // Codex patterns
    { pattern: /^\.codex\/agents\/[^/]+$/, type: 'agent', tool: 'codex' },
    { pattern: /^\.codex\/skills\/[^/]+$/, type: 'skill', tool: 'codex' },
  ];

  /**
   * Build a Manifest from a list of file paths.
   *
   * @param filePaths - Array of file paths relative to repo root.
   * @returns A Manifest with discovered artifacts.
   */
  public static build(filePaths: string[]): Manifest {
    const artifacts: Artifact[] = [];

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
