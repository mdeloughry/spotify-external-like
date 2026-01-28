import { useState, useEffect, useCallback, useRef } from 'react';
import type { SpotifyTrack } from '../lib/spotify';
import { formatDuration } from '../lib/spotify';
import PsychedelicVisualizer from './PsychedelicVisualizer';

type TrackWithLiked = SpotifyTrack & { isLiked: boolean };

interface NowPlayingData {
  playing: boolean;
  is_playing?: boolean;
  progress_ms?: number;
  track?: TrackWithLiked;
}

interface SpotifyNowPlayingProps {
  onTrackSelect?: (track: SpotifyTrack) => void;
  onTrackChange?: (track: SpotifyTrack | null) => void;
}

export default function SpotifyNowPlaying({ onTrackSelect, onTrackChange }: SpotifyNowPlayingProps) {
  const [nowPlaying, setNowPlaying] = useState<NowPlayingData | null>(null);
  const [progress, setProgress] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [showVisualizer, setShowVisualizer] = useState(false);
  const clickCountRef = useRef(0);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleShare = async () => {
    try {
      const url = nowPlaying?.track?.external_urls?.spotify;
      if (!url) return;

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = url;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
    } catch (error) {
      console.error('Failed to copy track URL to clipboard', error);
    }
  };

  const handleNowPlayingClick = () => {
    clickCountRef.current += 1;

    // Reset click count after 2 seconds of no clicks
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }
    clickTimeoutRef.current = setTimeout(() => {
      clickCountRef.current = 0;
    }, 2000);

    // Trigger visualizer on 3rd click
    if (clickCountRef.current >= 3) {
      clickCountRef.current = 0;
      setShowVisualizer(true);
    }
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
      console.error('Failed to fetch now playing:', err);
    }
  }, [onTrackChange]);

  // Poll for currently playing every 5 seconds
  useEffect(() => {
    fetchNowPlaying();
    const interval = setInterval(fetchNowPlaying, 5000);
    return () => clearInterval(interval);
  }, [fetchNowPlaying]);

  // Update progress every second when playing
  useEffect(() => {
    if (nowPlaying?.is_playing) {
      const interval = setInterval(() => {
        setProgress((prev) => prev + 1000);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [nowPlaying?.is_playing]);

  const handleLike = async () => {
    if (!nowPlaying?.track) return;

    const method = isLiked ? 'DELETE' : 'POST';
    try {
      const response = await fetch('/api/like', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId: nowPlaying.track.id }),
      });

      if (response.ok) {
        setIsLiked(!isLiked);
      }
    } catch (err) {
      console.error('Failed to toggle like:', err);
    }
  };

  if (!nowPlaying?.playing || !nowPlaying.track) {
    return null;
  }

  const track = nowPlaying.track;
  const albumImage = track.album.images[1]?.url || track.album.images[0]?.url;
  const duration = track.duration_ms;
  const progressPercent = Math.min((progress / duration) * 100, 100);

  return (
    <div className="bg-gradient-to-r from-spotify-green/20 via-spotify-green/10 to-transparent rounded-xl border border-spotify-green/30 overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-4">
        {/* Album Art */}
        <div className="relative flex-shrink-0">
          {albumImage && (
            <img
              src={albumImage}
              alt={track.album.name}
              className="w-16 h-16 rounded-lg shadow-lg"
            />
          )}
          {nowPlaying.is_playing && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-spotify-green rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          )}
        </div>

        {/* Track Info */}
        <div className="flex-grow min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              onClick={handleNowPlayingClick}
              className="text-xs text-spotify-green font-medium uppercase tracking-wider cursor-pointer hover:text-spotify-green/80 transition-colors select-none"
              title="Click me..."
            >
              {nowPlaying.is_playing ? 'Now Playing on Spotify' : 'Paused on Spotify'}
            </span>
          </div>
          <a
            href={track.external_urls.spotify}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-white truncate block hover:underline"
          >
            {track.name}
          </a>
          <p className="text-sm text-spotify-lightgray truncate">
            {track.artists.map((a) => a.name).join(', ')}
          </p>

          {/* Progress Bar */}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-spotify-lightgray w-10">
              {formatDuration(progress)}
            </span>
            <div className="flex-grow h-1 bg-spotify-gray/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-spotify-green transition-all duration-1000 ease-linear"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs text-spotify-lightgray w-10 text-right">
              {formatDuration(duration)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleLike}
            className={`p-2 rounded-full transition-colors ${
              isLiked
                ? 'text-spotify-green'
                : 'text-spotify-lightgray hover:text-white'
            }`}
            title={isLiked ? 'Remove from Liked Songs' : 'Add to Liked Songs'}
          >
            <svg
              className="w-6 h-6"
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
          </button>
          {onTrackSelect && (
            <button
              onClick={() => onTrackSelect(track)}
              className="p-2 rounded-full text-spotify-lightgray hover:text-white transition-colors"
              title="Add to Playlist"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
          )}
          <button
            onClick={handleShare}
            className="p-2 rounded-full text-spotify-lightgray hover:text-white transition-colors"
            title="Copy track link"
            aria-label={track ? `Copy link for ${track.name} to clipboard` : 'Copy track link'}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* Easter Egg Visualizer */}
      {showVisualizer && (
        <PsychedelicVisualizer onClose={() => setShowVisualizer(false)} />
      )}
    </div>
  );
}
