/**
 * Thumbnail generators for different content types
 */

import { ThumbnailOptions, ThumbnailResult } from './types';
import { uploadToS3, getThumbnailS3Key, getSignedS3Url } from './storage';
import { uploadToCloudinary, getYouTubeThumbnailUrl, extractYouTubeVideoId } from './cloudinary';

/**
 * Generate a thumbnail from a YouTube video
 * @param options Thumbnail options
 * @returns Thumbnail result
 */
export async function generateYouTubeThumbnail(options: ThumbnailOptions): Promise<ThumbnailResult> {
  try {
    const { contentId, youtubeId } = options;
    
    // Extract YouTube ID if provided in sourceUrl but not directly
    const extractedYoutubeId = youtubeId || (options.sourceUrl ? extractYouTubeVideoId(options.sourceUrl) : null);
    
    if (!extractedYoutubeId) {
      throw new Error('No valid YouTube ID found');
    }
    
    console.log(`Generating YouTube thumbnail for content ${contentId} using ID ${extractedYoutubeId}`);
    
    // Try multiple quality levels in order of preference
    const qualities = ['maxresdefault', 'hqdefault', 'mqdefault', 'default'];
    let imageBuffer: Buffer | null = null;
    let usedQuality = '';
    
    // Try each quality level until one works
    for (const quality of qualities) {
      try {
        const thumbnailUrl = getYouTubeThumbnailUrl(extractedYoutubeId, quality);
        if (!thumbnailUrl) continue;
        
        console.log(`Trying YouTube thumbnail quality: ${quality}`);
        const response = await fetch(thumbnailUrl);
        
        if (!response.ok) {
          console.log(`Quality ${quality} failed with status ${response.status}`);
          continue;
        }
        
        imageBuffer = Buffer.from(await response.arrayBuffer());
        usedQuality = quality;
        console.log(`Successfully retrieved YouTube thumbnail with quality: ${quality}`);
        break;
      } catch (innerError) {
        console.error(`Error fetching YouTube thumbnail quality ${quality}:`, innerError);
      }
    }
    
    if (!imageBuffer) {
      throw new Error('Failed to fetch YouTube thumbnail at any quality level');
    }
    
    // Save to S3
    const thumbnailS3Key = getThumbnailS3Key(contentId, 'youtube');
    await uploadToS3(imageBuffer, thumbnailS3Key, { contentType: 'image/jpeg' });
    console.log(`Saved YouTube thumbnail to S3: ${thumbnailS3Key}`);
    
    return {
      success: true,
      thumbnailPath: thumbnailS3Key,
      contentType: 'image/jpeg',
      method: `youtube-${usedQuality}`
    };
  } catch (error) {
    console.error('YouTube thumbnail generation failed:', error);
    throw error;
  }
}

/**
 * Generate a thumbnail from video content using Cloudinary
 * @param options Thumbnail options
 * @returns Thumbnail result
 */
export async function generateVideoThumbnail(options: ThumbnailOptions): Promise<ThumbnailResult> {
  try {
    const { contentId, sourceUrl } = options;
    
    if (!sourceUrl) {
      throw new Error('No source URL provided for video thumbnail generation');
    }
    
    console.log(`Generating video thumbnail for content ${contentId} using Cloudinary`);
    
    // Get a signed URL for the source if it's an S3 URL
    let accessibleSourceUrl = sourceUrl;
    if (sourceUrl.includes('.s3.') || sourceUrl.includes('/api/s3/')) {
      // Extract actual S3 key from URL
      let s3Key = sourceUrl;
      if (sourceUrl.includes('/api/s3/')) {
        s3Key = sourceUrl.split('/api/s3/').pop() || sourceUrl;
      } else if (sourceUrl.includes('.amazonaws.com/')) {
        s3Key = sourceUrl.split('.amazonaws.com/').pop() || sourceUrl;
      }
      
      // Use public S3 URL for Cloudinary access
      accessibleSourceUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
      console.log(`Using public S3 URL for Cloudinary: ${accessibleSourceUrl.substring(0, 100)}...`);
    }
    
    // Process with Cloudinary
    console.log('Starting Cloudinary upload with updated credentials...');
    const result = await uploadToCloudinary(accessibleSourceUrl, {
      resourceType: 'video',
      publicId: `video-${contentId}`,
      transformation: [
        { width: 800, height: 450, crop: 'fill' },
        { start_offset: '0' }
      ],
      format: 'jpg'
    });
    
    // Save result to S3
    const thumbnailUrl = result.eager?.[0]?.secure_url || result.secure_url;
    console.log(`Downloading Cloudinary result: ${thumbnailUrl}`);
    
    const thumbnailResponse = await fetch(thumbnailUrl);
    if (!thumbnailResponse.ok) {
      throw new Error(`Failed to download Cloudinary thumbnail: ${thumbnailResponse.status}`);
    }
    
    const thumbnailBuffer = Buffer.from(await thumbnailResponse.arrayBuffer());
    const thumbnailS3Key = getThumbnailS3Key(contentId, 'video');
    
    await uploadToS3(thumbnailBuffer, thumbnailS3Key, { contentType: 'image/jpeg' });
    console.log(`Saved Cloudinary video thumbnail to S3: ${thumbnailS3Key}`);
    
    return {
      success: true,
      thumbnailPath: thumbnailS3Key,
      contentType: 'image/jpeg',
      method: 'cloudinary-video'
    };
  } catch (error) {
    console.error('Video thumbnail generation failed:', error);
    throw error;
  }
}

