## Spillover

Save tracks to your Spotify library while listening on other platforms. Spillover lets you quickly search for and save tracks without switching apps.

Originally created as an **experiment using Claude Code** to drive implementation and refactoring.

---

## Features

- **Quick Search** - Search Spotify's catalog with instant results
- **One-Click Like** - Save tracks to your Liked Songs instantly
- **Playlist Support** - Add tracks to any of your playlists
- **URL Import** - Paste YouTube, SoundCloud, Deezer, Apple Music, Bandcamp, or Spotify URLs to find tracks
- **Now Playing** - See what's currently playing on Spotify with recommendations
- **Browser Extension** - Right-click any page to search for tracks
- **Privacy First** - No data stored on servers, optional anonymous analytics

---

## Tech Stack

- **Astro 5** for the main web app and API routes (Node adapter for SSR)
- **TypeScript** for application logic
- **React** for interactive components
- **Tailwind CSS** for styling
- **Chrome-compatible extension** in the `extension/` directory
- **Spotify Web API** for playback, user, and library operations
- **PostHog** (optional) for anonymous analytics and error tracking

---

## Prerequisites

- **Node.js** 18.x or later
- **npm** (comes with Node)
- A **Spotify Developer** account and application:
  - Spotify Client ID
  - Spotify Client Secret
  - Configured redirect URI (see below)

---

## Local Setup

1. **Clone the repository**

```bash
git clone git@github.com:medloughry/spillover.git
cd spillover
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment**

```bash
cp .env.example .env
```

Edit `.env` with your Spotify credentials:

```env
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REDIRECT_URI=http://127.0.0.1:4321/api/auth/callback

# Optional: PostHog Analytics (leave empty to disable)
PUBLIC_POSTHOG_KEY=
PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

4. **Run the dev server**

```bash
npm run dev
```

By default, Astro will start on `http://localhost:4321` (or whichever port you’ve configured).

---

## Building

To create a production build of the Astro app:

```bash
npm run build
```

This generates the output in the `dist/` directory:

- `dist/client/` – static client assets (including the packaged extension zip)
- `dist/server/` – server output for SSR / adapter

You can preview the production build locally with:

```bash
npm run preview
```

---

## Browser Extension

The extension lives under the `extension/` directory. You can package it as a zip archive for distribution or loading into your browser.

### Building `extension.zip`

To build a fresh `extension.zip` from the `extension/` directory:

```bash
npm run build:extension-zip
```

This will:

- Create (or replace) `public/extension.zip` containing the contents of `extension/`.
- Allow Astro’s build step to copy that zip into `dist/client/extension.zip` when you run `npm run build`.

### Loading into Chrome (or Chromium-based browsers)

1. (Optional but recommended) Build a fresh zip:

```bash
npm run build:extension-zip
```

2. Open `chrome://extensions` in your browser.
3. Enable **Developer mode**.
4. Either:
   - Click **Load unpacked** and select the `extension/` directory, **or**
   - Click **Load unpacked**, unzip `public/extension.zip`, and select the unzipped folder.

---

## Project Structure

High-level overview of the main directories:

- `src/pages/` – Astro pages and API routes
  - `api/` – server endpoints (auth, now-playing, playlists, search, suggestions, etc.)
  - `index.astro`, `extension.astro`, `privacy.astro`
- `src/components/` – React/TSX components used by the Astro pages
- `src/layouts/` – shared layouts
- `src/lib/` – Spotify and auth helpers (`api-utils.ts`, `auth.ts`, `spotify.ts`, `error-tracking.ts`)
- `extension/` – browser extension source (background script, popup, manifest)
- `public/` – static assets (favicon, robots.txt, sitemap.xml)

---

## API Endpoints

All endpoints require authentication except `/api/health`.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/auth/login` | GET | Start OAuth flow |
| `/api/auth/callback` | GET | OAuth callback |
| `/api/auth/logout` | GET | Clear session |
| `/api/me` | GET | Get current user |
| `/api/search?q=` | GET | Search tracks |
| `/api/like` | POST/DELETE | Like/unlike track |
| `/api/playlists` | GET | Get user playlists |
| `/api/playlist/add` | POST | Add track to playlist |
| `/api/now-playing` | GET | Get currently playing |
| `/api/suggestions?seeds=` | GET | Get recommendations |
| `/api/import-url` | POST | Import from URL |

### Rate Limits

- Search: 60 requests/minute
- Like/Playlist: 30 requests/minute
- Now Playing: 120 requests/minute
- Other endpoints: 30 requests/minute

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `/` | Focus search |
| `Space` | Play/pause preview |
| `L` | Like first result |
| `Esc` | Stop playback |

---

## Security

- OAuth tokens stored in HTTP-only cookies
- CSRF protection via state parameter
- Security headers (X-Frame-Options, X-Content-Type-Options, etc.)
- Input validation on all API endpoints
- Rate limiting to prevent abuse

---

## Analytics (Optional)

Spillover supports optional anonymous analytics via PostHog:

- **Opt-in only** - Users consent via cookie banner
- **No IP tracking** - Explicitly disabled
- **No session recording** - Disabled by default
- **Error tracking** - Captures unhandled errors for debugging

To enable, set `PUBLIC_POSTHOG_KEY` in your environment.

---

## Production Deployment

For production, update your redirect URI:

```env
SPOTIFY_REDIRECT_URI=https://your-domain.com/api/auth/callback
```

Run the production server:

```bash
npm run build
node dist/server/entry.mjs
```

Or use PM2:

```bash
pm2 start dist/server/entry.mjs --name spillover
```

---

## Contributing

This project started as a personal experiment (driven largely by **Claude Code**) rather than a polished product, but contributions are welcome if you find it useful.

- **Issues & ideas**
  - Feel free to open issues for bugs, feature ideas, or UX improvements.

- **Pull requests**
  1. Fork the repository.
  2. Create a new branch for your change:

  ```bash
  git checkout -b feature/your-feature-name
  ```

  3. Make your changes, including tests if applicable.
  4. Run the test and build scripts:

  ```bash
  npm run lint   # if configured
  npm run build
  ```

  5. Open a pull request with a clear description and screenshots where helpful.

- **Code style**
  - Prefer modern TypeScript and Astro conventions.
  - Keep components small, focused, and reusable.
  - Avoid unnecessary coupling between `extension/` and `src/` – treat them as two clients talking to the same APIs.

---

## Notes About the Experiment

- The initial implementation and many refactors were guided by **Claude Code** as an AI coding assistant.
- The goal was to explore rapid iteration on a real-world integration with the Spotify API, including:
  - Building a lightweight external “like” UI
  - Experimenting with Astro + React/TSX components
  - Wiring a small browser extension to a bespoke API backend
- Expect some rough edges and unfinished ideas; treat this as a playground more than a fully supported product.

---

## Licence

This project is licensed under the **MIT Licence**.

See the `LICENSE` file in the repository root for the full text.

