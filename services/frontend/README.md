# Frontend

## Update `ui-components`

Sometimes it happens to update soem components imported from `@platformatic/ui-components`.

When working with Cloud-In-Box linking the local library is not working so these are the steps

1. Update the `ui-components` code, use StoryBook stories to test it visually
2. Make and publish a new version with `npm version patch|minor` and `npm publish`
3. In `icc-3` go to `services/frontend` directory and run `pnpm update @platformatic/ui-components@latest`
4. In `icc-3` root directory run `pnpm cleanall` to clear dependencies
5. Then run `NPM_CONFIG_PLATFORM=linux NPM_CONFIG_ARCH=arm64 pnpm install --force` to reinstall the deps.
6. ICC should _not_ working in your browser, so delete the `icc` pod and when it's created, there will be the new version installed.
