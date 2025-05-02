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
      // Stream FFmpeg output directly to S3
      const ffmpegProcess = execFile('ffmpeg', [
        '-y',
        '-i', sourceUrl,
        '-ss', '00:00:01.000',
        '-vframes', '1',
        '-f', 'image2pipe',
        '-vf', 'scale=800:450',
        'pipe:1'
      ]);

      // Get the output as a buffer
      let chunks: Buffer[] = [];
      ffmpegProcess.stdout?.on('data', (chunk) => chunks.push(chunk));

      await new Promise((resolve, reject) => {
        ffmpegProcess.on('close', resolve);
        ffmpegProcess.on('error', reject);
      });

      const buffer = Buffer.concat(chunks);
      await uploadStringToS3(buffer, s3Key, 'image/jpeg');
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