/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { join } from 'node:path';
import { SfError } from '@salesforce/core';
import { expect } from 'chai';
import { PathResolver } from '../../src/installers/pathResolver.js';

describe('PathResolver', () => {
  const projectPath = '/test/project';

  describe('getBasePath', () => {
    it('returns correct path for copilot skills', () => {
      expect(PathResolver.getBasePath('skill', 'copilot')).to.equal('.github/copilot-skills');
    });

    it('returns correct path for claude skills', () => {
      expect(PathResolver.getBasePath('skill', 'claude')).to.equal('.claude/skills');
    });

    it('returns correct path for copilot agents', () => {
      expect(PathResolver.getBasePath('agent', 'copilot')).to.equal('.github/agents');
    });

    it('returns correct path for claude agents', () => {
      expect(PathResolver.getBasePath('agent', 'claude')).to.equal('.claude/agents');
    });

    it('returns correct path for copilot prompts', () => {
      expect(PathResolver.getBasePath('prompt', 'copilot')).to.equal('.github/prompts');
    });

    it('returns correct path for claude prompts', () => {
      expect(PathResolver.getBasePath('prompt', 'claude')).to.equal('.claude/commands');
    });

    it('throws error for unsupported tool', () => {
      try {
        PathResolver.getBasePath('skill', 'unsupported');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.instanceOf(SfError);
        expect((error as SfError).name).to.equal('UnsupportedTool');
      }
    });
  });

  describe('resolve', () => {
    it('resolves full path for skill', () => {
      const result = PathResolver.resolve('skill', 'copilot', 'my-skill', projectPath);
      expect(result).to.equal(join(projectPath, '.github/copilot-skills', 'my-skill'));
    });

    it('resolves full path for agent', () => {
      const result = PathResolver.resolve('agent', 'claude', 'my-agent', projectPath);
      expect(result).to.equal(join(projectPath, '.claude/agents', 'my-agent'));
    });

    it('resolves full path for prompt', () => {
      const result = PathResolver.resolve('prompt', 'copilot', 'my-prompt', projectPath);
      expect(result).to.equal(join(projectPath, '.github/prompts', 'my-prompt'));
    });
  });

  describe('resolveFile', () => {
    it('resolves file path within artifact', () => {
      const result = PathResolver.resolveFile('skill', 'copilot', 'my-skill', 'SKILL.md', projectPath);
      expect(result).to.equal(join(projectPath, '.github/copilot-skills', 'my-skill', 'SKILL.md'));
    });
  });

  describe('getSupportedTools', () => {
    it('returns supported tools for skills', () => {
      const tools = PathResolver.getSupportedTools('skill');
      expect(tools).to.include.members(['copilot', 'claude']);
    });

    it('returns supported tools for agents', () => {
      const tools = PathResolver.getSupportedTools('agent');
      expect(tools).to.include.members(['copilot', 'claude']);
    });

    it('returns supported tools for prompts', () => {
      const tools = PathResolver.getSupportedTools('prompt');
      expect(tools).to.include.members(['copilot', 'claude']);
    });
  });

  describe('isToolSupported', () => {
    it('returns true for supported tool', () => {
      expect(PathResolver.isToolSupported('skill', 'copilot')).to.be.true;
      expect(PathResolver.isToolSupported('skill', 'claude')).to.be.true;
    });

    it('returns false for unsupported tool', () => {
      expect(PathResolver.isToolSupported('skill', 'unknown')).to.be.false;
    });
  });
});
