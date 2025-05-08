/**
 * Cloudinary integration module for ThumbnailService
 */

import { v2 as cloudinary, UploadApiOptions, UploadApiResponse } from 'cloudinary';
import { CloudinaryOptions } from './types';

/**
 * Initialize and configure Cloudinary
 * @returns true if configured successfully, false otherwise
 */
export function configureCloudinary(): boolean {
  try {
    let cloudName = '';
    let apiKey = '';
    let apiSecret = '';
    
    // First try to use CLOUDINARY_URL if available (preferred method)
    if (process.env.CLOUDINARY_URL) {
      try {
        // Parse the cloudinary:// URL format
        // Format: cloudinary://<api_key>:<api_secret>@<cloud_name>
        const cloudinaryUrl = process.env.CLOUDINARY_URL;
        const cloudinaryRegex = /^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/;
        const match = cloudinaryUrl.match(cloudinaryRegex);
        
        if (match) {
          apiKey = match[1];
          apiSecret = match[2];
          cloudName = match[3];
          console.log(`Cloudinary service: Using credentials from CLOUDINARY_URL with cloud_name: ${cloudName}`);
        } else {
          console.warn("Cloudinary service: CLOUDINARY_URL format is invalid, falling back to individual credentials");
        }
      } catch (error) {
        console.error("Cloudinary service: Error parsing CLOUDINARY_URL:", error);
      }
    }
    
    // Fall back to individual environment variables if CLOUDINARY_URL parsing failed
    if (!cloudName || !apiKey || !apiSecret) {
      cloudName = process.env.CLOUDINARY_CLOUD_NAME || '';
      apiKey = process.env.CLOUDINARY_API_KEY || '';
      apiSecret = process.env.CLOUDINARY_API_SECRET || '';
      console.log("Cloudinary service: Using individual credential environment variables");
    }
    
    // Configure Cloudinary
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true
    });
    
    // Log configuration status (without exposing credentials)
    console.log('Cloudinary configuration updated:');
    console.log(`- Cloud name: ${cloudName ? 'Present' : 'Missing'}`);
    console.log(`- API key: ${apiKey ? 'Present' : 'Missing'}`);
    console.log(`- API secret: ${apiSecret ? 'Present' : 'Missing'}`);
    
    // Verify configuration
    return !!(cloudName && apiKey && apiSecret);
  } catch (error) {
    console.error('Error configuring Cloudinary:', error);
    return false;
  }
}

/**
 * Upload content to Cloudinary
 * @param source URL or file path of the content to upload
 * @param options Cloudinary upload options
 * @returns Cloudinary upload response
 */
export async function uploadToCloudinary(
  source: string,
  options: CloudinaryOptions = {}
): Promise<UploadApiResponse> {
  try {
    console.log(`Cloudinary: Starting upload process`);
    console.log(`Cloudinary: Source URL starts with: ${source.substring(0, 50)}...`);
    console.log(`Cloudinary: Options: ${JSON.stringify(options)}`);
    
    // Ensure Cloudinary is configured
    const configResult = configureCloudinary();
    console.log(`Cloudinary: Configuration check result: ${configResult ? 'Success' : 'Failure'}`);
    
    if (!configResult) {
      console.error('Cloudinary: Configuration failed, credentials may be missing or invalid');
      throw new Error('Cloudinary configuration failed - check environment variables');
    }
    
    // Output current Cloudinary config (without sensitive data)
    const config = cloudinary.config();
    console.log(`Cloudinary: Using cloud_name: ${config.cloud_name}`);
    console.log(`Cloudinary: API key status: ${config.api_key ? 'Present' : 'Missing'}`);
    console.log(`Cloudinary: API secret status: ${config.api_secret ? 'Present' : 'Missing'}`);
    
    // Prepare upload options
    const uploadOptions: UploadApiOptions = {
      resource_type: options.resourceType || 'auto',
      public_id: options.publicId || undefined,
      format: options.format || undefined,
      transformation: options.transformation || undefined,
      eager_async: false, // Wait for transformations to complete
      timeout: 60000 // 60-second timeout for uploads
    };
    
    console.log(`Cloudinary: Prepared upload options:
      resource_type: ${uploadOptions.resource_type}
      public_id: ${uploadOptions.public_id}
      format: ${uploadOptions.format}
      transformations: ${uploadOptions.transformation ? JSON.stringify(uploadOptions.transformation) : 'none'}
    `);
    
    console.log(`Cloudinary: Starting upload with source URL: ${source.substring(0, 100)}...`);
    const startTime = Date.now();
    const result = await cloudinary.uploader.upload(source, uploadOptions);
    const endTime = Date.now();
    
    console.log(`Cloudinary: Upload successful in ${endTime - startTime}ms`);
    console.log(`Cloudinary: Result URL: ${result.secure_url}`);
    console.log(`Cloudinary: Public ID: ${result.public_id}`);
    console.log(`Cloudinary: Resource type: ${result.resource_type}`);
    console.log(`Cloudinary: Format: ${result.format}`);
    
    // Check for eager transformations
    if (result.eager && result.eager.length > 0) {
      console.log(`Cloudinary: Eager transformations available: ${result.eager.length}`);
      result.eager.forEach((t, i) => {
        console.log(`Cloudinary: Eager transformation #${i+1}: ${t.secure_url}`);
      });
    }
    
    return result;
  } catch (error) {
    console.error('Cloudinary: ERROR during upload:', error);
    console.error(`Cloudinary: Error message: ${error.message}`);
    console.error(`Cloudinary: Error stack: ${error.stack}`);
    
    // Attempt to determine the nature of the error
    if (error.message && error.message.includes('timeout')) {
      console.error('Cloudinary: Upload timed out - source URL may be too large or inaccessible');
    } else if (error.message && error.message.includes('Invalid credentials')) {
      console.error('Cloudinary: Invalid credentials - check API key and secret');
    } else if (error.message && error.message.includes('not found')) {
      console.error('Cloudinary: Source not found - URL may be invalid or inaccessible');
    }
    
    throw error;
  }
}

/**
 * Get YouTube thumbnail URL
 * @param youtubeId YouTube video ID
 * @param quality Thumbnail quality ('maxresdefault', 'hqdefault', 'mqdefault', 'default')
 * @returns YouTube thumbnail URL
 */
export function getYouTubeThumbnailUrl(youtubeId: string | null, quality: string = 'maxresdefault'): string | null {
  if (!youtubeId) return null;
  return `https://img.youtube.com/vi/${youtubeId}/${quality}.jpg`;
}

/**
 * Extract YouTube video ID from a URL
 * @param url YouTube URL
 * @returns YouTube video ID or null if not found
 */
export function extractYouTubeVideoId(url: string | null): string | null {
  if (!url) return null;
  
  // Match various YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/vi\/|img\.youtube\.com\/vi\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Check Cloudinary connection by pinging the API
 * @returns Connection test result
 */
export async function testCloudinaryConnection(): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  try {
    // Configure Cloudinary
    const isConfigured = configureCloudinary();
    if (!isConfigured) {
      return {
        success: false,
        message: 'Cloudinary configuration incomplete'
      };
    }
    
    // Try to ping Cloudinary API
    const pingResult = await cloudinary.api.ping();
    
    return {
      success: true,
      message: 'Cloudinary connection successful',
      details: pingResult
    };
  } catch (error) {
    return {
      success: false,
      message: `Cloudinary connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: error
    };
  }
}
