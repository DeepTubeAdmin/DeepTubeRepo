/**
 * Cloudinary Service
 * 
 * This service handles all interactions with Cloudinary's API,
 * including thumbnail generation, image uploads, and configuration.
 */

import { v2 as cloudinary } from 'cloudinary';
import { localPathToS3Key, uploadStringToS3 } from '../s3';

/**
 * Ensure Cloudinary is configured before any operations
 */
function ensureCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  
  if (!cloudName || !apiKey || !apiSecret) {
    console.error('Cloudinary credentials not properly configured');
    console.log('Available environment variables:');
    console.log(` - CLOUDINARY_CLOUD_NAME: ${cloudName ? 'Present' : 'Missing'}`);
    console.log(` - CLOUDINARY_API_KEY: ${apiKey ? 'Present' : 'Missing'}`);
    console.log(` - CLOUDINARY_API_SECRET: ${apiSecret ? 'Present' : 'Missing'}`);
    throw new Error('Cloudinary credentials not properly configured');
  }

  // Configure Cloudinary
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true
  });
}

/**
 * Test if Cloudinary connection is working
 */
async function testConnection() {
  try {
    ensureCloudinaryConfig();
    
    // Get current config for diagnostics
    const config = cloudinary.config();
    console.log('Testing Cloudinary configuration');
    console.log(`Cloud name: ${config.cloud_name}`);
    console.log(`API key length: ${config.api_key?.length ?? 0} chars`);
    console.log(`API secret length: ${config.api_secret?.length ?? 0} chars`);
    
    if (!config.cloud_name) {
      throw new Error('Missing cloud_name in Cloudinary configuration');
    }
    
    // Try to generate a URL to verify configuration
    const baseTestUrl = cloudinary.url('sample', {
      width: 300,
      height: 200,
      crop: 'fill'
    });
    
    console.log(`Generated test URL: ${baseTestUrl}`);
    
    // Try to ping Cloudinary API
    try {
      console.log('Testing Cloudinary API connection...');
      const pingResults = await cloudinary.api.ping();
      console.log('Cloudinary ping successful:', pingResults);
      
      return {
        success: true,
        results: pingResults,
        cloudName: config.cloud_name,
        apiKeyProvided: !!config.api_key,
        apiSecretProvided: !!config.api_secret,
        testUrl: baseTestUrl
      };
    } catch (error: any) {
      console.error('Cloudinary API test failed:', error);
      
      // Even if API test fails, try a simple HTTP request to check connectivity
      try {
        const response = await fetch(`https://res.cloudinary.com/${config.cloud_name}/image/upload/sample`);
        const status = response.status;
        
        return {
          success: false,
          error: error.message || 'Unknown API error',
          httpStatus: status,
          cloudName: config.cloud_name,
          apiKeyProvided: !!config.api_key,
          apiSecretProvided: !!config.api_secret,
          testUrl: baseTestUrl
        };
      } catch (fetchError: any) {
        return {
          success: false,
          error: `API Error: ${error.message || 'Unknown'}, Network Error: ${fetchError.message || 'Unknown'}`,
          cloudName: config.cloud_name,
          apiKeyProvided: !!config.api_key,
          apiSecretProvided: !!config.api_secret,
          testUrl: baseTestUrl
        };
      }
    }
  } catch (error: any) {
    console.error('Cloudinary connection test failed:', error);
    return { 
      success: false, 
      error: error.message,
      cloudName: cloudinary.config().cloud_name,
      apiKeyProvided: !!cloudinary.config().api_key,
      apiSecretProvided: !!cloudinary.config().api_secret,
      testUrl: null
    };
  }
}

/**
 * Upload a test image to Cloudinary
 */
