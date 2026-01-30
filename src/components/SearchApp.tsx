import { useState, useCallback, useRef, useEffect } from 'react';
import SearchBar from './SearchBar';
import TrackList from './TrackList';
import PlaylistSelector from './PlaylistSelector';
import NowPlayingBar from './NowPlayingBar';
import RecentActivity from './RecentActivity';
import SpotifyNowPlaying from './SpotifyNowPlaying';
import SidebarRecommendations from './SidebarRecommendations';
import type { SpotifyTrack } from '../lib/spotify';
import type { TrackWithLiked } from '../lib/api-client';
import { parseTrackUrl } from '../lib/url-parser';
import { parsePlaylistUrl, isTextTrackList } from '../lib/playlist-parser';
import { useSearchHistory, useAudioPlayer, useKeyboardShortcuts, shortcutPresets } from '../hooks';
import { UI } from '../lib/constants';

const PLATFORM_NAMES: Record<string, string> = {
  'youtube': 'YouTube',
  'soundcloud': 'SoundCloud',
  'spotify': 'Spotify',
  'deezer': 'Deezer',
  'apple-music': 'Apple Music',
  'bandcamp': 'Bandcamp',
  'tidal': 'Tidal',
  'amazon-music': 'Amazon Music',
  'mixcloud': 'Mixcloud',
  'beatport': 'Beatport',
  'text': 'Text Import',
};

/** Props for the main search application component */
interface SearchAppProps {
  /** Initial search query to populate on mount */
  initialQuery?: string;
}

/** Represents a recent user action for the activity feed */
interface RecentAction {
  /** The track that was acted upon */
  track: SpotifyTrack;
  /** Type of action performed */
  action: 'liked' | 'added_to_playlist';
  /** Name of playlist if action was adding to playlist */
  playlistName?: string;
  /** When the action occurred */
  timestamp: Date;
}

/** Result summary from importing an external playlist */
interface PlaylistImportResult {
  /** Source platform (youtube, soundcloud, etc.) */
  platform: string;
  /** Import statistics */
  summary: {
    total: number;
    found: number;
    notFound: number;
  };
}

/** Individual track result from playlist import */
interface ImportedTrackResult {
  /** Whether the track was found on Spotify */
  status: 'found' | 'not_found';
  /** Matched Spotify track, null if not found */
  spotifyTrack: TrackWithLiked | null;
  /** Original track title from source platform */
  originalTitle: string;
  /** Original artist name from source platform */
  originalArtist?: string;
}

