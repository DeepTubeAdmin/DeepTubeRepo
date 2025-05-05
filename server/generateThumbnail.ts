/**
 * Thumbnail generation utilities for DeepTube
 * 
 * This module handles all thumbnail generation and S3 storage operations,
 * eliminating the need for local file operations and improving reliability.
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { uploadStringToS3 } from './s3';

const execFileAsync = promisify(execFile);

export async function generateAndStoreS3Thumbnail(
  videoId: number,
  contentType: string,
  sourceUrl: string | null = null,
  youtubeId: string | null = null
): Promise<string> {
  const s3Key = `thumbnails/video-${videoId}.jpg`;

  // Handle YouTube videos
  if (youtubeId) {
    try {
      const youtubeThumbnailUrl = `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;
      const response = await fetch(youtubeThumbnailUrl);
      const buffer = Buffer.from(await response.arrayBuffer());
      await uploadStringToS3(buffer, s3Key, 'image/jpeg');
      return s3Key;
    } catch (error) {
      console.error('YouTube thumbnail generation failed:', error);
    }
  }

  // Handle direct images
  if (contentType === 'image' && sourceUrl) {
    try {
      const response = await fetch(sourceUrl);
      const buffer = Buffer.from(await response.arrayBuffer());
      await uploadStringToS3(buffer, s3Key, 'image/jpeg');
      return s3Key;
    } catch (error) {
      console.error('Image processing failed:', error);
    }
  }

  // Handle videos
  if (contentType === 'video' && sourceUrl) {
    try {
      const tempDir = os.tmpdir();
      const tempVideo = path.join(tempDir, `video-${Date.now()}.mp4`);
      const tempThumb = path.join(tempDir, `thumb-${Date.now()}.jpg`);

      // Fix path if it's an API URL
      const actualVideoPath = sourceUrl.replace('/api/s3/', '');
      const videoPath = actualVideoPath.startsWith('/') ? actualVideoPath.substring(1) : actualVideoPath;

      // Check if file exists before proceeding
      if (!fs.existsSync(videoPath)) {
        console.error(`Video file not found at path: ${videoPath}`);
        throw new Error('Video file not found');
      }

      console.log(`Generating thumbnail from video file: ${videoPath}`);

      // Generate thumbnail directly from file
      try {
        await execFileAsync('ffmpeg', [
          '-y',
          '-i', videoPath,
          '-vframes', '1',
          '-an',
          '-s', '800x450',
          '-ss', '0.1',
          tempThumb
        ]);
      } catch (error) {
        console.error('Failed to generate thumbnail directly from file:', error);
      }

      // Download the file from source URL if needed
      let videoBuffer: ArrayBuffer;
      let attempts = 0;
      while (attempts < 3) {
        try {
          if (!sourceUrl) throw new Error('No source URL provided');
          const videoResponse = await fetch(sourceUrl);
          if (!videoResponse.ok) throw new Error(`HTTP ${videoResponse.status}`);
          videoBuffer = await videoResponse.arrayBuffer();
          // If we get here, we have a valid buffer - break out of the loop
          break;
        } catch (err) {
          attempts++;
          console.log(`Attempt ${attempts}/3 to download video failed: ${err}`);
          if (attempts === 3) throw new Error(`Failed to download video after 3 attempts: ${err}`);
          await new Promise(r => setTimeout(r, 1000));
        }
      }
      
      // TypeScript should now know videoBuffer is defined
      await fs.promises.writeFile(tempVideo, Buffer.from(videoBuffer!));

      // Generate thumbnail with multiple timestamp attempts
      const timestamps = ['0.1', '1.0', '2.0', '5.0', '10.0'];
      let success = false;
      
      // Try different methods with different parameters
      for (const ts of timestamps) {
        if (success) break;
        
        // Method 1: Standard extraction
        try {
          console.log(`Attempting thumbnail extraction at ${ts}s with standard method`);
          await execFileAsync('ffmpeg', [
            '-y',
            '-i', tempVideo,
            '-vframes', '1',
            '-an',
            '-s', '800x450',
            '-ss', ts,
            tempThumb
          ]);
          success = true;
          console.log(`Successfully extracted frame at ${ts}s with standard method`);
        } catch (err) {
          console.log(`Standard extraction failed at ${ts}s: ${err}`);
        }
        
        // Method 2: Seek before input for more accurate frame selection
        if (!success) {
          try {
            console.log(`Attempting thumbnail extraction at ${ts}s with seek-before-input method`);
            await execFileAsync('ffmpeg', [
              '-y',
              '-ss', ts,
              '-i', tempVideo,
              '-vframes', '1',
              '-an',
              '-s', '800x450',
              tempThumb
            ]);
            success = true;
            console.log(`Successfully extracted frame at ${ts}s with seek-before-input method`);
          } catch (err) {
            console.log(`Seek-before-input method failed at ${ts}s: ${err}`);
          }
        }
        
        // Method 3: Force specific decoder
        if (!success) {
          try {
            console.log(`Attempting thumbnail extraction at ${ts}s with forced decoder method`);
            await execFileAsync('ffmpeg', [
              '-y',
              '-c:v', 'h264',
              '-i', tempVideo,
              '-vframes', '1',
              '-an',
              '-s', '800x450',
              '-ss', ts,
              tempThumb
            ]);
            success = true;
            console.log(`Successfully extracted frame at ${ts}s with forced decoder method`);
          } catch (err) {
            console.log(`Forced decoder method failed at ${ts}s: ${err}`);
          }
        }
      }
      
      if (!success) {
        throw new Error('Failed to extract video frame after multiple attempts');
      }

      const thumbBuffer = await fs.promises.readFile(tempThumb);
      
      // Verify the thumbnail was actually generated
      if (thumbBuffer.length === 0) {
        throw new Error('Generated thumbnail is empty');
      }

      console.log(`Successfully generated thumbnail of size ${thumbBuffer.length} bytes`);

      // Upload to S3 with explicit content type
      await uploadStringToS3(thumbBuffer, s3Key, 'image/jpeg');
      console.log(`Successfully uploaded thumbnail to S3: ${s3Key}`);

      // Cleanup temp files
      try {
        if (fs.existsSync(tempThumb)) await fs.promises.unlink(tempThumb);
        if (fs.existsSync(tempVideo)) await fs.promises.unlink(tempVideo);
      } catch (cleanupError) {
        console.error('Error cleaning up temp files:', cleanupError);
      }

      return s3Key;
    } catch (error) {
      console.error('Video thumbnail generation failed:', error);
      throw error; // Re-throw to trigger fallback SVG
    }
  }

  // Don't return an SVG placeholder - we want to make sure real video frames are used
  // Either throw the error to the caller or try harder to extract a frame
  console.error('All video frame extraction methods failed');
  throw new Error('Failed to extract video frame for thumbnail - no fallback to SVG');
  
}

export function generateSvgPlaceholder(contentType: string): string {
  const bgColor = '#0f172a';
  const textColor = '#f59e0b';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
    <rect width="800" height="450" fill="${bgColor}"/>
    <text x="400" y="225" font-family="Arial" font-size="24" fill="${textColor}" text-anchor="middle">
      ${contentType.charAt(0).toUpperCase() + contentType.slice(1)} Preview
    </text>
  </svg>`;
}