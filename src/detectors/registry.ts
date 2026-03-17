/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Detector } from './detector.js';
import { CopilotDetector } from './copilotDetector.js';
import { ClaudeDetector } from './claudeDetector.js';

/**
 * Result of a tool detection.
 */
export interface DetectionResult {
  /** Internal tool name */
  toolName: string;
  /** Human-readable display name */
  displayName: string;
  /** Whether the tool was detected */
  detected: boolean;
}

/**
 * Registry of all available AI tool detectors.
 * Provides methods to detect which tools are configured in a project.
 */
export class DetectorRegistry {
  /**
   * All registered detectors.
   */
  private static readonly detectors: Detector[] = [new CopilotDetector(), new ClaudeDetector()];

  /**
   * Detect all AI tools configured in the project.
   *
   * @param projectPath - The absolute path to the project directory.
   * @returns Array of tool names that were detected.
   */
  public static async detectAll(projectPath: string): Promise<string[]> {
    const results = await this.detectAllWithDetails(projectPath);
    return results.filter((r) => r.detected).map((r) => r.toolName);
  }

  /**
   * Detect all AI tools with full details.
   *
   * @param projectPath - The absolute path to the project directory.
   * @returns Array of detection results for all registered tools.
   */
  public static async detectAllWithDetails(projectPath: string): Promise<DetectionResult[]> {
    const detectionPromises = this.detectors.map(async (detector) => ({
      toolName: detector.toolName,
      displayName: detector.displayName,
      detected: await detector.detect(projectPath),
    }));

    return Promise.all(detectionPromises);
  }

  /**
   * Get a specific detector by tool name.
   *
   * @param toolName - The internal name of the tool.
   * @returns The detector if found, undefined otherwise.
   */
  public static getDetector(toolName: string): Detector | undefined {
    return this.detectors.find((d) => d.toolName === toolName);
  }

  /**
   * Get all registered detectors.
   *
   * @returns Array of all registered detectors.
   */
  public static getDetectors(): Detector[] {
    return [...this.detectors];
  }

  /**
   * Get all supported tool names.
   *
   * @returns Array of tool names.
   */
  public static getSupportedTools(): string[] {
    return this.detectors.map((d) => d.toolName);
  }
}
