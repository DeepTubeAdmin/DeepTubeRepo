import { useEffect, useRef, useState } from 'react';
import { fetchS3Url } from '@/lib/utils';

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
  const [isPlaying, setIsPlaying] = useState(false);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  
  // Debug logs to track component state
  useEffect(() => {
    console.log(`VideoPreview for ${src.substring(0, 30)}... - isHovered: ${isHovered}, isLoaded: ${isLoaded}, isPlaying: ${isPlaying}`);
  }, [src, isHovered, isLoaded, isPlaying]);
  
  // Initialize video on mount
  useEffect(() => {
    if (!videoRef.current) return;
    
    const video = videoRef.current;
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto"; // Changed from metadata to auto for better preview experience
    
    // Ensure these attributes are set in HTML as well
    video.setAttribute('muted', 'true');
    video.setAttribute('playsinline', 'true');
    
    console.log(`VideoPreview: initializing video for ${src.substring(0, 30)}...`);
    
    const handleCanPlay = () => {
      console.log(`VideoPreview: canplay event for ${src.substring(0, 30)}...`);
      setIsLoaded(true);
      
      // If component mounted while hovered, start playing immediately
      if (isHovered && !isPlaying) {
        playVideo();
      }
    };
    
    const handleLoadedData = () => {
      console.log(`VideoPreview: loadeddata event for ${src.substring(0, 30)}...`);
      setIsLoaded(true);
      
      // If component mounted while hovered, start playing immediately
      if (isHovered && !isPlaying) {
        playVideo();
      }
    };
    
    const handleError = (e: Event) => {
      console.error('VideoPreview: error for', src, e);
      setHasError(true);
    };
    
    // Set up event listeners
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('error', handleError);
    
    // Load the video
    video.load();
    
    // Cleanup
    return () => {
      console.log(`VideoPreview: cleaning up video for ${src.substring(0, 30)}...`);
      
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('error', handleError);
      
      try {
        video.pause();
        setIsPlaying(false);
        video.removeAttribute('src');
        video.load();
      } catch (err) {
        console.error('Cleanup error:', err);
      }
    };
  }, [src, isHovered]); // Added isHovered to dependencies
  
  // Function to handle video playback with all necessary error handling
  const playVideo = () => {
    if (!videoRef.current) return;
    
    const video = videoRef.current;
    
    try {
      // Reset to beginning for consistent preview experience
      video.currentTime = 0;
      
      console.log(`VideoPreview: attempting to play video for ${src.substring(0, 30)}...`);
      
      // Play with promise handling for browsers that return a promise
      const playPromise = video.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log(`VideoPreview: successfully playing ${src.substring(0, 30)}...`);
            setIsPlaying(true);
          })
          .catch(error => {
            console.error('VideoPreview: autoplay prevented:', error);
            setIsPlaying(false);
            
            // Try one more time with user interaction simulation
            const handleUserInteraction = () => {
              if (videoRef.current && isHovered) {
                console.log(`VideoPreview: retrying play after user interaction for ${src.substring(0, 30)}...`);
                videoRef.current.play()
                  .then(() => {
                    setIsPlaying(true);
                  })
                  .catch(e => {
                    console.error('VideoPreview: still cannot play after user interaction:', e);
                  });
              }
              document.removeEventListener('mousemove', handleUserInteraction);
            };
            
            document.addEventListener('mousemove', handleUserInteraction, { once: true });
          });
      } else {
        // For older browsers that don't return a promise
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('VideoPreview: Error starting video:', err);
      setIsPlaying(false);
    }
  };
  
  // Handle hover state changes
  useEffect(() => {
    if (!videoRef.current) return;
    
    const video = videoRef.current;
    
    if (isHovered && isLoaded) {
      // Play video when hovered and loaded
      playVideo();
      
      // Set a timeout to pause the video after previewDuration seconds
      const timeoutId = setTimeout(() => {
        if (videoRef.current && !videoRef.current.paused) {
          console.log(`VideoPreview: pausing after ${previewDuration}s for ${src.substring(0, 30)}...`);
          videoRef.current.pause();
          setIsPlaying(false);
        }
      }, previewDuration * 1000);
      
      return () => clearTimeout(timeoutId);
    } else if (!isHovered && isPlaying) {
      // Pause video when mouse leaves
      console.log(`VideoPreview: pausing on mouse leave for ${src.substring(0, 30)}...`);
      video.pause();
      video.currentTime = 0; // Reset to beginning
      setIsPlaying(false);
    }
  }, [isHovered, isLoaded, previewDuration, src, isPlaying]);
  
  // Set duration limit on the video
  useEffect(() => {
    if (!videoRef.current || !isLoaded) return;
    
    const video = videoRef.current;
    
    const handleTimeUpdate = () => {
      // If the video has played for previewDuration seconds, pause it
      if (video.currentTime >= previewDuration && !video.paused) {
        console.log(`VideoPreview: reached duration limit of ${previewDuration}s for ${src.substring(0, 30)}...`);
        video.pause();
        setIsPlaying(false);
      }
    };
    
    video.addEventListener('timeupdate', handleTimeUpdate);
    
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [isLoaded, previewDuration, src]);
  
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
    <div className="relative w-full h-full">
      {/* Always show the poster image as the base layer */}
      <img 
        src={poster} 
        alt="Video thumbnail" 
        className={`absolute inset-0 w-full h-full object-cover ${className}`}
      />
      
      {/* Video element that plays on hover */}
      <video
        ref={videoRef}
        className={`absolute inset-0 w-full h-full object-cover ${isHovered ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300 ${className}`}
        src={src}
        muted
        playsInline
        preload="auto"
        loop={false}
      />
      
      {/* Debug overlay */}
      <div className="absolute bottom-0 left-0 bg-black/70 text-white text-xs p-1 z-50">
        {isHovered ? 'Hovered' : 'Not Hovered'} | 
        {isLoaded ? 'Loaded' : 'Loading'} | 
        {isPlaying ? 'Playing' : 'Paused'}
      </div>
    </div>
  );
}