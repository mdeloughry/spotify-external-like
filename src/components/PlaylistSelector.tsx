import { useState, useEffect, useRef, useCallback } from 'react';
import type { SpotifyPlaylist, SpotifyTrack } from '../lib/spotify';
import { captureError } from '../lib/error-tracking';

/** Props for the playlist selector modal */
interface PlaylistSelectorProps {
  /** Track to be added to a playlist */
  track: SpotifyTrack;
  /** Callback to close the modal */
  onClose: () => void;
  /** Callback to add track to selected playlist */
  onAdd: (playlistId: string, trackUri: string) => Promise<void>;
}

export default function PlaylistSelector({ track, onClose, onAdd }: PlaylistSelectorProps) {
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [addedTo, setAddedTo] = useState<Set<string>>(new Set());
  const [duplicates, setDuplicates] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');

  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  // Filter playlists based on search query
  const filteredPlaylists = playlists.filter(playlist =>
    playlist.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle escape key and focus trap
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }

    // Focus trap
    if (e.key === 'Tab' && dialogRef.current) {
      const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  }, [onClose]);

  useEffect(() => {
    // Store previously focused element
    previouslyFocusedElement.current = document.activeElement as HTMLElement;

    // Focus the close button when modal opens
    closeButtonRef.current?.focus();

    // Add keyboard listener
    document.addEventListener('keydown', handleKeyDown);

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      // Restore focus when modal closes
      previouslyFocusedElement.current?.focus();
    };
  }, [handleKeyDown]);

  useEffect(() => {
    async function fetchPlaylists() {
      try {
        const response = await fetch('/api/playlists');
        if (!response.ok) {
          throw new Error('Failed to fetch playlists');
        }
        const data = await response.json();
        setPlaylists(data.playlists);

        // Check for duplicates after playlists are loaded
        if (data.playlists.length > 0) {
          const playlistIds = data.playlists.map((p: SpotifyPlaylist) => p.id);
          try {
            const dupResponse = await fetch('/api/playlist/check-duplicates', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ trackId: track.id, playlistIds }),
            });
            if (dupResponse.ok) {
              const dupData = await dupResponse.json();
              setDuplicates(dupData.duplicates);
            }
          } catch {
            // Silently fail duplicate check - not critical
          }
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        captureError(error, {
          action: 'fetch_playlists',
          trackId: track.id,
        });
        setError(error.message || 'Failed to load playlists');
      } finally {
        setIsLoading(false);
      }
    }

    fetchPlaylists();
  }, [track.id]);

  const handleAdd = async (playlistId: string): Promise<void> => {
    setAddingTo(playlistId);
    try {
      await onAdd(playlistId, track.uri);
      setAddedTo((prev) => new Set([...prev, playlistId]));
    } catch (err) {
      captureError(err instanceof Error ? err : new Error(String(err)), {
        action: 'add_to_playlist',
        playlistId,
        trackId: track.id,
        trackName: track.name,
      });
    } finally {
      setAddingTo(null);
    }
  };

  const getButtonAriaLabel = (playlistName: string, isAdded: boolean, isDuplicate: boolean): string => {
    if (isAdded) return `Already added to ${playlistName}`;
    if (isDuplicate) return `Add to ${playlistName} (already in playlist)`;
    return `Add to ${playlistName}`;
  };

  const getButtonStateClass = (isAdded: boolean, isDuplicate: boolean): string => {
    if (isAdded) return 'bg-spotify-green/10 cursor-default';
    if (isDuplicate) return 'bg-amber-500/5 hover:bg-amber-500/10';
    return 'hover:bg-spotify-gray/20';
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="playlist-dialog-title"
      aria-describedby="playlist-dialog-description"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        className="bg-spotify-black border border-spotify-gray/30 rounded-lg w-full max-w-md max-h-[80vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-4 border-b border-spotify-gray/30">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 id="playlist-dialog-title" className="font-bold text-white">Add to playlist</h2>
              <p id="playlist-dialog-description" className="text-sm text-spotify-lightgray truncate">{track.name}</p>
            </div>
            <button
              ref={closeButtonRef}
              onClick={onClose}
              className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-spotify-lightgray hover:text-white transition-colors"
              aria-label="Close dialog"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          {/* Search Input */}
          {playlists.length > 5 && (
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search playlists..."
                className="w-full px-3 py-2 pl-9 text-sm bg-spotify-gray/30 border border-spotify-gray/50 rounded-lg text-white placeholder-spotify-lightgray/60 focus:outline-none focus:border-spotify-green/50 focus:ring-1 focus:ring-spotify-green/20"
                aria-label="Search playlists"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-spotify-lightgray/60"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-spotify-lightgray/60 hover:text-white"
                  aria-label="Clear search"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Playlist List */}
        <div className="overflow-y-auto flex-grow">
          {isLoading ? (
            <div className="flex items-center justify-center py-12" role="status" aria-label="Loading playlists">
              <div className="w-8 h-8 border-2 border-spotify-green border-t-transparent rounded-full animate-spin" aria-hidden="true" />
              <span className="sr-only">Loading playlists...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-400" role="alert">
              <p>{error}</p>
            </div>
          ) : playlists.length === 0 ? (
            <div className="text-center py-12 text-spotify-lightgray" role="status">
              <p>No playlists found</p>
            </div>
          ) : filteredPlaylists.length === 0 ? (
            <div className="text-center py-8 text-spotify-lightgray" role="status">
              <p className="text-sm">No playlists match "{searchQuery}"</p>
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 text-xs text-spotify-green hover:underline"
              >
                Clear search
              </button>
            </div>
          ) : (
            <ul className="p-2" role="list" aria-label="Your playlists">
              {filteredPlaylists.map((playlist) => {
                const isAdded = addedTo.has(playlist.id);
                const isAdding = addingTo === playlist.id;
                const isDuplicate = duplicates[playlist.id] === true;
                const playlistImage = playlist.images[0]?.url;

                return (
                  <li key={playlist.id}>
                    <button
                      onClick={() => !isAdded && handleAdd(playlist.id)}
                      disabled={isAdding || isAdded}
                      aria-label={getButtonAriaLabel(playlist.name, isAdded, isDuplicate)}
                      aria-busy={isAdding}
                      className={`w-full flex items-center gap-3 p-3 min-h-[56px] rounded-md transition-colors ${getButtonStateClass(isAdded, isDuplicate)} disabled:opacity-70`}
                    >
                      {/* Playlist Image */}
                      <div className="relative">
                        {playlistImage ? (
                          <img
                            src={playlistImage}
                            alt=""
                            className="w-10 h-10 rounded"
                            aria-hidden="true"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-spotify-gray flex items-center justify-center" aria-hidden="true">
                            <svg
                              className="w-5 h-5 text-spotify-lightgray"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                              aria-hidden="true"
                            >
                              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                            </svg>
                          </div>
                        )}
                        {/* Duplicate indicator badge */}
                        {isDuplicate && !isAdded && (
                          <div
                            className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center"
                            title="Already in playlist"
                          >
                            <svg className="w-2.5 h-2.5 text-black" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Playlist Info */}
                      <div className="flex-grow text-left min-w-0">
                        <p className="font-medium text-white truncate">{playlist.name}</p>
                        <p className="text-sm text-spotify-lightgray">
                          {playlist.tracks.total} tracks
                          {isDuplicate && !isAdded && (
                            <span className="text-amber-400 ml-1">· already added</span>
                          )}
                        </p>
                      </div>

                      {/* Status */}
                      {isAdding ? (
                        <div className="w-5 h-5 border-2 border-spotify-green border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                      ) : isAdded ? (
                        <svg
                          className="w-5 h-5 text-spotify-green"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                        </svg>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
