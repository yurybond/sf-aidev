/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { Config } from '@oclif/core';
import { Flags } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import { BaseTypedListCommand } from '../../../../src/commands/aidev/list/baseTypedListCommand.js';
import { AiDevConfig } from '../../../../src/config/aiDevConfig.js';
import { ArtifactService } from '../../../../src/services/artifactService.js';
import {
  LocalFileScanner,
  type MergedArtifact,
  type ScannedArtifact,
} from '../../../../src/services/localFileScanner.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('sf-aidev', 'aidev.list.skills');

type TestResult = { artifacts: MergedArtifact[] };

/**
 * Concrete test subclass to exercise BaseTypedListCommand methods.
 */
class TestListCommand extends BaseTypedListCommand<TestResult> {
  public static readonly summary = 'Test list command';
  public static readonly enableJsonFlag = true;

  // eslint-disable-next-line sf-plugin/spread-base-flags
  public static readonly flags = {
    source: Flags.string({ char: 's', summary: 'source' }),
  };

  public async run(): Promise<TestResult> {
    const { flags } = await this.parse(TestListCommand);
    return this.runList(flags.source);
  }

  /** Expose fetchDescription for testing. */
  public async testFetchDescription(artifact: MergedArtifact, service: ArtifactService): Promise<string | undefined> {
    return this.fetchDescription(artifact, service);
  }

  // eslint-disable-next-line class-methods-use-this
  protected getArtifactType(): 'skill' {
    return 'skill';
  }

  // eslint-disable-next-line class-methods-use-this
  protected getSectionTitle(): string {
    return 'Skills';
  }

  // eslint-disable-next-line class-methods-use-this
  protected async scanLocal(_projectPath: string): Promise<ScannedArtifact[]> {
    return LocalFileScanner.scanSkills(_projectPath);
  }

  // eslint-disable-next-line class-methods-use-this
  protected buildResult(merged: MergedArtifact[]): TestResult {
    return { artifacts: merged };
  }

  // eslint-disable-next-line class-methods-use-this
  protected getMessages(): Messages<string> {
    return messages;
  }
}

/**
 * Concrete test subclass that simulates instruction-type behavior (no source, no fetch).
 */
class TestInstructionListCommand extends BaseTypedListCommand<TestResult> {
  public static readonly summary = 'Test instruction list command';
  public static readonly enableJsonFlag = true;
  // eslint-disable-next-line sf-plugin/spread-base-flags
  public static readonly flags = {};

  public async run(): Promise<TestResult> {
    return this.runList();
  }

  /** Expose fetchDescription for testing. */
  public async testFetchDescription(artifact: MergedArtifact, service: ArtifactService): Promise<string | undefined> {
    return this.fetchDescription(artifact, service);
  }

  // eslint-disable-next-line class-methods-use-this
  protected getArtifactType(): 'instruction' {
    return 'instruction';
  }

  // eslint-disable-next-line class-methods-use-this
  protected getSectionTitle(): string {
    return 'Instructions';
  }

  // eslint-disable-next-line class-methods-use-this
  protected async scanLocal(_projectPath: string): Promise<ScannedArtifact[]> {
    return LocalFileScanner.scanSkills(_projectPath);
  }

  // eslint-disable-next-line class-methods-use-this
  protected buildResult(merged: MergedArtifact[]): TestResult {
    return { artifacts: merged };
  }

  // eslint-disable-next-line class-methods-use-this
  protected getMessages(): Messages<string> {
    return messages;
  }
}

