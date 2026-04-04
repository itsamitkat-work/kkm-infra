'use client';

import React from 'react';

export function useScrollCollapse() {
  const [scrollY, setScrollY] = React.useState(0);

  React.useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Simple progress for compact mode transition
  const isCollapsed = scrollY > 50;
  const progress = Math.min(scrollY / 100, 1);

  return { scrollY, isCollapsed, progress };
}
