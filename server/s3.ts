import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ObjectCannedACL } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import path from 'path';
import { log } from './vite';

if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_REGION || !process.env.AWS_BUCKET_NAME) {
  throw new Error('AWS credentials not found in environment variables');
}

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.AWS_BUCKET_NAME;

/**
 * Upload a file to S3
 * @param filePath Local file path
 * @param s3Key Key for the file in S3
 * @returns The S3 URL for the uploaded file
 */
export async function uploadFileToS3(filePath: string, s3Key: string): Promise<string> {
  try {
    const fileContent = fs.readFileSync(filePath);
    
    const params = {
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: fileContent,
      ContentType: getContentType(s3Key),
      ACL: 'public-read' as ObjectCannedACL, // Make the file publicly readable
    };
    
    await s3Client.send(new PutObjectCommand(params));
    
    log(`Successfully uploaded file to S3: ${s3Key}`, 's3');
    
    return s3Key;
  } catch (error) {
    log(`Error uploading file to S3: ${error}`, 's3');
    throw error;
  }
}

/**
 * Upload a string directly to S3
 * @param content String content to upload
 * @param s3Key Key for the file in S3
 * @param contentType Content type (e.g., 'image/svg+xml')
 * @returns The S3 URL for the uploaded file
 */
export async function uploadStringToS3(content: string, s3Key: string, contentType: string): Promise<string> {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: content,
      ContentType: contentType,
      ACL: 'public-read' as ObjectCannedACL, // Make the file publicly readable
    };
    
    await s3Client.send(new PutObjectCommand(params));
    
    log(`Successfully uploaded string to S3: ${s3Key}`, 's3');
    
    return s3Key;
  } catch (error) {
    log(`Error uploading string to S3: ${error}`, 's3');
    throw error;
  }
}

/**
 * Generate a pre-signed URL for an S3 object
 * @param s3Key Key for the file in S3
 * @param expiresIn Expiration time in seconds (default 3600 = 1 hour)
 * @returns Pre-signed URL for the S3 object
 */
export async function getSignedS3Url(s3Key: string, expiresIn: number = 3600): Promise<string> {
  try {
    log(`Generating signed URL for S3 key: ${s3Key} with ${expiresIn}s expiry`, 's3');
    
    // Try to use a direct public URL first (this is faster and more reliable)
    // Format: https://BUCKET_NAME.s3.REGION.amazonaws.com/KEY
    const publicUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
    
    // Log the public URL attempt
    log(`Attempting to use public URL: ${publicUrl}`, 's3');
    
    // Note: We'll continue to also generate a signed URL as a fallback
    const params = {
      Bucket: BUCKET_NAME,
      Key: s3Key,
    };
    
    log(`S3 parameters: Bucket=${BUCKET_NAME}, Key=${s3Key}, expiresIn=${expiresIn}`, 's3');
    
    const command = new GetObjectCommand(params);
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    
    log(`Generated signed URL for ${s3Key} (length: ${signedUrl.length})`, 's3');
    log(`URL starts with: ${signedUrl.substring(0, 50)}...`, 's3');
    
    // Return both URLs for flexible usage on the server side
    return {
      publicUrl,
      signedUrl
    }[process.env.USE_SIGNED_URLS ? 'signedUrl' : 'publicUrl'];
  } catch (error) {
    log(`Error generating pre-signed URL for key ${s3Key}: ${error}`, 's3');
    console.error('S3 URL generation error:', error);
    
    // Attempt to provide more detailed error information
    if (error instanceof Error) {
      log(`Error name: ${error.name}, message: ${error.message}`, 's3');
      console.error(`S3 error details - Name: ${error.name}, Message: ${error.message}`);
      
      if ('$metadata' in error) {
        // @ts-ignore - AWS SDK error type
        const metadata = error.$metadata;
        log(`Error metadata: ${JSON.stringify(metadata)}`, 's3');
        console.error('S3 error metadata:', metadata);
      }
    }
    
    throw error;
  }
}

/**
 * Delete a file from S3
 * @param s3Key Key for the file in S3
 */
export async function deleteFileFromS3(s3Key: string): Promise<void> {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: s3Key,
    };
    
    await s3Client.send(new DeleteObjectCommand(params));
    
    log(`Successfully deleted file from S3: ${s3Key}`, 's3');
  } catch (error) {
    log(`Error deleting file from S3: ${error}`, 's3');
    throw error;
  }
}

/**
 * Determine the content type based on file extension
 * @param filename File name or path
 * @returns Content type string
 */
function getContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.gif':
      return 'image/gif';
    case '.mp4':
      return 'video/mp4';
    case '.webm':
      return 'video/webm';
    case '.mp3':
      return 'audio/mpeg';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Get S3 resource path for building URLs
 * @param s3Key Key for the file in S3
 * @returns URL path for access to the S3 object
 */
export function getS3ResourcePath(s3Key: string): string {
  return `/api/s3/${s3Key}`;
}

/**
 * Convert a local storage path to S3 key
 * @param localPath Local file path
 * @returns S3 key
 */
export function localPathToS3Key(localPath: string): string {
  // Remove leading slash if present
  if (localPath.startsWith('/')) {
    localPath = localPath.substring(1);
  }
  
  // Remove '/uploads/' prefix if present
  if (localPath.startsWith('uploads/')) {
    localPath = localPath.substring(8);
  }
  
  return localPath;
}

/**
 * Convert a URL path to S3 key
 * @param urlPath URL path
 * @returns S3 key
 */
export function urlPathToS3Key(urlPath: string): string {
  // Handle paths like /api/videos/1/thumbnail or /uploads/images/file.jpg
  const thumbnailMatch = urlPath.match(/\/api\/videos\/(\d+)\/thumbnail/);
  
  if (thumbnailMatch) {
    return `thumbnails/video-${thumbnailMatch[1]}.jpg`;
  }
  
  if (urlPath.startsWith('/uploads/')) {
    return urlPath.substring(9); // Remove '/uploads/' prefix
  }
  
  return urlPath;
}
