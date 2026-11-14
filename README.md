# whenly.

**Life happens. Keep track.**

When did you last change your bedsheets, water your plants, or call your grandparents? whenly gives those little moments a home so you don’t have to keep them all in your head.

A personal activity tracker built around one idea: **remember when, not what to do.** No accounts, deadlines, streaks, or backend.

## Features

- **One-tap recording** with Undo and protection against accidental duplicate taps.
- **Editable history** with past completion records, individual notes, and calendar-day interval statistics.
- **Your own organization** with emoji, categories, search, five sorting options, and archiving.
- **Gentle reminders and insights** based on your settings and actual recorded history.
- **Light, dark, and system themes**, responsive layouts, keyboard navigation, accessible dialogs, and reduced-motion support.
- **Local-first storage** in IndexedDB, JSON backup and restore, and no analytics.
- **Installable PWA** with offline support after the first successful load and service-worker activation.

Start with your own activities or choose an optional starter suggestion. Activities with an unknown last completion date stay unrecorded until you add a memory.

## Getting started

Use **Node.js 22** (the version used in CI) or Node.js 24, with npm.

```sh
git clone https://github.com/buildwithtom/whenly.git
cd whenly
npm ci
npm run dev
```

Open the local URL printed by Vite, normally `http://127.0.0.1:5173`.

### Development commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm test` | Run unit and component tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run build` | Check TypeScript and generate the production app and service worker |
| `npm run preview` | Serve the production build at `http://127.0.0.1:4173` |
| `npm run test:e2e` | Run browser and accessibility tests against a production build |

## Testing

Unit and component tests use Vitest, React Testing Library, and fake IndexedDB. They cover date calculations, activity creation and editing, completion recording, Undo, history, statistics, sorting, filtering, persistence, and backup validation and deduplication.

To run browser tests:

```sh
npx playwright install chromium
npm run build
npm run test:e2e
```

The suite starts its own production preview server. **On macOS, the current configuration requires Google Chrome at its standard `/Applications` location.** On other platforms it uses Playwright Chromium; Linux environments may need `npx playwright install --with-deps chromium`.

Browser tests cover desktop and mobile viewport emulation, axe accessibility checks, keyboard focus, themes, history corrections, backup merge/replacement, destructive-action confirmations, and offline persistence. Mobile emulation runs in Chromium; it does not test Safari or a physical phone. Screenshots and failure traces are saved to the ignored `test-results/` directory.

Run unit tests across timezones, including daylight saving transitions, in a POSIX shell:

```sh
TZ=America/New_York npm test
TZ=Asia/Kolkata npm test
```

## Your data

Personal data stays in **this browser profile, on this device, on this origin**. There is no account, cloud storage, automatic backup, or synchronization. Clearing site data, using private browsing, or changing devices, profiles, or hosting addresses can lose or separate your history. Export a backup regularly; installing the PWA does not create a cloud backup.

JSON backups include activities, completion records, categories, and preferences. Imports are validated and previewed before you choose to merge or replace. Merging keeps existing records on conflicts and prevents repeated imports from duplicating matching activities and memories. Replacement requires explicit confirmation. Import files are limited to **20 MB**.

## Reminders and offline use

In-app reminders are available without notification permission. Set an interval on an activity to choose when to see a nudge. Average intervals require two completion records; personalized reminder suggestions require **four records**, providing three measured intervals.

Browser notifications are optional, require explicit permission in Settings, and are checked only while whenly is open. They **cannot reliably arrive when the app is closed**: there is no push server or background scheduler. Imported preferences never enable browser notifications automatically.

Production builds cache the static app and bundled fonts for offline use. Personal records remain in IndexedDB rather than network caches. Development mode does not install a service worker; use `npm run build` followed by `npm run preview` to check offline behavior. Service workers require HTTPS or localhost. An update notice lets you choose when to load a new app version.

## Tech stack

React 19 · TypeScript · Vite · Tailwind CSS 4 · Lucide React · Motion · date-fns · Dexie · vite-plugin-pwa

Testing: Vitest · React Testing Library · Playwright · axe

```text
src/
  components/       Shared dialogs, branding, icons, and illustration
  db/               IndexedDB schema and transactional data operations
  features/
    activities/     Activity cards, forms, and details
    history/        Completion record editor
    insights/       Summaries derived from recorded history
    settings/       Appearance, categories, notifications, and backups
  lib/              Date calculations, sorting, and backup validation
  styles/           Theme tokens and responsive styles
  test/             Shared unit/component test setup
  types/            Domain types
e2e/                Browser tests
```

Database schema **v1** stores activities, completion events, categories, and preferences separately. The latest completion is derived from history. New installations seed only categories. Future schema changes should introduce a new Dexie version and migration rather than changing an existing deployed schema.

Elapsed time and intervals use local calendar-day comparisons, including across daylight saving transitions. Timestamps represent absolute instants; the device timezone determines displayed calendar dates. Month reminders clamp to the last valid day of the target month. Future completion dates are rejected.

## Deployment

whenly builds to static files in `dist/`. Hash navigation, such as `#/activity/<id>`, supports refreshes without server-side route rewrites. Activity links refer to data in the current browser; they do not share records between devices.

### Cloudflare Pages

Connect this repository with:

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Output directory | `dist` |
| Environment variable | `NODE_VERSION=22` |
| Base path | `/` (default) |

Alternatively, after authenticating your Cloudflare account:

```sh
npm ci
npm test
npm run build
npx wrangler pages deploy dist --project-name whenly
```

No Worker, database binding, or application secret is required.

### GitHub Pages

The included [Pages workflow](.github/workflows/pages.yml) runs unit/component tests, builds, and deploys on pushes to `main`. Commit the workflow with the project, then select **Settings → Pages → Source → GitHub Actions** in the GitHub repository. You can also trigger the workflow manually.

The workflow derives the repository subpath automatically, or uses `/` for a repository named `*.github.io`. **For a custom domain, change the workflow’s build step to `VITE_BASE_PATH=/ npm run build`.**

To build a project site manually, replace `whenly` with your repository name:

```sh
npm ci
npm test
VITE_BASE_PATH=/whenly/ npm run build
```

For a root-domain deployment:

```sh
VITE_BASE_PATH=/ npm run build
```

Publish the contents of `dist/`. `VITE_BASE_PATH` must begin and end with `/`; assets, manifest scope, icons, and service-worker registration follow that path. These environment-variable command examples use POSIX shell syntax.
