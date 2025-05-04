/**
 * Thumbnail Service - Handles thumbnail generation for all media types
 * 
 * This service creates thumbnails for various content types (videos, images, embeds)
 * and stores them in AWS S3. It handles YouTube embeds, direct uploads, and
 * fallback SVG placeholders when generation fails.
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';
import s3Service from './s3Service';

const execFileAsync = promisify(execFile);

// File types that can be processed
const SUPPORTED_VIDEO_TYPES = ['.mp4', '.mov', '.webm', '.avi', '.mkv'];
const SUPPORTED_IMAGE_TYPES = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

// Thumbnail dimensions
const THUMBNAIL_WIDTH = 800;
const THUMBNAIL_HEIGHT = 450;

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
  console.log(`Generating thumbnail for content ID ${contentId} of type ${contentType}`);
  
  try {
    // For YouTube embeds, use YouTube's thumbnails
    if (youtubeId) {
      return await handleYouTubeThumbnail(contentId, youtubeId);
    }
    
    // For uploaded images, use the image itself as thumbnail
    if (contentType === 'image' && sourceUrl) {
      return await handleImageThumbnail(contentId, sourceUrl);
    }
    
    // For uploaded videos, generate a thumbnail using FFmpeg
    if (contentType === 'video' && sourceUrl) {
      return await handleVideoThumbnail(contentId, sourceUrl);
    }
    
    // Default fallback: Generate an SVG placeholder
    return await generatePlaceholderThumbnail(contentId, contentType);
  } catch (error) {
    console.error(`Thumbnail generation failed for content ID ${contentId}:`, error);
    // In case of failure, generate a placeholder SVG thumbnail
    return await generatePlaceholderThumbnail(contentId, contentType);
  }
}

/**
 * Handles thumbnail generation for YouTube videos
 * @param contentId Database ID of the content
 * @param youtubeId YouTube video ID
 * @returns S3 key of the generated thumbnail
 */
