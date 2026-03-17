# ai-dev

[![NPM](https://img.shields.io/npm/v/ai-dev.svg?label=ai-dev)](https://www.npmjs.com/package/ai-dev) [![Downloads/week](https://img.shields.io/npm/dw/ai-dev.svg)](https://npmjs.org/package/ai-dev) [![License](https://img.shields.io/badge/License-BSD%203--Clause-brightgreen.svg)](https://raw.githubusercontent.com/salesforcecli/ai-dev/main/LICENSE.txt)

## Using the template

This repository provides a template for creating a plugin for the Salesforce CLI. To convert this template to a working plugin:

1. Please get in touch with the Platform CLI team. We want to help you develop your plugin.
2. Generate your plugin:

   ```
   sf plugins install dev
   sf dev generate plugin

   git init -b main
   git add . && git commit -m "chore: initial commit"
   ```

3. Create your plugin's repo in the salesforcecli github org
4. When you're ready, replace the contents of this README with the information you want.

## Learn about `sf` plugins

Salesforce CLI plugins are based on the [oclif plugin framework](<(https://oclif.io/docs/introduction.html)>). Read the [plugin developer guide](https://developer.salesforce.com/docs/atlas.en-us.sfdx_cli_plugins.meta/sfdx_cli_plugins/cli_plugins_architecture_sf_cli.htm) to learn about Salesforce CLI plugin development.

### 📚 Comprehensive Documentation

- **[PLUGIN_DEV_GUIDE.md](PLUGIN_DEV_GUIDE.md)** - Complete Salesforce CLI Plugin Developer Guide compiled from official documentation. Includes tutorials, design guidelines, coding patterns, testing strategies, and best practices.
- **[PLUGIN_DEV_SUMMARY.md](PLUGIN_DEV_SUMMARY.md)** - Quick reference summary covering plugin structure, best practices, security, and framework guidelines.
- **[Plugin_Guide.md](Plugin_Guide.md)** - Index of all documentation pages with links to official sources.

This repository contains a lot of additional scripts and tools to help with general Salesforce node development and enforce coding standards. You should familiarize yourself with some of the [node developer packages](#tooling) used by Salesforce.

Additionally, there are some additional tests that the Salesforce CLI will enforce if this plugin is ever bundled with the CLI. These test are included by default under the `posttest` script and it is required to keep these tests active in your plugin if you plan to have it bundled.

### Tooling

- [@salesforce/core](https://github.com/forcedotcom/sfdx-core)
- [@salesforce/kit](https://github.com/forcedotcom/kit)
- [@salesforce/sf-plugins-core](https://github.com/salesforcecli/sf-plugins-core)
- [@salesforce/ts-types](https://github.com/forcedotcom/ts-types)
- [@salesforce/ts-sinon](https://github.com/forcedotcom/ts-sinon)
- [@salesforce/dev-config](https://github.com/forcedotcom/dev-config)
- [@salesforce/dev-scripts](https://github.com/forcedotcom/dev-scripts)

### Testing

This plugin uses the standard Salesforce CLI testing stack:

- **[Mocha](https://mochajs.org/)** - Test runner (configured in `.mocharc.json`)
- **[Chai](https://www.chaijs.com/)** - Assertion library
- **[Sinon](https://sinonjs.org/)** - Mocking and stubbing (via `@salesforce/ts-sinon`)
- **[nyc](https://github.com/istanbuljs/nyc)** - Code coverage
- **[@salesforce/cli-plugins-testkit](https://github.com/salesforcecli/cli-plugins-testkit)** - End-to-end (NUT) testing

```bash
# Run unit tests
yarn test

# Run tests with coverage
yarn test --coverage
```

### Development Stack

This plugin uses the following development tools and frameworks:

| Category          | Tool                                                 | Config File             | Purpose                         |
| ----------------- | ---------------------------------------------------- | ----------------------- | ------------------------------- |
| **CLI Framework** | [oclif](https://oclif.io/) v4+                       | `package.json`          | CLI command framework           |
| **Language**      | [TypeScript](https://www.typescriptlang.org/) 5.4    | `tsconfig.json`         | Strict ESM mode                 |
| **Runtime**       | [Node.js](https://nodejs.org/) ≥18                   | `package.json`          | JavaScript runtime              |
| **Build**         | [Wireit](https://github.com/nicolo-ribaudo/wireit)   | `package.json`          | Incremental builds              |
| **Linting**       | [ESLint](https://eslint.org/)                        | `.eslintrc.cjs`         | SF TypeScript + sf-plugin rules |
| **Formatting**    | [Prettier](https://prettier.io/)                     | `.prettierrc.json`      | @salesforce/prettier-config     |
| **Git Hooks**     | [Husky](https://typicode.github.io/husky/)           | `.husky/`               | Automated checks on commit/push |
| **Commits**       | [commitlint](https://commitlint.js.org/)             | `commitlint.config.cjs` | Conventional commits            |
| **Staged Lint**   | [lint-staged](https://github.com/okonet/lint-staged) | `.lintstagedrc.cjs`     | Format on commit                |

**Git Hooks Workflow:**

- **pre-commit**: Runs lint and formats staged files
- **commit-msg**: Validates commit message format
- **pre-push**: Builds and runs tests

### Hooks

For cross clouds commands, e.g. `sf env list`, we utilize [oclif hooks](https://oclif.io/docs/hooks) to get the relevant information from installed plugins.

This plugin includes sample hooks in the [src/hooks directory](src/hooks). You'll just need to add the appropriate logic. You can also delete any of the hooks if they aren't required for your plugin.

# Everything past here is only a suggestion as to what should be in your specific plugin's description

This plugin is bundled with the [Salesforce CLI](https://developer.salesforce.com/tools/sfdxcli). For more information on the CLI, read the [getting started guide](https://developer.salesforce.com/docs/atlas.en-us.sfdx_setup.meta/sfdx_setup/sfdx_setup_intro.htm).

We always recommend using the latest version of these commands bundled with the CLI, however, you can install a specific version or tag if needed.

## Install

```bash
sf plugins install ai-dev@x.y.z
```

## Issues

Please report any issues at https://github.com/forcedotcom/cli/issues

## Contributing

1. Please read our [Code of Conduct](CODE_OF_CONDUCT.md)
2. Create a new issue before starting your project so that we can keep track of
   what you are trying to add/fix. That way, we can also offer suggestions or
   let you know if there is already an effort in progress.
3. Fork this repository.
4. [Build the plugin locally](#build)
5. Create a _topic_ branch in your fork. Note, this step is recommended but technically not required if contributing using a fork.
6. Edit the code in your fork.
7. Write appropriate tests for your changes. Try to achieve at least 95% code coverage on any new code. No pull request will be accepted without unit tests.
8. Sign CLA (see [CLA](#cla) below).
9. Send us a pull request when you are done. We'll review your code, suggest any needed changes, and merge it in.

### CLA

External contributors will be required to sign a Contributor's License
Agreement. You can do so by going to https://cla.salesforce.com/sign-cla.

### Build

To build the plugin locally, make sure to have yarn installed and run the following commands:

```bash
# Clone the repository
git clone git@github.com:salesforcecli/ai-dev

# Install the dependencies and compile
yarn && yarn build
```

To use your plugin, run using the local `./bin/dev` or `./bin/dev.cmd` file.

```bash
# Run using local run file.
./bin/dev <command>
```

There should be no differences when running via the Salesforce CLI or using the local run file. However, it can be useful to link the plugin to do some additional testing or run your commands from anywhere on your machine.

```bash
# Link your plugin to the sf cli
sf plugins link .
# To verify
sf plugins
```

## Commands

<!-- commands -->

_No commands implemented yet. Add your commands in `src/commands/`._

<!-- commandsstop -->

## AI Tools Detection

| Tool Name          | Detection Path                                                                                          | Link To Documentation                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **GitHub Copilot** | `.github/copilot-instructions.md`<br>`.github/instructions/`<br>`.github/agents/`<br>`.github/prompts/` | [GitHub Copilot Docs](https://docs.github.com/en/copilot/customizing-copilot/adding-repository-custom-instructions-for-github-copilot) |
| **Claude Code**    | `.claude/`                                                                                              | [Claude Code Docs](https://code.claude.com/docs/en/memory)                                                                             |
| **Codex (OpenAI)** | `.codex/`                                                                                               | [Codex Docs](https://developers.openai.com/codex/guides/agents-md)                                                                     |
| **Gemini CLI**     | `.gemini/`                                                                                              | [Gemini CLI Docs](https://geminicli.com/docs/)                                                                                         |
| **Cursor**         | `.cursor/`                                                                                              | [Cursor Docs](https://cursor.com/docs/rules)                                                                                           |
| **Windsurf**       | `.windsurf/`                                                                                            | [Windsurf Docs](https://docs.windsurf.com/windsurf/cascade/memories)                                                                   |
