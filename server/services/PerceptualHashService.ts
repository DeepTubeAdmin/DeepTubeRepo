/**
 * PerceptualHashService - Provides utilities for perceptual hashing of images and videos
 * Used for detecting duplicate media content
 */

import Jimp from 'jimp';
import { ssim } from 'ssim.js';
import { promises as fs } from 'fs';
import { db } from '../db';
import { videos } from '@shared/schema';
import { eq, and, not, isNull } from 'drizzle-orm';
import path from 'path';
import { getSignedS3Url } from './ThumbnailService/storage';
import * as ffmpegUtils from './ThumbnailService/ffmpeg';

// Represents a perceptual hash of an image
interface PerceptualHash {
  // Base64 encoding of the image data
  base64: string;
  // Pixel data for the image (reduced size for comparison)
  pixelData: number[];
  // Frame timestamp (for videos)
  timestamp?: number;
}

// Represents the perceptual hash data stored in the database
interface PerceptualHashData {
  // Array of hashes for different frames (for videos) or just one hash for images
  hashes: PerceptualHash[];
  // Type of the content that was hashed
  contentType: 'image' | 'video';
  // Original content URL
  sourceUrl: string;
  // Timestamp when the hash was created
  created: string;
}

// Similarity threshold - values above this are considered duplicates
const SIMILARITY_THRESHOLD = 0.85;

/**
 * Extracts frames from a video at specific timestamps
 * @param videoPath Path to the video file
 * @param timestamps Array of timestamps in seconds
 * @returns Array of file paths to the extracted frames
 */
async function extractFramesFromVideo(videoPath: string, timestamps: number[]): Promise<string[]> {
  const framePaths: string[] = [];
  
  try {
    // Create a temp directory for the frames if it doesn't exist
    const tempDir = path.join(process.cwd(), 'temp_frames');
    await fs.mkdir(tempDir, { recursive: true });
    
    for (const timestamp of timestamps) {
      // Output path for this frame
      const framePath = path.join(tempDir, `frame_${Date.now()}_${timestamp}.jpg`);
      
      // Extract the frame using FFmpeg
      const success = await ffmpegUtils.generateThumbnailFromVideo(
        videoPath,
        framePath,
        {
          timestamps: [`00:00:${Math.floor(timestamp)}`],
          width: 64,
          height: 64
        }
      );
      
      if (success) {
        framePaths.push(framePath);
      } else {
        console.error(`Failed to extract frame at timestamp ${timestamp}`);
      }
    }
    
    return framePaths;
  } catch (error) {
    console.error('Error extracting frames from video:', error);
    return [];
  }
}

/**
 * Computes a perceptual hash for an image
 * @param imagePath Path to the image file
 * @returns Perceptual hash or null if hashing fails
 */
async function computeImageHash(imagePath: string, timestamp?: number): Promise<PerceptualHash | null> {
  try {
    // Load the image using Jimp
    const image = await Jimp.read(imagePath);
    
    // Resize the image to 16x16 pixels for consistent comparison
    image.resize(16, 16).greyscale();
    
    // Get the pixel data
    const pixelData: number[] = [];
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, (x, y, idx) => {
      pixelData.push(image.bitmap.data[idx]);
    });
    
    // Convert to Base64 for storage
    const base64 = await image.getBase64Async(Jimp.MIME_JPEG);
    
    return {
      base64,
      pixelData,
      timestamp
    };
  } catch (error) {
    console.error('Error computing image hash:', error);
    return null;
  }
}

/**
 * Computes a perceptual hash for a video
 * @param videoPath Path to the video file
 * @returns Array of perceptual hashes for the video frames
 */
export async function computeVideoHash(videoPath: string): Promise<PerceptualHash[]> {
  try {
    // Extract frames at different timestamps (3, 5, and 10 seconds)
    const framePaths = await extractFramesFromVideo(videoPath, [3, 5, 10]);
    
    // Compute perceptual hashes for each frame
    const hashes: PerceptualHash[] = [];
    for (let i = 0; i < framePaths.length; i++) {
      const framePath = framePaths[i];
      const timestamp = i === 0 ? 3 : i === 1 ? 5 : 10;
      
      const hash = await computeImageHash(framePath, timestamp);
      if (hash) {
        hashes.push(hash);
      }
      
      // Clean up the frame file
      try {
        await fs.unlink(framePath);
      } catch (unlinkError) {
        console.warn(`Failed to delete frame file ${framePath}:`, unlinkError);
      }
    }
    
    return hashes;
  } catch (error) {
    console.error('Error computing video hash:', error);
    return [];
  }
}

