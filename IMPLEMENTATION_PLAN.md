# Plan: AI Dev Plugin for Salesforce CLI

## TL;DR

Build a Salesforce CLI plugin that installs production-ready AI development tool configurations (skills, agents, prompts, instructions) from GitHub source repositories. Auto-detects which AI tool is in use, supports multiple tools, and provides unified management commands. **Recommended approach**: Follow SF CLI naming conventions with `aidev` topic and `init/add/list/remove/source` actions.

---

## Revised Command Structure

| Command                    | Purpose                                                      |
| -------------------------- | ------------------------------------------------------------ |
| `aidev init`               | Initial setup: detect tool, select source, install artifacts |
| `aidev add skill`          | Create a skill from source                                   |
| `aidev add agent`          | Create an agent from source                                  |
| `aidev add prompt`         | Create a prompt from source                                  |
| `aidev list artifacts`     | List installed skills/agents/prompts                         |
| `aidev remove skill`       | Remove an installed skill                                    |
| `aidev remove agent`       | Remove an installed agent                                    |
| `aidev source list`        | List configured source repos                                 |
| `aidev source add`         | Add a new source repo                                        |
| `aidev source remove`      | Remove a source repo                                         |
| `aidev source set-default` | Set default source                                           |

---

## Steps

**Phase 1: Core Infrastructure**

1. Create detector system — Abstract `Detector` base class + implementations for each AI tool (Claude, Copilot, Cursor, Windsurf, Gemini, Codex, Agentforce) _parallel with step 2_
2. Create source manager — `SourceManager` for CRUD operations on source repos, `GitHubFetcher` for downloading artifacts _parallel with step 1_
3. Create artifact installers — Base `Installer` class + tool-specific implementations that handle path transforms _depends on 1 & 2_
4. Define source manifest schema — JSON schema for source repo structure (`manifest.json`)
5. Create config storage — Extend `ConfigFile` for storing tool preference, sources, installed artifacts

**Phase 2: Commands** (_depends on Phase 1_)

6. Implement `aidev init` — Main setup wizard with detection + interactive selection
7. Implement `aidev add skill/agent/prompt` — Individual artifact addition commands
8. Implement `aidev list artifacts` — Show installed and available artifacts
9. Implement `aidev remove skill/agent` — Remove installed artifacts
10. Implement `aidev source add/remove/list/set-default` — Source management commands

**Phase 3: Polish** (_depends on Phase 2_) 11. Add spinners and progress bars for long-running operations 12. Write comprehensive help messages in markdown files 13. Create default source repo with Salesforce-specific templates

---

## Relevant Files

- `src/commands/aidev/` — All command implementations
- `src/detectors/` — AI tool detection logic (registry pattern)
- `src/sources/` — Source repo management + GitHub fetching
- `src/installers/` — Artifact installation with tool-specific transforms
- `src/config/aiDevConfig.ts` — Configuration storage class
- `messages/aidev.*.md` — Help text and error messages

---

## Verification

1. Run `bin/dev.js aidev init` — verify detection, prompts, and artifact creation in correct paths
2. Run `bin/dev.js aidev source add --repo user/repo` — verify source storage
3. Run `bin/dev.js aidev list artifacts --source` — verify remote fetch
4. Unit tests: `yarn test:only`
5. NUTs with mock GitHub: `yarn test:nuts`

---

## Decisions

- **Topic**: `aidev` — avoids potential future conflicts with Salesforce AI features while remaining concise
- **Init command**: `aidev init` — industry standard (npm init, git init), intuitive for one-time setup wizard
- **Primary action**: `add` for installing artifacts — artifacts are production-ready (not scaffolds requiring modification), so `add` better conveys "add to project" semantics
- **MVP tools**: GitHub Copilot + Claude Code only (most mature formats)
- **Config storage**: Global `~/.sf/ai-dev.json` for sources; local `.sf/ai-dev.json` for project settings
- **Out of scope v1**: Auto-sync with source updates, artifact versioning

---

## Further Considerations

1. **MVP scope** — Start with Copilot + Claude only? Other tools can be added iteratively once the core pattern is solid. **Recommendation: Yes, reduce v1 scope.**

2. **Default source repo** — Should the plugin ship with bundled templates as fallback, or require a GitHub source? **Recommendation: Bundle minimal defaults; GitHub for extended library.**

3. **Offline mode** — Cache artifacts locally for restricted networks? **Recommendation: Defer to v2 unless enterprise customers require it.**

---

## User Stories

### US-00-A: Types & Config Infrastructure (Priority: P0)

| Field                   | Details                                                                                                                                                                                                                                         |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Title**               | Types & Config Infrastructure                                                                                                                                                                                                                   |
| **Description**         | As a developer, I need TypeScript interfaces for manifest schema, config schema, and a ConfigFile implementation so that all commands can safely read/write structured data.                                                                    |
| **Acceptance Criteria** | 1. `Manifest`, `Artifact`, `ArtifactType` interfaces defined<br>2. Config interfaces for sources and installed artifacts<br>3. `AiDevConfig` extends `ConfigFile` with typed accessors<br>4. Unit tests cover read/write/missing file scenarios |
| **Status**              | ✅ Complete                                                                                                                                                                                                                                     |
| **Priority**            | P0 — Blocks all other stories                                                                                                                                                                                                                   |

