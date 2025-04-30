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
  const [isLoaded, setIsLoaded] = useState(false);

  // Initial video setup
  useEffect(() => {
    if (!videoRef.current) return;
    
    const video = videoRef.current;
    
    // Ensure video is always muted to allow autoplay
    video.muted = true;
    video.playsInline = true;
    video.loop = true;
    
    // Log when component mounts
    console.log('PreviewableVideo mounted for:', src);
    
    const handleCanPlay = () => {
      console.log('Video can play event triggered:', src);
      setCanPlay(true);
      setIsLoaded(true);
      
      // Try to play immediately if isPlaying is true
      if (isPlaying) {
        playVideo();
      }
    };
    
    const handleLoadedData = () => {
      console.log('Video loaded data event triggered:', src);
      setIsLoaded(true);
    };
    
    const handleError = (e: Event) => {
      console.error('Video error for', src, e);
      setHasError(true);
    };
    
    // Set up event listeners
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('error', handleError);
    
    // Start loading the video
    video.load();
    
    // Cleanup
    return () => {
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('error', handleError);
      
      try {
        video.pause();
        video.src = '';
        video.load();
      } catch (err) {
        console.error('Cleanup error:', err);
      }
    };
  }, [src]); // Only re-run if src changes
  
  // Function to play video with error handling
  const playVideo = () => {
    if (!videoRef.current) return;
    
    try {
      console.log('Attempting to play video:', src);
      
      // Reset to beginning for better preview experience
      videoRef.current.currentTime = 0;
      
      // Play with promise handling for browsers that return a promise
      const playPromise = videoRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('Video playing successfully:', src);
          })
          .catch(error => {
            console.error('Autoplay prevented by browser:', error);
            // Try one more time with user interaction simulation
            document.addEventListener('mousemove', function playOnce() {
              if (videoRef.current) {
                videoRef.current.play().catch(e => {
                  console.error('Still cannot play after user interaction:', e);
                });
              }
              document.removeEventListener('mousemove', playOnce);
            });
          });
      }
    } catch (err) {
      console.error('Error playing video:', err);
    }
  };
  
  // Handle play/pause based on isPlaying prop changes
  useEffect(() => {
    if (!videoRef.current) return;
    
    console.log('Play state changed to:', isPlaying, 'for video:', src);
    
    if (isPlaying && (canPlay || isLoaded)) {
      playVideo();
    } else if (!isPlaying) {
      try {
        videoRef.current.pause();
      } catch (err) {
        console.error('Error pausing video:', err);
      }
    }
  }, [isPlaying, canPlay, isLoaded, src]);

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
      autoPlay={isPlaying} // Add explicit autoPlay attribute based on isPlaying
      preload="auto"
    />
  );
}