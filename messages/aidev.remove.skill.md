# summary

Remove an installed skill.

# description

Remove a previously installed skill from your project. The skill file will be deleted and unregistered from the ai-dev configuration. By default, a confirmation prompt is shown before removal.

# flags.name.summary

Name of the skill to remove.

# flags.no-prompt.summary

Skip the confirmation prompt.

# examples

- Remove a skill named "my-skill":

  <%= config.bin %> <%= command.id %> --name my-skill

- Remove without confirmation:

  <%= config.bin %> <%= command.id %> --name my-skill --no-prompt

# prompt.ConfirmRemove

Are you sure you want to remove skill "%s"?

# error.NotInstalled

Skill "%s" is not installed.

# error.RemoveFailed

Failed to remove skill "%s": %s

# info.SkillRemoved

Successfully removed skill "%s".

# info.Cancelled

Removal cancelled.
