/*
 * Copyright (c) 2024, Yury Bondarau
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 */

import { expect } from 'chai';
import { ManifestBuilder } from '../../src/sources/manifestBuilder.js';

describe('ManifestBuilder', () => {
  describe('build', () => {
    describe('generic patterns', () => {
      it('discovers agents from agents/ directory', () => {
        const paths = ['agents/my-agent.md'];
        const manifest = ManifestBuilder.build(paths);

        expect(manifest.version).to.equal('auto');
        expect(manifest.artifacts).to.have.length(1);
        expect(manifest.artifacts[0].name).to.equal('my-agent');
        expect(manifest.artifacts[0].type).to.equal('agent');
        expect(manifest.artifacts[0].tools).to.be.undefined;
        expect(manifest.artifacts[0].files[0].source).to.equal('agents/my-agent.md');
      });

      it('discovers prompts from prompts/ directory', () => {
        const paths = ['prompts/deploy-checklist.md'];
        const manifest = ManifestBuilder.build(paths);

        expect(manifest.artifacts).to.have.length(1);
        expect(manifest.artifacts[0].name).to.equal('deploy-checklist');
        expect(manifest.artifacts[0].type).to.equal('prompt');
      });
    });

    describe('skill directory discovery', () => {
      it('discovers skills as directories with multiple files', () => {
        const paths = ['skills/code-review/index.md', 'skills/code-review/helpers.md'];
        const manifest = ManifestBuilder.build(paths);

        expect(manifest.artifacts).to.have.length(1);
        expect(manifest.artifacts[0].name).to.equal('code-review');
        expect(manifest.artifacts[0].type).to.equal('skill');
        expect(manifest.artifacts[0].tools).to.be.undefined;
        expect(manifest.artifacts[0].files).to.have.length(2);
        expect(manifest.artifacts[0].files.map((f) => f.source)).to.include('skills/code-review/index.md');
        expect(manifest.artifacts[0].files.map((f) => f.source)).to.include('skills/code-review/helpers.md');
      });

      it('discovers skill directory with single file', () => {
        const paths = ['skills/simple-skill/main.md'];
        const manifest = ManifestBuilder.build(paths);

        expect(manifest.artifacts).to.have.length(1);
        expect(manifest.artifacts[0].name).to.equal('simple-skill');
        expect(manifest.artifacts[0].type).to.equal('skill');
        expect(manifest.artifacts[0].files).to.have.length(1);
      });

      it('discovers multiple skill directories', () => {
        const paths = ['skills/skill-a/index.md', 'skills/skill-b/main.md', 'skills/skill-b/helper.md'];
        const manifest = ManifestBuilder.build(paths);

        expect(manifest.artifacts).to.have.length(2);
        const skillA = manifest.artifacts.find((a) => a.name === 'skill-a');
        const skillB = manifest.artifacts.find((a) => a.name === 'skill-b');

        expect(skillA?.files).to.have.length(1);
        expect(skillB?.files).to.have.length(2);
      });

      it('discovers tool-specific skill directories', () => {
        const paths = ['.claude/skills/claude-skill/index.md', '.claude/skills/claude-skill/utils.md'];
        const manifest = ManifestBuilder.build(paths);

        expect(manifest.artifacts).to.have.length(1);
        expect(manifest.artifacts[0].name).to.equal('claude-skill');
        expect(manifest.artifacts[0].type).to.equal('skill');
        expect(manifest.artifacts[0].tools).to.deep.equal(['claude']);
        expect(manifest.artifacts[0].files).to.have.length(2);
      });

      it('ignores files directly in skills/ without subdirectory', () => {
        const paths = ['skills/standalone-file.md'];
        const manifest = ManifestBuilder.build(paths);

        // Files directly in skills/ don't match the directory pattern
        expect(manifest.artifacts).to.be.an('array').that.is.empty;
      });
    });

    describe('claude patterns', () => {
      it('discovers .claude/agents/* as claude agent', () => {
        const paths = ['.claude/agents/test-agent.md'];
        const manifest = ManifestBuilder.build(paths);

        expect(manifest.artifacts).to.have.length(1);
        expect(manifest.artifacts[0].type).to.equal('agent');
        expect(manifest.artifacts[0].tools).to.deep.equal(['claude']);
      });

      it('discovers .claude/skills/* as claude skill directory', () => {
        const paths = ['.claude/skills/test-skill/main.md'];
        const manifest = ManifestBuilder.build(paths);

        expect(manifest.artifacts).to.have.length(1);
        expect(manifest.artifacts[0].type).to.equal('skill');
        expect(manifest.artifacts[0].name).to.equal('test-skill');
        expect(manifest.artifacts[0].tools).to.deep.equal(['claude']);
      });

      it('discovers CLAUDE.md as claude prompt', () => {
        const paths = ['CLAUDE.md'];
        const manifest = ManifestBuilder.build(paths);

        expect(manifest.artifacts).to.have.length(1);
        expect(manifest.artifacts[0].name).to.equal('CLAUDE');
        expect(manifest.artifacts[0].type).to.equal('prompt');
        expect(manifest.artifacts[0].tools).to.deep.equal(['claude']);
      });

      it('discovers .claude/CLAUDE.md as claude prompt', () => {
        const paths = ['.claude/CLAUDE.md'];
        const manifest = ManifestBuilder.build(paths);

        expect(manifest.artifacts).to.have.length(1);
        expect(manifest.artifacts[0].type).to.equal('prompt');
        expect(manifest.artifacts[0].tools).to.deep.equal(['claude']);
      });
    });

    describe('copilot patterns', () => {
      it('discovers .github/copilot-instructions.md as copilot prompt', () => {
        const paths = ['.github/copilot-instructions.md'];
        const manifest = ManifestBuilder.build(paths);

        expect(manifest.artifacts).to.have.length(1);
        expect(manifest.artifacts[0].name).to.equal('copilot-instructions');
        expect(manifest.artifacts[0].type).to.equal('prompt');
        expect(manifest.artifacts[0].tools).to.deep.equal(['copilot']);
      });

      it('discovers .github/skills/* as copilot skill directory', () => {
        const paths = ['.github/skills/code-analysis/main.md'];
        const manifest = ManifestBuilder.build(paths);

        expect(manifest.artifacts).to.have.length(1);
        expect(manifest.artifacts[0].name).to.equal('code-analysis');
        expect(manifest.artifacts[0].type).to.equal('skill');
        expect(manifest.artifacts[0].tools).to.deep.equal(['copilot']);
      });

      it('discovers .github/agents/* as copilot agent', () => {
        const paths = ['.github/agents/assistant.md'];
        const manifest = ManifestBuilder.build(paths);

        expect(manifest.artifacts).to.have.length(1);
        expect(manifest.artifacts[0].type).to.equal('agent');
        expect(manifest.artifacts[0].tools).to.deep.equal(['copilot']);
      });

      it('discovers .github/prompts/* as copilot prompt', () => {
        const paths = ['.github/prompts/review.md'];
        const manifest = ManifestBuilder.build(paths);

        expect(manifest.artifacts).to.have.length(1);
        expect(manifest.artifacts[0].type).to.equal('prompt');
        expect(manifest.artifacts[0].tools).to.deep.equal(['copilot']);
      });
    });

    describe('cursor patterns', () => {
      it('discovers .cursor/skills/* as cursor skill directory', () => {
        const paths = ['.cursor/skills/refactor/index.md'];
        const manifest = ManifestBuilder.build(paths);

        expect(manifest.artifacts).to.have.length(1);
        expect(manifest.artifacts[0].name).to.equal('refactor');
        expect(manifest.artifacts[0].type).to.equal('skill');
        expect(manifest.artifacts[0].tools).to.deep.equal(['cursor']);
      });

      it('discovers .cursor/agents/* as cursor agent', () => {
        const paths = ['.cursor/agents/helper.md'];
        const manifest = ManifestBuilder.build(paths);

        expect(manifest.artifacts).to.have.length(1);
        expect(manifest.artifacts[0].type).to.equal('agent');
        expect(manifest.artifacts[0].tools).to.deep.equal(['cursor']);
      });

      it('discovers .cursorrules as cursor prompt', () => {
        const paths = ['.cursorrules'];
        const manifest = ManifestBuilder.build(paths);

        expect(manifest.artifacts).to.have.length(1);
        expect(manifest.artifacts[0].name).to.equal('.cursorrules');
        expect(manifest.artifacts[0].type).to.equal('prompt');
        expect(manifest.artifacts[0].tools).to.deep.equal(['cursor']);
      });
    });

    describe('gemini patterns', () => {
      it('discovers .gemini/agents/* as gemini agent', () => {
        const paths = ['.gemini/agents/assistant.md'];
        const manifest = ManifestBuilder.build(paths);

        expect(manifest.artifacts).to.have.length(1);
        expect(manifest.artifacts[0].type).to.equal('agent');
        expect(manifest.artifacts[0].tools).to.deep.equal(['gemini']);
      });

      it('discovers .gemini/skills/* as gemini skill directory', () => {
        const paths = ['.gemini/skills/test/main.md'];
        const manifest = ManifestBuilder.build(paths);

        expect(manifest.artifacts).to.have.length(1);
        expect(manifest.artifacts[0].name).to.equal('test');
        expect(manifest.artifacts[0].type).to.equal('skill');
        expect(manifest.artifacts[0].tools).to.deep.equal(['gemini']);
      });
    });

    describe('codex patterns', () => {
      it('discovers .codex/agents/* as codex agent', () => {
        const paths = ['.codex/agents/coder.md'];
        const manifest = ManifestBuilder.build(paths);

        expect(manifest.artifacts).to.have.length(1);
        expect(manifest.artifacts[0].type).to.equal('agent');
        expect(manifest.artifacts[0].tools).to.deep.equal(['codex']);
      });

      it('discovers .codex/skills/* as codex skill directory', () => {
        const paths = ['.codex/skills/debug/main.md'];
        const manifest = ManifestBuilder.build(paths);

        expect(manifest.artifacts).to.have.length(1);
        expect(manifest.artifacts[0].name).to.equal('debug');
        expect(manifest.artifacts[0].type).to.equal('skill');
        expect(manifest.artifacts[0].tools).to.deep.equal(['codex']);
      });
    });

    describe('edge cases', () => {
      it('returns empty artifacts for empty path list', () => {
        const manifest = ManifestBuilder.build([]);

        expect(manifest.version).to.equal('auto');
        expect(manifest.artifacts).to.be.an('array').that.is.empty;
      });

      it('ignores files that do not match any pattern', () => {
        const paths = ['README.md', 'src/index.ts', 'package.json', 'random/file.md'];
        const manifest = ManifestBuilder.build(paths);

        expect(manifest.artifacts).to.be.an('array').that.is.empty;
      });

      it('extracts name correctly from various file extensions', () => {
        const paths = ['agents/agent.md', 'prompts/prompt.txt'];
        const manifest = ManifestBuilder.build(paths);

        expect(manifest.artifacts).to.have.length(2);
        expect(manifest.artifacts[0].name).to.equal('agent');
        expect(manifest.artifacts[1].name).to.equal('prompt');
      });

      it('handles files with multiple dots in name', () => {
        const paths = ['agents/my.agent.test.md'];
        const manifest = ManifestBuilder.build(paths);

        expect(manifest.artifacts).to.have.length(1);
        expect(manifest.artifacts[0].name).to.equal('my.agent.test');
      });
    });

    describe('combined discovery', () => {
      it('discovers artifacts from multiple tool directories', () => {
        const paths = [
          '.claude/skills/claude-skill/index.md',
          '.github/agents/copilot-agent.md',
          'agents/generic-agent.md',
          'README.md',
          'src/index.ts',
        ];
        const manifest = ManifestBuilder.build(paths);

        expect(manifest.artifacts).to.have.length(3);

        const claudeSkill = manifest.artifacts.find((a) => a.name === 'claude-skill');
        expect(claudeSkill?.type).to.equal('skill');
        expect(claudeSkill?.tools).to.deep.equal(['claude']);

        const copilotAgent = manifest.artifacts.find((a) => a.name === 'copilot-agent');
        expect(copilotAgent?.type).to.equal('agent');
        expect(copilotAgent?.tools).to.deep.equal(['copilot']);

        const genericAgent = manifest.artifacts.find((a) => a.name === 'generic-agent');
        expect(genericAgent?.type).to.equal('agent');
        expect(genericAgent?.tools).to.be.undefined;
      });

      it('applies first matching rule when multiple could match', () => {
        // This tests that pattern order matters
        const paths = ['agents/test.md'];
        const manifest = ManifestBuilder.build(paths);

        expect(manifest.artifacts).to.have.length(1);
        expect(manifest.artifacts[0].type).to.equal('agent');
        // Generic pattern should match, not tool-specific
        expect(manifest.artifacts[0].tools).to.be.undefined;
      });
    });

    describe('auto-discovered artifacts', () => {
      it('does not generate description for auto-discovered artifacts', () => {
        const paths = ['agents/my-agent.md'];
        const manifest = ManifestBuilder.build(paths);

        expect(manifest.artifacts[0].description).to.be.undefined;
      });

      it('does not generate description for skill directories', () => {
        const paths = ['skills/my-skill/index.md'];
        const manifest = ManifestBuilder.build(paths);

        expect(manifest.artifacts[0].description).to.be.undefined;
      });
    });
  });
});
