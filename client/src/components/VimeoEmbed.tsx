import { useState, useEffect } from 'react';

interface VimeoEmbedProps {
  videoId: string;
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

const VimeoEmbed = ({
  videoId,
  title = 'Vimeo video player',
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
}: VimeoEmbedProps) => {
  const [aspectRatioValue, setAspectRatioValue] = useState<number>(0);

  useEffect(() => {
    // Parse aspect ratio string (e.g. "16:9")
    const [width, height] = aspectRatio.split(':').map(Number);
    if (width && height) {
      setAspectRatioValue((height / width) * 100);
    }
  }, [aspectRatio]);

  // Construct URL parameters
  const params = new URLSearchParams({
    autoplay: autoplay ? '1' : '0',
    loop: loop ? '1' : '0',
    title: showTitle ? '1' : '0',
    byline: showByline ? '1' : '0',
    portrait: showPortrait ? '1' : '0',
  });

  const embedUrl = `https://player.vimeo.com/video/${videoId}?${params.toString()}`;

  return (
    <div className={`vimeo-embed ${className}`} style={{ width: typeof width === 'number' ? `${width}px` : width }}>
      {responsive ? (
        <div style={{ position: 'relative', paddingBottom: `${aspectRatioValue}%`, height: 0, overflow: 'hidden' }}>
          <iframe
            src={embedUrl}
            allow="autoplay; fullscreen; picture-in-picture"
            frameBorder="0"
            allowFullScreen
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
            title={title}
          />
        </div>
      ) : (
        <iframe
          src={embedUrl}
          width={width}
          height={height === 'auto' ? (aspectRatioValue ? `${aspectRatioValue}%` : undefined) : height}
          allow="autoplay; fullscreen; picture-in-picture"
          frameBorder="0"
          allowFullScreen
          title={title}
        />
      )}
    </div>
  );
};

export default VimeoEmbed;