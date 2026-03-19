/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages, SfError } from '@salesforce/core';
import { ArtifactService } from '../../../services/artifactService.js';
import { AiDevConfig } from '../../../config/aiDevConfig.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('sf-aidev', 'aidev.remove.skill');

export type RemoveSkillResult = {
  success: boolean;
  name: string;
  error?: string;
};

export default class RemoveSkill extends SfCommand<RemoveSkillResult> {
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
    'no-prompt': Flags.boolean({
      summary: messages.getMessage('flags.no-prompt.summary'),
      default: false,
    }),
  };

  public async run(): Promise<RemoveSkillResult> {
    const { flags } = await this.parse(RemoveSkill);

    const config = await AiDevConfig.create({ isGlobal: false });
    const service = new ArtifactService(config, process.cwd());

    // Check if skill is installed
    if (!service.isInstalled(flags.name, 'skill')) {
      throw new SfError(messages.getMessage('error.NotInstalled', [flags.name]), 'NotInstalledError');
    }

    // Confirm removal unless --no-prompt is specified
    if (!flags['no-prompt']) {
      const confirmed = await this.confirm({
        message: messages.getMessage('prompt.ConfirmRemove', [flags.name]),
      });
      if (!confirmed) {
        this.log(messages.getMessage('info.Cancelled'));
        return { success: false, name: flags.name, error: 'User cancelled removal' };
      }
    }

    const result = await service.uninstall(flags.name, { type: 'skill' });

    if (!result.success) {
      throw new SfError(
        messages.getMessage('error.RemoveFailed', [flags.name, result.error ?? 'Unknown error']),
        'RemoveError'
      );
    }

    this.log(messages.getMessage('info.SkillRemoved', [flags.name]));
    return { success: true, name: flags.name };
  }
}
