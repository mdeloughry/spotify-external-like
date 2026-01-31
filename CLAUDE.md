# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Spillover is a web app that lets you search Spotify and save tracks to your library. It supports importing from external platforms (YouTube, SoundCloud, etc.) and includes a browser extension for quick access.

## Commands

```bash
npm run dev      # Start dev server on localhost:4321
npm run build    # Production build to dist/
npm run preview  # Preview production build
npm run build:extension-zip  # Package browser extension
```

Production: `node dist/server/entry.mjs`

## Tech Stack

- **Astro 5** with Node adapter (SSR mode)
- **React 18** for interactive components
- **TypeScript** throughout
- **Tailwind CSS** with custom "Spillover" colors (not official Spotify branding)
- **Three.js** for visualizer component

## Architecture

### Authentication Flow
OAuth tokens stored in HTTP-only cookies. Flow: `/api/auth/login` → Spotify OAuth → `/api/auth/callback` → tokens in cookies. Token retrieval via `getTokenFromCookies()` / `getRefreshTokenFromCookies()`.

### API Pattern
All endpoints use `withApiHandler`, `withBodyApiHandler`, or `withPublicApiHandler` wrappers from `src/lib/api/`. These handle:
- Auth/token refresh
- Rate limiting (IP-based)
- Input validation
- Security headers
- Request logging

### Key Directories
- `src/pages/api/` - API routes (auth, search, like, playlists, import)
- `src/components/` - React (.tsx) and Astro (.astro) components
- `src/lib/` - Shared utilities (spotify.ts for API calls, api/ for middleware)
- `src/hooks/` - React hooks (audio player, keyboard shortcuts, search history)
- `extension/` - Chrome extension (Manifest v3)

### URL Import
`src/lib/url-parser.ts` parses track URLs, `src/lib/playlist-parser.ts` parses playlist URLs. Supported platforms: YouTube, YouTube Music, SoundCloud, Spotify, Deezer, Apple Music, Bandcamp, Tidal, Amazon Music, Mixcloud, Beatport.

### Rate Limits (per minute)
- Search: 60
- Like/Playlist: 30
- Now Playing: 120
- Suggestions/Import: 30

## Environment Variables

```
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=http://127.0.0.1:4321/api/auth/callback
PUBLIC_POSTHOG_KEY=        # optional
PUBLIC_POSTHOG_HOST=       # optional
```

## Component Conventions

- `.tsx` files are client-side React components
- `.astro` files are server-rendered
- SearchApp.tsx is the main interactive UI
- Custom hooks in `src/hooks/` for reusable logic


## Coding Standards

Follow DRY, SOLID priciples, Code should always be readable and clearly understandable for future developers.

- For typescript/javascript please follow - https://github.com/diet103/claude-code-infrastructure-showcase/blob/main/.claude/skills/frontend-dev-guidelines/resources/typescript-standards.md?plain=1
- Astro should always follow - https://github.com/withastro/astro/blob/main/STYLE_GUIDE.md

### General standards
- keep code stinks down to a minimum
- don't overuse if statements
- don't overuse ternary statments
- don't over bloat code files if good clear speration can happen please do so
