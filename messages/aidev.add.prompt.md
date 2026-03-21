# summary

Install a prompt from a configured source repository.

# description

Install a prompt by name from a configured source repository, or interactively select from available prompts when no name is provided. The prompt is installed to the correct path for the detected AI tool (e.g., `.github/prompts/` for Copilot, `.claude/prompts/` for Claude).

# flags.name.summary

Name of the prompt to install. If not provided, shows interactive selection.

# flags.source.summary

Source repository (owner/repo) to install from. Defaults to the configured default source.

# examples

- Interactively select prompts to install:

  <%= config.bin %> <%= command.id %>

- Install a prompt named "my-prompt":

  <%= config.bin %> <%= command.id %> --name my-prompt

- Install from a specific source:

  <%= config.bin %> <%= command.id %> --name my-prompt --source owner/repo

# error.InstallFailed

Installation of prompt "%s" failed: %s

# error.NonInteractive

This command requires an interactive terminal when no prompt name is provided.

# error.NonInteractiveActions

Provide a prompt name with --name flag, or run in an interactive terminal.

# error.NoTool

No AI tool is configured for this project.

# error.NoToolActions

Run `sf aidev init` to detect and configure an AI tool, or set one manually.

# info.PromptInstalled

Successfully installed prompt "%s" to %s

# info.Fetching

Fetching available prompts...

# info.NoArtifacts

No prompts available in configured sources.

# info.AllInstalled

All available prompts are already installed.

# info.NoneSelected

No prompts selected for installation.

# info.Installing

Installing %s prompt(s)...

# info.Installed

Successfully installed %s prompt(s):

# info.Skipped

Skipped %s prompt(s) (already installed):

# warning.Failed

Failed to install %s prompt(s):

# prompt.Select

Select prompts to install (use Space to select, Enter to confirm):
