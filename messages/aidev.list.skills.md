# summary

List skill artifacts in your project.

# description

Display all skills with checkboxes indicating installation status:

- Checked box (checked) - skill exists locally
- Unchecked box (unchecked) - skill is available from source but not installed

In interactive mode (TTY), use arrow keys to navigate, Enter to select, and Escape to exit.

Merges skills found locally with those available from configured source repositories.

When --source is not provided, the command automatically uses your default source repository (if configured). A green message displays which source is active. Both local and remote skills are filtered by the active source.

# flags.source.summary

Filter skills by source repository. Uses default source if not specified.

# examples

- List all skills:

  <%= config.bin %> <%= command.id %>

- List skills from a specific source:

  <%= config.bin %> <%= command.id %> --source owner/repo

- Get JSON output:

  <%= config.bin %> <%= command.id %> --json

# prompt.Select

Select a skill (use arrow keys, Enter to select, Escape to exit):

# info.NoSkills

No skills found.

# info.Installing

Installing "%s"...

# info.Installed

Successfully installed "%s" to %s.

# info.Removing

Removing "%s"...

# info.Removed

Successfully removed "%s".

# warning.SourceFailed

Failed to fetch skills from source "%s": %s

# warning.InstallFailed

Failed to install "%s": %s

# warning.RemoveFailed

Failed to remove "%s": %s

# info.FetchingDetails

Fetching skill details from source...

# warning.FailedToFetchDetails

Could not fetch skill details: %s
