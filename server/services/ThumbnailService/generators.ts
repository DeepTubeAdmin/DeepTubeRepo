/**
 * Thumbnail generators for different content types
 */

import { ThumbnailOptions, ThumbnailResult } from "./types";
import { uploadToS3, getThumbnailS3Key, getSignedS3Url } from "./storage";
import fs from "fs/promises";
import { extractYouTubeVideoId, downloadYouTubeThumbnail } from "./youtube";
import {
  generateThumbnailFromVideo,
  cleanWorkspacePath,
  cleanupTempFiles,
  fileExists,
} from "./ffmpeg";
import sharp from "sharp";
import path from "path";

/**
 * Generate a thumbnail from a YouTube video
 * @param options Thumbnail options
 * @returns Thumbnail result
 */
export async function generateYouTubeThumbnail(
  options: ThumbnailOptions
): Promise<ThumbnailResult> {
  try {
    const { contentId, youtubeId } = options;

    // Extract YouTube ID if provided in sourceUrl but not directly
    const extractedYoutubeId =
      youtubeId ||
      (options.sourceUrl ? extractYouTubeVideoId(options.sourceUrl) : null);

    if (!extractedYoutubeId) {
      throw new Error("No valid YouTube ID found");
    }

    console.log(
      `Generating YouTube thumbnail for content ${contentId} using ID ${extractedYoutubeId}`
    );

    // Try multiple quality levels in order of preference
    const qualities = ["maxresdefault", "hqdefault", "mqdefault", "default"];
    let imageBuffer: Buffer | null = null;
    let usedQuality = "";

    // Try each quality level until one works
    for (const quality of qualities) {
      try {
        const thumbnailUrl = getYouTubeThumbnailUrl(
          extractedYoutubeId,
          quality
        );
        if (!thumbnailUrl) continue;

        console.log(`Trying YouTube thumbnail quality: ${quality}`);
        const response = await fetch(thumbnailUrl);

        if (!response.ok) {
          console.log(
            `Quality ${quality} failed with status ${response.status}`
          );
          continue;
        }

        imageBuffer = Buffer.from(await response.arrayBuffer());
        usedQuality = quality;
        console.log(
          `Successfully retrieved YouTube thumbnail with quality: ${quality}`
        );
        break;
      } catch (innerError) {
        console.error(
          `Error fetching YouTube thumbnail quality ${quality}:`,
          innerError
        );
      }
    }

    if (!imageBuffer) {
      throw new Error("Failed to fetch YouTube thumbnail at any quality level");
    }

    // Save to S3
    const thumbnailS3Key = getThumbnailS3Key(contentId, "youtube");
    await uploadToS3(imageBuffer, thumbnailS3Key, {
      contentType: "image/jpeg",
    });
    console.log(`Saved YouTube thumbnail to S3: ${thumbnailS3Key}`);

    return {
      success: true,
      thumbnailPath: thumbnailS3Key,
      contentType: "image/jpeg",
      method: `youtube-${usedQuality}`,
    };
  } catch (error) {
    console.error("YouTube thumbnail generation failed:", error);
    throw error;
  }
}

/**
 * Generate a thumbnail from video content using FFmpeg
 * @param options Thumbnail options
 * @returns Thumbnail result
 */
