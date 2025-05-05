/**
 * Cloudinary Service - Handles all Cloudinary operations for media transformation
 * 
 * This service provides a streamlined interface to Cloudinary for generating thumbnails
 * directly from S3 URLs without needing local file storage.
 */

import { v2 as cloudinary } from 'cloudinary';
import s3Service from './s3Service';

// Configure Cloudinary with credentials from environment variables
// Handle both direct values and CLOUDINARY_URL format
let cloudName, apiKey, apiSecret;

// Parse from CLOUDINARY_URL format if needed
const cloudinaryUrl = process.env.CLOUDINARY_CLOUD_NAME || '';
if (cloudinaryUrl.includes('cloudinary://')) {
  try {
    // Extract from format: cloudinary://<api_key>:<api_secret>@<cloud_name>
    const match = cloudinaryUrl.match(/cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
    if (match) {
      apiKey = match[1].trim();
      apiSecret = match[2].trim();
      cloudName = match[3].trim();
      console.log(`Extracted Cloudinary credentials from URL format:`);
      console.log(`  Cloud name: ${cloudName}`);
      console.log(`  API key: ${apiKey.substring(0, 5)}...`);
      console.log(`  API secret: ${apiSecret.substring(0, 5)}...`);
    }
  } catch (error) {
    console.error('Error parsing CLOUDINARY_URL:', error);
  }
} else {
  // Use direct values
  cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  apiKey = process.env.CLOUDINARY_API_KEY;
  apiSecret = process.env.CLOUDINARY_API_SECRET;
}

// Configure Cloudinary with the parsed or direct values
cloudinary.config({
  cloud_name: cloudName || process.env.CLOUDINARY_CLOUD_NAME,
  api_key: apiKey || process.env.CLOUDINARY_API_KEY,
  api_secret: apiSecret || process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Log configuration status
console.log(`Cloudinary configuration status:`);
console.log(`  Cloud name provided: ${Boolean(cloudName)}`);
console.log(`  API key provided: ${Boolean(apiKey)}`);
console.log(`  API secret provided: ${Boolean(apiSecret)}`);

/**
 * Generate a thumbnail using Cloudinary from a source URL
 * @param contentId Content ID for proper S3 key generation
 * @param sourceUrl URL of the original media (video, image or YouTube URL)
 * @param contentType Type of content (video, image, embed)
 * @param options Additional transformation options
 * @returns S3 key of the generated thumbnail
 */
async function generateThumbnail(
  contentId: number,
  sourceUrl: string | null,
  contentType: string,
  youtubeId: string | null = null,
  options: { width?: number; height?: number } = {}
): Promise<string> {
  console.log(`Generating Cloudinary thumbnail for ${contentType} ${contentId}`);
  console.log(`Source URL: ${sourceUrl || 'none'}`);
  console.log(`YouTube ID: ${youtubeId || 'none'}`);
  
  try {
    // Set default dimensions if not provided
    const width = options.width || 800;
    const height = options.height || 450;
    
    // For video content, use Cloudinary's video thumbnail capabilities
    if (contentType === 'video' && sourceUrl) {
      console.log(`Generating Cloudinary thumbnail for video ${contentId} from ${sourceUrl}`);
      
      try {
        // Generate a direct thumbnail from the video URL using Cloudinary's video processing
        // Apply special transformations optimized for video thumbnails
        const transformation = {
          width,
          height,
          crop: 'fill',
          quality: 'auto',
          format: 'jpg',
          // Video-specific transformations
          video_sampling: 1, // Take thumbnail from 1% of the video duration
          effect: 'sharpen',
          resource_type: 'video'
        };
        
        // If it's a local API URL, make it a full URL
        let fullSourceUrl = sourceUrl;
        if (sourceUrl.startsWith('/api/')) {
          // We need to make it a fully qualified URL for Cloudinary
          const baseUrl = process.env.BASE_URL || 'https://deeptube.co';
          fullSourceUrl = `${baseUrl}${sourceUrl}`;
          console.log(`Converting relative URL to absolute URL: ${fullSourceUrl}`);
        }
        
        // Generate a Cloudinary URL for the video thumbnail
        const result = cloudinary.url(fullSourceUrl, {
          type: 'fetch',
          transformation: [transformation],
          sign_url: true,
          resource_type: 'video'
        });
        
        console.log(`Cloudinary video thumbnail URL: ${result}`);
        
        // Fetch the thumbnail from Cloudinary
        const response = await fetch(result);
        if (!response.ok) {
          throw new Error(`Failed to fetch video thumbnail from Cloudinary: ${response.status}`);
        }
        
        // Process and upload the thumbnail to S3
        const imageBuffer = Buffer.from(await response.arrayBuffer());
        const s3Key = s3Service.getThumbnailS3Key(contentId);
        await s3Service.uploadToS3(imageBuffer, s3Key, 'image/jpeg');
        
        console.log(`Successfully uploaded video thumbnail to S3: ${s3Key}`);
        return s3Key;
      } catch (cloudinaryError) {
        console.error(`Cloudinary video thumbnail generation failed:`, cloudinaryError);
        // Try direct YouTube thumbnail strategy as fallback for video URLs
        try {
          // Check if it's a YouTube video URL embedded in our video
          const youtubeId = extractYoutubeVideoId(sourceUrl);
          if (youtubeId) {
            console.log(`Detected YouTube video ID in source URL: ${youtubeId}`);
            const youtubeThumbnailUrl = getYoutubeThumbnailUrl(youtubeId);
            
            // Fetch the YouTube thumbnail directly
            const ytResponse = await fetch(youtubeThumbnailUrl);
            if (ytResponse.ok) {
              const ytImageBuffer = Buffer.from(await ytResponse.arrayBuffer());
              const s3Key = s3Service.getThumbnailS3Key(contentId);
              await s3Service.uploadToS3(ytImageBuffer, s3Key, 'image/jpeg');
              
              console.log(`Successfully uploaded YouTube thumbnail to S3: ${s3Key}`);
              return s3Key;
            }
          }
        } catch (ytError) {
          console.error(`YouTube thumbnail fallback failed:`, ytError);
        }
        
        // We'll try standard image processing instead
        console.log(`Falling back to standard image processing for video thumbnail`);
        // Continue with the next methods rather than throwing an error
      }
    }
    
    // For YouTube videos, use the video ID directly
    if (youtubeId) {
      try {
        const youtubeUrl = `https://www.youtube.com/watch?v=${youtubeId}`;
        return await generateFromUrl(contentId, youtubeUrl, width, height);
      } catch (error) {
        console.error(`Error generating thumbnail from YouTube URL:`, error);
        
        // Fallback: Use direct YouTube thumbnail URL
        try {
          // Try to fetch directly from YouTube
          const youtubeThumbnailUrl = getYoutubeThumbnailUrl(youtubeId);
          console.log(`Falling back to direct YouTube thumbnail: ${youtubeThumbnailUrl}`);
          
          const response = await fetch(youtubeThumbnailUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch YouTube thumbnail: ${response.status}`);
          }
          
          // Get the image data
          const imageBuffer = Buffer.from(await response.arrayBuffer());
          
          // Upload to S3
          const s3Key = s3Service.getThumbnailS3Key(contentId);
          await s3Service.uploadToS3(imageBuffer, s3Key, 'image/jpeg');
          
          console.log(`Successfully uploaded YouTube thumbnail to S3 directly: ${s3Key}`);
          return s3Key;
        } catch (directError) {
          console.error(`Direct YouTube thumbnail fetch failed:`, directError);
          throw error; // Rethrow the original error
        }
      }
    }
    
    // If we have a source URL, use it
    if (sourceUrl) {
      // Check if it's a base64 encoded image
      if (sourceUrl.startsWith('data:image')) {
        // Upload base64 image to Cloudinary and get transformed URL
        return await generateFromBase64(contentId, sourceUrl, width, height);
      }
      
      // Otherwise, it's a regular URL
      return await generateFromUrl(contentId, sourceUrl, width, height);
    }
    
    // If we don't have a source URL, generate a placeholder
    console.log(`No source URL provided for ${contentType} ${contentId}, generating placeholder`);
    return await generatePlaceholder(contentId, contentType, width, height);
  } catch (error) {
    console.error(`Error generating Cloudinary thumbnail:`, error);
    
    // For videos, we don't want to fall back to SVG placeholders
    if (contentType === 'video') {
      throw new Error(`Failed to generate video thumbnail - no SVG fallback allowed`);
    }
    
    // For other content types, we can fall back to placeholder as before
    try {
      // Generate a placeholder - but only for non-video content types
      const svg = generateSvgPlaceholder(contentType);
      const s3Key = s3Service.getThumbnailS3Key(contentId);
      await s3Service.uploadToS3(Buffer.from(svg), s3Key, 'image/svg+xml');
      console.log(`Successfully uploaded SVG placeholder to S3: ${s3Key}`);
      return s3Key;
    } catch (placeholderError) {
      console.error(`Error generating placeholder:`, placeholderError);
      throw new Error(`Failed to generate any thumbnail for ${contentType} ${contentId}`);
    }
  }
}

/**
 * Generate a thumbnail from a URL using Cloudinary
 * @param contentId Content ID for proper S3 key generation
 * @param url Source URL (can be image, video, or YouTube URL)
 * @param width Desired width
 * @param height Desired height
 * @returns S3 key of the generated thumbnail
 */
async function generateFromUrl(
  contentId: number,
  url: string,
  width: number = 800,
  height: number = 450
): Promise<string> {
  console.log(`Generating thumbnail from URL: ${url}`);
  
  try {
    // If the URL starts with /api/s3/, we need to use a direct S3 URL
    if (url.startsWith('/api/s3/')) {
      // Extract the S3 path from the URL
      const s3Path = url.replace('/api/s3/', '');
      
      // Get a direct S3 URL we can use with Cloudinary
      try {
        // Get a signed URL for the resource
        const s3Key = s3Service.getS3KeyFromPath(s3Path);
        const signedUrl = await s3Service.getSignedS3Url(s3Key);
        
        console.log(`Converted /api/s3/ URL to direct S3 URL: ${signedUrl}`);
        url = signedUrl; // Use this URL instead
      } catch (s3Error) {
        console.error(`Failed to convert /api/s3/ URL to S3 URL:`, s3Error);
        // Continue with the original URL as a fallback
      }
    }
    
    // Detect if the URL is likely a video based on extension or parameters
    const isVideoUrl = /\.(mp4|mov|avi|wmv|flv|webm|mkv)(\?|$)/i.test(url) || url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com');
    
    // Add video-specific transformations if needed
    let transformation = {
      width,
      height,
      crop: 'fill',
      quality: 'auto',
      format: 'jpg',
      fetch_format: 'auto'
    };
    
    // If it seems to be a video URL, add video-specific transformations
    // Note: We need to use an 'any' type here because Cloudinary's TypeScript definitions don't include video-specific settings
    let cloudinaryOptions: any = {
      type: 'fetch',
      transformation: [transformation],
      sign_url: true,
      resource_type: isVideoUrl ? 'video' : 'image'
    };
    
    // Add video-specific transformations if needed
    if (isVideoUrl) {
      // Add video sampling to the transformation
      (transformation as any).video_sampling = 1; // Take thumbnail from 1% of the video duration
      (transformation as any).effect = 'sharpen';
    }
    
    // Generate the Cloudinary URL with transformation - use the options we defined
    const result = cloudinary.url(url, cloudinaryOptions);
    
    console.log(`Cloudinary transformation URL: ${result}`);
    
    // Now fetch the transformed image from Cloudinary
    const response = await fetch(result);
    if (!response.ok) {
      throw new Error(`Failed to fetch transformed image: ${response.status}`);
    }
    
    // Get the image buffer
    const imageBuffer = Buffer.from(await response.arrayBuffer());
    
    // Upload to S3
    const s3Key = s3Service.getThumbnailS3Key(contentId);
    await s3Service.uploadToS3(imageBuffer, s3Key, 'image/jpeg');
    
    console.log(`Successfully uploaded thumbnail to S3: ${s3Key}`);
    return s3Key;
  } catch (error) {
    console.error(`Error generating thumbnail from URL:`, error);
    throw error;
  }
}

/**
 * Generate a thumbnail from a base64 encoded image
 * @param contentId Content ID for proper S3 key generation
 * @param base64Data Base64 encoded image data
 * @param width Desired width
 * @param height Desired height
 * @returns S3 key of the generated thumbnail
 */
async function generateFromBase64(
  contentId: number,
  base64Data: string,
  width: number = 800,
  height: number = 450
): Promise<string> {
  console.log(`Generating thumbnail from base64 data for content ${contentId}`);
  
  try {
    // Upload base64 to Cloudinary
    const uploadResult = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader.upload(base64Data, {
        folder: 'thumbnails',
        transformation: [
          { width, height, crop: 'fill', quality: 'auto', format: 'jpg' }
        ]
      }, (error, result) => {
        if (error) return reject(error);
        resolve(result);
      });
    });
    
    console.log(`Uploaded to Cloudinary: ${uploadResult.public_id}`);
    
    // Fetch the transformed image from Cloudinary
    const response = await fetch(uploadResult.secure_url);
    if (!response.ok) {
      throw new Error(`Failed to fetch from Cloudinary: ${response.status}`);
    }
    
    // Get the image buffer
    const imageBuffer = Buffer.from(await response.arrayBuffer());
    
    // Upload to S3
    const s3Key = s3Service.getThumbnailS3Key(contentId);
    await s3Service.uploadToS3(imageBuffer, s3Key, 'image/jpeg');
    
    console.log(`Successfully uploaded thumbnail to S3: ${s3Key}`);
    return s3Key;
  } catch (error) {
    console.error(`Error generating thumbnail from base64:`, error);
    throw error;
  }
}

/**
 * Generate a placeholder thumbnail when no source is available
 * @param contentId Content ID for proper S3 key generation
 * @param contentType Type of content
 * @param width Desired width
 * @param height Desired height
 * @returns S3 key of the generated placeholder
 */
async function generatePlaceholder(
  contentId: number,
  contentType: string,
  width: number = 800,
  height: number = 450
): Promise<string> {
  console.log(`Generating placeholder thumbnail for ${contentType} ${contentId}`);
  
  // For video content, we don't want any placeholder - strictly require real frames
  if (contentType === 'video') {
    throw new Error(`Cannot generate placeholder for video content - real frames required`);
  }
  
  try {
    // Generate a placeholder image URL using Cloudinary text overlay
    const text = `AI Generated ${contentType.charAt(0).toUpperCase()}${contentType.slice(1)}`;
    
    // Create a background with text
    const result = cloudinary.url('blank', {
      transformation: [
        { width, height, background: '0f172a' },
        { overlay: { font_family: 'Arial', font_size: 32, text }, color: 'f59e0b' },
        { flags: 'layer_apply', gravity: 'center' }
      ],
      sign_url: true
    });
    
    console.log(`Cloudinary placeholder URL: ${result}`);
    
    // Fetch the placeholder image
    const response = await fetch(result);
    if (!response.ok) {
      throw new Error(`Failed to fetch placeholder: ${response.status}`);
    }
    
    // Get the image buffer
    const imageBuffer = Buffer.from(await response.arrayBuffer());
    
    // Upload to S3
    const s3Key = s3Service.getThumbnailS3Key(contentId);
    await s3Service.uploadToS3(imageBuffer, s3Key, 'image/jpeg');
    
    console.log(`Successfully uploaded placeholder to S3: ${s3Key}`);
    return s3Key;
  } catch (error) {
    console.error(`Error generating placeholder:`, error);
    
    // If Cloudinary fails, fall back to a simple SVG placeholder (but not for videos)
    try {
      // Double check it's not a video
      if (contentType === 'video') {
        throw new Error('SVG placeholders not allowed for videos');
      }
      
      const svg = generateSvgPlaceholder(contentType, width, height);
      const s3Key = s3Service.getThumbnailS3Key(contentId);
      await s3Service.uploadToS3(Buffer.from(svg), s3Key, 'image/svg+xml');
      
      console.log(`Successfully uploaded SVG placeholder to S3: ${s3Key}`);
      return s3Key;
    } catch (svgError) {
      console.error(`Error generating SVG placeholder:`, svgError);
      throw new Error(`Failed to generate any placeholder for ${contentType} ${contentId}`);
    }
  }
}

/**
 * Generate an SVG placeholder as last resort
 * @param contentType Type of content
 * @param width SVG width
 * @param height SVG height
 * @returns SVG markup as string
 */
function generateSvgPlaceholder(
  contentType: string,
  width: number = 800,
  height: number = 450
): string {
  const bgColor = '#0f172a';
  const textColor = '#f59e0b';
  const accentColor = '#475569';
  
  // Normalize content type
  let normalizedType = contentType;
  if (contentType === 'videos') normalizedType = 'video';
  if (contentType === 'images') normalizedType = 'image';
  
  // Display proper content type in the SVG
  const displayType = normalizedType.charAt(0).toUpperCase() + normalizedType.slice(1);
  
  // For videos, let's create a more video-like thumbnail with a play button
  if (normalizedType === 'video') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="${width}" height="${height}" fill="${bgColor}"/>
      
      <!-- Grid pattern to make it look more like a video -->
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <rect width="40" height="40" fill="${accentColor}" fill-opacity="0.1"/>
      </pattern>
      <rect width="${width}" height="${height}" fill="url(#grid)"/>
      
      <!-- Play button -->
      <circle cx="${width/2}" cy="${height/2}" r="50" fill="${accentColor}" fill-opacity="0.6"/>
      <path d="M${width/2 - 20},${height/2 - 25} L${width/2 + 30},${height/2} L${width/2 - 20},${height/2 + 25} Z" fill="${textColor}"/>
      
      <!-- Text label at bottom -->
      <rect x="0" y="${height - 40}" width="${width}" height="40" fill="${bgColor}" fill-opacity="0.8"/>
      <text x="${width/2}" y="${height - 15}" font-family="Arial" font-size="18" fill="${textColor}" text-anchor="middle">
        AI Generated ${displayType}
      </text>
    </svg>`;
  }
  
  // For other content types (images, embeds)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" fill="${bgColor}"/>
    
    <!-- Simple grid pattern -->
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <rect width="40" height="40" fill="${accentColor}" fill-opacity="0.1"/>
    </pattern>
    <rect width="${width}" height="${height}" fill="url(#grid)"/>
    
    <!-- Image icon for images -->
    ${normalizedType === 'image' ? 
      `<rect x="${width/2 - 40}" y="${height/2 - 40}" width="80" height="80" fill="${accentColor}" fill-opacity="0.6" rx="5" ry="5"/>
       <rect x="${width/2 - 30}" y="${height/2 - 30}" width="60" height="45" fill="${textColor}" rx="3" ry="3"/>
       <circle cx="${width/2 - 10}" cy="${height/2 - 15}" r="8" fill="${bgColor}"/>` : 
      ''
    }
    
    <!-- Text label at bottom -->
    <rect x="0" y="${height - 40}" width="${width}" height="40" fill="${bgColor}" fill-opacity="0.8"/>
    <text x="${width/2}" y="${height - 15}" font-family="Arial" font-size="18" fill="${textColor}" text-anchor="middle">
      AI Generated ${displayType}
    </text>
  </svg>`;
}

/**
 * Extract YouTube video ID from URL or embed code
 * @param source YouTube URL or embed code
 * @returns YouTube video ID or null if not found
 */
function extractYoutubeVideoId(source: string | null): string | null {
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
function getYoutubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

// Export functions as a default object
export default {
  generateThumbnail,
  generateFromUrl,
  generateFromBase64,
  generatePlaceholder,
  extractYoutubeVideoId,
  getYoutubeThumbnailUrl
};
