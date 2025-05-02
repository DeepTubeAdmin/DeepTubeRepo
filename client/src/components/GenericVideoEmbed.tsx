import { useState, useEffect } from 'react';
import AIWatermark from './AIWatermark';

interface GenericVideoEmbedProps {
  videoUrl: string;
  title?: string;
  width?: string | number;
  height?: string | number;
  autoplay?: boolean;
  loop?: boolean;
  showTitle?: boolean;
  showByline?: boolean;
  showPortrait?: boolean;
  aspectRatio?: string;
  responsive?: boolean;
  className?: string;
}

/**
 * A generic component for embedding videos from various sources including Vimeo
 * This provides compatibility for legacy videos still hosted on Vimeo while
 * we transition to AWS S3 storage for all new videos
 */
const GenericVideoEmbed = ({
  videoUrl,
  title = 'Video player',
  width = '100%',
  height = 'auto',
  autoplay = false,
  loop = false,
  showTitle = false,
  showByline = false,
  showPortrait = false,
  aspectRatio = '16:9',
  responsive = true,
  className = '',
}: GenericVideoEmbedProps) => {
  const [aspectRatioValue, setAspectRatioValue] = useState<number>(0);
  const [embedUrl, setEmbedUrl] = useState<string>('');

  useEffect(() => {
    // Parse aspect ratio string (e.g. "16:9")
    const [width, height] = aspectRatio.split(':').map(Number);
    if (width && height) {
      setAspectRatioValue((height / width) * 100);
    }

    // Parse the video URL to determine the source type
    if (videoUrl.includes('vimeo.com')) {
      // Handle Vimeo URLs
      const vimeoIdMatch = videoUrl.match(/vimeo\.com\/(?:video\/)?([0-9]+)/);
      if (vimeoIdMatch && vimeoIdMatch[1]) {
        const vimeoId = vimeoIdMatch[1];
        // Construct URL parameters
        const params = new URLSearchParams({
          autoplay: autoplay ? '1' : '0',
          loop: loop ? '1' : '0',
          title: showTitle ? '1' : '0',
          byline: showByline ? '1' : '0',
          portrait: showPortrait ? '1' : '0',
        });
        setEmbedUrl(`https://player.vimeo.com/video/${vimeoId}?${params.toString()}`);
      }
    } else if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
      // Handle YouTube URLs
      let youtubeId = '';
      if (videoUrl.includes('youtu.be/')) {
        youtubeId = videoUrl.split('youtu.be/')[1]?.split(/[?&]/)[0] || '';
      } else if (videoUrl.includes('youtube.com/watch')) {
        youtubeId = new URLSearchParams(videoUrl.split('?')[1]).get('v') || '';
      } else if (videoUrl.includes('youtube.com/embed/')) {
        youtubeId = videoUrl.split('youtube.com/embed/')[1]?.split(/[?&]/)[0] || '';
      }
      
      if (youtubeId) {
        const params = new URLSearchParams({
          autoplay: autoplay ? '1' : '0',
          loop: loop ? '1' : '0',
          rel: '0', // Don't show related videos
          modestbranding: '1', // Reduce YouTube branding
          enablejsapi: '1', // Enable JavaScript API
          origin: window.location.origin, // Add origin to prevent cross-origin issues
        });
        setEmbedUrl(`https://www.youtube.com/embed/${youtubeId}?${params.toString()}`);
      }
    } else if (videoUrl.startsWith('/api/s3/') || videoUrl.includes('amazonaws.com') || videoUrl.includes('.mp4') || videoUrl.includes('video/mp4')) {
      // For S3 or direct MP4 URLs, we'll use a video element instead of an iframe
      // Setting a special marker to identify this as a direct video URL
      setEmbedUrl(`direct:${videoUrl}`);
    } else {
      // For other URLs, just use the URL directly
      setEmbedUrl(videoUrl);
    }
  }, [videoUrl, aspectRatio, autoplay, loop, showTitle, showByline, showPortrait]);

  if (!embedUrl) {
    return <div className="flex items-center justify-center p-4">Loading video...</div>;
  }

  // Check if it's a direct video URL
  const isDirectVideo = embedUrl.startsWith('direct:');
  const directVideoUrl = isDirectVideo ? embedUrl.substring(7) : '';

  return (
    <div className={`video-embed ${className}`} style={{ width: typeof width === 'number' ? `${width}px` : width }}>
      {isDirectVideo ? (
        // Render a native video player for direct video URLs (S3, MP4)
        <div className={responsive ? 'relative w-full' : 'relative'} 
          style={responsive ? { paddingBottom: `${aspectRatioValue}%` } : {}}
        >
          <video 
            src={directVideoUrl}
            controls
            autoPlay={autoplay}
            loop={loop}
            poster={undefined}
            className={responsive ? 'absolute top-0 left-0 w-full h-full' : ''}
            width={responsive ? '100%' : width}
            height={responsive ? '100%' : height}
          />
          <AIWatermark position="bottom-right" size="medium" />
        </div>
      ) : responsive ? (
        // Responsive iframe for non-direct videos
        <div style={{ position: 'relative', paddingBottom: `${aspectRatioValue}%`, height: 0, overflow: 'hidden' }}>
          <iframe
            src={embedUrl}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            frameBorder="0"
            allowFullScreen
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
            title={title}
            loading="lazy"
          />
          <AIWatermark position="bottom-right" size="medium" />
        </div>
      ) : (
        // Fixed size iframe for non-direct videos
        <div className="relative">
          <iframe
            src={embedUrl}
            width={width}
            height={height === 'auto' ? (aspectRatioValue ? `${aspectRatioValue}%` : undefined) : height}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            frameBorder="0"
            allowFullScreen
            title={title}
            loading="lazy"
          />
          <AIWatermark position="bottom-right" size="medium" />
        </div>
      )}
    </div>
  );
};

export default GenericVideoEmbed;
