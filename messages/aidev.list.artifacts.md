# summary

List installed and available artifacts.

# description

List artifacts from your project and configured sources. By default, shows both installed and available artifacts. Use flags to filter by type (skill, agent, prompt) or show only installed/available artifacts.

# flags.type.summary

Filter by artifact type (skill, agent, prompt).

# flags.installed.summary

Show only installed artifacts.

# flags.available.summary

Show only available artifacts from sources.

# flags.source.summary

Filter available artifacts by source repository.

# examples

- List all artifacts:

  <%= config.bin %> <%= command.id %>

- List only installed artifacts:

  <%= config.bin %> <%= command.id %> --installed

- List only available skills:

  <%= config.bin %> <%= command.id %> --available --type skill

- List artifacts from a specific source:

  <%= config.bin %> <%= command.id %> --source owner/repo

# info.InstalledHeader

Installed Artifacts:

# info.NoInstalled

No artifacts installed.

# info.AvailableHeader

Available Artifacts:

# info.NoAvailable

No artifacts available from configured sources.
