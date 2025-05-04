/**
 * Thumbnail Service - Handles thumbnail generation for all media types
 * 
 * This service creates thumbnails for various content types (videos, images, embeds)
 * and stores them in AWS S3. It handles YouTube embeds, direct uploads, and
 * fallback SVG placeholders when generation fails.
 */

import s3Service from './s3Service';
import { storage as dbStorage } from '../storage';

/**
 * Main thumbnail generation function that handles all content types
 * @param contentId Database ID of the content
 * @param contentType Type of content (video, image, embed)
 * @param sourceUrl Source URL of the content (file path or HTTP URL)
 * @param youtubeId YouTube video ID if applicable
 * @returns S3 key of the generated thumbnail
 */
export async function generateThumbnail(
  contentId: number,
  contentType: string,
  sourceUrl: string | null = null,
  youtubeId: string | null = null
): Promise<string> {
  console.log(`Generating thumbnail for ${contentType} ${contentId}`);
  console.log(`Source URL: ${sourceUrl || 'none'}`);
  console.log(`YouTube ID: ${youtubeId || 'none'}`);
  
  try {
    // Handle YouTube videos if we have a YouTube ID
    if (youtubeId) {
      return await handleYouTubeThumbnail(contentId, youtubeId);
    }
    
    // Handle content based on type
    switch (contentType) {
      case 'image':
      case 'images':
        if (sourceUrl) {
          return await handleImageThumbnail(contentId, sourceUrl);
        }
        break;
        
      case 'video':
      case 'videos':
        if (sourceUrl) {
          return await handleVideoThumbnail(contentId, sourceUrl);
        }
        break;
        
      case 'embed':
        if (sourceUrl || youtubeId) {
          // If we have a YouTube ID, we've already handled it above
          if (sourceUrl && !youtubeId) {
            const extractedId = extractYoutubeVideoId(sourceUrl);
            if (extractedId) {
              return await handleYouTubeThumbnail(contentId, extractedId);
            }
          }
        }
        break;
    }
    
    // If we get here, we couldn't generate a thumbnail, so use a placeholder
    console.log(`No valid source for thumbnail, using placeholder for ${contentType} ${contentId}`);
    return await generatePlaceholderThumbnail(contentId, contentType);
    
  } catch (error) {
    console.error(`Error generating thumbnail: ${error}`);
    
    // Fall back to a placeholder on any error
    try {
      return await generatePlaceholderThumbnail(contentId, contentType);
    } catch (placeholderError) {
      console.error(`Error generating placeholder: ${placeholderError}`);
      throw new Error(`Failed to generate any thumbnail for ${contentType} ${contentId}`);
    }
  }
}

/**
 * Handles thumbnail generation for YouTube videos
 * @param contentId Database ID of the content
 * @param youtubeId YouTube video ID
 * @returns S3 key of the generated thumbnail
 */
