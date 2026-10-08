# Building the mobile app (Android)

openGym ships in two flavors from the same codebase:

| | **Self-hosted** (this repo's default) | **Mobile app** (`VITE_MOBILE=1`) |
|---|---|---|
| Runs | in any browser, against your own server | natively on Android (Capacitor shell) |
| Accounts | passkey sign-in, one profile per person | none — the phone *is* the account |
| Data | synced to your server, readable on desktop | stays on the device (file in the app's private storage) |
| Reminders | Web Push from your server | native local notifications, no server involved |
| Exercise media | served by your server (`img/`, `gif/`) | loaded from the jsDelivr CDN |

The mobile flavor never talks to a backend by default: no sign-in screen, no sync, no
telemetry. State is mirrored from `localStorage` into `opengym-state.json` in the app's
private data directory on every change (the WebView can evict storage under
pressure — the file mirror is the durable copy and is restored on launch). Backups go out
through the OS share sheet instead of a browser download.

### Connecting the app to your own server

On first launch the app asks how you want to use it. Alongside the fully local mode above,
you can instead **connect it to a self-hosted openGym server** — your data then lives there,
synced the same way the browser PWA does, instead of only on the phone. This is a mode of the
same app, not a different build or download.

Passkeys can't be used for this: the app's WebView runs at its own origin, which never
matches the real hostname WebAuthn needs. Instead you *pair* the device from a browser
that's already signed in: Settings → **"Pair the mobile app"** shows a one-time code (valid
5 minutes); enter your server's address and that code in the app (same first-launch screen,
or Settings → **"Connect to my server"** later) to finish. Notes:

- Requires network access every time the app is used — there's no offline file mirror once
  connected, same as the browser PWA.
- Use an HTTPS address if at all possible: the connection carries a bearer token instead of
  a cookie, and that token would otherwise cross the network in plain text.
- "Sign out everywhere" (Settings → Account, in the browser) revokes a paired app's access
  too — it's the same signed session token either way, just delivered over a header instead
  of a cookie. See `/api/pair/create` and `/api/pair/redeem` in `api/server.js` for the
  exchange itself.
- Settings → "Disconnect" syncs one last time, then drops the device cleanly back to local
  mode.

## Prerequisites

- Node 20+
- Android Studio (bundles the SDK). Java 21 for Gradle.

## Build & run

```sh
cd frontend
npm install
npm run build:mobile        # VITE_MOBILE build + `cap sync` into android/

npx cap open android        # opens Android Studio → run on emulator or device
```

`npm run build:mobile` bakes the CDN media base into the bundle and copies the web build
into the Android project — re-run it after every web-code change before building natively.

> **Heads-up:** after `build:mobile`, `frontend/dist` contains the *mobile* bundle.
> Run a plain `npm run build` again before deploying `dist` to a server.

## App icons & splash screens

`frontend/resources/icon.svg` is the 1024×1024 source (the app's dumbbell glyph on the
app background). Generate all platform assets from it on a machine with the tooling:

```sh
cd frontend
npx @capacitor/assets generate --iconBackgroundColor '#0c0e12' --splashBackgroundColor '#0c0e12'
```

(If the generator won't take the SVG directly, export it to `resources/icon.png` at
1024×1024 first — any image tool can do it.)

## Distribution — deliberately no app stores

openGym's mobile app is not on the Play Store, and that's a choice: no store
accounts, no store rules, no yearly fees between you and an open-source app.

### Android — sideload the APK

A push to `main` runs the `apk` job in [`.github/workflows/ci-cd.yml`](../.github/workflows/ci-cd.yml).
It runs `npm run build:mobile` and `./gradlew assembleRelease`, then `zipalign`s and signs the
result. The signed `gym.apk` and its `.sha256` are attached to a GitHub release. Android asks
you to allow installs from the browser the first time. The key lives in repository secrets
(`ANDROID_KEYSTORE_B64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`).

To build and sign your own:

```sh
cd frontend && npm run build:mobile
cd android && ./gradlew assembleRelease            # → app/build/outputs/apk/release/app-release-unsigned.apk

# one-time: create a keystore. KEEP IT — updates must be signed with the same key,
# or Android refuses to install the new version over the old one.
keytool -genkeypair -keystore my.keystore -alias opengym -keyalg RSA -validity 10950

# align + sign (zipalign/apksigner ship with the Android SDK build-tools)
zipalign -f -p 4 app-release-unsigned.apk aligned.apk
apksigner sign --ks my.keystore --ks-key-alias opengym --out openGym.apk aligned.apk
```

### Release notes for maintainers

- Bump `versionName`/`versionCode` in `android/app/build.gradle` per release; keep them in
  step with `frontend/package.json`. `versionCode` must strictly increase or updates won't
  install over an existing APK. The APK is *named* from `frontend/package.json` (the CI job
  reads `version` out of it), so the two drifting apart shows up as a misnamed file.
- A push to `main` runs the tests, deploys the server, and publishes the signed APK.
- **License:** openGym is AGPL-3.0, which by itself sits badly with app-store terms of
  service. `NOTICE.md` carries an app-store exception (an additional permission under
  AGPL §7) granted by the copyright holder — relevant only if store distribution ever happens.
- The app requests notification permission only when the workout-day reminder is switched
  on, and (on Android) declares `SCHEDULE_EXACT_ALARM` so the reminder fires to the minute
  where the user allows it.