async function handleYouTubeThumbnail(contentId: number, youtubeId: string): Promise<string> {
  try {
    console.log(`Fetching YouTube thumbnail for video ID: ${youtubeId}`);
    
    // Try to get the highest quality thumbnail first
    let youtubeThumbnailUrl = `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;
    let response = await fetch(youtubeThumbnailUrl);
    
    // If maxresdefault is not available, fall back to high quality
    if (!response.ok) {
      youtubeThumbnailUrl = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
      response = await fetch(youtubeThumbnailUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch YouTube thumbnail: ${response.status}`);
      }
    }
    
    const thumbnailBuffer = Buffer.from(await response.arrayBuffer());
    const s3Key = s3Service.getThumbnailS3Key(contentId);
    
    await s3Service.uploadToS3(thumbnailBuffer, s3Key, 'image/jpeg');
    return s3Key;
  } catch (error) {
    console.error('Error creating YouTube thumbnail:', error);
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
  try {
    console.log(`Creating image thumbnail from: ${sourceUrl}`);
    
    // Get the image from URL or file path
    let imageBuffer: Buffer;
    if (sourceUrl.startsWith('http')) {
      const response = await fetch(sourceUrl);
      if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
      imageBuffer = Buffer.from(await response.arrayBuffer());
    } else {
      // Handle file path (adjust if it's an API URL)
      const actualPath = sourceUrl.replace('/api/s3/', '');
      const filePath = actualPath.startsWith('/') ? actualPath.substring(1) : actualPath;
      
      if (!fs.existsSync(filePath)) {
        throw new Error(`Image file not found at path: ${filePath}`);
      }
      
      imageBuffer = await fs.promises.readFile(filePath);
    }
    
    // For images, we'll create a proper thumbnail using FFmpeg to ensure consistent size/format
    const tempDir = os.tmpdir();
    const tempImage = path.join(tempDir, `image-${Date.now()}.jpg`);
    const tempThumb = path.join(tempDir, `thumb-${Date.now()}.jpg`);
    
    // Write the image to a temp file
    await fs.promises.writeFile(tempImage, imageBuffer);
    
    // Use FFmpeg to create a properly sized thumbnail
    try {
      await execFileAsync('ffmpeg', [
        '-y',
        '-i', tempImage,
        '-vf', `scale=${THUMBNAIL_WIDTH}:${THUMBNAIL_HEIGHT}:force_original_aspect_ratio=decrease,pad=${THUMBNAIL_WIDTH}:${THUMBNAIL_HEIGHT}:(ow-iw)/2:(oh-ih)/2:black`,
        tempThumb
      ]);
      
      const thumbBuffer = await fs.promises.readFile(tempThumb);
      const s3Key = s3Service.getThumbnailS3Key(contentId);
      
      await s3Service.uploadToS3(thumbBuffer, s3Key, 'image/jpeg');
      
      // Clean up temp files
      try {
        if (fs.existsSync(tempImage)) await fs.promises.unlink(tempImage);
        if (fs.existsSync(tempThumb)) await fs.promises.unlink(tempThumb);
      } catch (cleanupError) {
        console.error('Error cleaning up temp files:', cleanupError);
      }
      
      return s3Key;
    } catch (ffmpegError) {
      console.error('FFmpeg thumbnail generation failed:', ffmpegError);
      
      // If FFmpeg fails, use the original image as the thumbnail
      const s3Key = s3Service.getThumbnailS3Key(contentId);
      await s3Service.uploadToS3(imageBuffer, s3Key, 'image/jpeg');
      
      // Clean up temp files
      try {
        if (fs.existsSync(tempImage)) await fs.promises.unlink(tempImage);
      } catch (cleanupError) {
        console.error('Error cleaning up temp files:', cleanupError);
      }
      
      return s3Key;
    }
  } catch (error) {
    console.error('Error creating image thumbnail:', error);
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
  try {
    console.log(`Creating video thumbnail from: ${sourceUrl}`);
    
    const tempDir = os.tmpdir();
    const tempThumb = path.join(tempDir, `thumb-${Date.now()}.jpg`);
    
    // Handle file path (adjust if it's an API URL)
    let videoPath = sourceUrl;
    if (!sourceUrl.startsWith('http')) {
      const actualPath = sourceUrl.replace('/api/s3/', '');
      videoPath = actualPath.startsWith('/') ? actualPath.substring(1) : actualPath;
      
      if (!fs.existsSync(videoPath)) {
        throw new Error(`Video file not found at path: ${videoPath}`);
      }
    }
    
    // Try multiple timestamp positions to get a good thumbnail
    const timestamps = ['0.5', '2.0', '5.0', '10.0'];
    let thumbBuffer: Buffer | null = null;
    
    for (const timestamp of timestamps) {
      try {
        // Remote URL or local file path handling
        if (sourceUrl.startsWith('http')) {
          // For remote videos, we'd need to stream or download first, but for now
          // we'll focus on locally accessible files and assume HTTP URLs are pre-downloaded
          throw new Error('Remote video URLs not directly supported for thumbnail generation');
        } else {
          // Generate thumbnail from local file
          await execFileAsync('ffmpeg', [
            '-y',
            '-i', videoPath,
            '-vframes', '1',
            '-an',
            '-s', `${THUMBNAIL_WIDTH}x${THUMBNAIL_HEIGHT}`,
            '-ss', timestamp,
            tempThumb
          ]);
          
          // Verify the thumbnail file exists and has content
          if (fs.existsSync(tempThumb)) {
            const stats = await fs.promises.stat(tempThumb);
            if (stats.size > 0) {
              thumbBuffer = await fs.promises.readFile(tempThumb);
              break;
            }
          }
        }
      } catch (ffmpegError) {
        console.error(`FFmpeg thumbnail generation failed at timestamp ${timestamp}:`, ffmpegError);
        // Continue to the next timestamp
        if (timestamp === timestamps[timestamps.length - 1]) {
          throw ffmpegError; // Re-throw on last attempt
        }
      }
    }
    
    // If we have a valid thumbnail, upload it to S3
    if (thumbBuffer && thumbBuffer.length > 0) {
      const s3Key = s3Service.getThumbnailS3Key(contentId);
      await s3Service.uploadToS3(thumbBuffer, s3Key, 'image/jpeg');
      
      // Clean up temp files
      try {
        if (fs.existsSync(tempThumb)) await fs.promises.unlink(tempThumb);
      } catch (cleanupError) {
        console.error('Error cleaning up temp files:', cleanupError);
      }
      
      return s3Key;
    }
    
    throw new Error('Failed to generate a valid thumbnail from video');
  } catch (error) {
    console.error('Error creating video thumbnail:', error);
    throw error;
  }
}

/**
 * Generates a placeholder SVG thumbnail when other methods fail
 * @param contentId Database ID of the content
 * @param contentType Type of content (video, image, embed)
 * @returns S3 key of the generated SVG placeholder
 */
async function generatePlaceholderThumbnail(contentId: number, contentType: string): Promise<string> {
  try {
    console.log(`Generating placeholder thumbnail for content ID ${contentId}`);
    
    const svg = generatePlaceholderSvg(contentType);
    const s3Key = s3Service.getThumbnailS3Key(contentId);
    
    await s3Service.uploadToS3(Buffer.from(svg), s3Key, 'image/svg+xml');
    return s3Key;
  } catch (error) {
    console.error('Error creating placeholder thumbnail:', error);
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
  const displayType = contentType.charAt(0).toUpperCase() + contentType.slice(1);
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${THUMBNAIL_WIDTH}" height="${THUMBNAIL_HEIGHT}" viewBox="0 0 ${THUMBNAIL_WIDTH} ${THUMBNAIL_HEIGHT}">
    <rect width="${THUMBNAIL_WIDTH}" height="${THUMBNAIL_HEIGHT}" fill="${bgColor}"/>
    <text x="${THUMBNAIL_WIDTH/2}" y="${THUMBNAIL_HEIGHT/2}" font-family="Arial" font-size="24" fill="${textColor}" text-anchor="middle">
      ${displayType} Preview
    </text>
  </svg>`;
}

/**
 * Extracts the YouTube video ID from a URL or embed code
 * @param source YouTube URL or embed code
 * @returns YouTube video ID or null if not found
 */
export function extractYoutubeVideoId(source: string): string | null {
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
