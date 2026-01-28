import type { SpotifyTrack } from '../lib/spotify';
import TrackCard from './TrackCard';

interface TrackListProps {
  tracks: (SpotifyTrack & { isLiked: boolean })[];
  onLikeToggle: (trackId: string, isLiked: boolean) => Promise<void>;
  onAddToPlaylist: (track: SpotifyTrack) => void;
  playingTrackId: string | null;
  onPlayToggle: (track: SpotifyTrack) => void;
}

export default function TrackList({ tracks, onLikeToggle, onAddToPlaylist, playingTrackId, onPlayToggle }: TrackListProps) {
  if (tracks.length === 0) {
    return (
      <div className="text-center py-12 text-spotify-lightgray">
        <svg
          className="w-16 h-16 mx-auto mb-4 opacity-50"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
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
    <div className="space-y-1">
      {tracks.map((track) => (
        <TrackCard
          key={track.id}
          track={track}
          onLikeToggle={onLikeToggle}
          onAddToPlaylist={onAddToPlaylist}
          isPlaying={playingTrackId === track.id}
          onPlayToggle={onPlayToggle}
        />
      ))}
    </div>
  );
}
