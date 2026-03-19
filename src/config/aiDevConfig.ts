/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ConfigFile } from '@salesforce/core';
import { InstalledArtifact, SourceConfig } from '../types/config.js';

/**
 * Configuration file for sf-aidev plugin.
 * Stores source repositories, installed artifacts, and tool preferences.
 */
export class AiDevConfig extends ConfigFile<ConfigFile.Options> {
  /**
   * Returns the filename for the config file.
   */
  public static getFileName(): string {
    return 'sf-aidev.json';
  }

  /**
   * Get the selected AI tool.
   */
  public getTool(): string | undefined {
    return this.get('tool') as string | undefined;
  }

  /**
   * Set the selected AI tool.
   */
  public setTool(tool: string): void {
    this.set('tool', tool);
  }

  /**
   * Get all configured source repositories.
   * Returns a deep copy to prevent mutation issues.
   */
  public getSources(): SourceConfig[] {
    const sources = this.get('sources') as SourceConfig[] | undefined;
    // Return deep copy to avoid reference mutation issues across platforms
    return sources ? sources.map((s) => ({ ...s })) : [];
  }

  /**
   * Get the default source repository.
   */
  public getDefaultSource(): SourceConfig | undefined {
    const sources = this.getSources();
    return sources.find((s) => s.isDefault) ?? sources[0];
  }

  /**
   * Add a source repository.
   */
  public addSource(source: SourceConfig): void {
    const sources = this.getSources();

    // If this is the default, unset others
    if (source.isDefault) {
      sources.forEach((s) => {
        s.isDefault = false;
      });
    }

    // If this is the first source, make it default
    if (sources.length === 0) {
      source.isDefault = true;
    }

    sources.push(source);
    this.set('sources', sources);
  }

  /**
   * Remove a source repository by repo name.
   */
  public removeSource(repo: string): boolean {
    const sources = this.getSources();
    const index = sources.findIndex((s) => s.repo === repo);

    if (index === -1) {
      return false;
    }

    const removed = sources.splice(index, 1)[0];

    // If we removed the default, make the first remaining source the default
    if (removed.isDefault && sources.length > 0) {
      sources[0].isDefault = true;
    }

    this.set('sources', sources);
    return true;
  }

  /**
   * Set a source as the default.
   */
  public setDefaultSource(repo: string): boolean {
    const sources = this.getSources();
    const source = sources.find((s) => s.repo === repo);

    if (!source) {
      return false;
    }

    sources.forEach((s) => {
      s.isDefault = s.repo === repo;
    });

    this.set('sources', sources);
    return true;
  }

  /**
   * Check if a source exists.
   */
  public hasSource(repo: string): boolean {
    return this.getSources().some((s) => s.repo === repo);
  }

  /**
   * Get all installed artifacts.
   * Returns a deep copy to prevent mutation issues.
   */
  public getInstalledArtifacts(): InstalledArtifact[] {
    const artifacts = this.get('installedArtifacts') as InstalledArtifact[] | undefined;
    return artifacts ? artifacts.map((a) => ({ ...a })) : [];
  }

  /**
   * Add an installed artifact.
   */
  public addInstalledArtifact(artifact: InstalledArtifact): void {
    const artifacts = this.getInstalledArtifacts();

    // Remove existing artifact with same name and type if present
    const index = artifacts.findIndex((a) => a.name === artifact.name && a.type === artifact.type);
    if (index !== -1) {
      artifacts.splice(index, 1);
    }

    artifacts.push(artifact);
    this.set('installedArtifacts', artifacts);
  }

  /**
   * Remove an installed artifact.
   */
  public removeInstalledArtifact(name: string, type: string): boolean {
    const artifacts = this.getInstalledArtifacts();
    const index = artifacts.findIndex((a) => a.name === name && a.type === type);

    if (index === -1) {
      return false;
    }

    artifacts.splice(index, 1);
    this.set('installedArtifacts', artifacts);
    return true;
  }

  /**
   * Find an installed artifact by name and type.
   */
  public findInstalledArtifact(name: string, type: string): InstalledArtifact | undefined {
    return this.getInstalledArtifacts().find((a) => a.name === name && a.type === type);
  }
}
