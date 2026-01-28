import { useState, useEffect } from 'react';
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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-spotify-black border border-spotify-gray/30 rounded-lg w-full max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-spotify-gray/30 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-white">Add to playlist</h2>
            <p className="text-sm text-spotify-lightgray truncate">{track.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-spotify-lightgray hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-spotify-green border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-400">
              <p>{error}</p>
            </div>
          ) : playlists.length === 0 ? (
            <div className="text-center py-12 text-spotify-lightgray">
              <p>No playlists found</p>
            </div>
          ) : (
            <div className="p-2">
              {playlists.map((playlist) => {
                const isAdded = addedTo.has(playlist.id);
                const isAdding = addingTo === playlist.id;
                const playlistImage = playlist.images[0]?.url;

                return (
                  <button
                    key={playlist.id}
                    onClick={() => !isAdded && handleAdd(playlist.id)}
                    disabled={isAdding || isAdded}
                    className={`w-full flex items-center gap-3 p-2 rounded-md transition-colors ${
                      isAdded
                        ? 'bg-spotify-green/10 cursor-default'
                        : 'hover:bg-spotify-gray/20'
                    } disabled:opacity-70`}
                  >
                    {/* Playlist Image */}
                    {playlistImage ? (
                      <img
                        src={playlistImage}
                        alt={playlist.name}
                        className="w-10 h-10 rounded"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-spotify-gray flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-spotify-lightgray"
                          fill="currentColor"
                          viewBox="0 0 24 24"
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
                      <div className="w-5 h-5 border-2 border-spotify-green border-t-transparent rounded-full animate-spin" />
                    ) : isAdded ? (
                      <svg
                        className="w-5 h-5 text-spotify-green"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                      </svg>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
