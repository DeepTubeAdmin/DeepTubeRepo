# DeepTubeAI.com Social Media Integration Plan

This document outlines the implementation plan for optimizing DeepTubeAI.com videos for direct playback on social media platforms. All changes should be implemented in a dedicated production branch without affecting the test environment.

## Production Branch Setup

```bash
# Create a production branch for social media integration
git checkout -b production/social-media-integration
```

## Components to Implement

### 1. Meta Tags Component

Create a reusable component for adding proper Open Graph and Twitter Card meta tags:

```jsx
// client/src/components/MetaTags.tsx

import React from 'react';
import { Helmet } from 'react-helmet'; // We'll need to install this

interface MetaTagsProps {
  title: string;
  description: string;
  videoUrl?: string;
  imageUrl: string;
  contentType: 'video' | 'image' | 'embed';
  contentId?: number;
  duration?: number;
  publishedAt?: string;
}

export default function MetaTags({
  title,
  description,
  videoUrl,
  imageUrl,
  contentType,
  contentId,
  duration,
  publishedAt,
}: MetaTagsProps) {
  const baseUrl = "https://www.deeptubeai.com";
  const fullVideoUrl = videoUrl?.startsWith('http') ? videoUrl : `${baseUrl}${videoUrl}`;
  const fullImageUrl = imageUrl?.startsWith('http') ? imageUrl : `${baseUrl}${imageUrl}`;
  
  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{title} | DeepTubeAI.com</title>
      <meta name="description" content={description} />
      
      {/* Open Graph Tags */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={window.location.href} />
      <meta property="og:site_name" content="DeepTubeAI.com" />
      
      {/* Video-specific tags */}
      {contentType === 'video' && (
        <>
          <meta property="og:type" content="video.other" />
          <meta property="og:video" content={fullVideoUrl} />
          <meta property="og:video:url" content={fullVideoUrl} />
          <meta property="og:video:secure_url" content={fullVideoUrl} />
          <meta property="og:video:type" content="video/mp4" />
          <meta property="og:video:width" content="1280" />
          <meta property="og:video:height" content="720" />
          {duration && <meta property="og:video:duration" content={String(duration)} />}
          {publishedAt && <meta property="article:published_time" content={publishedAt} />}
          <meta property="og:image" content={fullImageUrl} />
        </>
      )}
      
      {/* Twitter Card Tags */}
      {contentType === 'video' ? (
        <>
          <meta name="twitter:card" content="player" />
          <meta name="twitter:player" content={`${baseUrl}/embed/${contentId}`} />
          <meta name="twitter:player:width" content="1280" />
          <meta name="twitter:player:height" content="720" />
        </>
      ) : (
        <meta name="twitter:card" content="summary_large_image" />
      )}
      <meta name="twitter:site" content="@DeepTube_Co" />
      <meta name="twitter:creator" content="@DeepTube_Co" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImageUrl} />
    </Helmet>
  );
}
```

### 2. Structured Data Component

Create a component for adding JSON-LD structured data:

```jsx
// client/src/components/VideoStructuredData.tsx

import React from 'react';
import { Video } from '@/types';

interface VideoStructuredDataProps {
  video: Video;
}

function formatDuration(seconds?: number): string {
  if (!seconds) return 'PT0S';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  return `PT${hours ? hours + 'H' : ''}${minutes ? minutes + 'M' : ''}${secs}S`;
}

export default function VideoStructuredData({ video }: VideoStructuredDataProps) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    "name": video.title,
    "description": video.description || '',
    "thumbnailUrl": video.thumbnail,
    "uploadDate": video.createdAt,
    "contentUrl": video.videoUrl,
    "embedUrl": `https://www.deeptubeai.com/embed/${video.id}`,
    "duration": formatDuration(video.duration),
    "interactionStatistic": {
      "@type": "InteractionCounter",
      "interactionType": "https://schema.org/WatchAction",
      "userInteractionCount": video.views
    },
    "publisher": {
      "@type": "Organization",
      "name": "DeepTubeAI.com",
      "logo": {
        "@type": "ImageObject",
        "url": "https://www.deeptubeai.com/logo.jpg"
      }
    }
  };
  
  return (
    <script 
      type="application/ld+json" 
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} 
    />
  );
}
```

### 3. Video Embed Endpoint

Add a specialized endpoint for video embedding with platform-specific optimizations:

```typescript
// server/routes.ts (add to the existing routes)

