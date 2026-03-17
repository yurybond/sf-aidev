/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages, SfError } from '@salesforce/core';
import { SourceService } from '../../../services/sourceService.js';
import { AiDevConfig } from '../../../config/aiDevConfig.js';
import type { SourceConfig } from '../../../types/config.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('ai-dev', 'aidev.source.set-default');

export type SetDefaultResult = {
  repo: string;
  previousDefault?: string;
};

export default class SourceSetDefault extends SfCommand<SetDefaultResult> {
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
  };

  public async run(): Promise<SetDefaultResult> {
    const { flags } = await this.parse(SourceSetDefault);

    const config: AiDevConfig = await AiDevConfig.create({ isGlobal: true });
    const service: SourceService = new SourceService(config);

    // Check if source exists
    if (!service.has(flags.repo)) {
      throw new SfError(messages.getMessage('error.SourceNotConfigured', [flags.repo]), 'SourceNotConfiguredError');
    }

    // Get current default for the response
    const currentDefault: SourceConfig | undefined = service.getDefault();
    const previousDefault = currentDefault?.repo !== flags.repo ? currentDefault?.repo : undefined;

    // Set the new default
    const result = await service.setDefault(flags.repo);

    if (!result.success) {
      throw new SfError(result.error ?? 'Unknown error', 'SetDefaultError');
    }

    this.log(messages.getMessage('info.DefaultSet', [flags.repo]));

    return {
      repo: flags.repo,
      previousDefault,
    };
  }
}
