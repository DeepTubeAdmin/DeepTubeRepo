/**
 * Unified S3 storage module for the ThumbnailService
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StorageOptions } from './types';

// Initialize the S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

// S3 bucket name from environment
const bucketName = process.env.AWS_BUCKET_NAME || 'deeptubebucket';

/**
 * Upload content to S3
 * @param content Content to upload (string or Buffer)
 * @param s3Key S3 key to store the content under
 * @param options Storage options
 * @returns The S3 URL for the uploaded content
 */
export async function uploadToS3(
  content: string | Buffer,
  s3Key: string,
  options: StorageOptions = {}
): Promise<string> {
  try {
    // Convert string to Buffer if needed
    const contentBuffer = typeof content === 'string' 
      ? (options.encoding === 'base64' 
        ? Buffer.from(content, 'base64') 
        : Buffer.from(content))
      : content;

    // Determine content type based on file extension if not provided
    const contentType = options.contentType || getContentTypeFromKey(s3Key);
    
    // Create the S3 put command
    const params = {
      Bucket: bucketName,
      Key: s3Key,
      Body: contentBuffer,
      ContentType: contentType,
      CacheControl: options.cacheControl || 'max-age=31536000' // Default 1 year cache
    };

    // Upload to S3
    console.log(`Uploading ${s3Key} to S3 bucket ${bucketName}`);
    await s3Client.send(new PutObjectCommand(params));
    
    // Return the S3 URL
    return getS3ResourcePath(s3Key);
  } catch (error) {
    console.error(`Error uploading to S3: ${s3Key}`, error);
    throw error;
  }
}

/**
 * Delete content from S3
 * @param s3Key S3 key to delete
 */
export async function deleteFromS3(s3Key: string): Promise<void> {
  try {
    const params = {
      Bucket: bucketName,
      Key: s3Key
    };

    console.log(`Deleting ${s3Key} from S3 bucket ${bucketName}`);
    await s3Client.send(new DeleteObjectCommand(params));
  } catch (error) {
    console.error(`Error deleting from S3: ${s3Key}`, error);
    throw error;
  }
}

/**
 * Get a signed URL for an S3 object
 * @param s3Key S3 key of the object
 * @param expiresIn Expiry time in seconds (default: 24 hours)
 * @returns A pre-signed URL for the S3 object
 */
export async function getSignedS3Url(s3Key: string, expiresIn: number = 86400): Promise<string> {
  try {
    const params = {
      Bucket: bucketName,
      Key: s3Key
    };

    // Generate pre-signed URL
    const command = new GetObjectCommand(params);
    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error) {
    console.error(`Error generating signed URL for ${s3Key}`, error);
    throw error;
  }
}

/**
 * Get the full S3 resource path for a given key
 * @param s3Key S3 key
 * @returns Full S3 resource URL
 */
export function getS3ResourcePath(s3Key: string): string {
  return `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-2'}.amazonaws.com/${s3Key}`;
}

/**
 * Standardize S3 key generation for thumbnails
 * @param contentId Content ID
 * @param contentType Content type ('video', 'image', 'embed', etc.)
 * @param extension File extension (default: 'jpg')
 * @returns Standardized S3 key
 */
export function getThumbnailS3Key(contentId: number, contentType: string, extension: string = 'jpg'): string {
  return `thumbnails/${contentType}-${contentId}.${extension}`;
}

/**
 * Check if an object exists in S3
 * @param s3Key S3 key to check
 * @returns Promise that resolves if the object exists, rejects otherwise
 */
export async function checkIfObjectExists(s3Key: string): Promise<boolean> {
  try {
    const params = {
      Bucket: bucketName,
      Key: s3Key
    };

    // Attempt to get the object metadata
    await s3Client.send(new GetObjectCommand(params));
    return true;
  } catch (error) {
    console.log(`Object does not exist in S3: ${s3Key}`);
    return false;
  }
}

/**
 * Extract content type from file extension
 * @param s3Key S3 key or filename
 * @returns Content type string
 */
export function getContentTypeFromKey(s3Key: string): string {
  const extension = s3Key.split('.').pop()?.toLowerCase() || '';
  const mimeTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo'
  };

  return mimeTypes[extension] || 'application/octet-stream';
}
