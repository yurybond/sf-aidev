# summary

Install an agent from a configured source repository.

# description

Install an agent by name from a configured source repository, or interactively select from available agents when no name is provided. The agent is installed to the correct path for the detected AI tool (e.g., `.github/agents/` for Copilot, `.claude/agents/` for Claude).

# flags.name.summary

Name of the agent to install. If not provided, shows interactive selection.

# flags.source.summary

Source repository (owner/repo) to install from. Defaults to the configured default source.

# examples

- Interactively select agents to install:

  <%= config.bin %> <%= command.id %>

- Install an agent named "my-agent":

  <%= config.bin %> <%= command.id %> --name my-agent

- Install from a specific source:

  <%= config.bin %> <%= command.id %> --name my-agent --source owner/repo

# error.InstallFailed

Installation of agent "%s" failed: %s

# error.NonInteractive

This command requires an interactive terminal when no agent name is provided.

# error.NonInteractiveActions

Provide an agent name with --name flag, or run in an interactive terminal.

# error.NoTool

No AI tool is configured for this project.

# error.NoToolActions

Run `sf aidev init` to detect and configure an AI tool, or set one manually.

# info.AgentInstalled

Successfully installed agent "%s" to %s

# info.Fetching

Fetching available agents...

# info.NoArtifacts

No agents available in configured sources.

# info.AllInstalled

All available agents are already installed.

# info.NoneSelected

No agents selected for installation.

# info.Installing

Installing %s agent(s)...

# info.Installed

Successfully installed %s agent(s):

# info.Skipped

Skipped %s agent(s) (already installed):

# warning.Failed

Failed to install %s agent(s):

# prompt.Select

Select agents to install (use Space to select, Enter to confirm):
