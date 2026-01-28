## Spillover

A small experimental project for liking tracks on Spotify from outside the Spotify client (e.g. via a browser extension UI).

This project was originally created as an **experiment using Claude Code** to drive most of the implementation and refactoring work.

---

## Tech Stack

- **Astro** for the main web app and API routes
- **TypeScript** for application logic
- **Tailwind CSS** for styling
- **Chrome-compatible extension** in the `extension/` directory
- **Spotify Web API** for playback, user, and library operations

---

## Prerequisites

- **Node.js** 20.x or later
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

Create a `.env` file in the project root (alongside `astro.config.mjs`) with your secrets. Adjust names if you change anything in `src/lib/auth.ts` or `src/lib/spotify.ts`:

```bash
cp .env.example .env # if you create one, otherwise create manually
```

Then set at least:

```bash
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:4321/api/auth/callback
SESSION_SECRET=some-long-random-string
APP_BASE_URL=http://localhost:4321
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

The extension lives under the `extension/` directory. The build process also produces an `extension.zip` under `public/` and `dist/client/` that can be loaded into compatible browsers.

### Loading into Chrome (or Chromium-based browsers)

1. Run a build so that the latest assets exist:

```bash
npm run build
```

2. Open `chrome://extensions` in your browser.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the `extension/` directory from this repository.

Alternatively, you can unzip `public/extension.zip` and load that folder.

---

## Project Structure

High-level overview of the main directories:

- `src/pages/` – Astro pages and API routes
  - `api/` – server endpoints (auth, now-playing, playlists, search, suggestions, etc.)
  - `index.astro`, `extension.astro`, `privacy.astro`
- `src/components/` – React/TSX components used by the Astro pages
- `src/layouts/` – shared layouts
- `src/lib/` – Spotify and auth helpers (`api-utils.ts`, `auth.ts`, `spotify.ts`)
- `extension/` – browser extension source (background script, popup, manifest)

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

