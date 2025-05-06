/**
 * Simplified Thumbnail Service using Cloudinary's Direct API Approach
 * 
 * This service provides a streamlined approach to generate thumbnails using Cloudinary
 * without any dependency on FFmpeg or complex processing logic.
 */

import { v2 as cloudinary } from 'cloudinary';
import s3Service from './s3Service';
import { getYoutubeThumbnailUrl, extractYoutubeVideoId } from '../youtubeUtils';

// We won't configure Cloudinary directly here
// Instead, we'll use dynamic configuration during runtime to pick up the latest credentials

// This function ensures we have the latest Cloudinary configuration
async function ensureCloudinaryConfig() {
  // Log current configuration
  console.log('Ensuring Cloudinary has the latest credentials...');
  
  // Extract credentials directly from environment variables
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  
  // Update the configuration
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true
  });
  
  // Log configuration status
  console.log(`Cloudinary configuration updated:`);
  console.log(`- Cloud name: ${cloudName ? 'Present' : 'Missing'}`);
  console.log(`- API key: ${apiKey ? 'Present' : 'Missing'}`);
  console.log(`- API secret: ${apiSecret ? 'Present' : 'Missing'}`);
  
  // Validate configuration
  if (!cloudName || !apiKey || !apiSecret) {
    console.warn('WARNING: Cloudinary credentials incomplete - thumbnail generation will be limited');
  }
}

/**
 * Generate a thumbnail for video content using Cloudinary's direct API
 * This simplified approach uses Cloudinary's uploader API for maximum compatibility
 */
export async function generateThumbnail(videoId: number, s3Key: string): Promise<string> {
  try {
    console.log(`Generating simplified thumbnail for video ${videoId} using Cloudinary direct API`);
    
    // Ensure Cloudinary has the latest configuration
    await ensureCloudinaryConfig();
    
    // Import combined services for simplified access
    const { getSignedS3Url, uploadStringToS3 } = await import('../combined-services');
    
    // Get a signed URL for the video in S3
    const s3Url = await getSignedS3Url(s3Key);
    console.log(`Got signed S3 URL for video: ${s3Url.substring(0, 50)}...`);
    
    try {
      // Upload to Cloudinary and generate thumbnail
      console.log('Starting Cloudinary upload with updated credentials...');
      const result = await cloudinary.uploader.upload(s3Url, {
        resource_type: 'video',
        public_id: `video-${videoId}`,
        eager: [
          { 
            format: 'jpg', 
            transformation: [
              { width: 800, height: 450, crop: 'fill' },
              { start_offset: '1' }
            ]
          }
        ],
        eager_async: false, // Wait for processing to complete
        eager_notification_url: null // No notification needed
      });
      
      // Get the thumbnail URL from the result
      const thumbnailUrl = result.eager[0].secure_url;
      console.log(`Successfully generated Cloudinary thumbnail: ${thumbnailUrl}`);
      
      // Save the thumbnail to our S3
      try {
        const thumbnailResponse = await fetch(thumbnailUrl);
        if (!thumbnailResponse.ok) {
          throw new Error(`Failed to fetch Cloudinary thumbnail: ${thumbnailResponse.status}`);
        }
        
        const thumbnailBuffer = Buffer.from(await thumbnailResponse.arrayBuffer());
        const thumbnailS3Key = `thumbnails/video-${videoId}.jpg`;
        await uploadStringToS3(thumbnailBuffer, thumbnailS3Key, 'image/jpeg');
        console.log(`Saved thumbnail to S3: ${thumbnailS3Key}`);
        
        // Return the S3 key for the thumbnail
        return thumbnailS3Key;
      } catch (s3Error) {
        console.error('Failed to save thumbnail to S3:', s3Error);
        
        // If we can't save to S3, return the Cloudinary URL
        // This ensures we at least have a working thumbnail
        return thumbnailUrl;
      }
    } catch (cloudinaryError) {
      console.error('Cloudinary processing failed:', cloudinaryError);
      throw cloudinaryError;
    }
  } catch (error) {
    console.error('Cloudinary thumbnail generation failed:', error);
    throw error;
  }
}