/**
 * Generate a thumbnail from an image
 * @param options Thumbnail options
 * @returns Thumbnail result
 */
export async function generateImageThumbnail(options: ThumbnailOptions): Promise<ThumbnailResult> {
  try {
    const { contentId, sourceUrl, base64Data } = options;
    
    // Handle base64 data directly if provided
    if (base64Data) {
      console.log(`Generating image thumbnail from base64 data for content ${contentId}`);
      
      // Strip data URL prefix if present
      const base64Content = base64Data.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Content, 'base64');
      
      // Save directly to S3
      const thumbnailS3Key = getThumbnailS3Key(contentId, 'image');
      await uploadToS3(buffer, thumbnailS3Key, { contentType: 'image/jpeg' });
      console.log(`Saved base64 image thumbnail to S3: ${thumbnailS3Key}`);
      
      return {
        success: true,
        thumbnailPath: thumbnailS3Key,
        contentType: 'image/jpeg',
        method: 'direct-base64'
      };
    }
    
    // Handle URL-based image
    if (!sourceUrl) {
      throw new Error('No source URL or base64 data provided for image thumbnail');
    }
    
    console.log(`Generating image thumbnail for content ${contentId} from URL`);
    
    // Get a signed URL for the source if it's an S3 URL
    let accessibleSourceUrl = sourceUrl;
    if (sourceUrl.includes('.s3.') || sourceUrl.includes('/api/s3/')) {
      // Extract actual S3 key from URL
      let s3Key = sourceUrl;
      if (sourceUrl.includes('/api/s3/')) {
        s3Key = sourceUrl.split('/api/s3/').pop() || sourceUrl;
      } else if (sourceUrl.includes('.amazonaws.com/')) {
        s3Key = sourceUrl.split('.amazonaws.com/').pop() || sourceUrl;
      }
      
      // Get a signed URL that Cloudinary can access
      try {
        accessibleSourceUrl = await getSignedS3Url(s3Key);
        console.log(`Got signed S3 URL for image: ${accessibleSourceUrl.substring(0, 100)}...`);
      } catch (s3Error) {
        console.warn(`Could not get signed URL, using original: ${s3Error.message}`);
      }
    }
    
    // Process with Cloudinary for resizing/optimization
    console.log('Processing image with Cloudinary...');
    const result = await uploadToCloudinary(accessibleSourceUrl, {
      resourceType: 'image',
      publicId: `image-${contentId}`,
      transformation: [
        { width: 800, height: 450, crop: 'fill' }
      ],
      format: 'jpg'
    });
    
    // Save result to S3
    const thumbnailUrl = result.secure_url;
    console.log(`Downloading Cloudinary result: ${thumbnailUrl}`);
    
    const thumbnailResponse = await fetch(thumbnailUrl);
    if (!thumbnailResponse.ok) {
      throw new Error(`Failed to download Cloudinary image: ${thumbnailResponse.status}`);
    }
    
    const thumbnailBuffer = Buffer.from(await thumbnailResponse.arrayBuffer());
    const thumbnailS3Key = getThumbnailS3Key(contentId, 'image');
    
    await uploadToS3(thumbnailBuffer, thumbnailS3Key, { contentType: 'image/jpeg' });
    console.log(`Saved Cloudinary image thumbnail to S3: ${thumbnailS3Key}`);
    
    return {
      success: true,
      thumbnailPath: thumbnailS3Key,
      contentType: 'image/jpeg',
      method: 'cloudinary-image'
    };
  } catch (error) {
    console.error('Image thumbnail generation failed:', error);
    throw error;
  }
}

/**
 * Generate an SVG placeholder thumbnail
 * @param options Thumbnail options
 * @returns Thumbnail result
 */
export async function generatePlaceholderThumbnail(options: ThumbnailOptions): Promise<ThumbnailResult> {
  try {
    const { contentId, contentType = 'unknown' } = options;
    
    console.log(`Generating placeholder thumbnail for content ${contentId}, type: ${contentType}`);
    
    // Create SVG placeholder based on content type
    const backgroundColor = contentType === 'video' ? '#1a1a1a' : contentType === 'image' ? '#2a2a2a' : '#0f172a';
    const textColor = '#ff9000'; // Orange brand color
    const displayType = contentType.charAt(0).toUpperCase() + contentType.slice(1);
    
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
      <rect width="800" height="450" fill="${backgroundColor}"/>
      <text x="400" y="210" font-family="Arial" font-size="50" text-anchor="middle" fill="${textColor}">
        ${displayType} Thumbnail
      </text>
      <text x="400" y="270" font-family="Arial" font-size="30" text-anchor="middle" fill="${textColor}">
        (Placeholder)
      </text>
    </svg>`;
    
    // Save SVG to S3
    const thumbnailS3Key = getThumbnailS3Key(contentId, contentType, 'svg');
    await uploadToS3(svg, thumbnailS3Key, { contentType: 'image/svg+xml' });
    console.log(`Saved placeholder SVG to S3: ${thumbnailS3Key}`);
    
    return {
      success: true,
      thumbnailPath: thumbnailS3Key,
      contentType: 'image/svg+xml',
      method: 'svg-placeholder'
    };
  } catch (error) {
    console.error('Placeholder thumbnail generation failed:', error);
    throw error;
  }
}
