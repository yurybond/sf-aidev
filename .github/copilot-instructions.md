# Salesforce CLI Plugin Development Guidelines

This document provides essential requirements and principles for developing Salesforce CLI plugins using the oclif framework.

> **📚 Comprehensive Guide**: For the complete Salesforce CLI Plugin Developer Guide with detailed tutorials, code examples, and best practices, see [PLUGIN_DEV_GUIDE.md](../PLUGIN_DEV_GUIDE.md).
>
> **⚡ Quick Reference**: For a concise summary of plugin structure, best practices, security, and limitations, see [PLUGIN_DEV_SUMMARY.md](../PLUGIN_DEV_SUMMARY.md).

## Architecture Overview

Salesforce CLI is built on the **oclif** (Open CLI Framework), a Node.js framework for building CLIs. Plugins extend the CLI by providing commands, hooks, and shared functionality.

### Key Dependencies

- **@oclif/core** - Core oclif framework (v4+)
- **@salesforce/core** - Salesforce-specific utilities (authentication, connections, config)
- **@salesforce/sf-plugins-core** - Salesforce CLI command base class and custom flags

## Command Structure

### Basic Command Pattern

Commands extend `SfCommand` from `@salesforce/sf-plugins-core`:

```typescript
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('plugin-name', 'command.name');

export type CommandResult = {
  // Define your return type
};

export default class MyCommand extends SfCommand<CommandResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    // Define flags here
  };

  public async run(): Promise<CommandResult> {
    const { flags } = await this.parse(MyCommand);
    // Command logic
    return result;
  }
}
```

### Command Static Properties

| Property         | Type     | Description                                                                     |
| ---------------- | -------- | ------------------------------------------------------------------------------- |
| `summary`        | string   | Brief one-line description shown in help                                        |
| `description`    | string   | Detailed multi-line description                                                 |
| `examples`       | string[] | Usage examples (supports `<%= config.bin %>` and `<%= command.id %>` templates) |
| `flags`          | object   | Flag definitions                                                                |
| `args`           | object   | Argument definitions                                                            |
| `hidden`         | boolean  | Hide command from help (default: false)                                         |
| `strict`         | boolean  | Fail on invalid arguments (default: true, set false for variable args)          |
| `aliases`        | string[] | Alternative command names                                                       |
| `enableJsonFlag` | boolean  | Enable `--json` flag for JSON output                                            |

### Command Methods

- `this.log(message)` - Output to stdout (non-blocking, suppressed with `--json`)
- `this.warn(message)` - Display warning message
- `this.error(message, options?)` - Display error and exit (options: `code`, `exit`, `suggestions`, `ref`)
- `this.exit(code)` - Exit process with status code
- `this.logToStderr(message)` - Log to stderr
- `this.jsonEnabled()` - Check if `--json` flag is present

## Flags

### Built-in Flag Types

```typescript
import { Flags } from '@salesforce/sf-plugins-core';

static flags = {
  // String flag
  name: Flags.string({
    char: 'n',
    summary: 'Flag summary',
    description: 'Detailed description',
    required: false,
    default: 'defaultValue',
  }),

  // Boolean flag
  force: Flags.boolean({
    char: 'f',
    summary: 'Force operation',
    allowNo: true,  // Allows --no-force
  }),

  // Integer flag
  count: Flags.integer({
    char: 'c',
    min: 1,
    max: 100,
  }),

  // Options flag (enum)
  format: Flags.option({
    options: ['json', 'csv', 'table'] as const,
    default: 'table',
  })(),
};
```

### Flag Properties

| Property      | Description                               |
| ------------- | ----------------------------------------- |
| `char`        | Single character shorthand                |
| `summary`     | Brief help text                           |
| `description` | Detailed help text                        |
| `required`    | Make flag required                        |
| `default`     | Default value (can be async function)     |
| `options`     | Restrict to discrete set of values        |
| `multiple`    | Allow flag to be specified multiple times |
| `env`         | Read default from environment variable    |
| `hidden`      | Hide from help                            |
| `dependsOn`   | Array of flags this depends on            |
| `exclusive`   | Array of flags this cannot be used with   |
| `parse`       | Custom parser function                    |

### Salesforce-Specific Flags

Salesforce CLI provides custom flags in `@salesforce/sf-plugins-core`:

