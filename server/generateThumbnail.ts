/**
 * Thumbnail generation utilities for DeepTube
 * 
 * This module handles all thumbnail generation and S3 storage operations,
 * eliminating the need for local file operations and improving reliability.
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { execFile } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { uploadStringToS3 } from './s3';

const execFileAsync = promisify(execFile);

export async function generateAndStoreS3Thumbnail(
  videoId: number,
  contentType: string,
  sourceUrl: string | null = null,
  youtubeId: string | null = null
): Promise<string> {
  const s3Key = `thumbnails/video-${videoId}.jpg`;

  // Handle YouTube embeds
  if (contentType === 'embed' && youtubeId) {
    try {
      const youtubeThumbnailUrl = `https://img.youtube.com/vi/${youtubeId}/0.jpg`;
      const response = await fetch(youtubeThumbnailUrl);

      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        await uploadStringToS3(buffer, s3Key, 'image/jpeg');
        return s3Key;
      }
    } catch (error) {
      console.error(`Error generating YouTube thumbnail: ${String(error)}`);
    }
  }

  // Handle direct images
  if ((contentType === 'image' || contentType === 'images') && sourceUrl && sourceUrl.startsWith('http')) {
    try {
      const response = await fetch(sourceUrl);

      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        await uploadStringToS3(buffer, s3Key, 'image/jpeg');
        return s3Key;
      }
    } catch (error) {
      console.error(`Error processing image: ${String(error)}`);
    }
  }

  // Handle videos - use FFmpeg with direct streaming
  if ((contentType === 'video' || contentType === 'videos') && sourceUrl) {
    try {
      // Create temp files for both video and thumbnail
      const tempDir = os.tmpdir();
      const tempVideo = path.join(tempDir, `video-${Date.now()}.mp4`);
      const tempThumb = path.join(tempDir, `thumb-${Date.now()}.jpg`);

      // If it's an S3 API URL, get the actual S3 URL first
      let videoUrl = sourceUrl;
      if (sourceUrl.startsWith('/api/s3/')) {
        const response = await fetch(`http://localhost:3000${sourceUrl}?getUrl=true`);
        const data = await response.json();
        videoUrl = data.url;
      }

      // First get the actual video URL if using S3 API endpoint
      let finalVideoUrl = videoUrl;
      if (videoUrl.startsWith('/api/s3/')) {
        const response = await fetch(`http://localhost:3000${videoUrl}?getUrl=true`);
        const data = await response.json();
        finalVideoUrl = data.url;
      }

      // Download the video to temp file
      const response = await fetch(finalVideoUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}`);
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      await fs.promises.writeFile(tempVideo, buffer);

      console.log(`Generating thumbnail from video file: ${tempVideo}`);

      // Generate thumbnail using FFmpeg with simplified parameters
      await execFileAsync('ffmpeg', [
        '-y',                   // Overwrite output files without asking
        '-i', tempVideo,        // Input file
        '-vf', 'select=eq(n\\,0)', // Select first frame
        '-vframes', '1',        // Extract one frame only
        '-aspect', '16:9',      // Force 16:9 aspect ratio 
        '-s', '800x450',        // Scale to desired size
        tempThumb              // Output file
      ]);

      // Verify the thumbnail was created
      await fs.promises.access(tempThumb);
      console.log(`Thumbnail generated successfully at: ${tempThumb}`);

      // Read the generated thumbnail
      const thumbBuffer = await fs.promises.readFile(tempThumb);

      // Upload to S3
      await uploadStringToS3(thumbBuffer, s3Key, 'image/jpeg');

      // Cleanup temp files
      await fs.promises.unlink(tempVideo);
      await fs.promises.unlink(tempThumb);

      return s3Key;
    } catch (error) {
      console.error(`Error generating FFmpeg thumbnail: ${String(error)}`);
    }
  }

  // If all else fails, generate an SVG placeholder
  const svg = generateSvgPlaceholder(contentType);
  await uploadStringToS3(svg, s3Key, 'image/svg+xml');
  return s3Key;
}

export function generateSvgPlaceholder(contentType = 'video'): string {
  const bgColor = '#0f172a';
  const textColor = '#f59e0b';
  const textOutline = '#000000';

  let icon = '';
  let label = '';

  switch (contentType) {
    case 'video':
    case 'videos':
      icon = `<path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2a6 6 0 1 1 0-12 6 6 0 0 1 0 12zm-6 2v-2h12v2H6zm6 2l6-3v6l-6-3z" fill="${textColor}" stroke="${textOutline}" stroke-width="0.5" />`;
      label = 'AI-Generated Video';
      break;
    case 'image':
    case 'images':
      icon = `<path d="M4 4h16v16H4V4zm2 2v12h12V6H6zm8 10v-6h2v6h-2zm-7 0v-3h2v3H7zm3 0v-5h2v5h-2z" fill="${textColor}" stroke="${textOutline}" stroke-width="0.5" />`;
      label = 'AI-Generated Image';
      break;
    case 'embed':
      icon = `<path d="M10 15l-5-5 5-5m4 0l5 5-5 5" fill="none" stroke="${textColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />`;
      label = 'Embedded Content';
      break;
    default:
      icon = `<circle cx="12" cy="12" r="8" fill="${textColor}" stroke="${textOutline}" stroke-width="0.5" />`;
      label = 'DeepTube Content';
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
    <rect width="800" height="450" fill="${bgColor}" />
    <g transform="translate(400, 225) scale(7)">
      ${icon}
    </g>
    <rect x="0" y="370" width="800" height="80" fill="${bgColor}" opacity="0.7" />
    <text x="400" y="420" font-family="Arial, sans-serif" font-size="24" text-anchor="middle" fill="${textColor}" stroke="${textOutline}" stroke-width="0.7" paint-order="stroke">${label}</text>
  </svg>`;
}