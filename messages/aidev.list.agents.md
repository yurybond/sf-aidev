# summary

List agent artifacts in your project.

# description

Display all agents with checkboxes indicating installation status:

- ☑ (checked) — agent exists locally
- ☐ (unchecked) — agent is available from source but not installed

Merges agents found locally with those available from configured source repositories.

# flags.source.summary

Filter available agents by source repository.

# examples

- List all agents:

  <%= config.bin %> <%= command.id %>

- List agents from a specific source:

  <%= config.bin %> <%= command.id %> --source owner/repo

- Get JSON output:

  <%= config.bin %> <%= command.id %> --json
