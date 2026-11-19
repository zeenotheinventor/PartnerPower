# Updates

How a merge to `main` reaches the owner's phone without a new build, how to tell when a new build
is needed, and the one-time setup. The design is in the Updates section of
[the architecture document](../architecture.md).

## 1. How a merge reaches the phone

1. A pull request merges to `main`.
2. If the merge touched `apps/mobile/**` or `packages/**`, the `EAS Update` workflow
   (`.github/workflows/eas-update.yml`) runs. Changes to the docs, the workflows or the repository
   root do not start it. It can also be started by hand from the Actions tab.
3. The workflow installs the dependencies and runs `eas update --channel preview --environment
preview --auto --non-interactive` from `apps/mobile`. The update message is the commit message.
   Two publishes never run at the same time. GitHub keeps only the latest waiting run, so with
   several quick merges a middle run is cancelled. The run that survives publishes the later
   checkout, which includes the earlier merges.
4. The owner's phone runs the `preview` profile APK, which listens to the `preview` channel. At
   launch the app checks for an update and downloads it in the background.
5. The update runs from the next time the app is opened from closed. The app never restarts in the
   middle of a round.
6. On that launch a short toast reads "Updated. You're on the latest version." It shows once for
   each update. `apps/mobile/updates` holds the logic, and the line is in `packages/content`. It
   never shows on a fresh install or on the build's own bundle.

The update shows on [expo.dev](https://expo.dev) under the `get-freak` project, on the `preview`
channel's branch. To list the updates from `apps/mobile`:

```sh
npx eas-cli update:list --branch preview
```

## 2. When a new build is needed

An update carries JavaScript and content only. The runtime version is a fingerprint of the native
parts of the project, and an update reaches only builds with the same fingerprint. If a merge
changes the fingerprint, the update is published under a runtime version no phone has, and the
phone never receives it. Nothing breaks, the phone just stays on its current version.

A change moves the fingerprint when it touches:

- a native package, so any change to a dependency in `apps/mobile/package.json` that has native
  code, or to the lockfile entries behind it
- `apps/mobile/app.json`, including plugins, permissions, the icon and splash files, the
  `owner` and the update URL
- `apps/mobile/eas.json`, which is hashed whole, so editing a profile's `env` also moves it
- the config plugins in `apps/mobile/plugins`
- the Expo SDK version

A change to screens, logic, `packages/**` or content does not move it.

## 3. The fingerprint comment

The `Mobile fingerprint` workflow (`.github/workflows/mobile-fingerprint.yml`) runs on a pull
request that touches one of those inputs. It fingerprints the base and the merged result, and posts
one comment on the pull request.

- **Native fingerprint changed.** The pull request cannot ship as an update. After it merges, the
  phone stays on its current version until a new build is installed. The comment lists the
  changed sources.
- **Native fingerprint unchanged.** This only appears when an earlier push changed it and a later
  one brought it back. The same comment is rewritten.
- **No comment.** The fingerprint did not change, or the pull request touched none of the inputs,
  so an update will reach the phone.

The comment is advice. The workflow is not a required check and never blocks a merge. One limit:
GitHub decides whether the workflow runs from the whole pull request. If a later push removes the
only native change, the workflow does not run again and the old "changed" comment stays. Delete it
by hand.

To print the current fingerprint from a checkout, from `apps/mobile`:

```sh
pnpm exec fingerprint fingerprint:generate | head -c 300
```

## 4. Making a new build

When the comment says the fingerprint changed, or a native package is added, merge as usual and
then build. The build is the owner's step, and agents never run `eas build`. From `apps/mobile`:

```sh
npx eas-cli build --platform android --profile preview
```

Open the link it prints on the phone and install the `.apk` over the old one. What the app stored
on the phone is kept. Updates published after that arrive over the air again. Updates made before
it do not reach the new build, because its fingerprint differs.

## 5. One-time setup

Only the owner can do these. An agent cannot create a token or change repository settings.

1. **Create an Expo access token.** Sign in at [expo.dev](https://expo.dev) as the account that
   owns `@sojisoft/get-freak`. Open **Account settings**, then **Access tokens**, and create one. A
   token that already exists for the same account works. Copy it, because it is shown once.
2. **Create the GitHub environment.** In the repository, open **Settings**, then **Environments**,
   then **New environment**, and name it exactly `preview`. Leave required reviewers off.
3. **Allow only `main`.** On that environment, under **Deployment branches and tags**, choose
   **Selected branches and tags** and add `main`. This stops a run from any other branch from
   reading the token.
4. **Add the secret.** On the same environment, under **Environment secrets**, add `EXPO_TOKEN`
   with the token as its value. Use an environment secret, not a repository secret.
5. **Optional, source maps.** Add `SENTRY_AUTH_TOKEN` as a second environment secret, with a Sentry
   organization token (the error monitoring runbook, section 1, step 5, says how to make one).
   Without it the update is still published, and its error reports show unreadable stacks.

The `preview` GitHub environment is not the `preview` environment on expo.dev. The second one holds
`EXPO_PUBLIC_SENTRY_DSN` (see [error monitoring](error-monitoring.md)), and the publish reads it.

To check the setup, open **Actions**, choose **EAS Update**, then **Run workflow** on `main`. A
missing `EXPO_TOKEN` fails the first real step with a message that names the secret. A run that
passes shows a new update on the `preview` channel on expo.dev.

## 6. If something looks wrong

- **The workflow did not run after a merge.** The merge touched nothing under `apps/mobile` or
  `packages`. Run it by hand if an update is needed.
- **The workflow fails at "Check the EXPO_TOKEN secret is set".** Steps 2 to 4 above are not
  finished, or the run was not on `main`.
- **The update is on expo.dev but the phone does not get it.** Compare the update's runtime
  version with the build's. If they differ, a native change merged since the build, so make a new
  build (section 4).
- **The phone has the update but no toast.** The toast shows once for each update, on a launch
  after the one that downloaded it. A fresh install and the build's own bundle never show it.
- **Error reports show unreadable stacks for an update.** `SENTRY_AUTH_TOKEN` is not set on the
  environment, so the maps were not uploaded. The workflow log says so in a notice.