**Files to Create:**

| File Path                   | Purpose                                                                                   | Test File                         |
| --------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------- |
| `src/types/manifest.ts`     | `Manifest`, `Artifact`, `ArtifactType`, `ArtifactFile` interfaces                         | N/A (types only)                  |
| `src/types/config.ts`       | `SourceConfig`, `InstalledArtifact`, `AiDevConfigOptions`                                 | N/A (types only)                  |
| `src/config/aiDevConfig.ts` | Extends `ConfigFile` with `getDefaultSource()`, `getSources()`, `getInstalledArtifacts()` | `test/config/aiDevConfig.test.ts` |

**Implementation Steps:**

1. Define `ArtifactType = 'skill' | 'agent' | 'prompt'`
2. Define `Artifact { name, type, description, files[], tools[] }`
3. Define `Manifest { version, artifacts[] }`
4. Define `SourceConfig { repo, isDefault?, addedAt }`
5. Define `InstalledArtifact { name, type, path, source, installedAt }`
6. Create `AiDevConfig` extending `ConfigFile<AiDevConfig.Options>`:
   ```typescript
   export class AiDevConfig extends ConfigFile<AiDevConfig.Options> {
     public static getFileName(): string { return 'ai-dev.json'; }
     public getDefaultSource(): SourceConfig | undefined { ... }
     public getSources(): SourceConfig[] { ... }
     public getInstalledArtifacts(): InstalledArtifact[] { ... }
   }
   ```

---

### US-00-B: Detection System (Priority: P0)

| Field                   | Details                                                                                                                                                                                                                                                                                                                                               |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Title**               | AI Tool Detection System                                                                                                                                                                                                                                                                                                                              |
| **Description**         | As a developer, I need a detector system that identifies which AI tools are configured in the project directory so that commands know where to install artifacts.                                                                                                                                                                                     |
| **Acceptance Criteria** | 1. Abstract `Detector` base with `detect(): Promise<boolean>` and `toolName: string`<br>2. Copilot detector checks `.github/copilot-instructions.md`, `.github/agents/`, `.github/prompts/`<br>3. Claude detector checks `.claude/` directory<br>4. `DetectorRegistry.detectAll()` returns array of detected tools<br>5. Unit tests for each detector |
| **Status**              | ✅ Complete                                                                                                                                                                                                                                                                                                                                           |
| **Priority**            | P0 — Blocks US-01, US-02, US-03, US-04                                                                                                                                                                                                                                                                                                                |

**Files to Create:**

| File Path                          | Purpose                                              | Test File                                |
| ---------------------------------- | ---------------------------------------------------- | ---------------------------------------- |
| `src/detectors/detector.ts`        | Abstract base: `abstract detect(): Promise<boolean>` | N/A (abstract)                           |
| `src/detectors/copilotDetector.ts` | Checks Copilot config paths                          | `test/detectors/copilotDetector.test.ts` |
| `src/detectors/claudeDetector.ts`  | Checks Claude config paths                           | `test/detectors/claudeDetector.test.ts`  |
| `src/detectors/registry.ts`        | Orchestrates all detectors                           | `test/detectors/registry.test.ts`        |

**Implementation Steps:**

1. Create abstract `Detector`:
   ```typescript
   export abstract class Detector {
     public abstract readonly toolName: string;
     public abstract detect(projectPath: string): Promise<boolean>;
   }
   ```
2. Implement `CopilotDetector`:
   - Check for any of: `.github/copilot-instructions.md`, `.github/agents/`, `.github/prompts/`
   - Use `fs.access()` for existence checks
3. Implement `ClaudeDetector`:
   - Check for `.claude/` directory
4. Create `DetectorRegistry`:
   ```typescript
   export class DetectorRegistry {
     private static detectors: Detector[] = [new CopilotDetector(), new ClaudeDetector()];
     public static async detectAll(projectPath: string): Promise<string[]> { ... }
   }
   ```

---

### US-00-C: Source Management & GitHub Fetcher (Priority: P0)

| Field                   | Details                                                                                                                                                                                                                                                                                                              |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Title**               | Source Management & GitHub Fetcher                                                                                                                                                                                                                                                                                   |
| **Description**         | As a developer, I need a source manager for CRUD operations on source repos and a GitHub fetcher to download manifests and artifact files from raw.githubusercontent.com.                                                                                                                                            |
| **Acceptance Criteria** | 1. `SourceManager` has `add()`, `remove()`, `list()`, `setDefault()` methods<br>2. `GitHubFetcher.fetchManifest(repo)` returns typed `Manifest`<br>3. `GitHubFetcher.fetchFile(repo, path)` returns file content<br>4. Proper error handling for 404, network errors, invalid JSON<br>5. Unit tests with mocked HTTP |
| **Status**              | ✅ Complete                                                                                                                                                                                                                                                                                                          |
| **Priority**            | P0 — Blocks US-01, US-02, US-03, US-04, US-05, US-09, US-10, US-11                                                                                                                                                                                                                                                   |

**Files to Create:**

