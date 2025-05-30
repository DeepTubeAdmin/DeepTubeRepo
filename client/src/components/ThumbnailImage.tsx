import { useState, useEffect, useRef } from "react";

interface ThumbnailImageProps {
  contentId: number;
  contentType: string;
  title: string;
  className?: string;
}

export default function ThumbnailImage({
  contentId,
  contentType,
  title,
  className = "",
}: ThumbnailImageProps) {
  const [imgSrc, setImgSrc] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const placeholderAttempted = useRef(false);
  const retryCount = useRef(0);
  const maxRetries = 2;

  useEffect(() => {
    // Reset on new content ID
    setIsLoading(true);
    setError(false);
    placeholderAttempted.current = false;
    retryCount.current = 0;

    // Use our unified thumbnail endpoint with cache busting
    const thumbnailUrl = `/api/content/${contentId}/thumbnail?t=${Date.now()}`;
    setImgSrc(thumbnailUrl);
  }, [contentId]);

  // Function to handle image loading errors with retry logic
  const handleImageError = () => {
    // Prevent infinite loops with placeholder images
    if (placeholderAttempted.current) {
      setIsLoading(false);
      setError(true);
      return;
    }

    // Try to retry a couple of times before falling back to placeholder
    if (retryCount.current < maxRetries) {
      retryCount.current += 1;
      // Retry with a new cache-busting parameter
      setImgSrc(
        `/api/content/${contentId}/thumbnail?t=${Date.now()}&retry=${
          retryCount.current
        }&force=true`
      );
      return;
    }

    // Log error to console but at a lower severity level
    console.log(
      `ThumbnailImage: Error loading thumbnail for ${contentType} ${contentId}`
    );

    setError(true);
    setIsLoading(false);

    // Use the placeholder endpoint which should return an SVG placeholder
    placeholderAttempted.current = true;
    setImgSrc(
      `/api/content/${contentId}/thumbnail?placeholder=true&t=${Date.now()}`
    );
  };

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-t-orange-500 border-orange-500/30 rounded-full animate-spin" />
        </div>
      )}
      {error && !isLoading && (
        <div className="absolute inset-0 bg-slate-900 flex items-center justify-center text-gray-400 text-sm text-center">
          <div className="p-2">
            <svg
              className="w-10 h-10 mx-auto mb-2 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            {contentType === "image" ? "Image" : "Thumbnail"} loading issue
          </div>
        </div>
      )}
      {imgSrc && (
        <img
          src={imgSrc}
          alt={title}
          className="w-full h-full object-cover"
          onLoad={() => setIsLoading(false)}
          onError={handleImageError}
        />
      )}
    </div>
  );
}