- **salesforceId** - Validates Salesforce ID format
- **duration** - Converts integer to Duration instance
- **orgApiVersion** - API version flag
- **requiredOrg** - Requires org connection
- **optionalOrg** - Optional org connection
- **requiredHub** - Requires Dev Hub connection

## Arguments

```typescript
import { Args } from '@oclif/core';

static args = {
  file: Args.string({
    description: 'Path to file',
    required: true,
  }),
  name: Args.string({
    description: 'Optional name',
    default: 'default',
    options: ['a', 'b', 'c'],  // Restrict values
  }),
};
```

### Argument Types

- `Args.string()`
- `Args.integer()`
- `Args.boolean()`
- `Args.url()`
- `Args.file()`
- `Args.directory()`
- `Args.custom()`

## Messages System

### Message File Structure

Messages are stored in `messages/` directory as Markdown files:

```markdown
# summary

Brief command description.

# description

Detailed command description.
Can be multiple lines.

# flags.name.summary

Flag summary text.

# flags.name.description

Flag detailed description.

# examples

- Example description:

  <%= config.bin %> <%= command.id %> --flag value

# info.success

Success message with %s placeholder.

# error.notFound

Error: Resource %s not found.
```

### Loading Messages

```typescript
import { Messages } from '@salesforce/core';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('plugin-name', 'command.topic');

// Single message
const summary = messages.getMessage('summary');

// Message with placeholders
const formatted = messages.getMessage('info.success', ['value']);

// Array of messages
const examples = messages.getMessages('examples');
```

## Topics and Command Organization

### Directory Structure

Commands are organized by topics using directory structure:

```
src/
└── commands/
    └── topic/
        ├── subtopic/
        │   └── command.ts    # sf topic subtopic command
        ├── list.ts           # sf topic list
        └── create.ts         # sf topic create
```

### Topic Configuration

Define topic descriptions in `package.json`:

```json
{
  "oclif": {
    "topics": {
      "topic": {
        "description": "Topic description"
      },
      "topic:subtopic": {
        "description": "Subtopic description"
      }
    }
  }
}
```

## Hooks

### Lifecycle Events

| Hook                | When Triggered                               |
| ------------------- | -------------------------------------------- |
| `init`              | CLI initialization, before command discovery |
| `prerun`            | After init, before command execution         |
| `postrun`           | After command completes successfully         |
| `finally`           | After command finishes (success or failure)  |
| `command_not_found` | Command not found before error display       |
| `preparse`          | Before flags/args parsing (root CLI only)    |

### Creating Hooks

```typescript
// src/hooks/init/example.ts
import { Hook } from '@oclif/core';

const hook: Hook.Init = async function (options) {
  console.log(`Initializing before ${options.id}`);
};

export default hook;
```

### Registering Hooks

```json
{
  "oclif": {
    "hooks": {
      "init": "./lib/hooks/init/example",
      "postrun": ["./lib/hooks/postrun/analytics", "./lib/hooks/postrun/telemetry"]
    }
  }
}
```

## Plugin Configuration (package.json)

```json
{
  "oclif": {
    "commands": "./lib/commands",
    "bin": "sf",
    "topicSeparator": " ",
    "flexibleTaxonomy": true,
    "plugins": ["@oclif/plugin-help"],
    "devPlugins": ["@oclif/plugin-help"],
    "topics": {
      "mytopic": {
        "description": "Topic description"
      }
    },
    "hooks": {
      "init": "./lib/hooks/init"
    }
  }
}
```

## Best Practices

### Command Design

1. **Return typed results** - Always define and return a typed result object
2. **Support JSON output** - Set `enableJsonFlag: true` for automation-friendly commands
3. **Use Messages** - Externalize all user-facing strings to message files
4. **Provide examples** - Include practical examples in command help
5. **Validate input** - Use flag/arg validation, custom parsers when needed

### Error Handling

```typescript
// Friendly errors (no stack trace)
this.error('Resource not found', {
  code: 'RESOURCE_NOT_FOUND',
  exit: 1,
  suggestions: ['Check the resource name', 'Verify permissions'],
  ref: 'https://docs.example.com/errors/not-found',
});

// Warnings (non-fatal)
this.warn('This feature is deprecated');
```

### Timeouts

- oclif terminates the process 10 seconds after `run()` resolves
- Always `await` all async operations in `run()`
- Never fire and forget promises

