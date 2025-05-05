/**
 * Cloudinary Service - Handles all Cloudinary operations for media transformation
 * 
 * This service provides a streamlined interface to Cloudinary for generating thumbnails
 * directly from S3 URLs without needing local file storage.
 */

import { v2 as cloudinary } from 'cloudinary';
import s3Service from './s3Service';

// Configure Cloudinary with credentials from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

/**
 * Generate a thumbnail using Cloudinary from a source URL
 * @param contentId Content ID for proper S3 key generation
 * @param sourceUrl URL of the original media (video, image or YouTube URL)
 * @param contentType Type of content (video, image, embed)
 * @param options Additional transformation options
 * @returns S3 key of the generated thumbnail
 */
async function generateThumbnail(
  contentId: number,
  sourceUrl: string | null,
  contentType: string,
  youtubeId: string | null = null,
  options: { width?: number; height?: number } = {}
): Promise<string> {
  console.log(`Generating Cloudinary thumbnail for ${contentType} ${contentId}`);
  console.log(`Source URL: ${sourceUrl || 'none'}`);
  console.log(`YouTube ID: ${youtubeId || 'none'}`);
  
  try {
    // Set default dimensions if not provided
    const width = options.width || 800;
    const height = options.height || 450;
    
    // For YouTube videos, use the video ID directly
    if (youtubeId) {
      const youtubeUrl = `https://www.youtube.com/watch?v=${youtubeId}`;
      return await generateFromUrl(contentId, youtubeUrl, width, height);
    }
    
    // If we have a source URL, use it
    if (sourceUrl) {
      // Check if it's a base64 encoded image
      if (sourceUrl.startsWith('data:image')) {
        // Upload base64 image to Cloudinary and get transformed URL
        return await generateFromBase64(contentId, sourceUrl, width, height);
      }
      
      // Otherwise, it's a regular URL
      return await generateFromUrl(contentId, sourceUrl, width, height);
    }
    
    // If we don't have a source URL, generate a placeholder
    console.log(`No source URL provided for ${contentType} ${contentId}, generating placeholder`);
    return await generatePlaceholder(contentId, contentType, width, height);
  } catch (error) {
    console.error(`Error generating Cloudinary thumbnail:`, error);
    // Fall back to placeholder on error
    try {
      return await generatePlaceholder(contentId, contentType);
    } catch (placeholderError) {
      console.error(`Error generating placeholder:`, placeholderError);
      throw new Error(`Failed to generate any thumbnail for ${contentType} ${contentId}`);
    }
  }
}

/**
 * Generate a thumbnail from a URL using Cloudinary
 * @param contentId Content ID for proper S3 key generation
 * @param url Source URL (can be image, video, or YouTube URL)
 * @param width Desired width
 * @param height Desired height
 * @returns S3 key of the generated thumbnail
 */
async function generateFromUrl(
  contentId: number,
  url: string,
  width: number = 800,
  height: number = 450
): Promise<string> {
  console.log(`Generating thumbnail from URL: ${url}`);
  
  try {
    // Transform the URL using Cloudinary's fetch functionality
    const transformation = {
      width,
      height,
      crop: 'fill',
      quality: 'auto',
      format: 'jpg',
      fetch_format: 'auto'
    };
    
    // Generate the Cloudinary URL with transformation - use fetch for remote URLs
    const result = cloudinary.url(url, {
      type: 'fetch',
      transformation: [transformation],
      sign_url: true
    });
    
    console.log(`Cloudinary transformation URL: ${result}`);
    
    // Now fetch the transformed image from Cloudinary
    const response = await fetch(result);
    if (!response.ok) {
      throw new Error(`Failed to fetch transformed image: ${response.status}`);
    }
    
    // Get the image buffer
    const imageBuffer = Buffer.from(await response.arrayBuffer());
    
    // Upload to S3
    const s3Key = s3Service.getThumbnailS3Key(contentId);
    await s3Service.uploadToS3(imageBuffer, s3Key, 'image/jpeg');
    
    console.log(`Successfully uploaded thumbnail to S3: ${s3Key}`);
    return s3Key;
  } catch (error) {
    console.error(`Error generating thumbnail from URL:`, error);
    throw error;
  }
}

/**
 * Generate a thumbnail from a base64 encoded image
 * @param contentId Content ID for proper S3 key generation
 * @param base64Data Base64 encoded image data
 * @param width Desired width
 * @param height Desired height
 * @returns S3 key of the generated thumbnail
 */
