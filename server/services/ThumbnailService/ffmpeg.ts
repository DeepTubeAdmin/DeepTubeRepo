/**
 * FFmpeg utilities for ThumbnailService
 */

import { FFmpegOptions } from './types';
import { exec } from 'child_process';
import util from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const execPromisified = util.promisify(exec);

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path for temporary files
const TEMP_DIR = path.join(__dirname, '../../../.tmp');

/**
 * Ensure temp directory exists
 */
export async function ensureTempDir(): Promise<void> {
  try {
    await fs.mkdir(TEMP_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating temp directory:', error);
    throw error;
  }
}

/**
 * Clean up a workspace path to ensure it's safe
 * @param filePath File path to clean
 * @returns Cleaned file path
 */
export function cleanWorkspacePath(filePath: string): string {
  // Remove any relative path components that might navigate up directories
  const normalizedPath = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');
  return normalizedPath;
}

/**
 * Check if a file exists
 * @param filePath File path to check
 * @returns Whether the file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Clean up temporary files
 * @param filePaths Temporary file paths to clean up
 */
export async function cleanupTempFiles(filePaths: string[]): Promise<void> {
  for (const filePath of filePaths) {
    try {
      if (await fileExists(filePath)) {
        await fs.unlink(filePath);
      }
    } catch (error) {
      console.error(`Error cleaning up temp file ${filePath}:`, error);
    }
  }
}

/**
 * Generate thumbnail from a video file using FFmpeg
 * @param videoPath Path to the video file
 * @param outputPath Path for the thumbnail output
 * @param options FFmpeg options
 * @returns Whether the thumbnail generation was successful
 */
export async function generateThumbnailFromVideo(
  videoPath: string, 
  outputPath: string, 
  options: FFmpegOptions = {}
): Promise<boolean> {
  // Ensure paths are clean
  videoPath = cleanWorkspacePath(videoPath);
  outputPath = cleanWorkspacePath(outputPath);
  
  // Ensure the temp directory exists
  await ensureTempDir();
  
  // Default options
  const {
    width = 640,
    height = 360,
    timestamps = ['00:00:03'], // Default to 3 seconds
    quality = 3, // Lower is better quality (1-31)
  } = options;
  
  // Check if video exists
  if (!await fileExists(videoPath)) {
    throw new Error(`Video file does not exist: ${videoPath}`);
  }
  
  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  await fs.mkdir(outputDir, { recursive: true });
  
  // Build FFmpeg command
  const timestamp = timestamps[0];
  const command = `ffmpeg -ss ${timestamp} -i "${videoPath}" -vframes 1 -q:v ${quality} -vf "scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2" "${outputPath}" -y`;
  
  try {
    // Execute FFmpeg command
    const { stdout, stderr } = await execPromisified(command);
    
    // Log output
    if (stdout) console.log('FFmpeg stdout:', stdout);
    if (stderr) console.debug('FFmpeg stderr:', stderr);
    
    // Check if the output file was created
    return await fileExists(outputPath);
  } catch (error) {
    console.error('FFmpeg error:', error);
    return false;
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
  try {
    // Try to execute FFmpeg version command
    const { stdout } = await execPromisified('ffmpeg -version');
    
    // Parse version from output
    const versionMatch = stdout.match(/ffmpeg version (\S+)/);
    const version = versionMatch ? versionMatch[1] : 'unknown';
    
    return {
      success: true,
      message: 'FFmpeg is available',
      details: {
        version
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `FFmpeg is not available: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}