### Testing

**Framework Stack:**

- **Mocha** - Test runner (configured in `.mocharc.json`)
- **Chai** - Assertion library
- **Sinon** - Mocking/stubbing (via `@salesforce/ts-sinon`)
- **c8** - Code coverage reporting (V8-native, ESM-compatible)

**Test Types:**

- **Unit tests** - Test command logic in isolation (`*.test.ts`)
- **NUT tests** - End-to-end tests (`*.nut.ts`) using `@salesforce/cli-plugins-testkit`

**Requirements:**

- Target 95%+ code coverage on new code
- Run tests with `yarn test`

### Code Organization

1. One command per file
2. Use base classes for shared logic
3. Keep commands focused on single responsibility
4. Extract complex logic to separate utility modules

## Project Structure

```
plugin-name/
├── src/
│   ├── commands/           # Command implementations
│   │   └── topic/
│   │       └── command.ts
│   ├── hooks/              # Hook implementations
│   └── index.ts            # Plugin entry point
├── messages/               # Externalized strings
│   └── topic.command.md
├── test/
│   └── commands/
│       └── topic/
│           ├── command.test.ts   # Unit tests
│           └── command.nut.ts    # NUT tests
├── lib/                    # Compiled output
├── package.json
└── tsconfig.json
```

## Configuration Files Reference

| File                    | Purpose                                                                                   |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| `package.json`          | Dependencies, scripts, oclif config, wireit tasks                                         |
| `tsconfig.json`         | TypeScript compiler options (extends @salesforce/dev-config)                              |
| `.eslintrc.cjs`         | ESLint rules (eslint-config-salesforce-typescript + sf-plugin)                            |
| `.prettierrc.json`      | Prettier config (@salesforce/prettier-config)                                             |
| `.mocharc.json`         | Mocha test runner config (ts-node, 600s timeout)                                          |
| `.c8rc.json`            | Code coverage thresholds (95% lines/statements, 93% branches, 88% functions; UI excluded) |
| `.editorconfig`         | Editor settings (2-space indent, UTF-8)                                                   |
| `.husky/`               | Git hooks (pre-commit, commit-msg, pre-push)                                              |
| `.lintstagedrc.cjs`     | Lint-staged config for pre-commit formatting                                              |
| `commitlint.config.cjs` | Commit message validation (@commitlint/config-conventional)                               |
| `.sfdevrc.json`         | Salesforce dev-scripts config (wireit test dependencies)                                  |

## Code Quality Tools

### Linting

```bash
yarn lint          # Run ESLint
yarn format        # Run Prettier
```

ESLint extends:

- `eslint-config-salesforce-typescript` - Salesforce TypeScript standards
- `plugin:sf-plugin/recommended` - SF CLI plugin-specific rules

### Git Hooks (Husky)

| Hook         | Action                                    |
| ------------ | ----------------------------------------- |
| `pre-commit` | `yarn lint && yarn pretty-quick --staged` |
| `commit-msg` | `yarn commitlint --edit`                  |
| `pre-push`   | `yarn build && yarn test`                 |

### Commit Message Format

Follows [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

Types: feat, fix, docs, style, refactor, test, chore
Example: feat(commands): add new deploy command
```

## Useful oclif Plugins

- `@oclif/plugin-help` - Help command
- `@oclif/plugin-not-found` - "Did you mean" suggestions
- `@oclif/plugin-autocomplete` - Shell autocomplete
- `@oclif/plugin-plugins` - Allow user plugin installation
- `@oclif/plugin-warn-if-update-available` - Update notifications

## References

- **[PLUGIN_DEV_GUIDE.md](../PLUGIN_DEV_GUIDE.md)** - Complete offline guide compiled from official Salesforce documentation
- **[PLUGIN_DEV_SUMMARY.md](../PLUGIN_DEV_SUMMARY.md)** - Quick reference for structure, best practices, security, and limitations
- [oclif Documentation](https://oclif.io/docs)
- [Salesforce CLI Plugin Developer Guide](https://developer.salesforce.com/docs/platform/salesforce-cli-plugin/guide)
- [@salesforce/sf-plugins-core API](https://salesforcecli.github.io/sf-plugins-core/)
- [@salesforce/core API](https://forcedotcom.github.io/sfdx-core/)
