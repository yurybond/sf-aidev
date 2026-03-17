# summary

List all configured source repositories.

# description

Lists all source repositories configured for artifact installation. Shows the repository name, whether it is the default source, and when it was added.

# examples

- List all configured sources:

  <%= config.bin %> <%= command.id %>

- List sources with JSON output:

  <%= config.bin %> <%= command.id %> --json

# info.NoSources

No source repositories configured. Use "sf aidev source add --repo <owner/repo>" to add one.
