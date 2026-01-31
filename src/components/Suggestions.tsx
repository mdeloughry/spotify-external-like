import { useState, useEffect } from 'react';
import type { SpotifyTrack } from '../lib/spotify';
import type { TrackWithLiked } from '../lib/api-client';
import { formatDuration, getAlbumImageUrl } from '../lib/spotify';
import { captureError } from '../lib/error-tracking';
import { UI } from '../lib/constants';

/** Props for the suggestions/recommendations component */
interface SuggestionsProps {
  /** Track IDs to use as seeds for recommendations */
  seedTrackIds: string[];
  /** Callback to toggle like status */
  onLikeToggle: (trackId: string, isLiked: boolean) => Promise<void>;
  /** Callback to open playlist selector */
  onAddToPlaylist: (track: SpotifyTrack) => void;
}

export default function Suggestions({
  seedTrackIds,
  onLikeToggle,
  onAddToPlaylist,
}: SuggestionsProps) {
  const [tracks, setTracks] = useState<TrackWithLiked[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const seedsKey = seedTrackIds.join(',');

  useEffect(() => {
    if (seedTrackIds.length === 0) {
      setTracks([]);
      return;
    }

    const fetchSuggestions = async (): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/suggestions?seeds=${seedTrackIds.join(',')}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to get suggestions');
        }

        setTracks(data.tracks);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        captureError(error, {
          action: 'fetch_suggestions',
          seedTrackIds,
        });
        setError(error.message || 'Failed to load suggestions');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();
  }, [seedsKey]);

  const handleLike = async (track: TrackWithLiked): Promise<void> => {
    try {
      await onLikeToggle(track.id, !track.isLiked);
      setTracks((prev) =>
        prev.map((t) => (t.id === track.id ? { ...t, isLiked: !t.isLiked } : t))
      );
    } catch (err) {
      captureError(err instanceof Error ? err : new Error(String(err)), {
        action: 'like_toggle_suggestion',
        trackId: track.id,
        trackName: track.name,
      });
    }
  };

  if (seedTrackIds.length === 0) return null;

  return (
    <div className="mt-8 bg-gradient-to-r from-spotify-green/10 to-transparent rounded-lg border border-spotify-green/20 overflow-hidden">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-spotify-green/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-spotify-green" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
          <span className="font-semibold text-white">You might also like</span>
          {isLoading && (
            <div className="w-4 h-4 border-2 border-spotify-green border-t-transparent rounded-full animate-spin" />
          )}
        </div>
        <svg
          className={`w-5 h-5 text-spotify-lightgray transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {!isCollapsed && (
        <div className="px-4 pb-4">
          {error && (
            <p className="text-red-400 text-sm py-2">{error}</p>
          )}

          {!isLoading && !error && tracks.length === 0 && (
            <p className="text-spotify-lightgray text-sm py-2">No suggestions available</p>
          )}

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {tracks.slice(0, UI.MAX_SUGGESTIONS_GRID).map((track) => {
              const albumImage = getAlbumImageUrl(track.album, 'medium');

              return (
                <div
                  key={track.id}
                  className="group bg-spotify-gray/20 rounded-lg p-3 hover:bg-spotify-gray/30 transition-colors"
                >
                  {/* Album art */}
                  <div className="mb-3">
                    {albumImage ? (
                      <img
                        src={albumImage}
                        alt={track.album.name}
                        className="w-full aspect-square rounded shadow-lg"
                      />
                    ) : (
                      <div className="w-full aspect-square rounded bg-spotify-gray flex items-center justify-center">
                        <svg className="w-8 h-8 text-spotify-lightgray" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Track info */}
                  <a
                    href={track.external_urls.spotify}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-white text-sm truncate block hover:underline"
                  >
                    {track.name}
                  </a>
                  <p className="text-xs text-spotify-lightgray truncate">
                    {track.artists.map((a) => a.name).join(', ')}
                  </p>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => handleLike(track)}
                      className={`p-1.5 rounded-full transition-colors ${
                        track.isLiked
                          ? 'text-spotify-green'
                          : 'text-spotify-lightgray hover:text-white'
                      }`}
                    >
                      <svg
                        className="w-4 h-4"
                        fill={track.isLiked ? 'currentColor' : 'none'}
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => onAddToPlaylist(track)}
                      className="p-1.5 rounded-full text-spotify-lightgray hover:text-white transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </button>
                    <span className="text-xs text-spotify-lightgray ml-auto">
                      {formatDuration(track.duration_ms)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