| File Path                      | Purpose                                   | Test File                            |
| ------------------------------ | ----------------------------------------- | ------------------------------------ |
| `src/sources/gitHubFetcher.ts` | HTTP client using `got` for GitHub raw    | `test/sources/gitHubFetcher.test.ts` |
| `src/sources/sourceManager.ts` | CRUD wrapper around `AiDevConfig` sources | `test/sources/sourceManager.test.ts` |

**Implementation Steps:**

1. Create `GitHubFetcher`:
   ```typescript
   export class GitHubFetcher {
     private static readonly BASE_URL = 'https://raw.githubusercontent.com';
     public static async fetchManifest(repo: string, branch = 'main'): Promise<Manifest> { ... }
     public static async fetchFile(repo: string, path: string, branch = 'main'): Promise<string> { ... }
   }
   ```
2. Use `got` with timeout, retry, and error mapping to `SfError`
3. Create `SourceManager`:
   ```typescript
   export class SourceManager {
     constructor(private config: AiDevConfig) {}
     public async add(repo: string, setDefault = false): Promise<void> { ... }
     public async remove(repo: string): Promise<void> { ... }
     public list(): SourceConfig[] { ... }
     public setDefault(repo: string): void { ... }
   }
   ```

---

### US-00-D: Artifact Installers (Priority: P0)

| Field                   | Details                                                                                                                                                                                                                                                                                                                     |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Title**               | Artifact Installers                                                                                                                                                                                                                                                                                                         |
| **Description**         | As a developer, I need installer classes that handle downloading artifact files and placing them in the correct tool-specific paths (e.g., `.github/prompts/` for Copilot, `.claude/commands/` for Claude).                                                                                                                 |
| **Acceptance Criteria** | 1. Abstract `Installer` base with `install(artifact, tool): Promise<string>`<br>2. `SkillInstaller`, `AgentInstaller`, `PromptInstaller` implementations<br>3. `PathResolver` maps artifact type + tool → correct destination path<br>4. Creates directories as needed<br>5. Unit tests for each installer and path mapping |
| **Status**              | ✅ Complete                                                                                                                                                                                                                                                                                                                 |
| **Priority**            | P0 — Blocks US-01, US-02, US-03, US-04, US-06, US-07                                                                                                                                                                                                                                                                        |

**Files to Create:**

| File Path                           | Purpose                                 | Test File                                 |
| ----------------------------------- | --------------------------------------- | ----------------------------------------- |
| `src/installers/installer.ts`       | Abstract base class                     | N/A (abstract)                            |
| `src/installers/skillInstaller.ts`  | Skill installation + tool path mapping  | `test/installers/skillInstaller.test.ts`  |
| `src/installers/agentInstaller.ts`  | Agent installation + tool path mapping  | `test/installers/agentInstaller.test.ts`  |
| `src/installers/promptInstaller.ts` | Prompt installation + tool path mapping | `test/installers/promptInstaller.test.ts` |
| `src/installers/pathResolver.ts`    | Centralized tool → path mapping         | `test/installers/pathResolver.test.ts`    |

**Implementation Steps:**

1. Create `PathResolver`:
   ```typescript
   export class PathResolver {
     private static readonly PATHS: Record<ArtifactType, Record<string, string>> = {
       skill: { copilot: '.github/copilot-skills/', claude: '.claude/skills/' },
       agent: { copilot: '.github/agents/', claude: '.claude/agents/' },
       prompt: { copilot: '.github/prompts/', claude: '.claude/commands/' },
     };
     public static resolve(type: ArtifactType, tool: string, name: string): string { ... }
   }
   ```
2. Create abstract `Installer`:
   ```typescript
   export abstract class Installer {
     public abstract install(artifact: Artifact, tool: string, fetcher: GitHubFetcher): Promise<string>;
     public abstract uninstall(name: string, tool: string): Promise<void>;
   }
   ```
3. Implement `SkillInstaller`, `AgentInstaller`, `PromptInstaller`:
   - Use `PathResolver` to get destination
   - Use `fs.mkdir()` with `{ recursive: true }`
   - Use `GitHubFetcher.fetchFile()` to download each file in `artifact.files[]`

---

### US-00-E: Service Layer (Priority: P0)

| Field                   | Details                                                                                                                                                                                                                                                                     |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Title**               | Service Layer (ArtifactService, SourceService)                                                                                                                                                                                                                              |
| **Description**         | As a developer, I need high-level service classes that encapsulate common workflows so that command implementations are thin and DRY.                                                                                                                                       |
| **Acceptance Criteria** | 1. `ArtifactService` provides `install()`, `uninstall()`, `list()` methods using installers + config<br>2. `SourceService` wraps `SourceManager` with validation and manifest fetching<br>3. Services are injectable for testing<br>4. Unit tests cover all service methods |
| **Status**              | ✅ Complete                                                                                                                                                                                                                                                                 |
| **Priority**            | P0 — Enables thin command implementations                                                                                                                                                                                                                                   |
| **Depends On**          | US-00-A, US-00-B, US-00-C, US-00-D                                                                                                                                                                                                                                          |

**Files to Create:**

| File Path                         | Purpose                                                  | Test File                               |
| --------------------------------- | -------------------------------------------------------- | --------------------------------------- |
| `src/services/artifactService.ts` | Orchestrates detection, fetching, installation, tracking | `test/services/artifactService.test.ts` |
| `src/services/sourceService.ts`   | Wraps source operations with validation                  | `test/services/sourceService.test.ts`   |