export async function generateVideoThumbnail(
  options: ThumbnailOptions
): Promise<ThumbnailResult> {
  try {
    const { contentId, sourceUrl } = options;
    let thumbnailPath = null;
    let thumbnailS3Key = "";

    if (!sourceUrl) {
      throw new Error("No source URL provided for video thumbnail generation");
    }

    console.log(
      `Generating video thumbnail for content ${contentId} using FFmpeg ${sourceUrl}`
    );

    // Clean the source URL and make it accessible to FFmpeg
    let videoPath = sourceUrl;

    try {
      // Create a temporary output path for the thumbnail
      const tempOutputPath = path.join(
        path.dirname(cleanWorkspacePath(sourceUrl)),
        `thumb-${Date.now()}-${contentId}.jpg`
      );
      if (
        sourceUrl.includes("/api/s3/") ||
        sourceUrl.includes(".amazonaws.com/")
      ) {
        videoPath = `http://${process.env.HOST}:${process.env.PORT}${sourceUrl}`;
        console.log(`Cleaned video path for FFmpeg: ${videoPath}`);
      }

      // Generate thumbnail using FFmpeg
      const success = await generateThumbnailFromVideo(
        videoPath,
        tempOutputPath,
        {
          width: options.width || 800,
          height: options.height || 450,
          timestamps: ["00:00:03", "00:00:01", "00:00:05", "00:00:10"], // Try different timestamps
        }
      );
      console.log("success===>", success, tempOutputPath);

      if (success) {
        thumbnailPath = tempOutputPath;
      }

      console.log(
        `FFmpeg successfully generated thumbnail at: ${thumbnailPath}`
      );

      // Read the generated thumbnail
      if (thumbnailPath && typeof thumbnailPath === "string") {
        let thumbnailBuffer;
        try {
          // Make sure we're using the full path if needed
          if (
            !path.isAbsolute(thumbnailPath) &&
            !thumbnailPath.startsWith("/")
          ) {
            const fullPath = path.join(process.cwd(), thumbnailPath);
            console.log(`Using full path for thumbnail: ${fullPath}`);

            if (await fileExists(fullPath)) {
              thumbnailBuffer = await fs.readFile(fullPath);
              console.log(
                `Successfully read thumbnail from full path with size: ${thumbnailBuffer.length} bytes`
              );
            } else {
              console.log(
                `File doesn't exist at full path, trying original path`
              );
              thumbnailBuffer = await fs.readFile(thumbnailPath);
            }
          } else {
            thumbnailBuffer = await fs.readFile(thumbnailPath);
          }

          // Initialize thumbnailS3Key here for proper scope
          thumbnailS3Key = getThumbnailS3Key(contentId, "video");

          // Upload to S3
          await uploadToS3(thumbnailBuffer, thumbnailS3Key, {
            contentType: "image/jpeg",
          });
          console.log(`Saved FFmpeg video thumbnail to S3: ${thumbnailS3Key}`);

          // Clean up temporary files
          await cleanupTempFiles([thumbnailPath]);
        } catch (readError) {
          console.error(`Error reading thumbnail file: ${readError}`);
          throw new Error(
            `Failed to read generated thumbnail: ${readError.message}`
          );
        }
      } else {
        throw new Error("Failed to generate thumbnail with FFmpeg");
      }

      return {
        success: true,
        thumbnailPath: thumbnailS3Key,
        contentType: "image/jpeg",
        method: "ffmpeg-video",
      };
    } catch (ffmpegError) {
      console.error("FFmpeg thumbnail generation failed:", ffmpegError);

      // Clean up temporary files if they exist
      if (
        thumbnailPath &&
        typeof thumbnailPath === "string" &&
        (await fileExists(thumbnailPath))
      ) {
        await cleanupTempFiles([thumbnailPath]);
      }

      throw ffmpegError;
    }
  } catch (error) {
    console.error("Video thumbnail generation failed:", error);
    throw error;
  }
}

/**
 * Generate a thumbnail from an image
 * @param options Thumbnail options
 * @returns Thumbnail result
 */
