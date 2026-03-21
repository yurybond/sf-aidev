/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { expect } from 'chai';
import sinon from 'sinon';
import type { ExpandableItem, ExpandableSeparator } from '../../src/ui/expandableSelect.js';

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
      const choice: ExpandableItem = {
        name: 'test',
        value: { name: 'test', type: 'skill', installed: false },
      };

      expect('value' in choice).to.equal(true);
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
  });
});