**Implementation Steps:**

1. Create `ArtifactService`:

   ```typescript
   export class ArtifactService {
     constructor(
       private config: AiDevConfig,
       private fetcher: typeof GitHubFetcher = GitHubFetcher
     ) {}

     public async install(type: ArtifactType, name: string, source?: string): Promise<InstalledArtifact> {
       // 1. Get source (passed or default)
       // 2. Fetch manifest, find artifact
       // 3. Get detected tool from config
       // 4. Call appropriate installer
       // 5. Track in config, return result
     }

     public async uninstall(type: ArtifactType, name: string): Promise<void> { ... }
     public list(type?: ArtifactType): InstalledArtifact[] { ... }
   }
   ```

2. Create `SourceService`:

   ```typescript
   export class SourceService {
     constructor(private manager: SourceManager, private fetcher: typeof GitHubFetcher = GitHubFetcher) {}

     public async add(repo: string, setDefault = false): Promise<{ artifactCount: number }> {
       // 1. Validate repo format
       // 2. Check not duplicate
       // 3. Fetch manifest to validate
       // 4. Add via manager
       // 5. Return artifact count
     }

     public remove(repo: string): void { ... }
     public list(): SourceConfig[] { ... }
     public setDefault(repo: string): void { ... }
   }
   ```

---

### US-01: AI Dev Init Command

| Field                   | Details                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Title**               | AI Dev Init Command                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Description**         | As a developer, I want to run `sf aidev init` to detect my AI tool, configure a source repository, and install artifacts so that I can quickly set up AI-assisted development in my Salesforce project.                                                                                                                                                                                                                                              |
| **Acceptance Criteria** | 1. Command detects AI tools in project directory (Claude, Copilot, Cursor, etc.)<br>2. If multiple tools detected, prompts user to select one<br>3. Prompts for source repo (with default option)<br>4. Fetches manifest from source and displays available artifacts<br>5. User can select all or choose specific artifacts<br>6. Selected artifacts are installed to correct tool-specific paths<br>7. Configuration is saved to `.sf/ai-dev.json` |
| **Status**              | New                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Depends On**          | US-00-A, US-00-B, US-00-C, US-00-D, US-00-E                                                                                                                                                                                                                                                                                                                                                                                                          |

**Files to Create:**

| File Path                          | Purpose                                                                        |
| ---------------------------------- | ------------------------------------------------------------------------------ |
| `src/commands/aidev/init.ts`       | Command class extending `SfCommand<InitResult>` with `run()` method            |
| `messages/aidev.init.md`           | Messages: `summary`, `description`, `examples`, `flags.*`, `error.*`, `info.*` |
| `test/commands/aidev/init.test.ts` | Unit tests with mocked services and prompts                                    |
| `test/commands/aidev/init.nut.ts`  | NUT: end-to-end test with temp project directory                               |

**Implementation Steps:**

1. Import `Messages` from `@salesforce/core` and load from `aidev.init.md`
2. Define `InitResult` type with `{ tool: string; source: string; artifacts: string[] }`
3. Inject `ArtifactService` and `SourceService` (or instantiate with defaults)
4. Use `this.spinner.start()` during detection and fetching
5. Call `DetectorRegistry.detectAll()` → prompt if multiple tools
6. Call `SourceService.add()` if new source, or use existing default
7. Use `inquirer` (via `@oclif/core` prompts) for artifact multi-select
8. Loop through selected, call `ArtifactService.install(type, name, source)`
9. Return typed result for `--json` support

---

### US-02: Add Skill Command

| Field                   | Details                                                                                                                                                                                                                                                                                                                                       |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Title**               | Add Skill Command                                                                                                                                                                                                                                                                                                                             |
| **Description**         | As a developer, I want to run `sf aidev add skill --name <skill-name>` to install a specific skill from my configured source repository.                                                                                                                                                                                                      |
| **Acceptance Criteria** | 1. Command accepts `--name` (required) and `--source` (optional) flags<br>2. Validates skill exists in source manifest<br>3. Downloads skill files from source repo<br>4. Installs skill to correct path for detected/configured AI tool<br>5. Updates local tracking in `.sf/ai-dev.json`<br>6. Displays success message with installed path |
| **Status**              | New                                                                                                                                                                                                                                                                                                                                           |
| **Depends On**          | US-00-A, US-00-E                                                                                                                                                                                                                                                                                                                              |

**Files to Create:**