/**
 * Computes a perceptual hash for an image
 * @param imagePath Path to the image file
 * @returns Perceptual hash for the image
 */
export async function computeStaticImageHash(imagePath: string): Promise<PerceptualHash[]> {
  const hash = await computeImageHash(imagePath);
  return hash ? [hash] : [];
}

/**
 * Check if an image is a duplicate of existing content
 * @param imagePath Path to the image file
 * @returns True if the image is a duplicate, false otherwise
 */
export async function isImageDuplicate(imagePath: string): Promise<boolean> {
  const hash = await computeStaticImageHash(imagePath);
  if (hash.length === 0) {
    return false;
  }
  
  return await isDuplicateHash(hash, 'image');
}

/**
 * Check if a video is a duplicate of existing content
 * @param videoPath Path to the video file
 * @returns True if the video is a duplicate, false otherwise
 */
export async function isVideoDuplicate(videoPath: string): Promise<boolean> {
  const hashes = await computeVideoHash(videoPath);
  if (hashes.length === 0) {
    return false;
  }
  
  return await isDuplicateHash(hashes, 'video');
}

/**
 * Check if a set of perceptual hashes matches existing content
 * @param newHashes Array of perceptual hashes to check
 * @param contentType Type of the content (image or video)
 * @returns True if the content is a duplicate, false otherwise
 */
async function isDuplicateHash(newHashes: PerceptualHash[], contentType: 'image' | 'video'): Promise<boolean> {
  // Only check approved content
  const existingVideos = await db.select()
    .from(videos)
    .where(
      and(
        eq(videos.contentType, contentType),
        eq(videos.reviewStatus, 'approved'),
        not(isNull(videos.perceptualHashes))
      )
    );
  
  for (const video of existingVideos) {
    if (!video.perceptualHashes) continue;
    
    const hashData = video.perceptualHashes as PerceptualHashData;
    
    // Skip if the hash data is empty
    if (!hashData.hashes || hashData.hashes.length === 0) {
      continue;
    }
    
    // For images, we just compare the single hash
    if (contentType === 'image') {
      const similarity = calculateHashSimilarity(newHashes[0], hashData.hashes[0]);
      if (similarity > SIMILARITY_THRESHOLD) {
        console.log(`Found duplicate image with similarity ${similarity} for content ID ${video.id}`);
        return true;
      }
    } else {
      // For videos, we compare multiple frames
      // If any frame is similar enough, it's a duplicate
      let matchCount = 0;
      const requiredMatches = Math.min(2, newHashes.length, hashData.hashes.length);
      
      for (const newHash of newHashes) {
        for (const existingHash of hashData.hashes) {
          // Try to match frames at similar timestamps if available
          if (newHash.timestamp && existingHash.timestamp) {
            // Only compare frames within 2 seconds of each other
            if (Math.abs(newHash.timestamp - existingHash.timestamp) > 2) {
              continue;
            }
          }
          
          const similarity = calculateHashSimilarity(newHash, existingHash);
          if (similarity > SIMILARITY_THRESHOLD) {
            matchCount++;
            if (matchCount >= requiredMatches) {
              console.log(`Found duplicate video with ${matchCount} matching frames for content ID ${video.id}`);
              return true;
            }
            break; // Move to the next new hash
          }
        }
      }
    }
  }
  
  return false;
}

/**
 * Calculate the similarity between two perceptual hashes
 * @param hash1 First perceptual hash
 * @param hash2 Second perceptual hash
 * @returns Similarity score between 0 and 1
 */
