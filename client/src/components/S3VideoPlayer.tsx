import { useState, useEffect, useRef } from "react";
import { fetchS3Url } from "@/lib/utils";

interface S3VideoPlayerProps {
  videoUrl: string;
  title: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  playsInline?: boolean;
  className?: string;
  onLoad?: () => void;
  onError?: (error: any) => void;
}

export default function S3VideoPlayer({
  videoUrl,
  title,
  autoPlay = true,
  muted = false,
  loop = false,
  playsInline = true,
  className = "",
  onLoad,
  onError
}: S3VideoPlayerProps) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let isMounted = true;
    let retryTimeout: ReturnType<typeof setTimeout>;
    
    async function resolveVideoUrl() {
      try {
        setLoading(true);
        
        // Attempt to resolve URL with retry logic built into fetchS3Url
        console.log('S3VideoPlayer: Resolving URL for:', videoUrl);
        const url = await fetchS3Url(videoUrl, 3); // Try up to 3 times
        
        if (!isMounted) return;
        
        if (url) {
          setResolvedUrl(url);
          if (url.startsWith('http')) {
            console.log('S3VideoPlayer: Successfully resolved URL:', url.substring(0, 50) + '...');
          }
        } else {
          throw new Error('Failed to resolve video URL');
        }
      } catch (err) {
        if (!isMounted) return;
        
        console.error('S3VideoPlayer: Error resolving video URL:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        
        // For non-S3 URLs, try again once more after a delay (may be a temporary network issue)
        if (!videoUrl.startsWith('/api/s3/')) {
          console.log('S3VideoPlayer: Will retry regular URL in 2 seconds');
          retryTimeout = setTimeout(() => {
            if (isMounted) setResolvedUrl(videoUrl);
          }, 2000);
        }
        
        if (onError) onError(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    
    resolveVideoUrl();
    
    return () => {
      isMounted = false;
      if (retryTimeout) clearTimeout(retryTimeout);
      
      // Ensure video is properly cleaned up to prevent memory leaks
      if (videoRef.current) {
        try {
          const videoEl = videoRef.current;
          videoEl.pause();
          videoEl.removeAttribute('src');
          videoEl.load();
        } catch (e) {
          console.error('Error cleaning up video:', e);
        }
      }
    };
  }, [videoUrl, onError]);

  // Ensure autoplay works after video loads
  useEffect(() => {
    if (!videoRef.current || !autoPlay) return;
    
    const video = videoRef.current;
    
    const handleLoadedData = () => {
      // Ensure video is muted for autoplay
      video.muted = true;
      // Try to play if autoplay is enabled
      video.play().catch(error => {
        console.warn('S3VideoPlayer autoplay prevented:', error);
      });
    };

    video.addEventListener('loadeddata', handleLoadedData);
    
    return () => {
      video.removeEventListener('loadeddata', handleLoadedData);
    };
  }, [autoPlay, resolvedUrl]);

  // Show loading state
  if (loading) {
    return <div className="animate-pulse bg-gray-800 w-full h-full rounded"></div>;
  }

  // Show error state
  if (error || !resolvedUrl) {
    return (
      <div className="bg-red-600/20 border border-red-600 rounded-md p-4 text-center">
        Error loading video. It may be in an unsupported format.
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      src={resolvedUrl}
      title={title}
      className={`w-full h-full ${className}`}
      controls
      autoPlay={autoPlay}
      muted={autoPlay ? true : muted}
      loop={loop}
      playsInline={playsInline}
      webkit-playsinline="true"
      x5-playsinline="true"
      x5-video-player-type="h5"
      disablePictureInPicture
      disableRemotePlayback
      onLoadedData={() => {
        if (onLoad) onLoad();
      }}
      onError={(e) => {
        console.error(`Video loading error:`, e);
        if (onError) onError(e);
      }}
      crossOrigin="anonymous"
    />
  );
}
