import { useEffect, useRef } from 'react';

export const useAutoScroll = (dependencies: any[]) => {
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll vers la preview après un court délai
    const timer = setTimeout(() => {
      if (previewRef.current) {
        previewRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, dependencies);

  return previewRef;
};