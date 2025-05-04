/**
 * S3 Service - Handles all AWS S3 operations for storage and retrieval
 * 
 * This service provides functions to upload, retrieve, and delete files from AWS S3,
 * as well as generate pre-signed URLs for temporary access to protected resources.
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Initialize S3 client with AWS credentials from environment variables
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

// Get bucket name from environment variable
const bucketName = process.env.AWS_BUCKET_NAME || '';

/**
 * Upload a buffer to S3
 * @param content Buffer or string content to upload
 * @param s3Key Key for the file in S3
 * @param contentType Content type (MIME type) of the file
 * @returns Full S3 URL of the uploaded file
 */
async function uploadToS3(content: Buffer, s3Key: string, contentType: string): Promise<string> {
  try {
    if (!bucketName) {
      throw new Error('AWS_BUCKET_NAME environment variable is not set');
    }

    // Create the upload command
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      Body: content,
      ContentType: contentType
    });

    // Execute the upload
    await s3Client.send(command);
    console.log(`Successfully uploaded to S3: ${s3Key}`);
    
    // Return the resource URL
    return getS3ResourcePath(s3Key);
  } catch (error) {
    console.error(`Error uploading to S3: ${error}`);
    throw error;
  }
}

/**
 * Delete a file from S3
 * @param s3Key Key for the file in S3
 */
async function deleteFromS3(s3Key: string): Promise<void> {
  try {
    if (!bucketName) {
      throw new Error('AWS_BUCKET_NAME environment variable is not set');
    }

    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: s3Key
    });

    await s3Client.send(command);
    console.log(`Successfully deleted from S3: ${s3Key}`);
  } catch (error) {
    console.error(`Error deleting from S3: ${error}`);
    throw error;
  }
}

/**
 * Generate a pre-signed URL for an S3 object
 * @param s3Key Key for the file in S3
 * @param expiresIn Expiration time in seconds (default 24 hours)
 * @returns Pre-signed URL for the S3 object
 */
async function getSignedS3Url(s3Key: string, expiresIn: number = 86400): Promise<string> {
  try {
    if (!bucketName) {
      throw new Error('AWS_BUCKET_NAME environment variable is not set');
    }

    // Create the command to get the object
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key
    });

    // Generate the pre-signed URL
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    return signedUrl;
  } catch (error) {
    console.error(`Error generating pre-signed URL: ${error}`);
    throw error;
  }
}

/**
 * Get the standard resource path for an S3 object
 * @param s3Key Key for the file in S3
 * @returns Resource path for the S3 object
 */
function getS3ResourcePath(s3Key: string): string {
  if (!bucketName) {
    throw new Error('AWS_BUCKET_NAME environment variable is not set');
  }
  return `https://${bucketName}.s3.amazonaws.com/${s3Key}`;
}

/**
 * Get the S3 key for a video file
 * @param contentId ID of the content
 * @param filename Original filename (optional)
 * @returns S3 key for the video
 */
function getVideoS3Key(contentId: number, filename?: string): string {
  const extension = filename ? getFileExtension(filename) : 'mp4';
  return `videos/${contentId}/video.${extension}`;
}

/**
 * Get the S3 key for an image file
 * @param contentId ID of the content
 * @param filename Original filename (optional)
 * @returns S3 key for the image
 */
function getImageS3Key(contentId: number, filename?: string): string {
  const extension = filename ? getFileExtension(filename) : 'jpg';
  return `images/${contentId}/image.${extension}`;
}

/**
 * Get the S3 key for a thumbnail
 * @param contentId ID of the content
 * @returns S3 key for the thumbnail
 */
function getThumbnailS3Key(contentId: number): string {
  return `thumbnails/video-${contentId}.jpg`;
}

/**
 * Get the file extension from a filename
 * @param filename Filename with extension
 * @returns File extension without the dot
 */
function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : 'bin';
}

// Export all functions as a default object
export default {
  uploadToS3,
  deleteFromS3,
  getSignedS3Url,
  getS3ResourcePath,
  getVideoS3Key,
  getImageS3Key,
  getThumbnailS3Key
};
