import { useState, useCallback, useEffect } from 'react';

export interface UseFullscreenReturn {
  isFullscreen: boolean;
  enterFullscreen: () => void;
  exitFullscreen: () => void;
  toggleFullscreen: () => void;
}

/**
 * Custom hook to manage fullscreen state
 * Provides functions to enter, exit, and toggle fullscreen mode
 */
export function useFullscreen(): UseFullscreenReturn {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Keep internal state in sync with the native Fullscreen API
  useEffect(() => {
    const handleChange = () => {
      const active =
        typeof document !== 'undefined' && !!document.fullscreenElement;
      setIsFullscreen(active);
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('fullscreenchange', handleChange);
      // Safari older versions
      (
        document as Document & { webkitExitFullscreen?: () => void }
      ).addEventListener('webkitfullscreenchange', handleChange);
    }
    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('fullscreenchange', handleChange);
        (
          document as Document & { webkitExitFullscreen?: () => void }
        ).removeEventListener('webkitfullscreenchange', handleChange);
      }
    };
  }, []);

  const enterFullscreen = useCallback(async () => {
    // Optimistically update state so we still provide a CSS-based fullscreen fallback
    setIsFullscreen(true);

    // Attempt native fullscreen for true OS-level fullscreen
    try {
      if (typeof document !== 'undefined') {
        const element = document.documentElement as HTMLElement & {
          webkitRequestFullscreen?: () => Promise<void>;
          msRequestFullscreen?: () => Promise<void>;
        };
        if (element.requestFullscreen) {
          await element.requestFullscreen();
        } else if (element.webkitRequestFullscreen) {
          // Safari
          await element.webkitRequestFullscreen();
        } else if (element.msRequestFullscreen) {
          // IE/Edge legacy
          await element.msRequestFullscreen();
        }
      }
    } catch {
      // Ignore errors; CSS fallback already applied via state
    }
  }, []);

  const exitFullscreen = useCallback(() => {
    setIsFullscreen(false);
    try {
      if (typeof document !== 'undefined') {
        const doc = document as Document & {
          webkitExitFullscreen?: () => void;
          msExitFullscreen?: () => void;
        };
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if (doc.webkitExitFullscreen) {
          doc.webkitExitFullscreen();
        } else if (doc.msExitFullscreen) {
          doc.msExitFullscreen();
        }
      }
    } catch {
      // no-op
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  return {
    isFullscreen,
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen,
  };
}

// Sync isFullscreen with native fullscreen changes
export function useFullscreenSync(onChange: (active: boolean) => void) {
  useEffect(() => {
    const handleChange = () => {
      const active =
        typeof document !== 'undefined' && !!document.fullscreenElement;
      onChange(active);
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('fullscreenchange', handleChange);
    }
    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('fullscreenchange', handleChange);
      }
    };
  }, [onChange]);
}
