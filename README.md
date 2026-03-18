# ai-dev

[![NPM](https://img.shields.io/npm/v/ai-dev.svg?label=ai-dev)](https://www.npmjs.com/package/ai-dev) [![Downloads/week](https://img.shields.io/npm/dw/ai-dev.svg)](https://npmjs.org/package/ai-dev) [![License](https://img.shields.io/badge/License-BSD%203--Clause-brightgreen.svg)](https://raw.githubusercontent.com/salesforcecli/ai-dev/main/LICENSE.txt)

Salesforce CLI plugin that installs production-ready AI development tool configurations (skills, agents, prompts) from GitHub source repositories. Auto-detects which AI tool is in use, supports multiple tools, and provides unified management commands.

## Install

```bash
sf plugins install ai-dev
```

## Quick Start

```bash
# Initialize — detects your AI tool, configures source, installs artifacts
sf aidev init

# Add individual artifacts
sf aidev add skill --name apex-review
sf aidev add agent --name code-helper
sf aidev add prompt --name deploy-checklist

# Manage sources
sf aidev source add --repo myorg/ai-templates --set-default
sf aidev source list
```

## Commands

### `sf aidev init`

Initialize AI development tools in your project. Auto-detects the AI tool in use, configures a source repository, and optionally installs available artifacts.

```bash
sf aidev init
sf aidev init --tool copilot --source owner/ai-dev-templates
sf aidev init --no-install --no-prompt
```

| Flag           | Char | Description                                                       |
| -------------- | ---- | ----------------------------------------------------------------- |
| `--tool`       | `-t` | AI tool to configure (copilot, claude). Auto-detected if omitted. |
| `--source`     | `-s` | Source repository in `owner/repo` format.                         |
| `--no-install` |      | Skip artifact installation, only configure tool and source.       |
| `--no-prompt`  |      | Skip confirmation prompts (for scripting).                        |

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

### `sf aidev list artifacts`

List installed and available artifacts.

```bash
sf aidev list artifacts
sf aidev list artifacts --installed
sf aidev list artifacts --available --type skill
sf aidev list artifacts --source owner/repo
```

| Flag          | Char | Description                                      |
| ------------- | ---- | ------------------------------------------------ |
| `--type`      | `-t` | Filter by type: `skill`, `agent`, or `prompt`.   |
| `--installed` | `-i` | Show only installed artifacts.                   |
| `--available` | `-a` | Show only available artifacts from sources.      |
| `--source`    | `-s` | Filter available artifacts by source repository. |

### `sf aidev source add|remove|list|set-default`

Manage source repositories that provide artifacts.

```bash
sf aidev source add --repo owner/repo --set-default
sf aidev source list
sf aidev source remove --repo owner/repo
sf aidev source set-default --repo owner/repo
```

| Command              | Flags                                         |
| -------------------- | --------------------------------------------- |
| `source add`         | `--repo` `-r` **(required)**, `--set-default` |
| `source remove`      | `--repo` `-r` **(required)**, `--no-prompt`   |
| `source list`        | _(none)_                                      |
| `source set-default` | `--repo` `-r` **(required)**                  |

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
| Coverage      | nyc (90% threshold)                                | `.nycrc`           |
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
const messages = Messages.loadMessages('ai-dev', 'aidev.{topic}.{name}');

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
- [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) — Detailed implementation plan with user stories
