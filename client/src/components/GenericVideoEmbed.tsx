import { useState, useEffect, useRef } from 'react';
import AIWatermark from './AIWatermark';

interface GenericVideoEmbedProps {
  videoUrl?: string;
  html?: string;
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
  html,
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
  const [error, setError] = useState<string>('');
  const [videoId, setVideoId] = useState<string>('');

  useEffect(() => {
    // Parse aspect ratio string (e.g. "16:9")
    const [width, height] = aspectRatio.split(':').map(Number);
    if (width && height) {
      setAspectRatioValue((height / width) * 100);
    }

    // If we receive HTML directly, use that instead of processing a URL
    if (html) {
      // Just set a dummy URL to indicate we have content
      setEmbedUrl('html-content');
      return;
    }
    
    // Early return if no videoUrl provided
    if (!videoUrl) {
      setError('No video URL provided');
      return;
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
      
      // Clear previous error
      setError('');
      
      try {
        if (videoUrl.includes('youtu.be/')) {
          youtubeId = videoUrl.split('youtu.be/')[1]?.split(/[?&]/)[0] || '';
        } else if (videoUrl.includes('youtube.com/watch')) {
          const queryPart = videoUrl.split('?')[1];
          if (queryPart) {
            youtubeId = new URLSearchParams(queryPart).get('v') || '';
          }
        } else if (videoUrl.includes('youtube.com/embed/')) {
          youtubeId = videoUrl.split('youtube.com/embed/')[1]?.split(/[?&]/)[0] || '';
        }
        
        if (!youtubeId) {
          throw new Error('Could not extract YouTube video ID');
        }
        
        // Store the video ID for error handling
        setVideoId(youtubeId);
        
        // Build the parameter string in a more robust way
        const host = window.location.host;
        const protocol = window.location.protocol;
        const origin = `${protocol}//${host}`;
        
        // Create a simple string array of parameters instead of using URLSearchParams
        // This avoids issues with encoding and is more reliable
        const params = [
          'rel=0',                  // Don't show related videos
          'enablejsapi=1',          // Enable JavaScript API
          'modestbranding=1',       // Reduce YouTube branding
          'playsinline=1',          // Play inline on mobile devices
          autoplay ? 'autoplay=1' : '', // Autoplay when requested
          loop ? 'loop=1' : '',     // Loop when requested
          `origin=${encodeURIComponent(origin)}` // Set origin for postMessage API
        ].filter(Boolean).join('&');
        
        setEmbedUrl(`https://www.youtube.com/embed/${youtubeId}?${params}`);
      } catch (err) {
        console.error('Error processing YouTube URL:', err);
        setError('Could not load YouTube video. The URL format may be invalid.');
      }
    } else if (videoUrl.startsWith('/api/s3/') || videoUrl.includes('amazonaws.com') || videoUrl.includes('.mp4') || videoUrl.includes('video/mp4')) {
      // For S3 or direct MP4 URLs, we'll use a video element instead of an iframe
      // Setting a special marker to identify this as a direct video URL
      setEmbedUrl(`direct:${videoUrl}`);
    } else {
      // For other URLs, just use the URL directly
      setEmbedUrl(videoUrl);
    }
  }, [videoUrl, html, aspectRatio, autoplay, loop, showTitle, showByline, showPortrait]);

  // Handle error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-4 bg-slate-900 text-white rounded-md min-h-[200px]">
        <div className="text-red-500 mb-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <div className="text-center mb-4">{error}</div>
        {videoId && (
          <a 
            href={`https://www.youtube.com/watch?v=${videoId}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
          >
            Watch on YouTube
          </a>
        )}
      </div>
    );
  }
  
  if (!embedUrl) {
    return <div className="flex items-center justify-center p-4">Loading video...</div>;
  }

  // Check if it's a direct video URL
  const isDirectVideo = embedUrl.startsWith('direct:');
  const directVideoUrl = isDirectVideo ? embedUrl.substring(7) : '';

  // If we have direct HTML content, render it in a container with proper aspect ratio
  if (html && embedUrl === 'html-content') {
    return (
      <div className={`video-embed ${className}`} style={{ width: typeof width === 'number' ? `${width}px` : width }}>
        <div 
          className={responsive ? 'relative w-full' : 'relative'}
          style={responsive ? { paddingBottom: `${aspectRatioValue}%` } : {}}
        >
          <div 
            className={responsive ? 'absolute top-0 left-0 w-full h-full' : ''}
            dangerouslySetInnerHTML={{ __html: html }}
          />
          <AIWatermark position="bottom-right" size="medium" />
        </div>
      </div>
    );
  }
  
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
