/**
 * Thumbnail Service - Handles thumbnail generation for all media types
 * 
 * This service creates thumbnails for various content types (videos, images, embeds)
 * and stores them in AWS S3. It handles YouTube embeds, direct uploads, and
 * fallback SVG placeholders when generation fails.
 */

import s3Service from './s3Service';
import { storage as dbStorage } from '../storage';

/**
 * Main thumbnail generation function that handles all content types
 * @param contentId Database ID of the content
 * @param contentType Type of content (video, image, embed)
 * @param sourceUrl Source URL of the content (file path or HTTP URL)
 * @param youtubeId YouTube video ID if applicable
 * @returns S3 key of the generated thumbnail
 */
export async function generateThumbnail(
  contentId: number,
  contentType: string,
  sourceUrl: string | null = null,
  youtubeId: string | null = null
): Promise<string> {
  console.log(`Generating thumbnail for ${contentType} ${contentId}`);
  console.log(`Source URL: ${sourceUrl || 'none'}`);
  console.log(`YouTube ID: ${youtubeId || 'none'}`);
  
  try {
    // Handle YouTube videos if we have a YouTube ID
    if (youtubeId) {
      return await handleYouTubeThumbnail(contentId, youtubeId);
    }
    
    // Handle content based on type
    switch (contentType) {
      case 'image':
      case 'images':
        if (sourceUrl) {
          return await handleImageThumbnail(contentId, sourceUrl);
        }
        break;
        
      case 'video':
      case 'videos':
        if (sourceUrl) {
          return await handleVideoThumbnail(contentId, sourceUrl);
        }
        break;
        
      case 'embed':
        if (sourceUrl || youtubeId) {
          // If we have a YouTube ID, we've already handled it above
          if (sourceUrl && !youtubeId) {
            const extractedId = extractYoutubeVideoId(sourceUrl);
            if (extractedId) {
              return await handleYouTubeThumbnail(contentId, extractedId);
            }
          }
        }
        break;
    }
    
    // If we get here, we couldn't generate a thumbnail, so use a placeholder
    console.log(`No valid source for thumbnail, using placeholder for ${contentType} ${contentId}`);
    return await generatePlaceholderThumbnail(contentId, contentType);
    
  } catch (error) {
    console.error(`Error generating thumbnail: ${error}`);
    
    // Fall back to a placeholder on any error
    try {
      return await generatePlaceholderThumbnail(contentId, contentType);
    } catch (placeholderError) {
      console.error(`Error generating placeholder: ${placeholderError}`);
      throw new Error(`Failed to generate any thumbnail for ${contentType} ${contentId}`);
    }
  }
}

/**
 * Handles thumbnail generation for YouTube videos
 * @param contentId Database ID of the content
 * @param youtubeId YouTube video ID
 * @returns S3 key of the generated thumbnail
 */
