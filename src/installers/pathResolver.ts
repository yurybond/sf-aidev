/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { join } from 'node:path';
import { SfError } from '@salesforce/core';
import { ArtifactType } from '../types/manifest.js';

/**
 * Tool-specific path configurations for each artifact type.
 */
const TOOL_PATHS: Record<ArtifactType, Record<string, string>> = {
  skill: {
    copilot: '.github/copilot-skills',
    claude: '.claude/skills',
  },
  agent: {
    copilot: '.github/agents',
    claude: '.claude/agents',
  },
  prompt: {
    copilot: '.github/prompts',
    claude: '.claude/commands',
  },
};

/**
 * Resolves installation paths for artifacts based on tool and type.
 */
export class PathResolver {
  /**
   * Get the base directory for a given artifact type and tool.
   *
   * @param type - The artifact type (skill, agent, prompt).
   * @param tool - The tool name (copilot, claude).
   * @returns The relative base path.
   * @throws SfError if the tool is not supported.
   */
  public static getBasePath(type: ArtifactType, tool: string): string {
    const toolPaths = TOOL_PATHS[type];

    if (!toolPaths) {
      throw new SfError(`Unknown artifact type: ${type}`, 'UnknownArtifactType');
    }

    const basePath = toolPaths[tool];

    if (!basePath) {
      throw new SfError(`Tool "${tool}" is not supported for artifact type "${type}"`, 'UnsupportedTool', [
        `Supported tools for ${type}: ${Object.keys(toolPaths).join(', ')}`,
      ]);
    }

    return basePath;
  }

  /**
   * Resolve the full installation path for an artifact.
   *
   * @param type - The artifact type.
   * @param tool - The tool name.
   * @param name - The artifact name.
   * @param projectPath - The project root directory.
   * @returns The absolute installation path.
   */
  public static resolve(type: ArtifactType, tool: string, name: string, projectPath: string): string {
    const basePath = this.getBasePath(type, tool);
    return join(projectPath, basePath, name);
  }

  /**
   * Resolve the full path for an artifact file.
   *
   * @param type - The artifact type.
   * @param tool - The tool name.
   * @param artifactName - The artifact name.
   * @param fileName - The file name.
   * @param projectPath - The project root directory.
   * @returns The absolute file path.
   */
  public static resolveFile(
    type: ArtifactType,
    tool: string,
    artifactName: string,
    fileName: string,
    projectPath: string
  ): string {
    const artifactPath = this.resolve(type, tool, artifactName, projectPath);
    return join(artifactPath, fileName);
  }

  /**
   * Get all supported tools for an artifact type.
   *
   * @param type - The artifact type.
   * @returns Array of supported tool names.
   */
  public static getSupportedTools(type: ArtifactType): string[] {
    return Object.keys(TOOL_PATHS[type] ?? {});
  }

  /**
   * Check if a tool is supported for an artifact type.
   *
   * @param type - The artifact type.
   * @param tool - The tool name.
   * @returns True if the tool is supported.
   */
  public static isToolSupported(type: ArtifactType, tool: string): boolean {
    return !!TOOL_PATHS[type]?.[tool];
  }
}
