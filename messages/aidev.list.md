# summary

List all AI development artifacts in your project.

# description

Display a unified view of all agents, skills, prompts, and instruction files. Artifacts are grouped by type with checkboxes indicating installation status:

- ☑ (checked) — artifact exists locally
- ☐ (unchecked) — artifact is available from source but not installed

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
