import React, { useState, useRef, useEffect } from 'react';
import ImageCard from './ImageCard';
import { Video } from '@shared/schema';

interface LazyImageCardProps {
  image: Video;
  className?: string;
}

export default function LazyImageCard({ image, className }: LazyImageCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentRef = cardRef.current;
    if (!currentRef) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !hasLoaded) {
          setIsVisible(true);
          setHasLoaded(true);
          // Stop observing once loaded
          observer.unobserve(currentRef);
        }
      },
      {
        // Load content when it's 200px away from entering viewport
        rootMargin: '200px',
        threshold: 0.1,
      }
    );

    observer.observe(currentRef);

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasLoaded]);

  return (
    <div 
      ref={cardRef} 
      className={className}
    >
      {isVisible ? (
        <ImageCard image={image} />
      ) : (
        // Placeholder with same dimensions to prevent layout shift
        <div className="bg-gray-800 animate-pulse rounded-lg aspect-square">
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500 text-sm">Loading...</div>
          </div>
        </div>
      )}
    </div>
  );
}
