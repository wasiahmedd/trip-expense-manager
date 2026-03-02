# Free Deployment + APK Guide (Trip Window)

This project is now prepared for:
- Free web hosting (`render.yaml`)
- Android APK build with Capacitor (`android/` + npm scripts)
- Free cloud APK build artifact via GitHub Actions (`.github/workflows/build-apk.yml`)

## 1) Deploy Live Web App (Free)

Use Render Blueprint (fastest path because backend + frontend are in one repo).

1. Push this repo to GitHub.
2. In Render, create a new Blueprint and connect this repo.
3. Render will detect [`render.yaml`](./render.yaml) and create:
   - `trip-expense-api` (Node backend)
   - `trip-expense-web` (static frontend)
4. After first deploy, copy the real backend URL.
5. In Render service `trip-expense-web`, set env var:
   - `VITE_SOCKET_SERVER_URL=https://<your-backend>.onrender.com`
6. Redeploy `trip-expense-web`.

## 2) Firebase Auth Domain Setup (Required)

In Firebase Console:
- Authentication -> Settings -> Authorized domains
- Add your live frontend domain:
  - `trip-expense-web.onrender.com` (or your custom domain)

## 3) Build APK (Local, if you have Android tools)

Prerequisites:
- Java 17
- Android Studio + Android SDK

Commands:

```powershell
npm install
npm run mobile:apk:debug
```

APK output:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## 4) Build APK in Cloud (Free, no local Android setup)

This repo includes GitHub Actions workflow:
- [`.github/workflows/build-apk.yml`](./.github/workflows/build-apk.yml)

Steps:
1. Push to GitHub.
2. Go to **Actions** -> **Build Android APK** -> **Run workflow**.
3. Download artifact: `tripcash-debug-apk`.

## 5) Put APK "Live" for Trip Testing (Free)

Fast free options:
- Upload APK to a GitHub Release (share release URL).
- Or attach APK in a private/shared Google Drive folder.

For Play Store production publishing, Google Play Console requires a one-time registration fee.

## Important Notes for Free Tier Usage

- Free Render web services can spin down after inactivity, so first request after idle may be slower.
- Current backend storage uses local JSON file (`data/store.json`), which is okay for testing but not ideal for long-term critical data retention.
- During trip usage, export the spending document regularly from the app.