export async function generateImageThumbnail(
  options: ThumbnailOptions
): Promise<ThumbnailResult> {
  try {
    const { contentId, sourceUrl, base64Data } = options;

    // Handle base64 data directly if provided
    if (base64Data) {
      console.log(
        `Generating image thumbnail from base64 data for content ${contentId}`
      );

      // Strip data URL prefix if present
      const base64Content = base64Data.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Content, "base64");

      // Process with Sharp to resize
      const resizedBuffer = await sharp(buffer)
        .resize(options.width || 800, options.height || 450, {
          fit: "cover",
          position: "center",
        })
        .jpeg({ quality: 90 })
        .toBuffer();

      // Save directly to S3
      const thumbnailS3Key = getThumbnailS3Key(contentId, "image");
      await uploadToS3(resizedBuffer, thumbnailS3Key, {
        contentType: "image/jpeg",
      });
      console.log(
        `Saved resized base64 image thumbnail to S3: ${thumbnailS3Key}`
      );

      return {
        success: true,
        thumbnailPath: thumbnailS3Key,
        contentType: "image/jpeg",
        method: "sharp-base64",
      };
    }

    // Handle URL-based image
    if (!sourceUrl) {
      throw new Error(
        "No source URL or base64 data provided for image thumbnail"
      );
    }

    console.log(`Generating image thumbnail for content ${contentId} from URL`);

    // Get a properly formatted image path
    let imagePath = sourceUrl;
    let imageBuffer: Buffer;

    if (
      sourceUrl.includes("/api/s3/") ||
      sourceUrl.includes(".amazonaws.com/")
    ) {
      // For S3 URLs, try to get a local filesystem path
      imagePath = cleanWorkspacePath(sourceUrl);
      console.log(`Cleaned image path: ${imagePath}`);

      try {
        // Try to read directly from filesystem
        imageBuffer = await fs.readFile(imagePath);
        console.log(`Successfully read image from filesystem: ${imagePath}`);
      } catch (error) {
        const fsError = error as Error;
        console.log(
          `Couldn't read from filesystem, fetching from URL: ${fsError.message}`
        );

        // If local file access fails, try to get a signed URL
        try {
          const s3Key =
            sourceUrl.split("/api/s3/").pop() ||
            sourceUrl.split(".amazonaws.com/").pop() ||
            sourceUrl;

          const signedUrl = await getSignedS3Url(s3Key);
          console.log(
            `Got signed S3 URL for image: ${signedUrl.substring(0, 100)}...`
          );

          const response = await fetch(signedUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.status}`);
          }

          imageBuffer = Buffer.from(await response.arrayBuffer());
          console.log(`Successfully fetched image from signed URL`);
        } catch (urlError) {
          console.error(`Failed to get image from S3:`, urlError);
          throw urlError;
        }
      }
    } else {
      // For external URLs, fetch directly
      try {
        const response = await fetch(sourceUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status}`);
        }

        imageBuffer = Buffer.from(await response.arrayBuffer());
        console.log(`Successfully fetched image from URL: ${sourceUrl}`);
      } catch (fetchError) {
        console.error(`Failed to fetch image from URL:`, fetchError);
        throw fetchError;
      }
    }

    // Process with Sharp for resizing/optimization
    console.log("Processing image with Sharp...");
    const resizedBuffer = await sharp(imageBuffer)
      .resize(options.width || 800, options.height || 450, {
        fit: "cover",
        position: "center",
      })
      .jpeg({ quality: 90 })
      .toBuffer();

    // Save to S3
    const thumbnailS3Key = getThumbnailS3Key(contentId, "image");
    await uploadToS3(resizedBuffer, thumbnailS3Key, {
      contentType: "image/jpeg",
    });
    console.log(
      `Saved Sharp-processed image thumbnail to S3: ${thumbnailS3Key}`
    );

    return {
      success: true,
      thumbnailPath: thumbnailS3Key,
      contentType: "image/jpeg",
      method: "sharp-image",
    };
  } catch (error) {
    console.error("Image thumbnail generation failed:", error);
    throw error;
  }
}

/**
 * Generate an SVG placeholder thumbnail
 * @param options Thumbnail options
 * @returns Thumbnail result
 */
export async function generatePlaceholderThumbnail(
  options: ThumbnailOptions
): Promise<ThumbnailResult> {
  try {
    const { contentId, contentType = "unknown" } = options;

    console.log(
      `Generating placeholder thumbnail for content ${contentId}, type: ${contentType}`
    );

    // Create SVG placeholder based on content type
    const backgroundColor =
      contentType === "video"
        ? "#1a1a1a"
        : contentType === "image"
        ? "#2a2a2a"
        : "#0f172a";
    const textColor = "#ff9000"; // Orange brand color
    const displayType =
      contentType.charAt(0).toUpperCase() + contentType.slice(1);

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
      <rect width="800" height="450" fill="${backgroundColor}"/>
      <text x="400" y="210" font-family="Arial" font-size="50" text-anchor="middle" fill="${textColor}">
        ${displayType} Thumbnail
      </text>
      <text x="400" y="270" font-family="Arial" font-size="30" text-anchor="middle" fill="${textColor}">
        (Placeholder)
      </text>
    </svg>`;

    // Save SVG to S3
    const thumbnailS3Key = getThumbnailS3Key(contentId, contentType, "svg");
    await uploadToS3(svg, thumbnailS3Key, { contentType: "image/svg+xml" });
    console.log(`Saved placeholder SVG to S3: ${thumbnailS3Key}`);

    return {
      success: true,
      thumbnailPath: thumbnailS3Key,
      contentType: "image/svg+xml",
      method: "svg-placeholder",
    };
  } catch (error) {
    console.error("Placeholder thumbnail generation failed:", error);
    throw error;
  }
}

/**
 * Get YouTube thumbnail URL
 * @param youtubeId YouTube video ID
 * @param quality Thumbnail quality ('maxresdefault', 'hqdefault', 'mqdefault', 'default')
 * @returns YouTube thumbnail URL
 */
export function getYouTubeThumbnailUrl(
  youtubeId: string | null,
  quality: string = "maxresdefault"
): string | null {
  if (!youtubeId) return null;
  return `https://img.youtube.com/vi/${youtubeId}/${quality}.jpg`;
}
