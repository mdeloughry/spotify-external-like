/**
 * Custom hook for managing audio preview playback
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import type { SpotifyTrack } from '../lib/spotify';
import { UI } from '../lib/constants';

export interface AudioPlayerState {
  playingTrackId: string | null;
  playingTrack: SpotifyTrack | null;
  isPlaying: boolean;
}

export interface AudioPlayerActions {
  play: (track: SpotifyTrack) => void;
  pause: () => void;
  stop: () => void;
  toggle: (track: SpotifyTrack) => void;
}

export interface UseAudioPlayerReturn extends AudioPlayerState, AudioPlayerActions {
  audioRef: React.MutableRefObject<HTMLAudioElement | null>;
}

/**
 * Hook for managing audio preview playback
 * Handles play, pause, stop, and track switching
 */
export function useAudioPlayer(): UseAudioPlayerReturn {
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [playingTrack, setPlayingTrack] = useState<SpotifyTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlayingTrackId(null);
    setPlayingTrack(null);
    setIsPlaying(false);
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const play = useCallback((track: SpotifyTrack) => {
    if (!track.preview_url) return;

    // Clean up any existing audio element and its listeners
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }

    // Create new audio and play
    const audio = new Audio(track.preview_url);
    audio.volume = UI.DEFAULT_AUDIO_VOLUME;
    audioRef.current = audio;

    const handleEnded = () => {
      setPlayingTrackId(null);
      setPlayingTrack(null);
      setIsPlaying(false);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('play', handlePlay);

    audio.play().then(() => {
      setPlayingTrackId(track.id);
      setPlayingTrack(track);
      setIsPlaying(true);
    }).catch((err) => {
      console.error('Failed to play preview:', err);
      setPlayingTrackId(null);
      setPlayingTrack(null);
      setIsPlaying(false);
    });
  }, []);

  const toggle = useCallback((track: SpotifyTrack) => {
    if (!track.preview_url) return;

    // If this track is already playing, toggle pause
    if (playingTrackId === track.id) {
      if (isPlaying) {
        pause();
      } else if (audioRef.current) {
        audioRef.current.play();
        setIsPlaying(true);
      }
      return;
    }

    // Play new track
    play(track);
  }, [playingTrackId, isPlaying, pause, play]);

  return {
    playingTrackId,
    playingTrack,
    isPlaying,
    play,
    pause,
    stop,
    toggle,
    audioRef,
  };
}

export default useAudioPlayer;
