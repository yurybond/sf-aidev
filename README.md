# sf-aidev

[![NPM](https://img.shields.io/npm/v/sf-aidev.svg?label=sf-aidev)](https://www.npmjs.com/package/sf-aidev) [![Downloads/week](https://img.shields.io/npm/dw/sf-aidev.svg)](https://npmjs.org/package/sf-aidev) [![License](https://img.shields.io/badge/License-BSD%203--Clause-brightgreen.svg)](https://raw.githubusercontent.com/salesforcecli/sf-aidev/main/LICENSE.txt)

Salesforce CLI plugin that installs production-ready AI development tool configurations (skills, agents, prompts, commands) from GitHub source repositories. Auto-detects which AI tool is in use, supports multiple tools, and provides unified management commands with rich interactive experiences.

## Install

```bash
sf plugins install sf-aidev
```

## Quick Start

```bash
# Initialize — detects your AI tool, configures source, installs artifacts
sf aidev init

# Interactive multi-select picker (browse and select multiple artifacts)
sf aidev add

# Or add individual artifacts by name
sf aidev add skill --name apex-review
sf aidev add agent --name code-helper
sf aidev add prompt --name deploy-checklist
sf aidev add command --name review-pr

# Manage sources
sf aidev source add myorg/ai-templates --set-default
sf aidev source list
```

## Commands

### `sf aidev init`

Initialize AI development tools in your project. Auto-detects the AI tool in use, configures a source repository, and optionally installs available artifacts.

```bash
sf aidev init
sf aidev init --tool copilot --source owner/ai-dev-lifecycle
sf aidev init --no-install --no-prompt
```

| Flag           | Char | Description                                                       |
| -------------- | ---- | ----------------------------------------------------------------- |
| `--tool`       | `-t` | AI tool to configure (copilot, claude). Auto-detected if omitted. |
| `--source`     | `-s` | Source repository in `owner/repo` format.                         |
| `--no-install` |      | Skip artifact installation, only configure tool and source.       |
| `--no-prompt`  |      | Skip confirmation prompts (for scripting).                        |

### `sf aidev add`

Interactively select and install multiple artifacts at once. Displays a multi-select picker with artifacts grouped by category (Agents, Skills, Prompts, Commands).

```bash
sf aidev add
sf aidev add --source owner/repo
```

| Flag       | Char | Description                                       |
| ---------- | ---- | ------------------------------------------------- |
| `--source` | `-s` | Filter artifacts to a specific source repository. |

**Note:** This command requires an interactive terminal. For non-interactive use (scripts, CI/CD), use the subcommands below.

### `sf aidev add skill|agent|prompt|command`

Install an artifact from a configured source repository. When called without the `--name` flag, some subcommands support interactive selection.

```bash
sf aidev add skill --name my-skill
sf aidev add agent --name my-agent --source owner/repo
sf aidev add prompt --name my-prompt
sf aidev add command --name review-pr
```

| Flag       | Char | Description                                                                                 |
| ---------- | ---- | ------------------------------------------------------------------------------------------- |
| `--name`   | `-n` | Name of the artifact to install. If omitted, shows interactive selection (where supported). |
| `--source` | `-s` | Source repository. Defaults to the configured default.                                      |

### `sf aidev remove`

Interactively select and remove multiple installed artifacts at once. Displays a multi-select picker with installed artifacts grouped by category.

```bash
sf aidev remove
sf aidev remove --no-prompt
```

| Flag          | Description                   |
| ------------- | ----------------------------- |
| `--no-prompt` | Skip the confirmation prompt. |

**Note:** This command requires an interactive terminal. For non-interactive use, use the subcommands below.

### `sf aidev remove skill|agent|prompt|command`

Remove an installed artifact by name.

```bash
sf aidev remove skill --name my-skill
sf aidev remove agent --name my-agent --no-prompt
sf aidev remove prompt --name my-prompt
sf aidev remove command --name review-pr
```

| Flag          | Char | Description                                    |
| ------------- | ---- | ---------------------------------------------- |
| `--name`      | `-n` | **(Required)** Name of the artifact to remove. |
| `--no-prompt` |      | Skip the confirmation prompt.                  |

### `sf aidev list`

Display a unified view of all AI artifacts in your project, grouped by type with checkboxes indicating installation status:

- ☑ (checked) - artifact exists locally
- ☐ (unchecked) - artifact is available from source but not installed

In interactive mode, press Enter on any artifact to expand and view its full description inline. The description is fetched on-demand from the source repository's frontmatter metadata.

```bash
sf aidev list
sf aidev list --source owner/repo
```

| Flag       | Char | Description                                      |
| ---------- | ---- | ------------------------------------------------ |
| `--source` | `-s` | Filter available artifacts by source repository. |

**Interactive Features:**

- Press **Enter** to expand/collapse artifact descriptions
- Press **Escape** or **Ctrl+C** to exit
- Descriptions are fetched on-demand from source repository frontmatter

### `sf aidev list agents|skills|commands|instructions`

List artifacts filtered by type with interactive expandable descriptions. All subcommands share the same UI as the parent `sf aidev list` — press Enter to expand/collapse artifact descriptions inline.

```bash
sf aidev list agents
sf aidev list skills --source owner/repo
sf aidev list commands
sf aidev list instructions
```

| Command             | Description                                                                                                |
| ------------------- | ---------------------------------------------------------------------------------------------------------- |
| `list agents`       | Show only agents. Merges local and source manifest. Supports expandable descriptions.                      |
| `list skills`       | Show only skills. Merges local and source manifest. Supports expandable descriptions.                      |
| `list commands`     | Show only commands. Merges local and source manifest. Supports expandable descriptions.                    |
| `list instructions` | Show local instruction files (CLAUDE.md, CURSOR.md, CODEX.md, copilot-instructions.md, \*.instructions.md) |

The `agents`, `skills`, and `commands` subcommands support the `--source` flag. The `instructions` command is local-only.

**Interactive Features:**

- Press **Enter** to expand/collapse artifact descriptions
- Press **Escape** or **Ctrl+C** to exit
- Descriptions are fetched on-demand from source repository frontmatter

### `sf aidev source add|remove|list|set-default|refresh`

Manage source repositories that provide artifacts.

```bash
sf aidev source add owner/repo --set-default
sf aidev source list
sf aidev source remove owner/repo
sf aidev source set-default owner/repo
sf aidev source refresh
sf aidev source refresh owner/repo
```

| Command              | Arguments / Flags                                   |
| -------------------- | --------------------------------------------------- |
| `source add`         | `REPO` (positional), `--repo` `-r`, `--set-default` |
| `source remove`      | `REPO` (positional), `--repo` `-r`, `--no-prompt`   |
| `source list`        | _(none)_                                            |
| `source set-default` | `REPO` (positional), `--repo` `-r`                  |
| `source refresh`     | `REPO` (positional, optional), `--repo` `-r`        |

The `REPO` argument (in `owner/repo` format) can be provided as a positional argument or via the `--repo` flag.

The `source refresh` command re-fetches manifests from GitHub and updates the local cache. For repositories without a `manifest.json`, it re-runs auto-discovery. Use this command when source repositories have been updated.

All commands support `--json` for machine-readable output.

## Interactive Mode

Many commands support rich interactive experiences when running in a terminal:

### Features

- **Multi-select checkboxes** - Select multiple artifacts to install/remove at once
- **Expandable descriptions** - Press Enter to expand/collapse artifact descriptions in lists
- **Unified list UI** - All list commands (`list`, `list skills`, `list agents`, etc.) share the same expandable select interface
- **Keyboard navigation** - Space to select, Enter to confirm/expand, Escape to go back
- **On-demand fetching** - Artifact descriptions are loaded from source repositories when needed
- **Visual indicators** - Clear checkmarks (☑) for installed, empty boxes (☐) for available artifacts

### Keyboard Shortcuts

| Key            | Action                                            |
| -------------- | ------------------------------------------------- |
| **Space**      | Select/deselect items in checkbox lists           |
| **Enter**      | Confirm selection or expand/collapse descriptions |
| **Escape**     | Go back or exit                                   |
| **Ctrl+C**     | Cancel and exit                                   |
| **↑/↓ Arrows** | Navigate through lists                            |

Interactive mode is automatically disabled when:

- Running with `--json` flag
- Output is piped or redirected
- Running in CI/CD environments (non-TTY)
- Using `--no-prompt` flag

## AI Tools Detection

The plugin auto-detects which AI coding tool is configured in your project:

| Tool               | Detection Paths                                                          | Artifact Installation Paths                                                                                             |
| ------------------ | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| **GitHub Copilot** | `.github/copilot-instructions.md`, `.github/agents/`, `.github/prompts/` | Skills: `.github/copilot-skills/`, Agents: `.github/agents/`, Prompts: `.github/prompts/`, Commands: `.github/prompts/` |
| **Claude Code**    | `.claude/`                                                               | Skills: `.claude/skills/`, Agents: `.claude/agents/`, Prompts: `.claude/commands/`, Commands: `.claude/commands/`       |

Additional tools (Cursor, Windsurf, Gemini, Codex) are planned.

## Source Repository Format

Source repositories must contain a `manifest.json` at the root:

```json
{
  "version": "1.0",
  "artifacts": [
    {
      "name": "apex-review",
      "type": "skill",
      "description": "Code review skill for Apex",
      "files": [{ "source": "skills/apex-review.md" }],
      "tools": ["copilot", "claude"]
    },
    {
      "name": "review-pr",
      "type": "command",
      "description": "Review pull requests with AI assistance",
      "files": [{ "source": "commands/review-pr.md" }],
      "tools": ["copilot", "claude"]
    }
  ]
}
```

### Artifact Types

The plugin supports four artifact types:

| Type      | Description                                | Example                          |
| --------- | ------------------------------------------ | -------------------------------- |
| `skill`   | Specialized capabilities for AI assistants | code review, testing, deployment |
| `agent`   | Autonomous AI agents for complex tasks     | code helper, architect           |
| `prompt`  | Reusable prompt templates                  | deploy checklist, code standards |
| `command` | Executable commands with AI assistance     | review PR, generate tests        |

### Frontmatter Support

Artifact files can include frontmatter metadata for rich descriptions displayed in interactive mode:

```markdown
---
description: |
  Detailed multi-line description of the artifact.
  Supports full markdown formatting.
---

# Artifact Content

The actual content of the skill, agent, prompt, or command...
```

When viewing artifacts in interactive mode, descriptions are fetched from the source repository's frontmatter metadata.

### Auto-Discovery

If a source repository doesn't have a `manifest.json`, the plugin automatically discovers artifacts by scanning the repository structure using pattern matching:

- **Skills**: `skills/*.md`, `skills/*/README.md`
- **Agents**: `agents/*.md`, `agents/*/README.md`
- **Prompts**: `prompts/*.md`, `prompts/*/README.md`
- **Commands**: `commands/*.md`, `commands/*/README.md`

Auto-discovered artifacts are cached locally at `~/.sf/sf-aidev-manifests/` for one week. Use `sf aidev source refresh` to manually update the cache.

### Directory-based Artifacts

Skills can be defined as either single files or directories:

**Single file**: `skills/apex-review.md`
**Directory**: `skills/apex-review/` with `README.md` and supporting files

When a skill is defined as a directory, all files in that directory are installed together.

## Configuration Files

The plugin uses two configuration scopes:

### Global Config (`~/.sf/sf-aidev.json`)

Stores source repositories available across all projects:

```json
{
  "sources": [
    {
      "repo": "owner/ai-templates",
      "isDefault": true
    }
  ]
}
```

### Local Config (`.sf/sf-aidev.json`)

Stores project-specific settings and installed artifacts:

```json
{
  "tool": "copilot",
  "installedArtifacts": [
    {
      "name": "apex-review",
      "type": "skill",
      "source": "owner/ai-templates"
    }
  ]
}
```

## Project Structure

```
src/
├── commands/aidev/          # CLI command implementations
│   ├── init.ts              # Initialize AI tool and sources
│   ├── add.ts               # Interactive multi-select add (parent)
│   ├── add/                 # skill.ts, agent.ts, prompt.ts, command.ts
│   ├── remove.ts            # Interactive multi-select remove (parent)
│   ├── remove/              # skill.ts, agent.ts, prompt.ts, command.ts
│   ├── list/                # index.ts, baseTypedListCommand.ts, agents.ts, skills.ts, commands.ts, instructions.ts
│   └── source/              # add.ts, remove.ts, list.ts, set-default.ts, refresh.ts
├── config/                  # Configuration file management (AiDevConfig)
├── detectors/               # AI tool auto-detection (CopilotDetector, ClaudeDetector)
├── installers/              # Tool-specific file installers + path resolution
├── services/                # ArtifactService, SourceService, LocalFileScanner
├── sources/                 # GitHubFetcher, SourceManager, ManifestCache, ManifestBuilder
├── ui/                      # Interactive UI components (expandableSelect, interactivePrompts, interactiveTable)
├── utils/                   # FrontmatterParser and utility functions
└── types/                   # TypeScript type definitions (Manifest, Artifact, etc.)
messages/                    # Markdown help/error messages per command
test/                        # Mirrors src/ structure with Mocha + Chai + Sinon
```

## Development

### Prerequisites

- Node.js >= 18
- Yarn

### Setup

```bash
git clone git@github.com:yurybond/sf-aidev.git
cd sf-aidev
yarn install
yarn build
```

### Run Locally

```bash
# Run commands via dev script
./bin/dev.js aidev init

# Or link to sf CLI
sf plugins link .
sf aidev init
```

### Scripts

| Script           | Description                     |
| ---------------- | ------------------------------- |
| `yarn build`     | Compile TypeScript + lint       |
| `yarn test`      | Compile + lint + run unit tests |
| `yarn test:only` | Run unit tests with coverage    |
| `yarn compile`   | TypeScript compilation only     |
| `yarn lint`      | ESLint check                    |
| `yarn format`    | Prettier formatting             |

### Technology Stack

| Category       | Tool                                                 | Version / Config   |
| -------------- | ---------------------------------------------------- | ------------------ |
| CLI Framework  | [oclif](https://oclif.io/) v4                        | `package.json`     |
| Language       | TypeScript 5.x (strict ESM)                          | `tsconfig.json`    |
| SF CLI Core    | @salesforce/sf-plugins-core ^12, @salesforce/core ^8 | `package.json`     |
| Build          | [Wireit](https://github.com/nicolo-ribaudo/wireit)   | `package.json`     |
| Test           | Mocha + Chai + Sinon                                 | `.mocharc.json`    |
| Coverage       | c8 ^10 (95% lines/stmts, 93% branches, 88% funcs)    | `.c8rc.json`       |
| Lint           | ESLint + sf-plugin rules                             | `.eslintrc.cjs`    |
| Format         | Prettier                                             | `.prettierrc.json` |
| Git Hooks      | Husky + commitlint + lint-staged ^16                 | `.husky/`          |
| Interactive UI | @inquirer/prompts ^8.3, @inquirer/core ^10.3         | `package.json`     |
| HTTP Client    | got 13.0.0                                           | `package.json`     |

### Adding a New Command

Each command requires 3 files:

**1. Command** — `src/commands/aidev/{topic}/{name}.ts`

```typescript
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('sf-aidev', 'aidev.{topic}.{name}');

export type MyResult = {
  /* fields */
};

export default class MyCommand extends SfCommand<MyResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly enableJsonFlag = true;

  public static readonly flags = {
    name: Flags.string({ char: 'n', summary: messages.getMessage('flags.name.summary'), required: true }),
  };

  public async run(): Promise<MyResult> {
    const { flags } = await this.parse(MyCommand);
    // implementation
  }
}
```

**2. Messages** — `messages/aidev.{topic}.{name}.md`

```markdown
# summary

Short description of the command.

# description

Longer description with details.

# flags.name.summary

Description of the --name flag.

# examples

- Install by name:
  <%= config.bin %> <%= command.id %> --name value
```

**3. Tests** — `test/commands/aidev/{topic}/{name}.test.ts`

Tests use Mocha + Chai + Sinon. Stub services and config, then call `Command.run([flags], oclifConfig)`.

### Conventions

- **Flags**: lowercase kebab-case (`--no-prompt`, not `--noPrompt`). Short flags: `-n` for name, `-s` for source, `-r` for repo, `-t` for type.
- **Errors**: Use `SfError` with a name ending in `Error` (e.g., `NotInstalledError`).
- **Result types**: Use `type` (not `interface`) for command result definitions.
- **Messages**: All user-facing strings must be in `messages/*.md` files, never hardcoded. Use `Messages.loadMessages()`.
- **Commands**: All commands must set `enableJsonFlag = true` for `--json` support.
- **Testing**: Aim for 90%+ coverage on new code (global thresholds: 95% lines/statements, 93% branches, 88% functions).
- **Commits**: Follow Conventional Commits format: `<type>(<scope>): <subject>` (enforced by commitlint).

### Architecture Guidelines

- **Commands are thin** - Parse flags, call services, format output. No business logic in commands.
- **Base classes for shared logic** - Typed list subcommands extend `BaseTypedListCommand` (Template Method pattern).
- **Services orchestrate** - `ArtifactService` and `SourceService` contain business logic.
- **Two config scopes** - Global config (`~/.sf/sf-aidev.json`) for sources, local config (`.sf/sf-aidev.json`) for artifacts and tool.
- **Static fetcher** - `GitHubFetcher` uses static methods for all GitHub API calls.
- **Immutable config** - Config methods return deep copies to prevent accidental mutation.
- **Type safety** - Use strict TypeScript types, avoid `any` unless absolutely necessary.

### Testing Guidelines

Run a single test file during development:

```bash
npx mocha "test/commands/aidev/add/skill.test.ts"
```

Standard test pattern with Sinon:

```typescript
const sandbox = sinon.createSandbox();
afterEach(() => sandbox.restore());

sandbox.stub(AiDevConfig, 'create').resolves(mockConfig);
sandbox.stub(ArtifactService.prototype, 'install').resolves(result);
const output = await Command.run(['--name', 'value'], oclifConfig);
```

Always stub:

- Config creation (`AiDevConfig.create`)
- Service methods
- File system operations
- GitHub API calls

### Git Workflow

Pre-commit hooks enforce:

- **Linting** - ESLint must pass
- **Formatting** - Prettier auto-formats staged files
- **Commit message** - Conventional Commits format required

Pre-push hooks enforce:

- **Build** - TypeScript compilation must succeed
- **Tests** - All tests must pass with 90% coverage

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Make changes following the conventions above
4. Write tests (aim for 90%+ coverage)
5. Ensure `yarn build` and `yarn test` pass
6. Commit using Conventional Commits format
7. Push and create a Pull Request

## Documentation

- [PLUGIN_DEV_GUIDE.md](PLUGIN_DEV_GUIDE.md) — Complete Salesforce CLI Plugin Developer Guide
- [PLUGIN_DEV_SUMMARY.md](PLUGIN_DEV_SUMMARY.md) — Quick reference summary
