# sf-aidev

[![NPM](https://img.shields.io/npm/v/sf-aidev.svg?label=sf-aidev)](https://www.npmjs.com/package/sf-aidev) [![Downloads/week](https://img.shields.io/npm/dw/sf-aidev.svg)](https://npmjs.org/package/sf-aidev) [![License](https://img.shields.io/badge/License-BSD%203--Clause-brightgreen.svg)](https://raw.githubusercontent.com/salesforcecli/sf-aidev/main/LICENSE.txt)

Salesforce CLI plugin that installs production-ready AI development tool configurations (skills, agents, prompts) from GitHub source repositories. Auto-detects which AI tool is in use, supports multiple tools, and provides unified management commands.

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

Interactively select and install multiple artifacts at once. Displays a multi-select picker with artifacts grouped by category (Agents, Skills, Prompts).

```bash
sf aidev add
sf aidev add --source owner/repo
```

| Flag       | Char | Description                                       |
| ---------- | ---- | ------------------------------------------------- |
| `--source` | `-s` | Filter artifacts to a specific source repository. |

**Note:** This command requires an interactive terminal. For non-interactive use (scripts, CI/CD), use the subcommands below.

### `sf aidev add skill|agent|prompt`

Install an artifact from a configured source repository.

```bash
sf aidev add skill --name my-skill
sf aidev add agent --name my-agent --source owner/repo
sf aidev add prompt --name my-prompt
```

| Flag       | Char | Description                                            |
| ---------- | ---- | ------------------------------------------------------ |
| `--name`   | `-n` | **(Required)** Name of the artifact to install.        |
| `--source` | `-s` | Source repository. Defaults to the configured default. |

### `sf aidev remove skill|agent|prompt`

Remove an installed artifact.

```bash
sf aidev remove skill --name my-skill
sf aidev remove agent --name my-agent --no-prompt
```

| Flag          | Char | Description                                    |
| ------------- | ---- | ---------------------------------------------- |
| `--name`      | `-n` | **(Required)** Name of the artifact to remove. |
| `--no-prompt` |      | Skip the confirmation prompt.                  |

### `sf aidev list`

Display a unified view of all AI artifacts in your project, grouped by type with checkboxes indicating installation status:

- ☑ (checked) - artifact exists locally
- ☐ (unchecked) - artifact is available from source but not installed

```bash
sf aidev list
sf aidev list --source owner/repo
```

| Flag       | Char | Description                                      |
| ---------- | ---- | ------------------------------------------------ |
| `--source` | `-s` | Filter available artifacts by source repository. |

### `sf aidev list agents|skills|instructions`

List artifacts filtered by type.

```bash
sf aidev list agents
sf aidev list skills --source owner/repo
sf aidev list instructions
```

| Command             | Description                                                                                                |
| ------------------- | ---------------------------------------------------------------------------------------------------------- |
| `list agents`       | Show only agents. Merges local and source manifest.                                                        |
| `list skills`       | Show only skills. Merges local and source manifest.                                                        |
| `list instructions` | Show local instruction files (CLAUDE.md, CURSOR.md, CODEX.md, copilot-instructions.md, \*.instructions.md) |

The `agents` and `skills` subcommands support the `--source` flag. The `instructions` command is local-only.

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

## AI Tools Detection

The plugin auto-detects which AI coding tool is configured in your project:

| Tool               | Detection Paths                                                          | Artifact Installation Paths                                                               |
| ------------------ | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| **GitHub Copilot** | `.github/copilot-instructions.md`, `.github/agents/`, `.github/prompts/` | Skills: `.github/copilot-skills/`, Agents: `.github/agents/`, Prompts: `.github/prompts/` |
| **Claude Code**    | `.claude/`                                                               | Skills: `.claude/skills/`, Agents: `.claude/agents/`, Prompts: `.claude/commands/`        |

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
    }
  ]
}
```

## Project Structure

```
src/
├── commands/aidev/          # CLI command implementations
│   ├── init.ts
│   ├── add.ts               # Interactive multi-select add command
│   ├── add/                 # skill.ts, agent.ts, prompt.ts
│   ├── remove/              # skill.ts, agent.ts, prompt.ts
│   ├── list/                # artifacts.ts
│   └── source/              # add.ts, remove.ts, list.ts, set-default.ts
├── config/                  # Configuration file management
├── detectors/               # AI tool auto-detection
├── installers/              # Tool-specific file installers + path resolution
├── services/                # ArtifactService, SourceService
├── sources/                 # GitHub fetcher, source manager
└── types/                   # TypeScript type definitions
messages/                    # Markdown help/error messages per command
test/                        # Mirrors src/ structure
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

| Category      | Tool                                               | Config             |
| ------------- | -------------------------------------------------- | ------------------ |
| CLI Framework | [oclif](https://oclif.io/) v4                      | `package.json`     |
| Language      | TypeScript 5.x (strict ESM)                        | `tsconfig.json`    |
| Build         | [Wireit](https://github.com/nicolo-ribaudo/wireit) | `package.json`     |
| Test          | Mocha + Chai + Sinon                               | `.mocharc.json`    |
| Coverage      | c8 (90% threshold)                                 | `.c8rc.json`       |
| Lint          | ESLint + sf-plugin rules                           | `.eslintrc.cjs`    |
| Format        | Prettier                                           | `.prettierrc.json` |
| Git Hooks     | Husky + commitlint + lint-staged                   | `.husky/`          |

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
- **Messages**: Capitalized descriptions. Load from markdown files via `Messages.loadMessages()`.

## Documentation

- [PLUGIN_DEV_GUIDE.md](PLUGIN_DEV_GUIDE.md) — Complete Salesforce CLI Plugin Developer Guide
- [PLUGIN_DEV_SUMMARY.md](PLUGIN_DEV_SUMMARY.md) — Quick reference summary
