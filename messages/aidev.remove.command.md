# summary

Remove an installed command.

# description

Remove a command that was previously installed. By default, prompts for confirmation before removing. Use --no-prompt to skip the confirmation.

# flags.name.summary

Name of the command to remove.

# flags.no-prompt.summary

Skip confirmation prompt before removing.

# examples

- Remove a command:

  <%= config.bin %> <%= command.id %> --name my-command

- Remove without confirmation:

  <%= config.bin %> <%= command.id %> --name my-command --no-prompt

# error.NotInstalled

Command "%s" is not installed.

# error.RemoveFailed

Failed to remove command "%s": %s

# info.CommandRemoved

Successfully removed command "%s"

# info.Cancelled

Command removal cancelled.

# prompt.ConfirmRemove

Are you sure you want to remove command "%s"?