describe('BaseTypedListCommand', () => {
  const sandbox = sinon.createSandbox();
  let oclifConfig: Config;

  before(async () => {
    oclifConfig = await Config.load({ root: process.cwd() });
  });

  afterEach(() => {
    sandbox.restore();
  });

  function stubConfig(): void {
    sandbox.stub(AiDevConfig, 'create').resolves({
      getSources: () => [{ repo: 'test/repo', isDefault: true, addedAt: '' }],
      getInstalledArtifacts: () => [],
      getTool: () => 'copilot',
    } as unknown as AiDevConfig);
  }

  describe('hasSource / hasFetchDescription', () => {
    it('fetches sources for non-instruction types', async () => {
      stubConfig();
      sandbox.stub(LocalFileScanner, 'scanSkills').resolves([]);
      const listStub = sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
        artifacts: [],
        errors: [],
        partialSuccess: false,
      });

      const result = await TestListCommand.run(['--json'], oclifConfig);

      expect(result.artifacts).to.be.an('array');
      expect(listStub.calledOnce).to.equal(true);
    });

    it('skips source fetch for instruction type', async () => {
      sandbox.stub(AiDevConfig, 'create').resolves({
        getSources: () => [],
        getInstalledArtifacts: () => [],
        getTool: () => 'copilot',
      } as unknown as AiDevConfig);
      sandbox.stub(LocalFileScanner, 'scanSkills').resolves([]);
      const listStub = sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors');

      const result = await TestInstructionListCommand.run(['--json'], oclifConfig);

      expect(result.artifacts).to.be.an('array');
      expect(listStub.called).to.equal(false);
    });
  });

  describe('interactive mode', () => {
    it('calls runExpandableSelect when artifacts are available', async () => {
      const originalStdinTTY = process.stdin.isTTY;
      const originalStdoutTTY = process.stdout.isTTY;

      try {
        Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true, writable: true });
        Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true, writable: true });

        stubConfig();
        sandbox.stub(LocalFileScanner, 'scanSkills').resolves([]);
        sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
          artifacts: [{ name: 'test-skill', type: 'skill', source: 'test/repo', installed: false }],
          errors: [],
          partialSuccess: false,
        });

        const runExpandableStub = sandbox
          .stub(TestListCommand.prototype, 'runExpandableSelect' as keyof TestListCommand)
          .resolves();

        const result = await TestListCommand.run([], oclifConfig);

        expect(result.artifacts.length).to.equal(1);
        expect(runExpandableStub.calledOnce).to.equal(true);
      } finally {
        Object.defineProperty(process.stdin, 'isTTY', { value: originalStdinTTY, configurable: true, writable: true });
        Object.defineProperty(process.stdout, 'isTTY', {
          value: originalStdoutTTY,
          configurable: true,
          writable: true,
        });
      }
    });

    it('shows empty message when no artifacts available', async () => {
      const originalStdinTTY = process.stdin.isTTY;
      const originalStdoutTTY = process.stdout.isTTY;

      try {
        Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true, writable: true });
        Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true, writable: true });

        stubConfig();
        sandbox.stub(LocalFileScanner, 'scanSkills').resolves([]);
        sandbox.stub(ArtifactService.prototype, 'listAvailableWithErrors').resolves({
          artifacts: [],
          errors: [],
          partialSuccess: false,
        });

        const runExpandableStub = sandbox
          .stub(TestListCommand.prototype, 'runExpandableSelect' as keyof TestListCommand)
          .resolves();

        const result = await TestListCommand.run([], oclifConfig);

        expect(result.artifacts.length).to.equal(0);
        expect(runExpandableStub.called).to.equal(false);
      } finally {
        Object.defineProperty(process.stdin, 'isTTY', { value: originalStdinTTY, configurable: true, writable: true });
        Object.defineProperty(process.stdout, 'isTTY', {
          value: originalStdoutTTY,
          configurable: true,
          writable: true,
        });
      }
    });
  });

  describe('fetchDescription', () => {
    it('fetches description from remote frontmatter', async () => {
      sandbox
        .stub(ArtifactService.prototype, 'fetchArtifactContent')
        .resolves('---\ndescription: "Fetched from frontmatter"\n---\nContent');

      const cmd = new TestListCommand([], oclifConfig);
      const service = new ArtifactService({} as AiDevConfig, {} as AiDevConfig, process.cwd());

      const desc = await cmd.testFetchDescription(
        { name: 'remote-skill', type: 'skill', source: 'test/repo', installed: false, description: 'Original' },
        service
      );

      expect(desc).to.equal('Fetched from frontmatter');
    });

    it('falls back to manifest description when no frontmatter', async () => {
      sandbox.stub(ArtifactService.prototype, 'fetchArtifactContent').resolves('Just content, no frontmatter');

      const cmd = new TestListCommand([], oclifConfig);
      const service = new ArtifactService({} as AiDevConfig, {} as AiDevConfig, process.cwd());

      const desc = await cmd.testFetchDescription(
        { name: 'skill1', type: 'skill', source: 'test/repo', installed: false, description: 'Manifest desc' },
        service
      );

      expect(desc).to.equal('Manifest desc');
    });

    it('falls back to manifest description on fetch error', async () => {
      sandbox.stub(ArtifactService.prototype, 'fetchArtifactContent').rejects(new Error('Network error'));

      const cmd = new TestListCommand([], oclifConfig);
      const service = new ArtifactService({} as AiDevConfig, {} as AiDevConfig, process.cwd());

      const desc = await cmd.testFetchDescription(
        { name: 'skill1', type: 'skill', source: 'test/repo', installed: false, description: 'Fallback' },
        service
      );

      expect(desc).to.equal('Fallback');
    });

    it('returns description directly for artifacts without source', async () => {
      const fetchStub = sandbox.stub(ArtifactService.prototype, 'fetchArtifactContent');

      const cmd = new TestListCommand([], oclifConfig);
      const service = new ArtifactService({} as AiDevConfig, {} as AiDevConfig, process.cwd());

      const desc = await cmd.testFetchDescription(
        { name: 'local-skill', type: 'skill', installed: true, description: 'Local desc' },
        service
      );

      expect(desc).to.equal('Local desc');
      expect(fetchStub.called).to.equal(false);
    });

    it('returns description directly for instruction type (no remote fetch)', async () => {
      const fetchStub = sandbox.stub(ArtifactService.prototype, 'fetchArtifactContent');

      const instrCmd = new TestInstructionListCommand([], oclifConfig);
      const service = new ArtifactService({} as AiDevConfig, {} as AiDevConfig, process.cwd());

      const desc = await instrCmd.testFetchDescription(
        { name: 'instr1', type: 'instruction' as 'skill', installed: true, description: 'Instruction desc' },
        service
      );

      expect(desc).to.equal('Instruction desc');
      expect(fetchStub.called).to.equal(false);
    });

    it('handles null content from fetchArtifactContent', async () => {
      sandbox.stub(ArtifactService.prototype, 'fetchArtifactContent').resolves(null as unknown as string);

      const cmd = new TestListCommand([], oclifConfig);
      const service = new ArtifactService({} as AiDevConfig, {} as AiDevConfig, process.cwd());

      const desc = await cmd.testFetchDescription(
        { name: 'null-skill', type: 'skill', source: 'test/repo', installed: false, description: 'Default' },
        service
      );

      expect(desc).to.equal('Default');
    });
  });
});
