/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { Args } from '@oclif/core';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages, SfError } from '@salesforce/core';
import { SourceService } from '../../../services/sourceService.js';
import { AiDevConfig } from '../../../config/aiDevConfig.js';
import type { SourceConfig } from '../../../types/config.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('sf-aidev', 'aidev.source.set-default');

export type SetDefaultResult = {
  repo: string;
  previousDefault?: string;
};

export default class SourceSetDefault extends SfCommand<SetDefaultResult> {
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
  };

  public async run(): Promise<SetDefaultResult> {
    const { args, flags } = await this.parse(SourceSetDefault);

    // Resolve repo from positional arg or flag
    const repo = args.repo ?? flags.repo;
    if (!repo) {
      throw new SfError(messages.getMessage('error.RepoRequired'), 'RepoRequiredError');
    }

    const config: AiDevConfig = await AiDevConfig.create({ isGlobal: true });
    const service: SourceService = new SourceService(config);

    // Check if source exists
    if (!service.has(repo)) {
      throw new SfError(messages.getMessage('error.SourceNotConfigured', [repo]), 'SourceNotConfiguredError');
    }

    // Get current default for the response
    const currentDefault: SourceConfig | undefined = service.getDefault();
    const previousDefault = currentDefault?.repo !== repo ? currentDefault?.repo : undefined;

    // Set the new default
    const result = await service.setDefault(repo);

    if (!result.success) {
      throw new SfError(result.error ?? 'Unknown error', 'SetDefaultError');
    }

    this.log(messages.getMessage('info.DefaultSet', [repo]));

    return {
      repo,
      previousDefault,
    };
  }
}