async function handleYouTubeThumbnail(contentId: number, youtubeId: string): Promise<string> {
  console.log(`Generating YouTube thumbnail for video ${contentId} with ID ${youtubeId}`);
  
  try {
    // Get YouTube thumbnail URL
    const youtubeThumbnailUrl = getYoutubeThumbnailUrl(youtubeId);
    
    // Fetch the thumbnail image
    const response = await fetch(youtubeThumbnailUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch YouTube thumbnail: ${response.status}`);
    }
    
    // Convert to buffer
    const buffer = Buffer.from(await response.arrayBuffer());
    
    // Upload to S3
    const s3Key = s3Service.getThumbnailS3Key(contentId);
    await s3Service.uploadToS3(buffer, s3Key, 'image/jpeg');
    
    console.log(`Successfully generated YouTube thumbnail for video ${contentId}`);
    return s3Key;
  } catch (error) {
    console.error(`Error handling YouTube thumbnail: ${error}`);
    throw error;
  }
}

/**
 * Handles thumbnail generation for uploaded images
 * @param contentId Database ID of the content
 * @param sourceUrl Source URL of the image
 * @returns S3 key of the generated thumbnail
 */
async function handleImageThumbnail(contentId: number, sourceUrl: string): Promise<string> {
  console.log(`Generating image thumbnail for image ${contentId} from ${sourceUrl}`);
  
  try {
    // Import required modules
    const fs = await import('fs/promises');
    const fsSync = await import('fs');
    const path = await import('path');
    const os = await import('os');
    const { execFile } = await import('child_process');
    const { promisify } = await import('util');
    const execFileAsync = promisify(execFile);
    
    // Set up temp files
    const tempDir = os.tmpdir();
    const tempOriginal = path.join(tempDir, `img-original-${contentId}-${Date.now()}`);
    const tempThumb = path.join(tempDir, `img-thumb-${contentId}-${Date.now()}.jpg`);
    
    let imageBuffer: Buffer | undefined;
    
    // Clean up source URL to handle API and workspace references
    const cleanedSourceUrl = sourceUrl
      .replace('/api/s3/', '')
      .replace('/home/runner/workspace/', '')
      .replace('https://deeptubebucket.s3.us-east-2.amazonaws.com/', '');
      
    // Handle S3 URLs and local file references
    if (sourceUrl.includes('/api/s3/') || sourceUrl.includes('/api/content/')) {
      // Try to find the image in the uploads directory
      const fileName = path.basename(cleanedSourceUrl);
      // Check different possible locations
      const possiblePaths = [
        `uploads/images/${fileName}`,
        `uploads/${fileName}`,
        cleanedSourceUrl,
        sourceUrl.replace('/api/s3/', '')
      ];
      
      let localImagePath = null;
      
      // Find the first path that exists
      for (const p of possiblePaths) {
        if (fsSync.existsSync(p)) {
          localImagePath = p;
          console.log(`Found image file at: ${localImagePath}`);
          break;
        }
      }
      
      // If found locally, read it
      if (localImagePath) {
        imageBuffer = await fs.readFile(localImagePath);
      } else {
        // If not found, try to download it from the URL
        console.log(`Could not find local file for ${sourceUrl}, trying to fetch...`);
        const response = await fetch(sourceUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status}`);
        }
        imageBuffer = Buffer.from(await response.arrayBuffer());
      }
    }
    // Handle base64 encoded images
    else if (sourceUrl.startsWith('data:image')) {
      console.log(`Processing base64 image for ${contentId}`);
      const matches = sourceUrl.match(/^data:[^;]+;base64,(.+)$/);
      if (!matches || matches.length !== 2) {
        throw new Error('Invalid base64 image data');
      }
      imageBuffer = Buffer.from(matches[1], 'base64');
    }
    // Handle http/https URLs
    else if (sourceUrl.startsWith('http')) {
      console.log(`Fetching image from URL for ${contentId}`);
      
      // Use a retry mechanism for unstable connections
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          const response = await fetch(sourceUrl);
          if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
          imageBuffer = Buffer.from(await response.arrayBuffer());
          break;
        } catch (err) {
          attempts++;
          if (attempts >= maxAttempts) throw err;
          console.log(`Fetch attempt ${attempts} failed, retrying...`);
          await new Promise(r => setTimeout(r, 1000)); // Wait 1 second between attempts
        }
      }
    }
    // Handle local file paths
    else {
      console.log(`Reading image from local path for ${contentId}: ${cleanedSourceUrl}`);
      try {
        imageBuffer = await fs.readFile(cleanedSourceUrl);
      } catch (readError) {
        console.error(`Failed to read from ${cleanedSourceUrl}:`, readError);
        throw new Error(`Image file not found: ${cleanedSourceUrl}`);
      }
    }
    
    // Save the image to a temp file
    if (!imageBuffer) {
      throw new Error('Failed to load image from any source');
    }
    // Must explicitly ensure imageBuffer is a Buffer before writing to file
    const bufferToWrite = Buffer.isBuffer(imageBuffer) ? imageBuffer : Buffer.from(imageBuffer);
    await fs.writeFile(tempOriginal, bufferToWrite);
    
    // Use FFmpeg to create a proper resized thumbnail
    try {
      await execFileAsync('ffmpeg', [
        '-y',                 // Overwrite output file
        '-i', tempOriginal,   // Input file
        '-vf', 'scale=800:450:force_original_aspect_ratio=decrease,pad=800:450:(ow-iw)/2:(oh-ih)/2',
        '-q:v', '2',          // High quality (2 is high, 31 is lowest)
        tempThumb             // Output file
      ]);
      
      // Check if file was created and has content
      const stats = await fs.stat(tempThumb);
      if (stats.size === 0) {
        throw new Error('Generated thumbnail is empty');
      }
      
      console.log(`Successfully resized image thumbnail to 800x450`);
    } catch (ffmpegError) {
      console.error('FFmpeg processing failed:', ffmpegError);
      // If FFmpeg fails, just use the original image
      await fs.copyFile(tempOriginal, tempThumb);
      console.log('Falling back to original image');
    }
    
    // Upload the thumbnail to S3
    const thumbBuffer = await fs.readFile(tempThumb);
    const s3Key = `thumbnails/video-${contentId}.jpg`; // Use same naming convention as videos
    
    // Upload using the existing S3 service
    const { uploadStringToS3 } = await import('../s3');
    await uploadStringToS3(thumbBuffer, s3Key, 'image/jpeg');
    
    console.log(`Successfully uploaded image thumbnail to S3: ${s3Key}`);
    
    // Cleanup temp files
    try {
      if (fsSync.existsSync(tempOriginal)) await fs.unlink(tempOriginal);
      if (fsSync.existsSync(tempThumb)) await fs.unlink(tempThumb);
    } catch (cleanupError) {
      console.warn('Failed to clean up temporary files:', cleanupError);
    }
    
    return s3Key;
  } catch (error) {
    console.error(`Error handling image thumbnail for content ${contentId}:`, error);
    // Fall back to placeholder if anything goes wrong
    return generatePlaceholderThumbnail(contentId, 'image');
  }
}

