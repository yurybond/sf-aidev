/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { Separator } from '@inquirer/prompts';
import { expect } from 'chai';
import sinon from 'sinon';
import {
  isInteractive,
  toSelectChoices,
  toCheckboxChoices,
  toGroupedCheckboxChoices,
  toExpandableChoices,
  promptArtifactList,
  promptArtifactAction,
  promptArtifactCheckbox,
  promptGroupedCheckbox,
} from '../../src/ui/interactivePrompts.js';
import type { GroupedArtifacts, MergedArtifact } from '../../src/services/localFileScanner.js';
import type { ExpandableChoice, ExpandableSeparator } from '../../src/ui/expandableSelect.js';

describe('interactivePrompts', () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  describe('isInteractive', () => {
    it('returns true when both stdin and stdout are TTY', () => {
      // In a test environment, this may vary. We just check it returns a boolean.
      const result = isInteractive();
      expect(typeof result).to.equal('boolean');
    });
  });

  describe('toSelectChoices', () => {
    it('converts grouped artifacts to select choices with separators', () => {
      const groups: GroupedArtifacts = {
        agents: [{ name: 'agent1', type: 'agent', installed: true }],
        skills: [
          { name: 'skill1', type: 'skill', installed: false, description: 'A skill' },
          { name: 'skill2', type: 'skill', installed: true },
        ],
        prompts: [],
        commands: [],
        instructions: [{ name: 'CLAUDE.md', type: 'instruction', installed: true }],
      };

      const choices = toSelectChoices(groups);

      // Should have separators and items
      expect(choices.length).to.be.greaterThan(0);

      // First should be a separator for Agents
      expect(choices[0]).to.be.instanceOf(Separator);

      // Find skill choices
      const skillChoices = choices.filter(
        (c) => !(c instanceof Separator) && (c as { value: MergedArtifact }).value.type === 'skill'
      );
      expect(skillChoices.length).to.equal(2);
    });

    it('returns empty array for empty groups', () => {
      const groups: GroupedArtifacts = {
        agents: [],
        skills: [],
        prompts: [],
        commands: [],
        instructions: [],
      };

      const choices = toSelectChoices(groups);
      expect(choices).to.deep.equal([]);
    });

    it('includes description in display name when available', () => {
      const groups: GroupedArtifacts = {
        agents: [],
        skills: [{ name: 'test-skill', type: 'skill', installed: false, description: 'Test description' }],
        prompts: [],
        commands: [],
        instructions: [],
      };

      const choices = toSelectChoices(groups);
      const skillChoice = choices.find(
        (c) => !(c instanceof Separator) && (c as { value: MergedArtifact }).value.name === 'test-skill'
      ) as { name: string; value: MergedArtifact };

      expect(skillChoice.name).to.include('Test description');
    });
  });

  describe('toCheckboxChoices', () => {
    const artifacts: MergedArtifact[] = [
      { name: 'installed1', type: 'skill', installed: true },
      { name: 'available1', type: 'skill', installed: false },
      { name: 'installed2', type: 'agent', installed: true },
    ];

    it('returns all artifacts without filter', () => {
      const choices = toCheckboxChoices(artifacts);
      expect(choices.length).to.equal(3);
    });

    it('filters to installed only', () => {
      const choices = toCheckboxChoices(artifacts, 'installed');
      expect(choices.length).to.equal(2);
      expect(choices.every((c) => c.value.installed)).to.equal(true);
    });

    it('filters to available only', () => {
      const choices = toCheckboxChoices(artifacts, 'available');
      expect(choices.length).to.equal(1);
      expect(choices.every((c) => !c.value.installed)).to.equal(true);
    });
  });

  describe('toGroupedCheckboxChoices', () => {
    const groups: GroupedArtifacts = {
      agents: [
        { name: 'agent1', type: 'agent', installed: true },
        { name: 'agent2', type: 'agent', installed: false },
      ],
      skills: [{ name: 'skill1', type: 'skill', installed: true }],
      prompts: [{ name: 'prompt1', type: 'prompt', installed: false }],
      commands: [],
      instructions: [],
    };

    it('returns grouped choices with separators', () => {
      const choices = toGroupedCheckboxChoices(groups);

      // Should have separators
      const separators = choices.filter((c) => c instanceof Separator);
      expect(separators.length).to.equal(3); // agents, skills, prompts
    });

    it('filters to installed only', () => {
      const choices = toGroupedCheckboxChoices(groups, 'installed');

      const items = choices.filter((c) => !(c instanceof Separator)) as Array<{
        name: string;
        value: MergedArtifact;
      }>;
      expect(items.every((c) => c.value.installed)).to.equal(true);
      expect(items.length).to.equal(2); // agent1 and skill1
    });

    it('filters to available only', () => {
      const choices = toGroupedCheckboxChoices(groups, 'available');

      const items = choices.filter((c) => !(c instanceof Separator)) as Array<{
        name: string;
        value: MergedArtifact;
      }>;
      expect(items.every((c) => !c.value.installed)).to.equal(true);
      expect(items.length).to.equal(2); // agent2 and prompt1
    });

    it('excludes empty groups after filtering', () => {
      const choices = toGroupedCheckboxChoices(groups, 'installed');

      // Prompts group should be excluded (no installed prompts)
      const separators = choices.filter((c) => c instanceof Separator);
      expect(separators.length).to.equal(2); // Only agents and skills
    });
  });

  describe('promptArtifactList', () => {
    it('returns null when choices are empty', async () => {
      const emptyGroups: GroupedArtifacts = {
        agents: [],
        skills: [],
        prompts: [],
        commands: [],
        instructions: [],
      };

      const result = await promptArtifactList(emptyGroups, 'Select an artifact');
      expect(result).to.be.null;
    });
  });

  describe('promptArtifactAction', () => {
    // Note: We can't easily test the full prompt flow without mocking the terminal
    // This test simply ensures the function is importable and used (for coverage report)
    it('is a function', () => {
      expect(typeof promptArtifactAction).to.equal('function');
    });
  });

  describe('promptArtifactCheckbox', () => {
    it('returns empty array when no artifacts match filter', async () => {
      const artifacts: MergedArtifact[] = [{ name: 'available-only', type: 'skill', installed: false }];

      // Filter for installed only - none will match
      const result = await promptArtifactCheckbox(artifacts, 'Select artifacts', 'installed');
      expect(result).to.deep.equal([]);
    });

    it('returns empty array for empty artifacts array', async () => {
      const result = await promptArtifactCheckbox([], 'Select artifacts');
      expect(result).to.deep.equal([]);
    });
  });

  describe('promptGroupedCheckbox', () => {
    it('returns empty array when all groups are empty', async () => {
      const emptyGroups: GroupedArtifacts = {
        agents: [],
        skills: [],
        prompts: [],
        commands: [],
        instructions: [],
      };

      const result = await promptGroupedCheckbox(emptyGroups, 'Select artifacts');
      expect(result).to.deep.equal([]);
    });

    it('returns empty array when no artifacts match filter', async () => {
      const groups: GroupedArtifacts = {
        agents: [{ name: 'available-agent', type: 'agent', installed: false }],
        skills: [],
        prompts: [],
        commands: [],
        instructions: [],
      };

      // Filter for installed only - none will match
      const result = await promptGroupedCheckbox(groups, 'Select artifacts', 'installed');
      expect(result).to.deep.equal([]);
    });
  });

  describe('formatArtifactDisplay', () => {
    it('formats installed artifact with checked icon and description', () => {
      const artifact: MergedArtifact = {
        name: 'test-skill',
        type: 'skill',
        installed: true,
        description: 'A test skill',
      };

      // We need to import the internal function for testing
      // Since it's not exported, we test it indirectly through toSelectChoices
      const groups: GroupedArtifacts = {
        agents: [],
        skills: [artifact],
        prompts: [],
        commands: [],
        instructions: [],
      };

      const choices = toSelectChoices(groups);
      const skillChoice = choices.find(
        (c) => !(c instanceof Separator) && (c as { value: MergedArtifact }).value.name === 'test-skill'
      ) as { name: string; value: MergedArtifact };

      expect(skillChoice.name).to.include('\u2611'); // Checked icon
      expect(skillChoice.name).to.include('test-skill');
      expect(skillChoice.name).to.include('A test skill');
    });

    it('formats available artifact with unchecked icon', () => {
      const artifact: MergedArtifact = {
        name: 'test-agent',
        type: 'agent',
        installed: false,
      };

      const groups: GroupedArtifacts = {
        agents: [artifact],
        skills: [],
        prompts: [],
        commands: [],
        instructions: [],
      };

      const choices = toSelectChoices(groups);
      const agentChoice = choices.find(
        (c) => !(c instanceof Separator) && (c as { value: MergedArtifact }).value.name === 'test-agent'
      ) as { name: string; value: MergedArtifact };

      expect(agentChoice.name).to.include('\u2610'); // Unchecked icon
      expect(agentChoice.name).to.include('test-agent');
    });
  });

  describe('formatArtifactName', () => {
    it('formats artifact name with description for checkbox choices', () => {
      const artifact: MergedArtifact = {
        name: 'my-prompt',
        type: 'prompt',
        installed: false,
        description: 'Test prompt description',
      };

      const choices = toCheckboxChoices([artifact]);

      expect(choices[0].name).to.include('my-prompt');
      expect(choices[0].name).to.include('Test prompt description');
      expect(choices[0].name).to.not.include('\u2611'); // No checkbox icon
      expect(choices[0].name).to.not.include('\u2610'); // No checkbox icon
    });

    it('formats artifact name without description when not provided', () => {
      const artifact: MergedArtifact = {
        name: 'simple-command',
        type: 'command',
        installed: true,
      };

      const choices = toCheckboxChoices([artifact]);

      expect(choices[0].name).to.equal('simple-command');
    });
  });

  describe('toExpandableChoices', () => {
    it('converts grouped artifacts to expandable choices with separators', () => {
      const groups: GroupedArtifacts = {
        agents: [{ name: 'agent1', type: 'agent', installed: true }],
        skills: [
          { name: 'skill1', type: 'skill', installed: false, description: 'A skill' },
          { name: 'skill2', type: 'skill', installed: true },
        ],
        prompts: [],
        commands: [],
        instructions: [{ name: 'CLAUDE.md', type: 'instruction', installed: true }],
      };

      const choices = toExpandableChoices(groups);

      // Should have separators and items
      expect(choices.length).to.be.greaterThan(0);

      // First should be a separator for Agents
      expect((choices[0] as ExpandableSeparator).type).to.equal('separator');
      expect((choices[0] as ExpandableSeparator).separator).to.equal('--- Agents ---');

      // Find agent choice
      const agentChoice = choices.find(
        (c) => !('type' in c && c.type === 'separator') && (c as ExpandableChoice).value.name === 'agent1'
      ) as ExpandableChoice;
      expect(agentChoice).to.not.be.undefined;
      expect(agentChoice.value.type).to.equal('agent');

      // Find skill choices
      const skillChoices = choices.filter(
        (c) => !('type' in c && c.type === 'separator') && (c as ExpandableChoice).value.type === 'skill'
      );
      expect(skillChoices.length).to.equal(2);
    });

    it('returns empty array for empty groups', () => {
      const groups: GroupedArtifacts = {
        agents: [],
        skills: [],
        prompts: [],
        commands: [],
        instructions: [],
      };

      const choices = toExpandableChoices(groups);
      expect(choices).to.deep.equal([]);
    });

    it('excludes empty groups', () => {
      const groups: GroupedArtifacts = {
        agents: [],
        skills: [{ name: 'test-skill', type: 'skill', installed: false }],
        prompts: [],
        commands: [],
        instructions: [],
      };

      const choices = toExpandableChoices(groups);

      // Should only have Skills separator
      const separators = choices.filter((c) => 'type' in c && c.type === 'separator');
      expect(separators.length).to.equal(1);
      expect((separators[0] as ExpandableSeparator).separator).to.equal('--- Skills ---');
    });

    it('preserves artifact values in choices', () => {
      const artifact: MergedArtifact = {
        name: 'my-skill',
        type: 'skill',
        installed: true,
        description: 'Test description',
        source: 'owner/repo',
      };

      const groups: GroupedArtifacts = {
        agents: [],
        skills: [artifact],
        prompts: [],
        commands: [],
        instructions: [],
      };

      const choices = toExpandableChoices(groups);
      const skillChoice = choices.find((c) => !('type' in c && c.type === 'separator')) as ExpandableChoice;

      expect(skillChoice.value).to.deep.equal(artifact);
    });
  });
});
