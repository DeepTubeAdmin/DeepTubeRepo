import { useEffect, useRef, useState, useContext } from 'react';
import { fetchS3Url } from '@/lib/utils';

// Global variable to track if user has interacted with the page
let userHasInteracted = false;

// Helper function to mark user interaction
const markUserInteraction = () => {
  userHasInteracted = true;
  
  // Remove all listeners once interaction is detected
  ['click', 'touchstart', 'keydown', 'scroll', 'mousedown'].forEach(event => {
    window.removeEventListener(event, markUserInteraction);
  });
};

// Add global event listeners when this module loads
if (typeof window !== 'undefined') {
  // Add listeners for each interaction type
  ['click', 'touchstart', 'keydown', 'scroll', 'mousedown'].forEach(event => {
    window.addEventListener(event, markUserInteraction, { once: true });
  });
}

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
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  // Always assume user has interacted to avoid showing play buttons
  const [hasUserInteracted, setHasUserInteracted] = useState(true);

  // Listen for the first user interaction with the page
  useEffect(() => {
    if (hasUserInteracted) return; // Already detected

    const checkInteraction = () => {
      setHasUserInteracted(true);
      userHasInteracted = true; // Update the global variable
    };
    
    // Add event listeners for user interactions
    window.addEventListener('click', checkInteraction);
    window.addEventListener('touchstart', checkInteraction);
    window.addEventListener('keydown', checkInteraction);
    
    return () => {
      window.removeEventListener('click', checkInteraction);
      window.removeEventListener('touchstart', checkInteraction);
      window.removeEventListener('keydown', checkInteraction);
    };
  }, [hasUserInteracted]);

  // Resolve S3 URL or thumbnail URL if needed
  useEffect(() => {
    let isMounted = true;
    let retryTimeout: ReturnType<typeof setTimeout>;

    async function resolveVideoUrl() {
      // Clean path for workspace references
      let cleanedSrc = src;
      
      // If the URL contains workspace paths, extract just the uploads part
      if (src.includes('/home/runner/workspace/')) {
        const match = src.match(/\/home\/runner\/workspace\/(.+)/);
        if (match && match[1]) {
          cleanedSrc = `/${match[1]}`;
          console.log(`VideoPreview: Cleaned workspace path: ${src} → ${cleanedSrc}`);
        }
      }
      
      // Special case for absolute path references that should be relative
      if (cleanedSrc.startsWith('/api/s3/home/')) {
        const pathParts = cleanedSrc.split('/home/');
        if (pathParts.length > 1) {
          // Extract just the filename
          const fileParts = pathParts[1].split('/');
          cleanedSrc = `/uploads/videos/${fileParts[fileParts.length - 1]}`;
          console.log(`VideoPreview: Converted absolute path: ${src} → ${cleanedSrc}`);
        }
      }
      
      // Special case for S3 URLs
      if (cleanedSrc.startsWith('/api/s3/')) {
        setIsLoadingUrl(true);
        try {
          console.log(`VideoPreview: Fetching signed URL for ${cleanedSrc}`);
          
          // Add a timestamp to prevent caching
          const timestamp = Date.now();
          const url = `${cleanedSrc}?getUrl=true&t=${timestamp}`;
          
          const response = await fetch(url);
          const data = await response.json();
          
          if (data.url) {
            setResolvedUrl(data.url);
            console.log(`VideoPreview: Resolved URL successfully for ${cleanedSrc}`);
          } else {
            throw new Error('No URL in response');
          }
        } catch (err) {
          console.error('Failed to resolve video URL:', err);
          
          // Try alternate endpoint format for videos
          try {
            // Convert /api/s3/uploads/... to /api/videos/{id} format
            const filenameParts = cleanedSrc.split('/');
            const filename = filenameParts[filenameParts.length - 1]; 
            const fileId = filename.split('-')[1]?.split('.')[0]; // Extract ID from file name
            
            if (fileId) {
              const alternateUrl = `/api/videos/${fileId}/direct?t=${Date.now()}`;
              console.log(`VideoPreview: Trying alternate URL: ${alternateUrl}`);
              
              const altResponse = await fetch(alternateUrl);
              if (altResponse.ok) {
                const altData = await altResponse.json();
                if (altData.url) {
                  setResolvedUrl(altData.url);
                  console.log(`VideoPreview: Alternate URL successful for ${cleanedSrc}`);
                  setIsLoadingUrl(false);
                  return;
                }
              }
            }
          } catch (altErr) {
            console.error('Alternative URL also failed:', altErr);
          }
          
          // Last resort - use direct path
          console.log(`VideoPreview: Using direct path as fallback: ${cleanedSrc}`);
          setResolvedUrl(cleanedSrc);
          
        } finally {
          setIsLoadingUrl(false);
        }
        return;
      }
      
      // For any other URL formats, use as-is
      setResolvedUrl(cleanedSrc);
    }

    resolveVideoUrl();

    return () => {
      isMounted = false;
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [src]);

  // Debug logs to track component state
  useEffect(() => {
    console.log(`VideoPreview for ${src.substring(0, 30)}... - isHovered: ${isHovered}, isLoaded: ${isVideoLoaded}, isPlaying: ${isPlaying}`);
  }, [src, isHovered, isVideoLoaded, isPlaying]);

  // Initialize video on mount
  useEffect(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.loop = true; // Enable looping for smoother preview

    // Force attributes for mobile compatibility
    video.setAttribute('muted', 'true');
    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');
    video.setAttribute('x5-playsinline', 'true');
    video.setAttribute('x5-video-player-type', 'h5');

    console.log(`VideoPreview: initializing video for ${src.substring(0, 30)}...`);

    const handleCanPlay = () => {
      console.log(`VideoPreview: canplay event for ${src.substring(0, 30)}...`);
      setIsVideoLoaded(true); // Use setIsVideoLoaded

      // If component mounted while hovered, start playing immediately
      if (isHovered && !isPlaying) {
        playVideo();
      }
    };

    const handleLoadedData = () => {
      console.log(`VideoPreview: loadeddata event for ${src.substring(0, 30)}...`);
      setIsVideoLoaded(true); // Use setIsVideoLoaded

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

  // State to track if autoplay was blocked due to lack of user interaction
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  
  // Function to handle video playback optimized for muted autoplay
  const playVideo = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;

    try {
      // Explicitly ensure the video is muted for autoplay
      video.muted = true;
      video.volume = 0;
      
      // Apply muted and other attributes directly
      video.setAttribute('muted', '');
      video.setAttribute('playsinline', '');
      
      // Ensure loop is enabled
      video.loop = true;
      
      console.log(`VideoPreview: attempting to play muted video for ${src.substring(0, 30)}...`);

      // Play with promise handling for browsers that return a promise
      const playPromise = video.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log(`VideoPreview: successfully playing ${src.substring(0, 30)}...`);
            setIsPlaying(true);
            setAutoplayBlocked(false); // Reset blocked state on success
          })
          .catch(error => {
            console.error('VideoPreview: autoplay prevented:', error);
            setIsPlaying(false);
            setAutoplayBlocked(true);
          });
      } else {
        // For older browsers that don't return a promise
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('VideoPreview: Error starting video:', err);
      setIsPlaying(false);
      setAutoplayBlocked(true);
    }
  };

  // Handle hover state changes
  useEffect(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;

    if (isHovered && isVideoLoaded) { // Use isVideoLoaded
      // Play video when hovered and loaded
      playVideo();
      
      // We no longer set a timeout to pause the video - let it play completely
      
    } else if (!isHovered && isPlaying) {
      // Pause video when mouse leaves
      console.log(`VideoPreview: pausing on mouse leave for ${src.substring(0, 30)}...`);
      video.pause();
      video.currentTime = 0; // Reset to beginning
      setIsPlaying(false);
    }
  }, [isHovered, isVideoLoaded, src, isPlaying]);

  // We've removed the duration limit so videos play completely on hover

  // Show loading state during URL resolution
  if (isLoadingUrl) {
    return (
      <div className="relative w-full h-full">
        <img 
          src={poster} 
          alt="Video thumbnail" 
          className={`w-full h-full object-cover ${className}`}
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="w-6 h-6 border-2 border-t-primary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  // Show error state with poster image
  if (hasError || !resolvedUrl) {
    return (
      <img 
        src={poster} 
        alt="Video thumbnail" 
        className={`w-full h-full object-cover ${className}`}
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

      {/* Video element that plays on hover - use the resolved URL */}
      <video
        ref={videoRef}
        className={`absolute inset-0 w-full h-full object-cover ${isHovered ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300 ${className}`}
        src={resolvedUrl}
        muted
        playsInline
        autoPlay={isHovered}
        loop
        preload="auto"
        disablePictureInPicture
        disableRemotePlayback
        x5-video-player-type="h5"
        x5-playsinline="true"
        webkit-playsinline="true"
        data-testid="video-preview"
      />

      {/* Autoplay blocked message with manual play option */}
      {isHovered && autoplayBlocked && (
        <div 
          className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white cursor-pointer z-20"
          onClick={(e) => {
            e.stopPropagation(); // Prevent parent click handlers
            markUserInteraction(); // Mark that user has interacted
            userHasInteracted = true; // Force the flag to be true
            setHasUserInteracted(true); // Update state
            setAutoplayBlocked(false); // Clear the blocked state
            
            // Try to play all videos on the page now that user has interacted
            document.querySelectorAll('video').forEach(video => {
              if (video.paused) {
                video.muted = true;
                video.play().catch(() => {/* Ignore errors */});
              }
            });
            
            // Try to play this specific video
            if (videoRef.current) {
              videoRef.current.muted = true;
              videoRef.current.play()
                .then(() => {
                  setIsPlaying(true);
                  console.log(`VideoPreview: manual play successful for ${src.substring(0, 30)}...`);
                })
                .catch(err => {
                  console.error('VideoPreview: manual play failed:', err);
                });
            }
          }}
        >
          <div className="bg-orange-500 rounded-full p-3 animate-pulse">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm font-medium mt-3 px-4 text-center">Click to enable video previews</p>
          <p className="text-xs px-4 text-center mt-1 text-gray-300">Browser requires interaction to autoplay videos</p>
        </div>
      )}

      {/* Loading spinner when trying to play */}
      {isHovered && !isPlaying && !autoplayBlocked && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/50 rounded-full p-3">
            <div className="w-5 h-5 border-t-2 border-r-2 border-white animate-spin rounded-full"></div>
          </div>
        </div>
      )}
    </div>
  );
}