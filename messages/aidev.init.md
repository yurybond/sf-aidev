# summary

Initialize AI development tools in your project.

# description

Detect AI tools in your project, configure a source repository, and install available artifacts. This command provides an interactive setup experience for AI-assisted development with your Salesforce project.

# flags.tool.summary

AI tool to configure (copilot, claude, cursor, windsurf, gemini, codex). Auto-detected if not specified.

# flags.source.summary

Source repository (owner/repo) to install artifacts from.

# flags.no-install.summary

Skip artifact installation, only configure tool and source.

# flags.no-prompt.summary

Skip the confirmation prompt.

# examples

- Initialize with auto-detection:

  <%= config.bin %> <%= command.id %>

- Initialize with specific tool:

  <%= config.bin %> <%= command.id %> --tool copilot

- Initialize with a source repository:

  <%= config.bin %> <%= command.id %> --source owner/ai-dev-lifecycle

- Initialize without prompts (for CI/scripts):

  <%= config.bin %> <%= command.id %> --no-prompt

# info.DetectingTools

Detecting AI tools in project...

# info.SingleToolDetected

Detected AI tool: %s

# info.MultipleToolsDetected

Multiple AI tools detected: %s

# info.AutoSelectedTool

Auto-selected tool: %s

# info.ToolConfigured

Configured AI tool: %s

# info.UsingDefaultSource

Using default source: %s

# info.AddingSource

Adding source %s...

# info.SkippingInstall

Skipping artifact installation (--no-install).

# info.FetchingArtifacts

Fetching available artifacts...

# info.NoArtifactsAvailable

No artifacts available from the configured source.

# info.AllArtifactsInstalled

All available artifacts are already installed.

# info.AvailableArtifacts

Available artifacts to install:

# info.InstallingArtifacts

Installing artifacts...

# info.InstallSuccess

Successfully installed %s artifact(s):

# info.InstallCancelled

Installation cancelled.

# prompt.ConfirmTool

Use %s as the active AI tool

# prompt.ConfirmInstall

Install %s artifact(s)

# warning.InstallFailed

Failed to install %s artifact(s):

# error.NoToolsDetected

No AI tools detected in this project.

# error.NoToolsDetectedActions

Initialize an AI tool first (e.g., create .github/copilot-instructions.md for Copilot or .claude/ directory for Claude), or specify a tool with --tool flag.

# error.NoSourceConfigured

No source repository configured.

# error.NoSourceConfiguredActions

Add a source with 'sf aidev source add owner/repo' or specify with --source flag.

# error.SourceAddFailed

Failed to add source %s: %s