/**
 * Handles thumbnail generation for uploaded videos
 * @param contentId Database ID of the content
 * @param sourceUrl Source URL of the video
 * @returns S3 key of the generated thumbnail
 */
async function handleVideoThumbnail(contentId: number, sourceUrl: string): Promise<string> {
  // Import required modules
  const { promisify } = await import('util');
  const { execFile } = await import('child_process');
  const fs = await import('fs/promises');
  const fsSync = await import('fs');
  const path = await import('path');
  const os = await import('os');
  const execFileAsync = promisify(execFile);
  
  console.log(`Generating thumbnail for video ${contentId} from source: ${sourceUrl}`);
  
  try {
    // Create temp directory and files
    const tempDir = os.tmpdir();
    const tempThumb = path.join(tempDir, `thumb-${contentId}-${Date.now()}.jpg`);
    
    // Fix path if it's an API URL
    const cleanedSourceUrl = sourceUrl
      .replace('/api/s3/', '')
      .replace('/home/runner/workspace/', '');
    
    // Handle S3 URLs - we need to extract the local path
    let localVideoPath;
    if (sourceUrl.includes('/api/s3/') || sourceUrl.includes('/api/content/')) {
      // Try to find the video in the uploads directory
      const fileName = path.basename(cleanedSourceUrl);
      // Check different possible locations
      const possiblePaths = [
        `uploads/${fileName}`,
        cleanedSourceUrl,
        sourceUrl.replace('/api/s3/', ''),
        `uploads/videos/${fileName}`
      ];
      
      // Find the first path that exists
      for (const p of possiblePaths) {
        if (fsSync.existsSync(p)) {
          localVideoPath = p;
          console.log(`Found video file at: ${localVideoPath}`);
          break;
        }
      }
      
      if (!localVideoPath) {
        console.error(`Could not find local file for ${sourceUrl} after trying paths:`, possiblePaths);
        throw new Error('Video file not found');
      }
    } else {
      // It's already a local path
      localVideoPath = cleanedSourceUrl;
    }
    
    // Make sure the video file exists
    try {
      await fs.access(localVideoPath);
    } catch (error) {
      console.error(`Video file not accessible at ${localVideoPath}:`, error);
      throw new Error('Video file not accessible');
    }
    
    console.log(`Extracting thumbnail from video at ${localVideoPath}`);
    
    // Try multiple timestamp positions in case the video starts with black frames
    const timestamps = ['0.5', '1', '3', '5'];
    let success = false;
    
    for (const timestamp of timestamps) {
      try {
        await execFileAsync('ffmpeg', [
          '-y',                 // Overwrite output file
          '-i', localVideoPath, // Input file
          '-vframes', '1',      // Extract 1 frame
          '-an',                // No audio
          '-s', '800x450',      // Size
          '-ss', timestamp,     // Timestamp
          '-q:v', '2',          // Quality (2 is high quality, 31 is lowest)
          tempThumb             // Output file
        ]);
        
        // Check if file was created and has content
        const stats = await fs.stat(tempThumb);
        if (stats.size > 0) {
          success = true;
          console.log(`Successfully generated thumbnail at position ${timestamp}s`);
          break;
        }
      } catch (error) {
        console.error(`Failed to extract frame at ${timestamp}s:`, error);
        // Continue to next timestamp
      }
    }
    
    if (!success) {
      console.error(`Failed to extract thumbnail from ${localVideoPath} after trying multiple timestamps`);
      throw new Error('Thumbnail extraction failed');
    }
    
    // Upload the thumbnail to S3
    const s3Key = `thumbnails/video-${contentId}.jpg`;
    const thumbBuffer = await fs.readFile(tempThumb);
    
    // Upload using the existing S3 service
    const { uploadStringToS3 } = await import('../s3');
    await uploadStringToS3(thumbBuffer, s3Key, 'image/jpeg');
    
    console.log(`Successfully uploaded thumbnail to S3: ${s3Key}`);
    
    // Cleanup temp file
    try {
      await fs.unlink(tempThumb);
    } catch (cleanupError) {
      console.warn('Failed to clean up temporary file:', cleanupError);
    }
    
    return s3Key;
  } catch (error) {
    console.error(`Error generating video thumbnail for content ${contentId}:`, error);
    // Fall back to placeholder if anything goes wrong
    return generatePlaceholderThumbnail(contentId, 'video');
  }
}

