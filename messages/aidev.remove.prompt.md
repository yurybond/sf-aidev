# summary

Remove an installed prompt.

# description

Remove a previously installed prompt from your project. The prompt file will be deleted and unregistered from the sf-aidev configuration. By default, a confirmation prompt is shown before removal.

# flags.name.summary

Name of the prompt to remove.

# flags.no-prompt.summary

Skip the confirmation prompt.

# examples

- Remove a prompt named "my-prompt":

  <%= config.bin %> <%= command.id %> --name my-prompt

- Remove without confirmation:

  <%= config.bin %> <%= command.id %> --name my-prompt --no-prompt

# prompt.ConfirmRemove

Are you sure you want to remove prompt "%s"?

# error.NotInstalled

Prompt "%s" is not installed.

# error.RemoveFailed

Failed to remove prompt "%s": %s

# info.PromptRemoved

Successfully removed prompt "%s".

# info.Cancelled

Removal cancelled.
