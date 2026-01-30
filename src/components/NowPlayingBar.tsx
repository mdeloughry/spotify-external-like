import { useState, useEffect, useRef } from 'react';
import type { SpotifyTrack } from '../lib/spotify';

/** Props for the audio preview playback bar */
interface NowPlayingBarProps {
  /** Currently playing track, null if nothing playing */
  track: SpotifyTrack | null;
  /** Whether audio is currently playing */
  isPlaying: boolean;
  /** Callback to toggle play/pause */
  onPlayPause: () => void;
  /** Callback to stop playback */
  onStop: () => void;
  /** Reference to the audio element */
  audioRef: React.RefObject<HTMLAudioElement | null>;
}

export default function NowPlayingBar({ track, isPlaying, onPlayPause, onStop, audioRef }: NowPlayingBarProps) {
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isPlaying && audioRef.current) {
      setDuration(audioRef.current.duration || 30);

      progressInterval.current = setInterval(() => {
        if (audioRef.current) {
          setProgress(audioRef.current.currentTime);
        }
      }, 100);
    } else {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    }

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [isPlaying, audioRef]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume, audioRef]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const newTime = parseFloat(e.target.value);
    setProgress(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
  };

  const handleShareTrack = async (): Promise<void> => {
    const url = track?.external_urls?.spotify;
    if (!url) return;

    try {
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

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!track) return null;

  const albumImage = track.album.images[2]?.url || track.album.images[0]?.url;
  const artists = track.artists.map((a) => a.name).join(', ');

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-black to-spotify-black/95 border-t border-spotify-gray/30 backdrop-blur-lg z-50">
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          {/* Track Info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {albumImage && (
              <img
                src={albumImage}
                alt={track.album.name}
                className="w-12 h-12 rounded shadow-lg"
              />
            )}
            <div className="min-w-0">
              <p className="font-medium text-white truncate text-sm">{track.name}</p>
              <p className="text-xs text-spotify-lightgray truncate">{artists}</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col items-center gap-1 flex-1 w-full">
            <div className="flex items-center gap-4">
              <button
                onClick={onPlayPause}
                className="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center bg-white rounded-full hover:scale-105 transition-transform"
                aria-label={isPlaying ? `Pause ${track.name}` : `Play ${track.name}`}
              >
                {isPlaying ? (
                  <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-black ml-0.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
              <button
                onClick={onStop}
                className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-spotify-lightgray hover:text-white transition-colors"
                title="Stop"
                aria-label={`Stop playing ${track.name}`}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 6h12v12H6z" />
                </svg>
              </button>
              <button
                onClick={handleShareTrack}
                className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-spotify-lightgray hover:text-white transition-colors"
                title="Copy track link"
                aria-label={`Copy link for ${track.name} to clipboard`}
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

            {/* Progress Bar */}
            <div className="hidden sm:flex items-center gap-2 w-full max-w-md">
              <span className="text-xs text-spotify-lightgray w-10 text-right" aria-hidden="true">
                {formatTime(progress)}
              </span>
              <label htmlFor="progress-slider" className="sr-only">
                Track progress
              </label>
              <input
                id="progress-slider"
                type="range"
                min="0"
                max={duration || 30}
                value={progress}
                onChange={handleSeek}
                aria-label={`Track progress: ${formatTime(progress)} of ${formatTime(duration || 30)}`}
                aria-valuemin={0}
                aria-valuemax={duration || 30}
                aria-valuenow={progress}
                aria-valuetext={`${formatTime(progress)} of ${formatTime(duration || 30)}`}
                className="flex-1 h-1 bg-spotify-gray rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:hover:scale-125 [&::-webkit-slider-thumb]:transition-transform"
                style={{
                  background: `linear-gradient(to right, #1DB954 ${(progress / (duration || 30)) * 100}%, #535353 ${(progress / (duration || 30)) * 100}%)`
                }}
              />
              <span className="text-xs text-spotify-lightgray w-10" aria-hidden="true">
                {formatTime(duration || 30)}
              </span>
            </div>
          </div>

          {/* Volume - hidden on mobile */}
          <div className="hidden sm:flex items-center gap-2 flex-1 justify-end">
            <button
              onClick={() => setVolume(volume === 0 ? 0.5 : 0)}
              className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-spotify-lightgray hover:text-white transition-colors"
              aria-label={volume === 0 ? 'Unmute audio' : 'Mute audio'}
              aria-pressed={volume === 0}
            >
              {volume === 0 ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                </svg>
              ) : volume < 0.5 ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                </svg>
              )}
            </button>
            <label htmlFor="volume-slider" className="sr-only">
              Volume
            </label>
            <input
              id="volume-slider"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={handleVolumeChange}
              aria-label={`Volume: ${Math.round(volume * 100)}%`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(volume * 100)}
              aria-valuetext={`${Math.round(volume * 100)}%`}
              className="w-24 h-1 bg-spotify-gray rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
              style={{
                background: `linear-gradient(to right, #fff ${volume * 100}%, #535353 ${volume * 100}%)`
              }}
            />
          </div>
        </div>
      </div>

    </div>
  );
}
