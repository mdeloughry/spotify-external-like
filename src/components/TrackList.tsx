import type { SpotifyTrack } from '../lib/spotify';
import TrackCard from './TrackCard';

/** Props for the track list component */
interface TrackListProps {
  /** Array of tracks to display with liked status */
  tracks: (SpotifyTrack & { isLiked: boolean })[];
  /** Callback to toggle like status */
  onLikeToggle: (trackId: string, isLiked: boolean) => Promise<void>;
  /** Callback to open playlist selector */
  onAddToPlaylist: (track: SpotifyTrack) => void;
  /** ID of currently playing track preview */
  playingTrackId: string | null;
  /** Callback to toggle audio preview */
  onPlayToggle: (track: SpotifyTrack) => void;
  /** Whether there's an active Spotify playback session */
  hasActiveSession?: boolean;
  /** Callback to add track to Spotify queue */
  onAddToQueue?: (track: SpotifyTrack) => Promise<void>;
  /** Callback to play track immediately on Spotify */
  onPlayNow?: (track: SpotifyTrack) => Promise<void>;
}

export default function TrackList({
  tracks,
  onLikeToggle,
  onAddToPlaylist,
  playingTrackId,
  onPlayToggle,
  hasActiveSession,
  onAddToQueue,
  onPlayNow,
}: TrackListProps) {
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
      <div className="track-list-scroll max-h-[60vh] overflow-y-scroll pr-1 w-full">
        <ul role="list" aria-label="Search results" className="space-y-1 w-full">
          {tracks.map((track) => (
            <li key={track.id} className="w-full min-w-0 max-w-full">
              <TrackCard
                track={track}
                onLikeToggle={onLikeToggle}
                onAddToPlaylist={onAddToPlaylist}
                isPlaying={playingTrackId === track.id}
                onPlayToggle={onPlayToggle}
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
