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

      // Download video with retry
      let attempts = 0;
      let videoBuffer;
      while (attempts < 3) {
        try {
          const videoResponse = await fetch(sourceUrl);
          if (!videoResponse.ok) throw new Error(`HTTP ${videoResponse.status}`);
          videoBuffer = await videoResponse.arrayBuffer();
          break;
        } catch (err) {
          attempts++;
          if (attempts === 3) throw err;
          await new Promise(r => setTimeout(r, 1000));
        }
      }

      await fs.promises.writeFile(tempVideo, Buffer.from(videoBuffer));

      // Generate thumbnail with multiple timestamp attempts
      const timestamps = ['0.1', '1.0', '2.0'];
      for (const ts of timestamps) {
        try {
          await execFileAsync('ffmpeg', [
            '-y',
            '-i', tempVideo,
            '-vframes', '1',
            '-an',
            '-s', '800x450',
            '-ss', ts,
            tempThumb
          ]);
          break;
        } catch (err) {
          if (ts === timestamps[timestamps.length - 1]) throw err;
        }
      }

      const thumbBuffer = await fs.promises.readFile(tempThumb);
      await uploadStringToS3(thumbBuffer, s3Key, 'image/jpeg');

      // Cleanup
      await fs.promises.unlink(tempVideo);
      await fs.promises.unlink(tempThumb);

      return s3Key;
    } catch (error) {
      console.error('Video thumbnail generation failed:', error);
    }
  }

  // Return default SVG if all methods fail
  const svg = generatePlaceholderSvg(contentType);
  await uploadStringToS3(svg, s3Key, 'image/svg+xml');
  return s3Key;
}

function generatePlaceholderSvg(contentType: string): string {
  const bgColor = '#0f172a';
  const textColor = '#f59e0b';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
    <rect width="800" height="450" fill="${bgColor}"/>
    <text x="400" y="225" font-family="Arial" font-size="24" fill="${textColor}" text-anchor="middle">
      ${contentType.charAt(0).toUpperCase() + contentType.slice(1)} Preview
    </text>
  </svg>`;
}