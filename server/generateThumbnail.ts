/**
 * Thumbnail generation utilities for DeepTube
 * 
 * This module handles all thumbnail generation and S3 storage operations,
 * eliminating the need for local file operations and improving reliability.
 */

import { uploadStringToS3, getSignedS3Url } from './s3';
import { exec, execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Promisified versions of functions
const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);
const readFileAsync = promisify(fs.readFile);
const unlinkAsync = promisify(fs.unlink);
const accessAsync = promisify(fs.access);

/**
 * Generate a thumbnail from a video using FFmpeg
 * @param videoUrl URL of the video file (can be local path or HTTP URL)
 * @returns Buffer containing the thumbnail image
 */
async function generateFFmpegThumbnail(videoUrl: string): Promise<Buffer> {
  if (!videoUrl) {
    throw new Error('No video URL provided');
  }

  // Create a temporary file for the output
  const tempDir = os.tmpdir();
  const outputPath = path.join(tempDir, `thumbnail-${Date.now()}.jpg`);

  try {
    console.log(`Generating FFmpeg thumbnail from ${videoUrl}`);
    console.log(`Output will be saved to ${outputPath}`);

    // First get the actual video URL if it's an S3 path
    let finalVideoUrl = videoUrl;
    if (videoUrl.startsWith('/api/s3/')) {
      try {
        const response = await fetch(`http://0.0.0.0:5000${videoUrl}?getUrl=true`);
        const data = await response.json();
        finalVideoUrl = data.url;
      } catch (error) {
        console.error('Error resolving S3 URL:', error);
        throw error;
      }
    }

    console.log(`Using FFmpeg with source URL: ${finalVideoUrl}`);

    // Use FFmpeg to extract a good frame from the video
    const ffmpegArgs = [
      '-y', // Overwrite output files without asking
      '-ss', '00:00:01.000', // Seek to 1 second
      '-i', finalVideoUrl, // Input file
      '-vframes', '1', // Extract exactly one frame
      '-q:v', '2', // High quality (1-31, lower is better)
      '-f', 'image2', // Force image2 format
      '-vf', 'scale=800:450:force_original_aspect_ratio=decrease,pad=800:450:(ow-iw)/2:(oh-ih)/2', // Resize to 16:9
      '-frames:v', '1', // Extract one frame
      outputPath // Output path
    ];

    // Execute FFmpeg
    const { stdout, stderr } = await execFileAsync('ffmpeg', ffmpegArgs);
    console.log('FFmpeg stdout:', stdout);
    console.log('FFmpeg stderr:', stderr);

    // Check if the output file exists
    await accessAsync(outputPath);

    // Read the thumbnail into a buffer
    const thumbnailBuffer = await readFileAsync(outputPath);

    // Clean up the temporary file
    await unlinkAsync(outputPath).catch(err => {
      console.error(`Error cleaning up temporary file ${outputPath}:`, err);
    });

    if (thumbnailBuffer.length === 0) {
      throw new Error('FFmpeg generated a zero-byte file');
    }

    console.log(`Successfully generated ${thumbnailBuffer.length} byte thumbnail`);
    return thumbnailBuffer;
  } catch (error) {
    console.error(`Error generating FFmpeg thumbnail:`, error);

    // Clean up the temporary file if something went wrong
    try {
      await accessAsync(outputPath);
      await unlinkAsync(outputPath);
    } catch {}

    throw error;
  }
}

/**
 * Generate an SVG thumbnail placeholder for specific content types
 * @param contentType video, image, or embed
 * @returns SVG markup as a string
 */
