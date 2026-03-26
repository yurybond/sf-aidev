# summary

Install a skill from a configured source repository.

# description

Install a skill by name from a configured source repository, or interactively select from available skills when no name is provided. The skill is installed to the correct path for the detected AI tool (e.g., `.github/copilot-skills/` for Copilot, `.claude/skills/` for Claude).

When --source is not provided, the command automatically uses your default source repository (if configured). In interactive mode, a green message displays which source is active.

# flags.name.summary

Name of the skill to install. If not provided, shows interactive selection.

# flags.source.summary

Source repository (owner/repo) to install from. Uses default source if not specified.

# examples

- Interactively select skills to install:

  <%= config.bin %> <%= command.id %>

- Install a skill named "my-skill":

  <%= config.bin %> <%= command.id %> --name my-skill

- Install from a specific source:

  <%= config.bin %> <%= command.id %> --name my-skill --source owner/repo

# error.InstallFailed

Installation of skill "%s" failed: %s

# error.NonInteractive

This command requires an interactive terminal when no skill name is provided.

# error.NonInteractiveActions

Provide a skill name with --name flag, or run in an interactive terminal.

# error.NoTool

No AI tool is configured for this project.

# error.NoToolActions

Run `sf aidev init` to detect and configure an AI tool, or set one manually.

# info.SkillInstalled

Successfully installed skill "%s" to %s

# info.Fetching

Fetching available skills...

# info.NoArtifacts

No skills available in configured sources.

# info.AllInstalled

All available skills are already installed.

# info.NoneSelected

No skills selected for installation.

# info.Installing

Installing %s skill(s)...

# info.Installed

Successfully installed %s skill(s):

# info.Skipped

Skipped %s skill(s) (already installed):

# warning.Failed

Failed to install %s skill(s):

# prompt.Select

Select skills to install (use Space to select, + all, - invert, Enter to confirm):