| File Path                               | Purpose                                                                                                                                                              |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/commands/aidev/add/skill.ts`       | Command class extending `SfCommand<AddSkillResult>`                                                                                                                  |
| `messages/aidev.add.skill.md`           | Messages: `summary`, `description`, `examples`, `flags.name.summary`, `flags.source.summary`, `error.SkillNotFound`, `error.NoToolConfigured`, `info.SkillInstalled` |
| `test/commands/aidev/add/skill.test.ts` | Unit tests: valid skill, missing skill, no config                                                                                                                    |
| `test/commands/aidev/add/skill.nut.ts`  | NUT: install skill to real temp directory                                                                                                                            |

**Implementation Steps:**

1. Define flags using `Flags.string()`:
   - `--name` / `-n`: required, `summary` from messages
   - `--source` / `-s`: optional, overrides default source
2. Instantiate `ArtifactService` with config
3. Call `artifactService.install('skill', name, source)`
4. Log success with `this.log(messages.getMessage('info.SkillInstalled', [result.name, result.path]))`
5. Return typed result for `--json` support
6. Update `installedArtifacts` array in local config
7. Log success with `this.log(messages.getMessage('info.SkillInstalled', [name, path]))`
8. Return `{ name, path, source }` for JSON output

---

### US-03: Add Agent Command

| Field                   | Details                                                                                                                                                                                                                                                                                                                            |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Title**               | Add Agent Command                                                                                                                                                                                                                                                                                                                  |
| **Description**         | As a developer, I want to run `sf aidev add agent --name <agent-name>` to install a specific agent configuration from my source repository.                                                                                                                                                                                        |
| **Acceptance Criteria** | 1. Command accepts `--name` (required) and `--source` (optional) flags<br>2. Validates agent exists in source manifest<br>3. Downloads agent files from source repo<br>4. Installs agent to correct path for detected AI tool<br>5. Updates local tracking in `.sf/ai-dev.json`<br>6. Displays success message with installed path |
| **Status**              | Done                                                                                                                                                                                                                                                                                                                               |
| **Depends On**          | US-00-A, US-00-E                                                                                                                                                                                                                                                                                                                   |

**Files Created:**

| File Path                               | Purpose                                                                                                                                    |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/commands/aidev/add/agent.ts`       | Command class extending `SfCommand<AddAgentResult>`                                                                                        |
| `messages/aidev.add.agent.md`           | Messages: `summary`, `description`, `examples`, `flags.name.summary`, `flags.source.summary`, `error.AgentNotFound`, `info.AgentInstalled` |
| `test/commands/aidev/add/agent.test.ts` | Unit tests: valid agent, missing agent, tool path mapping                                                                                  |

**Implementation Steps:**

1. Define flags: `--name` (required), `--source` (optional)
2. Instantiate `ArtifactService` with config
3. Call `artifactService.install('agent', name, source)` — service handles tool validation internally
4. Log success with installed path
5. Return typed result for `--json` support

---

### US-04: Add Prompt Command

| Field                   | Details                                                                                                                                                                                                                                                                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Title**               | Add Prompt Command                                                                                                                                                                                                                                                                                                                    |
| **Description**         | As a developer, I want to run `sf aidev add prompt --name <prompt-name>` to install a specific prompt template from my source repository.                                                                                                                                                                                             |
| **Acceptance Criteria** | 1. Command accepts `--name` (required) and `--source` (optional) flags<br>2. Validates prompt exists in source manifest<br>3. Downloads prompt files from source repo<br>4. Installs prompt to correct path for detected AI tool<br>5. Updates local tracking in `.sf/ai-dev.json`<br>6. Displays success message with installed path |
| **Status**              | New                                                                                                                                                                                                                                                                                                                                   |
| **Depends On**          | US-00-A, US-00-E                                                                                                                                                                                                                                                                                                                      |

**Files to Create:**

| File Path                                | Purpose                                                                                                   |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `src/commands/aidev/add/prompt.ts`       | Command class extending `SfCommand<AddPromptResult>`                                                      |
| `messages/aidev.add.prompt.md`           | Messages: `summary`, `description`, `examples`, `flags.*`, `error.PromptNotFound`, `info.PromptInstalled` |
| `test/commands/aidev/add/prompt.test.ts` | Unit tests                                                                                                |
| `test/commands/aidev/add/prompt.nut.ts`  | NUT                                                                                                       |

**Implementation Steps:**

1. Define flags: `--name` (required), `--source` (optional)
2. Instantiate `ArtifactService` with config
3. Call `artifactService.install('prompt', name, source)`
4. Log success with installed path
5. Return typed result for `--json` support

---

### US-05: List Artifacts Command

| Field                   | Details                                                                                                                                                                                                                                                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Title**               | List Artifacts Command                                                                                                                                                                                                                                                                                                                      |
| **Description**         | As a developer, I want to run `sf aidev list artifacts` to see all installed AI artifacts in my project, or use `--source` to see available artifacts from a repository.                                                                                                                                                                    |
| **Acceptance Criteria** | 1. Without flags, lists all locally installed artifacts grouped by type<br>2. With `--source` flag, fetches and displays available artifacts from source repo<br>3. With `--type` flag, filters by artifact type (skill/agent/prompt)<br>4. Output shows name, type, description, and install status<br>5. Supports `--json` for automation |
| **Status**              | New                                                                                                                                                                                                                                                                                                                                         |
| **Depends On**          | US-00-A, US-00-C, US-00-E                                                                                                                                                                                                                                                                                                                   |

**Files to Create:**

| File Path                                    | Purpose                                                                                                          |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `src/commands/aidev/list/artifacts.ts`       | Command class extending `SfCommand<ListArtifactsResult>`                                                         |
| `messages/aidev.list.artifacts.md`           | Messages: `summary`, `description`, `examples`, `flags.source.summary`, `flags.type.summary`, `info.NoArtifacts` |
| `test/commands/aidev/list/artifacts.test.ts` | Unit tests: local list, remote list, filtering                                                                   |
| `test/commands/aidev/list/artifacts.nut.ts`  | NUT                                                                                                              |

