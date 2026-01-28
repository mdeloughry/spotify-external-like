import { useState } from 'react';
import type { SpotifyTrack } from '../lib/spotify';
import { formatDuration } from '../lib/spotify';

interface TrackCardProps {
  track: SpotifyTrack & { isLiked: boolean };
  onLikeToggle: (trackId: string, isLiked: boolean) => Promise<void>;
  onAddToPlaylist: (track: SpotifyTrack) => void;
  isPlaying: boolean;
  onPlayToggle: (track: SpotifyTrack) => void;
}

export default function TrackCard({ track, onLikeToggle, onAddToPlaylist, isPlaying, onPlayToggle }: TrackCardProps) {
  const [isLiked, setIsLiked] = useState(track.isLiked);
  const [isLikeLoading, setIsLikeLoading] = useState(false);

  const albumImage = track.album.images[1]?.url || track.album.images[0]?.url;
  const artists = track.artists.map((a) => a.name).join(', ');
  const hasPreview = !!track.preview_url;

  const handleLikeClick = async () => {
    setIsLikeLoading(true);
    try {
      await onLikeToggle(track.id, !isLiked);
      setIsLiked(!isLiked);
    } catch (err) {
      console.error('Failed to toggle like:', err);
    } finally {
      setIsLikeLoading(false);
    }
  };

  return (
    <div className="group relative flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3 shadow-[0_18px_60px_rgba(0,0,0,0.7)] hover:border-emerald-400/40 hover:bg-white/[0.04] transition-all">
      {/* Album Art with Play Button */}
      <div className="flex-shrink-0 relative">
        {albumImage ? (
          <img
            src={albumImage}
            alt={track.album.name}
            className="w-14 h-14 rounded-xl shadow-md ring-1 ring-white/10"
          />
        ) : (
          <div className="w-14 h-14 rounded-xl shadow-md bg-gradient-to-br from-emerald-500 via-emerald-400 to-sky-400 flex items-center justify-center ring-1 ring-white/10">
            <svg className="w-6 h-6 text-spotify-lightgray" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
        )}
        {/* Play/Pause overlay */}
        <button
          onClick={() => onPlayToggle(track)}
          disabled={!hasPreview}
          className={`absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl transition-opacity ${
            isPlaying ? 'opacity-100' : 'opacity-0 hover:opacity-100'
          } ${!hasPreview ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          title={!hasPreview ? 'No preview available' : isPlaying ? 'Pause preview' : 'Play preview'}
        >
          {isPlaying ? (
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
      </div>

      {/* Track Info */}
      <div className="flex-grow min-w-0">
        <a
          href={track.external_urls.spotify}
          target="_blank"
          rel="noopener noreferrer"
          className="block truncate text-sm font-medium text-white hover:text-emerald-200"
        >
          {track.name}
        </a>
        <p className="text-xs text-spotify-lightgray truncate">{artists}</p>
        <p className="mt-1 text-[0.7rem] text-spotify-lightgray/70">
          {track.album.name}
        </p>
      </div>

      {/* Meta + Actions */}
      <div className="ml-4 flex flex-col items-end gap-2">
        {/* Duration */}
        <span className="hidden text-xs text-spotify-lightgray sm:block">
          {formatDuration(track.duration_ms)}
        </span>

        {/* Status pills */}
        <div className="flex flex-wrap justify-end gap-1">
          {hasPreview && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[0.65rem] uppercase tracking-[0.16em] text-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
              Preview
            </span>
          )}
          {isLiked && (
            <span className="inline-flex items-center gap-1 rounded-full border border-white/15 px-2 py-0.5 text-[0.65rem] uppercase tracking-[0.16em] text-spotify-lightgray">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
              Liked
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Like Button - always visible */}
          <button
            onClick={handleLikeClick}
            disabled={isLikeLoading}
            className={`p-2 rounded-full transition-all ${
              isLiked
                ? 'text-spotify-green hover:text-spotify-green/80 scale-100'
                : 'text-spotify-lightgray hover:text-white opacity-70 group-hover:opacity-100'
            } disabled:opacity-50`}
            title={isLiked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
          >
            {isLikeLoading ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg
                className="w-5 h-5"
                fill={isLiked ? 'currentColor' : 'none'}
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
            )}
          </button>

          {/* Add to Playlist Button */}
          <button
            onClick={() => onAddToPlaylist(track)}
            className="p-2 rounded-full text-spotify-lightgray hover:text-white transition-colors"
            title="Add to playlist"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
