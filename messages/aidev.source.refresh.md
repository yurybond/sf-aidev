# summary

Refresh cached manifests for source repositories.

# description

Re-fetches manifests from configured source repositories and updates the local disk cache. For repositories without a manifest.json, re-runs auto-discovery to find artifacts in well-known paths.

Use this command when source repositories have been updated and you want to fetch the latest artifact information without removing and re-adding the source.

# args.repo.summary

GitHub repository in owner/repo format to refresh. If omitted, refreshes all configured sources.

# flags.repo.summary

GitHub repository in owner/repo format to refresh.

# examples

- Refresh all configured sources:

  <%= config.bin %> <%= command.id %>

- Refresh a specific source:

  <%= config.bin %> <%= command.id %> owner/repo

- Using the --repo flag:

  <%= config.bin %> <%= command.id %> --repo owner/repo

# error.RepoNotConfigured

Source repository "%s" is not configured. Add it first with `sf aidev source add`.

# error.NoSourcesConfigured

No source repositories configured. Add one with `sf aidev source add owner/repo`.

# info.RefreshingAll

Refreshing %s source repositories...

# info.RefreshingSingle

Refreshing manifest for "%s"...

# info.RefreshSuccess

Successfully refreshed "%s" - %s artifacts found.

# info.RefreshSuccessAutoDiscovered

Successfully refreshed "%s" - %s artifacts auto-discovered from well-known paths.

# info.RefreshFailed

Failed to refresh "%s": %s

# info.Summary

Refreshed %s of %s sources successfully.

# info.CacheStale

Cache for "%s" is stale (older than 1 week).

# info.NoChanges

No changes detected in "%s".