**Implementation Steps:**

1. Define flags:
   - `--source` / `-s`: boolean, fetch from remote
   - `--type` / `-t`: option with choices `['skill', 'agent', 'prompt']`
2. Instantiate `ArtifactService` with config
3. If `--source`, call `artifactService.listAvailable(type)` (fetches from default source)
4. Else, call `artifactService.list(type)` for local installed artifacts
5. Use `this.table()` to display results
6. Return typed array for `--json`

---

### US-06: Remove Skill Command

| Field                   | Details                                                                                                                                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Title**               | Remove Skill Command                                                                                                                                                                                                                                                              |
| **Description**         | As a developer, I want to run `sf aidev remove skill --name <skill-name>` to remove an installed skill from my project.                                                                                                                                                           |
| **Acceptance Criteria** | 1. Command accepts `--name` (required) flag<br>2. Validates skill is currently installed<br>3. Prompts for confirmation (unless `--no-prompt`)<br>4. Deletes skill files from tool-specific path<br>5. Updates local tracking in `.sf/ai-dev.json`<br>6. Displays success message |
| **Status**              | New                                                                                                                                                                                                                                                                               |
| **Depends On**          | US-00-A, US-00-E                                                                                                                                                                                                                                                                  |

**Files to Create:**

| File Path                                  | Purpose                                                                                                                                                                 |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/commands/aidev/remove/skill.ts`       | Command class extending `SfCommand<RemoveSkillResult>`                                                                                                                  |
| `messages/aidev.remove.skill.md`           | Messages: `summary`, `description`, `examples`, `flags.name.summary`, `flags.no-prompt.summary`, `error.SkillNotInstalled`, `prompt.ConfirmRemove`, `info.SkillRemoved` |
| `test/commands/aidev/remove/skill.test.ts` | Unit tests: remove success, not installed, cancelled                                                                                                                    |
| `test/commands/aidev/remove/skill.nut.ts`  | NUT                                                                                                                                                                     |

**Implementation Steps:**

1. Define flags:
   - `--name` / `-n`: required string
   - `--no-prompt`: boolean, skip confirmation
2. Instantiate `ArtifactService` with config
3. Check if skill exists via `artifactService.list('skill').find(s => s.name === name)`
4. If not found, throw `SfError` with `error.SkillNotInstalled`
5. Unless `--no-prompt`, use `this.confirm()` for confirmation
6. Call `artifactService.uninstall('skill', name)`
7. Return `{ name, removed: true }`

---

### US-07: Remove Agent Command

| Field                   | Details                                                                                                                                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Title**               | Remove Agent Command                                                                                                                                                                                                                                                              |
| **Description**         | As a developer, I want to run `sf aidev remove agent --name <agent-name>` to remove an installed agent from my project.                                                                                                                                                           |
| **Acceptance Criteria** | 1. Command accepts `--name` (required) flag<br>2. Validates agent is currently installed<br>3. Prompts for confirmation (unless `--no-prompt`)<br>4. Deletes agent files from tool-specific path<br>5. Updates local tracking in `.sf/ai-dev.json`<br>6. Displays success message |
| **Status**              | New                                                                                                                                                                                                                                                                               |
| **Depends On**          | US-00-A, US-00-E                                                                                                                                                                                                                                                                  |

**Files to Create:**

| File Path                                  | Purpose                                                                                                                           |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `src/commands/aidev/remove/agent.ts`       | Command class extending `SfCommand<RemoveAgentResult>`                                                                            |
| `messages/aidev.remove.agent.md`           | Messages: `summary`, `description`, `examples`, `flags.*`, `error.AgentNotInstalled`, `prompt.ConfirmRemove`, `info.AgentRemoved` |
| `test/commands/aidev/remove/agent.test.ts` | Unit tests                                                                                                                        |
| `test/commands/aidev/remove/agent.nut.ts`  | NUT                                                                                                                               |

**Implementation Steps:**

1. Define flags: `--name` (required), `--no-prompt` (boolean)
2. Instantiate `ArtifactService` with config
3. Check if agent exists, throw `SfError` if not found
4. Unless `--no-prompt`, use `this.confirm()` for confirmation
5. Call `artifactService.uninstall('agent', name)`
6. Return typed result

---

### US-08: Source List Command

| Field                   | Details                                                                                                                                                                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Title**               | Source List Command                                                                                                                                                                                                                              |
| **Description**         | As a developer, I want to run `sf aidev source list` to see all configured source repositories and identify which one is the default.                                                                                                            |
| **Acceptance Criteria** | 1. Lists all configured source repos with name and URL<br>2. Indicates which source is the default<br>3. Shows artifact count per source (if cached)<br>4. Supports `--json` for automation<br>5. Shows helpful message if no sources configured |
| **Status**              | New                                                                                                                                                                                                                                              |
| **Depends On**          | US-00-A, US-00-E                                                                                                                                                                                                                                 |

**Files to Create:**

| File Path                                 | Purpose                                                          |
| ----------------------------------------- | ---------------------------------------------------------------- |
| `src/commands/aidev/source/list.ts`       | Command class extending `SfCommand<SourceListResult>`            |
| `messages/aidev.source.list.md`           | Messages: `summary`, `description`, `examples`, `info.NoSources` |
| `test/commands/aidev/source/list.test.ts` | Unit tests: with sources, empty, default indicator               |
| `test/commands/aidev/source/list.nut.ts`  | NUT                                                              |

**Implementation Steps:**

1. Instantiate `SourceService` with global config
2. Call `sourceService.list()` to get all sources
3. If empty, log `info.NoSources` and return `{ sources: [] }`
4. Use `this.table()` to display with default indicator
5. Return typed result for `--json`

---

### US-09: Source Add Command

| Field                   | Details                                                                                                                                                                                                                                                                                                                                         |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Title**               | Source Add Command                                                                                                                                                                                                                                                                                                                              |
| **Description**         | As a developer, I want to run `sf aidev source add --repo <owner/repo>` to add a new GitHub repository as an artifact source.                                                                                                                                                                                                                   |
| **Acceptance Criteria** | 1. Command accepts `--repo` (required) flag in `owner/repo` format<br>2. Validates repo format and accessibility<br>3. Fetches manifest to verify it's a valid source<br>4. Optionally sets as default with `--set-default` flag<br>5. Saves source to global config `~/.sf/ai-dev.json`<br>6. Displays success with available artifact summary |
| **Status**              | New                                                                                                                                                                                                                                                                                                                                             |
| **Depends On**          | US-00-A, US-00-C, US-00-E                                                                                                                                                                                                                                                                                                                       |

**Files to Create:**

| File Path                                | Purpose                                                                                                                                                                                                 |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/commands/aidev/source/add.ts`       | Command class extending `SfCommand<SourceAddResult>`                                                                                                                                                    |
| `messages/aidev.source.add.md`           | Messages: `summary`, `description`, `examples`, `flags.repo.summary`, `flags.set-default.summary`, `error.InvalidRepoFormat`, `error.ManifestNotFound`, `error.SourceAlreadyExists`, `info.SourceAdded` |
| `test/commands/aidev/source/add.test.ts` | Unit tests: valid add, invalid format, duplicate, set default                                                                                                                                           |
| `test/commands/aidev/source/add.nut.ts`  | NUT with mock server                                                                                                                                                                                    |

