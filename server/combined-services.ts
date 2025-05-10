/**
 * Combined Services - Provides both old and new service implementations
 * for backward compatibility during the migration
 */

import { storage as s3Service } from "./services/ThumbnailService";
import thumbnailService from "./services/ThumbnailService";
// Using FFmpeg for thumbnail generation

// Export legacy function names that map to new service methods for backward compatibility
export const getSignedS3Url = s3Service.getSignedS3Url;
// Adapt the uploadFileToS3 to match the original signature
export async function uploadFileToS3(filePath: string, s3Key: string): Promise<string> {
  try {
    // Read the file from disk
    const fs = await import('fs/promises');
    const fileBuffer = await fs.readFile(filePath);
    
    // Determine content type based on file extension
    const path = await import('path');
    const ext = path.extname(filePath).toLowerCase();
    let contentType = 'application/octet-stream';
    
    // Map common extensions to MIME types
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo'
    };
    
    if (ext in mimeTypes) {
      contentType = mimeTypes[ext];
    }
    
    // Upload to S3
    return s3Service.uploadToS3(fileBuffer, s3Key, { contentType });
  } catch (error) {
    console.error(`Error in uploadFileToS3: ${error}`);
    throw error;
  }
}
export const deleteFileFromS3 = s3Service.deleteFromS3;

// Helper function to convert string to Buffer for uploadStringToS3
export async function uploadStringToS3(
  content: string | Buffer,
  s3Key: string,
  contentType: string,
  options?: { encoding?: string }
): Promise<string> {
  let buffer: Buffer;
  
  if (typeof content === 'string') {
    if (options?.encoding === 'base64') {
      buffer = Buffer.from(content, 'base64');
    } else {
      buffer = Buffer.from(content);
    }
  } else {
    buffer = content;
  }
  
  return s3Service.uploadToS3(buffer, s3Key, { contentType });
}

// Legacy function to convert local path to S3 key
export function localPathToS3Key(localPath: string): string {
  const filename = localPath.split('/').pop() || '';
  const parts = filename.split('-');
  
  if (parts.length > 1 && !isNaN(parseInt(parts[1]))) {
    const contentId = parseInt(parts[1]);
    if (filename.includes('video-')) {
      // Create a standard S3 key for video
      return `uploads/videos/${filename}`;
    } else if (filename.includes('image-')) {
      // Create a standard S3 key for image
      return `uploads/images/${filename}`;
    } else if (filename.includes('thumb-')) {
      return s3Service.getThumbnailS3Key(contentId, 'video');
    }
  }
  
  // Default path if pattern doesn't match
  return `uploads/${filename}`;
}

// Legacy function to convert URL path to S3 key
export function urlPathToS3Key(urlPath: string): string {
  return localPathToS3Key(urlPath);
}

// Map old function to new function using FFmpeg for thumbnail generation
export async function generateAndStoreS3Thumbnail(
  contentId: number,
  contentType: string,
  sourceUrl: string | null = null,
  youtubeId: string | null = null
): Promise<string> {
  console.log(`Thumbnail generation request for ${contentType} ${contentId} using FFmpeg`);
  try {
    // Use our unified ThumbnailService
    const result = await thumbnailService.generateThumbnail({
      contentId,
      contentType,
      sourceUrl: sourceUrl || undefined,
      youtubeId: youtubeId || undefined,
      generatePlaceholder: !sourceUrl && !youtubeId
    });
    
    return result.thumbnailPath;
  } catch (error) {
    console.error(`Error in thumbnail generation for ${contentId}:`, error);
    // Generate and return a placeholder in case of any errors
    return `thumbnails/placeholder-${contentId}.svg`;
  }
}

// SVG Placeholder generator using the unified thumbnail service
export function generateSvgPlaceholder(contentType: string): string {
  // Create a simple SVG placeholder based on content type
  const backgroundColor = contentType === 'video' ? '#1a1a1a' : contentType === 'image' ? '#2a2a2a' : '#0f172a';
  const textColor = '#ff9000'; // Orange brand color
  const displayType = contentType.charAt(0).toUpperCase() + contentType.slice(1);
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
    <rect width="800" height="450" fill="${backgroundColor}"/>
    <text x="400" y="210" font-family="Arial" font-size="50" text-anchor="middle" fill="${textColor}">
      ${displayType} Thumbnail
    </text>
    <text x="400" y="270" font-family="Arial" font-size="30" text-anchor="middle" fill="${textColor}">
      (Placeholder)
    </text>
  </svg>`;
}
