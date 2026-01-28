# Spillover - Browser Extension

A Chrome extension that lets you right-click any text or link to search and save it to your Spotify library.

## Features

- **Right-click search**: Select any text on a webpage, right-click, and choose "Search on Spillover"
- **Link import**: Right-click any YouTube or SoundCloud link to import it directly
- **Quick search**: Click the extension icon to quickly search for tracks
- **Configurable**: Set a custom app URL if you're self-hosting

## Installation

### From source (Developer mode)

1. Generate PNG icons from the SVG:
   - Use an online converter or image editor to create `icon16.png`, `icon48.png`, and `icon128.png` from `icons/icon.svg`
   - Place them in the `icons/` folder

2. Open Chrome and go to `chrome://extensions/`

3. Enable "Developer mode" in the top right

4. Click "Load unpacked" and select this `extension` folder

5. The extension icon should appear in your toolbar

## Usage

### Right-click menu
1. Select any text on a webpage (like a song name)
2. Right-click and choose "Search on Spotify External Like"
3. The app will open with your search results

### Import from URL
1. Right-click any YouTube or SoundCloud link
2. Choose "Import to Spotify External Like"
3. The app will extract the track info and search Spotify

### Quick search
1. Click the extension icon in your toolbar
2. Type a search query
3. Press Enter or click "Go"

## Configuration

Click the extension icon to access settings:
- **App URL**: Set the URL where your Spillover app is running (default: `http://127.0.0.1:4321`)

## Requirements

- The Spillover web app must be running
- You must be logged in to the web app
