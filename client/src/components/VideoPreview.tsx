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
  const [isVideoLoaded, setIsVideoLoaded] = useState(false); // Added isVideoLoaded state
  const [hasError, setHasError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);

  // Resolve S3 URL or thumbnail URL if needed
  useEffect(() => {
    let isMounted = true;
    let retryTimeout: ReturnType<typeof setTimeout>;

    async function resolveVideoUrl() {
      // Process URLs that might need resolution (S3 or thumbnail URLs)
      if (!src.startsWith('/api/s3/') && 
          !src.includes('s3.amazonaws.com') && 
          !src.includes('/api/videos/') && 
          !src.includes('thumbnail')) {
        setResolvedUrl(src);
        return;
      }

      try {
        setIsLoadingUrl(true);
        console.log('VideoPreview: Resolving URL for:', src);
        const url = await fetchS3Url(src, 2); // Try up to 2 times

        if (!isMounted) return;

        if (url) {
          setResolvedUrl(url);
          console.log('VideoPreview: Successfully resolved URL to:', url.substring(0, 50) + '...');
        } else {
          throw new Error('Failed to resolve video URL');
        }
      } catch (err) {
        if (!isMounted) return;

        console.error('VideoPreview: Error resolving URL:', err);
        // Fallback to direct URL
        setResolvedUrl(src);
        setHasError(true);
      } finally {
        if (isMounted) setIsLoadingUrl(false);
      }
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

    if (isHovered && isVideoLoaded) { // Use isVideoLoaded
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
  }, [isHovered, isVideoLoaded, previewDuration, src, isPlaying]);

  // Set duration limit on the video
  useEffect(() => {
    if (!videoRef.current || !isVideoLoaded) return; // Use isVideoLoaded

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
  }, [isVideoLoaded, previewDuration, src]);

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
        preload="auto"
        loop={false}
      />

      {/* Playback icon shown when video is hovered but not yet playing */}
      {isHovered && !isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/50 rounded-full p-3">
            <div className="w-5 h-5 border-t-2 border-r-2 border-white animate-spin rounded-full"></div>
          </div>
        </div>
      )}
    </div>
  );
}