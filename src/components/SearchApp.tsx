import { useState, useCallback, useRef, useEffect } from 'react';
import SearchBar from './SearchBar';
import TrackList from './TrackList';
import PlaylistSelector from './PlaylistSelector';
import NowPlayingBar from './NowPlayingBar';
import RecentActivity from './RecentActivity';
import SpotifyNowPlaying from './SpotifyNowPlaying';
import SidebarRecommendations from './SidebarRecommendations';
import type { SpotifyTrack } from '../lib/spotify';
import { parseTrackUrl } from '../lib/spotify';

type TrackWithLiked = SpotifyTrack & { isLiked: boolean };

interface SearchAppProps {
  initialQuery?: string;
}

interface RecentAction {
  track: SpotifyTrack;
  action: 'liked' | 'added_to_playlist';
  playlistName?: string;
  timestamp: Date;
}

const SEARCH_HISTORY_KEY = 'spotify_search_history';
const MAX_HISTORY = 10;

function getSearchHistory(): string[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
  return stored ? JSON.parse(stored) : [];
}

function addToSearchHistory(query: string) {
  const history = getSearchHistory();
  const filtered = history.filter((h) => h.toLowerCase() !== query.toLowerCase());
  const updated = [query, ...filtered].slice(0, MAX_HISTORY);
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
  return updated;
}

