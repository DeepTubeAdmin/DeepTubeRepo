/**
 * S3 Service - Handles all AWS S3 operations
 * 
 * This service centralizes AWS S3 operations for uploads, signed URLs,
 * and organized bucket folder structure
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

// Define S3 bucket structure for better organization
const BUCKET_FOLDERS = {
  VIDEOS: 'videos/',
  IMAGES: 'images/',
  THUMBNAILS: 'thumbnails/',
  PREVIEWS: 'previews/'
};

// S3 client configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

const BUCKET_NAME = process.env.AWS_BUCKET_NAME || 'deeptubebucket';

/**
 * Uploads a buffer to S3
 * @param buffer Data buffer to upload
 * @param key S3 key (path within bucket)
 * @param contentType Content type of the file
 * @returns Full S3 URL of the uploaded resource
 */
export async function uploadToS3(buffer: Buffer, key: string, contentType: string): Promise<string> {
  try {
    console.log(`Uploading to S3: ${key} (${contentType})`); 
    
    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType
    };
    
    await s3Client.send(new PutObjectCommand(params));
    
    // Return the public URL
    return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-2'}.amazonaws.com/${key}`;
  } catch (error) {
    console.error('S3 upload error:', error);
    throw new Error(`Failed to upload file to S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generates a pre-signed URL for temporary access to S3 objects
 * @param key S3 key (path within bucket)
 * @param expiresIn Expiration time in seconds (default 1 hour)
 * @returns Pre-signed URL
 */
export async function getSignedS3Url(key: string, expiresIn: number = 3600): Promise<string> {
  try {
    console.log(`Generating signed URL for S3 key: ${key} with ${expiresIn}s expiry`);
    
    const params = {
      Bucket: BUCKET_NAME,
      Key: key
    };
    
    console.log(`S3 parameters: Bucket=${BUCKET_NAME}, Key=${key}, expiresIn=${expiresIn}`);
    const command = new GetObjectCommand(params);
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    
    console.log(`Generated signed URL for ${key} (length: ${signedUrl.length})`);
    console.log(`URL starts with: ${signedUrl.substring(0, 50)}...`);
    
    return signedUrl;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw new Error(`Failed to generate signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Downloads a file from S3
 * @param key S3 key (path within bucket) 
 * @returns Buffer containing file data
 */
export async function downloadFromS3(key: string): Promise<Buffer> {
  try {
    console.log(`Downloading from S3: ${key}`);
    
    const params = {
      Bucket: BUCKET_NAME,
      Key: key
    };
    
    const response = await s3Client.send(new GetObjectCommand(params));
    
    // Convert stream to buffer
    if (response.Body instanceof Readable) {
      const chunks: Buffer[] = [];
      for await (const chunk of response.Body) {
        chunks.push(Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    } else {
      throw new Error('Response body is not a readable stream');
    }
  } catch (error) {
    console.error('S3 download error:', error);
    throw new Error(`Failed to download file from S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Deletes a file from S3
 * @param key S3 key (path within bucket)
 */
export async function deleteFromS3(key: string): Promise<void> {
  try {
    console.log(`Deleting from S3: ${key}`);
    
    const params = {
      Bucket: BUCKET_NAME,
      Key: key
    };
    
    await s3Client.send(new DeleteObjectCommand(params));
    console.log(`Successfully deleted S3 object: ${key}`);
  } catch (error) {
    console.error('S3 deletion error:', error);
    throw new Error(`Failed to delete file from S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Creates an S3 key for videos
 * @param contentId Database ID of the content
 * @param fileName Original filename
 * @returns Full S3 key including path
 */
export function getVideoS3Key(contentId: number, fileName: string): string {
  const extension = fileName.split('.').pop() || 'mp4';
  return `${BUCKET_FOLDERS.VIDEOS}video-${contentId}.${extension}`;
}

/**
 * Creates an S3 key for images
 * @param contentId Database ID of the content
 * @param fileName Original filename  
 * @returns Full S3 key including path
 */
export function getImageS3Key(contentId: number, fileName: string): string {
  const extension = fileName.split('.').pop() || 'jpg';
  return `${BUCKET_FOLDERS.IMAGES}image-${contentId}.${extension}`;
}

/**
 * Creates an S3 key for thumbnails
 * @param contentId Database ID of the content
 * @returns Full S3 key including path
 */
export function getThumbnailS3Key(contentId: number): string {
  return `${BUCKET_FOLDERS.THUMBNAILS}thumbnail-${contentId}.jpg`;
}

/**
 * Creates an S3 key for preview videos
 * @param contentId Database ID of the content
 * @returns Full S3 key including path
 */
export function getPreviewS3Key(contentId: number): string {
  return `${BUCKET_FOLDERS.PREVIEWS}preview-${contentId}.mp4`;
}

export default {
  uploadToS3,
  getSignedS3Url, 
  downloadFromS3,
  deleteFromS3,
  getVideoS3Key,
  getImageS3Key,
  getThumbnailS3Key,
  getPreviewS3Key,
  BUCKET_FOLDERS
};