**Implementation Steps:**

1. Define flags:
   - `--repo` / `-r`: required
   - `--set-default`: boolean
2. Instantiate `SourceService` with global config
3. Call `sourceService.add(repo, setDefault)` — handles validation, duplicate check, manifest fetch
4. Log artifact summary from returned result
5. Return `{ repo, artifactCount, isDefault }`

---

### US-10: Source Remove Command

| Field                   | Details                                                                                                                                                                                                                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Title**               | Source Remove Command                                                                                                                                                                                                                                                               |
| **Description**         | As a developer, I want to run `sf aidev source remove --repo <owner/repo>` to remove a configured source repository.                                                                                                                                                                |
| **Acceptance Criteria** | 1. Command accepts `--repo` (required) flag<br>2. Validates source exists in config<br>3. Prompts for confirmation (unless `--no-prompt`)<br>4. Removes source from global config<br>5. If removed source was default, prompts to select new default<br>6. Displays success message |
| **Status**              | New                                                                                                                                                                                                                                                                                 |
| **Depends On**          | US-00-A, US-00-E                                                                                                                                                                                                                                                                    |

**Files to Create:**

| File Path                                   | Purpose                                                                                                                                                                                          |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/commands/aidev/source/remove.ts`       | Command class extending `SfCommand<SourceRemoveResult>`                                                                                                                                          |
| `messages/aidev.source.remove.md`           | Messages: `summary`, `description`, `examples`, `flags.repo.summary`, `flags.no-prompt.summary`, `error.SourceNotFound`, `prompt.ConfirmRemove`, `prompt.SelectNewDefault`, `info.SourceRemoved` |
| `test/commands/aidev/source/remove.test.ts` | Unit tests: remove success, not found, was default                                                                                                                                               |
| `test/commands/aidev/source/remove.nut.ts`  | NUT                                                                                                                                                                                              |

**Implementation Steps:**

1. Define flags: `--repo` (required), `--no-prompt` (boolean)
2. Load global config, find source
3. If not found, throw `error.SourceNotFound`
4. Confirm removal unless `--no-prompt`
5. Remove from `sources` array
6. If removed source was `defaultSource`:
   - If other sources exist, prompt to select new default
   - Otherwise, set `defaultSource` to `null`
7. Write config, return result

---

### US-11: Source Set-Default Command

| Field                   | Details                                                                                                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Title**               | Source Set-Default Command                                                                                                                                                                                                        |
| **Description**         | As a developer, I want to run `sf aidev source set-default --repo <owner/repo>` to set which source repository is used by default for artifact installation.                                                                      |
| **Acceptance Criteria** | 1. Command accepts `--repo` (required) flag<br>2. Validates source exists in configured sources<br>3. Updates default source in global config<br>4. Displays success with new default info<br>5. Supports `--json` for automation |
| **Status**              | New                                                                                                                                                                                                                               |
| **Depends On**          | US-00-A, US-00-E                                                                                                                                                                                                                  |

**Files to Create:**

| File Path                                        | Purpose                                                                                                              |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `src/commands/aidev/source/set-default.ts`       | Command class extending `SfCommand<SetDefaultResult>`                                                                |
| `messages/aidev.source.set-default.md`           | Messages: `summary`, `description`, `examples`, `flags.repo.summary`, `error.SourceNotConfigured`, `info.DefaultSet` |
| `test/commands/aidev/source/set-default.test.ts` | Unit tests: set success, source not found                                                                            |
| `test/commands/aidev/source/set-default.nut.ts`  | NUT                                                                                                                  |

**Implementation Steps:**

1. Define flag: `--repo` / `-r` (required)
2. Instantiate `SourceService` with global config
3. Call `sourceService.setDefault(repo)` — throws if source not configured
4. Log success message
5. Return `{ repo, previousDefault }`

---

## Shared Infrastructure Files

> **Note:** These files are now tracked in stories US-00-A through US-00-E. This table is retained for reference.

| File Path                           | Purpose                                      | Test File                                 | Story   |
| ----------------------------------- | -------------------------------------------- | ----------------------------------------- | ------- |
| `src/types/manifest.ts`             | TypeScript interfaces for manifest schema    | N/A (types only)                          | US-00-A |
| `src/types/config.ts`               | TypeScript interfaces for config schema      | N/A (types only)                          | US-00-A |
| `src/config/aiDevConfig.ts`         | Extends `ConfigFile` from `@salesforce/core` | `test/config/aiDevConfig.test.ts`         | US-00-A |
| `src/detectors/detector.ts`         | Abstract base class                          | N/A (abstract)                            | US-00-B |
| `src/detectors/copilotDetector.ts`  | GitHub Copilot detection                     | `test/detectors/copilotDetector.test.ts`  | US-00-B |
| `src/detectors/claudeDetector.ts`   | Claude Code detection                        | `test/detectors/claudeDetector.test.ts`   | US-00-B |
| `src/detectors/registry.ts`         | Detector orchestration                       | `test/detectors/registry.test.ts`         | US-00-B |
| `src/sources/gitHubFetcher.ts`      | HTTP client for GitHub raw content           | `test/sources/gitHubFetcher.test.ts`      | US-00-C |
| `src/sources/sourceManager.ts`      | Source CRUD operations                       | `test/sources/sourceManager.test.ts`      | US-00-C |
| `src/installers/installer.ts`       | Abstract base class                          | N/A (abstract)                            | US-00-D |
| `src/installers/skillInstaller.ts`  | Skill installation logic                     | `test/installers/skillInstaller.test.ts`  | US-00-D |
| `src/installers/agentInstaller.ts`  | Agent installation logic                     | `test/installers/agentInstaller.test.ts`  | US-00-D |
| `src/installers/promptInstaller.ts` | Prompt installation logic                    | `test/installers/promptInstaller.test.ts` | US-00-D |
| `src/installers/pathResolver.ts`    | Tool-specific path mapping                   | `test/installers/pathResolver.test.ts`    | US-00-D |
| `src/services/artifactService.ts`   | High-level artifact operations               | `test/services/artifactService.test.ts`   | US-00-E |
| `src/services/sourceService.ts`     | High-level source operations                 | `test/services/sourceService.test.ts`     | US-00-E |

---

## Test Coverage Requirements (95%+)

**Unit Test Patterns (`*.test.ts`):**

```typescript
import { expect } from 'chai';
import { TestContext } from '@salesforce/core/testSetup';
import { stubSfCommandUx } from '@salesforce/sf-plugins-core';
import Init from '../../../src/commands/aidev/init.js';

