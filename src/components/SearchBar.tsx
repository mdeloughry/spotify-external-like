import { useState, useCallback, useRef, useEffect } from 'react';

/** Props for the search bar component */
interface SearchBarProps {
  /** Callback triggered when search is submitted */
  onSearch: (query: string) => void;
  /** Whether a search is in progress */
  isLoading?: boolean;
  /** External ref for the input element */
  inputRef?: React.RefObject<HTMLInputElement | null>;
  /** Callback when input gains focus */
  onFocus?: () => void;
  /** Callback when input loses focus */
  onBlur?: () => void;
}

/** Extend Window interface for Web Speech API */
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

export default function SearchBar({ onSearch, isLoading, inputRef, onFocus, onBlur }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isMultiline, setIsMultiline] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const localRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const ref = inputRef || localRef;

  // Check for speech recognition support on mount
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSpeechSupported(!!SpeechRecognition);
  }, []);

  const debouncedSearch = useCallback(
    (value: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        if (value.trim()) {
          onSearch(value.trim());
        }
      }, 300);
    },
    [onSearch]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
    const value = e.target.value;
    setQuery(value);

    // Detect multiline content (from paste)
    const hasMultipleLines = value.includes('\n');
    if (hasMultipleLines && !isMultiline) {
      setIsMultiline(true);
    }

    // Only debounce search for single-line queries
    if (!hasMultipleLines) {
      debouncedSearch(value);
    }
  };

  const handlePaste = (e: React.ClipboardEvent): void => {
    const pastedText = e.clipboardData.getData('text');
    if (pastedText.includes('\n')) {
      e.preventDefault();
      setQuery(pastedText);
      setIsMultiline(true);
    }
  };

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!query.trim()) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    onSearch(query.trim());
    // Reset multiline mode after submit
    setIsMultiline(false);
  };

  const handleClearMultiline = (): void => {
    setQuery('');
    setIsMultiline(false);
    ref.current?.focus();
  };

  const startVoiceSearch = (): void => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    // Stop any existing recognition
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = (): void => {
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent): void => {
      const results = event.results;
      let transcript = '';

      for (let i = event.resultIndex; i < results.length; i++) {
        transcript += results[i][0].transcript;
      }

      setQuery(transcript);

      // Auto-submit when we get a final result
      if (results[results.length - 1].isFinal) {
        if (transcript.trim()) {
          if (debounceRef.current) {
            clearTimeout(debounceRef.current);
          }
          onSearch(transcript.trim());
        }
      }
    };

    recognition.onerror = (event: { error: string }): void => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = (): void => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.start();
  };

  const stopVoiceSearch = (): void => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const toggleVoiceSearch = (): void => {
    if (isListening) {
      stopVoiceSearch();
    } else {
      startVoiceSearch();
    }
  };

  // Cleanup recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const lineCount = query.split('\n').length;

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto" role="search">
      <div className="relative">
        <label htmlFor="search-input" className="sr-only">
          Search for tracks, artists, or paste a URL or track list
        </label>

        {isMultiline ? (
          <>
            <textarea
              id="search-input"
              ref={textareaRef}
              value={query}
              onChange={handleChange}
              onFocus={onFocus}
              onBlur={onBlur}
              placeholder="Paste track list (one per line)&#10;Format: Artist - Title"
              className="w-full px-4 py-3 pl-12 pr-20 text-base bg-spotify-gray/30 border border-spotify-gray/50 rounded-2xl text-white placeholder-spotify-lightgray focus:outline-none focus:border-spotify-green focus:ring-2 focus:ring-spotify-green/20 transition-all resize-none"
              rows={Math.min(lineCount + 1, 8)}
              autoComplete="off"
            />
            <div className="absolute left-4 top-3.5 flex items-center gap-2">
              <svg
                className="w-5 h-5 text-spotify-lightgray"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="absolute right-4 top-3.5 flex items-center gap-2">
              <span className="text-xs text-spotify-lightgray">{lineCount} tracks</span>
              <button
                type="button"
                onClick={handleClearMultiline}
                className="p-1 text-spotify-lightgray hover:text-white transition-colors"
                aria-label="Clear track list"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full py-2.5 bg-spotify-green hover:bg-spotify-green/90 disabled:opacity-50 text-black font-medium rounded-full transition-colors"
            >
              {isLoading ? 'Importing...' : `Import ${lineCount} Tracks`}
            </button>
          </>
        ) : (
          <>
            <input
              id="search-input"
              ref={ref as React.RefObject<HTMLInputElement>}
              type="text"
              value={query}
              onChange={handleChange}
              onPaste={handlePaste}
              onFocus={onFocus}
              onBlur={onBlur}
              placeholder="Search for tracks, artists, or paste a URL..."
              className={`w-full px-4 py-3 pl-12 ${speechSupported ? 'pr-12' : ''} text-lg bg-spotify-gray/30 border border-spotify-gray/50 rounded-full text-white placeholder-spotify-lightgray focus:outline-none focus:border-spotify-green focus:ring-2 focus:ring-spotify-green/20 transition-all ${isListening ? 'border-red-500 ring-2 ring-red-500/20' : ''}`}
              autoComplete="off"
              aria-autocomplete="list"
            />
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-spotify-lightgray"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {/* Voice Search Button */}
            {speechSupported && (
              <button
                type="button"
                onClick={toggleVoiceSearch}
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full transition-all ${
                  isListening
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'text-spotify-lightgray hover:text-white hover:bg-spotify-gray/50'
                }`}
                aria-label={isListening ? 'Stop voice search' : 'Start voice search'}
                title={isListening ? 'Click to stop' : 'Voice search'}
              >
                {isListening ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                    />
                  </svg>
                )}
              </button>
            )}
          </>
        )}

        {isLoading && !isMultiline && !isListening && (
          <div className={`absolute top-1/2 -translate-y-1/2 ${speechSupported ? 'right-14' : 'right-4'}`} role="status" aria-label="Searching">
            <div className="w-5 h-5 border-2 border-spotify-green border-t-transparent rounded-full animate-spin" aria-hidden="true" />
            <span className="sr-only">Searching...</span>
          </div>
        )}
      </div>
    </form>
  );
}
