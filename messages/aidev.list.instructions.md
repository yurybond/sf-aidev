# summary

List instruction files in your project.

# description

Display all instruction files found in your project. Instruction files include:

- CLAUDE.md
- CURSOR.md
- CODEX.md
- copilot-instructions.md
- \*.instructions.md

All instruction files are shown as checked since they are local-only and always installed.

In interactive mode (TTY), use arrow keys to navigate, Enter to view details, and Escape to exit.

# examples

- List all instruction files:

  <%= config.bin %> <%= command.id %>

- Get JSON output:

  <%= config.bin %> <%= command.id %> --json

# prompt.Select

Select an instruction file to view (use arrow keys, Enter to select, Escape to exit):

# info.InstructionNote

Instruction files are managed manually. Edit or delete them directly in your project.
