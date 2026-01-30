import { useState } from 'react';
import type { SpotifyTrack } from '../lib/spotify';
import { captureError } from '../lib/error-tracking';
import TrackCard from './TrackCard';

/** Props for the track list component */
interface TrackListProps {
  /** Array of tracks to display with liked status */
  tracks: (SpotifyTrack & { isLiked: boolean })[];
  /** Callback to toggle like status */
  onLikeToggle: (trackId: string, isLiked: boolean) => Promise<void>;
  /** Callback to open playlist selector */
  onAddToPlaylist: (track: SpotifyTrack) => void;
  /** Whether there's an active Spotify playback session */
  hasActiveSession?: boolean;
  /** Callback to add track to Spotify queue */
  onAddToQueue?: (track: SpotifyTrack) => Promise<void>;
  /** Callback to play track immediately on Spotify */
  onPlayNow?: (track: SpotifyTrack) => Promise<void>;
  /** Callback to like all tracks at once */
  onLikeAll?: (trackIds: string[]) => Promise<void>;
}

export default function TrackList({
  tracks,
  onLikeToggle,
  onAddToPlaylist,
  hasActiveSession,
  onAddToQueue,
  onPlayNow,
  onLikeAll,
}: TrackListProps) {
  const [isLikingAll, setIsLikingAll] = useState(false);
  const [likeAllSuccess, setLikeAllSuccess] = useState(false);

  const unlikedTracks = tracks.filter(t => !t.isLiked);
  const hasUnlikedTracks = unlikedTracks.length > 0;

  const handleLikeAll = async (): Promise<void> => {
    if (!onLikeAll || unlikedTracks.length === 0) return;

    setIsLikingAll(true);
    setLikeAllSuccess(false);
    try {
      await onLikeAll(unlikedTracks.map(t => t.id));
      setLikeAllSuccess(true);
      setTimeout(() => setLikeAllSuccess(false), 2000);
    } catch (err) {
      captureError(err instanceof Error ? err : new Error(String(err)), {
        action: 'like_all_tracks',
        trackCount: unlikedTracks.length,
      });
    } finally {
      setIsLikingAll(false);
    }
  };

  if (tracks.length === 0) {
    return (
      <div className="text-center py-12 text-spotify-lightgray" role="status">
        <svg
          className="w-16 h-16 mx-auto mb-4 opacity-50"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
          />
        </svg>
        <p>No tracks found. Try a different search.</p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .track-list-scroll::-webkit-scrollbar {
          width: 8px;
        }
        .track-list-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .track-list-scroll::-webkit-scrollbar-thumb {
          background-color: rgba(255, 255, 255, 0.2);
          border-radius: 4px;
        }
        .track-list-scroll::-webkit-scrollbar-thumb:hover {
          background-color: rgba(255, 255, 255, 0.3);
        }
        .track-list-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
        }
      `}</style>

      {/* Like All Button */}
      {onLikeAll && hasUnlikedTracks && (
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/10">
          <span className="text-sm text-spotify-lightgray">
            {tracks.length} tracks · {unlikedTracks.length} not liked
          </span>
          <button
            onClick={handleLikeAll}
            disabled={isLikingAll}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              likeAllSuccess
                ? 'bg-spotify-green text-black'
                : 'bg-spotify-green/10 text-spotify-green hover:bg-spotify-green/20 border border-spotify-green/30'
            } disabled:opacity-50`}
            aria-label={`Like all ${unlikedTracks.length} unliked tracks`}
          >
            {isLikingAll ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Liking...
              </>
            ) : likeAllSuccess ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Liked All!
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                Like All ({unlikedTracks.length})
              </>
            )}
          </button>
        </div>
      )}

      <div className="track-list-scroll max-h-[60vh] overflow-y-scroll pr-1 w-full">
        <ul role="list" aria-label="Search results" className="space-y-1 w-full">
          {tracks.map((track) => (
            <li key={track.id} className="w-full min-w-0 max-w-full">
              <TrackCard
                track={track}
                onLikeToggle={onLikeToggle}
                onAddToPlaylist={onAddToPlaylist}
                hasActiveSession={hasActiveSession}
                onAddToQueue={onAddToQueue}
                onPlayNow={onPlayNow}
              />
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
