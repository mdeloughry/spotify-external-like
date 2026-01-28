import { useState, useEffect, useRef, useCallback } from 'react';
import type { SpotifyPlaylist, SpotifyTrack } from '../lib/spotify';

interface PlaylistSelectorProps {
  track: SpotifyTrack;
  onClose: () => void;
  onAdd: (playlistId: string, trackUri: string) => Promise<void>;
}

export default function PlaylistSelector({ track, onClose, onAdd }: PlaylistSelectorProps) {
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [addedTo, setAddedTo] = useState<Set<string>>(new Set());

  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

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
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load playlists');
      } finally {
        setIsLoading(false);
      }
    }

    fetchPlaylists();
  }, []);

  const handleAdd = async (playlistId: string) => {
    setAddingTo(playlistId);
    try {
      await onAdd(playlistId, track.uri);
      setAddedTo((prev) => new Set([...prev, playlistId]));
    } catch (err) {
      console.error('Failed to add to playlist:', err);
    } finally {
      setAddingTo(null);
    }
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
        <div className="p-4 border-b border-spotify-gray/30 flex items-center justify-between">
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
          ) : (
            <ul className="p-2" role="list" aria-label="Your playlists">
              {playlists.map((playlist) => {
                const isAdded = addedTo.has(playlist.id);
                const isAdding = addingTo === playlist.id;
                const playlistImage = playlist.images[0]?.url;

                return (
                  <li key={playlist.id}>
                    <button
                      onClick={() => !isAdded && handleAdd(playlist.id)}
                      disabled={isAdding || isAdded}
                      aria-label={isAdded ? `Already added to ${playlist.name}` : `Add to ${playlist.name}`}
                      aria-busy={isAdding}
                      className={`w-full flex items-center gap-3 p-3 min-h-[56px] rounded-md transition-colors ${
                        isAdded
                          ? 'bg-spotify-green/10 cursor-default'
                          : 'hover:bg-spotify-gray/20'
                      } disabled:opacity-70`}
                    >
                      {/* Playlist Image */}
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

                      {/* Playlist Info */}
                      <div className="flex-grow text-left min-w-0">
                        <p className="font-medium text-white truncate">{playlist.name}</p>
                        <p className="text-sm text-spotify-lightgray">
                          {playlist.tracks.total} tracks
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
