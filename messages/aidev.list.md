# summary

List all AI development artifacts in your project.

# description

Display a unified view of all agents, skills, prompts, and instruction files. Artifacts are grouped by type with checkboxes indicating installation status:

- Checked box (checked) - artifact exists locally
- Unchecked box (unchecked) - artifact is available from source but not installed

In interactive mode (TTY), use arrow keys to navigate and Escape to exit. Press Enter on an artifact to toggle its inline description display - the description will be fetched from the source and shown in grey below the item.

Merges artifacts found locally with those available from configured source repositories.

When --source is not provided, the command automatically uses your default source repository (if configured). A green message displays which source is active. Both local (installed) and remote (available) artifacts are filtered by the active source.

# flags.source.summary

Filter artifacts by source repository. Uses default source if not specified.

# examples

- List all artifacts:

  <%= config.bin %> <%= command.id %>

- List artifacts from a specific source:

  <%= config.bin %> <%= command.id %> --source owner/repo

- Get JSON output:

  <%= config.bin %> <%= command.id %> --json

# prompt.Select

Select an artifact (use arrow keys, Enter to select, Escape to exit):

# prompt.Action

Select an action:

# info.Installing

Installing "%s"...

# info.Installed

Successfully installed "%s" to %s.

# info.Removing

Removing "%s"...

# info.Removed

Successfully removed "%s".

# info.CannotInstallInstruction

Instruction files cannot be installed from sources. Create them manually in your project.

# info.CannotRemoveInstruction

Instruction files are managed manually. Delete the file directly if you want to remove it.

# warning.SourceFailed

Failed to fetch artifacts from source "%s": %s

# warning.InstallFailed

Failed to install "%s": %s

# warning.RemoveFailed

Failed to remove "%s": %s

# info.FetchingDetails

Fetching artifact details from source...

# info.NoSourceForDetails

No source repository configured for this artifact.

# warning.FailedToFetchDetails

Could not fetch artifact details: %s

# info.NoArtifacts

No artifacts found. Add a source repository with 'sf aidev source add' to see available artifacts.
