import { useState, useEffect, useCallback, useRef } from 'react';
import type { SpotifyTrack } from '../lib/spotify';
import type { TrackWithLiked } from '../lib/api-client';
import { formatDuration, getAlbumImageUrl, formatArtists } from '../lib/spotify';
import { copyTrackUrl } from '../lib/clipboard';
import { captureError } from '../lib/error-tracking';
import { POLLING, UI } from '../lib/constants';
import PsychedelicVisualizer from './PsychedelicVisualizer';

/** Data returned from the now-playing API endpoint */
interface NowPlayingData {
  /** Whether any track is currently playing */
  playing: boolean;
  /** Spotify's is_playing status */
  is_playing?: boolean;
  /** Current playback position in milliseconds */
  progress_ms?: number;
  /** Currently playing track with liked status */
  track?: TrackWithLiked;
}

/** Props for the Spotify now playing component */
interface SpotifyNowPlayingProps {
  /** Callback when user selects the current track */
  onTrackSelect?: (track: SpotifyTrack) => void;
  /** Callback when the playing track changes */
  onTrackChange?: (track: SpotifyTrack | null) => void;
}

export default function SpotifyNowPlaying({ onTrackSelect, onTrackChange }: SpotifyNowPlayingProps) {
  const [nowPlaying, setNowPlaying] = useState<NowPlayingData | null>(null);
  const [progress, setProgress] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [showVisualizer, setShowVisualizer] = useState(false);
  const clickCountRef = useRef(0);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleShare = async (): Promise<void> => {
    const result = await copyTrackUrl(nowPlaying?.track?.external_urls?.spotify);
    if (!result.success) {
      captureError(result.error || 'Failed to copy track URL to clipboard', {
        action: 'copy_track_url',
        trackId: nowPlaying?.track?.id,
        trackName: nowPlaying?.track?.name,
      });
    }
  };

  const handleNowPlayingClick = (): void => {
    clickCountRef.current += 1;

    // Reset click count after timeout
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }
    clickTimeoutRef.current = setTimeout(() => {
      clickCountRef.current = 0;
    }, UI.MULTI_CLICK_TIMEOUT_MS);

    // Trigger visualizer on configured click count
    if (clickCountRef.current < UI.EASTER_EGG_CLICK_COUNT) return;

    clickCountRef.current = 0;
    setShowVisualizer(true);
  };

  // Fetch currently playing track
  const fetchNowPlaying = useCallback(async () => {
    try {
      const response = await fetch('/api/now-playing');
      if (response.ok) {
        const data = await response.json();
        setNowPlaying(data);
        if (data.playing && data.progress_ms) {
          setProgress(data.progress_ms);
        }
        if (data.track) {
          setIsLiked(data.track.isLiked);
        }
        // Notify parent of track change
        onTrackChange?.(data.track || null);
      }
    } catch (err) {
      // Only track non-network errors (network errors are expected when offline)
      if (err instanceof Error && !err.message.includes('fetch')) {
        captureError(err, { action: 'fetch_now_playing' });
      }
    }
  }, [onTrackChange]);

  // Poll for currently playing
  useEffect(() => {
    fetchNowPlaying();
    const interval = setInterval(fetchNowPlaying, POLLING.NOW_PLAYING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchNowPlaying]);

  // Update progress when playing
  useEffect(() => {
    if (nowPlaying?.is_playing) {
      const interval = setInterval(() => {
        setProgress((prev) => prev + POLLING.PROGRESS_UPDATE_INTERVAL_MS);
      }, POLLING.PROGRESS_UPDATE_INTERVAL_MS);
      return () => clearInterval(interval);
    }
  }, [nowPlaying?.is_playing]);

  const handleLike = async (): Promise<void> => {
    if (!nowPlaying?.track) return;

    const method = isLiked ? 'DELETE' : 'POST';
    try {
      const response = await fetch('/api/like', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId: nowPlaying.track.id }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        captureError(new Error(data.error || `Like toggle failed: ${response.statusText}`), {
          action: 'like_toggle_now_playing',
          trackId: nowPlaying.track.id,
          trackName: nowPlaying.track.name,
        });
        return;
      }

      setIsLiked(!isLiked);
    } catch (err) {
      captureError(err instanceof Error ? err : new Error(String(err)), {
        action: 'like_toggle_now_playing',
        trackId: nowPlaying.track.id,
        trackName: nowPlaying.track.name,
      });
    }
  };

  if (!nowPlaying?.playing || !nowPlaying.track) {
    return null;
  }

  const track = nowPlaying.track;
  const albumImage = getAlbumImageUrl(track.album, 'medium');
  const duration = track.duration_ms;
  const progressPercent = Math.min((progress / duration) * 100, 100);

  return (
    <div className="bg-gradient-to-r from-spotify-green/20 via-spotify-green/10 to-transparent rounded-xl border border-spotify-green/30">
      <div className="px-4 py-3">
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Album Art */}
          <div className="relative flex-shrink-0">
            {albumImage && (
              <img
                src={albumImage}
                alt={track.album.name}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg shadow-lg"
              />
            )}
            {nowPlaying.is_playing && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-spotify-green rounded-full flex items-center justify-center" aria-hidden="true">
                <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-black" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            )}
          </div>

          {/* Track Info */}
          <div className="flex-1 min-w-0">
            <span
              onClick={handleNowPlayingClick}
              className="text-[0.65rem] sm:text-xs text-spotify-green font-medium uppercase tracking-wider cursor-pointer hover:text-spotify-green/80 transition-colors select-none"
              title="Click me..."
            >
              {nowPlaying.is_playing ? 'Now Playing on Spotify' : 'Paused on Spotify'}
            </span>
            <a
              href={track.external_urls.spotify}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-white truncate block hover:underline text-sm sm:text-base"
              aria-label={`${track.name} (opens in Spotify)`}
            >
              {track.name}
              <span className="sr-only"> (opens in new tab)</span>
            </a>
            <p className="text-xs sm:text-sm text-spotify-lightgray truncate">
              {formatArtists(track.artists)}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <button
              onClick={handleLike}
              className={`p-1.5 sm:p-2 rounded-full transition-colors ${isLiked
                  ? 'text-spotify-green'
                  : 'text-spotify-lightgray hover:text-white'
                }`}
              title={isLiked ? 'Remove from Liked Songs' : 'Add to Liked Songs'}
              aria-label={isLiked ? `Remove ${track.name} from Liked Songs` : `Save ${track.name} to Liked Songs`}
              aria-pressed={isLiked}
            >
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6"
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
            </button>
            {onTrackSelect && (
              <button
                onClick={() => onTrackSelect(track)}
                className="p-1.5 sm:p-2 rounded-full text-spotify-lightgray hover:text-white transition-colors"
                title="Add to Playlist"
                aria-label={`Add ${track.name} to playlist`}
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
            )}
            <button
              onClick={handleShare}
              className="p-1.5 sm:p-2 rounded-full text-spotify-lightgray hover:text-white transition-colors"
              title="Copy track link"
              aria-label={`Copy link for ${track.name} to clipboard`}
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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

        {/* Progress Bar - Full width below main content */}
        <div className="flex items-center gap-2 mt-3 px-1">
          <span className="text-[0.65rem] sm:text-xs text-spotify-lightgray tabular-nums flex-shrink-0" aria-hidden="true">
            {formatDuration(progress)}
          </span>
          <div
            role="progressbar"
            aria-label="Track progress"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={duration}
            aria-valuetext={`${formatDuration(progress)} of ${formatDuration(duration)}`}
            className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden"
          >
            <div
              className="h-full bg-spotify-green transition-all duration-1000 ease-linear"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-[0.65rem] sm:text-xs text-spotify-lightgray tabular-nums flex-shrink-0" aria-hidden="true">
            {formatDuration(duration)}
          </span>
        </div>
      </div>

      {/* Easter Egg Visualizer */}
      {showVisualizer && (
        <PsychedelicVisualizer onClose={() => setShowVisualizer(false)} />
      )}
    </div>
  );
}
