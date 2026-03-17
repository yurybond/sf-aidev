/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages, SfError } from '@salesforce/core';
import { SourceService, type AddSourceResult } from '../../../services/sourceService.js';
import { AiDevConfig } from '../../../config/aiDevConfig.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('ai-dev', 'aidev.source.add');

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

  public static readonly flags = {
    repo: Flags.string({
      char: 'r',
      summary: messages.getMessage('flags.repo.summary'),
      required: true,
    }),
    'set-default': Flags.boolean({
      summary: messages.getMessage('flags.set-default.summary'),
      default: false,
    }),
  };

  public async run(): Promise<SourceAddResult> {
    const { flags } = await this.parse(SourceAdd);

    // Validate repo format (owner/repo)
    const repoPattern = /^[\w.-]+\/[\w.-]+$/;
    if (!repoPattern.test(flags.repo)) {
      throw new SfError(messages.getMessage('error.InvalidRepoFormat', [flags.repo]), 'InvalidRepoFormatError');
    }

    const config: AiDevConfig = await AiDevConfig.create({ isGlobal: true });
    const service: SourceService = new SourceService(config);

    const result: AddSourceResult = await service.add(flags.repo, {
      isDefault: flags['set-default'],
    });

    if (!result.success) {
      if (result.error?.includes('already configured')) {
        throw new SfError(messages.getMessage('error.SourceAlreadyExists', [flags.repo]), 'SourceAlreadyExistsError');
      }
      if (result.error?.includes('Failed to fetch manifest')) {
        throw new SfError(messages.getMessage('error.ManifestNotFound', [flags.repo]), 'ManifestNotFoundError');
      }
      throw new SfError(result.error ?? 'Unknown error', 'SourceAddError');
    }

    const artifactCount = result.manifest?.artifacts.length ?? 0;
    const isDefault = result.source?.isDefault ?? false;

    this.log(messages.getMessage('info.SourceAdded', [flags.repo, artifactCount]));

    if (isDefault) {
      this.log(messages.getMessage('info.SetAsDefault', [flags.repo]));
    }

    return {
      repo: flags.repo,
      artifactCount,
      isDefault,
    };
  }
}
