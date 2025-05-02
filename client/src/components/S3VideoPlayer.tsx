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
    
    async function resolveVideoUrl() {
      try {
        setLoading(true);
        
        // Only fetch S3 URL if it's an S3 URL
        if (videoUrl.startsWith('/api/s3/')) {
          console.log('S3VideoPlayer: Resolving S3 URL:', videoUrl);
          const url = await fetchS3Url(videoUrl);
          if (isMounted) setResolvedUrl(url);
          console.log('S3VideoPlayer: Resolved URL:', url ? url.substring(0, 50) + '...' : null);
        } else {
          // Otherwise use the original URL
          if (isMounted) setResolvedUrl(videoUrl);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error resolving video URL:', err);
          setError(err instanceof Error ? err : new Error(String(err)));
          if (onError) onError(err);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    
    resolveVideoUrl();
    
    return () => {
      isMounted = false;
      
      // Ensure video is properly cleaned up to prevent memory leaks
      if (videoRef.current) {
        try {
          const videoEl = videoRef.current;
          videoEl.pause();
          videoEl.src = "";
          videoEl.load();
        } catch (e) {
          console.error('Error cleaning up video:', e);
        }
      }
    };
  }, [videoUrl, onError]);

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
      muted={muted}
      loop={loop}
      playsInline={playsInline}
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
