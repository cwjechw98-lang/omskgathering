import { useCallback, useRef } from 'react';

interface UseDoubleTapOptions {
  onDoubleTap: () => void;
  delay?: number;
}

/**
 * Hook for handling double-tap/click interactions
 * Works for both touch and mouse events
 */
export function useDoubleTap({ onDoubleTap, delay = 250 }: UseDoubleTapOptions) {
  const lastTapTime = useRef<number>(0);
  const tapTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleTap = useCallback(() => {
    const now = Date.now();
    const timeDiff = now - lastTapTime.current;

    if (timeDiff < delay) {
      // Double tap detected
      if (tapTimeout.current) {
        clearTimeout(tapTimeout.current);
        tapTimeout.current = null;
      }
      onDoubleTap();
    } else {
      // First tap - wait for second
      if (tapTimeout.current) {
        clearTimeout(tapTimeout.current);
      }
      tapTimeout.current = setTimeout(() => {
        tapTimeout.current = null;
      }, delay);
    }

    lastTapTime.current = now;
  }, [onDoubleTap, delay]);

  // Cleanup timeout on unmount
  useCallback(() => {
    return () => {
      if (tapTimeout.current) {
        clearTimeout(tapTimeout.current);
      }
    };
  }, []);

  return {
    onClick: handleTap,
    onTouchEnd: handleTap,
  };
}
