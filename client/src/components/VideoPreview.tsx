import { useEffect, useRef, useState } from 'react';

interface VideoPreviewProps {
  src: string;
  poster: string;
  isHovered: boolean;
  width?: string;
  height?: string;
  className?: string;
  previewDuration?: number; // in seconds, defaults to 5
}

export default function VideoPreview({
  src,
  poster,
  isHovered,
  width = '100%',
  height = '100%',
  className = '',
  previewDuration = 5
}: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  
  // Load and prepare video on mount
  useEffect(() => {
    if (!videoRef.current) return;
    
    const video = videoRef.current;
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata"; // Only preload metadata initially
    
    const handleCanPlay = () => {
      setIsLoaded(true);
    };
    
    const handleError = (e: Event) => {
      console.error('Video preview error for', src, e);
      setHasError(true);
    };
    
    // Set up event listeners
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);
    
    // Load just the video metadata
    video.load();
    
    // Cleanup
    return () => {
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
      
      try {
        video.pause();
        video.removeAttribute('src');
        video.load();
      } catch (err) {
        console.error('Cleanup error:', err);
      }
    };
  }, [src]);
  
  // Handle hover state changes
  useEffect(() => {
    if (!videoRef.current || !isLoaded) return;
    
    const video = videoRef.current;
    
    if (isHovered) {
      // Set to beginning and start playing when hovered
      video.currentTime = 0;
      
      // Play with promise handling for browsers that return a promise
      const playPromise = video.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error('Preview autoplay prevented:', error);
        });
      }
      
      // Set a timeout to pause the video after previewDuration seconds
      const timeoutId = setTimeout(() => {
        // If still playing and near the end, pause
        if (!video.paused && video.currentTime >= previewDuration - 0.5) {
          video.pause();
          // Reset to beginning for next hover
          video.currentTime = 0;
        }
      }, previewDuration * 1000);
      
      return () => clearTimeout(timeoutId);
    } else {
      // Pause the video when not hovered
      video.pause();
      // Reset to beginning
      video.currentTime = 0;
    }
  }, [isHovered, isLoaded, previewDuration, src]);
  
  // Set duration limit on the video
  useEffect(() => {
    if (!videoRef.current || !isLoaded) return;
    
    const video = videoRef.current;
    
    const handleTimeUpdate = () => {
      // If the video has played for previewDuration seconds, pause it
      if (video.currentTime >= previewDuration) {
        video.pause();
        // Don't reset to beginning here, let the hover effect handle that
      }
    };
    
    video.addEventListener('timeupdate', handleTimeUpdate);
    
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [isLoaded, previewDuration]);
  
  if (hasError) {
    return (
      <img 
        src={poster} 
        alt="Video thumbnail" 
        className={className}
        style={{ width, height }}
      />
    );
  }
  
  return (
    <>
      {/* Always show the poster image as the base layer */}
      <img 
        src={poster} 
        alt="Video thumbnail" 
        className={`absolute inset-0 w-full h-full object-cover ${className}`}
        style={{ width, height }}
      />
      
      {/* Video element that plays on hover */}
      <video
        ref={videoRef}
        className={`absolute inset-0 w-full h-full object-cover ${isHovered ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300 ${className}`}
        style={{ width, height }}
        src={src}
        muted
        playsInline
        preload="metadata"
      />
    </>
  );
}