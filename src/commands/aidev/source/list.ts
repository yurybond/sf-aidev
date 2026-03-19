/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { SfCommand } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import { SourceService } from '../../../services/sourceService.js';
import { AiDevConfig } from '../../../config/aiDevConfig.js';
import type { SourceConfig } from '../../../types/config.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('sf-aidev', 'aidev.source.list');

export type SourceListItem = {
  repo: string;
  isDefault: boolean;
  addedAt: string;
};

export type SourceListResult = {
  sources: SourceListItem[];
};

export default class SourceList extends SfCommand<SourceListResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly enableJsonFlag = true;

  public async run(): Promise<SourceListResult> {
    const config: AiDevConfig = await AiDevConfig.create({ isGlobal: true });
    const service: SourceService = new SourceService(config);

    const sources: SourceConfig[] = service.list();

    if (sources.length === 0) {
      this.log(messages.getMessage('info.NoSources'));
      return { sources: [] };
    }

    const result: SourceListItem[] = sources.map((source) => ({
      repo: source.repo,
      isDefault: source.isDefault ?? false,
      addedAt: source.addedAt,
    }));

    // Format table data with string values for display
    const tableData = result.map((item) => ({
      repo: item.repo,
      default: item.isDefault ? 'Yes' : '',
      addedAt: item.addedAt,
    }));

    this.table({
      data: tableData,
      columns: [
        { key: 'repo', name: 'Repository' },
        { key: 'default', name: 'Default' },
        { key: 'addedAt', name: 'Added' },
      ],
    });

    return { sources: result };
  }
}