describe('aidev init', () => {
  const $$ = new TestContext();
  let sfCommandStubs: ReturnType<typeof stubSfCommandUx>;

  beforeEach(() => {
    sfCommandStubs = stubSfCommandUx($$.SANDBOX);
  });

  afterEach(() => {
    $$.restore();
  });

  it('detects single tool and proceeds without prompt', async () => {
    /* ... */
  });
  it('prompts when multiple tools detected', async () => {
    /* ... */
  });
  it('throws error when no tools detected', async () => {
    /* ... */
  });
  it('returns correct JSON structure', async () => {
    /* ... */
  });
});
```

**NUT Test Patterns (`*.nut.ts`):**

```typescript
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { expect } from 'chai';

describe('aidev init NUTs', () => {
  let session: TestSession;

  before(async () => {
    session = await TestSession.create({
      project: { name: 'test-project' },
    });
  });

  after(async () => {
    await session?.clean();
  });

  it('creates config file after init', () => {
    const result = execCmd('aidev init --json', { ensureExitCode: 0 });
    expect(result.jsonOutput?.result).to.have.property('tool');
  });
});
```

**Coverage Targets per File Type:**

| File Type  | Coverage Target | Key Test Scenarios                                          |
| ---------- | --------------- | ----------------------------------------------------------- |
| Commands   | 95%             | Success path, error paths, JSON output, flag combinations   |
| Detectors  | 100%            | Tool present, tool absent, multiple files                   |
| Installers | 95%             | Path transforms per tool, file creation, directory creation |
| Config     | 90%             | Read/write, missing file, invalid JSON                      |
| Fetcher    | 90%             | Success, 404, network error, timeout                        |