export default function SearchApp({ initialQuery }: SearchAppProps) {
  const [tracks, setTracks] = useState<TrackWithLiked[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(null);
  const [recentActions, setRecentActions] = useState<RecentAction[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [urlImportSource, setUrlImportSource] = useState<string | null>(null);
  const [spotifyCurrentTrack, setSpotifyCurrentTrack] = useState<SpotifyTrack | null>(null);
  const [announcement, setAnnouncement] = useState<string>('');
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [playlistImport, setPlaylistImport] = useState<PlaylistImportResult | null>(null);
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  /** Announces messages to screen readers */
  const announce = (message: string): void => {
    setAnnouncement('');
    // Small delay to ensure the announcement is read
    setTimeout(() => setAnnouncement(message), 100);
  };

  // Use custom hooks for search history and audio player (DRY principle)
  const { history: searchHistory, addToHistory, clearHistory: clearSearchHistory } = useSearchHistory();
  const {
    playingTrackId,
    playingTrack,
    isPlaying,
    toggle: toggleAudio,
    stop: stopAudio,
    audioRef,
  } = useAudioPlayer();

  const handleLikeToggle = useCallback(async (trackId: string, shouldLike: boolean) => {
    const method = shouldLike ? 'POST' : 'DELETE';
    const response = await fetch('/api/like', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackId }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to update like status');
    }

    // Update local state
    setTracks((prev) =>
      prev.map((track) =>
        track.id === trackId ? { ...track, isLiked: shouldLike } : track
      )
    );

    // Add to recent actions if liked
    if (!shouldLike) return;

    setTracks((currentTracks) => {
      const likedTrack = currentTracks.find((t) => t.id === trackId);
      if (!likedTrack) return currentTracks;

      setRecentActions((prev) => [
        { track: likedTrack, action: 'liked', timestamp: new Date() },
        ...prev.slice(0, UI.MAX_RECENT_ACTIONS - 1),
      ]);
      return currentTracks;
    });
  }, []);

  const handleSearch = useCallback(async (query: string) => {
    // Stop any playing audio when searching
    stopAudio();

    setShowHistory(false);
    setIsLoading(true);
    setError(null);
    setHasSearched(true);
    setUrlImportSource(null);
    setSearchSuggestions([]);
    setPlaylistImport(null);

    // Check if query is a text track list (multi-line or "Artist - Title" format)
    const isTextList = isTextTrackList(query);

    // Check if query is a playlist URL first
    const playlistParsed = parsePlaylistUrl(query);

    // Check if query is a track URL
    const urlParsed = parseTrackUrl(query);

    try {
      let data;

      if (isTextList || playlistParsed) {
        // Handle playlist import
        const response = await fetch('/api/import-playlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: query }),
        });
        data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Playlist import failed');
        }

        // Extract found tracks
        const foundTracks = (data.tracks as ImportedTrackResult[])
          .filter((t) => t.status === 'found' && t.spotifyTrack !== null)
          .map((t) => t.spotifyTrack as TrackWithLiked);

        setTracks(foundTracks);
        setUrlImportSource(data.platform);
        setPlaylistImport({
          platform: data.platform,
          summary: data.summary,
        });

        announce(`Imported playlist: ${data.summary.found} of ${data.summary.total} tracks found`);
      } else if (urlParsed) {
        // Handle single track URL import
        const response = await fetch('/api/import-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: query }),
        });
        data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Import failed');
        }

        setUrlImportSource(data.source);
        if (data.searchQuery) {
          // Add the extracted search query to history instead of the URL
          addToHistory(data.searchQuery);
        }
        setTracks(data.tracks);
        // Announce results to screen readers
        if (data.tracks.length === 0) {
          announce('No tracks found');
        } else if (data.tracks.length === 1) {
          announce('Found 1 track');
        } else {
          announce(`Found ${data.tracks.length} tracks`);
        }
      } else {
        // Regular search
        addToHistory(query);

        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Search failed');
        }

        setTracks(data.tracks);
        // Store search suggestions if available
        if (data.suggestions && data.suggestions.length > 0) {
          setSearchSuggestions(data.suggestions);
        }
        // Announce results to screen readers
        if (data.tracks.length === 0) {
          announce('No tracks found');
        } else if (data.tracks.length === 1) {
          announce('Found 1 track');
        } else {
          announce(`Found ${data.tracks.length} tracks`);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      setError(errorMessage);
      setTracks([]);
      announce(`Error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [stopAudio, addToHistory]);

  // Handle initial query from URL params (e.g., from browser extension)
  const initialQueryProcessed = useRef(false);
  useEffect(() => {
    if (initialQuery && !initialQueryProcessed.current) {
      initialQueryProcessed.current = true;
      handleSearch(initialQuery);
    }
  }, [initialQuery, handleSearch]);

  // Check for active Spotify playback session
  useEffect(() => {
    const checkPlaybackState = async (): Promise<void> => {
      try {
        const response = await fetch('/api/player/state');
        if (response.ok) {
          const data = await response.json();
          setHasActiveSession(data.hasActiveSession);
        }
      } catch {
        setHasActiveSession(false);
      }
    };

    // Check immediately and then every 30 seconds
    checkPlaybackState();
    const interval = setInterval(checkPlaybackState, 30000);
    return () => clearInterval(interval);
  }, []);

  // Handlers for Spotify playback actions
  const handleAddToQueue = useCallback(async (track: SpotifyTrack): Promise<void> => {
    const response = await fetch('/api/player/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackUri: track.uri }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to add to queue');
    }

    announce(`Added ${track.name} to queue`);
  }, []);

  const handlePlayNow = useCallback(async (track: SpotifyTrack): Promise<void> => {
    const response = await fetch('/api/player/play', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackUri: track.uri }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to play track');
    }

    announce(`Now playing ${track.name}`);
  }, []);

// Use keyboard shortcuts hook (DRY principle - replaces manual keydown handler)
  useKeyboardShortcuts([
    shortcutPresets.focusSearch(() => searchInputRef.current?.focus()),
    shortcutPresets.escape((event) => {
      // Blur input if focused
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        target.blur();
      }
      stopAudio();
      setShowHistory(false);
    }),
    shortcutPresets.playPause(() => {
      if (playingTrack && audioRef.current) {
        if (isPlaying) {
          audioRef.current.pause();
        } else {
          audioRef.current.play();
        }
      }
    }),
    shortcutPresets.like(() => {
      if (tracks.length > 0 && !tracks[0].isLiked) {
        handleLikeToggle(tracks[0].id, true);
      }
    }),
    shortcutPresets.likeUpper(() => {
      if (tracks.length > 0 && !tracks[0].isLiked) {
        handleLikeToggle(tracks[0].id, true);
      }
    }),
  ]);

  const handlePlayPause = useCallback(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  }, [isPlaying, audioRef]);

  const handleAddToPlaylist = useCallback(async (playlistId: string, trackUri: string, playlistName?: string) => {
    const response = await fetch('/api/playlist/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playlistId, trackUri }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to add to playlist');
    }

    // Add to recent actions and announce
    if (selectedTrack) {
      setRecentActions((prev) => [
        { track: selectedTrack, action: 'added_to_playlist', playlistName, timestamp: new Date() },
        ...prev.slice(0, UI.MAX_RECENT_ACTIONS - 1),
      ]);
      announce(`${selectedTrack.name} added to ${playlistName || 'playlist'}`);
    }
  }, [selectedTrack]);

  return (
    <div className="relative flex flex-col space-y-6 rounded-3xl border border-white/8 bg-black/50 backdrop-blur-2xl px-5 py-6 sm:px-8 sm:py-7 shadow-[0_26px_90px_rgba(0,0,0,0.85)] max-h-[calc(100vh-7rem)] overflow-hidden">
      {/* Live region for screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      {/* Search with history dropdown */}
      <div className="relative">
        <SearchBar
          onSearch={handleSearch}
          isLoading={isLoading}
          inputRef={searchInputRef}
          onFocus={() => setShowHistory(true)}
          onBlur={() => setTimeout(() => setShowHistory(false), 200)}
        />

        {/* Search History Dropdown */}
        {showHistory && searchHistory.length > 0 && (
          <div
            role="listbox"
            aria-label="Recent searches"
            className="absolute top-full left-0 right-0 mt-2 bg-spotify-gray/95 backdrop-blur-lg rounded-lg shadow-xl border border-spotify-gray/50 max-w-2xl mx-auto overflow-hidden z-40"
          >
            <div className="flex items-center justify-between px-4 py-2 border-b border-spotify-gray/50">
              <span id="search-history-label" className="text-xs text-spotify-lightgray">Recent searches</span>
              <button
                onClick={clearSearchHistory}
                className="text-xs text-spotify-lightgray hover:text-white"
                aria-label="Clear search history"
              >
                Clear
              </button>
            </div>
            {searchHistory.map((query, index) => (
              <button
                key={index}
                role="option"
                aria-selected="false"
                onClick={() => handleSearch(query)}
                className="w-full px-4 py-2 text-left text-white hover:bg-spotify-green/20 flex items-center gap-3"
              >
                <svg className="w-4 h-4 text-spotify-lightgray" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {query}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="hidden sm:flex justify-center gap-4 text-xs text-spotify-lightgray/85">
        <span><kbd className="px-1.5 py-0.5 bg-spotify-gray/50 rounded text-[0.7rem]">/</kbd> Search</span>
        <span><kbd className="px-1.5 py-0.5 bg-spotify-gray/50 rounded text-[0.7rem]">L</kbd> Like first</span>
      </div>

      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="text-center py-4 text-red-400"
        >
          <p>{error}</p>
        </div>
      )}

      {/* Playlist Import indicator */}
      {playlistImport && !error && (
        <div className="bg-spotify-green/10 border border-spotify-green/20 rounded-lg p-4">
          <div className="flex items-center gap-2 text-sm">
            <svg className="w-5 h-5 text-spotify-green" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
            </svg>
            <span className="font-medium text-white">
              Playlist imported from {PLATFORM_NAMES[playlistImport.platform] || playlistImport.platform}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-4 text-sm text-spotify-lightgray">
            <span className="flex items-center gap-1">
              <span className="text-spotify-green font-medium">{playlistImport.summary.found}</span> found
            </span>
            {playlistImport.summary.notFound > 0 && (
              <span className="flex items-center gap-1">
                <span className="text-amber-400 font-medium">{playlistImport.summary.notFound}</span> not found
              </span>
            )}
            <span className="text-spotify-lightgray/60">
              ({playlistImport.summary.total} total)
            </span>
          </div>
        </div>
      )}

      {/* URL Import indicator (single track) */}
      {urlImportSource && !playlistImport && !error && (
        <div className="flex items-center justify-center gap-2 text-sm text-spotify-lightgray">
          <svg className="w-4 h-4 text-spotify-green" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
          </svg>
          <span>Imported from {PLATFORM_NAMES[urlImportSource] || urlImportSource}</span>
        </div>
      )}

      {/* Search suggestions ("Did you mean?") */}
      {searchSuggestions.length > 0 && !isLoading && (
        <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
          <span className="text-spotify-lightgray">Try:</span>
          {searchSuggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSearch(suggestion)}
              className="px-3 py-1 rounded-full bg-spotify-gray/30 text-white hover:bg-spotify-green/20 hover:text-spotify-green transition-colors border border-white/10"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Spotify Now Playing */}
      <SpotifyNowPlaying
        onTrackSelect={setSelectedTrack}
        onTrackChange={setSpotifyCurrentTrack}
      />

{/* Main content area fills remaining card height and scrolls internally */}
      <div className="flex-1 min-h-0">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start h-full min-h-0">
          {/* Track list column (scrollable) */}
          <div className="flex-1 min-h-0">
            <div className="h-full min-h-0 overflow-y-auto pr-1 pb-28">
              {hasSearched && !isLoading && !error && (
                <TrackList
                  tracks={tracks}
                  onLikeToggle={handleLikeToggle}
                  onAddToPlaylist={setSelectedTrack}
                  playingTrackId={playingTrackId}
                  onPlayToggle={toggleAudio}
                  hasActiveSession={hasActiveSession}
                  onAddToQueue={handleAddToQueue}
                  onPlayNow={handlePlayNow}
                />
              )}

              {!hasSearched && (
                <div className="text-center py-12 text-spotify-lightgray">
                  <p>Search for a track to get started</p>
                  <p className="text-sm mt-2">
                    Press <kbd className="px-1.5 py-0.5 bg-spotify-gray/50 rounded">/</kbd> to focus search
                  </p>
                  <p className="text-sm mt-4 text-spotify-lightgray/60">
                    Tip: Paste a YouTube, SoundCloud, Spotify, or most other music links to find them on
                    Spotify
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar (sticks within card, does not scroll independently) */}
          {(recentActions.length > 0 || spotifyCurrentTrack) && (
            <div className="mt-4 flex flex-col gap-4 lg:mt-0 lg:w-80 flex-shrink-0">
              {/* Recent Activity */}
              {recentActions.length > 0 && (
                <RecentActivity actions={recentActions} onClear={() => setRecentActions([])} />
              )}

              {/* Recommendations based on Spotify now playing */}
              {spotifyCurrentTrack && (
                <SidebarRecommendations
                  currentTrack={spotifyCurrentTrack}
                  onTrackSelect={setSelectedTrack}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {selectedTrack && (
        <PlaylistSelector
          track={selectedTrack}
          onClose={() => setSelectedTrack(null)}
          onAdd={handleAddToPlaylist}
        />
      )}

      {/* Now Playing Bar */}
      <NowPlayingBar
        track={playingTrack}
        isPlaying={isPlaying}
        onPlayPause={handlePlayPause}
        onStop={stopAudio}
        audioRef={audioRef}
      />
    </div>
  );
}