async function uploadTestImage() {
  ensureCloudinaryConfig();
  try {
    // Simple test SVG
    const testSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200">
      <rect width="300" height="200" fill="#ff9000"/>
      <text x="150" y="100" font-family="Arial" font-size="24" text-anchor="middle" fill="white">
        Cloudinary Test
      </text>
    </svg>`;
    
    // Upload as a Base64 data URL
    const dataUrl = `data:image/svg+xml;base64,${Buffer.from(testSvg).toString('base64')}`;
    
    console.log('Uploading test image to Cloudinary...');
    const result = await cloudinary.uploader.upload(dataUrl, {
      public_id: 'deeptube-test',
      overwrite: true,
      resource_type: 'image'
    });
    
    console.log('Test image uploaded successfully:', result.secure_url);
    return { success: true, imageUrl: result.secure_url, result };
  } catch (error: any) {
    console.error('Cloudinary test upload failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Extract YouTube video ID from embed code
 */
function extractYoutubeVideoId(embedCode: string): string | null {
  const patterns = [
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/, 
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/
  ];
  
  for (const pattern of patterns) {
    const match = embedCode.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Get YouTube thumbnail URL from video ID
 */
function getYoutubeThumbnailUrl(youtubeId: string, quality: 'default' | 'hqdefault' | 'mqdefault' | 'sddefault' | 'maxresdefault' = 'hqdefault'): string {
  return `https://img.youtube.com/vi/${youtubeId}/${quality}.jpg`;
}

/**
 * Generate a base64 SVG placeholder
 */
function generateFromBase64(svgContent: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`;
}

/**
 * Generate thumbnail for a video or image
 */
async function generateThumbnail(
  contentId: number, 
  sourceUrl: string | null, 
  contentType: string,
  youtubeId: string | null = null
): Promise<string> {
  ensureCloudinaryConfig();
  const s3Key = `thumbnails/content-${contentId}.jpg`;
  
  try {
    // For YouTube videos, use the YouTube thumbnail directly
    if (youtubeId) {
      console.log(`Using YouTube thumbnail for content ${contentId} with YouTube ID ${youtubeId}`);
      const youtubeThumbnailUrl = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
      
      // Upload the YouTube thumbnail to S3
      try {
        const response = await fetch(youtubeThumbnailUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch YouTube thumbnail: ${response.status}`);
        }
        
        const buffer = await response.arrayBuffer();
        await uploadStringToS3(
          Buffer.from(buffer),
          s3Key,
          'image/jpeg'
        );
        
        console.log(`Successfully uploaded YouTube thumbnail to S3 for content ${contentId}`);
        return s3Key;
      } catch (error) {
        console.error(`Error uploading YouTube thumbnail to S3: ${error}`);
        throw error;
      }
    }
    
    // For direct source URLs, use Cloudinary to generate thumbnail
    if (sourceUrl) {
      console.log(`Generating thumbnail via Cloudinary for content ${contentId}, type: ${contentType}`);
      console.log(`Source URL: ${sourceUrl}`);
      
      let options: any = {};
      
      if (contentType === 'video' || contentType === 'videos') {
        options = {
          resource_type: 'video',
          format: 'jpg',
          transformation: [
            { width: 320, height: 180, crop: 'fill' },
            { quality: 'auto:good' }
          ],
          eager: [{ width: 320, height: 180, crop: 'fill', quality: 'auto:good' }]
        };
      } else if (contentType === 'image' || contentType === 'images') {
        options = {
          resource_type: 'image',
          format: 'jpg',
          transformation: [
            { width: 320, height: 180, crop: 'fill' },
            { quality: 'auto:good' }
          ]
        };
      } else {
        console.log(`Unknown content type: ${contentType}, using default options`);
        options = {
          resource_type: 'auto',
          format: 'jpg',
          transformation: [{ width: 320, height: 180, crop: 'fill' }]
        };
      }
      
      // Process with Cloudinary
      try {
        console.log('Uploading to Cloudinary...');
        const result = await cloudinary.uploader.upload(sourceUrl, options);
        console.log('Cloudinary upload successful, result:', result.secure_url);
        
        // Download the thumbnail from Cloudinary and upload to S3
        const response = await fetch(result.secure_url);
        if (!response.ok) {
          throw new Error(`Failed to fetch Cloudinary thumbnail: ${response.status}`);
        }
        
        const buffer = await response.arrayBuffer();
        await uploadStringToS3(
          Buffer.from(buffer),
          s3Key,
          'image/jpeg'
        );
        
        console.log(`Successfully uploaded Cloudinary thumbnail to S3 for content ${contentId}`);
        return s3Key;
      } catch (error) {
        console.error('Cloudinary processing failed:', error);
        throw new Error(`Cloudinary thumbnail generation failed: ${error}`);
      }
    }
    
    // No suitable source, throw error
    console.error(`No suitable source for thumbnail generation: contentId=${contentId}, contentType=${contentType}`);
    throw new Error('No suitable source for thumbnail generation');
  } catch (error) {
    console.error('Thumbnail error:', error);
    throw error;
  }
}

// Export the service functionality
export default {
  ensureCloudinaryConfig,
  testConnection,
  uploadTestImage,
  extractYoutubeVideoId,
  getYoutubeThumbnailUrl,
  generateFromBase64,
  generateThumbnail
};
