/**
 * Custom hook for managing keyboard shortcuts
 */

import { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
  /** Key to listen for (e.g., '/', 'Escape', ' ') */
  key: string;
  /** Handler function */
  handler: (event: KeyboardEvent) => void;
  /** Whether to prevent default behavior */
  preventDefault?: boolean;
  /** Whether shortcut works when focused on input */
  allowInInput?: boolean;
  /** Modifier keys required */
  modifiers?: {
    ctrl?: boolean;
    alt?: boolean;
    shift?: boolean;
    meta?: boolean;
  };
}

export interface UseKeyboardShortcutsOptions {
  /** Whether shortcuts are enabled */
  enabled?: boolean;
}

/**
 * Check if the event target is an input element
 */
function isInputElement(target: EventTarget | null): boolean {
  if (!target) return false;
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

/**
 * Check if modifier keys match
 */
function modifiersMatch(
  event: KeyboardEvent,
  modifiers?: KeyboardShortcut['modifiers']
): boolean {
  if (!modifiers) {
    // No modifiers required, make sure none are pressed (except shift for case sensitivity)
    return !event.ctrlKey && !event.altKey && !event.metaKey;
  }

  return (
    (modifiers.ctrl ?? false) === event.ctrlKey &&
    (modifiers.alt ?? false) === event.altKey &&
    (modifiers.shift ?? false) === event.shiftKey &&
    (modifiers.meta ?? false) === event.metaKey
  );
}

/**
 * Hook for registering keyboard shortcuts
 *
 * @example
 * ```tsx
 * useKeyboardShortcuts([
 *   { key: '/', handler: () => searchInputRef.current?.focus(), preventDefault: true },
 *   { key: 'Escape', handler: handleEscape, allowInInput: true },
 *   { key: 'l', handler: handleLike },
 * ]);
 * ```
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  options: UseKeyboardShortcutsOptions = {}
): void {
  const { enabled = true } = options;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      for (const shortcut of shortcuts) {
        // Check if key matches
        if (event.key !== shortcut.key) continue;

        // Check modifiers
        if (!modifiersMatch(event, shortcut.modifiers)) continue;

        // Check if we should ignore input elements
        if (!shortcut.allowInInput && isInputElement(event.target)) {
          continue;
        }

        // Execute handler
        if (shortcut.preventDefault) {
          event.preventDefault();
        }
        shortcut.handler(event);
        return;
      }
    },
    [shortcuts, enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);
}

type ShortcutHandler = (event: KeyboardEvent) => void;

/**
 * Common shortcut presets
 */
export const shortcutPresets = {
  /** Focus search input */
  focusSearch: (handler: ShortcutHandler): KeyboardShortcut => ({
    key: '/',
    handler,
    preventDefault: true,
  }),

  /** Escape key (works in inputs) */
  escape: (handler: ShortcutHandler): KeyboardShortcut => ({
    key: 'Escape',
    handler,
    allowInInput: true,
  }),

  /** Space for play/pause */
  playPause: (handler: ShortcutHandler): KeyboardShortcut => ({
    key: ' ',
    handler,
    preventDefault: true,
  }),

  /** L for like */
  like: (handler: ShortcutHandler): KeyboardShortcut => ({
    key: 'l',
    handler,
  }),

  /** Uppercase L for like */
  likeUpper: (handler: ShortcutHandler): KeyboardShortcut => ({
    key: 'L',
    handler,
  }),
};

export default useKeyboardShortcuts;
