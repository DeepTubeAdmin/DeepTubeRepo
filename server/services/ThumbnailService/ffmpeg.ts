/**
 * FFmpeg module for ThumbnailService
 */

import fs from 'fs/promises';
import { execFile } from 'child_process';
import path from 'path';
import os from 'os';
import { promisify } from 'util';
import { ThumbnailOptions } from './types';

const execFilePromise = promisify(execFile);

// Helper function to make a temporary directory
async function makeTempDir(): Promise<string> {
  // Create a temporary directory for ffmpeg output
  const tempDir = path.join(os.tmpdir(), 'deeptubeThumb-' + Date.now());
  try {
    await fs.mkdir(tempDir, { recursive: true });
    return tempDir;
  } catch (error) {
    console.error('Error creating temp directory:', error);
    throw error;
  }
}

// Helper function to clean up temporary files
export async function cleanupTempFiles(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
    console.log(`Cleaned up temporary file: ${filePath}`);
  } catch (error) {
    console.warn(`Warning: Failed to clean up temporary file ${filePath}:`, error);
  }
}

// Helper function to check if a file exists
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Helper function to clean up paths for FFmpeg processing
export function cleanWorkspacePath(urlPath: string): string {
  // Remove API prefix if it exists
  let cleanPath = urlPath.replace('/api/s3/', '');
  
  // Remove workspace prefix if it exists
  cleanPath = cleanPath.replace('/home/runner/workspace/', '');
  
  // Ensure relative paths from current directory
  if (!cleanPath.startsWith('./') && !cleanPath.startsWith('/')) {
    cleanPath = './' + cleanPath;
  }
  
  // Fix any double slashes
  cleanPath = cleanPath.replace(/\/\//g, '/');
  
  return cleanPath;
}

// Helper function to extract a video frame at a specific timestamp
export async function extractFrameFromVideo(options: {
  videoPath: string;
  outputPath: string;
  timestamp?: string;
  width?: number;
  height?: number;
}): Promise<boolean> {
  const { videoPath, outputPath, timestamp = '3', width = 800, height = 450 } = options;
  
  console.log(`FFmpeg: Extracting frame at ${timestamp}s from ${videoPath} to ${outputPath}`);
  console.log(`FFmpeg: Output dimensions: ${width}x${height}`);
  
  try {
    // Attempt to extract frame with specified parameters
    await execFilePromise('ffmpeg', [
      '-y', // Overwrite output file if it exists
      '-i', videoPath,
      '-ss', timestamp, // Seek to timestamp
      '-vframes', '1', // Extract one frame
      '-vf', `scale=${width}:${height}`, // Scale to specified dimensions
      '-q:v', '2', // High quality
      outputPath
    ]);
    
    // Verify the output was created
    const exists = await fileExists(outputPath);
    if (!exists) {
      throw new Error(`FFmpeg completed but output file ${outputPath} was not created`);
    }
    
    console.log(`FFmpeg: Successfully extracted frame to ${outputPath}`);
    return true;
  } catch (error) {
    console.error(`FFmpeg: Failed to extract frame at ${timestamp}s:`, error);
    return false;
  }
}

/**
 * Generate a thumbnail from a video using FFmpeg
 * 
 * @param videoPath Path to the video file
 * @param options Options for thumbnail generation
 * @returns Path to the generated thumbnail
 */
export async function generateThumbnailFromVideo(
  videoPath: string,
  options: { width?: number; height?: number; timestamps?: string[] } = {}
): Promise<string> {
  const { width = 800, height = 450, timestamps = ['3', '1', '5', '10'] } = options;
  const tempDir = await makeTempDir();
  const tempThumb = path.join(tempDir, `thumbnail-${Date.now()}.jpg`);
  
  console.log(`FFmpeg: Starting thumbnail generation for ${videoPath}`);
  console.log(`FFmpeg: Temporary thumbnail path: ${tempThumb}`);
  
  // Try each timestamp in sequence until one works
  let success = false;
  
  for (const timestamp of timestamps) {
    console.log(`FFmpeg: Trying to extract frame at ${timestamp}s...`);
    
    success = await extractFrameFromVideo({
      videoPath,
      outputPath: tempThumb,
      timestamp,
      width,
      height
    });
    
    if (success) {
      console.log(`FFmpeg: Successfully generated thumbnail at ${timestamp}s`);
      break;
    }
    
    console.log(`FFmpeg: Failed to extract frame at ${timestamp}s, trying next timestamp...`);
  }
  
  if (!success) {
    // Last resort: try without specifying a timestamp
    console.log('FFmpeg: All timestamps failed, trying default frame extraction...');
    
    try {
      await execFilePromise('ffmpeg', [
        '-y',
        '-i', videoPath,
        '-vframes', '1',
        '-vf', `scale=${width}:${height}`,
        tempThumb
      ]);
      
      const exists = await fileExists(tempThumb);
      if (!exists) {
        throw new Error('Default frame extraction completed but file not created');
      }
      
      success = true;
      console.log('FFmpeg: Default frame extraction succeeded');
    } catch (error) {
      console.error('FFmpeg: Default frame extraction failed:', error);
      throw new Error('Failed to generate thumbnail at any position in the video');
    }
  }
  
  return tempThumb;
}