import { useState, useEffect } from "react";
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
  muted = true,
  loop = true,
  playsInline = true,
  className = "w-full h-full object-cover",
  onLoad,
  onError
}: S3VideoPlayerProps) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    async function resolveVideoUrl() {
      try {
        setLoading(true);
        
        // Only fetch S3 URL if it's an S3 URL
        if (videoUrl.startsWith('/api/s3/')) {
          const url = await fetchS3Url(videoUrl);
          if (isMounted) setResolvedUrl(url);
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
    };
  }, [videoUrl, onError]);

  // Show loading state
  if (loading) {
    return <div className="animate-pulse bg-gray-700 w-full h-full"></div>;
  }

  // Show error state
  if (error || !resolvedUrl) {
    return (
      <div className="bg-gray-800 w-full h-full flex items-center justify-center text-red-500">
        Error loading video
      </div>
    );
  }

  return (
    <video
      src={resolvedUrl}
      autoPlay={autoPlay}
      muted={muted}
      loop={loop}
      playsInline={playsInline}
      crossOrigin="anonymous"
      className={className}
      onLoadedData={() => onLoad?.()}
      onError={(e) => {
        console.error(`Video playback error:`, e);
        if (onError) onError(e);
      }}
      title={title}
    />
  );
}
