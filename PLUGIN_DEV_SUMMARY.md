# Salesforce CLI Plugin Development - Quick Reference Summary

This summary highlights key aspects from the [PLUGIN_DEV_GUIDE.md](PLUGIN_DEV_GUIDE.md) for quick reference.

---

## Plugin Structure

### Directory Layout

```
plugin-name/
├── src/
│   ├── commands/           # Command implementations
│   │   └── topic/
│   │       └── command.ts  # sf topic command
│   ├── hooks/              # Lifecycle hooks
│   └── index.ts            # Plugin entry point
├── messages/               # Externalized strings (.md files)
│   └── topic.command.md
├── test/
│   └── commands/
│       ├── *.test.ts       # Unit tests
│       └── *.nut.ts        # Integration tests (NUTs)
├── lib/                    # Compiled output
├── package.json
└── tsconfig.json
```

### Key Files

| File                   | Purpose                                             |
| ---------------------- | --------------------------------------------------- |
| `package.json`         | Plugin metadata, oclif config, topic definitions    |
| `src/commands/**/*.ts` | Command implementations extending `SfCommand`       |
| `messages/*.md`        | Help text, descriptions, error messages in Markdown |
| `bin/dev.js`           | Development runner for testing commands locally     |

### Command Naming Convention

```
sf <topic> <action> <resource> [flags]
```

- **Topics**: Nouns (e.g., `org`, `project`, `apex`)
- **Actions**: Verbs (e.g., `create`, `deploy`, `list`)
- **Resources**: Optional qualifying nouns (e.g., `scratch`, `sandbox`)

---

## Best Practices

### Command Design

1. **Single Responsibility** - Each command performs one distinct task
2. **Typed Results** - Always define and return typed result objects
3. **JSON Support** - Enable `--json` flag for automation-friendly output
4. **Externalize Strings** - Use Messages system for all user-facing text
5. **Provide Examples** - Include practical, runnable examples in help

### Flag Guidelines

- Use **kebab-case** for long names (`--target-org`, not `--targetOrg`)
- Provide **short names** for required flags (`-o` for `--target-org`)
- Use `multiple: true` instead of comma-separated values
- **Reserved flags**: `--help`, `-h`, `--json`, `--version`, `-v`, `--flags-dir`

### Error Handling

```typescript
// Friendly errors with suggestions
this.error('Resource not found', {
  code: 'RESOURCE_NOT_FOUND',
  exit: 1,
  suggestions: ['Check the resource name', 'Verify permissions'],
});

// Warnings (non-fatal)
this.warn('This feature is deprecated');
```

### Error Exit Codes

| Code | Meaning                          |
| ---- | -------------------------------- |
| 0    | Success                          |
| 1    | General error                    |
| 2    | oclif flag/arg errors            |
| 10   | TypeErrors                       |
| 20   | Salesforce server errors (GACKs) |
| 68   | Partial success                  |
| 69   | Timeout/in-progress              |
| 130  | User termination (Ctrl+C)        |

### Testing Strategy

- **Unit Tests** (`*.test.ts`) - Test library-level code with mocks
- **NUTs** (`*.nut.ts`) - End-to-end tests against real orgs
- Target **95%+ code coverage** on new code
- Use `@salesforce/cli-plugins-testkit` for integration testing

---

## Security Measures

### Authentication

- Use `requiredOrg` / `optionalOrg` flags for org connections
- Never store credentials in code or config files
- Leverage `@salesforce/core` AuthInfo for secure token management

### Input Validation

- Validate all user input using flag parsers and validators
- Use typed flags (`salesforceId`, `duration`, `orgApiVersion`)
- Implement custom validators for domain-specific input

### Dependency Security

- Use **Dependabot** for automated dependency updates
- Scan with **Snyk** for security vulnerabilities
- Audit third-party libraries before adoption

### Sensitive Data

- Never log credentials or tokens
- Use `this.log()` which auto-suppresses with `--json` flag
- Avoid exposing internal paths or system information in errors

---

## Framework Guidelines

### oclif Core Concepts

- Commands extend `SfCommand` from `@salesforce/sf-plugins-core`
- Flags/args are parsed automatically before `run()` executes
- Messages loaded via `Messages.loadMessages()` from Markdown files
- Hooks provide lifecycle extension points (`init`, `prerun`, `postrun`)

### Required Libraries

| Library                       | Purpose                                 |
| ----------------------------- | --------------------------------------- |
| `@oclif/core`                 | CLI framework foundation                |
| `@salesforce/core`            | Org auth, connections, config, messages |
| `@salesforce/sf-plugins-core` | SfCommand base class, Salesforce flags  |

### Recommended Libraries

| Library                              | Purpose                              |
| ------------------------------------ | ------------------------------------ |
| `@salesforce/kit`                    | Utilities (JSON, env vars, patterns) |
| `@salesforce/source-deploy-retrieve` | Metadata operations                  |
| `got`                                | HTTP requests                        |
| `chalk`                              | Terminal colors                      |
| `graceful-fs`                        | Resilient file operations            |

### Yarn Scripts (Generated Plugin)

| Script           | Purpose                      |
| ---------------- | ---------------------------- |
| `yarn build`     | Clean, compile, and lint     |
| `yarn compile`   | Compile TypeScript to lib/   |
| `yarn lint`      | Run ESLint                   |
| `yarn test`      | Run unit tests with coverage |
| `yarn test:nuts` | Run integration tests        |

---

## Limitations & Constraints

### Process Timeouts

- oclif terminates process **10 seconds** after `run()` resolves
- Always `await` all async operations
- Never fire-and-forget promises

### Flag Restrictions

- Cannot change command's fundamental behavior based on flag values
- JSON output structure should remain consistent regardless of flags
- Avoid positional arguments; prefer explicit flags

### Plugin Bundling Requirements

If bundling with core Salesforce CLI:

- Must follow all design guidelines
- Must generate JSON schema for all commands
- Must maintain minimum code coverage
- Must pass `posttest` checks

### Message File Format

- Must use Markdown (.md) format
- H1 headers (`#`) are message keys
- Single-line summaries required
- Examples must use `<%= config.bin %> <%= command.id %>` syntax

### ESM Considerations

- Plugins use ECMAScript Modules (ESM)
- Cannot auto-compile ESM while running; run `yarn compile --watch`
- Use `import.meta.url` with `Messages.importMessagesDirectoryFromMetaUrl()`

---

## Quick Command Template

```typescript
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('my-plugin', 'my.command');

export type MyCommandResult = {
  success: boolean;
  data: string;
};

export default class MyCommand extends SfCommand<MyCommandResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    'target-org': Flags.requiredOrg(),
    name: Flags.string({
      char: 'n',
      summary: messages.getMessage('flags.name.summary'),
      required: true,
    }),
  };

  public async run(): Promise<MyCommandResult> {
    const { flags } = await this.parse(MyCommand);

    // Your logic here
    this.log(`Processing ${flags.name}...`);

    return { success: true, data: flags.name };
  }
}
```

---

## References

- [PLUGIN_DEV_GUIDE.md](PLUGIN_DEV_GUIDE.md) - Complete guide
- [oclif Documentation](https://oclif.io/docs)
- [sf-plugins-core API](https://salesforcecli.github.io/sf-plugins-core/)
- [@salesforce/core API](https://forcedotcom.github.io/sfdx-core/)
