# Install script

The _install.sh_ script will:

* create required databases
* create a new user account with limited access to the new databases
* deploys the latest Helm chart

It works interactively, non-interactively, or partially interactive. The
following flags can be set:

* `--pg-superuser` - The connection string to Postgres with super-user access
* `--valkey-icc` - The URL for Valkey cache
* `--valkey-apps` - The URL for Valkey cache
* `--prometheus` - The URL for Prometheus, specifically for scraping
* `--github-user` - The Github user for pulling images
* `--github-token` - The Github token for pulling images
* `--kube-context` - Which kubernetes cluster to deploy to
* `--public-url` - The URL from which ICC will be accessed
* `--gh-oauth-client-id` - Github OAuth
* `--github-oauth-client-id` - Alternative syntax
* `--gh-oauth-client-secret` - Github OAuth
* `--github-oauth-client-secret` - Alternative syntax
* `--google-oauth-client-id` - Google OAuth
* `--google-oauth-client-secret` - Google OAuth
* `--disable-icc-oauth` - Disable OAuth

If any of these are not set, the user will be prompted.
