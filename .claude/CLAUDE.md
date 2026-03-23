# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

`sf-aidev` is a Salesforce CLI plugin (oclif v4, strict ESM) that installs AI development tool configurations (skills, agents, prompts) from GitHub source repositories into local projects. It auto-detects the active AI tool (Copilot, Claude) and resolves tool-specific installation paths.

## Agent Delegation Requirement

When a user asks to implement a feature, always use the `ts-package-developer` agent to perform the work.

## Build & Development Commands

```bash
yarn build          # Compile TypeScript + lint (wireit)
yarn compile        # TypeScript compilation only
yarn lint           # ESLint check
yarn format         # Prettier formatting
yarn test           # Compile + lint + run all unit tests
yarn test:only      # Run unit tests with c8 coverage (no compile/lint)
```

Run a single test file:

```bash
npx mocha "test/commands/aidev/add/skill.test.ts"
```

Run locally without installing:

```bash
./bin/dev.js aidev init
./bin/dev.js aidev add skill --name my-skill
```

## Architecture

### Data Flow

```
Command (parse flags) → Service (orchestrate) → Sources/Config (fetch/persist)
                                               → Installers (write files)
```

Commands are thin — they parse flags, call a service, and format output. Business logic lives in services.

### Two Config Scopes

`AiDevConfig` (extends `@salesforce/core` `ConfigFile`) is used with **two separate instances**:

- **sourceConfig** — global (`~/.sf/sf-aidev.json`): stores source repositories
- **projectConfig** — local (`.sf/sf-aidev.json` in project): stores installed artifacts and active tool

Both are passed into `ArtifactService` as separate constructor arguments. Commands create both via `AiDevConfig.create()` with `isGlobal: true/false`.

### Key Modules

- **`services/artifactService.ts`** — Main orchestrator. Handles detect/install/uninstall/list operations. Uses in-memory manifest cache + disk `ManifestCache` fallback.
- **`services/sourceService.ts`** — Source repository CRUD. Validates manifests on add, supports auto-discovery fallback via `ManifestBuilder`.
- **`services/localFileScanner.ts`** — Scans local project for installed artifacts by type. Provides `mergeArtifacts()` to combine local and remote lists, and `groupByType()` for grouped display.
- **`sources/gitHubFetcher.ts`** — Static class fetching files from `raw.githubusercontent.com` and repo trees from GitHub API. All methods are static.
- **`sources/manifestCache.ts`** — Disk cache at `~/.sf/sf-aidev-manifests/`. Repo `owner/repo` maps to `owner__repo.json`. Staleness threshold: 1 week.
- **`sources/manifestBuilder.ts`** — Auto-discovers artifacts from file paths using regex-based `DISCOVERY_RULES` when no `manifest.json` exists.
- **`sources/sourceManager.ts`** — Low-level CRUD for source entries in config. Wrapped by `SourceService`.
- **`config/aiDevConfig.ts`** — Config CRUD: `getSources()`, `addSource()`, `getInstalledArtifacts()`, `setTool()`, etc. Returns deep copies to prevent mutation.
- **`installers/pathResolver.ts`** — Maps `(artifactType, tool)` → installation path (e.g., `skill + copilot → .github/copilot-skills`).
- **`detectors/registry.ts`** — Static registry of `Detector` implementations. Currently: `CopilotDetector`, `ClaudeDetector`.
- **`commands/aidev/list/baseTypedListCommand.ts`** — Abstract base class for typed list subcommands (skills, agents, commands, instructions). Template Method pattern: `runList()` orchestrates config creation, local scanning, remote fetching, merging, sorting, and interactive/plain display. Subclasses implement `getArtifactType()`, `getSectionTitle()`, `scanLocal()`, `buildResult()`, `getMessages()`.
- **`ui/expandableSelect.ts`** — Custom `@inquirer/core` `createPrompt` component for browsing artifacts with Enter-to-toggle-description, Escape-to-exit, and on-demand remote description fetching.
- **`ui/interactivePrompts.ts`** — Prompt helpers: `toExpandableChoices()` (grouped, for `aidev list`), `toExpandableChoicesFlat()` (flat, for typed subcommands), `isInteractive()`, checkbox/select/confirm prompts.
- **`utils/frontmatterParser.ts`** — Parses YAML frontmatter from artifact markdown files. Used for extracting `description` fields on-demand.

### Adding a New Command

Each command requires 3 files:

1. **Command** — `src/commands/aidev/{topic}/{name}.ts` extending `SfCommand<ResultType>`
2. **Messages** — `messages/aidev.{topic}.{name}.md` with `# summary`, `# description`, `# flags.*`, `# examples`
3. **Test** — `test/commands/aidev/{topic}/{name}.test.ts`

Messages are loaded via `Messages.loadMessages('sf-aidev', 'aidev.{topic}.{name}')`.

### Testing Patterns

Tests use Mocha + Chai + Sinon. The standard pattern for command tests:

```typescript
const sandbox = sinon.createSandbox();
sandbox.stub(AiDevConfig, 'create').resolves({} as AiDevConfig);
sandbox.stub(ArtifactService.prototype, 'install').resolves(result);
const output = await Command.run(['--name', 'value'], oclifConfig);
```

Always `sandbox.restore()` in `afterEach`. Config instances must be `Config.load({ root: process.cwd() })` in `before()`.

## Conventions

- **Commit format**: `<type>(<scope>): <subject>` (Conventional Commits, enforced by commitlint)
- **Flags**: lowercase kebab-case. Short flags: `-n` name, `-s` source, `-r` repo, `-t` type
- **Errors**: Use `SfError` with a name ending in `Error` (e.g., `NotInstalledError`)
- **Result types**: Use `type` (not `interface`) for command result definitions
- **All user-facing strings**: in `messages/*.md` files, never hardcoded
- **`enableJsonFlag = true`** on all commands for `--json` support
- **Coverage threshold**: 95% lines/statements, 93% branches, 88% functions via `.c8rc.json` (UI code excluded)
- **Git hooks**: pre-commit (lint + pretty-quick), commit-msg (commitlint), pre-push (build + test)

## References

- **[PLUGIN_DEV_GUIDE.md](../PLUGIN_DEV_GUIDE.md)** - Complete offline guide compiled from official Salesforce documentation
- **[PLUGIN_DEV_SUMMARY.md](../PLUGIN_DEV_SUMMARY.md)** - Quick reference for structure, best practices, security, and limitations
- [oclif Documentation](https://oclif.io/docs)
- [Salesforce CLI Plugin Developer Guide](https://developer.salesforce.com/docs/platform/salesforce-cli-plugin/guide)
- [@salesforce/sf-plugins-core API](https://salesforcecli.github.io/sf-plugins-core/)
- [@salesforce/core API](https://forcedotcom.github.io/sfdx-core/)
