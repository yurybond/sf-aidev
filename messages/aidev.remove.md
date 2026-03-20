# summary

Interactively select and remove installed artifacts.

# description

Browse all installed artifacts grouped by category (Agents, Skills, Prompts) and select multiple items to remove at once. This command requires an interactive terminal; for non-interactive use, use the subcommands: `sf aidev remove skill --name X`, `sf aidev remove agent --name X`, or `sf aidev remove prompt --name X`.

# flags.no-prompt.summary

Disable interactive mode. This flag is not supported for the parent command; use subcommands instead.

# examples

- Interactively select artifacts to remove:

  <%= config.bin %> <%= command.id %>

# prompt.Select

Select artifacts to remove (use Space to select, Enter to confirm, Escape to cancel):

# prompt.Confirm

Remove %s artifact(s)? This action cannot be undone.

# error.NonInteractive

This command requires an interactive terminal.

# error.NonInteractiveActions

Use subcommands for non-interactive mode: `sf aidev remove skill --name X`, `sf aidev remove agent --name X`, or `sf aidev remove prompt --name X`.

# info.NoArtifacts

No installed artifacts found.

# info.NoneSelected

No artifacts selected for removal.

# info.Cancelled

Removal cancelled.

# info.Removing

Removing %s artifact(s)...

# info.Removed

Successfully removed %s artifact(s):

# warning.Failed

Failed to remove %s artifact(s):