export function generateSvgPlaceholder(contentType = 'video'): string {
  // Normalize the content type
  const normalizedType = contentType === 'videos' ? 'video' : 
                        contentType === 'images' ? 'image' : 
                        contentType;

  // Default colors
  const bgColor = '#0f172a';  // Dark blueish background
  const textColor = '#f59e0b'; // Orange text
  const textOutline = '#000000'; // Black outline

  // Icon and text based on content type
  let icon = '';
  let label = '';

  switch (normalizedType) {
    case 'video':
      icon = `<path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2a6 6 0 1 1 0-12 6 6 0 0 1 0 12zm-6 2v-2h12v2H6zm6 2l6-3v6l-6-3z" fill="${textColor}" stroke="${textOutline}" stroke-width="0.5" />`;
      label = 'AI-Generated Video';
      break;
    case 'image':
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

  // Create the SVG
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
    <rect width="800" height="450" fill="${bgColor}" />
    <g transform="translate(400, 225) scale(7)">
      ${icon}
    </g>
    <rect x="0" y="370" width="800" height="80" fill="${bgColor}" opacity="0.7" />
    <text x="400" y="420" font-family="Arial, sans-serif" font-size="24" text-anchor="middle" fill="${textColor}" stroke="${textOutline}" stroke-width="0.7" paint-order="stroke">${label}</text>
  </svg>`;
}

/**
 * Check if a thumbnail already exists in S3
 * @param s3Key The S3 key to check
 * @returns true if the object exists, false otherwise
 */
async function thumbnailExistsInS3(s3Key: string): Promise<boolean> {
  try {
    // Try to get a signed URL - this will throw if the object doesn't exist
    await getSignedS3Url(s3Key);
    return true;
  } catch (error) {
    // Error means the object doesn't exist
    return false;
  }
}


/**
 * Generate a thumbnail for a video or image and store it directly in S3
 * @param videoId The ID of the video or image
 * @param contentType The type of content (video, image, embed)
 * @param sourceUrl The URL of the source video or image (optional)
 * @param youtubeId YouTube video ID for embed content (optional)
 * @returns The S3 key of the generated thumbnail
 */
export async function generateAndStoreS3Thumbnail(
  videoId: number,
  contentType: string,
  sourceUrl: string | null = null,
  youtubeId: string | null = null
): Promise<string> {
  // S3 key for this thumbnail
  const s3Key = `thumbnails/video-${videoId}.jpg`;

  // Check if the thumbnail already exists in S3
  try {
    const exists = await thumbnailExistsInS3(s3Key);
    if (exists) {
      console.log(`Thumbnail for ${videoId} already exists in S3`);
      return s3Key;
    }
  } catch (error) {
    // Continue if error checking - we'll try to generate a new thumbnail
    console.log(`Error checking if thumbnail exists: ${String(error)}`);
  }

  // Handle YouTube embeds
  if (contentType === 'embed' && youtubeId) {
    try {
      // Fetch the YouTube thumbnail
      const youtubeThumbnailUrl = `https://img.youtube.com/vi/${youtubeId}/0.jpg`;
      if (!youtubeThumbnailUrl) {
        throw new Error("YouTube thumbnail URL is empty");
      }

      const response = await fetch(youtubeThumbnailUrl);

      if (response.ok) {
        // Get the image data as an array buffer
        const arrayBuffer = await response.arrayBuffer();

        // Create a binary string from the array buffer
        const binaryString = Array.from(new Uint8Array(arrayBuffer))
          .map(byte => String.fromCharCode(byte))
          .join('');

        // Upload to S3 as binary data
        await uploadStringToS3(
          binaryString, 
          s3Key, 
          'image/jpeg'
        );

        console.log(`Successfully uploaded YouTube thumbnail for ${videoId} to S3`);
        return s3Key;
      } else {
        throw new Error(`YouTube thumbnail fetch failed: ${response.status}`);
      }
    } catch (error) {
      console.error(`Error generating YouTube thumbnail: ${String(error)}`);
      // Fall through to SVG generation
    }
  }

  // Handle videos - use FFmpeg to generate a thumbnail
  if ((contentType === 'video' || contentType === 'videos') && sourceUrl) {
    try {
      console.log(`Generating FFmpeg thumbnail for video ID ${videoId} from ${sourceUrl}`);

      // Generate the thumbnail using FFmpeg
      const thumbnailBuffer = await generateFFmpegThumbnail(sourceUrl);

      // Upload the thumbnail to S3
      await uploadStringToS3(
        thumbnailBuffer, 
        s3Key, 
        'image/jpeg'
      );

      console.log(`Successfully uploaded FFmpeg-generated thumbnail for ${videoId} to S3`);
      return s3Key;
    } catch (error) {
      console.error(`Error generating FFmpeg thumbnail: ${String(error)}`);
      // Fall through to SVG generation
    }
  }

  // Handle images - use the image directly if it's a URL
  if ((contentType === 'image' || contentType === 'images') && sourceUrl && sourceUrl.startsWith('http')) {
    try {
      // Fetch the image
      if (!sourceUrl) {
        throw new Error("Source URL is empty");
      }

      const response = await fetch(sourceUrl);

      if (response.ok) {
        // Get the image data as an array buffer
        const arrayBuffer = await response.arrayBuffer();

        // Create a binary string from the array buffer
        const binaryString = Array.from(new Uint8Array(arrayBuffer))
          .map(byte => String.fromCharCode(byte))
          .join('');

        // Upload to S3 as binary data
        await uploadStringToS3(
          binaryString, 
          s3Key, 
          'image/jpeg'
        );

        console.log(`Successfully uploaded image for ${videoId} to S3`);
        return s3Key;
      } else {
        throw new Error(`Image fetch failed: ${response.status}`);
      }
    } catch (error) {
      console.error(`Error generating image thumbnail: ${String(error)}`);
      // Fall through to SVG generation
    }
  }

  // If we can't generate a real thumbnail, use an SVG placeholder
  try {
    // Generate an SVG placeholder
    const svg = generateSvgPlaceholder(contentType);

    // Upload the SVG as the thumbnail
    await uploadStringToS3(
      svg, 
      s3Key, 
      'image/svg+xml'
    );

    console.log(`Successfully uploaded SVG placeholder for ${videoId} to S3`);
    return s3Key;
  } catch (error) {
    console.error(`Error generating SVG placeholder: ${String(error)}`);
    throw error;
  }
}