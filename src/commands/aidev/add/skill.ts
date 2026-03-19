/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages, SfError } from '@salesforce/core';
import { ArtifactService, type InstallResult } from '../../../services/artifactService.js';
import { AiDevConfig } from '../../../config/aiDevConfig.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('sf-aidev', 'aidev.add.skill');

export type AddSkillResult = InstallResult;

export default class AddSkill extends SfCommand<AddSkillResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly enableJsonFlag = true;

  public static readonly flags = {
    name: Flags.string({
      char: 'n',
      summary: messages.getMessage('flags.name.summary'),
      required: true,
    }),
    source: Flags.string({
      char: 's',
      summary: messages.getMessage('flags.source.summary'),
    }),
  };

  public async run(): Promise<AddSkillResult> {
    const { flags } = await this.parse(AddSkill);

    const config = await AiDevConfig.create({ isGlobal: false });
    const service = new ArtifactService(config, process.cwd());

    const result = await service.install(flags.name, { type: 'skill', source: flags.source });

    if (!result.success) {
      throw new SfError(
        messages.getMessage('error.InstallFailed', [flags.name, result.error ?? 'Unknown error']),
        'InstallError'
      );
    }

    this.log(messages.getMessage('info.SkillInstalled', [result.artifact, result.installedPath]));
    return result;
  }
}
