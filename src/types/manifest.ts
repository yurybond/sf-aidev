/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Type of artifact that can be installed.
 */
export type ArtifactType = 'skill' | 'agent' | 'prompt';

/**
 * Represents a file within an artifact.
 */
export interface ArtifactFile {
  /** Path to the file in the source repository */
  source: string;
  /** Optional override for the target filename */
  target?: string;
}

/**
 * Represents an installable artifact (skill, agent, or prompt).
 */
export interface Artifact {
  /** Unique name of the artifact */
  name: string;
  /** Type of artifact */
  type: ArtifactType;
  /** Human-readable description (optional for auto-discovered artifacts) */
  description?: string;
  /** Files that make up this artifact */
  files: ArtifactFile[];
  /** AI tools this artifact supports (empty means all tools) */
  tools?: string[];
}

/**
 * Manifest schema for a source repository.
 */
export interface Manifest {
  /** Schema version */
  version: string;
  /** Available artifacts in this source */
  artifacts: Artifact[];
}