function calculateHashSimilarity(hash1: PerceptualHash, hash2: PerceptualHash): number {
  try {
    // If we have pixel data, use that for comparison
    if (hash1.pixelData && hash2.pixelData) {
      // Calculate the mean squared error between the pixel data arrays
      let sum = 0;
      const length = Math.min(hash1.pixelData.length, hash2.pixelData.length);
      for (let i = 0; i < length; i++) {
        const diff = hash1.pixelData[i] - hash2.pixelData[i];
        sum += diff * diff;
      }
      const mse = sum / length;
      
      // Convert MSE to similarity (1 = identical, 0 = completely different)
      // Using an exponential decay function to convert MSE to similarity
      return Math.exp(-mse / 1000);
    }
    
    // Fallback to base64 comparison if no pixel data is available
    if (hash1.base64 && hash2.base64) {
      // Use SSIM (Structural Similarity Index) for base64 comparison
      // First, we need to load the images from the base64 strings
      return 0.5; // Placeholder similarity value for now
    }
    
    return 0; // No similarity data available
  } catch (error) {
    console.error('Error calculating hash similarity:', error);
    return 0;
  }
}

/**
 * Store perceptual hashes for a video or image in the database
 * @param contentId ID of the content in the database
 * @param hashes Array of perceptual hashes to store
 * @param contentType Type of the content (image or video)
 * @param sourceUrl Original content URL
 */
export async function storePerceptualHashes(
  contentId: number,
  hashes: PerceptualHash[],
  contentType: 'image' | 'video',
  sourceUrl: string
): Promise<void> {
  try {
    const hashData: PerceptualHashData = {
      hashes,
      contentType,
      sourceUrl,
      created: new Date().toISOString()
    };
    
    await db.update(videos)
      .set({ perceptualHashes: hashData })
      .where(eq(videos.id, contentId));
    
    console.log(`Stored ${hashes.length} perceptual hashes for content ID ${contentId}`);
  } catch (error) {
    console.error('Error storing perceptual hashes:', error);
  }
}

/**
 * Compute and store perceptual hashes for an existing video or image
 * @param contentId ID of the content in the database
 */
export async function computeAndStoreHashesForExistingContent(contentId: number): Promise<void> {
  try {
    // Get the content from the database
    const [content] = await db.select()
      .from(videos)
      .where(eq(videos.id, contentId));
    
    if (!content) {
      throw new Error(`Content with ID ${contentId} not found`);
    }
    
    // Skip if the content already has perceptual hashes
    if (content.perceptualHashes) {
      console.log(`Content ID ${contentId} already has perceptual hashes`);
      return;
    }
    
    // Get the source URL based on content type
    let sourceUrl = '';
    let contentType: 'image' | 'video';
    
    if (content.contentType === 'video' && content.videoUrl) {
      sourceUrl = content.videoUrl;
      contentType = 'video';
    } else if (content.contentType === 'image' && content.imageUrl) {
      sourceUrl = content.imageUrl;
      contentType = 'image';
    } else {
      console.log(`Content ID ${contentId} has unsupported content type or missing URL`);
      return;
    }
    
    // Get a signed URL if it's an S3 URL
    if (sourceUrl.includes('/api/s3/')) {
      const s3Key = sourceUrl.split('/api/s3/')[1];
      sourceUrl = await getSignedS3Url(s3Key);
    }
    
    // Download the file to a temporary location
    const tempFile = await ffmpegUtils.downloadFileToTemp(sourceUrl);
    if (!tempFile) {
      throw new Error(`Failed to download file from ${sourceUrl}`);
    }
    
    try {
      // Compute the perceptual hashes
      let hashes: PerceptualHash[];
      if (contentType === 'video') {
        hashes = await computeVideoHash(tempFile);
      } else {
        hashes = await computeStaticImageHash(tempFile);
      }
      
      // Store the hashes in the database
      if (hashes.length > 0) {
        await storePerceptualHashes(contentId, hashes, contentType, sourceUrl);
      } else {
        console.warn(`Failed to compute perceptual hashes for content ID ${contentId}`);
      }
    } finally {
      // Clean up the temporary file
      try {
        await fs.unlink(tempFile);
      } catch (unlinkError) {
        console.warn(`Failed to delete temp file ${tempFile}:`, unlinkError);
      }
    }
  } catch (error) {
    console.error(`Error computing hashes for content ID ${contentId}:`, error);
  }
}

// Export the module
export default {
  isImageDuplicate,
  isVideoDuplicate,
  storePerceptualHashes,
  computeVideoHash,
  computeStaticImageHash,
  computeAndStoreHashesForExistingContent
};