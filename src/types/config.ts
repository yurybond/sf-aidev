/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { JsonMap } from '@salesforce/ts-types';
import { ArtifactType } from './manifest.js';

/**
 * Configuration for a source repository.
 */
export interface SourceConfig extends JsonMap {
  /** Repository in owner/repo format */
  repo: string;
  /** Whether this is the default source */
  isDefault?: boolean;
  /** ISO date string when the source was added */
  addedAt: string;
}

/**
 * Represents an artifact that has been installed locally.
 */
export interface InstalledArtifact extends JsonMap {
  /** Name of the installed artifact */
  name: string;
  /** Type of artifact */
  type: ArtifactType;
  /** Local path where the artifact was installed */
  path: string;
  /** Source repository the artifact came from */
  source: string;
  /** ISO date string when the artifact was installed */
  installedAt: string;
}

/**
 * Schema for the sf-aidev configuration file (ai-dev.json).
 */
export interface AiDevConfigOptions extends JsonMap {
  /** Selected AI tool (e.g., 'copilot', 'claude') */
  tool?: string;
  /** Configured source repositories */
  sources: SourceConfig[];
  /** Artifacts installed in the current project */
  installedArtifacts: InstalledArtifact[];
}