async function generateFromBase64(
  contentId: number,
  base64Data: string,
  width: number = 800,
  height: number = 450
): Promise<string> {
  console.log(`Generating thumbnail from base64 data for content ${contentId}`);
  
  try {
    // Upload base64 to Cloudinary
    const uploadResult = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader.upload(base64Data, {
        folder: 'thumbnails',
        transformation: [
          { width, height, crop: 'fill', quality: 'auto', format: 'jpg' }
        ]
      }, (error, result) => {
        if (error) return reject(error);
        resolve(result);
      });
    });
    
    console.log(`Uploaded to Cloudinary: ${uploadResult.public_id}`);
    
    // Fetch the transformed image from Cloudinary
    const response = await fetch(uploadResult.secure_url);
    if (!response.ok) {
      throw new Error(`Failed to fetch from Cloudinary: ${response.status}`);
    }
    
    // Get the image buffer
    const imageBuffer = Buffer.from(await response.arrayBuffer());
    
    // Upload to S3
    const s3Key = s3Service.getThumbnailS3Key(contentId);
    await s3Service.uploadToS3(imageBuffer, s3Key, 'image/jpeg');
    
    console.log(`Successfully uploaded thumbnail to S3: ${s3Key}`);
    return s3Key;
  } catch (error) {
    console.error(`Error generating thumbnail from base64:`, error);
    throw error;
  }
}

/**
 * Generate a placeholder thumbnail when no source is available
 * @param contentId Content ID for proper S3 key generation
 * @param contentType Type of content
 * @param width Desired width
 * @param height Desired height
 * @returns S3 key of the generated placeholder
 */
async function generatePlaceholder(
  contentId: number,
  contentType: string,
  width: number = 800,
  height: number = 450
): Promise<string> {
  console.log(`Generating placeholder thumbnail for ${contentType} ${contentId}`);
  
  try {
    // Generate a placeholder image URL using Cloudinary text overlay
    const text = `AI Generated ${contentType.charAt(0).toUpperCase()}${contentType.slice(1)}`;
    
    // Create a background with text
    const result = cloudinary.url('blank', {
      transformation: [
        { width, height, background: '0f172a' },
        { overlay: { font_family: 'Arial', font_size: 32, text }, color: 'f59e0b' },
        { flags: 'layer_apply', gravity: 'center' }
      ],
      sign_url: true
    });
    
    console.log(`Cloudinary placeholder URL: ${result}`);
    
    // Fetch the placeholder image
    const response = await fetch(result);
    if (!response.ok) {
      throw new Error(`Failed to fetch placeholder: ${response.status}`);
    }
    
    // Get the image buffer
    const imageBuffer = Buffer.from(await response.arrayBuffer());
    
    // Upload to S3
    const s3Key = s3Service.getThumbnailS3Key(contentId);
    await s3Service.uploadToS3(imageBuffer, s3Key, 'image/jpeg');
    
    console.log(`Successfully uploaded placeholder to S3: ${s3Key}`);
    return s3Key;
  } catch (error) {
    console.error(`Error generating placeholder:`, error);
    
    // If Cloudinary fails, fall back to a simple SVG placeholder
    try {
      const svg = generateSvgPlaceholder(contentType, width, height);
      const s3Key = s3Service.getThumbnailS3Key(contentId);
      await s3Service.uploadToS3(Buffer.from(svg), s3Key, 'image/svg+xml');
      
      console.log(`Successfully uploaded SVG placeholder to S3: ${s3Key}`);
      return s3Key;
    } catch (svgError) {
      console.error(`Error generating SVG placeholder:`, svgError);
      throw new Error(`Failed to generate any placeholder for ${contentType} ${contentId}`);
    }
  }
}

/**
 * Generate an SVG placeholder as last resort
 * @param contentType Type of content
 * @param width SVG width
 * @param height SVG height
 * @returns SVG markup as string
 */
function generateSvgPlaceholder(
  contentType: string,
  width: number = 800,
  height: number = 450
): string {
  const bgColor = '#0f172a';
  const textColor = '#f59e0b';
  
  // Normalize content type
  let normalizedType = contentType;
  if (contentType === 'videos') normalizedType = 'video';
  if (contentType === 'images') normalizedType = 'image';
  
  // Display proper content type in the SVG
  const displayType = normalizedType.charAt(0).toUpperCase() + normalizedType.slice(1);
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" fill="${bgColor}"/>
    <text x="${width/2}" y="${height/2}" font-family="Arial" font-size="24" fill="${textColor}" text-anchor="middle">
      AI Generated ${displayType}
    </text>
  </svg>`;
}

/**
 * Extract YouTube video ID from URL or embed code
 * @param source YouTube URL or embed code
 * @returns YouTube video ID or null if not found
 */
function extractYoutubeVideoId(source: string | null): string | null {
  if (!source) return null;
  
  // Common YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/i,
    /(?:youtube\.com\/embed\/)([^"&?\/ ]{11})/i,
    /(?:youtube\.com\/shorts\/)([^"&?\/ ]{11})/i
  ];
  
  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match && match[1]) return match[1];
  }
  
  return null;
}

/**
 * Gets the YouTube thumbnail URL for a video ID
 * @param videoId YouTube video ID
 * @returns Full URL to YouTube thumbnail
 */
function getYoutubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

// Export functions as a default object
export default {
  generateThumbnail,
  generateFromUrl,
  generateFromBase64,
  generatePlaceholder,
  extractYoutubeVideoId,
  getYoutubeThumbnailUrl
};
