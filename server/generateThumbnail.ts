import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { uploadStringToS3 } from './s3';
import { promisify } from 'util';
import { execFile } from 'child_process';
import fs from 'fs/promises';
import fetch from 'node-fetch';
import path from 'path';
import os from 'os';
import { log } from './vite';

const execFilePromise = promisify(execFile);

const BUCKET_NAME = process.env.AWS_BUCKET_NAME;
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * Generate an SVG thumbnail placeholder for specific content types
 * @param contentType video, image, or embed
 * @returns SVG markup as a string
 */
export function generateSvgPlaceholder(contentType = 'video') {
  const normalizedType = contentType === 'videos' ? 'video' : 
                         contentType === 'images' ? 'image' : 
                         contentType;

  // Create SVG icon based on content type
  if (normalizedType === 'image') {
    // Image placeholder with a photo icon
    return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
      <rect width="800" height="450" fill="#1e293b" />
      <g transform="translate(350, 175)">
        <rect x="-50" y="-50" width="100" height="100" rx="10" fill="none" stroke="#f97316" stroke-width="8"/>
        <circle cx="20" cy="-20" r="15" fill="#f97316"/>
        <path d="M-40,40 L10,-10 L50,30 L50,40 L-40,40 Z" fill="#f97316"/>
      </g>
      <text x="400" y="300" font-family="Arial" font-size="24" text-anchor="middle" fill="#f97316" stroke="#000" stroke-width="1">AI Generated Image</text>
    </svg>`;
  } else if (normalizedType === 'embed') {
    // Embed placeholder with an external link icon
    return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
      <rect width="800" height="450" fill="#1e293b" />
      <g transform="translate(350, 175)">
        <rect x="-50" y="-50" width="100" height="100" rx="10" fill="none" stroke="#f97316" stroke-width="8"/>
        <path d="M-20,-20 L30,-20 L30,30 L-20,30 L-20,-20 Z" fill="none" stroke="#f97316" stroke-width="8"/>
        <path d="M10,-20 L40,-50 M40,-50 L40,-20 M40,-50 L10,-50" fill="none" stroke="#f97316" stroke-width="8"/>
      </g>
      <text x="400" y="300" font-family="Arial" font-size="24" text-anchor="middle" fill="#f97316" stroke="#000" stroke-width="1">Embedded Content</text>
    </svg>`;
  } else {
    // Default video placeholder with a play button icon
    return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
      <rect width="800" height="450" fill="#1e293b" />
      <g transform="translate(350, 175)">
        <circle cx="0" cy="0" r="60" fill="none" stroke="#f97316" stroke-width="8"/>
        <polygon points="-15,-30 -15,30 35,0" fill="#f97316"/>
      </g>
      <text x="400" y="300" font-family="Arial" font-size="24" text-anchor="middle" fill="#f97316" stroke="#000" stroke-width="1">AI Generated Video</text>
    </svg>`;
  }
}

/**
 * Check if a thumbnail already exists in S3
 * @param s3Key The S3 key to check
 * @returns true if the object exists, false otherwise
 */
async function thumbnailExistsInS3(s3Key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    });
    
    await s3Client.send(command);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Generate a thumbnail for a video or image and store it directly in S3
 * @param videoId The ID of the video or image
 * @param contentType The type of content (video, image, embed)
 * @param sourceUrl The URL of the source video or image (optional)
 * @returns The S3 key of the generated thumbnail
 */
export async function generateAndStoreS3Thumbnail(
  videoId: number,
  contentType: string,
  sourceUrl?: string | null,
  youtubeId?: string | null,
): Promise<string> {
  const s3Key = `thumbnails/video-${videoId}.jpg`;
  
  // Check if thumbnail already exists in S3
  const exists = await thumbnailExistsInS3(s3Key);
  if (exists) {
    log(`Thumbnail already exists in S3: ${s3Key}`, 's3');
    return s3Key;
  }
  
  // For YouTube embeds, use YouTube thumbnail
  if (contentType === 'embed' && youtubeId) {
    const youtubeThumbnailUrl = `https://img.youtube.com/vi/${youtubeId}/0.jpg`;
    try {
      const response = await fetch(youtubeThumbnailUrl);
      if (response.ok) {
        const buffer = Buffer.from(await response.arrayBuffer());
        await uploadStringToS3(buffer.toString('base64'), s3Key, 'image/jpeg');
        log(`Successfully uploaded YouTube thumbnail to S3: ${s3Key}`, 's3');
        return s3Key;
      }
    } catch (error) {
      log(`Error getting YouTube thumbnail: ${error}`, 's3');
      // Fall through to generate SVG placeholder
    }
  }
  
  // For images, upload the image directly if available
  if ((contentType === 'image' || contentType === 'images') && sourceUrl && sourceUrl.startsWith('http')) {
    try {
      const response = await fetch(sourceUrl);
      if (response.ok) {
        const buffer = Buffer.from(await response.arrayBuffer());
        await uploadStringToS3(buffer.toString('base64'), s3Key, 'image/jpeg');
        log(`Successfully uploaded image thumbnail to S3: ${s3Key}`, 's3');
        return s3Key;
      }
    } catch (error) {
      log(`Error uploading image to S3: ${error}`, 's3');
      // Fall through to generate SVG placeholder
    }
  }
  
  // For videos, generate a thumbnail using FFmpeg if the video is available locally
  if ((contentType === 'video' || contentType === 'videos') && sourceUrl) {
    try {
      // Create a temporary directory for processing
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'thumb-'));
      const tempVideoPath = path.join(tempDir, 'video.mp4');
      const tempThumbnailPath = path.join(tempDir, 'thumbnail.jpg');
      
      // If sourceUrl is a remote URL, download it first
      if (sourceUrl.startsWith('http')) {
        const response = await fetch(sourceUrl);
        if (response.ok) {
          const buffer = Buffer.from(await response.arrayBuffer());
          await fs.writeFile(tempVideoPath, buffer);
        } else {
          throw new Error(`Failed to download video: ${response.status}`);
        }
      } else if (sourceUrl.startsWith('data:video')) {
        // Handle base64 data URLs
        const base64Data = sourceUrl.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        await fs.writeFile(tempVideoPath, buffer);
      } else {
        // Assume it's a local file path
        try {
          await fs.copyFile(sourceUrl, tempVideoPath);
        } catch (copyError) {
          throw new Error(`Failed to copy video file: ${copyError.message}`);
        }
      }
      
      // Use FFmpeg to generate a thumbnail
      try {
        await execFilePromise('ffmpeg', [
          '-i', tempVideoPath,
          '-ss', '00:00:01.000',
          '-vframes', '1',
          '-vf', 'scale=800:450',
          '-y',
          tempThumbnailPath
        ]);
        
        // Read the generated thumbnail and upload to S3
        const thumbnailData = await fs.readFile(tempThumbnailPath);
        await uploadStringToS3(thumbnailData.toString('base64'), s3Key, 'image/jpeg');
        log(`Successfully generated and uploaded video thumbnail to S3: ${s3Key}`, 's3');
        
        // Clean up temporary files
        await fs.rm(tempDir, { recursive: true, force: true });
        return s3Key;
      } catch (ffmpegError) {
        log(`Error generating thumbnail with FFmpeg: ${ffmpegError}`, 's3');
        await fs.rm(tempDir, { recursive: true, force: true });
        // Fall through to generate SVG placeholder
      }
    } catch (error) {
      log(`Error processing video for thumbnail: ${error}`, 's3');
      // Fall through to generate SVG placeholder
    }
  }
  
  // If we reach here, we need to create an SVG placeholder
  try {
    const normalizedType = 
      contentType === 'videos' ? 'video' : 
      contentType === 'images' ? 'image' : 
      contentType;
    
    const svgPlaceholder = generateSvgPlaceholder(normalizedType);
    await uploadStringToS3(svgPlaceholder, s3Key, 'image/svg+xml');
    log(`Uploaded SVG placeholder to S3 for ${videoId} with content type ${contentType}`, 's3');
    return s3Key;
  } catch (error) {
    log(`Error uploading SVG placeholder to S3: ${error}`, 's3');
    throw new Error(`Failed to generate thumbnail: ${error.message}`);
  }
}
