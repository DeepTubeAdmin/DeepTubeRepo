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
    let retryTimeout: ReturnType<typeof setTimeout>;
    
    async function resolveImageUrl() {
      try {
        setLoading(true);
        
        // Attempt to resolve URL with retry logic built into fetchS3Url
        console.log('S3ImageComponent: Resolving URL for:', imageUrl);
        const url = await fetchS3Url(imageUrl, 3); // Try up to 3 times
        
        if (!isMounted) return;
        
        if (url) {
          setResolvedUrl(url);
          if (url.startsWith('http')) {
            console.log('S3ImageComponent: Successfully resolved URL:', url.substring(0, 50) + '...');
          }
        } else {
          throw new Error('Failed to resolve image URL');
        }
      } catch (err) {
        if (!isMounted) return;
        
        console.error('S3ImageComponent: Error resolving image URL:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        
        // For non-S3 URLs, try again once more after a delay (may be a temporary network issue)
        if (!imageUrl.startsWith('/api/s3/')) {
          console.log('S3ImageComponent: Will retry regular URL in 2 seconds');
          retryTimeout = setTimeout(() => {
            if (isMounted) setResolvedUrl(imageUrl);
          }, 2000);
        }
        
        if (onError) onError(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    
    resolveImageUrl();
    
    return () => {
      isMounted = false;
      if (retryTimeout) clearTimeout(retryTimeout);
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