/**
 * Generates a placeholder SVG thumbnail when other methods fail
 * @param contentId Database ID of the content
 * @param contentType Type of content (video, image, embed)
 * @returns S3 key of the generated SVG placeholder
 */
async function generatePlaceholderThumbnail(contentId: number, contentType: string): Promise<string> {
  console.log(`Generating placeholder thumbnail for ${contentType} ${contentId}`);
  
  try {
    // Generate placeholder SVG
    const svg = generatePlaceholderSvg(contentType);
    
    // Upload to S3
    const s3Key = s3Service.getThumbnailS3Key(contentId);
    await s3Service.uploadToS3(Buffer.from(svg), s3Key, 'image/svg+xml');
    
    console.log(`Successfully generated placeholder thumbnail for ${contentType} ${contentId}`);
    return s3Key;
  } catch (error) {
    console.error(`Error generating placeholder thumbnail: ${error}`);
    throw error;
  }
}

/**
 * Creates an SVG placeholder with content type label
 * @param contentType Type of content (video, image, embed)
 * @returns SVG markup as string
 */
function generatePlaceholderSvg(contentType: string): string {
  const bgColor = '#0f172a';
  const textColor = '#f59e0b';
  const width = 800;
  const height = 450;
  
  // Display proper content type in the SVG
  const displayType = contentType.charAt(0).toUpperCase() + contentType.slice(1);
  
  if (contentType === 'image' || contentType === 'images') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="${width}" height="${height}" fill="${bgColor}" />
      <rect x="${width/2 - 125}" y="${height/2 - 75}" width="250" height="150" fill="#222" />
      <circle cx="${width/2}" cy="${height/2 - 45}" r="20" fill="${textColor}" />
      <rect x="${width/2 - 75}" y="${height/2}" width="150" height="60" fill="#333" />
      <text x="${width/2}" y="${height - 50}" font-family="Arial" font-size="24" fill="${textColor}" text-anchor="middle">
        AI Generated ${displayType}
      </text>
    </svg>`;
  }
  
  // Default video placeholder with play button
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" fill="${bgColor}" />
    <circle cx="${width/2}" cy="${height/2}" r="80" fill="#222" />
    <polygon points="${width/2 - 30},${height/2 - 45} ${width/2 - 30},${height/2 + 45} ${width/2 + 45},${height/2}" fill="${textColor}" />
    <text x="${width/2}" y="${height - 50}" font-family="Arial" font-size="24" fill="${textColor}" text-anchor="middle">
      AI Generated ${displayType}
    </text>
  </svg>`;
}

/**
 * Extracts the YouTube video ID from a URL or embed code
 * @param source YouTube URL or embed code
 * @returns YouTube video ID or null if not found
 */
export function extractYoutubeVideoId(source: string | null): string | null {
  if (!source) return null;
  
  // Common YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/i,
    /(?:youtube\.com\/embed\/)([^"&?\/ ]{11})/i,
    /(?:youtube\.com\/shorts\/)([^"&?\/ ]{11})/i
  ];
  
  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match && match[1]) return match[1];
  }
  
  return null;
}

/**
 * Gets the YouTube thumbnail URL for a video ID
 * @param videoId YouTube video ID
 * @returns Full URL to YouTube thumbnail
 */
export function getYoutubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export default {
  generateThumbnail,
  extractYoutubeVideoId,
  getYoutubeThumbnailUrl
};
