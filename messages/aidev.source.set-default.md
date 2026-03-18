# summary

Set a source repository as the default.

# description

Sets the specified source repository as the default for artifact installation. The source must already be configured.

# flags.repo.summary

GitHub repository in owner/repo format to set as default.

# examples

- Set a source as the default:

  <%= config.bin %> <%= command.id %> --repo owner/repo

- Using short flag:

  <%= config.bin %> <%= command.id %> -r owner/repo

# error.SourceNotConfigured

Source repository "%s" is not configured. Add it first with "sf aidev source add".

# info.DefaultSet

Source "%s" is now set as the default.
