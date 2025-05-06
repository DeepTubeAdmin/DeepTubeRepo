/**
 * Unified ThumbnailService for DeepTube
 *
 * This service consolidates all thumbnail generation functionality into a single
 * streamlined interface with consistent error handling and fallbacks.
 */

import { ThumbnailOptions, ThumbnailResult } from './types';
import {
  generateYouTubeThumbnail,
  generateVideoThumbnail,
  generateImageThumbnail,
  generatePlaceholderThumbnail
} from './generators';
import { getSignedS3Url, getThumbnailS3Key, getS3ResourcePath } from './storage';
import { configureCloudinary, testCloudinaryConnection, extractYouTubeVideoId } from './cloudinary';

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
    const { contentId, contentType, youtubeId, sourceUrl, generatePlaceholder } = options;
    
    // Basic validation
    if (!contentId) {
      throw new Error('Content ID is required for thumbnail generation');
    }
    
    console.log(`Generating thumbnail for content ID ${contentId}, type: ${contentType}`);
    console.log(`Source URL: ${sourceUrl || 'none'}, YouTube ID: ${youtubeId || 'none'}`);
    
    // First, ensure Cloudinary is configured
    configureCloudinary();
    
    // If placeholders are explicitly requested, generate them right away
    if (generatePlaceholder) {
      return await generatePlaceholderThumbnail(options);
    }
    
    // Extract YouTube ID from source URL if not provided directly
    const extractedYoutubeId = youtubeId || (sourceUrl ? extractYouTubeVideoId(sourceUrl) : null);
    
    // Implement the cascading generation strategy
    try {
      // Strategy 1: YouTube thumbnails for embeds
      if (extractedYoutubeId || contentType === 'embed') {
        if (extractedYoutubeId) {
          try {
            console.log(`Using YouTube thumbnail strategy for ID: ${extractedYoutubeId}`);
            return await generateYouTubeThumbnail({
              ...options,
              youtubeId: extractedYoutubeId
            });
          } catch (youtubeError) {
            console.error('YouTube thumbnail strategy failed:', youtubeError);
            // Fall through to next strategy
          }
        }
      }
      
      // Strategy 2: Content type specific generation
      if (sourceUrl) {
        try {
          if (contentType === 'video') {
            console.log('Using video thumbnail strategy');
            return await generateVideoThumbnail(options);
          } else if (contentType === 'image') {
            console.log('Using image thumbnail strategy');
            return await generateImageThumbnail(options);
          }
        } catch (mediaError) {
          console.error(`${contentType} thumbnail strategy failed:`, mediaError);
          // Fall through to placeholder
        }
      }
      
      // Strategy 3: Base64 data for images
      if (options.base64Data && contentType === 'image') {
        try {
          console.log('Using base64 image strategy');
          return await generateImageThumbnail(options);
        } catch (base64Error) {
          console.error('Base64 image strategy failed:', base64Error);
          // Fall through to placeholder
        }
      }
      
      // Final fallback: Generate placeholder
      console.log('No suitable source for thumbnail generation, using placeholder');
      return await generatePlaceholderThumbnail(options);
      
    } catch (strategyError) {
      console.error('All thumbnail strategies failed:', strategyError);
      return await generatePlaceholderThumbnail(options);
    }
  } catch (error) {
    console.error('Uncaught error in thumbnail generation:', error);
    
    // Last resort error handling - return minimal error result
    // with a placeholder path that should work
    return {
      success: false,
      thumbnailPath: getThumbnailS3Key(options.contentId, options.contentType || 'unknown', 'svg'),
      contentType: 'image/svg+xml',
      method: 'error-fallback',
      error: error
    };
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
    // Determine the S3 key for the thumbnail
    let s3Key = getThumbnailS3Key(contentId, contentType || 'unknown');
    
    // Check if there's an SVG version (for placeholders)
    try {
      const svgKey = getThumbnailS3Key(contentId, contentType || 'unknown', 'svg');
      return await getSignedS3Url(svgKey, expiresIn);
    } catch (svgError) {
      // If no SVG version, use the regular thumbnail
      return await getSignedS3Url(s3Key, expiresIn);
    }
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
  try {
    // Try to get a signed URL - will throw if the thumbnail doesn't exist
    await getThumbnailUrl(contentId, contentType);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Test the thumbnail service
 * @returns Test results
 */
export async function testService(): Promise<{
  cloudinary: any;
  thumbnail: any;
}> {
  try {
    // Test Cloudinary connection
    const cloudinaryTest = await testCloudinaryConnection();
    
    // Test placeholder generation
    let thumbnailTest;
    try {
      thumbnailTest = await generateThumbnail({
        contentId: 999999, // Use a high number unlikely to conflict
        contentType: 'test',
        generatePlaceholder: true
      });
    } catch (thumbnailError) {
      thumbnailTest = { success: false, error: thumbnailError };
    }
    
    return {
      cloudinary: cloudinaryTest,
      thumbnail: thumbnailTest
    };
  } catch (error) {
    return {
      cloudinary: { success: false, error },
      thumbnail: { success: false, error }
    };
  }
}

// Re-export types and sub-modules for direct access
export * from './types';
export * as storage from './storage';
export * as cloudinary from './cloudinary';
export * as generators from './generators';

// Default export for backward compatibility
export default {
  generateThumbnail,
  getThumbnailUrl,
  thumbnailExists,
  testService,
  
  // Commonly used functions from sub-modules
  extractYouTubeVideoId,
  getSignedS3Url,
  getThumbnailS3Key,
  getS3ResourcePath,
  configureCloudinary,
  testCloudinaryConnection
};
