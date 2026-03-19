# summary

Remove a configured source repository.

# description

Removes a source repository from the configuration. If the source is currently set as the default, a new default will be automatically selected from the remaining sources.

# args.repo.summary

GitHub repository in owner/repo format to remove.

# flags.repo.summary

GitHub repository in owner/repo format to remove.

# flags.no-prompt.summary

Skip the confirmation prompt.

# examples

- Remove a source repository:

  <%= config.bin %> <%= command.id %> owner/repo

- Remove without confirmation:

  <%= config.bin %> <%= command.id %> owner/repo --no-prompt

- Using the --repo flag (alternative syntax):

  <%= config.bin %> <%= command.id %> --repo owner/repo

# error.SourceNotFound

Source repository "%s" is not configured.

# prompt.ConfirmRemove

Are you sure you want to remove source "%s"?

# info.Cancelled

Operation cancelled.

# info.SourceRemoved

Successfully removed source "%s".

# info.NewDefaultSet

Source "%s" is now set as the default.

# error.RepoRequired

Repository is required. Provide it as a positional argument or use the --repo flag.
