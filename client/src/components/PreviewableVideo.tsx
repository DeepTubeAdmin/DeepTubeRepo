import { useEffect, useRef, useState } from 'react';

interface PreviewableVideoProps {
  src: string;
  poster?: string;
  isPlaying: boolean;
  width?: string;
  height?: string;
  className?: string;
}

export default function PreviewableVideo({
  src,
  poster,
  isPlaying,
  width = '100%',
  height = '100%',
  className = ''
}: PreviewableVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [canPlay, setCanPlay] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!videoRef.current) return;
    
    const video = videoRef.current;
    
    const handleCanPlay = () => {
      console.log('Video can play:', src);
      setCanPlay(true);
      if (isPlaying) {
        try {
          video.currentTime = 0;
          const playPromise = video.play();
          if (playPromise) {
            playPromise.catch(error => {
              console.error('Auto-play prevented by browser:', error);
              // We don't set error state here as it might be just autoplay restriction
            });
          }
        } catch (err) {
          console.error('Error playing video:', err);
        }
      }
    };
    
    const handleError = (e: Event) => {
      console.error('Video error for', src, e);
      setHasError(true);
    };
    
    // Set up event listeners
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);
    
    // Cleanup
    return () => {
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
      
      try {
        video.pause();
        video.src = '';
        video.load();
      } catch (err) {
        console.error('Cleanup error:', err);
      }
    };
  }, [src]);
  
  // Handle play/pause based on isPlaying prop
  useEffect(() => {
    if (!videoRef.current || !canPlay) return;
    
    console.log('Play state change:', isPlaying, 'for', src);
    
    if (isPlaying) {
      try {
        videoRef.current.currentTime = 0;
        const playPromise = videoRef.current.play();
        if (playPromise) {
          playPromise.catch(error => {
            console.error('Play prevented:', error);
          });
        }
      } catch (err) {
        console.error('Error playing on hover:', err);
      }
    } else {
      try {
        videoRef.current.pause();
      } catch (err) {
        console.error('Error pausing:', err);
      }
    }
  }, [isPlaying, canPlay, src]);

  if (hasError) {
    return (
      <div 
        className={`bg-gray-800 flex items-center justify-center text-gray-400 ${className}`}
        style={{ width, height }}
      >
        Video unavailable
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      className={className}
      style={{ width, height }}
      src={src}
      poster={poster}
      muted
      playsInline
      loop
      preload="auto"
    />
  );
}