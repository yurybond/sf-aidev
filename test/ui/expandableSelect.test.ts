/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { expect } from 'chai';
import sinon from 'sinon';
import {
  isSeparator,
  isSelectable,
  formatArtifactDisplay,
  type ExpandableItem,
  type ExpandableSeparator,
  type ExpandableChoice,
} from '../../src/ui/expandableSelect.js';
import type { MergedArtifact } from '../../src/services/localFileScanner.js';

describe('expandableSelect', () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  describe('ExpandableItem types', () => {
    it('correctly identifies separators', () => {
      const separator: ExpandableSeparator = { type: 'separator', separator: '--- Test ---' };

      expect('type' in separator && separator.type === 'separator').to.equal(true);
    });

    it('correctly identifies choices', () => {
      const choice: ExpandableChoice = {
        name: 'test',
        value: { name: 'test', type: 'skill', installed: false },
      };

      expect('value' in choice).to.equal(true);
      expect('name' in choice).to.equal(true);
    });

    it('correctly distinguishes between separator and choice', () => {
      const separator: ExpandableSeparator = { type: 'separator', separator: '--- Test ---' };
      const choice: ExpandableChoice = {
        name: 'test',
        value: { name: 'test', type: 'skill', installed: false },
      };

      expect('type' in separator && separator.type === 'separator').to.equal(true);
      expect('type' in choice && choice.type === 'separator').to.equal(false);
    });

    it('correctly handles installed artifacts', () => {
      const installedChoice: ExpandableChoice = {
        name: 'installed-skill',
        value: { name: 'installed-skill', type: 'skill', installed: true },
      };

      expect(installedChoice.value.installed).to.equal(true);
    });

    it('correctly handles available artifacts', () => {
      const availableChoice: ExpandableChoice = {
        name: 'available-skill',
        value: { name: 'available-skill', type: 'skill', installed: false },
      };

      expect(availableChoice.value.installed).to.equal(false);
    });
  });

  describe('helper functions', () => {
    describe('isSeparator', () => {
      it('returns true for separator items', () => {
        const separator: ExpandableSeparator = { type: 'separator', separator: '--- Test ---' };
        expect(isSeparator(separator)).to.equal(true);
      });

      it('returns false for choice items', () => {
        const choice: ExpandableChoice = {
          name: 'test',
          value: { name: 'test', type: 'skill', installed: false },
        };
        expect(isSeparator(choice)).to.equal(false);
      });
    });

    describe('isSelectable', () => {
      it('returns true for choice items', () => {
        const choice: ExpandableChoice = {
          name: 'test',
          value: { name: 'test', type: 'skill', installed: false },
        };
        expect(isSelectable(choice)).to.equal(true);
      });

      it('returns false for separator items', () => {
        const separator: ExpandableSeparator = { type: 'separator', separator: '--- Test ---' };
        expect(isSelectable(separator)).to.equal(false);
      });
    });

    describe('formatArtifactDisplay', () => {
      it('formats installed artifact with checked box', () => {
        const artifact: MergedArtifact = {
          name: 'my-skill',
          type: 'skill',
          installed: true,
        };
        const result = formatArtifactDisplay(artifact);
        expect(result).to.include('\u2611'); // Checked box
        expect(result).to.include('my-skill');
      });

      it('formats available artifact with unchecked box', () => {
        const artifact: MergedArtifact = {
          name: 'my-agent',
          type: 'agent',
          installed: false,
        };
        const result = formatArtifactDisplay(artifact);
        expect(result).to.include('\u2610'); // Unchecked box
        expect(result).to.include('my-agent');
      });

      it('formats artifact name correctly', () => {
        const artifact: MergedArtifact = {
          name: 'test-artifact',
          type: 'prompt',
          installed: false,
        };
        const result = formatArtifactDisplay(artifact);
        expect(result).to.match(/\u2610 test-artifact$/);
      });
    });
  });

  describe('expandableSelect prompt', () => {
    // Note: Testing the actual prompt is challenging without mocking the terminal.
    // The prompt behavior is tested via integration tests in the list command tests.
    // These tests verify the module exports correctly.

    it('exports expandableSelect function', async () => {
      const { expandableSelect } = await import('../../src/ui/expandableSelect.js');
      expect(typeof expandableSelect).to.equal('function');
    });

    it('exports type definitions', async () => {
      // Type-only import verification - if this compiles, types are exported correctly
      const item: ExpandableItem = { type: 'separator', separator: '---' };
      expect(item.type).to.equal('separator');
    });

    it('exports ExpandableChoice type', async () => {
      const choice: ExpandableChoice = {
        name: 'test-choice',
        value: { name: 'test-choice', type: 'agent', installed: true },
      };
      expect(choice.name).to.equal('test-choice');
      expect(choice.value.type).to.equal('agent');
    });

    it('exports ExpandableSeparator type', async () => {
      const separator: ExpandableSeparator = {
        type: 'separator',
        separator: '--- Category ---',
      };
      expect(separator.type).to.equal('separator');
      expect(separator.separator).to.equal('--- Category ---');
    });
  });
});
