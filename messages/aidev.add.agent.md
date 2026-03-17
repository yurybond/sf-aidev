# summary

Install an agent from a configured source repository.

# description

Install an agent by name from a configured source repository. The agent is installed to the correct path for the detected AI tool (e.g., `.github/agents/` for Copilot, `.claude/agents/` for Claude).

# flags.name.summary

Name of the agent to install.

# flags.source.summary

Source repository (owner/repo) to install from. Defaults to the configured default source.

# examples

- Install an agent named "my-agent":

  <%= config.bin %> <%= command.id %> --name my-agent

- Install from a specific source:

  <%= config.bin %> <%= command.id %> --name my-agent --source owner/repo

# error.InstallFailed

Installation of agent "%s" failed: %s

# info.AgentInstalled

Successfully installed agent "%s" to %s
