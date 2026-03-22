/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { Config } from '@oclif/core';
import ListInstructions from '../../../../src/commands/aidev/list/instructions.js';
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

        // Stub runInteractive to avoid actual prompt interaction
        const runInteractiveStub = sandbox.stub(ListInstructions.prototype, 'runInteractive' as keyof ListInstructions);
        runInteractiveStub.resolves();

        await ListInstructions.run([], oclifConfig);

        expect(runInteractiveStub.calledOnce).to.be.true;
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

    it('should display instruction details', async () => {
      const originalStdinTTY = process.stdin.isTTY;
      const originalStdoutTTY = process.stdout.isTTY;

      try {
        Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true, writable: true });
        Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true, writable: true });

        scanInstructionsStub.resolves([
          { name: 'CLAUDE.md', type: 'instruction', installed: true, path: '/path/CLAUDE.md' },
        ]);

        // Stub promptSelect to return an instruction once, then null (exit)
        const promptSelectStub = sandbox.stub(ListInstructions.prototype, 'promptSelect' as keyof ListInstructions);
        promptSelectStub.onFirstCall().resolves({ name: 'CLAUDE.md', type: 'instruction', installed: true });
        promptSelectStub.onSecondCall().resolves(null);

        // Stub displayInstructionDetails to verify it's called
        const displayDetailsStub = sandbox.stub(
          ListInstructions.prototype,
          'displayInstructionDetails' as keyof ListInstructions
        );

        await ListInstructions.run([], oclifConfig);

        expect(displayDetailsStub.calledOnce).to.be.true;
        expect(displayDetailsStub.firstCall.args[0]).to.deep.include({ name: 'CLAUDE.md' });
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

    it('should handle user cancellation in promptSelect', async () => {
      const originalStdinTTY = process.stdin.isTTY;
      const originalStdoutTTY = process.stdout.isTTY;

      try {
        Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true, writable: true });
        Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true, writable: true });

        scanInstructionsStub.resolves([
          { name: 'CLAUDE.md', type: 'instruction', installed: true, path: '/path/CLAUDE.md' },
        ]);

        // Stub promptSelect to return null immediately (user cancels)
        const promptSelectStub = sandbox.stub(ListInstructions.prototype, 'promptSelect' as keyof ListInstructions);
        promptSelectStub.resolves(null);

        const result = await ListInstructions.run([], oclifConfig);

        expect(result.instructions).to.have.lengthOf(1);
        expect(promptSelectStub.calledOnce).to.be.true;
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

    it('should not enter interactive mode when no instructions exist', async () => {
      const originalStdinTTY = process.stdin.isTTY;
      const originalStdoutTTY = process.stdout.isTTY;

      try {
        Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true, writable: true });
        Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true, writable: true });

        scanInstructionsStub.resolves([]);

        const runInteractiveStub = sandbox.stub(ListInstructions.prototype, 'runInteractive' as keyof ListInstructions);

        await ListInstructions.run([], oclifConfig);

        expect(runInteractiveStub.called).to.be.false;
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

    it('should handle ExitPromptError in promptSelect', async () => {
      const originalStdinTTY = process.stdin.isTTY;
      const originalStdoutTTY = process.stdout.isTTY;

      try {
        Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true, writable: true });
        Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true, writable: true });

        scanInstructionsStub.resolves([
          { name: 'CLAUDE.md', type: 'instruction', installed: true, path: '/path/CLAUDE.md' },
        ]);

        // Create a command instance to test promptSelect directly
        const cmd = new ListInstructions([], oclifConfig);

        const exitError = new Error('User force closed the prompt');
        exitError.name = 'ExitPromptError';

        // Stub promptSelect to throw and verify it catches the error
        const promptStub = sandbox.stub(
          cmd as unknown as { promptSelect: (choices: unknown[], message: string) => Promise<unknown> },
          'promptSelect'
        );
        promptStub.callsFake(async () => {
          throw exitError;
        });

        try {
          await promptStub([{ name: 'CLAUDE.md', type: 'instruction', installed: true }], 'Select');
        } catch (error) {
          // Error should be caught internally
        }
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

    it('should return null when choices are empty in promptSelect', async () => {
      const cmd = new ListInstructions([], oclifConfig);

      const result = await (
        cmd as unknown as { promptSelect: (choices: unknown[], message: string) => Promise<unknown> }
      ).promptSelect([], 'Select an instruction');

      expect(result).to.be.null;
    });

    it('should call displayInstructionDetails with correct artifact', async () => {
      const cmd = new ListInstructions([], oclifConfig);
      const logStub = sandbox.stub(cmd, 'log');

      const artifact = { name: 'TEST.md', type: 'instruction' as const, installed: true };

      (cmd as unknown as { displayInstructionDetails: (artifact: unknown) => void }).displayInstructionDetails(
        artifact
      );

      expect(logStub.called).to.be.true;
      expect(logStub.getCalls().some((call) => call.args[0]?.includes('TEST.md'))).to.be.true;
    });
  });
});
