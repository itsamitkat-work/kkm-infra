import * as React from 'react';

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;
const DESKTOP_BREAKPOINT = 1280;

export type Breakpoint = 'sm' | 'md' | 'lg' | 'xl';

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(false);
  const [hasMounted, setHasMounted] = React.useState(false);

  React.useEffect(() => {
    setHasMounted(true);
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener('change', onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  // Return false during SSR and initial render to prevent hydration mismatch
  if (!hasMounted) {
    return false;
  }

  return isMobile;
}

export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = React.useState<Breakpoint>('lg');
  const [hasMounted, setHasMounted] = React.useState(false);

  React.useEffect(() => {
    setHasMounted(true);

    const updateBreakpoint = () => {
      const width = window.innerWidth;
      if (width < MOBILE_BREAKPOINT) {
        setBreakpoint('sm');
      } else if (width < TABLET_BREAKPOINT) {
        setBreakpoint('md');
      } else if (width < DESKTOP_BREAKPOINT) {
        setBreakpoint('lg');
      } else {
        setBreakpoint('xl');
      }
    };

    // Set up media query listeners for each breakpoint
    const mobileQuery = window.matchMedia(
      `(max-width: ${MOBILE_BREAKPOINT - 1}px)`
    );
    const tabletQuery = window.matchMedia(
      `(min-width: ${MOBILE_BREAKPOINT}px) and (max-width: ${
        TABLET_BREAKPOINT - 1
      }px)`
    );
    const desktopQuery = window.matchMedia(
      `(min-width: ${TABLET_BREAKPOINT}px) and (max-width: ${
        DESKTOP_BREAKPOINT - 1
      }px)`
    );
    const xlQuery = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`);

    const handleChange = () => updateBreakpoint();

    mobileQuery.addEventListener('change', handleChange);
    tabletQuery.addEventListener('change', handleChange);
    desktopQuery.addEventListener('change', handleChange);
    xlQuery.addEventListener('change', handleChange);

    // Initial check
    updateBreakpoint();

    return () => {
      mobileQuery.removeEventListener('change', handleChange);
      tabletQuery.removeEventListener('change', handleChange);
      desktopQuery.removeEventListener('change', handleChange);
      xlQuery.removeEventListener('change', handleChange);
    };
  }, []);

  // Return lg during SSR and initial render to prevent hydration mismatch
  if (!hasMounted) {
    return 'lg';
  }

  return breakpoint;
}
