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
const messages = Messages.loadMessages('sf-aidev', 'aidev.source.remove');

export type SourceRemoveResult = {
  repo: string;
  removed: boolean;
  newDefault?: string;
};

export default class SourceRemove extends SfCommand<SourceRemoveResult> {
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
    'no-prompt': Flags.boolean({
      summary: messages.getMessage('flags.no-prompt.summary'),
      default: false,
    }),
  };

  public async run(): Promise<SourceRemoveResult> {
    const { args, flags } = await this.parse(SourceRemove);

    // Resolve repo from positional arg or flag
    const repo = args.repo ?? flags.repo;
    if (!repo) {
      throw new SfError(messages.getMessage('error.RepoRequired'), 'RepoRequiredError');
    }

    const config: AiDevConfig = await AiDevConfig.create({ isGlobal: true });
    const service: SourceService = new SourceService(config);

    // Check if source exists
    if (!service.has(repo)) {
      throw new SfError(messages.getMessage('error.SourceNotFound', [repo]), 'SourceNotFoundError');
    }

    // Check if this is the default source
    const currentDefault: SourceConfig | undefined = service.getDefault();
    const wasDefault = currentDefault?.repo === repo;

    // Prompt for confirmation unless --no-prompt
    if (!flags['no-prompt']) {
      const confirmed = await this.confirm({
        message: messages.getMessage('prompt.ConfirmRemove', [repo]),
      });
      if (!confirmed) {
        this.log(messages.getMessage('info.Cancelled'));
        return { repo, removed: false };
      }
    }

    // Remove the source
    const result = await service.remove(repo);

    if (!result.success) {
      throw new SfError(result.error ?? 'Unknown error', 'SourceRemoveError');
    }

    this.log(messages.getMessage('info.SourceRemoved', [repo]));

    let newDefault: string | undefined;

    // If removed source was default, check if we need to prompt for new default
    if (wasDefault) {
      const remainingSources: SourceConfig[] = service.list();

      if (remainingSources.length > 0) {
        const newDefaultSource = service.getDefault();
        newDefault = newDefaultSource?.repo;

        if (newDefault) {
          this.log(messages.getMessage('info.NewDefaultSet', [newDefault]));
        }
      }
    }

    return {
      repo,
      removed: true,
      newDefault,
    };
  }
}
