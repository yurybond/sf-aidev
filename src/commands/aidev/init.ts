/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages, SfError } from '@salesforce/core';
import { ArtifactService, type InstallResult, type AvailableArtifact } from '../../services/artifactService.js';
import { SourceService } from '../../services/sourceService.js';
import { AiDevConfig } from '../../config/aiDevConfig.js';
import { DetectorRegistry } from '../../detectors/registry.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('ai-dev', 'aidev.init');

export type InitResult = {
  tool: string;
  source: string;
  detectedTools: string[];
  installedArtifacts: InstallResult[];
};

type InitFlags = {
  tool?: string;
  source?: string;
  'no-install': boolean;
  'no-prompt': boolean;
};

export default class Init extends SfCommand<InitResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly enableJsonFlag = true;

  public static readonly flags = {
    tool: Flags.string({
      char: 't',
      summary: messages.getMessage('flags.tool.summary'),
      options: ['copilot', 'claude', 'cursor', 'windsurf', 'gemini', 'codex'],
    }),
    source: Flags.string({
      char: 's',
      summary: messages.getMessage('flags.source.summary'),
    }),
    'no-install': Flags.boolean({
      summary: messages.getMessage('flags.no-install.summary'),
      default: false,
    }),
    'no-prompt': Flags.boolean({
      summary: messages.getMessage('flags.no-prompt.summary'),
      default: false,
    }),
  };

  public async run(): Promise<InitResult> {
    const { flags } = await this.parse(Init);
    const projectPath = process.cwd();

    const selectedTool = await this.selectTool(flags as InitFlags, projectPath);
    const detectedTools = await DetectorRegistry.detectAll(projectPath);

    const config = await AiDevConfig.create({ isGlobal: false });
    const artifactService = new ArtifactService(config, projectPath);
    const sourceService = new SourceService(config);

    await artifactService.setActiveTool(selectedTool);
    this.log(messages.getMessage('info.ToolConfigured', [selectedTool]));

    const sourceRepo = await this.configureSource(flags as InitFlags, sourceService);

    const installedArtifacts = await this.handleArtifactInstallation(flags as InitFlags, artifactService, sourceRepo);

    return {
      tool: selectedTool,
      source: sourceRepo,
      detectedTools,
      installedArtifacts,
    };
  }

  private async selectTool(flags: InitFlags, projectPath: string): Promise<string> {
    if (flags.tool) {
      return flags.tool;
    }

    this.spinner.start(messages.getMessage('info.DetectingTools'));
    const detectedTools = await DetectorRegistry.detectAll(projectPath);
    this.spinner.stop();

    if (detectedTools.length === 0) {
      throw new SfError(messages.getMessage('error.NoToolsDetected'), 'NoToolsDetectedError', [
        messages.getMessage('error.NoToolsDetectedActions'),
      ]);
    }

    if (detectedTools.length === 1) {
      this.log(messages.getMessage('info.SingleToolDetected', [detectedTools[0]]));
      return detectedTools[0];
    }

    return this.selectFromMultipleTools(detectedTools, flags['no-prompt']);
  }

  private async selectFromMultipleTools(detectedTools: string[], noPrompt: boolean): Promise<string> {
    this.log(messages.getMessage('info.MultipleToolsDetected', [detectedTools.join(', ')]));
    const preferredTool = detectedTools.includes('copilot') ? 'copilot' : detectedTools[0];

    if (noPrompt) {
      this.log(messages.getMessage('info.AutoSelectedTool', [preferredTool]));
      return preferredTool;
    }

    const confirmed = await this.confirm({
      message: messages.getMessage('prompt.ConfirmTool', [preferredTool]),
    });

    if (confirmed) {
      return preferredTool;
    }

    return detectedTools.find((t) => t !== preferredTool) ?? preferredTool;
  }

  private async configureSource(flags: InitFlags, sourceService: SourceService): Promise<string> {
    let sourceRepo: string;

    if (flags.source) {
      sourceRepo = flags.source;
    } else {
      const defaultSource = sourceService.getDefault();
      if (!defaultSource) {
        throw new SfError(messages.getMessage('error.NoSourceConfigured'), 'NoSourceConfiguredError', [
          messages.getMessage('error.NoSourceConfiguredActions'),
        ]);
      }
      sourceRepo = defaultSource.repo;
      this.log(messages.getMessage('info.UsingDefaultSource', [sourceRepo]));
    }

    if (!sourceService.has(sourceRepo)) {
      this.spinner.start(messages.getMessage('info.AddingSource', [sourceRepo]));
      const addResult = await sourceService.add(sourceRepo);
      this.spinner.stop();

      if (!addResult.success) {
        const errorMsg = addResult.error ?? 'Unknown error';
        throw new SfError(messages.getMessage('error.SourceAddFailed', [sourceRepo, errorMsg]), 'SourceAddFailedError');
      }
    }

    return sourceRepo;
  }

  private async handleArtifactInstallation(
    flags: InitFlags,
    artifactService: ArtifactService,
    sourceRepo: string
  ): Promise<InstallResult[]> {
    if (flags['no-install']) {
      this.log(messages.getMessage('info.SkippingInstall'));
      return [];
    }

    const toInstall = await this.getArtifactsToInstall(artifactService, sourceRepo);
    if (toInstall.length === 0) {
      return [];
    }

    const shouldInstall = await this.confirmInstallation(toInstall, flags['no-prompt']);
    if (!shouldInstall) {
      return [];
    }

    return this.installArtifacts(artifactService, toInstall, sourceRepo);
  }

  private async getArtifactsToInstall(
    artifactService: ArtifactService,
    sourceRepo: string
  ): Promise<AvailableArtifact[]> {
    this.spinner.start(messages.getMessage('info.FetchingArtifacts'));
    const available = await artifactService.listAvailable({ source: sourceRepo });
    this.spinner.stop();

    if (available.length === 0) {
      this.log(messages.getMessage('info.NoArtifactsAvailable'));
      return [];
    }

    const toInstall = available.filter((a) => !a.installed);

    if (toInstall.length === 0) {
      this.log(messages.getMessage('info.AllArtifactsInstalled'));
    }

    return toInstall;
  }

  private async confirmInstallation(toInstall: AvailableArtifact[], noPrompt: boolean): Promise<boolean> {
    if (noPrompt) {
      return true;
    }

    this.log(messages.getMessage('info.AvailableArtifacts'));
    for (const artifact of toInstall) {
      this.log(`  - ${artifact.type}: ${artifact.name}`);
    }

    const confirmed = await this.confirm({
      message: messages.getMessage('prompt.ConfirmInstall', [toInstall.length.toString()]),
    });

    if (!confirmed) {
      this.log(messages.getMessage('info.InstallCancelled'));
    }

    return confirmed;
  }

  private async installArtifacts(
    artifactService: ArtifactService,
    toInstall: AvailableArtifact[],
    sourceRepo: string
  ): Promise<InstallResult[]> {
    this.spinner.start(messages.getMessage('info.InstallingArtifacts'));

    const installPromises = toInstall.map((artifact) =>
      artifactService.install(artifact.name, {
        type: artifact.type,
        source: sourceRepo,
      })
    );

    const installedArtifacts = await Promise.all(installPromises);
    this.spinner.stop();

    this.reportInstallResults(installedArtifacts);

    return installedArtifacts;
  }

  private reportInstallResults(installedArtifacts: InstallResult[]): void {
    const successful = installedArtifacts.filter((r) => r.success);
    const failed = installedArtifacts.filter((r) => !r.success);

    if (successful.length > 0) {
      this.log(messages.getMessage('info.InstallSuccess', [successful.length.toString()]));
      for (const result of successful) {
        this.log(`  - ${result.artifact} -> ${result.installedPath}`);
      }
    }

    if (failed.length > 0) {
      this.warn(messages.getMessage('warning.InstallFailed', [failed.length.toString()]));
      for (const result of failed) {
        this.log(`  - ${result.artifact}: ${result.error ?? 'Unknown error'}`);
      }
    }
  }
}
