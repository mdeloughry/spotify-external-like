import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TruncatedTextProps {
  text: string;
  className?: string;
}

export default function TruncatedText({ text, className = '' }: TruncatedTextProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const textRef = useRef<HTMLSpanElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if text is actually truncated
  useEffect(() => {
    const checkTruncation = () => {
      if (textRef.current) {
        setIsTruncated(textRef.current.scrollWidth > textRef.current.clientWidth);
      }
    };

    checkTruncation();
    // Re-check after fonts load
    document.fonts?.ready.then(checkTruncation);
    window.addEventListener('resize', checkTruncation);
    return () => window.removeEventListener('resize', checkTruncation);
  }, [text]);

  const updateTooltipPosition = () => {
    if (textRef.current) {
      const rect = textRef.current.getBoundingClientRect();
      setTooltipPosition({
        top: rect.bottom + 8, // 8px below the text
        left: rect.left,
      });
    }
  };

  const handleMouseEnter = () => {
    if (isTruncated) {
      updateTooltipPosition();
      timeoutRef.current = setTimeout(() => {
        updateTooltipPosition(); // Update position again when showing
        setShowTooltip(true);
      }, 500);
    }
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setShowTooltip(false);
  };

  // Tooltip rendered via portal to escape overflow:hidden containers
  const tooltip = showTooltip && isTruncated && typeof document !== 'undefined' ? createPortal(
    <span
      className="fixed z-[9999] max-w-[320px] px-3 py-2 text-xs text-white bg-black/95 backdrop-blur-md rounded-xl shadow-2xl border border-emerald-500/20 animate-tooltip-fade-in whitespace-normal break-words pointer-events-none"
      style={{
        top: tooltipPosition.top,
        left: tooltipPosition.left,
      }}
      role="tooltip"
    >
      {/* Glow effect */}
      <span className="absolute inset-0 rounded-xl bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none" />
      <span className="relative">{text}</span>
      {/* Arrow */}
      <span className="absolute -top-1.5 left-4 w-3 h-3 bg-black/95 border-l border-t border-emerald-500/20 transform rotate-45" />
    </span>,
    document.body
  ) : null;

  return (
    <span className="relative block">
      <span
        ref={textRef}
        className={`block truncate cursor-default ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {text}
      </span>
      {tooltip}
    </span>
  );
}
