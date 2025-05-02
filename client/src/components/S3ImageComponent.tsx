import { useState, useEffect } from "react";
import { fetchS3Url } from "@/lib/utils";

interface S3ImageComponentProps {
  imageUrl: string;
  alt: string;
  className?: string;
  onLoad?: () => void;
  onError?: (error: any) => void;
}

export default function S3ImageComponent({
  imageUrl,
  alt,
  className = "max-h-[70vh] object-contain",
  onLoad,
  onError
}: S3ImageComponentProps) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    async function resolveImageUrl() {
      try {
        setLoading(true);
        
        // Only fetch S3 URL if it's an S3 URL
        if (imageUrl.startsWith('/api/s3/')) {
          const url = await fetchS3Url(imageUrl);
          if (isMounted) setResolvedUrl(url);
        } else {
          // Otherwise use the original URL
          if (isMounted) setResolvedUrl(imageUrl);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error resolving image URL:', err);
          setError(err instanceof Error ? err : new Error(String(err)));
          if (onError) onError(err);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    
    resolveImageUrl();
    
    return () => {
      isMounted = false;
    };
  }, [imageUrl, onError]);

  // Show loading state
  if (loading) {
    return <div className="animate-pulse bg-gray-700 w-full h-52 rounded"></div>;
  }

  // Show error state
  if (error || !resolvedUrl) {
    return (
      <div className="bg-red-600/20 border border-red-600 rounded-md p-4 text-center">
        Error loading image. It may be in an unsupported format.
      </div>
    );
  }

  return (
    <img
      src={resolvedUrl}
      alt={alt}
      className={className}
      onLoad={() => onLoad?.()}
      onError={(e) => {
        console.error(`Image loading error:`, e);
        if (onError) onError(e);
      }}
      crossOrigin="anonymous"
    />
  );
}
