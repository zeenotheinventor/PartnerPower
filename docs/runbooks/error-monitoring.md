# Error monitoring

How to set up Sentry for Get Freak, send a test error, read a report, and find which release it
came from. The design and the privacy rules are in the Error reporting and Privacy sections of
[the architecture document](../architecture.md).

Sentry lives at `https://de.sentry.io`, in the organisation `sojisoft-limited`. Get Freak has one
project there, `getfreak-mobile`.

## 1. First setup

Do these once. Until they are done the app sends nothing and runs as normal.

1. **Create the project.** In Sentry, open **Projects**, then **Create Project**. Choose React
   Native. Name it `getfreak-mobile`, which is the name `apps/mobile/app.json` points at. Skip the
   setup steps Sentry shows after that, because the code is already in the app.
2. **Check the privacy settings.** These are set for the organisation, and KeyLow already needs
   them on. Open **Settings**, then **Security & Privacy**, and confirm:
   - "Prevent Storing of IP Addresses" is on.
   - "Data Scrubber" and "Use Default Scrubbers" are on.

   These also cover a crash in native code, which the app cannot scrub itself.

3. **Set the DSN.** In the project, open **Settings**, then **Client Keys (DSN)**, and copy the DSN.
   From `apps/mobile`, run this and paste the DSN when asked:

   ```sh
   npx eas-cli env:create --environment production --environment preview --name EXPO_PUBLIC_SENTRY_DSN --visibility plaintext
   ```

   The `preview` environment is there so the build on your own phone reports too. Leave it out to
   keep preview builds silent.

4. **Set the auth token.** It lets a build upload source maps, so stacks are readable. In Sentry,
   open **Settings**, then **Developer Settings**, then **Organization Tokens**, and create one. The
   token KeyLow uses also works. From `apps/mobile`:

   ```sh
   npx eas-cli env:create --environment production --name SENTRY_AUTH_TOKEN --visibility secret
   ```

5. **Make a new build.** Sentry is a native module, so an existing build does not have it. Build
   and install the preview profile as usual.

## 2. Send a test error

On a phone with a preview or development build, open this link, for example from a note or a
message to yourself:

```
getfreak://dev/test-error
```

The app shows its crash screen. In Sentry, an issue named `TestReportError` appears within a
minute. Check that it has no message, no user and no IP address. "Start again" takes you back to
the first screen.

A store build ignores the link and opens the first screen.

## 3. Read a report

Open the project, then **Issues**, then the issue.

- **The title is the error type only.** The app removes every error message before it sends,
  because a message can quote a card, a name or something a player wrote. Look at the stack.
- **The stack** shows the file and line when source maps were uploaded. Minified frames mean that
  build or update was published without them. See section 5.
- **The breadcrumbs** are the routes the player moved through, by name, and the app going to the
  background or coming back. A dynamic part of a route shows as its placeholder, such as `[deckId]`.
- **There is no user.** The app has no accounts and sets no id. Reports cannot be grouped by person.
- **A native crash** shows a native stack and no breadcrumbs from JavaScript. It was sent by the
  native SDK and did not pass through the app's scrubbing. On Android it can carry a random install
  id made by the SDK.

## 4. Which release did it come from

On a report:

- `release` is the commit the JavaScript was built from, when the update was published with
  `EXPO_PUBLIC_COMMIT_SHA` set, as the README's command does. Otherwise it is the runtime version.
- `dist` is the id of the running update. A report from the JavaScript built into the app has none.
- The tag `runtimeVersion` is the native fingerprint, which says which build the phone has.
- `environment` is the update channel: `preview` or `production`.

To list the updates on a channel, from `apps/mobile`:

```sh
npx eas-cli update:list --branch preview
```

## 5. Source maps

- **Production builds** upload during the build, and the build fails if `SENTRY_AUTH_TOKEN` is not
  set in the build service.
- **Development and preview builds** skip the upload. `eas.json` sets `SENTRY_DISABLE_AUTO_UPLOAD`
  for both, so they build without the token. Reports from the JavaScript built into those builds
  show minified stacks. Reports from an update show readable ones once its maps are uploaded.
- **Updates** are uploaded by hand after `eas update`, with the command in the README. It needs
  `SENTRY_AUTH_TOKEN` in your shell. The update works without it.

## 6. Secrets, by name only

| Name                     | Where it lives                                              |
| ------------------------ | ----------------------------------------------------------- |
| `EXPO_PUBLIC_SENTRY_DSN` | EAS environment variable, `production` and `preview`        |
| `SENTRY_AUTH_TOKEN`      | EAS secret for `production`, and your shell when publishing |

Neither is in a committed file, so neither changes the native fingerprint. The repository is
public. Never paste a DSN or the token into a ticket, a pull request, a commit or a document.

## 7. If reports stop arriving

- Check **Stats** for the project. On the free plan a noisy bug can use the month's quota, after
  which Sentry discards reports until it resets.
- Check the DSN is still set for the environment the build used: `npx eas-cli env:list`.
- A build made before the DSN was set does not have it. Publish an update or make a new build.
