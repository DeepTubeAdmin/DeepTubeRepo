
import { useState, useEffect } from 'react';

interface ThumbnailImageProps {
  contentId: number;
  contentType: string;
  title: string;
  className?: string;
}

export default function ThumbnailImage({ contentId, contentType, title, className = '' }: ThumbnailImageProps) {
  const [imgSrc, setImgSrc] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setError(false);
    
    // Use our simplified thumbnail endpoint
    const thumbnailUrl = `/api/content/${contentId}/thumbnail?t=${Date.now()}`;
    setImgSrc(thumbnailUrl);
  }, [contentId]);

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-t-orange-500 border-orange-500/30 rounded-full animate-spin" />
        </div>
      )}
      <img
        src={imgSrc}
        alt={title}
        className="w-full h-full object-cover"
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setError(true);
          setIsLoading(false);
          setImgSrc(`/api/content/${contentId}/thumbnail?placeholder=true`);
        }}
      />
    </div>
  );
}
