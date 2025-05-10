/**
 * Unified ThumbnailService for DeepTube
 *
 * This service consolidates all thumbnail generation functionality into a single
 * streamlined interface with consistent error handling and fallbacks.
 */

import { ThumbnailOptions, ThumbnailResult } from './types';
import * as ffmpeg from './ffmpeg';
import * as storage from './storage';
import * as youtube from './youtube';
import * as generators from './generators';
import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';

/**
 * Generate a thumbnail for the provided content
 * 
 * This function implements a cascading strategy:
 * 1. Try the most appropriate generation method based on content type
 * 2. Fall back to simpler methods if primary method fails
 * 3. Ultimately generate a placeholder if all methods fail
 * 
 * @param options Thumbnail generation options
 * @returns Thumbnail result with path and metadata
 */
export async function generateThumbnail(options: ThumbnailOptions): Promise<ThumbnailResult> {
  try {
    // Determine which generator to use based on content type and available data
    if (options.contentType === 'embed' || options.youtubeId || (options.sourceUrl && youtube.extractYouTubeVideoId(options.sourceUrl))) {
      return await generators.generateYouTubeThumbnail(options);
    } else if (options.contentType === 'video' && options.sourceUrl) {
      return await generators.generateVideoThumbnail(options);
    } else if (options.contentType === 'image' && options.sourceUrl) {
      return await generators.generateImageThumbnail(options);
    } else if (options.base64Data) {
      return await generators.generateImageThumbnail(options);
    } else {
      // Generate a placeholder as last resort
      return await generators.generatePlaceholderThumbnail(options);
    }
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    
    // Fallback to placeholder on any error
    try {
      return await generators.generatePlaceholderThumbnail(options);
    } catch (fallbackError) {
      console.error('Fallback error generating placeholder thumbnail:', fallbackError);
      
      // Last resort - return a failure
      return {
        success: false,
        thumbnailPath: '',
        contentType: 'image/svg+xml',
        method: 'error',
        error
      };
    }
  }
}

/**
 * Get a signed URL for a thumbnail
 * @param contentId Content ID
 * @param contentType Content type (optional)
 * @param expiresIn Expiration time in seconds (default: 1 hour)
 * @returns Signed URL for the thumbnail
 */
export async function getThumbnailUrl(contentId: number, contentType?: string, expiresIn: number = 3600): Promise<string> {
  try {
    const s3Key = storage.getThumbnailS3Key(contentId, contentType);
    return await storage.getSignedS3Url(s3Key, expiresIn);
  } catch (error) {
    console.error(`Error getting thumbnail URL for content ${contentId}:`, error);
    throw error;
  }
}

/**
 * Check if a thumbnail exists for a content item
 * @param contentId Content ID
 * @param contentType Content type (optional)
 * @returns Whether the thumbnail exists
 */
export async function thumbnailExists(contentId: number, contentType?: string): Promise<boolean> {
  return await storage.thumbnailExists(contentId, contentType);
}

/**
 * Test the thumbnail service
 * @returns Test results
 */
export async function testService(): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  try {
    // Test FFmpeg availability
    const ffmpegTest = await testFFmpegAvailability();
    
    // Test S3 connection
    let s3Test = { success: false, message: 'Not tested' };
    if (process.env.AWS_BUCKET_NAME && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      try {
        // Try to get a signed URL for a test key
        const testUrl = await storage.getSignedS3Url('test.jpg');
        s3Test = {
          success: true,
          message: `S3 connection successful (${testUrl.substring(0, 30)}...)`
        };
      } catch (error) {
        s3Test = {
          success: false,
          message: `S3 connection failed: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }
    
    return {
      success: ffmpegTest.success,
      message: 'Thumbnail service test completed',
      details: {
        ffmpeg: ffmpegTest,
        s3: s3Test,
        sharp: { 
          success: true, 
          message: 'Sharp library is available',
          version: sharp.versions.sharp
        }
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Test failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Test if FFmpeg is available on the system
 * @returns Test result
 */
export async function testFFmpegAvailability(): Promise<{
  success: boolean;
  message: string;
  details?: {
    version?: string;
  };
}> {
  return await ffmpeg.testFFmpegAvailability();
}

/**
 * Get the YouTube thumbnail URL directly
 * Convenience method to avoid direct module imports elsewhere
 */
export function getYouTubeThumbnailUrl(youtubeId: string | null, quality: string = 'hqdefault'): string | null {
  return youtube.getYouTubeThumbnailUrl(youtubeId, quality);
}

// Export individual modules for direct access if needed
export {
  ffmpeg,
  storage,
  youtube
};

// Default export for convenience
export default {
  generateThumbnail,
  getThumbnailUrl,
  thumbnailExists,
  testService,
  testFFmpegAvailability,
  getYouTubeThumbnailUrl,
  
  // Direct module access
  ffmpeg,
  storage,
  youtube
};