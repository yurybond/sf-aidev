# summary

Install a command from a configured source repository.

# description

Install a command by name from a configured source repository, or interactively select from available commands when no name is provided. The command is installed to the correct path for the detected AI tool (e.g., `.github/commands/` for Copilot, `.claude/commands/` for Claude).

# flags.name.summary

Name of the command to install. If not provided, shows interactive selection.

# flags.source.summary

Source repository (owner/repo) to install from. Defaults to the configured default source.

# examples

- Interactively select commands to install:

  <%= config.bin %> <%= command.id %>

- Install a command named "my-command":

  <%= config.bin %> <%= command.id %> --name my-command

- Install from a specific source:

  <%= config.bin %> <%= command.id %> --name my-command --source owner/repo

# error.InstallFailed

Installation of command "%s" failed: %s

# error.NonInteractive

This command requires an interactive terminal when no command name is provided.

# error.NonInteractiveActions

Provide a command name with --name flag, or run in an interactive terminal.

# error.NoTool

No AI tool is configured for this project.

# error.NoToolActions

Run `sf aidev init` to detect and configure an AI tool, or set one manually.

# info.CommandInstalled

Successfully installed command "%s" to %s

# info.Fetching

Fetching available commands...

# info.NoArtifacts

No commands available in configured sources.

# info.AllInstalled

All available commands are already installed.

# info.NoneSelected

No commands selected for installation.

# info.Installing

Installing %s command(s)...

# info.Installed

Successfully installed %s command(s):

# info.Skipped

Skipped %s command(s) (already installed):

# warning.Failed

Failed to install %s command(s):

# prompt.Select

Select commands to install (use Space to select, Enter to confirm):