async function handleYouTubeThumbnail(contentId: number, youtubeId: string): Promise<string> {
  console.log(`Generating YouTube thumbnail for video ${contentId} with ID ${youtubeId}`);
  
  try {
    // Get YouTube thumbnail URL
    const youtubeThumbnailUrl = getYoutubeThumbnailUrl(youtubeId);
    
    // Fetch the thumbnail image
    const response = await fetch(youtubeThumbnailUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch YouTube thumbnail: ${response.status}`);
    }
    
    // Convert to buffer
    const buffer = Buffer.from(await response.arrayBuffer());
    
    // Upload to S3
    const s3Key = s3Service.getThumbnailS3Key(contentId);
    await s3Service.uploadToS3(buffer, s3Key, 'image/jpeg');
    
    console.log(`Successfully generated YouTube thumbnail for video ${contentId}`);
    return s3Key;
  } catch (error) {
    console.error(`Error handling YouTube thumbnail: ${error}`);
    throw error;
  }
}

/**
 * Handles thumbnail generation for uploaded images
 * @param contentId Database ID of the content
 * @param sourceUrl Source URL of the image
 * @returns S3 key of the generated thumbnail
 */
async function handleImageThumbnail(contentId: number, sourceUrl: string): Promise<string> {
  console.log(`Generating image thumbnail for image ${contentId} from ${sourceUrl}`);
  
  try {
    let imageBuffer: Buffer;
    
    // Handle base64 encoded images
    if (sourceUrl.startsWith('data:image')) {
      console.log(`Processing base64 image for ${contentId}`);
      const matches = sourceUrl.match(/^data:[^;]+;base64,(.+)$/);
      if (!matches || matches.length !== 2) {
        throw new Error('Invalid base64 image data');
      }
      imageBuffer = Buffer.from(matches[1], 'base64');
    }
    // Handle URL images
    else if (sourceUrl.startsWith('http')) {
      console.log(`Fetching image from URL for ${contentId}`);
      const response = await fetch(sourceUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }
      imageBuffer = Buffer.from(await response.arrayBuffer());
    }
    // Handle local file paths
    else {
      console.log(`Reading image from local path for ${contentId}`);
      const fs = await import('fs/promises');
      imageBuffer = await fs.readFile(sourceUrl);
    }
    
    // Use the image as the thumbnail (resize could be added here)
    const s3Key = s3Service.getThumbnailS3Key(contentId);
    await s3Service.uploadToS3(imageBuffer, s3Key, 'image/jpeg');
    
    console.log(`Successfully generated image thumbnail for ${contentId}`);
    return s3Key;
  } catch (error) {
    console.error(`Error handling image thumbnail: ${error}`);
    throw error;
  }
}

/**
 * Handles thumbnail generation for uploaded videos
 * @param contentId Database ID of the content
 * @param sourceUrl Source URL of the video
 * @returns S3 key of the generated thumbnail
 */
async function handleVideoThumbnail(contentId: number, sourceUrl: string): Promise<string> {
  // For now, use a placeholder for videos
  // In a real implementation, FFmpeg would be used to extract frames
  console.log(`Video thumbnail generation not implemented, using placeholder for ${contentId}`);
  return generatePlaceholderThumbnail(contentId, 'video');
}

/**
 * Generates a placeholder SVG thumbnail when other methods fail
 * @param contentId Database ID of the content
 * @param contentType Type of content (video, image, embed)
 * @returns S3 key of the generated SVG placeholder
 */
async function generatePlaceholderThumbnail(contentId: number, contentType: string): Promise<string> {
  console.log(`Generating placeholder thumbnail for ${contentType} ${contentId}`);
  
  try {
    // Generate placeholder SVG
    const svg = generatePlaceholderSvg(contentType);
    
    // Upload to S3
    const s3Key = s3Service.getThumbnailS3Key(contentId);
    await s3Service.uploadToS3(Buffer.from(svg), s3Key, 'image/svg+xml');
    
    console.log(`Successfully generated placeholder thumbnail for ${contentType} ${contentId}`);
    return s3Key;
  } catch (error) {
    console.error(`Error generating placeholder thumbnail: ${error}`);
    throw error;
  }
}

/**
 * Creates an SVG placeholder with content type label
 * @param contentType Type of content (video, image, embed)
 * @returns SVG markup as string
 */
function generatePlaceholderSvg(contentType: string): string {
  const bgColor = '#0f172a';
  const textColor = '#f59e0b';
  const width = 800;
  const height = 450;
  
  // Display proper content type in the SVG
  const displayType = contentType.charAt(0).toUpperCase() + contentType.slice(1);
  
  if (contentType === 'image' || contentType === 'images') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="${width}" height="${height}" fill="${bgColor}" />
      <rect x="${width/2 - 125}" y="${height/2 - 75}" width="250" height="150" fill="#222" />
      <circle cx="${width/2}" cy="${height/2 - 45}" r="20" fill="${textColor}" />
      <rect x="${width/2 - 75}" y="${height/2}" width="150" height="60" fill="#333" />
      <text x="${width/2}" y="${height - 50}" font-family="Arial" font-size="24" fill="${textColor}" text-anchor="middle">
        AI Generated ${displayType}
      </text>
    </svg>`;
  }
  
  // Default video placeholder with play button
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" fill="${bgColor}" />
    <circle cx="${width/2}" cy="${height/2}" r="80" fill="#222" />
    <polygon points="${width/2 - 30},${height/2 - 45} ${width/2 - 30},${height/2 + 45} ${width/2 + 45},${height/2}" fill="${textColor}" />
    <text x="${width/2}" y="${height - 50}" font-family="Arial" font-size="24" fill="${textColor}" text-anchor="middle">
      AI Generated ${displayType}
    </text>
  </svg>`;
}

/**
 * Extracts the YouTube video ID from a URL or embed code
 * @param source YouTube URL or embed code
 * @returns YouTube video ID or null if not found
 */
export function extractYoutubeVideoId(source: string | null): string | null {
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
export function getYoutubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export default {
  generateThumbnail,
  extractYoutubeVideoId,
  getYoutubeThumbnailUrl
};
