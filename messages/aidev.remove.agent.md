# summary

Remove an installed agent.

# description

Remove a previously installed agent from your project. The agent files will be deleted and unregistered from the sf-aidev configuration. By default, a confirmation prompt is shown before removal.

# flags.name.summary

Name of the agent to remove.

# flags.no-prompt.summary

Skip the confirmation prompt.

# examples

- Remove an agent named "my-agent":

  <%= config.bin %> <%= command.id %> --name my-agent

- Remove without confirmation:

  <%= config.bin %> <%= command.id %> --name my-agent --no-prompt

# prompt.ConfirmRemove

Are you sure you want to remove agent "%s"?

# error.NotInstalled

Agent "%s" is not installed.

# error.RemoveFailed

Failed to remove agent "%s": %s

# info.AgentRemoved

Successfully removed agent "%s".

# info.Cancelled

Removal cancelled.
