/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { SfCommand } from '@salesforce/sf-plugins-core';
import type { Messages } from '@salesforce/core';
import { ArtifactService, type AvailableArtifact } from '../../../services/artifactService.js';
import {
  LocalFileScanner,
  type ScannedArtifact,
  type ScannedInstruction,
  type MergedArtifact,
} from '../../../services/localFileScanner.js';
import { AiDevConfig } from '../../../config/aiDevConfig.js';
import { InteractiveTable } from '../../../ui/interactiveTable.js';
import { FrontmatterParser } from '../../../utils/frontmatterParser.js';
import { isInteractive, toExpandableChoicesFlat } from '../../../ui/interactivePrompts.js';
import { expandableSelect } from '../../../ui/expandableSelect.js';
import type { ArtifactType } from '../../../types/manifest.js';

/**
 * Abstract base class for typed list commands (skills, agents, commands, instructions).
 * Provides common template method for listing artifacts with interactive expandable UI.
 *
 * @template TResult - The result type returned by the command.
 */
// eslint-disable-next-line sf-plugin/command-summary, sf-plugin/command-example
export abstract class BaseTypedListCommand<TResult> extends SfCommand<TResult> {
  /**
   * Whether this command supports the --source flag.
   * Instructions don't have remote sources, so they return false.
   */
  protected hasSource(): boolean {
    return this.getArtifactType() !== 'instruction';
  }

  /**
   * Whether this command supports fetching remote descriptions.
   * Instructions are local-only, so they return false.
   */
  protected hasFetchDescription(): boolean {
    return this.getArtifactType() !== 'instruction';
  }

  /**
   * Template method for running the list command.
   * Subclasses should call this from their run() method after parsing flags.
   */
  protected async runList(sourceFlag?: string): Promise<TResult> {
    const globalConfig = await AiDevConfig.create({ isGlobal: true });
    const localConfig = await AiDevConfig.create({ isGlobal: false });
    const projectPath = process.cwd();
    const msgs = this.getMessages();

    // Scan local artifacts
    const localArtifacts = await this.scanLocal(projectPath);

    // Fetch available artifacts from sources (if supported)
    const service = new ArtifactService(globalConfig, localConfig, projectPath);
    let availableArtifacts: AvailableArtifact[] = [];
    if (this.hasSource()) {
      const { artifacts, errors } = await service.listAvailableWithErrors({
        source: sourceFlag,
        type: this.getArtifactType() as ArtifactType,
      });
      availableArtifacts = artifacts;

      // Show warnings for failed sources
      if (errors.length > 0 && !this.jsonEnabled()) {
        for (const { source, error } of errors) {
          this.warn(msgs.getMessage('warning.SourceFailed', [source, error]));
        }
      }
    }

    // Merge local with manifest artifacts
    const merged = LocalFileScanner.mergeArtifacts(localArtifacts as ScannedArtifact[], availableArtifacts);

    // Sort alphabetically
    merged.sort((a, b) => a.name.localeCompare(b.name));

    // Display results
    if (!this.jsonEnabled()) {
      if (isInteractive()) {
        await this.runInteractive(merged, service);
      } else {
        InteractiveTable.renderSection(merged, this.getSectionTitle(), (msg) => this.log(msg));
      }
    }

    return this.buildResult(merged);
  }

  /**
   * Run interactive list with expandable descriptions.
   */
  protected async runInteractive(artifacts: MergedArtifact[], service: ArtifactService): Promise<void> {
    const msgs = this.getMessages();
    const choices = toExpandableChoicesFlat(artifacts, this.getSectionTitle());

    if (choices.length === 0) {
      const emptyKey = `info.No${this.getSectionTitle()}` as const;
      this.log(msgs.getMessage(emptyKey));
      return;
    }

    await this.runExpandableSelect(choices, service);
  }

  /**
   * Run the expandable select prompt.
   * Extracted for test stubbing.
   */
  protected async runExpandableSelect(
    choices: ReturnType<typeof toExpandableChoicesFlat>,
    service: ArtifactService
  ): Promise<void> {
    const msgs = this.getMessages();
    await expandableSelect({
      message: msgs.getMessage('prompt.Select'),
      choices,
      onFetchDescription: (artifact: MergedArtifact): Promise<string | undefined> =>
        this.fetchDescription(artifact, service),
    });
  }

  /**
   * Fetch a description for an artifact, trying remote frontmatter first.
   * Falls back to manifest description on error or when not applicable.
   */
  protected async fetchDescription(artifact: MergedArtifact, service: ArtifactService): Promise<string | undefined> {
    if (!this.hasFetchDescription() || !artifact.source) {
      return artifact.description;
    }

    try {
      const content = await service.fetchArtifactContent(artifact.name, {
        source: artifact.source,
        type: this.getArtifactType() as ArtifactType,
      });

      if (content) {
        const frontmatterDesc = FrontmatterParser.extractDescription(content);
        return frontmatterDesc ?? artifact.description;
      }
    } catch {
      // Fall back to manifest description on error
    }

    return artifact.description;
  }

  /**
   * Get the artifact type this command handles.
   */
  protected abstract getArtifactType(): ArtifactType | 'instruction';

  /**
   * Get the section title for display (e.g., 'Skills', 'Agents').
   */
  protected abstract getSectionTitle(): string;

  /**
   * Scan local project for artifacts of this type.
   */
  protected abstract scanLocal(projectPath: string): Promise<ScannedArtifact[] | ScannedInstruction[]>;

  /**
   * Build the command result from merged artifacts.
   */
  protected abstract buildResult(merged: MergedArtifact[]): TResult;

  /**
   * Get messages for this command.
   */
  protected abstract getMessages(): Messages<string>;
}
