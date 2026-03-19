# summary

List instruction files in your project.

# description

Display all instruction files found in your project. Instruction files include:

- CLAUDE.md
- CURSOR.md
- CODEX.md
- copilot-instructions.md
- \*.instructions.md

All instruction files are shown as ☑ (checked) since they are local-only and always installed.

# examples

- List all instruction files:

  <%= config.bin %> <%= command.id %>

- Get JSON output:

  <%= config.bin %> <%= command.id %> --json
