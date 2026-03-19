# summary

List skill artifacts in your project.

# description

Display all skills with checkboxes indicating installation status:

- ☑ (checked) — skill exists locally
- ☐ (unchecked) — skill is available from source but not installed

Merges skills found locally with those available from configured source repositories.

# flags.source.summary

Filter available skills by source repository.

# examples

- List all skills:

  <%= config.bin %> <%= command.id %>

- List skills from a specific source:

  <%= config.bin %> <%= command.id %> --source owner/repo

- Get JSON output:

  <%= config.bin %> <%= command.id %> --json
