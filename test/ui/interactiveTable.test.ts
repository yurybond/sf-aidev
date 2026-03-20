/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { Separator } from '@inquirer/prompts';
import { expect } from 'chai';
import { InteractiveTable } from '../../src/ui/interactiveTable.js';
import type { GroupedArtifacts, MergedArtifact } from '../../src/services/localFileScanner.js';

describe('InteractiveTable', () => {
  describe('isInteractiveSupported', () => {
    it('returns a boolean', () => {
      const result = InteractiveTable.isInteractiveSupported();
      expect(typeof result).to.equal('boolean');
    });
  });

  describe('formatRow', () => {
    it('formats installed artifact with checked box', () => {
      const artifact: MergedArtifact = { name: 'test', type: 'skill', installed: true };
      const result = InteractiveTable.formatRow(artifact);
      expect(result).to.include('test');
      expect(result).to.include('\u2611'); // Checked box
    });

    it('formats available artifact with unchecked box', () => {
      const artifact: MergedArtifact = { name: 'test', type: 'skill', installed: false };
      const result = InteractiveTable.formatRow(artifact);
      expect(result).to.include('test');
      expect(result).to.include('\u2610'); // Unchecked box
    });
  });

  describe('formatHeader', () => {
    it('returns the title unchanged', () => {
      const result = InteractiveTable.formatHeader('Skills');
      expect(result).to.equal('Skills');
    });
  });

  describe('toDisplayRows', () => {
    it('creates display rows from grouped artifacts', () => {
      const groups: GroupedArtifacts = {
        agents: [{ name: 'agent1', type: 'agent', installed: true }],
        skills: [],
        prompts: [],
        instructions: [],
      };

      const rows = InteractiveTable.toDisplayRows(groups);
      expect(rows.length).to.be.greaterThan(0);

      const headerRow = rows.find((r) => r.isHeader);
      expect(headerRow?.text).to.equal('Agents');
    });

    it('handles empty groups', () => {
      const groups: GroupedArtifacts = {
        agents: [],
        skills: [],
        prompts: [],
        instructions: [],
      };

      const rows = InteractiveTable.toDisplayRows(groups);
      expect(rows).to.deep.equal([]);
    });
  });

  describe('renderPlainText', () => {
    it('calls log function for each row', () => {
      const groups: GroupedArtifacts = {
        agents: [],
        skills: [{ name: 'skill1', type: 'skill', installed: true }],
        prompts: [],
        instructions: [],
      };

      const logged: string[] = [];
      InteractiveTable.renderPlainText(groups, (msg) => logged.push(msg));

      expect(logged.length).to.be.greaterThan(0);
      expect(logged.some((msg) => msg.includes('Skills'))).to.equal(true);
    });

    it('shows empty message for no artifacts', () => {
      const groups: GroupedArtifacts = {
        agents: [],
        skills: [],
        prompts: [],
        instructions: [],
      };

      const logged: string[] = [];
      InteractiveTable.renderPlainText(groups, (msg) => logged.push(msg));

      expect(logged.some((msg) => msg.includes('No artifacts found'))).to.equal(true);
    });
  });

  describe('renderSection', () => {
    it('renders a single section', () => {
      const artifacts: MergedArtifact[] = [
        { name: 'skill1', type: 'skill', installed: true },
        { name: 'skill2', type: 'skill', installed: false },
      ];

      const logged: string[] = [];
      InteractiveTable.renderSection(artifacts, 'Skills', (msg) => logged.push(msg));

      expect(logged[0]).to.equal('Skills');
      expect(logged.length).to.equal(3); // header + 2 items
    });

    it('shows empty message for no artifacts', () => {
      const logged: string[] = [];
      InteractiveTable.renderSection([], 'Skills', (msg) => logged.push(msg));

      expect(logged.some((msg) => msg.includes('No skills found'))).to.equal(true);
    });
  });

  describe('getTotalCount', () => {
    it('returns total count of all artifacts', () => {
      const groups: GroupedArtifacts = {
        agents: [{ name: 'a1', type: 'agent', installed: true }],
        skills: [
          { name: 's1', type: 'skill', installed: true },
          { name: 's2', type: 'skill', installed: false },
        ],
        prompts: [],
        instructions: [{ name: 'i1', type: 'instruction', installed: true }],
      };

      expect(InteractiveTable.getTotalCount(groups)).to.equal(4);
    });
  });

  describe('getCounts', () => {
    it('returns installed and available counts', () => {
      const groups: GroupedArtifacts = {
        agents: [{ name: 'a1', type: 'agent', installed: true }],
        skills: [
          { name: 's1', type: 'skill', installed: true },
          { name: 's2', type: 'skill', installed: false },
        ],
        prompts: [{ name: 'p1', type: 'prompt', installed: false }],
        instructions: [],
      };

      const counts = InteractiveTable.getCounts(groups);
      expect(counts.installed).to.equal(2);
      expect(counts.available).to.equal(2);
    });
  });

  describe('toSelectChoices', () => {
    it('converts grouped artifacts to select choices', () => {
      const groups: GroupedArtifacts = {
        agents: [{ name: 'agent1', type: 'agent', installed: true }],
        skills: [{ name: 'skill1', type: 'skill', installed: false, description: 'A skill' }],
        prompts: [],
        instructions: [],
      };

      const choices = InteractiveTable.toSelectChoices(groups);

      // Should have separators and items
      const separators = choices.filter((c) => c instanceof Separator);
      expect(separators.length).to.equal(2); // Agents and Skills

      const items = choices.filter((c) => !(c instanceof Separator));
      expect(items.length).to.equal(2);
    });

    it('includes description in display', () => {
      const groups: GroupedArtifacts = {
        agents: [],
        skills: [{ name: 'test', type: 'skill', installed: false, description: 'Test desc' }],
        prompts: [],
        instructions: [],
      };

      const choices = InteractiveTable.toSelectChoices(groups);
      const skillChoice = choices.find(
        (c) => !(c instanceof Separator) && (c as { value: MergedArtifact }).value.name === 'test'
      ) as { name: string };

      expect(skillChoice.name).to.include('Test desc');
    });
  });

  describe('toCheckboxChoices', () => {
    const artifacts: MergedArtifact[] = [
      { name: 'installed1', type: 'skill', installed: true },
      { name: 'available1', type: 'skill', installed: false },
    ];

    it('returns all artifacts without filter', () => {
      const choices = InteractiveTable.toCheckboxChoices(artifacts);
      expect(choices.length).to.equal(2);
    });

    it('filters to installed only', () => {
      const choices = InteractiveTable.toCheckboxChoices(artifacts, 'installed');
      expect(choices.length).to.equal(1);
      expect(choices[0].value.installed).to.equal(true);
    });

    it('filters to available only', () => {
      const choices = InteractiveTable.toCheckboxChoices(artifacts, 'available');
      expect(choices.length).to.equal(1);
      expect(choices[0].value.installed).to.equal(false);
    });

    it('includes status indicator in name', () => {
      const choices = InteractiveTable.toCheckboxChoices(artifacts);

      const installedChoice = choices.find((c) => c.value.name === 'installed1');
      expect(installedChoice?.name).to.include('\u2611'); // Checked box

      const availableChoice = choices.find((c) => c.value.name === 'available1');
      expect(availableChoice?.name).to.include('\u2610'); // Unchecked box
    });
  });
});
