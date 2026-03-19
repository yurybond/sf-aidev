/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect } from 'chai';
import { LocalFileScanner, type ScannedArtifact, type MergedArtifact } from '../../src/services/localFileScanner.js';

describe('LocalFileScanner', () => {
  let testDir: string;

  beforeEach(async () => {
    // Create a unique temp directory for each test
    testDir = join(tmpdir(), `localfilescanner-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('scanAgents', () => {
    it('should scan agents from copilot directory', async () => {
      // Setup: .github/agents with one agent
      const agentsDir = join(testDir, '.github', 'agents');
      await mkdir(agentsDir, { recursive: true });
      await mkdir(join(agentsDir, 'my-agent'));

      const result = await LocalFileScanner.scanAgents(testDir);

      expect(result).to.have.lengthOf(1);
      expect(result[0]).to.deep.include({
        name: 'my-agent',
        type: 'agent',
        installed: true,
      });
    });

    it('should scan agents from claude directory', async () => {
      const agentsDir = join(testDir, '.claude', 'agents');
      await mkdir(agentsDir, { recursive: true });
      await mkdir(join(agentsDir, 'claude-agent'));

      const result = await LocalFileScanner.scanAgents(testDir);

      expect(result).to.have.lengthOf(1);
      expect(result[0].name).to.equal('claude-agent');
    });

    it('should scan agents from both copilot and claude directories', async () => {
      await mkdir(join(testDir, '.github', 'agents'), { recursive: true });
      await mkdir(join(testDir, '.github', 'agents', 'copilot-agent'));
      await mkdir(join(testDir, '.claude', 'agents'), { recursive: true });
      await mkdir(join(testDir, '.claude', 'agents', 'claude-agent'));

      const result = await LocalFileScanner.scanAgents(testDir);

      expect(result).to.have.lengthOf(2);
      const names = result.map((a) => a.name);
      expect(names).to.include('copilot-agent');
      expect(names).to.include('claude-agent');
    });

    it('should deduplicate agents with same name', async () => {
      await mkdir(join(testDir, '.github', 'agents'), { recursive: true });
      await mkdir(join(testDir, '.github', 'agents', 'shared-agent'));
      await mkdir(join(testDir, '.claude', 'agents'), { recursive: true });
      await mkdir(join(testDir, '.claude', 'agents', 'shared-agent'));

      const result = await LocalFileScanner.scanAgents(testDir);

      expect(result).to.have.lengthOf(1);
      expect(result[0].name).to.equal('shared-agent');
    });

    it('should return empty array when no directories exist', async () => {
      const result = await LocalFileScanner.scanAgents(testDir);

      expect(result).to.deep.equal([]);
    });
  });

  describe('scanSkills', () => {
    it('should scan skills and strip .md extension', async () => {
      const skillsDir = join(testDir, '.github', 'copilot-skills');
      await mkdir(skillsDir, { recursive: true });
      await writeFile(join(skillsDir, 'my-skill.md'), '# My Skill');
      await writeFile(join(skillsDir, 'other-skill.md'), '# Other Skill');

      const result = await LocalFileScanner.scanSkills(testDir);

      expect(result).to.have.lengthOf(2);
      const names = result.map((s) => s.name);
      expect(names).to.include('my-skill');
      expect(names).to.include('other-skill');
    });

    it('should handle skills without .md extension', async () => {
      const skillsDir = join(testDir, '.github', 'copilot-skills');
      await mkdir(skillsDir, { recursive: true });
      await mkdir(join(skillsDir, 'skill-folder'));

      const result = await LocalFileScanner.scanSkills(testDir);

      expect(result).to.have.lengthOf(1);
      expect(result[0].name).to.equal('skill-folder');
    });

    it('should return empty array when no skills exist', async () => {
      const result = await LocalFileScanner.scanSkills(testDir);

      expect(result).to.deep.equal([]);
    });
  });

  describe('scanPrompts', () => {
    it('should scan prompts from copilot directory', async () => {
      const promptsDir = join(testDir, '.github', 'prompts');
      await mkdir(promptsDir, { recursive: true });
      await writeFile(join(promptsDir, 'deploy.md'), '# Deploy');
      await writeFile(join(promptsDir, 'review.md'), '# Review');

      const result = await LocalFileScanner.scanPrompts(testDir);

      expect(result).to.have.lengthOf(2);
      const names = result.map((p) => p.name);
      expect(names).to.include('deploy.md');
      expect(names).to.include('review.md');
    });

    it('should scan prompts from claude commands directory', async () => {
      const commandsDir = join(testDir, '.claude', 'commands');
      await mkdir(commandsDir, { recursive: true });
      await writeFile(join(commandsDir, 'test-cmd.md'), '# Test');

      const result = await LocalFileScanner.scanPrompts(testDir);

      expect(result).to.have.lengthOf(1);
      expect(result[0].name).to.equal('test-cmd.md');
    });
  });

  describe('scanInstructions', () => {
    it('should find CLAUDE.md in project root', async () => {
      await writeFile(join(testDir, 'CLAUDE.md'), '# Claude Instructions');

      const result = await LocalFileScanner.scanInstructions(testDir);

      expect(result).to.have.lengthOf(1);
      expect(result[0].name).to.equal('CLAUDE.md');
      expect(result[0].type).to.equal('instruction');
      expect(result[0].installed).to.be.true;
    });

    it('should find copilot-instructions.md in .github', async () => {
      await mkdir(join(testDir, '.github'), { recursive: true });
      await writeFile(join(testDir, '.github', 'copilot-instructions.md'), '# Copilot');

      const result = await LocalFileScanner.scanInstructions(testDir);

      expect(result).to.have.lengthOf(1);
      expect(result[0].name).to.equal('copilot-instructions.md');
    });

    it('should find *.instructions.md files', async () => {
      await writeFile(join(testDir, 'apex.instructions.md'), '# Apex');
      await writeFile(join(testDir, 'lwc.instructions.md'), '# LWC');

      const result = await LocalFileScanner.scanInstructions(testDir);

      expect(result).to.have.lengthOf(2);
      const names = result.map((i) => i.name);
      expect(names).to.include('apex.instructions.md');
      expect(names).to.include('lwc.instructions.md');
    });

    it('should find all known instruction file types', async () => {
      await writeFile(join(testDir, 'CLAUDE.md'), '# Claude');
      await writeFile(join(testDir, 'CURSOR.md'), '# Cursor');
      await writeFile(join(testDir, 'CODEX.md'), '# Codex');

      const result = await LocalFileScanner.scanInstructions(testDir);

      expect(result).to.have.lengthOf(3);
      const names = result.map((i) => i.name);
      expect(names).to.include('CLAUDE.md');
      expect(names).to.include('CURSOR.md');
      expect(names).to.include('CODEX.md');
    });

    it('should deduplicate files with same name', async () => {
      // Same file name in root and .github
      await writeFile(join(testDir, 'copilot-instructions.md'), '# Root');
      await mkdir(join(testDir, '.github'), { recursive: true });
      await writeFile(join(testDir, '.github', 'copilot-instructions.md'), '# GitHub');

      const result = await LocalFileScanner.scanInstructions(testDir);

      // Should only return one (the first one found)
      expect(result).to.have.lengthOf(1);
    });

    it('should return empty when no instruction files exist', async () => {
      const result = await LocalFileScanner.scanInstructions(testDir);

      expect(result).to.deep.equal([]);
    });
  });

  describe('scanAll', () => {
    it('should scan all artifact types', async () => {
      // Create one of each type
      await mkdir(join(testDir, '.github', 'agents'), { recursive: true });
      await mkdir(join(testDir, '.github', 'agents', 'agent1'));
      await mkdir(join(testDir, '.github', 'copilot-skills'), { recursive: true });
      await writeFile(join(testDir, '.github', 'copilot-skills', 'skill1.md'), '# Skill');
      await mkdir(join(testDir, '.github', 'prompts'), { recursive: true });
      await writeFile(join(testDir, '.github', 'prompts', 'prompt1.md'), '# Prompt');

      const result = await LocalFileScanner.scanAll(testDir);

      expect(result).to.have.lengthOf(3);
      const types = result.map((a) => a.type);
      expect(types).to.include('agent');
      expect(types).to.include('skill');
      expect(types).to.include('prompt');
    });

    it('should return empty when no artifacts exist', async () => {
      const result = await LocalFileScanner.scanAll(testDir);

      expect(result).to.deep.equal([]);
    });
  });

  describe('mergeArtifacts', () => {
    it('should merge local and manifest artifacts', () => {
      const local: ScannedArtifact[] = [{ name: 'local-skill', type: 'skill', installed: true, path: '/path' }];
      const manifest = [
        {
          name: 'remote-skill',
          type: 'skill' as const,
          description: 'A skill',
          source: 'owner/repo',
          installed: false,
        },
      ];

      const result = LocalFileScanner.mergeArtifacts(local, manifest);

      expect(result).to.have.lengthOf(2);
      expect(result.find((a) => a.name === 'local-skill')?.installed).to.be.true;
      expect(result.find((a) => a.name === 'remote-skill')?.installed).to.be.false;
    });

    it('should keep local entry when duplicate exists', () => {
      const local: ScannedArtifact[] = [{ name: 'shared-skill', type: 'skill', installed: true, path: '/path' }];
      const manifest = [
        {
          name: 'shared-skill',
          type: 'skill' as const,
          description: 'Remote version',
          source: 'owner/repo',
          installed: false,
        },
      ];

      const result = LocalFileScanner.mergeArtifacts(local, manifest);

      expect(result).to.have.lengthOf(1);
      expect(result[0].installed).to.be.true;
      expect(result[0].description).to.equal('Remote version'); // Gets description from manifest
    });

    it('should preserve description from manifest for local artifacts', () => {
      const local: ScannedArtifact[] = [{ name: 'my-skill', type: 'skill', installed: true, path: '/path' }];
      const manifest = [
        {
          name: 'my-skill',
          type: 'skill' as const,
          description: 'Helpful description',
          source: 'owner/repo',
          installed: true,
        },
      ];

      const result = LocalFileScanner.mergeArtifacts(local, manifest);

      expect(result).to.have.lengthOf(1);
      expect(result[0].description).to.equal('Helpful description');
    });

    it('should handle empty inputs', () => {
      const result = LocalFileScanner.mergeArtifacts([], []);
      expect(result).to.deep.equal([]);
    });
  });

  describe('groupByType', () => {
    it('should group artifacts by type', () => {
      const artifacts: MergedArtifact[] = [
        { name: 'agent1', type: 'agent', installed: true },
        { name: 'skill1', type: 'skill', installed: true },
        { name: 'skill2', type: 'skill', installed: false },
        { name: 'prompt1', type: 'prompt', installed: true },
      ];

      const result = LocalFileScanner.groupByType(artifacts);

      expect(result.agents).to.have.lengthOf(1);
      expect(result.skills).to.have.lengthOf(2);
      expect(result.prompts).to.have.lengthOf(1);
      expect(result.instructions).to.have.lengthOf(0);
    });

    it('should sort artifacts alphabetically within groups', () => {
      const artifacts: MergedArtifact[] = [
        { name: 'zebra-skill', type: 'skill', installed: true },
        { name: 'alpha-skill', type: 'skill', installed: false },
        { name: 'beta-skill', type: 'skill', installed: true },
      ];

      const result = LocalFileScanner.groupByType(artifacts);

      expect(result.skills[0].name).to.equal('alpha-skill');
      expect(result.skills[1].name).to.equal('beta-skill');
      expect(result.skills[2].name).to.equal('zebra-skill');
    });

    it('should include instructions when provided', () => {
      const artifacts: MergedArtifact[] = [];
      const instructions = [{ name: 'CLAUDE.md', type: 'instruction' as const, installed: true, path: '/path' }];

      const result = LocalFileScanner.groupByType(artifacts, instructions);

      expect(result.instructions).to.have.lengthOf(1);
      expect(result.instructions[0].name).to.equal('CLAUDE.md');
    });

    it('should return empty groups when no artifacts', () => {
      const result = LocalFileScanner.groupByType([]);

      expect(result.agents).to.deep.equal([]);
      expect(result.skills).to.deep.equal([]);
      expect(result.prompts).to.deep.equal([]);
      expect(result.instructions).to.deep.equal([]);
    });
  });
});
