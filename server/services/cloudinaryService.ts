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
  const config = cloudinary.config();
  
  if (!config.cloud_name || !config.api_key || !config.api_secret) {
    console.error('Cloudinary credentials not properly configured');
    console.log('Current Cloudinary config:');
    console.log(` - cloud_name: ${config.cloud_name ? config.cloud_name : 'Missing'}`);
    console.log(` - api_key: ${config.api_key ? `Present (${config.api_key.length} chars)` : 'Missing'}`);
    console.log(` - api_secret: ${config.api_secret ? `Present (${config.api_secret.length} chars)` : 'Missing'}`);
    
    // This is important: don't throw an error, just warn
    // The application will continue to work with placeholders
    console.warn('Cloudinary operations will be limited');
    return false;
  }
  
  return true;
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
  try {
    // Get the current configuration
    const config = cloudinary.config();
    console.log(`Uploading test image with cloud_name: ${config.cloud_name}`);
    
    // Create an even simpler test SVG
    const testSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
      <rect width="100" height="100" fill="#ff9000"/>
    </svg>`;
    
    // Upload as a Base64 data URL
    const dataUrl = `data:image/svg+xml;base64,${Buffer.from(testSvg).toString('base64')}`;
    
    // Simplify the upload options
    console.log('Uploading test SVG to Cloudinary...');
    try {
      const result = await cloudinary.uploader.upload(dataUrl, {
        public_id: 'test-basic', 
        overwrite: true,
        resource_type: 'image'
      });
      
      console.log('Test image uploaded successfully:', result.secure_url);
      return { 
        success: true, 
        imageUrl: result.secure_url,
        cloudName: config.cloud_name,
        uploadResult: result
      };
    } catch (uploadError: any) {
      // Try alternative approach
      if (uploadError.http_code === 404) {
        console.log('Upload failed with 404, trying fetch test instead...');
        // Try to fetch a public resource instead
        const testUrl = `https://res.cloudinary.com/${config.cloud_name}/image/upload/sample`;
        const response = await fetch(testUrl);
        
        return {
          success: response.ok,
          status: response.status,
          message: `Fetch test to ${testUrl} ${response.ok ? 'succeeded' : 'failed'}`,
          cloudName: config.cloud_name,
          error: uploadError.message
        };
      }
      
      throw uploadError;
    }
  } catch (error: any) {
    console.error('Cloudinary test failed:', error);
    return { 
      success: false, 
      error: error.message,
      cloudName: cloudinary.config().cloud_name,
      details: error.http_code ? `HTTP Code: ${error.http_code}` : 'Unknown error'
    };
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
  // Check Cloudinary config and continue even if not configured
  const cloudinaryConfigured = ensureCloudinaryConfig();
  const s3Key = `thumbnails/content-${contentId}.jpg`;
  
  try {
    // For YouTube videos, use the YouTube thumbnail directly
    // This doesn't need Cloudinary so it should always work
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
    
    // For direct source URLs, try to use Cloudinary if configured
    if (sourceUrl) {
      if (!cloudinaryConfigured) {
        console.warn(`Cloudinary not configured, fetching source URL directly without processing for content ${contentId}`);
        
        // Without Cloudinary, try to fetch and use the original image directly
        try {
          const response = await fetch(sourceUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch source URL: ${response.status}`);
          }
          
          const buffer = await response.arrayBuffer();
          await uploadStringToS3(
            Buffer.from(buffer),
            s3Key,
            contentType === 'image' || contentType === 'images' ? 'image/jpeg' : 'video/mp4'
          );
          
          console.log(`Successfully uploaded original content to S3 for content ${contentId}`);
          return s3Key;
        } catch (error) {
          console.error(`Error uploading original content to S3: ${error}`);
          throw error;
        }
      }
      
      // If Cloudinary is configured, proceed with it
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
        // Check if sourceUrl is a relative URL or an API endpoint and convert to absolute URL
        let fullSourceUrl = sourceUrl;
        if (sourceUrl.startsWith('/api/')) {
          console.log('Converting relative API path to full URL...');
          
          // Since this is an internal API route, we need to use a different approach
          console.log('Using alternative approach for API paths - using a placeholder SVG');
          
          // Generate a simple placeholder SVG
          const placeholderSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180">
            <rect width="320" height="180" fill="#ff9000"/>
            <text x="160" y="90" font-family="Arial" font-size="24" text-anchor="middle" fill="white">
              ${contentType.toUpperCase()} ${contentId}
            </text>
          </svg>`;
          
          // Upload as a Base64 data URL
          const dataUrl = `data:image/svg+xml;base64,${Buffer.from(placeholderSvg).toString('base64')}`;
          console.log('Uploading placeholder SVG to Cloudinary...');
          
          // Simplified options for SVG placeholder
          const result = await cloudinary.uploader.upload(dataUrl, {
            public_id: `content-${contentId}-placeholder`,
            overwrite: true,
            resource_type: 'image',
            format: 'png'
          });
          
          console.log('Placeholder uploaded successfully, result:', result.secure_url);
          
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
          
          console.log(`Successfully uploaded placeholder thumbnail to S3 for content ${contentId}`);
          return s3Key;
        } else if (sourceUrl.startsWith('http')) {
          // Already a full URL, use as is
          fullSourceUrl = sourceUrl;
        } else {
          console.error(`Unsupported source URL format: ${sourceUrl}`);
          throw new Error(`Unsupported source URL format: ${sourceUrl}`);
        }
        
        console.log(`Using source URL: ${fullSourceUrl}`);
        console.log('Uploading to Cloudinary...');
        
        const result = await cloudinary.uploader.upload(fullSourceUrl, options);
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
        
        // Create a detailed error message that includes the error object properties
        let errorMessage = 'Unknown error';
        if (error instanceof Error) {
          errorMessage = error.message;
          
          // Include more details if available
          const anyError = error as any;
          if (anyError.code) {
            errorMessage += ` (Code: ${anyError.code})`;
          }
          if (anyError.errno) {
            errorMessage += ` (Errno: ${anyError.errno})`;
          }
        }
        
        throw new Error(`Cloudinary thumbnail generation failed: ${errorMessage}`);
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
