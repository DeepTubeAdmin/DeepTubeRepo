# DeepTube.co Social Media Integration Plan

This document outlines the implementation plan for optimizing DeepTube.co videos for direct playback on social media platforms. All changes should be implemented in a dedicated production branch without affecting the test environment.

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
  const baseUrl = "https://deeptube.co";
  const fullVideoUrl = videoUrl?.startsWith('http') ? videoUrl : `${baseUrl}${videoUrl}`;
  const fullImageUrl = imageUrl?.startsWith('http') ? imageUrl : `${baseUrl}${imageUrl}`;
  
  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{title} | DeepTube.co</title>
      <meta name="description" content={description} />
      
      {/* Open Graph Tags */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={window.location.href} />
      <meta property="og:site_name" content="DeepTube.co" />
      
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
    "embedUrl": `https://deeptube.co/embed/${video.id}`,
    "duration": formatDuration(video.duration),
    "interactionStatistic": {
      "@type": "InteractionCounter",
      "interactionType": "https://schema.org/WatchAction",
      "userInteractionCount": video.views
    },
    "publisher": {
      "@type": "Organization",
      "name": "DeepTube.co",
      "logo": {
        "@type": "ImageObject",
        "url": "https://deeptube.co/logo.png"
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
      <title>${video.title} | DeepTube.co</title>
      
      <!-- Common Meta Tags -->
      <meta property="og:title" content="${video.title}" />
      <meta property="og:description" content="${video.description || 'Watch on DeepTube.co'}" />
      <meta property="og:type" content="video.other" />
      <meta property="og:url" content="https://deeptube.co/videos/${video.id}" />
      <meta property="og:image" content="${video.thumbnail}" />
      <meta property="og:site_name" content="DeepTube.co" />
      
      <!-- Twitter/X Meta Tags -->
      <meta name="twitter:card" content="player" />
      <meta name="twitter:site" content="@DeepTube_Co" />
      <meta name="twitter:title" content="${video.title}" />
      <meta name="twitter:description" content="${video.description || 'Watch on DeepTube.co'}" />
      <meta name="twitter:image" content="${video.thumbnail}" />
      <meta name="twitter:player" content="https://deeptube.co/embed/${video.id}" />
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
      
      <div class="watermark">DeepTube.co</div>
      
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
      <title>${video.title} | DeepTube.co</title>
      
      <!-- Instagram-optimized meta tags -->
      <meta property="og:title" content="${video.title}" />
      <meta property="og:description" content="${video.description || 'Watch on DeepTube.co'}" />
      <meta property="og:type" content="video.other" />
      <meta property="og:url" content="https://deeptube.co/videos/${video.id}" />
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
      
      <div class="watermark">DeepTube.co</div>
      
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
            description={video.description || `Watch this ${video.contentType} on DeepTube.co`}
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

# DeepTube Production Environment Setup

## AWS Infrastructure Setup (us-east-2 primary)

1. **Elastic Beanstalk Configuration**
   - [ ] Create production environment with Node.js platform (Node.js 20)
   - [ ] Configure auto-scaling groups for handling traffic spikes
   - [ ] Set up proper environment variables in EB configuration
   - [ ] Configure health checks and monitoring
   - [ ] Set up load balancing for high availability
   - [ ] Implement proper logging to CloudWatch
   - [ ] Configure deployment policies (rolling, blue-green)

2. **CloudFront Distribution**
   - [ ] Configure origin settings for S3 and Elastic Beanstalk
   - [ ] Set up cache behaviors for different content types:
     - Videos: longer TTL (24 hours)
     - Thumbnails: medium TTL (12 hours)
     - API responses: shorter TTL or no caching
   - [ ] Configure SSL certificate for deeptube.co
   - [ ] Set up proper CORS headers
   - [ ] Configure geographic restrictions if needed
   - [ ] Enable multi-region failover
   - [ ] Set up edge functions for optimal routing
   - [ ] Configure proper error handling and custom error pages

3. **S3 Media Storage**
   - [ ] Create primary bucket in us-east-2
   - [ ] Configure bucket policies for secure access
   - [ ] Set up lifecycle policies for managing old content
   - [ ] Configure CORS for cross-origin video playback
   - [ ] Set up bucket replication for disaster recovery
   - [ ] Configure proper IAM roles and policies
   - [ ] Implement versioning for critical content
   - [ ] Set up event notifications for upload monitoring

4. **AWS MediaConvert Implementation**
   - [ ] Replace ffmpeg with AWS MediaConvert for video processing
   - [ ] Create multiple output groups for different platforms:
     - Standard MP4 (1080p max) for web playback
     - Adaptive bitrate streaming (HLS/DASH) for web
     - Social media optimized outputs:
       - Facebook/X: 720p MP4 with specific encoder settings
       - Instagram Feed: Square aspect ratio (1:1) up to 1080×1080
       - Instagram Stories/Reels: Vertical (9:16) format
       - TikTok: Vertical format with specific bitrate requirements
   - [ ] Set up MediaConvert job templates for each format
   - [ ] Create CloudWatch events to trigger MediaConvert jobs
   - [ ] Implement webhook callbacks for job completion
   - [ ] Configure SQS queue for processing job status updates
   - [ ] Set up job error handling and retry mechanisms
   - [ ] Implement time-based job queuing for large batch processing

5. **Database Configuration**
   - [ ] Set up RDS PostgreSQL instance with proper scaling
   - [ ] Configure backups and point-in-time recovery
   - [ ] Set up read replicas for high traffic scenarios
   - [ ] Implement connection pooling
   - [ ] Configure database security groups
   - [ ] Set up automated snapshots
   - [ ] Plan for database scaling strategy (vertical vs. horizontal)
   - [ ] Configure parameter groups for performance optimization

6. **Security Implementation**
   - [ ] Set up AWS WAF for protection against common web exploits
   - [ ] Configure AWS Shield for DDoS protection
   - [ ] Implement proper IAM roles and policies with least privilege
   - [ ] Set up VPC with proper security groups and network ACLs
   - [ ] Configure AWS Config for compliance monitoring
   - [ ] Implement CloudTrail for security auditing
   - [ ] Set up GuardDuty for threat detection

7. **CloudWatch Monitoring**
   - [ ] Set up dashboards for key metrics
   - [ ] Configure alarms for critical thresholds
   - [ ] Implement log aggregation and analysis
   - [ ] Create custom metrics for business-specific monitoring
   - [ ] Set up automated responses to specific alarm conditions

## Social Media Integration

1. **Meta Tags and Structured Data**
   - [ ] Implement meta tags for all social platforms
   - [ ] Create JSON-LD structured data for Google and other search engines
   - [ ] Set up platform-specific embed endpoints
   - [ ] Implement Open Graph Protocol for rich sharing experiences
   - [ ] Create Twitter/X Cards for enhanced visibility

2. **Platform-Specific Testing**
   - [ ] Test Facebook, X (Twitter), and TikTok (priority platforms)
   - [ ] Test Instagram integration (Feed, Stories, Reels)
   - [ ] Validate structured data with testing tools
   - [ ] Verify video playback across devices and browsers
   - [ ] Test autoplay behavior on all platforms
   - [ ] Validate sharing workflows on mobile devices

3. **Analytics Implementation**
   - [ ] Implement Google Analytics 4
   - [ ] Configure custom events for social sharing
   - [ ] Set up conversion tracking
   - [ ] Create performance dashboards
   - [ ] Implement platform-specific UTM parameters
   - [ ] Set up cross-platform attribution
   - [ ] Configure real-time monitoring for viral content

## Implementation Strategy

1. **Phased Deployment Approach**
   - [ ] Phase 1: Infrastructure setup (Elastic Beanstalk, RDS, S3)
   - [ ] Phase 2: Media processing pipeline (MediaConvert, CloudFront)
   - [ ] Phase 3: Social media integration and optimization
   - [ ] Phase 4: Analytics and monitoring
   - [ ] Phase 5: Security hardening and performance optimizations

2. **CI/CD Pipeline Implementation**
   - [ ] Set up AWS CodePipeline for automated deployments
   - [ ] Configure automated testing before production deployment
   - [ ] Implement feature branch testing environments
   - [ ] Create deployment approval gates for critical environments
   - [ ] Configure rollback capabilities

3. **Disaster Recovery Planning**
   - [ ] Document recovery procedures for various failure scenarios
   - [ ] Set up cross-region replication for critical data
   - [ ] Implement automated backup verification
   - [ ] Create emergency response playbooks
   - [ ] Schedule regular disaster recovery drills

4. **Performance Testing**
   - [ ] Implement load testing with realistic traffic patterns
   - [ ] Configure stress testing to identify breaking points
   - [ ] Conduct performance profiling to identify bottlenecks
   - [ ] Test content delivery across various network conditions
   - [ ] Validate performance across different devices and browsers

5. **Deployment Workflow**
   - [ ] Create a staging environment that mirrors production configuration
   - [ ] Test social sharing features in staging before deploying to production
   - [ ] Implement canary deployments for risk reduction
   - [ ] Deploy to production with minimal downtime
   - [ ] Monitor performance and social media engagement metrics

## Code Adaptations for Production

1. **Environment Configuration**
   - [ ] Modify application to use environment-specific configuration
   - [ ] Extract all hardcoded URLs and parameters to environment variables
   - [ ] Create environment-specific config files for dev, staging, and production

2. **S3 Integration Refactoring**
   - [ ] Refactor S3 service to use AWS SDK v3's modular architecture
   - [ ] Implement optimized S3 uploads with multipart support
   - [ ] Add CloudFront URL generation for media assets
   - [ ] Update signed URL generation with proper expiration times

3. **MediaConvert Integration**
   - [ ] Create service module for AWS MediaConvert integration
   - [ ] Implement job submission and status tracking
   - [ ] Add support for multiple output format generation
   - [ ] Build webhook handler for job completion notifications

4. **Error Handling & Logging**
   - [ ] Implement structured logging with correlation IDs
   - [ ] Add production-grade error handling and reporting
   - [ ] Set up error aggregation and alerting
   - [ ] Create custom error boundaries for React components

5. **Performance Optimizations**
   - [ ] Implement server-side rendering for improved SEO
   - [ ] Add code splitting and lazy loading for frontend assets
   - [ ] Optimize image and media loading with responsive techniques
   - [ ] Implement proper caching strategies for API responses

This implementation plan allows for comprehensive social media integration without affecting the current test environment.