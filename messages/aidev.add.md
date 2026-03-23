# summary

Interactively select and install artifacts from configured sources.

# description

Browse all available artifacts grouped by category (Agents, Skills, Prompts) and select multiple items to install at once. This command requires an interactive terminal; for non-interactive use, use the subcommands: `sf aidev add skill --name X`, `sf aidev add agent --name X`, or `sf aidev add prompt --name X`.

When --source is not provided, the command automatically uses your default source repository (if configured). A green message displays which source is active. Only artifacts from the active source are shown for installation.

# flags.source.summary

Filter artifacts to a specific source repository. Uses default source if not specified.

# flags.no-prompt.summary

Disable interactive mode. This flag is not supported for the parent command; use subcommands instead.

# examples

- Interactively select artifacts to install:

  <%= config.bin %> <%= command.id %>

- Filter to a specific source repository:

  <%= config.bin %> <%= command.id %> --source owner/repo

# prompt.Select

Select artifacts to install (use Space to select, Enter to confirm):

# error.NonInteractive

This command requires an interactive terminal.

# error.NonInteractiveActions

Use subcommands for non-interactive mode: `sf aidev add skill --name X`, `sf aidev add agent --name X`, or `sf aidev add prompt --name X`.

# error.NoTool

No AI tool is configured for this project.

# error.NoToolActions

Run `sf aidev init` to detect and configure an AI tool, or set one manually.

# info.Fetching

Fetching available artifacts...

# info.NoArtifacts

No artifacts available in configured sources.

# info.AllInstalled

All available artifacts are already installed.

# info.NoneSelected

No artifacts selected for installation.

# info.Installing

Installing %s artifact(s)...

# info.Installed

Successfully installed %s artifact(s):

# info.Skipped

Skipped %s artifact(s) (already installed):

# warning.Failed

Failed to install %s artifact(s):
