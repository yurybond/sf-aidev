/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { Args } from '@oclif/core';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages, SfError } from '@salesforce/core';
import { SourceService, type AddSourceResult } from '../../../services/sourceService.js';
import { AiDevConfig } from '../../../config/aiDevConfig.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('sf-aidev', 'aidev.source.add');

export type SourceAddResult = {
  repo: string;
  artifactCount: number;
  isDefault: boolean;
};

export default class SourceAdd extends SfCommand<SourceAddResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly enableJsonFlag = true;

  public static readonly args = {
    repo: Args.string({
      description: messages.getMessage('args.repo.summary'),
      required: false,
    }),
  };

  public static readonly flags = {
    repo: Flags.string({
      char: 'r',
      summary: messages.getMessage('flags.repo.summary'),
      required: false,
    }),
    'set-default': Flags.boolean({
      summary: messages.getMessage('flags.set-default.summary'),
      default: false,
    }),
  };

  public async run(): Promise<SourceAddResult> {
    const { args, flags } = await this.parse(SourceAdd);

    // Resolve repo from positional arg or flag
    const repo = args.repo ?? flags.repo;
    if (!repo) {
      throw new SfError(messages.getMessage('error.RepoRequired'), 'RepoRequiredError');
    }

    // Validate repo format (owner/repo)
    const repoPattern = /^[\w.-]+\/[\w.-]+$/;
    if (!repoPattern.test(repo)) {
      throw new SfError(messages.getMessage('error.InvalidRepoFormat', [repo]), 'InvalidRepoFormatError');
    }

    const config: AiDevConfig = await AiDevConfig.create({ isGlobal: true });
    const service: SourceService = new SourceService(config);

    const result: AddSourceResult = await service.add(repo, {
      isDefault: flags['set-default'],
    });

    if (!result.success) {
      if (result.error?.includes('already configured')) {
        throw new SfError(messages.getMessage('error.SourceAlreadyExists', [repo]), 'SourceAlreadyExistsError');
      }
      if (result.error?.includes('Failed to fetch manifest')) {
        throw new SfError(messages.getMessage('error.ManifestNotFound', [repo]), 'ManifestNotFoundError');
      }
      throw new SfError(result.error ?? 'Unknown error', 'SourceAddError');
    }

    const artifactCount = result.manifest?.artifacts.length ?? 0;
    const isDefault = result.source?.isDefault ?? false;

    this.log(messages.getMessage('info.SourceAdded', [repo, artifactCount]));

    if (isDefault) {
      this.log(messages.getMessage('info.SetAsDefault', [repo]));
    }

    return {
      repo,
      artifactCount,
      isDefault,
    };
  }
}
