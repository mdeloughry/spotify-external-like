import { useState, useCallback, useRef, useEffect } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  onFocus?: () => void;
  onBlur?: () => void;
}

export default function SearchBar({ onSearch, isLoading, inputRef, onFocus, onBlur }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const localRef = useRef<HTMLInputElement>(null);
  const ref = inputRef || localRef;

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    debouncedSearch(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      onSearch(query.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto" role="search">
      <div className="relative">
        <label htmlFor="search-input" className="sr-only">
          Search for tracks, artists, or paste a URL
        </label>
        <input
          id="search-input"
          ref={ref as React.RefObject<HTMLInputElement>}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder="Search for tracks, artists, or paste a URL..."
          className="w-full px-4 py-3 pl-12 text-lg bg-spotify-gray/30 border border-spotify-gray/50 rounded-full text-white placeholder-spotify-lightgray focus:outline-none focus:border-spotify-green focus:ring-2 focus:ring-spotify-green/20 transition-all"
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
        {isLoading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2" role="status" aria-label="Searching">
            <div className="w-5 h-5 border-2 border-spotify-green border-t-transparent rounded-full animate-spin" aria-hidden="true" />
            <span className="sr-only">Searching...</span>
          </div>
        )}
      </div>
    </form>
  );
}
