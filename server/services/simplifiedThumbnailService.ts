/**
 * Simplified Thumbnail Service using Cloudinary's Direct API Approach
 * 
 * This service provides a streamlined approach to generate thumbnails using Cloudinary
 * without any dependency on FFmpeg or complex processing logic.
 */

import { v2 as cloudinary, UploadApiOptions } from 'cloudinary';
import s3Service from './s3Service';

/**
 * Extract YouTube video ID from various YouTube URL formats
 */
export function extractYoutubeVideoId(url: string): string | null {
  if (!url) return null;
  
  // Handle both embed codes and regular YouTube URLs
  const patterns = [
    /youtube\.com\/embed\/([\w-]+)/i,           // embed URLs
    /youtube\.com\/watch\?v=([\w-]+)/i,         // standard watch URLs
    /youtu\.be\/([\w-]+)/i,                     // short URLs
    /youtube\.com\/v\/([\w-]+)/i,               // old embed URLs
    /youtube\.com\/user\/[\w-]+\/\?v=([\w-]+)/i, // user page videos
    /youtube\.com\/\?v=([\w-]+)/i,               // another variation
    /\<iframe[^>]*src=".*?youtube\.com\/embed\/([\w-]+)".*?\<\/iframe\>/i  // iframe embed
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Get the best quality YouTube thumbnail URL for a given video ID
 */
export function getYoutubeThumbnailUrl(videoId: string | null, quality: string = 'maxresdefault'): string | null {
  if (!videoId) return null;
  
  // YouTube offers several thumbnail options:
  // maxresdefault.jpg (1280x720)
  // sddefault.jpg (640x480)
  // hqdefault.jpg (480x360)
  // mqdefault.jpg (320x180)
  // default.jpg (120x90)
  
  // Use the specified quality or default to highest quality
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
}

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
      // Define options with proper typing
      const uploadOptions: UploadApiOptions = {
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
        eager_async: false // Wait for processing to complete
      };
      const result = await cloudinary.uploader.upload(s3Url, uploadOptions);
      
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
      const youtubeThumbnailUrl = getYoutubeThumbnailUrl(youtubeId);
      if (!youtubeThumbnailUrl) {
        throw new Error('Could not generate YouTube thumbnail URL - invalid YouTube ID');
      }
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
      
      // Define options with proper typing
      const youtubeOptions: UploadApiOptions = {
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
      };
      const result = await cloudinary.uploader.upload(youtubeUrl, youtubeOptions);
      
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

/**
 * Generate a thumbnail from a base64-encoded image or video frame
 */
export async function generateFromBase64(videoId: number, base64Data: string, contentType: string): Promise<string> {
  try {
    console.log(`Generating thumbnail from base64 data for content ID ${videoId}`);    
    // Ensure Cloudinary has the latest configuration
    await ensureCloudinaryConfig();
    
    // Import combined services for simplified access
    const { uploadStringToS3 } = await import('../combined-services');
    
    // Prepare data for upload
    const thumbnailS3Key = `thumbnails/${contentType}-${videoId}.jpg`;
    const buffer = Buffer.from(base64Data.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    
    // Upload to S3 directly since it's already a usable image
    await uploadStringToS3(buffer, thumbnailS3Key, 'image/jpeg');
    console.log(`Successfully saved base64 thumbnail to S3: ${thumbnailS3Key}`);
    
    return thumbnailS3Key;
  } catch (error) {
    console.error('Base64 thumbnail generation failed:', error);
    throw error;
  }
}

/**
 * Test the Cloudinary connection by uploading a simple test image
 */
export async function testConnection(): Promise<boolean> {
  try {
    console.log('Testing Cloudinary connection...');
    
    // Ensure we have the latest configuration
    await ensureCloudinaryConfig();
    
    // Create a small test SVG
    const testSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
      <rect width="100" height="100" fill="#ff9000"/>
      <text x="50" y="50" font-family="Arial" font-size="12" text-anchor="middle" fill="black">Test</text>
    </svg>`;
    
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(
      `data:image/svg+xml;base64,${Buffer.from(testSvg).toString('base64')}`,
      { resource_type: 'image', public_id: 'test-connection' }
    );
    
    console.log('Cloudinary connection test successful:', result.secure_url);
    return true;
  } catch (error) {
    console.error('Cloudinary connection test failed:', error);
    return false;
  }
}

/**
 * Upload a test image to verify configuration
 */
export async function uploadTestImage(imagePath: string): Promise<string | null> {
  try {
    console.log(`Testing Cloudinary upload with image: ${imagePath}`);
    
    // Ensure we have the latest configuration
    await ensureCloudinaryConfig();
    
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(imagePath, {
      resource_type: 'image',
      public_id: 'test-upload-' + Date.now()
    });
    
    console.log('Cloudinary test upload successful:', result.secure_url);
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary test upload failed:', error);
    return null;
  }
}

// Export functions as a default object for backward compatibility
export default {
  ensureCloudinaryConfig,
  testConnection,
  uploadTestImage,
  extractYoutubeVideoId,
  getYoutubeThumbnailUrl,
  generateFromBase64,
  generateThumbnail,
  generateYouTubeThumbnail,
  generatePlaceholder
};
