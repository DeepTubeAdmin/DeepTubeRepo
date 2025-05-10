/**
 * FFmpeg utilities for ThumbnailService
 */

import { FFmpegOptions } from './types';
import { exec as cpExec } from 'child_process';
import util from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import { getSignedS3Url } from '../../s3';

const execPromisified = util.promisify(cpExec);

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path for temporary files
const TEMP_DIR = path.join(__dirname, '../../../.tmp');

/**
 * Download a file from a URL to a temporary location
 * @param url URL of the file to download
 * @returns Path to the downloaded file or null if download failed
 */
export async function downloadFileToTemp(url: string): Promise<string | null> {
  try {
    // Ensure temp directory exists
    await ensureTempDir();
    
    // Generate a unique filename
    const filename = `temp-${Date.now()}-${Math.round(Math.random() * 1000000)}.bin`;
    const outputPath = path.join(TEMP_DIR, filename);
    
    console.log(`Downloading file from ${url} to ${outputPath}`);
    
    // If it's an S3 URL, try to get a signed URL
    let fetchUrl = url;
    if (url.startsWith('/api/s3/')) {
      const s3Key = url.split('/api/s3/')[1];
      try {
        const signedUrl = await getSignedS3Url(s3Key);
        console.log(`Generated signed URL for download: ${signedUrl.substring(0, 100)}...`);
        fetchUrl = signedUrl;
      } catch (error) {
        console.error(`Error getting signed URL for ${s3Key}:`, error);
        // Continue with the original URL
      }
    }
    
    // Download the file
    const response = await fetch(fetchUrl);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
    }
    
    // Write to file
    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(outputPath, buffer);
    
    console.log(`Successfully downloaded ${buffer.length} bytes to ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error('Error downloading file:', error);
    return null;
  }
}

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
 * Clean up a workspace path to ensure it's safe and handle S3 URLs
 * @param filePath File path to clean
 * @returns Cleaned file path that points to the actual file on disk
 */
export function cleanWorkspacePath(filePath: string): string {
  console.log(`Cleaning path: ${filePath}`);
  let result = '';
  
  // Handle /api/s3/ URLs
  if (filePath.includes('/api/s3/')) {
    // Extract the relative path after /api/s3/
    let relativePath = filePath.split('/api/s3/')[1];
    
    // Remove any workspace/uploads path components that might be duplicated
    relativePath = relativePath.replace(/^home\/runner\/workspace\/uploads\//, '');
    relativePath = relativePath.replace(/^uploads\/uploads\//, '');
    relativePath = relativePath.replace(/^uploads\//, '');
    
    // Construct the full path to the file within the project's uploads directory
    result = path.join(process.cwd(), 'uploads', relativePath);
  }
  // Handle direct S3 URLs
  else if (filePath.includes('.amazonaws.com/')) {
    // Extract the S3 key (everything after the bucket name)
    let s3Key = filePath.split('.amazonaws.com/')[1];
    
    // Remove any uploads/ prefix as we'll add it back
    s3Key = s3Key.replace(/^uploads\/uploads\//, 'uploads/');
    if (!s3Key.startsWith('uploads/')) {
      s3Key = `uploads/${s3Key}`;
    }
    
    // Construct the full path to the file within the project's uploads directory
    result = path.join(process.cwd(), s3Key);
  }
  // For paths that already look like local file paths
  else {
    // Remove any relative path components that might navigate up directories
    let normalizedPath = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');
    
    // Fix duplicate uploads paths
    normalizedPath = normalizedPath.replace(/\/uploads\/uploads\//, '/uploads/');
    
    // If path starts with /uploads, make it relative to the project root
    if (normalizedPath.startsWith('/uploads/')) {
      result = path.join(process.cwd(), normalizedPath.substring(1));
    } else {
      result = normalizedPath;
    }
  }
  
  console.log(`Path cleaned: ${filePath} → ${result}`);
  return result;
}

/**
 * Check if a file exists
 * @param filePath File path to check
 * @returns Whether the file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    console.log(`File exists: ${filePath}`);
    return true;
  } catch (error) {
    console.log(`File does not exist: ${filePath}`);
    // Try to list files in the directory to help debug
    try {
      const dir = path.dirname(filePath);
      const files = await fs.readdir(dir);
      console.log(`Files in directory ${dir}:`, files.slice(0, 10).join(', ') + (files.length > 10 ? '...' : ''));
    } catch (dirError) {
      console.log(`Could not read directory for ${filePath}:`, dirError);
    }
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
  console.log(`Checking if video exists at path: ${videoPath}`);
  if (!await fileExists(videoPath)) {
    // Try to fetch the file directly if it's a URL
    if (videoPath.startsWith('/api/s3/') || videoPath.includes('.amazonaws.com/')) {
      console.log(`Video not found locally. Attempting to download from: ${videoPath}`);
      try {
        // Download the file to a temporary location
        const tempVideoPath = await downloadFileToTemp(videoPath);
        if (tempVideoPath) {
          console.log(`Successfully downloaded video to: ${tempVideoPath}`);
          videoPath = tempVideoPath;
        } else {
          throw new Error(`Failed to download video from ${videoPath}`);
        }
      } catch (error: any) {
        console.error(`Error downloading video:`, error);
        throw new Error(`Failed to access video file: ${videoPath} - ${error.message || 'Unknown error'}`);
      }
    } else {
      throw new Error(`Video file does not exist: ${videoPath}`);
    }
  }
  console.log(`Video file exists, continuing with thumbnail generation`);
  
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
    path?: string;
  };
}> {
  try {
    // Use shell check for ffmpeg availability
    const { stdout, stderr } = await execPromisified('which ffmpeg || echo "not found"');
    
    const ffmpegPath = stdout.trim();
    if (ffmpegPath === 'not found') {
      return {
        success: false,
        message: 'FFmpeg executable not found in PATH',
        details: { }
      };
    }
    
    // Now try to get the version
    try {
      const versionResult = await execPromisified('ffmpeg -version');
      const versionMatch = versionResult.stdout.match(/ffmpeg version (\S+)/);
      const version = versionMatch ? versionMatch[1] : 'unknown';
      
      return {
        success: true,
        message: `FFmpeg is available at ${ffmpegPath}`,
        details: {
          version,
          path: ffmpegPath
        }
      };
    } catch (versionError) {
      return {
        success: true,
        message: `FFmpeg found at ${ffmpegPath} but couldn't get version info`,
        details: {
          path: ffmpegPath
        }
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Error checking FFmpeg: ${error instanceof Error ? error.message : String(error)}`,
      details: { }
    };
  }
}