// Video embed endpoint optimized for social media platforms
app.get('/embed/:id', async (req, res) => {
  const { id } = req.params;
  const { platform = 'default' } = req.query; // Support platform-specific embedding
  const video = await storage.getVideoById(Number(id));
  
  if (!video) {
    return res.status(404).send('Video not found');
  }
  
  // Instagram-specific handling - return special page for Instagram's IGTV
  if (platform === 'instagram') {
    return handleInstagramEmbed(req, res, video);
  }
  
  // Generate a signed URL with appropriate expiration
  const videoUrl = await getSignedS3Url(urlPathToS3Key(video.videoUrl), 86400); // 24-hour expiry
  
  // Get platform-specific autoplay behavior
  let autoplayAttribute = 'autoplay';
  let muteAttribute = '';
  
  // Platform-specific optimizations
  if (platform === 'facebook' || platform === 'twitter' || platform === 'tiktok') {
    // These platforms require muted autoplay for inline playing
    muteAttribute = 'muted';
  }
  
  // Enhancement: Track platform referrer for analytics
  const trackingScript = `
    <script>
      // Basic analytics for embed tracking
      window.addEventListener('load', function() {
        if (window.parent !== window) {
          // This is embedded in an iframe
          const videoElement = document.querySelector('video');
          if (videoElement) {
            videoElement.addEventListener('play', function() {
              // Send play event to analytics
              const parentUrl = document.referrer;
              fetch('/api/analytics/embed-play', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  videoId: ${video.id},
                  referrer: parentUrl,
                  platform: '${platform}'
                })
              }).catch(err => console.error('Analytics error:', err));
            });
          }
        }
      });
    </script>
  `;
  
  // Send an optimized HTML page for embedding
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${video.title} | DeepTubeAI.com</title>
      
      <!-- Common Meta Tags -->
      <meta property="og:title" content="${video.title}" />
      <meta property="og:description" content="${video.description || 'Watch on DeepTubeAI.com'}" />
      <meta property="og:type" content="video.other" />
      <meta property="og:url" content="https://www.deeptubeai.com/videos/${video.id}" />
      <meta property="og:image" content="${video.thumbnail}" />
      <meta property="og:site_name" content="DeepTubeAI.com" />
      
      <!-- Twitter/X Meta Tags -->
      <meta name="twitter:card" content="player" />
      <meta name="twitter:site" content="@DeepTube_Co" />
      <meta name="twitter:title" content="${video.title}" />
      <meta name="twitter:description" content="${video.description || 'Watch on DeepTubeAI.com'}" />
      <meta name="twitter:image" content="${video.thumbnail}" />
      <meta name="twitter:player" content="https://www.deeptubeai.com/embed/${video.id}" />
      <meta name="twitter:player:width" content="1280" />
      <meta name="twitter:player:height" content="720" />
      
      <!-- Facebook Meta Tags -->
      <meta property="fb:app_id" content="YOUR_FACEBOOK_APP_ID" />
      <meta property="og:video" content="${videoUrl}" />
      <meta property="og:video:secure_url" content="${videoUrl}" />
      <meta property="og:video:type" content="video/mp4" />
      <meta property="og:video:width" content="1280" />
      <meta property="og:video:height" content="720" />
      
      <style>
        body, html { margin: 0; padding: 0; width: 100%; height: 100%; background: #000; overflow: hidden; }
        video { width: 100%; height: 100%; object-fit: contain; }
        .watermark { position: absolute; bottom: 10px; right: 10px; color: white; font-family: Arial; 
                    font-size: 14px; padding: 5px 8px; background: rgba(0,0,0,0.5); border-radius: 3px; z-index: 10; }
        .play-button-overlay { display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                            background: rgba(0,0,0,0.3); justify-content: center; align-items: center; z-index: 5; }
        .play-button { width: 80px; height: 80px; background: rgba(255,140,0,0.8); border-radius: 50%; 
                      display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .play-icon { width: 0; height: 0; border-top: 20px solid transparent; border-bottom: 20px solid transparent;
                    border-left: 30px solid white; margin-left: 8px; }
        video::-webkit-media-controls-fullscreen-button { display: none; }
        
        /* Platform-specific styling */
        ${platform === 'tiktok' ? '.watermark { background: rgba(0,0,0,0.7); font-size: 16px; }' : ''}
        ${platform === 'facebook' ? '.watermark { background: rgba(59, 89, 152, 0.7); }' : ''}
      </style>
      
      ${trackingScript}
    </head>
    <body>
      <video 
        id="video-player"
        src="${videoUrl}" 
        controls 
        ${autoplayAttribute}
        ${muteAttribute}
        playsinline
        poster="${video.thumbnail}"
      ></video>
      
      <div class="play-button-overlay" id="play-overlay">
        <div class="play-button">
          <div class="play-icon"></div>
        </div>
      </div>
      
      <div class="watermark">DeepTubeAI.com</div>
      
      <script>
        // Handle play button overlay for platforms that don't support autoplay
        const video = document.getElementById('video-player');
        const overlay = document.getElementById('play-overlay');
        
        video.addEventListener('pause', function() {
          if (video.currentTime === 0) {
            overlay.style.display = 'flex';
          }
        });
        
        overlay.addEventListener('click', function() {
          video.play().then(() => {
            overlay.style.display = 'none';
          }).catch(err => {
            console.error('Failed to play:', err);
          });
        });
        
        // Initial check if video isn't playing automatically
        setTimeout(function() {
          if (video.paused && video.currentTime === 0) {
            overlay.style.display = 'flex';
          }
        }, 1000);
      </script>
    </body>
    </html>
  `);
});

// Special handler for Instagram embeds
async function handleInstagramEmbed(req: Request, res: Response, video: Video) {
  // Instagram has specific requirements for video embeds
  // - Square aspect ratio preferred for feed posts
  // - 9:16 for Stories and Reels
  // - MP4 format with specific encoding requirements
  
  // Get video URL with longer expiry since Instagram may take time to process
  const videoUrl = await getSignedS3Url(urlPathToS3Key(video.videoUrl), 604800); // 7-day expiry
  
  // Return a specialized page optimized for Instagram's requirements
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${video.title} | DeepTubeAI.com</title>
      
      <!-- Instagram-optimized meta tags -->
      <meta property="og:title" content="${video.title}" />
      <meta property="og:description" content="${video.description || 'Watch on DeepTubeAI.com'}" />
      <meta property="og:type" content="video.other" />
      <meta property="og:url" content="https://www.deeptubeai.com/videos/${video.id}" />
      <meta property="og:image" content="${video.thumbnail}" />
      <meta property="og:video" content="${videoUrl}" />
      <meta property="og:video:secure_url" content="${videoUrl}" />
      <meta property="og:video:type" content="video/mp4" />
      <meta property="og:video:width" content="1080" />
      <meta property="og:video:height" content="1080" />
      
      <style>
        body, html { margin: 0; padding: 0; width: 100%; height: 100%; background: #000; overflow: hidden; }
        /* Instagram prefers square videos in feed, use object-fit:cover for this ratio */
        video { width: 100%; height: 100%; object-fit: cover; }
        .watermark { position: absolute; bottom: 15px; right: 15px; color: white; font-family: Arial, sans-serif; 
                    font-size: 16px; padding: 6px 12px; background: rgba(0,0,0,0.6); border-radius: 5px; z-index: 10; }
        /* Instagram-style gradient overlay */
        .gradient-overlay { position: absolute; bottom: 0; left: 0; width: 100%; height: 30%; 
                          background: linear-gradient(to top, rgba(0,0,0,0.7), rgba(0,0,0,0)); z-index: 5; }
        /* Instagram-styled play button */
        .instagram-play { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                         width: 100px; height: 100px; background: rgba(255,255,255,0.2); border-radius: 50%;
                         display: flex; align-items: center; justify-content: center; z-index: 10; }
        .instagram-play-icon { width: 0; height: 0; border-top: 25px solid transparent; 
                             border-bottom: 25px solid transparent; border-left: 40px solid white; margin-left: 8px; }
      </style>
    </head>
    <body>
      <video 
        id="instagram-player"
        src="${videoUrl}" 
        controls
        autoplay
        muted
        loop
        playsinline
        poster="${video.thumbnail}"
      ></video>
      
      <div class="gradient-overlay"></div>
      <div class="instagram-play" id="instagram-play">
        <div class="instagram-play-icon"></div>
      </div>
      
      <div class="watermark">DeepTubeAI.com</div>
      
      <script>
        // Special handling for Instagram's video behavior
        const video = document.getElementById('instagram-player');
        const playButton = document.getElementById('instagram-play');
        
        // Instagram specific playback optimizations
        video.addEventListener('loadedmetadata', function() {
          // Force video to start playing as soon as it loads
          video.play().catch(e => console.log('Instagram autoplay prevented:', e));
        });
        
        playButton.addEventListener('click', function() {
          if (video.paused) {
            video.play().then(() => {
              playButton.style.display = 'none';
            }).catch(e => console.log('Instagram play prevented:', e));
          } else {
            video.pause();
            playButton.style.display = 'flex';
          }
        });
        
        // Handle display of play button
        video.addEventListener('play', function() {
          playButton.style.display = 'none';
        });
        
        video.addEventListener('pause', function() {
          playButton.style.display = 'flex';
        });
        
        // Instagram often prevents autoplay, so we check after a delay
        setTimeout(function() {
          if (video.paused) {
            playButton.style.display = 'flex';
          } else {
            playButton.style.display = 'none';
          }
        }, 500);
      </script>
    </body>
    </html>
  `);
}
```

### 4. Media Detail Page Integration

Update the media detail page to include meta tags and structured data:

```jsx
// client/src/pages/media-detail-new.tsx (modifications)

// Import the new components
import MetaTags from '@/components/MetaTags';
import VideoStructuredData from '@/components/VideoStructuredData';

// Add these components to the media detail page
export default function MediaDetailPage() {
  // Existing code...
  
  return (
    <>
      {video && (
        <>
          <MetaTags 
            title={video.title}
            description={video.description || `Watch this ${video.contentType} on DeepTubeAI.com`}
            videoUrl={video.videoUrl}
            imageUrl={video.thumbnail || ''}
            contentType={video.contentType as 'video' | 'image' | 'embed'}
            contentId={video.id}
            duration={video.duration}
            publishedAt={video.createdAt}
          />
          <VideoStructuredData video={video} />
        </>
      )}
      
      {/* Rest of the existing component */}
    </>
  );
}
```

### 5. S3 Service Module Enhancements

Update the S3 service module with optimized settings for video sharing:

```typescript
// server/s3.ts (modifications)

export async function uploadFileToS3(filePath: string, s3Key: string): Promise<string> {
  try {
    const fileContent = fs.readFileSync(filePath);
    
    const uploadParams = {
      Bucket: process.env.AWS_BUCKET_NAME!,
      Key: s3Key,
      Body: fileContent,
      ContentType: getContentType(filePath),
      CacheControl: 'max-age=31536000', // Cache for 1 year for better performance
      ContentDisposition: 'inline', // Important for direct playback in social feeds
    };
    
    // Rest of the existing function...
  }
}

function getContentType(filename: string): string {
  // Enhanced MIME type detection
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml'
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
}
```