import { useState, useEffect, useCallback } from 'react';
import type { SpotifyTrack } from '../lib/spotify';
import type { TrackWithLiked } from '../lib/api-client';
import { getAlbumImageUrl } from '../lib/spotify';
import { UI } from '../lib/constants';

interface SidebarRecommendationsProps {
  currentTrack: SpotifyTrack | null;
  onTrackSelect?: (track: SpotifyTrack) => void;
}

export default function SidebarRecommendations({ currentTrack, onTrackSelect }: SidebarRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<TrackWithLiked[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastTrackId, setLastTrackId] = useState<string | null>(null);

  const fetchRecommendations = useCallback(async (trackId: string) => {
    if (trackId === lastTrackId) return;

    setIsLoading(true);
    setLastTrackId(trackId);

    try {
      const response = await fetch(`/api/suggestions?seeds=${trackId}`);
      if (response.ok) {
        const data = await response.json();
        setRecommendations(data.tracks || []);
      }
    } catch (err) {
      console.error('Failed to fetch recommendations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [lastTrackId]);

  useEffect(() => {
    if (currentTrack) {
      fetchRecommendations(currentTrack.id);
    } else {
      setRecommendations([]);
      setLastTrackId(null);
    }
  }, [currentTrack?.id, fetchRecommendations]);

  const handleLike = async (track: TrackWithLiked) => {
    const method = track.isLiked ? 'DELETE' : 'POST';
    try {
      const response = await fetch('/api/like', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId: track.id }),
      });

      if (response.ok) {
        setRecommendations((prev) =>
          prev.map((t) => (t.id === track.id ? { ...t, isLiked: !t.isLiked } : t))
        );
      }
    } catch (err) {
      console.error('Failed to toggle like:', err);
    }
  };

  if (!currentTrack) return null;

  return (
    <div className="w-full lg:w-72 flex-shrink-0">
      <div className="sticky top-4 bg-spotify-gray/20 rounded-lg border border-spotify-gray/30 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-spotify-gray/30">
          <svg className="w-4 h-4 text-spotify-green" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
          </svg>
          <h3 className="font-semibold text-white text-sm">You might like</h3>
          {isLoading && (
            <div className="w-3 h-3 border-2 border-spotify-green border-t-transparent rounded-full animate-spin ml-auto" />
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {recommendations.slice(0, UI.MAX_SUGGESTIONS_SIDEBAR).map((track) => {
            const albumImage = getAlbumImageUrl(track.album, 'small');

            return (
              <div
                key={track.id}
                className="flex items-center gap-3 px-4 py-2 hover:bg-spotify-gray/20 transition-colors group"
              >
                {albumImage && (
                  <img
                    src={albumImage}
                    alt={track.album.name}
                    className="w-10 h-10 rounded flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <a
                    href={track.external_urls.spotify}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-white truncate block hover:underline"
                  >
                    {track.name}
                  </a>
                  <p className="text-xs text-spotify-lightgray truncate">
                    {track.artists.map((a) => a.name).join(', ')}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleLike(track)}
                    className={`p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full transition-colors ${
                      track.isLiked ? 'text-spotify-green opacity-100' : 'text-spotify-lightgray hover:text-white'
                    }`}
                    title={track.isLiked ? 'Remove from Liked Songs' : 'Add to Liked Songs'}
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
                  {onTrackSelect && (
                    <button
                      onClick={() => onTrackSelect(track)}
                      className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full text-spotify-lightgray hover:text-white transition-colors"
                      title="Add to Playlist"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {!isLoading && recommendations.length === 0 && (
          <div className="px-4 py-6 text-center text-spotify-lightgray text-sm">
            No recommendations
          </div>
        )}
      </div>
    </div>
  );
}