/**
 * Generate a thumbnail from a YouTube video using its ID
 */
export async function generateYouTubeThumbnail(videoId: number, youtubeId: string): Promise<string> {
  try {
    console.log(`Generating thumbnail for YouTube video ${youtubeId}`);
    
    // Ensure Cloudinary has the latest configuration
    await ensureCloudinaryConfig();
    
    // Import combined services for simplified access
    const { uploadStringToS3 } = await import('../combined-services');
    
    // Try the direct YouTube thumbnail approach first (faster and more reliable)
    try {
      const youtubeThumbnailUrl = getYoutubeThumbnailUrl(youtubeId, 'maxresdefault');
      console.log(`Using direct YouTube thumbnail URL: ${youtubeThumbnailUrl}`);
      
      const response = await fetch(youtubeThumbnailUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch YouTube thumbnail: ${response.status}`);
      }
      
      const imageBuffer = Buffer.from(await response.arrayBuffer());
      const thumbnailS3Key = `thumbnails/youtube-${videoId}.jpg`;
      await uploadStringToS3(imageBuffer, thumbnailS3Key, 'image/jpeg');
      
      console.log(`Successfully saved YouTube thumbnail to S3: ${thumbnailS3Key}`);
      return thumbnailS3Key;
    } catch (directError) {
      console.error('Direct YouTube thumbnail approach failed:', directError);
      
      // Fall back to Cloudinary for processing
      console.log('Falling back to Cloudinary for YouTube thumbnail generation');
      
      // Use Cloudinary with updated credentials
      const youtubeUrl = `https://www.youtube.com/watch?v=${youtubeId}`;
      console.log(`Uploading YouTube URL to Cloudinary: ${youtubeUrl}`);
      
      const result = await cloudinary.uploader.upload(youtubeUrl, {
        resource_type: 'video',
        public_id: `youtube-${videoId}`,
        eager: [
          { 
            format: 'jpg', 
            transformation: [
              { width: 800, height: 450, crop: 'fill' },
              { start_offset: '1' }
            ]
          }
        ],
        eager_async: false
      });
      
      console.log('Cloudinary upload successful, extracting thumbnail URL');
      const thumbnailUrl = result.eager[0].secure_url;
      
      // Save to S3
      console.log(`Downloading Cloudinary thumbnail: ${thumbnailUrl}`);
      const thumbnailResponse = await fetch(thumbnailUrl);
      const thumbnailBuffer = Buffer.from(await thumbnailResponse.arrayBuffer());
      const thumbnailS3Key = `thumbnails/youtube-${videoId}.jpg`;
      await uploadStringToS3(thumbnailBuffer, thumbnailS3Key, 'image/jpeg');
      
      console.log(`Successfully saved Cloudinary YouTube thumbnail to S3: ${thumbnailS3Key}`);
      return thumbnailS3Key;
    }
  } catch (error) {
    console.error('YouTube thumbnail generation failed completely:', error);
    throw error;
  }
}

/**
 * Generate a basic SVG placeholder for content with no thumbnail
 */
export function generatePlaceholder(contentType: string = 'video'): string {
  const backgroundColor = contentType === 'video' ? '#1a1a1a' : '#2a2a2a';
  const textColor = '#ff9000';
  const iconType = contentType === 'video' ? 'video-camera' : 'image';
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
    <rect width="800" height="450" fill="${backgroundColor}"/>
    <text x="400" y="225" font-family="Arial" font-size="50" text-anchor="middle" fill="${textColor}">
      ${contentType.charAt(0).toUpperCase() + contentType.slice(1)} Thumbnail
    </text>
    <text x="400" y="275" font-family="Arial" font-size="30" text-anchor="middle" fill="${textColor}">
      (Placeholder)
    </text>
  </svg>`;
}
