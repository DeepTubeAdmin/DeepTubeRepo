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
    // Extract credentials from environment variables
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    
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
    // Ensure Cloudinary is configured
    configureCloudinary();
    
    // Prepare upload options
    const uploadOptions: UploadApiOptions = {
      resource_type: options.resourceType || 'auto',
      public_id: options.publicId || undefined,
      format: options.format || undefined,
      transformation: options.transformation || undefined,
      eager_async: false // Wait for transformations to complete
    };
    
    console.log(`Uploading to Cloudinary: ${source.substring(0, 100)}...`);
    const result = await cloudinary.uploader.upload(source, uploadOptions);
    console.log(`Cloudinary upload successful: ${result.secure_url}`);
    
    return result;
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
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
