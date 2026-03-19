# Salesforce CLI Plugin Developer Guide

This document contains the complete Salesforce CLI Plugin Developer Guide compiled from the official documentation.

---

## 1. Overview of Salesforce CLI Plugins

**Source:** https://developer.salesforce.com/docs/platform/salesforce-cli-plugin/guide/conceptual-overview.html

A Salesforce plugin is a set of CLI commands that are grouped together. For example, the [plugin-deploy-retrieve](https://github.com/salesforcecli/plugin-deploy-retrieve) plugin provides commands to deploy and retrieve metadata to and from an org, such as `project deploy start` and `project retrieve start`. Salesforce CLI is itself a plugin.

Salesforce CLI plugins are npm (Node.js package manager) packages. Node.js is a JavaScript runtime environment that supports execution outside of a browser. If you prefer strongly typed languages, don't worry: We recommend that you use TypeScript, which transpiles to JavaScript. The sample plugin generated from the plugin generator command (`dev generate plugin`) uses TypeScript.

We recommend using TypeScript instead of JavaScript because it's strongly typed and thus better suited to large projects. The stronger types give a better IDE experience and reduce common programming mistakes that are easy to make but hard to debug.

A user installs a plugin by running `sf plugins install PLUGINNAME`, where `PLUGINNAME` is an npm package on [https://npmjs.com](https://npmjs.com/). To see your installed plugins and their versions, run `sf plugins`. To see which versions of the core Salesforce-provided plugins are installed on your computer, run `sf plugins --core`.

### Why Create a Salesforce CLI Plugin

The Salesforce CLI core plugins provide commands and functionality to meet common needs that customers and partners have. But your team often has specific needs. That's why Salesforce CLI is extensible. Perhaps you have specific tools that you want to use for code analysis as part of your CI/CD automation process. You can build a plugin that runs your bespoke code-analysis tool. Creating a plugin provides the benefits of a consistent user experience and a common framework.

A Salesforce plugin that's included in the core Salesforce CLI but developed outside the core CLI team is [code-analyzer](https://github.com/forcedotcom/code-analyzer), which supports [Salesforce Code Analyzer](https://developer.salesforce.com/docs/platform/salesforce-code-analyzer/overview). With Code Analyzer, you can make sure your code adheres to best practices, helping you identify problems earlier while you develop. The plugin contains the `code-analyzer` commands to run scans and manage rules.

Because so much Salesforce functionality is surfaced in APIs, the sky's the limit as to what you can build. With Salesforce Plugin Generator, the [@salesforce/sf-plugins-core](https://github.com/salesforcecli/sf-plugins-core), and [@salesforce/core](https://github.com/forcedotcom/sfdx-core/tree/v3) libraries, you have the tools to get started with Salesforce CLI plugin development.

### Required Knowledge and Skills

Building a Salesforce CLI plugin requires different knowledge and skills than most Salesforce development. Before you dive into plugin development, familiarize yourself with these areas.

- [TypeScript](https://www.typescriptlang.org/)
- [Node.js](https://nodejs.org/en/)
- [npm](https://www.npmjs.com/) (Node.js Package Manager)
- [Yarn](https://classic.yarnpkg.com/lang/en/)
- [Salesforce Platform APIs](https://trailhead.salesforce.com/en/content/learn/modules/api_basics)

### Salesforce CLI Architecture

Salesforce CLI is an npm package called `@salesforce/cli`. You run it on your local machine or continuous integration (CI) system. It supports the installation of custom plugins. Most of the core functionality that Salesforce provides comes from plugins.

Use Salesforce CLI for many of your development tasks, such as authorizing to any type of org, creating scratch orgs, synchronizing source code between your scratch orgs and version control system (VCS), and running tests.

All Salesforce CLI commands start with `sf`. To see which core and installed plugin version you're using, run `sf plugins --core`. To see the available sets of commands—also known top-level topics—run `sf --help`. To see a list of all available commands in an easy-to-read format, run `sf commands`.

Are you a visual person? Then check out [this page](https://github.com/salesforcecli/cli/blob/main/ARCHITECTURE.md#salesforce-cli-architecture) for a graphical representation of Salesforce CLI. Be sure you scroll down to the graphic of a typical Salesforce CLI plugin and its libraries. Finally, see the [command execution flow diagram](https://github.com/salesforcecli/cli/blob/main/ARCHITECTURE.md#command-execution) which outlines the high-level process that occurs every time a user executes a CLI command.

#### Core Salesforce CLI Plugins

The core `sf` commands are provided by a set of core Salesforce-provided plugins that are installed by default when you install Salesforce CLI.

These core plugins contain commands in a hierarchy that reflect a typical developer's workflow. For example, the top-level topics include configuring the CLI (`config`), working with Salesforce DX projects (`project`), and working with scratch orgs and sandboxes (`org`). See the [Salesforce CLI Command Reference](https://developer.salesforce.com/docs/atlas.en-us.sfdx_cli_reference.meta/sfdx_cli_reference/cli_reference_unified.htm), which is also organized into this command hierarchy. You can create your own top-level topics to contain your commands.

See the [Salesforce CLI Status](https://github.com/salesforcecli/status) page for a list of all the core CLI plugins, their GitHub repos, and their status.

#### Open Source Repositories

All the code that makes up the core Salesforce CLI is open sourced in GitHub repositories, from the [top-level cli](https://github.com/salesforcecli/cli) package to the individual plugins, such as [plugin-deploy-retrieve](https://github.com/salesforcecli/plugin-deploy-retrieve) and [plugin-org](https://github.com/salesforcecli/plugin-org). We highly recommend that you study this code to learn the best practices of Salesforce CLI plugin development.

#### Open CLI Framework (oclif)

oclif is an open-source CLI framework developed by Heroku and maintained by Salesforce. It powers Heroku CLI, the core Salesforce-provided plugins, and Salesforce Plugin Generator. The plugins that you generate with Salesforce Plugin Generator use the oclif format and can take advantage of the many features that the framework offers. In addition to enabling plugin creation, this framework enables developers to create their own standalone CLI applications.

For details about oclif, see [https://oclif.io/](https://oclif.io/). For information about the features that oclif offers, see [https://oclif.io/docs/features](https://oclif.io/docs/features). For the oclif API reference, see [https://oclif.io/docs/commands](https://oclif.io/docs/commands).

### How sf and sfdx Plugin Development Differs

Some of you might be familiar with the old and deprecated [sfdx-style Salesforce CLI commands](https://developer.salesforce.com/docs/atlas.en-us.248.0.sfdx_cli_reference.meta/sfdx_cli_reference/cli_reference.htm) and even have created an `sfdx`-style plugin. Creating an `sf` plugin is similar. For example, you still use Typescript or Javascript as the programming language, and the underlying framework is still oclif. But there are a few key differences:

- `sfdx` commands use the `SfdxCommand` base class whereas `sf` commands use the `SfCommand` base class. Both of these classes offer developers different types of functionality. For example:
  - `SfdxCommand` offers various properties related to working with usernames, such as `supportsUsername` and `requiresUsername`. `SfCommand` doesn't have these properties and instead provides custom flags. See [optionalOrgFlag](https://salesforcecli.github.io/sf-plugins-core/functions/flags_orgFlags.optionalOrgFlag.html) and [requiredOrgFlag](https://salesforcecli.github.io/sf-plugins-core/functions/flags_orgFlags.requiredOrgFlag.html).
  - `SfdxCommand` automatically initializes various classes that developers are likely going to need, such as `configAggregator` and `logger`. To stay lighter, however, `SfCommand` doesn't work this way. Instead, you initialize those classes yourself. See the [API Docs](https://forcedotcom.github.io/sfdx-core) for `@salesforce/core` for examples.
  - `SfCommand` provides more UX methods by default than `SfdxCommand`. See the [API Docs](https://salesforcecli.github.io/sf-plugins-core/modules/sfCommand.html) for details.
- Help and error messages are stored in Markdown files rather than JSON or JavaScript.
- The style of help messages and user experience (UX) design is different. A few examples include:
  - In `sf`, we capitalize the beginning of command and flag descriptions, and use ending punctuation. In `sfdx` we kept descriptions lowercase and didn't use punctuation.
  - The human-readable table output looks different in `sf`.
- `sf` plugins have `sf`-specific linting rules, such as use of dashes instead of camelCase in long flag names.
- Plugins that are bundled in Salesforce CLI are required to generate JSON schema for all their commands. This requirement isn't enforced for non-bundled plugins, although it's recommended.

---

## 2. Salesforce CLI Release Notes

**Source:** https://developer.salesforce.com/docs/platform/salesforce-cli-plugin/guide/gs-release-notes.html

Salesforce CLI releases weekly. To learn about the latest features and changes, see the [Salesforce CLI Release Notes](https://github.com/forcedotcom/cli/blob/main/releasenotes/README.md).

---

## 3. Get Started Building a Salesforce CLI Plugin

**Source:** https://developer.salesforce.com/docs/platform/salesforce-cli-plugin/guide/get-started.html

This section helps you get started creating your own custom plugins. Run through these steps to generate a fully functional plugin.

1. [Set up your development environment.](https://developer.salesforce.com/docs/platform/salesforce-cli-plugin/guide/gs-setup-dev-env.html)
2. [Generate the initial scaffolding for a basic plugin.](https://developer.salesforce.com/docs/platform/salesforce-cli-plugin/guide/gs-generate-plugin.html)
3. [Run the sample hello world command.](https://developer.salesforce.com/docs/platform/salesforce-cli-plugin/guide/gs-generate-plugin.html#say-hello-to-the-world)
4. [Tour the generated files to learn what source code makes up a Salesforce CLI plugin.](https://developer.salesforce.com/docs/platform/salesforce-cli-plugin/guide/gs-generate-plugin.html#tour-the-generated-files)
5. [Add two custom commands to your plugin.](https://developer.salesforce.com/docs/platform/salesforce-cli-plugin/guide/gs-add-commands.html)

Congrats! You created a simple Salesforce CLI plugin that can handle a few simple tasks. But your business needs are more complex. So now check out the [next steps](https://developer.salesforce.com/docs/platform/salesforce-cli-plugin/guide/gs-next-steps.html) in your plugin journey.

---

## 4. Set Up Your Developer Environment

**Source:** https://developer.salesforce.com/docs/platform/salesforce-cli-plugin/guide/gs-setup-dev-env.html

Before you generate a new Salesforce plugin, complete these prerequisites.

1. **Install or update Node.js.**

   To build a Salesforce CLI plugin, you need the latest long-term support (LTS) version of Node.js. See [Download Node.js](https://nodejs.org/en/download/) for more information. If you're new to Node.js development, we suggest that you use nvm (Node Version Manager) to install Node.js. See [this installation script](https://github.com/nvm-sh/nvm#install-script) to install or update nvm.

   To check your Node.js version, run:

   ```
   node --version
   ```

   If your node version is earlier than the [current or Active LTS version](https://nodejs.org/en/about/previous-releases), or if you don't have Node.js installed, run this command to install LTS:

   ```
   nvm install --lts
   ```

   Then run this command to make sure nvm always loads the installed LTS version in new terminals:

   ```
   nvm alias "default" "lts/*"
   ```

2. **Install the Yarn package manager.**

   ```
   npm install -g yarn
   ```

3. **Install [TypeScript](https://www.typescriptlang.org/) (target es2017.)**

   ```
   npm install -g typescript
   ```

   Salesforce CLI plugins can use JavaScript instead of TypeScript, but the classes in the Salesforce DX core library are written in TypeScript.

4. **Install or update Salesforce CLI using `npm`.**

   If you don't have Salesforce CLI installed on your computer, see [Install Salesforce CLI](https://developer.salesforce.com/docs/atlas.en-us.sfdx_setup.meta/sfdx_setup/sfdx_setup_install_cli.htm#sfdx_setup_install_cli) and follow the instructions in the Install the CLI with npm section. To make sure you're always up to date with Salesforce CLI, run this `npm` command to install the latest version.

   ```
   npm install --global @salesforce/cli
   ```

5. **Install [Visual Studio Code (VS Code) with the Salesforce Extensions pack](https://developer.salesforce.com/docs/platform/sfvscode-extensions/guide/install.html) as your IDE.**

   While you can use any IDE, we highly recommend VS Code because it includes tools for developing on the Salesforce platform.

---

## 5. Generate a Basic Plugin

**Source:** https://developer.salesforce.com/docs/platform/salesforce-cli-plugin/guide/gs-generate-plugin.html

Use the interactive plugin generator, which is itself a plugin, to create your own Salesforce CLI plugin.

1. Open a terminal (macOS, Linux) or command prompt (Windows) and change to the top-level directory where you want to generate your plugin. For example:

   ```
   cd /Users/astro/salesforce-plugins
   ```

2. Run the interactive command:

   ```
   sf dev generate plugin
   ```

   The Salesforce CLI plugin that contains the commands for generating new plugins, commands, and flags (`plugin-dev`) is "just in time" (JIT). This means that if you haven't explicitly installed the plugin, Salesforce CLI does it for you when you first run one of its commands.

   You're first prompted whether you're an internal Salesforce developer. The Salesforce CLI team uses this command to create plugins too! But answer `n` so you're not subject to our internal requirements. You're next prompted for information to populate your new plugin, such as its name, description, author, and percentage of code coverage you want. The command then clones either the [plugin-template-sf](https://github.com/salesforcecli/plugin-template-sf) or [plugin-template-sf-external](https://github.com/salesforcecli/plugin-template-sf-external) Github repo and installs the plugin's npm package dependencies using `yarn install`.

   After the `dev generate plugin` command completes, the new plugin contains an example `hello world` command. See this section for a description of some of the generated files.

### Say Hello to the World

Let's see how to run the commands in your new plugin.

1. Change to the new plugin directory, which is the same as the name you provided to the `dev generate plugin` command.

   ```
   cd my-plugin
   ```

2. To run the commands of your in-development plugin from the top-level directory that your code lives in, precede the commands with `bin/dev.js`. For example, to run the sample `hello world` command:

   ```
   bin/dev.js hello world
   bin/dev.js hello world --name Astro
   ```

   To view the `--help` output for the command:

   ```
   bin/dev.js hello world --help
   ```

   As you create new commands, test them the same way. For example:

   ```
   bin/dev.js create webcart
   ```

3. When you're ready to test drive your plugin, link your in-development plugin to Salesforce CLI. From the top-level plugin directory, such as `my-plugin`, run this command (be sure to include the period at the end!):

   ```
   sf plugins link .
   ```

   The command installs your plugin in Salesforce CLI by creating a symlink to your `my-plugin` directory. After you link your plugin, you can run your commands without using `bin/dev.js`. For example:

   ```
   sf hello world
   sf hello world -h
   ```

   If you see this warning message, don't worry. It's expected and everything is working just fine.

   ```
   Warning: my-plugin is a linked ESM module and cannot be auto-transpiled.
   Existing compiled source will be used instead.
   ```

   This warning means that your plugin is written with ESM (officially called [ECMAScript modules](https://nodejs.org/api/esm.html)), which is what our templates use. We can't auto compile ESM while running a command, which means you must make sure that you compile your plugin after every change. We recommend running `yarn compile --watch` in a separate terminal so that all your changes are compiled every time you save a file.

   The `-h` flag, which displays a shorter version of help messages, is available only when you link or install the plugin. It's not available when using `bin/dev.js`.

   To see which plugins you've installed or linked, including your new plugin, run:

   ```
   sf plugins --core
   ```

   Your linked plugin is listed like this in the output:

   ```
   my-plugin 1.0.0 (link) /Users/astro/salesforce-plugins/my-plugin
   ```

   To unlink the plugin, run:

   ```
   sf plugins unlink .
   ```

### Tour the Generated Files

The `sf` plug-In Generator creates many files, some that support the entire plugin, some for the `hello world` command. This table describes a few of the main ones which you can use as templates when you start coding your own commands.

| File                              | Description                                                                                                                                                                                                              |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| package.json                      | Npm file that describes package dependencies and versions.                                                                                                                                                               |
| tsconfig.json                     | Typescript file that specifies the root files and the compiler options required to compile the project.                                                                                                                  |
| src/commands/hello/world.ts       | Main TypeScript file that contains the code for the hello world command. The command imports and extends classes from @salesforce/sf-plugins-core. When you add your own commands, you use the SfCommand abstract class. |
| messages/hello.world.md           | Markdown file that contains the messages that make up the command help and errors.                                                                                                                                       |
| test/commands/hello/world.test.ts | Unit tests.                                                                                                                                                                                                              |
| test/commands/hello/world.nut.ts  | Complex integration, smoke, and end-to-end tests. Also known as NUTS (non-unit-tests.)                                                                                                                                   |
| .github/workflows/\*.yml          | Sample GitHub Actions workflow files for testing, releasing, and publishing your plugin. See this repo for how the Salesforce CLI developer team uses GitHub Actions.                                                    |

---

## 6. Add More Commands to Your Plugin

**Source:** https://developer.salesforce.com/docs/platform/salesforce-cli-plugin/guide/gs-add-commands.html

Saying hello to the world is always fun, but you're likely ready to do more. Let's add two more commands to your plugin.

### Call an External Service

This section shows how to create a new command called `call external service`. The command makes an HTTP request to an [external service](http://numbersapi.com/random/trivia?json) that returns an interesting fact about a number. The command has no flags other than the ones you get for "free" (`--help`, `-h` and `--json`). When you enter the service's URL in your browser, it displays JSON with the interesting fact and some metadata about it.

1. Install [Got](https://www.npmjs.com/package/got), our recommended npm HTTP library, into your plugin by running this command:

   ```
   yarn add got
   ```

   Because the new command makes HTTP requests, you need an HTTP library. While you can use any library you want, we recommend Got because it's simple yet full featured.

2. In a terminal, change to the top-level directory of your plugin and run this command to generate the initial files, or scaffolding:

   ```
   sf dev generate command --name call:external:service
   ```

   The command prompts if you want to overwrite the existing `package.json` file, enter `y` to update the file with information about the new command.

   The `--name` flag specifies the full colon-separated name of the command you want to create. For example, if you want to create the command `do awesome stuff`, set `--name` to `do:awesome:stuff`.

   The command generates these files, similar to the files associated with the hello world command:

   - `src/commands/call/external/service.ts`
   - `messages/call.external.service.md`
   - `test/command/call/external/service.nut.ts`
   - `test/command/call/external/service.test.ts`

   The Typescript files contain `import` statements for the minimum required Salesforce libraries, and scaffold some basic code. The new type names come from the value you passed to the `--name` flag.

3. Open up `src/commands/call/external/service.ts` in your IDE, such as Visual Studio Code.

4. Add this `import` statement to the beginning of the file with the other `import` statements:

   ```typescript
   import got from 'got';
   ```

5. Let's now handle the JSON returned by our new command when a user runs it with the `--json` flag, which all CLI commands have by default. We want our command to return the JSON provided by the external service's API. The underlying CLI framework uses the return type of the command class' `run` method, which in this case is `CallExternalServiceResult`. So replace the code for `CallExternalServiceResult` to reflect the service's JSON:

   ```typescript
   export type CallExternalServiceResult = {
     text: string;
     number: number;
     found: boolean;
     type: string;
   };
   ```

6. Let's next work with the command flags. Remember that our command doesn't have any flags beyond the default ones, so remove this code inside the `CallExternalService` class which declares a flag that we no longer need:

   ```typescript
   public static readonly flags = {
     name: Flags.string({
       summary: messages.getMessage('flags.name.summary'),
       description: messages.getMessage('flags.name.description'),
       char: 'n',
       required: false,
     }),
   }
   ```

   Then remove the `Flags` import from `@salesforce/sf-plugins-core` at the beginning of the file. After removing `Flags` from the import statement, the import looks like this:

   ```typescript
   import { SfCommand } from '@salesforce/sf-plugins-core';
   ```

7. The final coding step is to update the `run` method inside the `CallExternalService` class. This method is where you put the logic for your command. In our case, we want our command to make an HTTP GET request to the service API and return the result. Replace the `run` method with this code:

   ```typescript
   public async run(): Promise<CallExternalServiceResult> {
     const result = await got<CallExternalServiceResult>(
       'http://numbersapi.com/random/trivia?json'
     ).json<CallExternalServiceResult>();

     this.log(result.text);

     return result;
   }
   ```

   In the preceding code, `this.log` logs the interesting fact to the terminal only if the `–json` flag is not provided. In other words, the underlying CLI framework is smart enough to know whether to log non-JSON output, like strings, to the terminal.

8. We're ready to test! Open a Terminal, either in VS Code or outside, and run the command using `bin/dev.js`.

   ```
   bin/dev.js call external service
   ```

   Hopefully you see an interesting fact like this:

   ```
   54 is the number of countries in Africa.
   ```

   Let's try the freebie flags, the ones that are magically available even though you didn't explicitly add them. First get help for the command:

   ```
   bin/dev.js call external service --help
   ```

   The help message isn't that useful yet because you haven't updated the boilerplate content in `messages/call.external.service.md`. We show an example of updating the help in the next example. Now run the command again but get JSON output instead of the default human-readable:

   ```
   bin/dev.js call external service --json
   ```

   Good job adding a new command! Now let's create something more Salesforce-y.

### Connect to a Salesforce Org

Next create a more complex command that connects to a Salesforce org and displays a list of all Account names and IDs.

The command has one new flag, `--target-org`, with short name `-o`. Use the flag to specify the username or alias of an org you've previously logged into, also known as authorized, with the `login org` command. Do you recognize the flag? It's a standard flag that many of the core Salesforce CLI commands use, such as `project deploy start`. You can use the flag too, including its existing code to connect to an org. Let's give it a try.

1. In a terminal, change to the top-level directory of your plugin and run this command to generate the initial command files; answer `y` to overwrite the `package.json` file:

   ```
   sf dev generate command --name connect:org
   ```

   Here's the list of generated files:

   - `src/commands/connect/org.ts`
   - `messages/connect.org.md`
   - `test/command/connect/org.nut.ts`
   - `test/command/connect/org.test.ts`

2. Run this interactive command to generate a flag. In this context, "generate" means update the existing command files with the required information for the new `--target-org` flag:

   ```
   sf dev generate flag
   ```

   Be sure you specify these properties of the new flag when prompted:

   - Command to add a new flag: `connect org`
   - Type: `requiredOrg`
   - Use standard definition: Y
   - Flag name: `--target-org` (default)

   The command updates two files: `src/commands/connect/org.ts` with the new flag code and `messages/connect.org.md` with a new entry for the flag's summary, which is displayed when you run the command with the `--help` flag.

3. Open `src/commands/connect/org.ts` in your IDE and review the new generated code for the `--target-org` flag:

   ```typescript
   'target-org': Flags.requiredOrg(),
   ```

   Because we're using existing code for the flag, the single line of code is all you need -- magic!

4. Because `org.ts` still contains code for the `--name` flag, which was added automatically when you originally generated the command, remove it now, just to keep things tidy. This is the code you can remove from `public static readonly flags`:

   ```typescript
   name: Flags.string({
     summary: messages.getMessage('flags.name.summary'),
     description: messages.getMessage('flags.name.description'),
     char: 'n',
     required: false,
   }),
   ```

   The new flag is ready! Let's now code the command functionality.

5. Update the command's return type (`ConnectOrgResult`) with this code:

   ```typescript
   export type ConnectOrgResult = Array<{ Name: string; Id: string }>;
   ```

6. Update the `run` method with this code:

   ```typescript
   public async run(): Promise<ConnectOrgResult> {
     // parse the provided flags
     const { flags } = await this.parse(ConnectOrg);

     // Get the orgId from the Org instance stored in the `target-org` flag
     const orgId = flags['target-org'].getOrgId();
     // Get the connection from the Org instance stored in the `target-org` flag
     const connection = flags['target-org'].getConnection();

     this.log(`Connected to ${flags['target-org'].getUsername()} (${orgId}) with API version ${connection.version}`);

     // Use the connection to execute a SOQL query against the org
     const result = await connection.query<{ Name: string; Id: string }>('SELECT Id, Name FROM Account');

     // Log the results
     if (result.records.length > 0) {
       this.log('Found the following Accounts:');
       for (const record of result.records) {
         this.log(`  • ${record.Name}: ${record.Id}`);
       }
     } else {
       this.log('No Accounts found.');
     }

     return result.records;
   }
   ```

   Your new command is now ready to test!

7. If you haven't already done so, log in to your test org with the `org login web` command. Run `org list` to see the orgs you've previously logged into and their associated usernames and aliases. We'll use the username or alias to test your new command.

   Logging into an org before you work with it is standard Salesforce CLI practice. Think about `project deploy start`: it too takes a username (also via the `--target-org` flag) of the org you want to deploy to, and it's assumed that you've previously logged into it.

8. Test your new command with `bin/dev.js`; replace `<org-username-or-alias>` with the username or alias of the org you just logged into:

   ```
   bin/dev.js connect org --target-org <org-username-or-alias>
   ```

   Hopefully you see output similar to this (the record IDs have been truncated for security):

   ```
   Connected to <your-org-username> (<your-org-id>) with API version 64.0
   Found the following Accounts:
     • Acme: 001B...
     • salesforce.com: 001B...
     • Global Media: 001B...
     • TestAccount: 001B...
     • xyz: 001B...
     • Test1: 001B...
   ```

   Make sure that the short flag name works too!

   ```
   bin/dev.js connect org -o <your-org-username>
   ```

   Pretty cool, huh.

---

## 7. Next Steps

**Source:** https://developer.salesforce.com/docs/platform/salesforce-cli-plugin/guide/gs-next-steps.html

Congratulations! You've successfully generated a Salesforce CLI plugin and added a few commands and flags. Now it's time to customize it for your specific purpose. Here are the next steps on your exciting journey:

- Examine the GitHub repos for these core Salesforce CLI plugins so you can learn how Salesforce designed and coded popular commands:
  - [plugin-deploy-retrieve](https://github.com/salesforcecli/plugin-deploy-retrieve): Contains source for commands such as `project deploy start` and `project retrieve start`.
  - [plugin-org](https://github.com/salesforcecli/plugin-org): Contains source for commands such as `org create sandbox`, `org create scratch`, and `org list`.
  - [plugin-auth](https://github.com/salesforcecli/plugin-auth): Contains source for commands such as `org login web` and `org login jwt`.
  - [plugin-packaging](https://github.com/salesforcecli/plugin-packaging): Contains source for the `package` commands.
- Read our [design guidelines and principles](https://developer.salesforce.com/docs/platform/salesforce-cli-plugin/guide/design-guidelines.html) to learn how to correctly design your command hierarchy, name your commands and flags, create interactive commands, and more.
- [Code your business logic.](https://developer.salesforce.com/docs/platform/salesforce-cli-plugin/guide/code.html) This step is the "real" development work to implement your new commands. The section assumes that you've run through these Get Started examples and now need reference information to customize your plugin.
  - If you run into coding problems, [debug your plugin](https://developer.salesforce.com/docs/platform/salesforce-cli-plugin/guide/debug-plugin.html) to determine the cause.
  - As you write the code, you also [write clear and useful messages](https://developer.salesforce.com/docs/platform/salesforce-cli-plugin/guide/messages.html), such as `--help` command output and errors.
- [Write robust tests.](https://developer.salesforce.com/docs/platform/salesforce-cli-plugin/guide/test-plugin.html)
- [Integrate your plugin with the doctor command.](https://developer.salesforce.com/docs/platform/salesforce-cli-plugin/guide/integrate-doctor.html)
- [Maintain your beautiful plugin.](https://developer.salesforce.com/docs/platform/salesforce-cli-plugin/guide/maintain.html)
- [If you previously created a plugin using the sfdx framework and libraries, migrate it to sf.](https://developer.salesforce.com/docs/platform/salesforce-cli-plugin/guide/migrate-sfdx-sf.html)

Have fun!

---

## 8. Design Principles and Guidelines

**Source:** https://developer.salesforce.com/docs/platform/salesforce-cli-plugin/guide/design-guidelines.html

This document outlines the high-level design principles and guidelines for Salesforce CLI. The goal is to help you create a consistent, approachable, opinionated, and human-readable CLI in keeping with our Salesforce Developer Tools Principles.

Interactions with our CLI commands "just make sense." In time, your understanding of each design pattern lets you to code new commands without visiting this documentation. And because of the consistent patterns, you code your plugin with confidence.

We recommend that all plugins follow our core plugin style guidelines. If you want to bundle your plugin with the core Salesforce CLI, then you're required to follow our guidelines. The reason is so our users aren't required to learn a new naming system each time they use the commands in a new plugin. This document provides guidance about command and flag names, command structure best practices, and more.

### General Guidelines

Core Salesforce CLI commands follow these general guidelines. This guide discusses specific naming guidelines for topics, commands, and flags in their own sections.

#### Be Consistent

- Use the common language around Salesforce software development that we've developed. Using these consistent terms helps lower the bar to software development.
- Use industry-standard terms and concepts, which unify developers everywhere.

#### Use Predictable, Human-Understandable, and Memorable Names

- The user shouldn't be required to search Reddit to understand what an action or resource is.

#### Prefer the Human

- Commands must be humanly comprehensible. The general user must understand what happens just by reading the command.
- Although it's important to consider the many scripts that use CLI commands, we've chosen to prefer the developer and their work flows first.
- Consider all users and their roles: Salesforce admins or developers, ISV partners, subscribers, or even general DevOps users with no Salesforce experience.

#### Be Descriptive

- Command and flag names must provide insight into their functionality or intent.
- Names must be expressive and identifying, but also concise.
- Avoid names that are non-industry standard, unique, terse, slang, clever, or "cute."
- Abbreviate only when necessary (unless it's an industry standard).

---

## 9. Commands and Topics

**Source:** https://developer.salesforce.com/docs/platform/salesforce-cli-plugin/guide/topics.html

The standard grammatical structure for an `sf` command is:

`<topic> <action> <resource | sub-action> [flags]`

Each of these taxonomic elements has its own rules, but in all cases, the most important rule is that the command structure feels consistent. If necessary, break other rules to achieve the goal of consistency.

The top-level topic is a collection or "bucket" of commands within Salesforce CLI. Topics are nouns that focus on a single Salesforce product, concept, or feature. We recommend you use the most specific noun possible to cover the anticipated scope of your plugin, although it's not required.

Command examples:

- `sf org login web --set-default-dev-hub`
- `sf apex generate class --name MyClass --output-dir force-app/main/default/classes`
- `sf project deploy start --metadata ApexClass`

### Topic Guidelines

- Topics are Nouns.
- Be specific. Topic name should be unique and concise. Topics are often a company or product name.
- Avoid acronyms unless they're commonly known industry-standard terms.
- Hyphenate the topic (no camel case or spaces).
- Use the singular version of the topic as the default when possible.
  - If you need or want both singular and plural topics, add the plural as an alias.
- Topic and command names are lowercase.

### Good Topic Examples

- `apex` [Salesforce Feature]
- `lightning` [Salesforce Feature]
- `org` [Salesforce Feature and common Salesforce term]
- `project` [Salesforce Feature and common Salesforce term]
- `slack` [Salesforce Product]
- `heroku` [Salesforce Product]

### Example of an Exception to Our Topic Guidelines

- `cmdt` [Salesforce Feature]
  - cmdt is an exception, because while it's not an industry-standard acronym, the Salesforce Community recognizes it as an acronym for Custom Metadata Type.

### Bad Topic Examples

- **`tsm` (Tableau Service Manager)** — tsm is not an non-industry standard acronym. It doesn't rise to the level of a Salesforce Community recognized term or acronym so as to be an exception.

- **`analytics`** — Analytics is too generic and will overlap with other analytics services on the Salesforce platform. A better example is `crm-analytics`, which is specific.

- **`scanner`** — "Scan" refers to a broad set of actions in the software industry and isn't specific enough for a top-level command topic. A better example is `code-analyzer` which references the Salesforce product name.

---

## 10. Actions

**Source:** https://developer.salesforce.com/docs/platform/salesforce-cli-plugin/guide/actions.html

Actions define tasks in the developer workflow. They act on either a topic or a subtopic. Design actions to be as consistent as possible, even across topics.

For example, `sf apex generate class` and `sf lightning generate app` follow the same pattern, even though they generate different things. Another example is `sf project deploy start` and `sf slack-app deploy start`. In these examples, the topic and flags can change, but the command structure is the same.

Where appropriate, use these standard action names: [sf command common actions](https://developer.salesforce.com/docs/platform/salesforce-cli-plugin/guide/common-actions.html).

### Guidelines

- Actions are verbs.
- Keep actions as short and precise as possible.
- Every Salesforce CLI command must have a primary action.
- Commands can have secondary clarifying actions.
  - Example: `sf project deploy start`
  - Example: `sf org alias set`

### Good Examples

- `sf apex generate class`
- `sf apex run test`
- `sf org login web`
- `sf project deploy start`
  - sub-action of `start` clarifies the primary action category
- `sf org alias set my-scratch-org=test-sadbiytjsupn@example.com`
  - sub-action of `set` clarifies the primary action category

---

## 11. Resources

**Source:** https://developer.salesforce.com/docs/platform/salesforce-cli-plugin/guide/resources.html

Resources are the qualifying noun that the action acts upon. Resources are optional and used only when necessary. For example, in the command `sf apex generate class`, the resource `class` qualifies what the command `apex generate` generates. In the command `sf org login jwt`, the resource `jwt` is the qualifying type of login that takes place.

In many of the core Salesforce CLI commands, if a required resource is missing, the command prompts for it. For example:

```
$ sf org login
$ Which of these commands do you mean (Use arrow keys)
→ org login access-token     Authorize an org using an existing Salesforce access token.
  org login device           Authorize an org using a device code.
  org login jwt              Log in to a Salesforce org using a JSON web token (JWT).
  org login sfdx-url         Authorize an org using a Salesforce DX authorization URL stored in a file.
  org login web              Log in to a Salesforce org using the web server flow.
```

### Guidelines

- Resources are optional.
- Resources are nouns.

### Good Examples

- `sf org create sandbox` (`sandbox` is the resource)
- `sf org login jwt` (`jwt` is the resource)
- `sf apex generate class` (`class` is the resource)
- `sf cmdt create record` (`record` is the resource)

---

## 12. Sub-Actions

**Source:** https://developer.salesforce.com/docs/platform/salesforce-cli-plugin/guide/sub-actions.html

Sub-actions are additional verbs that qualify the primary action. Sub-actions are optional and used only when necessary. For example, in the command `sf project deploy start`, the sub-action `start` qualifies what the command `project deploy` does.

A sub-action can also be a followup action related to a previous asynchronous action. For example, `sf data query` with the `--async` flag starts a bulk query. You can then use `sf data query resume --use-most-recent` to "resume" that query at a later time.

### Guidelines

- Sub-actions are optional.
- Sub-actions are verbs.

### Good Examples

- `sf project deploy start` (`start` is the sub-action)
- `sf project deploy preview` (`preview` is the sub-action)
- `sf project deploy report` (`report` is the sub-action)
- `sf data import resume` (`resume` is the sub-action)

---

## 13. Flags and Arguments

**Source:** https://developer.salesforce.com/docs/platform/salesforce-cli-plugin/guide/flags.html

Flags (sometimes called options), provide specific values for a single execution of the command.

We highly discourage flags that branch the behavior of the command based on a value. For simplicity and usability, every command must perform one distinct task. The command's flags can modify how that task executes, but the flags mustn't change the command's fundamental nature.

When creating a flag that accepts multiple values, we recommend you use the `multiple:true` flag property. We also then encourage your users to specify the flag multiple times rather than one time with a comma-separated list of the values. For example, the `--metadata` flag used for deploying accepts multiple values and users run the command this way:

```
sf project deploy start --metadata ApexClass:MyClass --metadata ApexClass:MyOtherClass
```

And not this way:

```
sf project deploy start --metadata ApexClass:MyClass,ApexClass:MyOtherClass
```

### Flag Guidelines

- Flags can either accept a value or switch a specific behavior on or off.
- Flags are prefixed with double dashes, such as `--filename`, and optional single-letter names prefixed with one dash, such as `-f`.
- We recommend that all long flag names are lowercase and use kebab-case (as opposed to camelCase or PascalCase) so that your commands are consistent with the rest of the Salesforce CLI. For example, use `--no-prompt` and not `--noPrompt`.
- You can specify flags in any order as long as they come after the command.
- JSON output of the command shouldn't change based on the flags.

Consider these ideas when naming your flag:

- For flags that accept a value, select a long name that briefly describes the value, such as `--job-id`.
- For flags of type Boolean, which alter the behavior of a command but don't accept a value, select a long name that briefly describes the flag's effect, such as `--use-most-recent`.

We recommend using short names (single character) for any required flags to reduce the amount of typing the user has to do. Generally speaking, the short name is the first letter of the flag name or the most dominant consonant in the name, such as `-i` for `--id` and `-c` for `--ignore-conflicts`.

Use PascalCase for the permissible values of option flags. For example, these are the permissible values for the `--test-level` flag of `sf project deploy start`: `NoTestRun`, `RunSpecifiedTests`, `RunLocalTests`, `RunAllTestsInOrg`.

The core Salesforce CLI commands use these flag naming patterns:

- **ID values**
  - Short name: `-i`
  - Long name: The type of ID, such as `--testrun-id`
- **Files**
  - Short name: `-f`
  - Long name: The type of file, such as `--csv-file` or `--definition-file`
- **Directory paths**
  - Short name: `-d`
  - Long name: The type of directory, such as `--output-dir` or `--source-dir`
- **Names**
  - Short name: `-n`
  - Long name: The type of name, such as `--field-name`

Finally, Salesforce CLI reserves these flag names:

- `--help` and `-h`
- `--flags-dir`
- `--json`
- `--version` and `-v`

### Arguments

The core Salesforce CLI commands avoid the usage of positional arguments and varargs, and instead opt for flags. We believe flags are more specific and don't depend on the user providing them in the correct order.

---

## 14. Common Actions

**Source:** https://developer.salesforce.com/docs/platform/salesforce-cli-plugin/guide/common-actions.html

We recommend that you use these core Salesforce CLI actions whenever possible. Consistent vocabulary creates a consistent user experience and reduces the cognitive load for Salesforce CLI users.

| Action    | Description                                                                             | Example                      |
| --------- | --------------------------------------------------------------------------------------- | ---------------------------- |
| assign    | Associate something with the user.                                                      | `sf org assign permset`      |
| create    | Create a new resource on a remote server.                                               | `sf org create sandbox`      |
| delete    | Delete a resource from a remote server.                                                 | `sf org delete scratch`      |
| deploy    | Deploy local source code to an environment.                                             | `sf project deploy start`    |
| describe  | Get information that describes a resource, such as metadata about a standard object.    | `sf sobject describe`        |
| display   | Output more extensive information, such as multiple tables and long text.               | `sf org display`             |
| export    | Export data from an org or data store to one or more local files.                       | `sf data export tree`        |
| generate  | Generate files on the local computer for scaffolding new code, such as Apex classes.    | `sf apex generate class`     |
| get       | Get and show a single record.                                                           | `sf data get record`         |
| import    | Import data into an org and or data store.                                              | `sf data import tree`        |
| insert    | Insert a piece of data, such as a record.                                               | `sf cmdt insert record`      |
| install   | Add an external resource, such as a plugin, to a local Salesforce CLI installation.     | `sf plugins install`         |
| link      | Link a resource, such as plugin, into a local Salesforce CLI for development.           | `sf plugins link`            |
| list      | Output a single column of data or name-value pairs.                                     | `sf org list`                |
| log       | Log output for an environment.                                                          | `sf env log`                 |
| login     | Log in to an environment.                                                               | `sf org login web`           |
| logout    | Log out of an environment.                                                              | `sf org logout`              |
| open      | Open an environment in a web browser.                                                   | `sf org open`                |
| promote   | Advance a resource in a release or workflow pipeline.                                   | `sf package version promote` |
| publish   | Publish something, such as an Experience Builder site, to make it live.                 | `sf community publish`       |
| query     | Execute a data store query.                                                             | `sf data query`              |
| report    | Check the status of an operation, such as a deployment.                                 | `sf project deploy report`   |
| resume    | Continue a job that was previously started. All resumable jobs are given an ID.         | `sf project deploy resume`   |
| retrieve  | Retrieve local source code from an environment.                                         | `sf project retrieve start`  |
| run       | Execute code or tests, such as Apex classes.                                            | `sf apex run`                |
| set       | Set local or global configuration variables.                                            | `sf alias set`               |
| tail      | Stream log output.                                                                      | `sf apex tail log`           |
| unset     | Unset local or global configuration variables.                                          | `sf alias unset`             |
| uninstall | Remove external resource from a local Salesforce CLI installation.                      | `sf plugins uninstall`       |
| unlink    | Unlink a resource from a local Salesforce CLI installation.                             | `sf plugins unlink`          |
| update    | Get the most recent version of a resource.                                              | `sf plugins update`          |
| upsert    | Update existing data if exists, and insert a new one if doesn't.                        | `sf data upsert bulk`        |
| validate  | Validate something, such as a deployment or retrieval, without executing it.            | `sf project deploy validate` |
| which     | Show which resource, such as a plugin, another resource, such as a command, belongs to. | `sf which`                   |

---

## 15. Code Your Plugin

**Source:** https://developer.salesforce.com/docs/platform/salesforce-cli-plugin/guide/code.html

This section provides reference information for customizing your plugin.

To get started, we provide several commands in the [plugin-dev](https://github.com/salesforcecli/plugin-dev) plugin to generate your own plugin, commands, flags, and more. See the [Get Started](https://developer.salesforce.com/docs/platform/salesforce-cli-plugin/guide/get-started.html) section for examples. The `plugin-dev` plugin is "just in time" (JIT), which means that Salesforce CLI installs it the first time you run one of its commands.

Here are some useful commands:

- `dev generate plugin`: Generate the files for a plugin. Includes a sample `hello world` command.
- `dev generate command`: Generate the initial files for a new command.
- `dev generate flag`: Update existing command files with code for a new flag.
- `dev audit messages`: Audit messages in a plugin's messages directory to locate unused messages and missing messages that have references in source code.
- `dev convert messages`: Convert a .json messages file into Markdown.

Run `sf plugins inspect dev` to get detailed information about the plugin, including all its commands. Run a particular command with `--help` to see more information.

---

## 16. Salesforce CLI Super Powers

**Source:** https://developer.salesforce.com/docs/platform/salesforce-cli-plugin/guide/super-powers.html

Salesforce CLI includes these features and commands that are particularly useful as you develop your plugin. Run the commands with the `--help` flag to get more information.

- **Command and Flag Autocomplete**  
  The Salesforce CLI autocomplete feature predicts and suggests possible command or flag completions after you press the tab key while typing a CLI command in a terminal. This feature helps you save time and effort by reducing the amount of typing required. See [Autocomplete Salesforce CLI Commands and Flags](https://developer.salesforce.com/docs/atlas.en-us.sfdx_setup.meta/sfdx_setup/sfdx_dev_cli_autocomplete.htm) for information about configuring and using it.

- **`sf search`**  
  Return a list of Salesforce CLI commands that you can scroll through or search and view the command summaries.

- **`sf plugins inspect <my-plugin>`**  
  Show the properties of an installed plugin, such as the version, GitHub home page, commands, and dependencies. For example, `sf plugins inspect org`.

- **`sf plugins discover`**  
  Show a list of third-party plugins that you can install into Salesforce CLI. These plugins aren't created by Salesforce, so make sure that you trust their creators or have reviewed the source code. Install the plugins at your own risk.

- **`sf which <command>`**  
  Show the plugin that contains a particular command. For example, `sf which org create scratch`.

- **`sf plugins reset`**  
  Remove all user-installed and linked plugins.

- **`sf whatsnew`**  
  Show the Salesforce CLI release notes for the currently installed or previous version.

- **`sf commands`**  
  List all the available Salesforce CLI commands.

- **`sf doctor`**  
  Gather CLI configuration data and run diagnostic tests to discover and report potential problems in your environment. See [Use the Doctor to Troubleshoot Problems](https://developer.salesforce.com/docs/atlas.en-us.sfdx_setup.meta/sfdx_setup/sfdx_setup_trouble_doctor.htm) and [Integrate Your Plugin With the doctor Command](https://developer.salesforce.com/docs/platform/salesforce-cli-plugin/guide/integrate-doctor.html)

---

## 17. Use Yarn Scripts

**Source:** https://developer.salesforce.com/docs/platform/salesforce-cli-plugin/guide/yarn-scripts.html

If you use `sf dev generate plugin` to generate your initial plugin, we include [yarn](https://www.npmjs.com/package/yarn) scripts that help you developer and release your plugin.

### wireit

The templates and core CLI plugins use [wireit](https://github.com/google/wireit) by default. This tool simplifies running scripts in parallel, understands script dependencies, and uses cached results based on file changes.

If you want to use different scripts, or add to the wireit configuration, modify `sfdevrc.json` and not `package.json`. Otherwise, the `yarn install` scripts keep changing it back to the default. The properties under `wireit` in `sfdevrc.json` overwrite the matching property in `package.json#wireit` during `yarn install`. See [this example](https://github.com/salesforcecli/cli-plugins-testkit/blob/f9b0ecd9f373d94e3daf4fbc61eb9a4d63657da0/.sfdevrc.json#L2).

For better performance, We encourage you to use `wireit` `dependencies` over npm-style hooks, such as `pretest`.

If you suspect incorrect results due to caching, run `yarn clean-all` to delete all the cached materials.

### Scripts

| Script              | Description                                                                                                                               |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| yarn / yarn install | Install the plugin's dependencies.                                                                                                        |
| yarn clean          | Delete transient directories and files (such as lib/, docs/, tmp/, \*.log).                                                               |
| yarn clean-all      | Run yarn clean and remove node_modules.                                                                                                   |
| yarn clean:lib      | Delete the compiled source code (lib/).                                                                                                   |
| yarn compile        | Compile source code into lib/.                                                                                                            |
| yarn docs           | Generate documentation for your plug-in. Requires that you add a typedoc.json configuration which isn't included in the generated plugin. |
| yarn format         | Prettify your source code. This script runs automatically in the husky pre-commit hook.                                                   |
| yarn lint           | Lint your source code.                                                                                                                    |
| yarn build          | Run yarn clean, yarn compile, and yarn lint.                                                                                              |
| yarn postpack       | Delete the oclif.manifest.json file.                                                                                                      |
| yarn prepack        | Run yarn build and generates oclif.manifest.json file.                                                                                    |
| yarn test:only      | Run unit tests, which are files that match the \*.test.ts pattern.                                                                        |
| yarn test           | Run unit tests, test compile/lint, and several checks to prevent breaking changes and documentation bugs.                                 |
| yarn test:nuts      | Run NUT tests, which are files that match the \*.nut.ts pattern.                                                                          |
| yarn version        | Update README with latest commands.                                                                                                       |

---

## 18. Use Libraries

**Source:** https://developer.salesforce.com/docs/platform/salesforce-cli-plugin/guide/use-libraries.html

We encourage plugin developers to use existing npm libraries that already have the functionality you need. There's no reason to reinvent the wheel.

### Salesforce Libraries

Salesforce owns and maintains these npm libraries to implement common and useful functionality in your plugin.

#### [@salesforce/core](https://github.com/forcedotcom/sfdx-core)

The `@salesforce/core` library provides client-side management of Salesforce DX projects, org authentication, connections to Salesforce APIs, and other utilities. Much of the core functionality that powers the Salesforce CLI plugins comes from this library. You can use this functionality in your plugins too.

- `AuthInfo`, `Org`, and `Connection` classes to interact with Salesforce orgs.
- `Messages` class to work with messages in Markdown, JSON, or JavaScript.
- `ConfigFile` class to work with configuration files.
- `SfError` class to throw errors from your plugin.
- `SfProject` class to work with Salesforce project directories.
- `testSetup` utility to write unit tests.
- See [API docs](https://forcedotcom.github.io/sfdx-core/) for details.

#### [@salesforce/sf-plugins-core](https://github.com/salesforcecli/sf-plugins-core)

- `SfCommand` class, the base class for every `sf` command.
- Salesforce specific command flags, such as `salesforceId`, `requiredOrg`, `requiredHub`, and `optionalOrg`.
- See [API Docs](https://salesforcecli.github.io/sf-plugins-core/) for details.

#### [@salesforce/kit](https://forcedotcom.github.io/kit/)

- A collection of commonly needed utilities. It includes high level support for parsing and working with JSON data, interacting with environment variables, a minimal lodash replacement, and support for common design patterns.
- See [API docs](https://forcedotcom.github.io/kit/) for details.

#### [@salesforce/source-deploy-retrieve](https://github.com/forcedotcom/source-deploy-retrieve)

- Functionality for working with Salesforce metadata.
- See [API docs](https://forcedotcom.github.io/source-deploy-retrieve/) for details.

#### [@salesforce/ts-types](https://github.com/forcedotcom/ts-types)

- A collection of commonly used types and type-narrowing convenience functions for writing concise type guards.
- See [API docs](https://forcedotcom.github.io/ts-types/) for details.

#### [@salesforce/cli-plugins-testkit](https://github.com/salesforcecli/cli-plugins-testkit)

- Testing library that provides utilities to write NUTs (non-unit-tests), such as integration, smoke, and e2e style testing. For example, you can write tests to make sure your plugin commands execute correctly using an isolated Salesforce project, scratch org, and different Salesforce CLI executables
- See [docs](https://github.com/salesforcecli/cli-plugins-testkit#readme) and [examples](https://github.com/salesforcecli/cli-plugins-testkit/blob/main/SAMPLES.md) for details.

#### [@salesforce/ts-sinon](https://github.com/forcedotcom/ts-sinon)

- Library for creating test stubs with [sinon](https://sinonjs.org/).

#### [@oclif/core](https://github.com/oclif/core)

- The underlying framework of the entire Salesforce CLI and all its plugins.
- You don't need to know much about this library to develop your plugin. But in case you're curious, here are the [docs](https://oclif.io/).

### Third-Party Libraries

We encourage you to use libraries written by other developers in the npm community. Be sure, however, that you do your due diligence to make sure that you're using libraries that are well-maintained by trustworthy developers.

Here are a few libraries that we recommend:

- [got](https://www.npmjs.com/package/got) to make HTTP requests.
- [graceful-fs](https://www.npmjs.com/package/graceful-fs) for resilient file system operations.
- [chalk](https://www.npmjs.com/package/chalk) to colorize output.
- [open](https://www.npmjs.com/package/open) to open URLs in a web browser.
- [change-case](https://www.npmjs.com/package/change-case) to convert strings between different cases, such as camelCase to TitleCase.
- [sinon](https://www.npmjs.com/package/sinon), [mocha](https://www.npmjs.com/package/mocha), and [chai](https://www.npmjs.com/package/chai) to test your plugin.

---

## 19. Common Coding Patterns

**Source:** https://developer.salesforce.com/docs/platform/salesforce-cli-plugin/guide/common-coding-patterns.html

The sections in this topic describe common coding patterns that you likely use in your plugin, along with a code sample. Where possible, we also provide a link to one of our plugins as an additional example.

### Throw an Error

To throw an error from your command, first add the error message to your messages Markdown file. Use a H1 header as a key name for the error name. We suggest you follow the [Salesforce CLI style convention](https://developer.salesforce.com/docs/platform/salesforce-cli-plugin/guide/messages-impl-guidelines.html#key-names) of prefacing error names with `error` and warnings with `warning`. For example:

```
# error.InvalidUsername

Invalid Username: %s.
```

Load the message into your command with the `Messages.loadMessages` method and throw it using `message.createError`. This code example builds on the sample `hello world` command.

```typescript
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-awesome', 'hello.world');

export type HelloWorldResult = {
  name: string;
  time: string;
};

export default class World extends SfCommand<HelloWorldResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static flags = {
    username: Flags.string({
      char: 'u',
      description: messages.getMessage('flags.username.summary'),
      default: 'World',
    }),
  };

  public async run(): Promise<HelloWorldResult> {
    const { flags } = await this.parse(World);
    // throw an error that's created using the error message defined in the messages file and provide the username to insert into the message.
    throw messages.createError('error.InvalidUsername', [flags.username]);
  }
}
```

When a user runs the command and runs into the error, it's automatically prefaced with `Error:`, such as:

`Error: Invalid Username: doesnt@work.org`

The [Messages](https://github.com/forcedotcom/sfdx-core/blob/main/src/messages.ts) class also contains the `createWarning` and `createInfo` methods for warnings and informational output.

### Error Codes

When a CLI command encounters an error, it usually returns an exit code of 1. If you don't include any error handling code in your command, oclif handles the error and its default exit code is 1. Similarly, a successful command execution returns a 0 exit code by default.

You can use a different exit code if you want. You must, however, use only those codes that Salesforce CLI isn't currently using, or are reserved for its future use. This table shows these error codes.

| Code    | Description                                                                  |
| ------- | ---------------------------------------------------------------------------- |
| 0       | The command executed successfully.                                           |
| 1       | The command didn't execute successfully.                                     |
| 2       | oclif detected errors, typically issues with flags.                          |
| 3 - 9   | Reserved for future use by Salesforce CLI.                                   |
| 10      | TypeErrors, which are typically problems in client code.                     |
| 11 - 19 | Reserved for future use by Salesforce CLI.                                   |
| 20      | GACKs, which are problems in Salesforce server code.                         |
| 21 - 29 | Reserved for future use by Salesforce CLI.                                   |
| 68      | Partial success, such as deploying only some requested metadata.             |
| 69      | Request still in progress, or the request timed out.                         |
| 130     | The command received a termination signal, such as the user pressing Ctrl+C. |

### Prompt the User

`SfCommand` contains a `confirm` method that encapsulates the [inquirer library](https://www.npmjs.com/package/inquirer). See the [inquirer's documentation](https://www.npmjs.com/package/inquirer#documentation) for different types of questions you can construct.

This code example show how to change the `run()` method in the sample `hello world` command to ask the user a question and change the output based on the answer.

```typescript
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-awesome', 'hello.world');

export type HelloWorldResult = {
  name: string;
};

export default class World extends SfCommand<HelloWorldResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static flags = {
    name: Flags.string({
      char: 'n',
      description: messages.getMessage('flags.name.summary'),
      default: 'World',
    }),
  };

  public async run(): Promise<HelloWorldResult> {
    const { flags } = await this.parse(World);
    const confirmation = await this.confirm({
      message: `Hello ${flags.name}! Is that your real name?`,
    });
    const message = confirmation ? `Hello ${flags.name}` : 'Hello ???';
    this.log(message);
    return { name: flags.name };
  }
}
```

### Spinners

`SfCommand` exposes a `spinner` class that you can use to put spinners on the terminal if your command takes a while to complete. These spinners are automatically suppressed if the `--json` flag is present.

This code example shows how to change the `run()` method in the sample `hello world` command to sleep for a short time, and then show the word `Loading...` and a spinner while it sleeps.

```typescript
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import { sleep } from '@salesforce/kit';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-awesome', 'hello.world');

export type HelloWorldResult = {
  name: string;
};

export default class World extends SfCommand<HelloWorldResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static flags = {
    name: Flags.string({
      char: 'n',
      description: messages.getMessage('flags.name.summary'),
      default: 'World',
    }),
  };

  public async run(): Promise<HelloWorldResult> {
    const { flags } = await this.parse(World);
    this.spinner.start('Loading...');
    await sleep(5000);
    this.spinner.stop();
    return { name: flags.name };
  }
}
```

### Progress Bars

`SfCommand` exposes a `progress` class that you can use to put progress bars on the terminal. These progress bars are automatically suppressed if the `--json` flag is present.

This code example show how to change the `run()` method in the sample `hello world` command to sleep for a short time, but show the words `Hello World Progress` and a progress bar while it sleeps.

```typescript
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import { sleep } from '@salesforce/kit';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-awesome', 'hello.world');

export type HelloWorldResult = {
  name: string;
};

export default class World extends SfCommand<HelloWorldResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static flags = {
    name: Flags.string({
      char: 'n',
      description: messages.getMessage('flags.name.summary'),
      default: 'World',
    }),
  };

  public async run(): Promise<HelloWorldResult> {
    const { flags } = await this.parse(World);
    this.progress.start(0, {}, { title: 'Hello World Progress' });
    this.progress.setTotal(100);
    for (let i = 0; i < 100; i++) {
      await sleep(10);
      this.progress.update(i);
    }

    this.progress.finish();

    return { name: flags.name };
  }
}
```

### Use a Configuration File

You can easily create and use configuration files using the [ConfigFile class](https://forcedotcom.github.io/sfdx-core/classes/config_configFile.ConfigFile-1.html) from `@salesforce/core`. The configuration file is located in the global `.sfdx` directory if `isGlobal` equals `true`. Otherwise it's located in your local project directory.

This code sample shows how to create a global configuration file called `myConfigFilename.json`, located in the global `.sfdx` directory. The example then shows how to set a key called `myKey` to the value `myvalue`.

```typescript
import { ConfigFile } from '@salesforce/core';

class MyConfig extends ConfigFile {
  public static getFileName(): string {
    return 'myConfigFilename.json';
  }
}
const myConfig = await MyConfig.create({
  isGlobal: true,
});

myConfig.set('mykey', 'myvalue');
await myConfig.write();
```

### Add a Configuration Variable

`sf` uses configuration variables to set CLI defaults, such as your default org (`target-org`) or the API version you want the CLI to use (`org-api-version`). You set and get configuration variables with the `sf config set|get` commands. You can define your own custom configuration variable that is also managed by the `sf config` commands.

This example adds a Boolean configuration variable called `do-awesome-things`. First create a file in your plugin called `configMeta.ts` with code similar to this:

```typescript
import { ConfigValue } from '@salesforce/core';

export enum ConfigVars {
  DO_AWESOME_THINGS = 'do-awesome-things',
}

export default [
  {
    key: ConfigVars.DO_AWESOME_THINGS,
    description: 'do awesome things',
    input: {
      validator: (value: ConfigValue): boolean => value != null && ['true', 'false'].includes(value.toString()),
      failedMessage: 'Must provide a boolean value.',
    },
  },
];
```

Then update the `package.json` file in the top-level directory of your plugin and add a `configMeta` property to the `oclif` section, like this:

```json
{
  "oclif": {
    "configMeta": "./lib/configMeta"
  }
}
```

You can then set the new configuration variable like this:

```bash
sf config set do-awesome-things=true
```

---

## 20. Use Our Linter Rules to Improve Your Code

**Source:** https://developer.salesforce.com/docs/platform/salesforce-cli-plugin/guide/linter-rules.html

Linters help you write awesome code by flagging programming errors, bugs, stylistic errors and suspicious constructs. If you generate a plugin using our plugin generator (`sf dev generate plugin`), you also get our recommended linter rules. These rules help you develop the best possible commands for your users.

The rules are [open-source](https://github.com/salesforcecli/eslint-plugin-sf-plugin). See the [list](https://github.com/salesforcecli/eslint-plugin-sf-plugin#rules) along with [setup instructions](https://github.com/salesforcecli/eslint-plugin-sf-plugin#use-these-rules-in-a-sf-plugin).

We recommend that you install the [eslint plugin](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) in VS Code so that you get feedback in real time as you're developing.

---

## 21. Debug Your Plugin

**Source:** https://developer.salesforce.com/docs/platform/salesforce-cli-plugin/guide/debug-plugin.html

We recommend that you use Visual Studio Code's (VS Code) built-in debugger to debug your plugin because the plugin generated from `sf dev generate plugin` already includes debugging configuration settings for VS Code.

VS Code has two core debugging modes: `launch` and `attach`. See [Launch versus attach configurations](https://code.visualstudio.com/Docs/editor/debugging#_launch-versus-attach-configurations) for more info. We show how to use use both modes in this section.

### Debug a Command

Debugging a command involves passing different arguments or flags during a debug session. For this use case, we recommend you use the `attach` debug mode in VS Code for a better experience.

Let's debug the `hello world` command that's included in the plugin generated with `sf dev generate plugin` as the example in this topic.

> **Tip**
>
> We provide line numbers to help you find specific parts of the code. But the line numbers are for a file you just generated from running the `sf dev generate plugin` command. If you updated the `hello world` files since generating the plugin, then the line numbers will be different.

1. Set the `NODE_OPTIONS` environment variable to `--inspect-brk`. To do this at the command line:

   For bash or zsh:

   ```
   export NODE_OPTIONS='--inspect-brk'
   ```

   For PowerShell:

   ```
   $Env:NODE_OPTIONS = '--inspect-brk'
   ```

   When using `attach` mode, the Node.js process must be listening for a debugging client. Because oclif plugins use `bin/dev.js` as the main executable, you must set the `NODE_OPTIONS` environment variable to pass options to it.

2. In VS Code, open the top-level directory of your plugin.

3. Open `src/commands/hello/world.ts` and set a breakpoint on the line with code `const time = new Date().toDateString();` (line 28, in the `run()` method) by clicking on the editor margin or using `F9` on the line.

4. In VS Code's integrated terminal, run the `hello world` command using `bin/dev.js`.

   ```
   ./bin/dev.js hello world
   ```

   You should see output similar to this, indicating that the CLI process is waiting for a debugger to continue the execution:

   ```
   Debugger listening on ws://127.0.0.1:9229/22bc83d3-0b97-4dbb-b228-1697d0a0878a
   For help, see: https://nodejs.org/en/docs/inspector
   ```

5. Click the `Run and Debug` icon in the Activity Bar on the left to attach the VS Code debugger to the CLI process you started in the previous step.

   The Debug section opens, with information about variables, breakpoints, and more.

6. Select the configuration named `Attach` using the Configuration dropdown in the `Run and Debug` view. Then click the green arrow or `F5` to start a debug session.

   As soon as the debugger is attached, it jumps to line 8 of `bin/dev.js` because that's where we started the CLI process.

7. Click `Continue` in the Debug Toolbar at the top, or `F5`, to continue the execution. The debugger stops at the breakpoint you set in Step 2:

   The `VARIABLES` section shows the values of local variables like `flags` and `time`. The `time` variable is still undefined, because the debugger stopped right at line 28, which is where the variable is defined and initialized.

8. You can set breakpoints after the debug session started. Try setting one at line 29 (the line with code `this.log(messages.getMessage('info.hello', [flags.name, time]));`), then click `Continue` or `F5`. The debugger stops at this new breakpoint. And you now see that the `time` variable contains today's date.

9. To dig into a function or method call, click on the `Step Into` option in the Debug Toolbar (or `F11`) while on the line. The debugger jumps to the function or method definition. Click `Step Over` (or `F10`) to continue debugging over the next lines.

   Click `Continue` (or `F5`) to continue the execution, or `Disconnect` to detach VS Code from the process.

10. When you finish the debug session, be sure to unset the `NODE_OPTIONS` environment variable:

    For bash or zsh:

    ```
    unset NODE_OPTIONS
    ```

    For PowerShell:

    ```
    $Env:NODE_OPTIONS = ''
    ```

### Debug a Test

Unlike debugging a command, you don't need to pass any options to a test because those are already in the code. This section shows how to use the `launch` debug mode in VS Code to debug the `hello world` command unit test.

1. Open `test/commands/hello/world.test.ts` and set a breakpoint on the line `expect(result.name).to.equal('World');` (line 29).

2. Select the `Run Current Test` configuration from the Configuration dropdown in the `Run and Debug` view and press the green arrow, or `F5`, to start a debug session.

3. In this mode, VS Code starts the Node.js process to run the currently-open test file. The execution stops at the first breakpoint. Try hovering over the `result` object on line 24 to see the JSON output the command in the test case returned.

4. Click `Step Over` in the Debug Toolbar on top (or `F10`) to continue debugging over the next lines.

   To continue with the execution, click `Continue` (or `F5`). Click `Stop` to finish the Node.js process.

---

## 22. Write Useful Messages

**Source:** https://developer.salesforce.com/docs/platform/salesforce-cli-plugin/guide/messages.html

It's never too early to start thinking about the messages you display for your users. Messages include:

- Command summary and description
- Flag summaries and descriptions
- Examples
- Error messages
- Interactive prompts

### Two Flags for Different Levels of Help

Because the full help for `sf` commands can be long, we provide these two flags to control how much of the content is displayed:

- **`--help`**: Displays all the content.
- **`-h`**: Displays a short form of the content. Output includes the command summary and the USAGE and FLAGS sections. It doesn't include the long command description, examples, and long flag descriptions.

When you code your command, you automatically get these two flags too.

---

## 23. Message Implementation Guidelines

**Source:** https://developer.salesforce.com/docs/platform/salesforce-cli-plugin/guide/messages-impl-guidelines.html

Every `sf` command has a corresponding message file that contains all messages related to that command. Message files live in the top-level [messages](https://github.com/salesforcecli/plugin-deploy-retrieve/tree/main/messages) directory of the plug-in.

Message files use Markdown format and end in .`md`. Name your file to reflect the corresponding command. For example, the filename for the `sf project convert source` is called `convert.source.md`.

In the Markdown file, each H1 heading is a key that's referenced in the command's code. Most commands always have the `summary`, `description`, and `examples` keys. The text after the key's H1 heading is displayed in the `--help` output.

### How to Load Messages

Here's an example of loading messages from the Markdown file `hello.world.md` in the awesome plugin:

```typescript
import { Messages } from '@salesforce/core';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('awesome', 'hello.world');
```

Use the `messages.getMessage()` or `messages.getMessages()` methods to reference the H1 keys from the markdown file in your command class:

```typescript
public static readonly summary = messages.getMessage('summary');
public static readonly description = messages.getMessage('description');
public static readonly examples = messages.getMessages('examples');
```

The `flags.name.*` keys correspond to help for the `--name` flag. Here's how to reference them in the flag definition:

```typescript
public static readonly flags = {
  name: Flags.string({
    char: 'n',
    summary: messages.getMessage('flags.name.summary'),
    description: messages.getMessage('flags.name.description'),
    default: 'World',
  }),
};
```

### Key Names

Here are the H1 key names we typically use in the core Salesforce CLI command message Markdown files. See the [message file](https://github.com/salesforcecli/plugin-deploy-retrieve/blob/main/messages/deploy.metadata.md) for the `sf project deploy start` command for an example. See the [writing guidelines](https://developer.salesforce.com/docs/platform/salesforce-cli-plugin/guide/messages-writing-guidelines.html) for tips about writing these messages.

- `summary` : Required. The short sentence that's immediately displayed when you run `--help` or `-h`.
- `description` : Optional. Longer command description displayed in the DESCRIPTION help section.
- `examples` : Required. Displayed in the EXAMPLES help section. Each example must have a brief explanation.
- `flags.<flagname>.summary` : Required. Short description that's displayed in the FLAGS help section.
- `flags.<flagname>.description` : Optional. Longer flag description displayed in the FLAG DESCRIPTIONS help section.
- `error.<errorname>` : Required. The error message.
- `error.<errorname>.actions` : Optional. The suggested action that the user can take to fix the problem.

### Displayed Error Messages

The CLI framework automatically prepends the word `Error:` (or `Warning` or `Info`) before the text. For example, if your Markdown file has this:

```
# error.SandboxNameLength

The sandbox name "%s" should be 10 or fewer characters.
```

At runtime, the resulting error looks like this:

`Error: The sandbox name "mysandboxnameisreallylong" should be 10 or fewer characters.`

### Flag Groups

If your command has many flags, you can group them in the `--help` output to make it easier to find a particular flag.

How many is too many? That's up to you. Run `sf org create scratch` to see an example. The help output includes the standard FLAGS and GLOBAL FLAGS groups and the command-specific PACKAGING FLAGS and DEFINITION FILE OVERRIDE FLAGS groups.

To implement a flag group, use the `helpGroup` flag property. [This example](https://github.com/salesforcecli/plugin-org/blob/main/src/commands/org/create/scratch.ts#L91) shows how to add the `--no-namespace` flag of `org create scratch` to a group called PACKAGING FLAGS:

```typescript
public static readonly flags = {
  ...
  'no-namespace': Flags.boolean({
    char: 'm',
    summary: messages.getMessage('flags.no-namespace.summary'),
    helpGroup: 'Packaging',
  }),
```

In the actual `--help` output, the help group `Packaging` is rendered as PACKAGING FLAGS.

### Topic Messages

A [topic](https://developer.salesforce.com/docs/platform/salesforce-cli-plugin/guide/topics.html) is a collection or "bucket" of commands within Salesforce CLI. When you use the `--help` flag on a topic, the output includes the topic summary, a list of sub-topics, and the commands contained in the topic. Here's sample help output for the `data` topic:

```
$ sf data --help
Manage records in your org.

USAGE
  $ sf data COMMAND

TOPICS
  data bulk    Get the results of a bulk ingest job that you previously ran.
  data create  Create a record or a file.
  data delete  Delete a single record or multiple records in bulk.
  data export  Export data from your org.
  data get     Get a single record.
  data import  Import data to your org.
  data update  Update many records.
  data upsert  Upsert many records.

COMMANDS
  data query   Execute a SOQL query.
  data resume  View the status of a bulk data load job or batch.
  data search  Execute a SOSL text-based search query.
```

Write topic summaries in the `package.json` file in the top-level directory of your plugin. Topic summaries aren't in the Markdown files in the `messages` directory like other help messages. In the `package.json` file, topic summaries live in the `topics` sub-object of the `oclif` object and are defined with a `description` property. Here's a snippet of the `package.json` file of the [plugin-data plugin](https://github.com/salesforcecli/plugin-data/blob/main/package.json) which specifies the topic summary of the `data` topic and its subtopics:

```json
"data": {
  "description": "Manage records in your org.",
  "subtopics": {
    "create": {
      "description": "Create a record or a file."
    },
    "delete": {
      "description": "Delete a single record or multiple records in bulk."
    },
    "export": {
      "description": "Export data from your org.",
      "external": true
    },
    "get": {
      "description": "Get a single record."
    },
    "import": {
      "description": "Import data to your org.",
      "external": true
    },
    "query": {
      "description": "Query records."
    },
    "update": {
      "description": "Update many records.",
      "external": true
    },
    "upsert": {
      "description": "Upsert many records."
    }
  },
  "external": true
}
```

---

## 24. Writing Guidelines

**Source:** https://developer.salesforce.com/docs/platform/salesforce-cli-plugin/guide/messages-writing-guidelines.html

You can write your messages in any style you want, but we recommend that you follow these guidelines so that your commands feel similar to the core Salesforce CLI commands. See the [message file](https://github.com/salesforcecli/plugin-deploy-retrieve/blob/main/messages/deploy.metadata.md) for the `sf project deploy start` command for an example.

### Commands

Use clear, concise descriptions so that users can easily and quickly understand what your commands do.

#### Command Summary

- Command summaries start with an imperative verb.
  - For example, a good summary for the `sf project deploy start` command is `Deploy metadata to an org from your local project.`
- Summaries are mandatory for each command.
- The summary is the first message that displays when users run `--help` or `-h` for a specific command. The summary is also displayed as the first sentence in the DESCRIPTION section when using `--help`. It's also the message that's displayed when using `--help` to list a group of commands.
- Summaries include just enough information to tell users what the command helps them do, but are as short as possible.
- Summaries use proper punctuation and capitalization and are complete sentences.
- In the Markdown file, put the entire command summary in a single line. If the summary contains a newline, only the first line is printed in the `--help`.

#### Command Description

- Command descriptions are optional but highly encouraged. They're displayed in the `--help` output, but not the `-h` output.
- Write them to expand on the summary, provide context about how and when a user runs the command, describe the behavior of the command, and provide other helpful information for the user. Here are some questions to help you pinpoint this other helpful information; not all questions are relevant to all commands.
  - Where does this command fit in a typical developer workflow? Does it help the user to know which commands are typically run before or after?
  - What, if any, are the repercussions of using this command? Is the command destructive? For example, does the command overwrite files in an org? Overwrite local files?
  - Does the command behave unexpectedly when a user specifies a particular combination of flags?
  - Is the command output easy to read, or is it complex enough that you should describe how to interpret it?
  - Is there an operating system-specific gotcha? For example, do Windows users use quotes to enclose a value but macOS users don't?
  - Is there another command that the user can confuse with this one? Should you describe the use cases for each command?
- While there's no theoretical limit to the length of a long description, try to keep it brief yet comprehensive.
- Long descriptions use proper punctuation and capitalization and are complete sentences.

### Flags

Use clear, concise descriptions so that users can easily understand what the command flags do.

#### Flag Summary

- Flag summaries are mandatory for each flag. They're displayed in tabular form in the FLAGS section of both the `--help` and `-h` output.
- Flag summaries include just enough information to tell users what the flag does, but are as short as possible to minimize wrapping in narrow terminals.
- For flags that accept a value, the summary describes the value that the user supplies.
  - For example, a good summary for the `--manifest` flag of the `sf project deploy start` command is `Full file path for manifest (package.xml) of components to deploy.`
- For flags of type Boolean, which alter the behavior of a command but don't accept a value, the summary tells users what the flag makes the command do. Start these descriptions with an imperative verb.
  - For example, the summary for the global `--json` flag is `Format output as json.`
- Flag summaries use proper punctuation and capitalization and are complete sentences.
- In the Markdown file, put the entire command summary in a single line. If the summary contains a newline, only the first line is printed in the `--help`.
- Flag properties that are defined in the command's source code, such as whether the flag is required or its default value, are automatically displayed in the `--help`. Don't duplicate this information in the flag summary or description.

#### Flag Description

- Flag descriptions are optional. They're displayed in the FLAG DESCRIPTIONS section of the `--help` output. They aren't displayed in the `-h` output.
- Write flag descriptions to expand on the summary, provide context and other helpful information for the user.
- Don't duplicate information in flag descriptions that's in your command description.
- Flag descriptions use proper punctuation and capitalization and are complete sentences.
- There's no limit to the length of a flag description, but remember that short is sweet.

### Examples

Examples are the best way to help a user understand what a command does. Examples are displayed in the EXAMPLES section of the `--help` output. They aren't displayed in the `-h` output.

- You must include at least one example.
- For each example, provide a brief explanation. Start with an imperative and end with a colon. For example:
  - `Deploy the source files in a directory:`
- Use long flag names (`--definition-file`) in the examples, not short names (`-f`). Long names make the example more clear.
- Show an example of using each required flag; you can show multiple required flags in a single example, if it makes "real world" sense.
- If necessary, provide the context in which the example runs, and the expected effect. Don't show the actual output, just a brief description of what it should be. But be judicious and brief.
- If you provide multiple examples, explain how they differ and when to use one over another.
- Don't duplicate information in examples that's already in your command and flag descriptions.
- If necessary, provide any prerequisites to help users run their own examples. Warn users of any "gotchas" they can encounter. But again, be judicious and brief.
- To keep the examples operating-system agnostic, use `<%= config.bin %> <%= command.id %>` instead of `sf your-command`. The CLI converts this string to the appropriate OS prompt and command name at runtime. See [this example](https://github.com/salesforcecli/plugin-deploy-retrieve/blob/main/messages/deploy.metadata.md#examples).
- For correct formatting in the `--help` output, precede the explanation in the Markdown file with "-" and the example itself with two spaces. For example:

```
- Deploy the source files in a directory:

  <%= config.bin %> <%= command.id %> --source-dir path/to/source
```

### Error Messages

Mistakes happen. But on the bright side, they're opportunities to expand our users' knowledge of Salesforce CLI by providing them an excellent error message.

- Use an error message to tell users how to recover from the situation that caused the error.
- Before writing an error message, find out whether the command design can be changed to avoid the error.
- Tell users concisely, but also completely, what went wrong and what they can do about it. For example:
  - Error message: `This command doesn't accept an access token for a username.`
  - Action (aka "Try this:"): `Specify a username or an alias.`
- Two short sentences are usually better than one long one. However, rather than first stating the problem and then the solution you can sometimes easily imply the problem in the solution. When possible, say what users can do instead of what they can't.
- A good error message helps users move on rather than making them feel bad.
- Error messages use proper punctuation and capitalization and are complete sentences.

---

## 25. Test Your Plugin

**Source:** https://developer.salesforce.com/docs/platform/salesforce-cli-plugin/guide/test-plugin.html

It's critical to test your plugin to make sure it works correctly, safely, and in a consistent way.

### Our Testing Philosophy

We (the Salesforce CLI dev team) use two types of tests to fortify the quality of our plugins:

- Unit tests
- Non-unit-tests (NUTs)

We use unit tests to test library-level code and NUTs to test command-level code. With this philosophy, unit tests verify the functionality of the classes and functions consumed by a command. And then NUTs verify that the command itself works as expected.

You can, of course, test your plugin however you want, although we recommend you give our philosophy a try. The next sections describe in more detail how we use NUTs and unit tests.

### Unit Tests

For library-level code, we like to write unit tests using [mocha](https://www.npmjs.com/package/mocha) to run the tests and [c8](https://www.npmjs.com/package/c8) for test coverage. You're not limited to this framework - you're welcome to use whatever NodeJS-compatible testing framework works best for you, such as [jest](https://jestjs.io/).

Here are some examples of how we use unit tests across our codebases:

- [Custom flags in @salesforce/plugin-deploy-retrieve](https://github.com/salesforcecli/plugin-deploy-retrieve/blob/main/test/utils/flags.test.ts)
- [Various utility functions in @salesforce/plugin-deploy-retrieve](https://github.com/salesforcecli/plugin-deploy-retrieve/blob/main/test/utils/deploy.test.ts)
- [env list hook in @salesforce/plugin-env](https://github.com/salesforcecli/plugin-env/blob/main/test/hooks/envList.test.ts)
- [Time utilities in @salesforce/plugin-env](https://github.com/salesforcecli/plugin-env/blob/main/test/utils/timeUtils.test.ts)
- [AuthInfo tests in @salesforce/core](https://github.com/forcedotcom/sfdx-core/blob/main/test/unit/authInfoTest.ts)

#### Unit Tests for Commands

While we strongly recommend writing NUTs for command-level unit tests, it's possible to do this. Here's a brief example:

```typescript
import { expect } from 'chai';
import { TestContext } from '@salesforce/core/lib/testSetup';
import { stubSfCommandUx } from '@salesforce/sf-plugins-core';
import { DoStuff } from '../../../../src/commands/do/stuff';

describe('do:stuff', () => {
  const $$ = new TestContext();
  let sfCommandUxStubs: ReturnType<typeof stubSfCommandUx>;

  beforeEach(async () => {
    // stub SfCommand's ux methods so that command output is suppressed
    // and so that you can assert that certain methods were called with
    // the correct args.
    sfCommandUxStubs = stubSfCommandUx($$.SANDBOX);
  });

  it('should do awesome things', async () => {
    // run the command using the static run method
    const result = await DoStuff.run(['--flag1', '--flag2']);

    expect(result).to.be.ok;
    expect(sfCommandUxStubs.log.firstCall.firstArg).to.equal('hello world');
  });
});
```

Here are some examples of how we write command-level unit tests across our codebases:

- [org:display unit tests](https://github.com/salesforcecli/plugin-org/blob/main/test/unit/org/display.test.ts)
- [org:list unit tests](https://github.com/salesforcecli/plugin-org/blob/main/test/unit/org/list.test.ts)

See the [stubUx docs](https://salesforcecli.github.io/sf-plugins-core/modules/stubUx.html) for built-in stubs for spinners, tables, warnings, prompts, and more.

### Non-Unit-Tests

We use non-unit-tests, known as NUTs, for command-level testing. As the name implies, NUTs are automated tests that aren't unit tests. NUTs typically include integration, functional, UI, and smoke tests that require a system outside your code to accomplish the test.

This style of testing allows you to use an isolated Salesforce project and file system against production Salesforce orgs. As a result, you can write tests that mimic your customers' environments as closely as possible. And you're not required to write and maintain mocked API responses anymore.

See the examples in the [@salesforce/cli-plugins-testkit repo](https://github.com/salesforcecli/cli-plugins-testkit).

---

## 26. Maintain Your Plugin

**Source:** https://developer.salesforce.com/docs/platform/salesforce-cli-plugin/guide/maintain.html

You decide how to maintain your plugin, and even what it means to maintain your plugin. However, we have a few recommendations to get you started, based on what the Salesforce CLI developer team does.

### Dependencies

It's important to keep your dependency tree up to date. We use the [dependabot](https://github.com/dependabot/dependabot-core) Github integration, which automatically creates PRs to bump package dependency versions.

Here's an example of how we configure dependabot on our top-level `@salesforce/cli` repo: [https://github.com/salesforcecli/cli/blob/main/.github/dependabot.yml](https://github.com/salesforcecli/cli/blob/main/.github/dependabot.yml)

### Snyk

We use the [snyk code checker](https://snyk.io/lp/snyk-code-checker/) to scan pull requests for security and quality issues.

---

## 27. Migrate Your Plugin to ESM

**Source:** https://developer.salesforce.com/docs/platform/salesforce-cli-plugin/guide/migrate-to-esm.html

_Note: This page was not available at the time of documentation compilation (HTTP 404 error). Please check the official Salesforce documentation for the latest information on ESM migration._

---

## 28. Integrate Your Plugin With the `doctor` Command

**Source:** https://developer.salesforce.com/docs/platform/salesforce-cli-plugin/guide/integrate-doctor.html

Salesforce CLI includes the `doctor` command that you can run if you're having issues with the CLI. The command inspects your CLI installation and environment, runs diagnostic tests, provides suggestions, and writes the data to a local diagnostic file. See the [Salesforce CLI Command Reference](https://developer.salesforce.com/docs/atlas.en-us.sfdx_cli_reference.meta/sfdx_cli_reference/cli_reference_doctor_commands_unified.htm#cli_reference_doctor_unified) and [Setup Guide](https://developer.salesforce.com/docs/atlas.en-us.sfdx_setup.meta/sfdx_setup/sfdx_setup_trouble_doctor.htm) for more information about the `doctor` command.

To help your users troubleshoot problems with your plugin, you can integrate it into the `doctor` command so it runs your custom diagnostic tests. You can add custom information to both the Running all diagnostics and Suggestions sections and to the JSON results file. For example:

```
$ sf doctor
=== Running all diagnostics

pass - salesforcedx plugin isn't installed
pass - you don't have any linked plugins
warn - [@salesforce/plugin-deploy-retrieve] sourceApiVersion matches apiVersion
pass - [@salesforce/plugin-trust] can ping: https://registry.npmjs.org
pass - [@salesforce/plugin-trust] can ping: https://registry.yarnpkg.com
pass - [@salesforce/plugin-trust] can ping: https://registry.npmjs.org/
pass - using latest or latest-rc CLI version
pass - can access: https://test.salesforce.com
pass - can access: https://appexchange.salesforce.com/services/data
pass - can access: https://developer.salesforce.com/media/salesforce-cli/sf/channels/stable/sf-win32-x64-buildmanifest
fail - [@salesforce/plugin-auth] CLI supports v2 crypto

Wrote doctor diagnosis to: /Users/juliet.shackell/sfdx/dev-repos/cli.wiki/1721077460991-diagnosis.json

=== Suggestions

  * Check https://github.com/forcedotcom/cli/issues for CLI issues posted by the community.
  * Check http://status.salesforce.com for general Salesforce availability and performance.
  * Neither sourceApiVersion nor apiVersion are defined. The commands that deploy and retrieve source use the max apiVersion of the target org in this case. The issue isn't a problem, as long as it's the behavior you actually want.
  * using npm registry https://registry.npmjs.org/ from npm config
  * Your current installation of Salesforce CLI, including all the plugins you've linked and installed, doesn't yet support v2 crypto. All plugins and libraries must use at least version 6.7.0 of `@salesforce/core` to support v2 crypto. You're generally still able to successfully authenticate with your current CLI installation, but not if you generate a v2 crypto key.
```

### Why Write Plugin-Specific Diagnostic Tests

The main reason is to provide your users a quick and potential fix to an issue, and thus provide a better experience. Because you have a deep understanding of your plugin, you can likely predict potential problems your customers will run into. With the diagnostic tests, you can inspect their CLI and plugin configuration and suggest immediate actions if your users run into these predicted issues. If the suggestions don't fix the problem, the `doctor` gathers the required information that users attach to [GitHub issues](https://github.com/forcedotcom/cli/issues) or provide to Salesforce Customer Support.

Writing diagnostic tests isn't a replacement for good command error handling. Rather, it's a way to educate and clarify command usage within a complex system.

Examples of diagnostic tests include checking for:

- An environment variable that changes the behavior of your plugin or a library that your plugin uses.
- A setting within a project that changes plugin behavior.
- Required dependencies (outside of NPM) that are missing or out of date.
- A system that is required by your plugin that is unavailable.
- Anything that your customers regularly need clarification on that the commands can't handle directly.

### How to Integrate Your Plugin Into the Doctor

See the [diagnostic test in the deploy and retrieve plugin](https://github.com/salesforcecli/plugin-deploy-retrieve/blob/main/src/hooks/diagnostics.ts) for a real-life example. Also see the [source code for the doctor command](https://github.com/salesforcecli/plugin-info/blob/main/src/doctor.ts).

1. Define a hook in the `oclif` section of your plugin's `package.json` with this pattern, where `<plugin-name>` is the `name` property in your `package.json` file:

   ```
   "sf-doctor-<plugin-name>": "./path/to/compiled/hook/handler"
   ```

   For example, the [plugin-deploy-retrieve](https://github.com/salesforcecli/plugin-deploy-retrieve/blob/main/package.json) diagnostic hook is defined with this JSON snippet. The Typescript source file and directory for the hook handler is `src/hooks/diagnostics.ts`:

   ```json
   "oclif": {
     ...
     "hooks": {
       "sf-doctor-@salesforce/plugin-deploy-retrieve": "./lib/hooks/diagnostics"
     }
   }
   ```

2. If you coded your plugin in TypeScript, add a `devDependencies` entry in `package.json` that points to `@salesforce/plugin-info`, which contains the required `SfDoctor` type. Use the latest version of [plugin-info](https://github.com/salesforcecli/plugin-info/releases). For example:

   ```json
   "devDependencies": {
     "@salesforce/plugin-info": "^3.3.18"
   }
   ```

3. In the hook handler source file (`src/hooks/diagnostics.ts` in our example), define and export a `hook` function that runs after the `doctor` command is executed. Here's a basic Typescript example that includes one diagnostic test called `test1`:

   ```typescript
   // Import the SfDoctor interface from plugin-info and Lifecycle class from  @salesforce/core
   import { SfDoctor } from '@salesforce/plugin-info';
   import { Lifecycle } from '@salesforce/core';

   // Define the shape of the hook function
   type HookFunction = (options: { doctor: SfDoctor }) => Promise<[void]>;

   // export the function
   export const hook: HookFunction = async (options) => {
     return Promise.all([test1(options.doctor)]);
   };

   const test1 = async (doctor: SfDoctor): Promise<void> => {
     // Add your code for "test1" here
   };
   ```

4. Code the `hook` function to return the result of all your plugin's diagnostic tests using `Promise.all([test1(), test2(), test3()]);`.

5. Use `doctor.addPluginData()` in your diagnostic tests to add JSON data to the full `doctor` diagnostics report. This JSON data appears in the `pluginSpecificData` section of the JSON report. For example, this code in the hook handler:

   ```typescript
   const pluginName = 'my-plugin';
   const prop1 = 'firstValue';
   const prop2 = 'secondValue';

   ...

   doctor.addPluginData(pluginName, {
     prop1,
     prop2,
   });
   ```

   Results in this JSON snippet in the full `doctor` diagnostic report:

   ```json
   "pluginSpecificData": {
     "my-plugin": [
       {
         "prop1": "firstValue",
         "prop2": "secondValue"
       }
     ]
   },
   ```

6. Use the global singleton `Lifecycle` class in your diagnostic tests to include the test name and status to the beginning section of the `doctor` command output. For example:

   ```typescript
   Lifecycle.getInstance().emit('Doctor:diagnostic', { testName, status });
   ```

   You must name the event `Doctor:diagnostic` and the payload must have this shape: `{ testName: string, status: string }`, where `status` is one of `'pass' | 'fail' | 'warn' | 'unknown'`

7. Use the `doctor.addSuggestion()` method in your diagnostic tests to add suggestions, based on the test results, to the last part of the `doctor` output. For example:

   ```typescript
   doctor.addSuggestion(
     'The environment variable ENV_VARIABLE is set, which can affect the behavior of the XX commands. Are you sure you want to set this env variable?'
   );
   ```

8. Diagnostic tests can reference the command run by the `doctor` and all generated command output from the `doctor` diagnostics. For example:

   ```typescript
   // Get the command string run by the doctor.
   const commandName = doctor.getDiagnosis().commandName;
   if (commandName?.includes('project:deploy:start') {
     /* run a test specific to that command */
   }

   // Parse the debug.log generated by the doctor.
   // The code must wait for the command to execute and logs to be written.
   const debugLog = doctor.getDiagnosis().logFilePaths;
   if (debugLog?.length) {
     // Get the log file path, read it, look for specific output, add suggestions.
   }
   ```

---

_Document compiled from the official Salesforce CLI Plugin Developer Guide._
_Last updated: March 2026_
