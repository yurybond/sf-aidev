# summary

Install a skill from a configured source repository.

# description

Install a skill by name from a configured source repository. The skill is installed to the correct path for the detected AI tool (e.g., `.github/copilot-skills/` for Copilot, `.claude/skills/` for Claude).

# flags.name.summary

Name of the skill to install.

# flags.source.summary

Source repository (owner/repo) to install from. Defaults to the configured default source.

# examples

- Install a skill named "my-skill":

  <%= config.bin %> <%= command.id %> --name my-skill

- Install from a specific source:

  <%= config.bin %> <%= command.id %> --name my-skill --source owner/repo

# error.InstallFailed

Installation of skill "%s" failed: %s

# info.SkillInstalled

Successfully installed skill "%s" to %s
