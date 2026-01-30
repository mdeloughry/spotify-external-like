import { useState } from 'react';
import type { SpotifyTrack } from '../lib/spotify';
import { formatDuration, getAlbumImageUrl, formatArtists } from '../lib/spotify';
import { copyTrackUrl } from '../lib/clipboard';
import TruncatedText from './TruncatedText';

/** Props for the track card component */
interface TrackCardProps {
  /** Track data with liked status */
  track: SpotifyTrack & { isLiked: boolean };
  /** Callback to toggle like status */
  onLikeToggle: (trackId: string, isLiked: boolean) => Promise<void>;
  /** Callback to open playlist selector */
  onAddToPlaylist: (track: SpotifyTrack) => void;
  /** Whether this track's preview is currently playing */
  isPlaying: boolean;
  /** Callback to toggle audio preview playback */
  onPlayToggle: (track: SpotifyTrack) => void;
  /** Whether there's an active Spotify playback session */
  hasActiveSession?: boolean;
  /** Callback to add track to Spotify queue */
  onAddToQueue?: (track: SpotifyTrack) => Promise<void>;
  /** Callback to play track immediately on Spotify */
  onPlayNow?: (track: SpotifyTrack) => Promise<void>;
}

export default function TrackCard({
  track,
  onLikeToggle,
  onAddToPlaylist,
  isPlaying,
  onPlayToggle,
  hasActiveSession = false,
  onAddToQueue,
  onPlayNow,
}: TrackCardProps) {
  const [isLiked, setIsLiked] = useState(track.isLiked);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [isQueueLoading, setIsQueueLoading] = useState(false);
  const [isPlayLoading, setIsPlayLoading] = useState(false);
  const [queueSuccess, setQueueSuccess] = useState(false);

  const albumImage = getAlbumImageUrl(track.album, 'medium');
  const artists = formatArtists(track.artists);
  const hasPreview = !!track.preview_url;

  const getPlayButtonLabel = (): string => {
    if (!hasPreview) return `No preview available for ${track.name}`;
    if (isPlaying) return `Pause preview of ${track.name}`;
    return `Play preview of ${track.name}`;
  };

  const handleShareClick = async (): Promise<void> => {
    const result = await copyTrackUrl(track.external_urls?.spotify);
    if (!result.success) {
      console.error('Failed to copy track URL to clipboard:', result.error);
    }
  };

  const handleLikeClick = async (): Promise<void> => {
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

  const handleAddToQueue = async (): Promise<void> => {
    if (!onAddToQueue) return;

    setIsQueueLoading(true);
    setQueueSuccess(false);
    try {
      await onAddToQueue(track);
      setQueueSuccess(true);
      // Reset success indicator after 2 seconds
      setTimeout(() => setQueueSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to add to queue:', err);
    } finally {
      setIsQueueLoading(false);
    }
  };

  const handlePlayNow = async (): Promise<void> => {
    if (!onPlayNow) return;

    setIsPlayLoading(true);
    try {
      await onPlayNow(track);
    } catch (err) {
      console.error('Failed to play track:', err);
    } finally {
      setIsPlayLoading(false);
    }
  };

  return (
    <div className="group relative w-full max-w-full overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] shadow-[0_18px_60px_rgba(0,0,0,0.7)] hover:border-emerald-400/40 hover:bg-white/[0.04] transition-all">
      <div className="flex items-center gap-4 px-4 py-3 w-full min-w-0">
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
              <svg className="w-6 h-6 text-spotify-lightgray" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            </div>
          )}
          {/* Play/Pause overlay */}
          <button
            onClick={() => onPlayToggle(track)}
            disabled={!hasPreview}
            className={`absolute inset-0 flex items-center justify-center bg-black/60 rounded-xl transition-opacity ${isPlaying ? 'opacity-100' : 'opacity-0 hover:opacity-100'
              } ${!hasPreview ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            aria-label={getPlayButtonLabel()}
          >
            {isPlaying ? (
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
        </div>

        {/* Track Info */}
        <div className="flex-1 min-w-0 overflow-hidden" style={{ width: 0 }}>
          <a
            href={track.external_urls.spotify}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-sm font-medium text-white hover:text-emerald-200"
            aria-label={`${track.name} (opens in Spotify)`}
          >
            <TruncatedText text={track.name} className="text-sm font-medium" />
            <span className="sr-only"> (opens in new tab)</span>
          </a>
          <TruncatedText text={artists} className="text-xs text-spotify-lightgray" />
          <TruncatedText text={track.album.name} className="mt-1 text-xs text-spotify-lightgray/70" />
        </div>

        {/* Meta + Actions */}
        <div className="ml-4 flex flex-col items-end gap-2 flex-shrink-0">
          {/* Duration */}
          <span className="hidden text-xs text-spotify-lightgray sm:block">
            {formatDuration(track.duration_ms)}
          </span>

          {/* Status pills */}
          <div className="flex flex-wrap justify-end gap-1">
            {hasPreview && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[0.6rem] sm:text-xs uppercase tracking-[0.16em] text-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" aria-hidden="true" />
                Preview
              </span>
            )}
            {isLiked && (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/15 px-2 py-0.5 text-[0.6rem] sm:text-xs uppercase tracking-[0.16em] text-spotify-lightgray">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" aria-hidden="true" />
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
              className={`p-2.5 sm:p-2 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 rounded-full transition-all flex items-center justify-center ${isLiked
                ? 'text-spotify-green hover:text-spotify-green/80 scale-100'
                : 'text-spotify-lightgray hover:text-white opacity-70 group-hover:opacity-100'
                } disabled:opacity-50`}
              aria-label={isLiked ? `Remove ${track.name} from Liked Songs` : `Save ${track.name} to Liked Songs`}
              aria-pressed={isLiked}
            >
              {isLikeLoading ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden="true">
                  <span className="sr-only">Loading...</span>
                </div>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill={isLiked ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
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
              className="p-2.5 sm:p-2 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 rounded-full text-spotify-lightgray hover:text-white transition-colors flex items-center justify-center"
              aria-label={`Add ${track.name} to playlist`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </button>

            {/* Add to Queue Button - only visible with active session */}
            {hasActiveSession && onAddToQueue && (
              <button
                onClick={handleAddToQueue}
                disabled={isQueueLoading}
                className={`p-2.5 sm:p-2 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 rounded-full transition-colors flex items-center justify-center ${
                  queueSuccess
                    ? 'text-spotify-green'
                    : 'text-spotify-lightgray hover:text-white'
                } disabled:opacity-50`}
                aria-label={`Add ${track.name} to queue`}
                title="Add to queue"
              >
                {isQueueLoading ? (
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden="true">
                    <span className="sr-only">Adding to queue...</span>
                  </div>
                ) : queueSuccess ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h10m-10 4h10" />
                  </svg>
                )}
              </button>
            )}

            {/* Play Now Button - only visible with active session */}
            {hasActiveSession && onPlayNow && (
              <button
                onClick={handlePlayNow}
                disabled={isPlayLoading}
                className="p-2.5 sm:p-2 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 rounded-full text-spotify-lightgray hover:text-spotify-green transition-colors flex items-center justify-center disabled:opacity-50"
                aria-label={`Play ${track.name} now on Spotify`}
                title="Play now on Spotify"
              >
                {isPlayLoading ? (
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden="true">
                    <span className="sr-only">Starting playback...</span>
                  </div>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
            )}

            {/* Share Button */}
            <button
              onClick={handleShareClick}
              className="p-2.5 sm:p-2 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 rounded-full text-spotify-lightgray hover:text-white transition-colors flex items-center justify-center"
              aria-label={`Copy link for ${track.name} to clipboard`}
              title="Copy track link"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-4M14 4h4a2 2 0 012 2v8a2 2 0 01-2 2h-4M8 12l8-8"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
