/**
 * S3 storage utilities for ThumbnailService
 */

import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fs from "fs/promises";
import path from "path";
import { s3Client } from "../../s3";
import { StorageOptions } from "./types";

// Default bucket
const BUCKET_NAME = process.env.AWS_BUCKET_NAME || "";

/**
 * Get the S3 key for a content thumbnail
 * @param contentId Content ID
 * @param contentType Content type
 * @param extension File extension (jpg by default)
 * @returns S3 key for the thumbnail
 */
export function getThumbnailS3Key(
  contentId: number,
  contentType: string = "video",
  extension: string = "jpg"
): string {
  return `thumbnails/${contentType}-${contentId}.${extension}`;
}

/**
 * Upload data to S3
 * @param data Data to upload (Buffer or string)
 * @param s3Key S3 key for the file
 * @param options Storage options
 * @returns S3 URL
 */
export async function uploadToS3(
  data: Buffer | string,
  s3Key: string,
  options: StorageOptions = {}
): Promise<string> {
  const {
    contentType = "image/jpeg",
    encoding,
    cacheControl = "public, max-age=31536000", // 1 year
  } = options;

  const params = {
    Bucket: BUCKET_NAME,
    Key: s3Key,
    Body: data,
    ContentType: contentType,
    CacheControl: cacheControl,
  };

  if (encoding) {
    Object.assign(params, { ContentEncoding: encoding });
  }

  try {
    await s3Client.send(new PutObjectCommand(params));
    return s3Key;
  } catch (error) {
    console.error("Error uploading to S3:", error);
    throw error;
  }
}

/**
 * Generate a pre-signed URL for an S3 object
 * @param s3Key S3 key
 * @param expiresIn Expiration time in seconds (default: 1 hour)
 * @returns Pre-signed URL
 */
export async function getSignedS3Url(
  s3Key: string,
  expiresIn: number = 3600
): Promise<string> {
  console.log("BUCKET_NAME", BUCKET_NAME);
  console.log("s3Key", s3Key);
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
  });

  try {
    return await getSignedUrl(s3Client, command, { expiresIn });
  } catch (error) {
    console.error("Error generating signed URL:", error);
    throw error;
  }
}

/**
 * Delete a file from S3
 * @param s3Key S3 key
 */
export async function deleteFromS3(s3Key: string): Promise<void> {
  try {
    console.log("s3Key to delete from S3", s3Key);
    const data = await s3Client.send(
      new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
      })
    );
    console.log("data", data);
  } catch (error) {
    console.error("Error deleting from S3:", error);
    throw error;
  }
}

/**
 * Check if a thumbnail exists for a content item
 * @param contentId Content ID
 * @param contentType Content type
 * @returns Whether the thumbnail exists
 */
export async function checkIfObjectExists(s3Key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: s3Key,
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    return false;
  }
}

export async function thumbnailExists(
  contentId: number,
  contentType?: string
): Promise<boolean> {
  const s3Key = getThumbnailS3Key(contentId, contentType);

  try {
    await s3Client.send(
      new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
      })
    );
    return true;
  } catch (error) {
    return false;
  }
}
