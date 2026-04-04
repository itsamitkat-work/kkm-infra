'use client';

export const usePlatform = () => {
  return { isMac: window.navigator.platform.toUpperCase().indexOf('MAC') >= 0 };
};
