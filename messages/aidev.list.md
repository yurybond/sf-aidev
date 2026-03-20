# summary

List all AI development artifacts in your project.

# description

Display a unified view of all agents, skills, prompts, and instruction files. Artifacts are grouped by type with checkboxes indicating installation status:

- Checked box (checked) - artifact exists locally
- Unchecked box (unchecked) - artifact is available from source but not installed

In interactive mode (TTY), use arrow keys to navigate, Enter to select, and Escape to exit. When an artifact is selected, an action menu appears with options to view details, install, or remove.

Merges artifacts found locally with those available from configured source repositories.

# flags.source.summary

Filter available artifacts by source repository.

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
