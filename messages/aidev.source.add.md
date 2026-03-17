# summary

Add a new source repository.

# description

Adds a new GitHub repository as a source for AI artifacts. The repository must contain a valid `manifest.json` file at the root. The manifest is validated before the source is added.

# flags.repo.summary

GitHub repository in owner/repo format.

# flags.set-default.summary

Set this source as the default.

# examples

- Add a new source repository:

  <%= config.bin %> <%= command.id %> --repo owner/repo

- Add a source and set it as default:

  <%= config.bin %> <%= command.id %> --repo owner/repo --set-default

# error.InvalidRepoFormat

Invalid repository format "%s". Use owner/repo format.

# error.SourceAlreadyExists

Source repository "%s" is already configured.

# error.ManifestNotFound

Could not find a valid manifest in repository "%s". Ensure the repository contains a manifest.json file.

# info.SourceAdded

Successfully added source "%s" with %s artifacts available.

# info.SetAsDefault

Source "%s" has been set as the default.