export default function SearchApp({ initialQuery }: SearchAppProps) {
  const [tracks, setTracks] = useState<TrackWithLiked[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(null);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [playingTrack, setPlayingTrack] = useState<SpotifyTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recentActions, setRecentActions] = useState<RecentAction[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [urlImportSource, setUrlImportSource] = useState<string | null>(null);
  const [spotifyCurrentTrack, setSpotifyCurrentTrack] = useState<SpotifyTrack | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Load search history on mount
  useEffect(() => {
    setSearchHistory(getSearchHistory());
  }, []);

  // Handle initial query from URL params (e.g., from browser extension)
  const initialQueryProcessed = useRef(false);
  useEffect(() => {
    if (initialQuery && !initialQueryProcessed.current) {
      initialQueryProcessed.current = true;
      handleSearch(initialQuery);
    }
  }, [initialQuery]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        // Allow Escape to blur input
        if (e.key === 'Escape') {
          (e.target as HTMLElement).blur();
          setShowHistory(false);
        }
        return;
      }

      switch (e.key) {
        case '/':
          e.preventDefault();
          searchInputRef.current?.focus();
          break;
        case ' ':
          e.preventDefault();
          if (playingTrack) {
            handlePlayPause();
          }
          break;
        case 'Escape':
          if (audioRef.current) {
            audioRef.current.pause();
            setPlayingTrackId(null);
            setPlayingTrack(null);
            setIsPlaying(false);
          }
          setShowHistory(false);
          break;
        case 'l':
        case 'L':
          // Like first track
          if (tracks.length > 0 && !tracks[0].isLiked) {
            handleLikeToggle(tracks[0].id, true);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playingTrack, tracks]);

  const handlePlayPause = useCallback(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const handleStop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlayingTrackId(null);
    setPlayingTrack(null);
    setIsPlaying(false);
  }, []);

  const handlePlayToggle = useCallback((track: SpotifyTrack) => {
    if (!track.preview_url) return;

    // If this track is already playing, toggle pause
    if (playingTrackId === track.id) {
      handlePlayPause();
      return;
    }

    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
    }

    // Create new audio and play
    const audio = new Audio(track.preview_url);
    audio.volume = 0.5;
    audioRef.current = audio;

    audio.addEventListener('ended', () => {
      setPlayingTrackId(null);
      setPlayingTrack(null);
      setIsPlaying(false);
    });

    audio.addEventListener('pause', () => {
      setIsPlaying(false);
    });

    audio.addEventListener('play', () => {
      setIsPlaying(true);
    });

    audio.play().then(() => {
      setPlayingTrackId(track.id);
      setPlayingTrack(track);
      setIsPlaying(true);
    }).catch((err) => {
      console.error('Failed to play preview:', err);
      setPlayingTrackId(null);
      setPlayingTrack(null);
      setIsPlaying(false);
    });
  }, [playingTrackId, handlePlayPause]);

  const handleSearch = useCallback(async (query: string) => {
    // Stop any playing audio when searching
    if (audioRef.current) {
      audioRef.current.pause();
      setPlayingTrackId(null);
      setPlayingTrack(null);
      setIsPlaying(false);
    }

    setShowHistory(false);
    setIsLoading(true);
    setError(null);
    setHasSearched(true);
    setUrlImportSource(null);

    // Check if query is a URL
    const urlParsed = parseTrackUrl(query);

    try {
      let data;

      if (urlParsed) {
        // Handle URL import
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
          const updated = addToSearchHistory(data.searchQuery);
          setSearchHistory(updated);
        }
      } else {
        // Regular search
        const updated = addToSearchHistory(query);
        setSearchHistory(updated);

        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Search failed');
        }
      }

      setTracks(data.tracks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setTracks([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLikeToggle = async (trackId: string, shouldLike: boolean) => {
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
    if (shouldLike) {
      const likedTrack = tracks.find((t) => t.id === trackId);
      if (likedTrack) {
        setRecentActions((prev) => [
          { track: likedTrack, action: 'liked', timestamp: new Date() },
          ...prev.slice(0, 19),
        ]);
      }
    }
  };

  const handleAddToPlaylist = async (playlistId: string, trackUri: string, playlistName?: string) => {
    const response = await fetch('/api/playlist/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playlistId, trackUri }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to add to playlist');
    }

    // Add to recent actions
    if (selectedTrack) {
      setRecentActions((prev) => [
        { track: selectedTrack, action: 'added_to_playlist', playlistName, timestamp: new Date() },
        ...prev.slice(0, 19),
      ]);
    }
  };

  const clearHistory = () => {
    localStorage.removeItem(SEARCH_HISTORY_KEY);
    setSearchHistory([]);
  };

  return (
    <div className="relative space-y-6 pb-28 rounded-3xl border border-white/8 bg-black/50 backdrop-blur-2xl px-5 py-6 sm:px-8 sm:py-7 shadow-[0_26px_90px_rgba(0,0,0,0.85)]">
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
          <div className="absolute top-full left-0 right-0 mt-2 bg-spotify-gray/95 backdrop-blur-lg rounded-lg shadow-xl border border-spotify-gray/50 max-w-2xl mx-auto overflow-hidden z-40">
            <div className="flex items-center justify-between px-4 py-2 border-b border-spotify-gray/50">
              <span className="text-xs text-spotify-lightgray">Recent searches</span>
              <button
                onClick={clearHistory}
                className="text-xs text-spotify-lightgray hover:text-white"
              >
                Clear
              </button>
            </div>
            {searchHistory.map((query, index) => (
              <button
                key={index}
                onClick={() => handleSearch(query)}
                className="w-full px-4 py-2 text-left text-white hover:bg-spotify-green/20 flex items-center gap-3"
              >
                <svg className="w-4 h-4 text-spotify-lightgray" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <div className="text-center py-4 text-red-400">
          <p>{error}</p>
        </div>
      )}

      {/* URL Import indicator */}
      {urlImportSource && !error && (
        <div className="flex items-center justify-center gap-2 text-sm text-spotify-lightgray">
          <svg className="w-4 h-4 text-spotify-green" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
          </svg>
          <span>
            Imported from{" "}
            {urlImportSource === 'youtube'
              ? 'YouTube'
              : urlImportSource === 'soundcloud'
                ? 'SoundCloud'
                : urlImportSource === 'deezer'
                  ? 'Deezer'
                  : urlImportSource === 'apple-music'
                    ? 'Apple Music'
                    : urlImportSource === 'bandcamp'
                      ? 'Bandcamp'
                      : 'Spotify'}
          </span>
        </div>
      )}

      {/* Spotify Now Playing */}
      <SpotifyNowPlaying
        onTrackSelect={setSelectedTrack}
        onTrackChange={setSpotifyCurrentTrack}
      />

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        {/* Main content */}
        <div className="flex-1">
          {hasSearched && !isLoading && !error && (
            <TrackList
              tracks={tracks}
              onLikeToggle={handleLikeToggle}
              onAddToPlaylist={setSelectedTrack}
              playingTrackId={playingTrackId}
              onPlayToggle={handlePlayToggle}
            />
          )}

          {!hasSearched && (
            <div className="text-center py-12 text-spotify-lightgray">
              <p>Search for a track to get started</p>
              <p className="text-sm mt-2">Press <kbd className="px-1.5 py-0.5 bg-spotify-gray/50 rounded">/</kbd> to focus search</p>
              <p className="text-sm mt-4 text-spotify-lightgray/60">
                Tip: Paste a YouTube, SoundCloud, Spotify, or most other music links to find them on
                Spotify
              </p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        {(recentActions.length > 0 || spotifyCurrentTrack) && (
          <div className="mt-4 flex flex-col gap-4 lg:mt-0 lg:w-80">
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
        onStop={handleStop}
        audioRef={audioRef}
      />
    </div>
  );
}
