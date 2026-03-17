# summary

Install a prompt from a configured source repository.

# description

Install a prompt by name from a configured source repository. The prompt is installed to the correct path for the detected AI tool (e.g., `.github/prompts/` for Copilot, `.claude/prompts/` for Claude).

# flags.name.summary

Name of the prompt to install.

# flags.source.summary

Source repository (owner/repo) to install from. Defaults to the configured default source.

# examples

- Install a prompt named "my-prompt":

  <%= config.bin %> <%= command.id %> --name my-prompt

- Install from a specific source:

  <%= config.bin %> <%= command.id %> --name my-prompt --source owner/repo

# error.InstallFailed

Installation of prompt "%s" failed: %s

# info.PromptInstalled

Successfully installed prompt "%s" to %s
