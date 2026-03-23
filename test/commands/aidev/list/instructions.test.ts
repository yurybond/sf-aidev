/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { Config } from '@oclif/core';
import ListInstructions from '../../../../src/commands/aidev/list/instructions.js';
import { AiDevConfig } from '../../../../src/config/aiDevConfig.js';
import { LocalFileScanner } from '../../../../src/services/localFileScanner.js';

describe('aidev list instructions', () => {
  let sandbox: sinon.SinonSandbox;
  let scanInstructionsStub: sinon.SinonStub;
  let oclifConfig: Config;

  before(async () => {
    oclifConfig = await Config.load({ root: process.cwd() });
  });

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sandbox.stub(AiDevConfig, 'create').resolves({
      getSources: () => [],
      getInstalledArtifacts: () => [],
      getDefaultSource: () => undefined,
      getTool: () => 'copilot',
    } as unknown as AiDevConfig);
    scanInstructionsStub = sandbox.stub(LocalFileScanner, 'scanInstructions');
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('list instructions', () => {
    it('should list local instruction files', async () => {
      scanInstructionsStub.resolves([
        { name: 'CLAUDE.md', type: 'instruction', installed: true, path: '/project/CLAUDE.md' },
        {
          name: 'copilot-instructions.md',
          type: 'instruction',
          installed: true,
          path: '/project/.github/copilot-instructions.md',
        },
      ]);

      const result = await ListInstructions.run([], oclifConfig);

      expect(result.instructions).to.have.lengthOf(2);
      expect(result.counts.total).to.equal(2);
    });

    it('should return empty when no instruction files exist', async () => {
      scanInstructionsStub.resolves([]);

      const result = await ListInstructions.run([], oclifConfig);

      expect(result.instructions).to.deep.equal([]);
      expect(result.counts.total).to.equal(0);
    });

    it('should sort instructions alphabetically', async () => {
      scanInstructionsStub.resolves([
        { name: 'CURSOR.md', type: 'instruction', installed: true, path: '/path' },
        { name: 'CLAUDE.md', type: 'instruction', installed: true, path: '/path' },
        { name: 'apex.instructions.md', type: 'instruction', installed: true, path: '/path' },
      ]);

      const result = await ListInstructions.run([], oclifConfig);

      expect(result.instructions[0].name).to.equal('apex.instructions.md');
      expect(result.instructions[1].name).to.equal('CLAUDE.md');
      expect(result.instructions[2].name).to.equal('CURSOR.md');
    });

    it('should mark all instructions as installed', async () => {
      scanInstructionsStub.resolves([{ name: 'CLAUDE.md', type: 'instruction', installed: true, path: '/path' }]);

      const result = await ListInstructions.run([], oclifConfig);

      expect(result.instructions.every((i) => i.installed)).to.be.true;
    });

    it('should set type to instruction for all results', async () => {
      scanInstructionsStub.resolves([{ name: 'CODEX.md', type: 'instruction', installed: true, path: '/path' }]);

      const result = await ListInstructions.run([], oclifConfig);

      expect(result.instructions.every((i) => i.type === 'instruction')).to.be.true;
    });
  });

  describe('command metadata', () => {
    it('should have required static properties', () => {
      expect(ListInstructions.summary).to.be.a('string').and.not.be.empty;
      expect(ListInstructions.description).to.be.a('string').and.not.be.empty;
      expect(ListInstructions.examples).to.be.an('array').and.have.length.greaterThan(0);
      expect(ListInstructions.enableJsonFlag).to.be.true;
    });

    it('should not have source flag (local-only)', () => {
      // ListInstructions has no flags defined, which is correct for local-only command
      expect(ListInstructions.flags === undefined || !('source' in (ListInstructions.flags ?? {}))).to.be.true;
    });
  });

  describe('interactive mode', () => {
    it('should run interactive mode when TTY is available and not in JSON mode', async () => {
      const originalStdinTTY = process.stdin.isTTY;
      const originalStdoutTTY = process.stdout.isTTY;

      try {
        Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true, writable: true });
        Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true, writable: true });

        scanInstructionsStub.resolves([
          { name: 'CLAUDE.md', type: 'instruction', installed: true, path: '/path/CLAUDE.md' },
        ]);

        // Stub runExpandableSelect to simulate user exiting immediately
        const runExpandableSelectStub = sandbox.stub(
          ListInstructions.prototype,
          'runExpandableSelect' as keyof ListInstructions
        );
        runExpandableSelectStub.resolves();

        await ListInstructions.run([], oclifConfig);

        expect(runExpandableSelectStub.calledOnce).to.be.true;
      } finally {
        Object.defineProperty(process.stdin, 'isTTY', {
          value: originalStdinTTY,
          configurable: true,
          writable: true,
        });
        Object.defineProperty(process.stdout, 'isTTY', {
          value: originalStdoutTTY,
          configurable: true,
          writable: true,
        });
      }
    });
  });
});
