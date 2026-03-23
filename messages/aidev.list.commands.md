# summary

List all commands available from configured sources and installed locally.

# description

Display a list of all commands from configured source repositories merged with locally installed commands. Shows installation status, and supports interactive mode with view/install/remove actions.

When --source is not provided, the command automatically uses your default source repository (if configured). A green message displays which source is active. Both local and remote commands are filtered by the active source.

# flags.source.summary

Filter commands by source repository. Uses default source if not specified.

# examples

- List all commands:

  <%= config.bin %> <%= command.id %>

- List commands from a specific source:

  <%= config.bin %> <%= command.id %> --source owner/repo

# warning.SourceFailed

Failed to fetch commands from source "%s": %s

# info.NoCommands

No commands found.

# info.Installing

Installing command "%s"...

# info.Installed

Successfully installed command "%s" to %s

# info.Removing

Removing command "%s"...

# info.Removed

Successfully removed command "%s"

# info.FetchingDetails

Fetching command details...

# warning.InstallFailed

Failed to install command "%s": %s

# warning.RemoveFailed

Failed to remove command "%s": %s

# warning.FailedToFetchDetails

Failed to fetch command details: %s

# prompt.Select

Select a command (↑↓ navigate, Enter select, Esc exit):
