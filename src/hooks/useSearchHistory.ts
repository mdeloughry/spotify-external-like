/**
 * Custom hook for managing search history in localStorage
 */

import { useState, useEffect, useCallback } from 'react';
import { STORAGE_KEYS, UI } from '../lib/constants';

export interface UseSearchHistoryReturn {
  history: string[];
  addToHistory: (query: string) => void;
  clearHistory: () => void;
  removeFromHistory: (query: string) => void;
}

/**
 * Get search history from localStorage
 */
function getStoredHistory(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SEARCH_HISTORY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Save search history to localStorage
 */
function saveHistory(history: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.SEARCH_HISTORY, JSON.stringify(history));
  } catch {
    // localStorage might be full or disabled
  }
}

/**
 * Hook for managing search history with localStorage persistence
 */
export function useSearchHistory(): UseSearchHistoryReturn {
  const [history, setHistory] = useState<string[]>([]);

  // Load history on mount
  useEffect(() => {
    setHistory(getStoredHistory());
  }, []);

  const addToHistory = useCallback((query: string) => {
    if (!query.trim()) return;

    setHistory((prev) => {
      // Remove duplicate (case-insensitive)
      const filtered = prev.filter(
        (h) => h.toLowerCase() !== query.toLowerCase()
      );
      // Add to front and limit size
      const updated = [query, ...filtered].slice(0, UI.MAX_SEARCH_HISTORY);
      saveHistory(updated);
      return updated;
    });
  }, []);

  const removeFromHistory = useCallback((query: string) => {
    setHistory((prev) => {
      const filtered = prev.filter(
        (h) => h.toLowerCase() !== query.toLowerCase()
      );
      saveHistory(filtered);
      return filtered;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.SEARCH_HISTORY);
    }
  }, []);

  return {
    history,
    addToHistory,
    clearHistory,
    removeFromHistory,
  };
}

export default useSearchHistory;
