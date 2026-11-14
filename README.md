# whenly.

**Life happens. Keep track.**

A calm, private memory assistant for everyday life. Record when you last did something, then get on with your day. No accounts, streaks, backend, analytics, or fictional starter history.

## Run locally

Requires Node.js **20.19+ or 22.12+**, and npm.

```sh
npm ci
npm run dev
```

Open the Local URL printed by Vite (normally `http://127.0.0.1:5173`).

```sh
npm test                  # Vitest + React Testing Library
npm run test:watch        # Interactive test runner
npm run build             # TypeScript check, production bundle, and service worker
npm run preview           # Serve dist at http://127.0.0.1:4173
```

### Browser and accessibility tests

```sh
npx playwright install chromium
npm run build
npm run test:e2e
```

The browser suite starts the production preview itself. On macOS it uses installed Google Chrome; on other platforms it uses Playwright Chromium. It checks desktop and mobile layouts, WCAG A/AA accessibility with axe, keyboard focus trapping, creation, editing, completion/undo, history, reminder suggestions, repeated import, export, themes, archives, refresh persistence, and service-worker offline recording. Screenshots and failure traces are written to ignored `test-results/`.

Run the unit tests in a timezone with daylight saving transitions:

```sh
TZ=America/New_York npm test
TZ=Asia/Kolkata npm test
```

## Features

- Unknown-date or known-date activities, curated emoji, built-in and custom categories, notes, optional calendar reminders.
- One-tap recording, a transactional rapid-tap guard, and event-specific Undo.
- Editable completion history with individual notes, add past memories, and precise deletion confirmations.
- Elapsed local calendar time, accurate calendar-day interval statistics, archive/restore, search, category filters, and five sort options. Custom order has keyboard-accessible move controls.
- Insights derived entirely from recorded data. Average intervals require two records; personalized reminder suggestions require **four completion records** (three measured intervals).
- Light/dark/system appearance, reduced-motion support, semantic controls, native focus-trapping dialogs, screen-reader announcements, and mobile safe-area navigation.
- Versioned, validated JSON backups with preview, explicit replacement confirmation, atomic restore, and idempotent merging. Existing records win conflicts during merge. Matching activity IDs/names, category IDs/names, and event IDs/activity timestamps prevent repeated-import duplicates.
- Installable PWA with local fonts, app icons, offline shell caching, and an explicit app-update notice.

## Architecture

React 19, TypeScript, Vite, Tailwind CSS 4 with a custom token-based visual system, Lucide React, Motion, date-fns, Dexie/IndexedDB, vite-plugin-pwa, Vitest, React Testing Library, and Playwright.

```text
src/
  components/             Accessible dialogs, brand, category icons, SVG illustration
  db/                     Versioned Dexie schema and transactional domain operations
  features/
    activities/           Activity cards, creation/editing, details
    history/              Completion record editor
    insights/             Real-data summaries
    settings/             Appearance, categories, notifications, backups
  lib/                    Local calendar calculations, sorting, backup validation
  styles/                 Theme tokens, responsive styles, reduced-motion support
  test/                   IndexedDB and browser API test setup
  types/                  Shared domain types
```

Database schema **v1** keeps activities, events, categories, and preferences in separate stores. The latest completion is always derived from event history. Initial database creation seeds only categories. Future schema changes should add a Dexie `.version(n).stores(...).upgrade(...)` migration; never mutate a deployed schema version in place.

Calendar-day comparisons use date-fns local calendar functions, including across midnight and daylight saving changes. Month reminders use calendar month addition, clamped to the last valid day. Dates in the future are rejected. A reminder is due on its local calendar day. Current device timezone determines the displayed calendar day; stored completion timestamps are absolute instants.

## Data and reminder limitations

All personal data lives in **this browser profile, on this device, on this origin**. There is no automatic backup or synchronization. Clearing site data, private browsing, switching profiles, changing hostnames, or moving devices may lose or separate your history. Export backups regularly. Installation does not provide cloud storage. Restore files are limited to 20 MB.

In-app reminder states are the reliable baseline. Browser notifications require supported APIs and explicit permission in Settings. They are checked only while the app is open, at most once per activity per local day in that app session. They are **not guaranteed when the app is closed**; there is no backend scheduler or push server. Browser permission is never requested on initial load. Imported preferences do not automatically enable notifications.

The service worker precaches only static application files and fonts, never personal records or arbitrary network responses. Production builds provide offline use after the first successful load and service-worker activation. Development mode does not install a service worker. An update notice allows users to choose when to refresh. HTTPS (or localhost) is needed for service workers and notification features.

## Cloudflare Pages

Connect this repository in Cloudflare Pages with:

- Build command: `npm run build`
- Build output directory: `dist`
- Environment variable: `NODE_VERSION=22`
- Base path: `/` (the default)

Or deploy from the command line after authenticating your Cloudflare account:

```sh
npm ci
npm test
npm run build
npx wrangler pages deploy dist --project-name whenly
```

No Worker, server, database binding, or secret is needed. Hash navigation makes activity links and refreshes work without server rewrites.

## GitHub Pages

The included `.github/workflows/pages.yml` tests, builds, and deploys on pushes to `main`. In your repository, choose **Settings → Pages → Source → GitHub Actions**, then push the project. The workflow derives the repository subpath automatically, including a root path for `*.github.io` repositories.

To build a project site manually (replace `whenly` with your repository name):

```sh
npm ci
npm test
VITE_BASE_PATH=/whenly/ npm run build
```

Publish the contents of `dist`. For a user/organization Pages site or a custom domain, use the root path:

```sh
VITE_BASE_PATH=/ npm run build
```

`VITE_BASE_PATH` must begin and end with `/`. Manifest scope, icon URLs, assets, and service-worker registration follow this path. In-app navigation uses hash routes such as `#/activity/<id>` so refreshes do not require an SPA fallback rule. Activity IDs refer only to data stored on that browser/device.
# whenly
