import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage as dbStorage } from "./storage";
import { pool } from "./db";
import { setupAuth, comparePasswords, hashPassword } from "./auth";
import { randomBytes } from "crypto";
import { sendPasswordResetEmail } from "./sendgrid";
import { z } from "zod";
import {
  insertCategorySchema,
  insertVideoSchema,
  type Video,
  type Category,
  type InsertLike,
  type InsertMessage,
} from "@shared/schema";
import * as localYoutubeUtils from "./youtubeUtils";
import { handleContentFeed } from "./contentFeedApi";
// Vimeo service no longer used as we've migrated to S3
import multer from "multer";
import path from "path";
import fs from "node:fs/promises";
import fsSync from "fs";
import { fileURLToPath } from "url";
import thumbnailService from "./services/ThumbnailService";
// Import specific utilities from their respective modules
import {
  youtube as youtubeUtils,
  storage as s3Service,
  ffmpeg as ffmpegUtils,
} from "./services/ThumbnailService";
import * as PerceptualHashService from "./services/PerceptualHashService";
import {
  asc,
  desc,
  eq,
  like,
  and,
  sql,
  or,
  SQL,
  inArray,
  isNull,
  not,
} from "drizzle-orm";
import { videos, messages, users, reports, comments } from "@shared/schema";
import { db } from "./db";
// Thumbnail routes now integrated directly
import mongoDb from "./mongodb";
import { registerEmbedRoutes } from "./routes/embed";
import {
  getSignedS3Url,
  uploadFileToS3,
  uploadStringToS3,
  localPathToS3Key,
  generateAndStoreS3Thumbnail,
  generateSvgPlaceholder,
  deleteFileFromS3,
} from "./combined-services";

// Generate placeholder SVG for videos and images
function getPlaceholderSvg(contentType = "video") {
  console.log(`Creating placeholder SVG for content type: ${contentType}`);

  // For image content, show a different placeholder
  if (contentType === "image" || contentType === "images") {
    return `
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="225" viewBox="0 0 400 225">
  <rect width="400" height="225" fill="#111" />
  <rect x="150" y="62.5" width="100" height="100" fill="#222" />
  <circle cx="200" cy="92.5" r="10" fill="#f97316" />
  <rect x="175" y="112.5" width="50" height="30" fill="#333" />
  <text x="200" y="200" fill="#f97316" font-family="Arial" font-size="14" text-anchor="middle">AI Generated Image</text>
</svg>
`;
  }

  // Default video placeholder with play button
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="225" viewBox="0 0 400 225">
  <rect width="400" height="225" fill="#111" />
  <circle cx="200" cy="112.5" r="50" fill="#222" />
  <polygon points="185,90 185,135 225,112.5" fill="#f97316" stroke="#000" stroke-width="2" />
  <text x="200" y="200" fill="#f97316" font-family="Arial" font-size="14" text-anchor="middle">AI Generated Video</text>
</svg>
`;
}

// Helper to send SVG placeholder
function sendSvgPlaceholder(res: Response, contentType = "video") {
  // Log the content type being requested to help debug
  console.log(`Serving SVG placeholder for content type: ${contentType}`);

  // Normalize content type for proper placeholder selection
  let normalizedType = "video";
  let svgFile = "./public/default-video-thumbnail.svg";

  if (contentType === "image" || contentType === "images") {
    normalizedType = "image";
    svgFile = "./public/default-image-thumbnail.svg";
  } else if (contentType === "embed") {
    normalizedType = "embed";
    svgFile = "./public/default-embed-thumbnail.svg";
  }

  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  try {
    // Use the file-based SVGs we created
    return res.sendFile(path.resolve(svgFile));
  } catch (error) {
    // Fall back to the inline SVG if file access fails
    console.error(`Error serving SVG file ${svgFile}:`, error);
    return res.send(getPlaceholderSvg(normalizedType));
  }
}
import { WebSocketServer } from "ws";
import { urlPathToS3Key } from "./s3";

// Get directory paths in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "../uploads/");
if (!fsSync.existsSync(uploadsDir)) {
  fsSync.mkdirSync(uploadsDir, { recursive: true });
}

// Specific directory for videos
const videosDir = path.join(uploadsDir, "videos");
if (!fsSync.existsSync(videosDir)) {
  fsSync.mkdirSync(videosDir, { recursive: true });
}

// Specific directory for images
const imagesDir = path.join(uploadsDir, "images");
if (!fsSync.existsSync(imagesDir)) {
  fsSync.mkdirSync(imagesDir, { recursive: true });
}

// Configure multer for file uploads
const multerStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Determine where to store the file based on mimetype
    if (file.mimetype.startsWith("video/")) {
      cb(null, videosDir);
    } else if (file.mimetype.startsWith("image/")) {
      cb(null, imagesDir);
    } else {
      cb(null, uploadsDir);
    }
  },
  filename: function (req, file, cb) {
    // Create a unique filename
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
  },
});

// Set up multer with the storage configuration
const upload = multer({
  storage: multerStorage,
  limits: { fileSize: 1 * 1024 * 1024 * 1024 }, // 1 GB
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Bot detection for SEO
  function isBot(userAgent: string = ""): boolean {
    const botPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /facebookexternalhit/i,
      /WhatsApp/i,
      /Telegram/i,
      /TwitterBot/i,
      /LinkedInBot/i,
      /slackbot/i,
      /googlebot/i,
      /bingbot/i,
      /yandex/i,
      /duckduckbot/i,
      /baiduspider/i,
      /postman/i,
    ];
    return botPatterns.some((pattern) => pattern.test(userAgent));
  }

  // Handle /media/:id route for SEO
  app.get("/media/:id", async (req: Request, res: Response, next: Function) => {
    try {
      const contentId = parseInt(req.params.id);
      if (isNaN(contentId)) {
        return res.status(400).send("Invalid content ID");
      }

      const video = await dbStorage.getVideoById(contentId, true);
      if (!video) {
        return res.status(404).send("Content not found");
      }

      const userAgent = req.get("user-agent") || "";
      const baseUrl =
        process.env.NODE_ENV === "development"
          ? "http://127.0.0.1:5000"
          : "https://www.deeptubeai.com";

      // For bots and crawlers, return pre-rendered HTML with comprehensive SEO meta tags
      if (isBot(userAgent)) {
        // For SEO/social sharing, use direct public S3 URLs for better crawler reliability
        // This avoids redirects and provides stable, non-expiring URLs for social media
        let thumbnailUrl: string;
        
        try {
          // Check if thumbnail exists and get direct S3 URL
          const thumbnailExists = await thumbnailService.thumbnailExists(video.id, video.contentType);
          
          if (thumbnailExists) {
            // Use direct public S3 URL for maximum compatibility with social crawlers
            thumbnailUrl = thumbnailService.getPublicThumbnailUrl(video.id, video.contentType);
            console.log(`Using direct S3 URL for social sharing: ${thumbnailUrl}`);
          } else {
            // Trigger thumbnail generation for future requests
            console.log(`Thumbnail not found for ${video.id}, triggering generation`);
            const generateUrl = `${baseUrl}/api/content/${video.id}/thumbnail`;
            try {
              const thumbnailResponse = await fetch(generateUrl);
              console.log(`Generated thumbnail for bot crawler, status: ${thumbnailResponse.status}`);
              
              // If generation succeeded, use the direct S3 URL
              if (thumbnailResponse.ok) {
                thumbnailUrl = thumbnailService.getPublicThumbnailUrl(video.id, video.contentType);
              } else {
                // Fallback to redirect endpoint
                thumbnailUrl = generateUrl;
              }
            } catch (error) {
              console.warn(`Could not generate thumbnail for ${video.id}:`, error);
              // Fallback to logo
              thumbnailUrl = `${baseUrl}/logo.jpg`;
            }
          }
        } catch (error) {
          console.error(`Error checking thumbnail for ${video.id}:`, error);
          // Fallback to redirect endpoint
          thumbnailUrl = `${baseUrl}/api/content/${video.id}/thumbnail`;
        }

        const videoUrl = video.videoUrl 
          ? video.videoUrl.startsWith("http") 
            ? video.videoUrl 
            : `${baseUrl}${video.videoUrl}`
          : "";
        const embedUrl = `${baseUrl}/media/${video.id}/embed`;
        const canonicalUrl = `${baseUrl}/media/${video.id}`;

        // Enhanced description with metadata
        const generatorInfo = video.aiGenerator
          ? ` | Created with ${video.aiGenerator}`
          : "";
        const description =
          video.description ||
          `Watch this AI-generated ${video.contentType} on DeepTubeAI - the premier platform for ethical AI-generated content${generatorInfo}`;
        const enhancedTitle = `${video.title}${generatorInfo} | DeepTubeAI`;

        // Generate keywords from content
        const keywords = [
          video.title,
          `AI ${video.contentType}`,
          video.aiGenerator || "AI generation",
          video.resolution || "HD",
          "AI media",
          "DeepTubeAI",
          "deep tube",
          "deep tube ai",
          "deeptubeai",
          "DeepTube",
          "AI content",
          "artificial intelligence",
          ...(video.tags ? video.tags.split(",").map((tag) => tag.trim()) : []),
          ...(video.prompt ? video.prompt.split(" ").slice(0, 5) : []),
        ]
          .filter(Boolean)
          .join(", ");

        // Create structured data for VideoObject or ImageObject
        const structuredData =
          video.contentType === "video"
            ? {
                "@context": "https://schema.org",
                "@type": "VideoObject",
                name: video.title,
                description: description,
                thumbnailUrl: thumbnailUrl,
                uploadDate: video.createdAt || new Date().toISOString(),
                contentUrl: videoUrl,
                embedUrl: embedUrl,
                duration: video.duration || "PT30S",
                width: "1280",
                height: "720",
                interactionStatistic: {
                  "@type": "InteractionCounter",
                  interactionType: { "@type": "WatchAction" },
                  userInteractionCount: video.views || 0,
                },
                author: {
                  "@type": "Organization",
                  name: "DeepTubeAI",
                  url: baseUrl,
                },
                publisher: {
                  "@type": "Organization",
                  name: "DeepTubeAI",
                  url: baseUrl,
                  logo: {
                    "@type": "ImageObject",
                    url: `${baseUrl}/logo.jpg`,
                  },
                },
                keywords: keywords.split(", "),
                genre: "AI Generated Content",
                encodingFormat: "video/mp4",
                inLanguage: "en-US",
                isAccessibleForFree: true,
              }
            : {
                "@context": "https://schema.org",
                "@type": "ImageObject",
                name: video.title,
                description: description,
                contentUrl: video.imageUrl || thumbnailUrl,
                thumbnailUrl: thumbnailUrl,
                uploadDate: video.createdAt || new Date().toISOString(),
                width: "1280",
                height: "720",
                author: {
                  "@type": "Organization",
                  name: "DeepTubeAI",
                  url: baseUrl,
                },
                publisher: {
                  "@type": "Organization",
                  name: "DeepTubeAI",
                  url: baseUrl,
                  logo: {
                    "@type": "ImageObject",
                    url: `${baseUrl}/logo.jpg`,
                  },
                },
                keywords: keywords.split(", "),
                encodingFormat:
                  video.contentType === "image" ? "image/jpeg" : "video/mp4",
                inLanguage: "en-US",
                isAccessibleForFree: true,
              };

        const html = `
          <!DOCTYPE html>
          <html lang="en" prefix="og: https://ogp.me/ns# video: https://ogp.me/ns/video#">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>${enhancedTitle}</title>
              
              <!-- Primary Meta Tags -->
              <meta name="title" content="${enhancedTitle}">
              <meta name="description" content="${description}">
              <meta name="keywords" content="${keywords}">
              <meta name="author" content="DeepTubeAI">
              <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
              <meta name="googlebot" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
              <meta name="bingbot" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
              <link rel="canonical" href="${canonicalUrl}">
              
              <!-- Open Graph / Facebook - Enhanced for Video Content -->
              <meta property="fb:app_id" content="2095992220812764">
              <meta property="og:type" content="${
                video.contentType === "video" ? "video.other" : "article"
              }">
              <meta property="og:url" content="${canonicalUrl}">
              <meta property="og:site_name" content="DeepTubeAI">
              <meta property="og:title" content="${enhancedTitle}">
              <meta property="og:description" content="${description}">
              <meta property="og:image" content="${thumbnailUrl}">
              <meta property="og:image:secure_url" content="${thumbnailUrl}">
              <meta property="og:image:type" content="image/jpeg">
              <meta property="og:image:width" content="1280">
              <meta property="og:image:height" content="720">
              <meta property="og:image:alt" content="${
                video.title
              } - AI generated ${video.contentType}">
              <meta property="og:locale" content="en_US">
              <meta property="og:updated_time" content="${
                video.createdAt || new Date().toISOString()
              }">
              ${
                video.contentType === "video"
                  ? `
              <meta property="og:video" content="${videoUrl}">
              <meta property="og:video:secure_url" content="${videoUrl}">
              <meta property="og:video:type" content="video/mp4">
              <meta property="og:video:width" content="1280">
              <meta property="og:video:height" content="720">
              <meta property="og:video:duration" content="${
                video.duration || "30"
              }">
              <meta property="video:actor" content="AI Generated">
              <meta property="video:director" content="${
                video.aiGenerator || "AI"
              }">
              <meta property="video:duration" content="${
                video.duration || "30"
              }">
              <meta property="video:release_date" content="${
                video.createdAt || new Date().toISOString()
              }">
              <meta property="video:tag" content="${keywords
                .split(", ")
                .slice(0, 5)
                .join('", "')}">
              `
                  : ""
              }
              
              <!-- Twitter Cards - Enhanced Player Card -->
              <meta name="twitter:card" content="${
                video.contentType === "video" ? "player" : "summary_large_image"
              }">
              <meta name="twitter:site" content="@DeepTubeAI">
              <meta name="twitter:creator" content="@DeepTubeAI">
              <meta name="twitter:title" content="${enhancedTitle}">
              <meta name="twitter:description" content="${description}">
              <meta name="twitter:image" content="${thumbnailUrl}">
              <meta name="twitter:image:alt" content="${
                video.title
              } - AI generated ${video.contentType}">
              ${
                video.contentType === "video"
                  ? `
              <meta name="twitter:player" content="${embedUrl}">
              <meta name="twitter:player:width" content="1280">
              <meta name="twitter:player:height" content="720">
              <meta name="twitter:player:stream" content="${videoUrl}">
              <meta name="twitter:player:stream:content_type" content="video/mp4">
              `
                  : ""
              }
              
              <!-- Additional Video Meta Tags -->
              ${
                video.contentType === "video"
                  ? `
              <meta name="video:duration" content="${video.duration || "30"}">
              <meta name="video:release_date" content="${
                video.createdAt || new Date().toISOString()
              }">
              <meta name="video:tag" content="${keywords}">
              `
                  : ""
              }
              
              <!-- Schema.org Structured Data -->
              <script type="application/ld+json">
                ${JSON.stringify(structuredData, null, 2)}
              </script>
              
              <!-- Additional SEO Meta Tags -->
              <meta name="theme-color" content="#f59e0b">
              <meta name="msapplication-TileColor" content="#f59e0b">
              <meta name="application-name" content="DeepTubeAI">
              <meta name="apple-mobile-web-app-title" content="DeepTubeAI">
              <meta name="apple-mobile-web-app-capable" content="yes">
              <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
              
              <!-- Preconnect for Performance -->
              <link rel="preconnect" href="https://deeptubebucket.s3.us-east-2.amazonaws.com">
              <link rel="dns-prefetch" href="https://deeptubebucket.s3.us-east-2.amazonaws.com">
            </head>
            <body>
              <div id="root"></div>
              <script type="module" src="/src/main.tsx"></script>
            </body>
          </html>
        `;
        return res.send(html);
      }

      // For regular users, serve the React app but let it handle the routing
      if (process.env.NODE_ENV === "development") {
        // In development, we need to fall through to Vite's catch-all
        // Remove the exclusion for this specific route and let Vite handle it
        return next();
      } else {
        // In production, serve the built file
        res.sendFile(path.resolve("./dist/public/index.html"));
      }
    } catch (error) {
      console.error("Error serving media page:", error);
      res.status(500).send("Server error");
    }
  });

  // Register embed routes
  registerEmbedRoutes(app);

  // Main thumbnail endpoint that generates thumbnails on-demand using Cloudinary
  app.get("/api/videos/:videoId/thumbnail", async (req, res) => {
    try {
      const videoId = parseInt(req.params.videoId);
      if (isNaN(videoId)) {
        console.error(`Invalid video ID: ${req.params.videoId}`);
        return sendSvgPlaceholder(res, "video");
      }

      // Fetch the video or image from the database
      const content = await dbStorage.getVideoById(Number(videoId));
      if (!content) {
        console.error(`Content not found for ID: ${videoId}`);
        return sendSvgPlaceholder(res, "video");
      }

      console.log(
        `Thumbnail request for ${content.contentType} ID: ${videoId}`
      );

      // Determine the content type for appropriate placeholder
      const contentType = content.contentType || "video";

      // Check if we can generate a thumbnail from the source
      let sourceUrl = null;
      let youtubeId = null;

      // For videos, use the video URL
      if (contentType === "video") {
        sourceUrl = content.videoUrl || null;
      }
      // For images, use the image URL
      else if (contentType === "image") {
        sourceUrl = content.imageUrl || null;
      }
      // For embeds, extract YouTube ID if available
      else if (contentType === "embed") {
        youtubeId = youtubeUtils.extractYouTubeVideoId(content.embedCode || "");
        if (youtubeId) {
          sourceUrl = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
        }
      }

      // Use S3 if a thumbnail exists
      try {
        const s3Key = s3Service.getThumbnailS3Key(videoId);

        // Attempt to serve the S3 thumbnail directly if it exists
        try {
          // Check if thumbnail exists in S3
          await s3Service.checkIfObjectExists(s3Key);

          // Get signed URL for the thumbnail
          const signedUrl = await s3Service.getSignedS3Url(s3Key);

          // Redirect to the signed URL
          return res.redirect(signedUrl);
        } catch (s3Error) {
          // If the thumbnail doesn't exist in S3, generate it
          console.log(
            `Thumbnail not found in S3 for ${contentType} ${videoId}, generating...`
          );
        }
      } catch (error) {
        console.error(`Error checking S3 for thumbnail:`, error);
      }

      // If we reach here, we need to generate a new thumbnail using Cloudinary
      try {
        console.log(
          `Generating new thumbnail via Cloudinary for ${contentType} ID: ${videoId}`
        );

        // Generate thumbnail using Cloudinary
        // Generate thumbnail based on content type
        let s3Key;
        // Generate thumbnail using our unified ThumbnailService
        const result = await thumbnailService.generateThumbnail({
          contentId: videoId,
          contentType: contentType,
          sourceUrl: sourceUrl,
          youtubeId: youtubeId,
          forceRegeneration: true,
          generatePlaceholder: !sourceUrl && !youtubeId,
        });

        // Extract the S3 key from the result
        s3Key = result.thumbnailPath;

        // Get signed URL for the thumbnail
        const signedUrl = await s3Service.getSignedS3Url(s3Key);

        // Redirect to the signed URL
        return res.redirect(signedUrl);
      } catch (genError) {
        console.error(
          `Error generating thumbnail for ${contentType} ${videoId}:`,
          genError
        );
        return sendSvgPlaceholder(res, contentType);
      }
    } catch (error) {
      console.error("Error in thumbnail endpoint:", error);
      return sendSvgPlaceholder(res, "video");
    }
  });

  // Import sitemap generator
  const {
    handleSitemapRequest,
    handleVideoSitemapRequest,
    handleImageSitemapRequest,
    handleSitemapIndexRequest,
  } = await import("./sitemap");

  // Sitemap routes for SEO
  app.get("/sitemap.xml", handleSitemapRequest);
  app.get("/sitemap-video.xml", handleVideoSitemapRequest);
  app.get("/sitemap-image.xml", handleImageSitemapRequest);
  app.get("/sitemap-index.xml", handleSitemapIndexRequest);

  // Test endpoint for S3 access
  // Endpoint to fix thumbnails content-type by content type
  // Route to fix all image thumbnails
  app.get("/api/fix-all-image-thumbnails", async (req, res) => {
    console.log("🚀 Starting image thumbnail fix process...");
    try {
      console.log("Starting image thumbnail repair process...");

      // Get all images from database
      const images = await dbStorage.getVideos(1000, "image");
      console.log(`Found ${images.length} images to process`);

      const results: {
        success: number;
        failed: number;
        items: Array<{
          id: number;
          title: string;
          status: string;
          source?: string;
          s3Key?: string;
          reason?: string;
          error?: string;
        }>;
      } = {
        success: 0,
        failed: 0,
        items: [],
      };

      // Process each image
      for (const image of images) {
        try {
          console.log(`Processing image ID ${image.id}: ${image.title}`);

          // Skip if no imageUrl
          if (!image.imageUrl) {
            console.log(`Image ${image.id} has no imageUrl, skipping`);
            results.items.push({
              id: image.id,
              title: image.title,
              status: "skipped",
              reason: "No imageUrl",
            });
            continue;
          }

          // If image is already a URL, use that to regenerate the thumbnail
          if (image.imageUrl.startsWith("http")) {
            console.log(`Image ${image.id} using URL: ${image.imageUrl}`);

            // Generate thumbnail using the imageUrl as source with unified thumbnail service
            const thumbnailService = await import(
              "./services/ThumbnailService"
            );
            const imageUrlKey = `uploads/images/image-${image.id}.jpg`;

            // First save the image to S3
            const { uploadStringToS3 } = await import("./combined-services");
            const response = await fetch(image.imageUrl);
            const imageData = await response.arrayBuffer();
            await uploadStringToS3(
              Buffer.from(imageData),
              imageUrlKey,
              "image/jpeg"
            );

            // Now generate the thumbnail using the new ThumbnailService
            console.log(
              "Using unified ThumbnailService for image thumbnail generation"
            );
            const result = await thumbnailService.generateThumbnail({
              contentId: image.id,
              contentType: "image",
              sourceUrl: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${imageUrlKey}`,
            });
            const s3Key = result.thumbnailPath;

            // Update the database to use the thumbnail endpoint
            await dbStorage.updateVideo(image.id, {
              thumbnail: `/api/videos/${image.id}/thumbnail`,
            });

            console.log(`Successfully fixed thumbnail for image ${image.id}`);
            results.success++;

            results.items.push({
              id: image.id,
              title: image.title,
              status: "success",
              source: "imageUrl",
              s3Key,
            });
          }
          // Handle base64 images
          else if (image.imageUrl.startsWith("data:image")) {
            console.log(`Image ${image.id} has base64 data, converting to S3`);

            // Extract the base64 data
            const base64Data = image.imageUrl.split(",")[1];
            if (!base64Data) {
              console.log(`Invalid base64 data format for image ${image.id}`);
              results.failed++;
              results.items.push({
                id: image.id,
                title: image.title,
                status: "failed",
                reason: "Invalid base64 format",
              });
              continue;
            }

            // Generate thumbnail from base64 data using our unified ThumbnailService
            const result = await thumbnailService.generateThumbnail({
              contentId: image.id,
              contentType: "image",
              base64Data: image.imageUrl,
              forceRegeneration: true,
            });

            // Update the database to use the thumbnail endpoint
            await dbStorage.updateVideo(image.id, {
              thumbnail: `/api/videos/${image.id}/thumbnail`,
            });

            console.log(`Successfully fixed thumbnail for image ${image.id}`);
            results.success++;

            results.items.push({
              id: image.id,
              title: image.title,
              status: "success",
              source: "base64",
              s3Key: result.thumbnailPath,
            });
          }
          // No valid image source, use placeholder
          else {
            console.log(
              `Image ${image.id} has no valid source, using placeholder`
            );

            // Update the database to use the thumbnail endpoint
            await dbStorage.updateVideo(image.id, {
              thumbnail: `/api/videos/${image.id}/thumbnail`,
            });

            results.failed++;
            results.items.push({
              id: image.id,
              title: image.title,
              status: "placeholder",
              reason: "No valid image source",
            });
          }
        } catch (error) {
          console.error(`Error processing image ${image.id}:`, error);
          results.failed++;
          results.items.push({
            id: image.id,
            title: image.title,
            status: "error",
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      console.log("====== Image Thumbnail Fix Summary ======");
      console.log(`Total processed: ${images.length}`);
      console.log(`Success: ${results.success}`);
      console.log(`Failed/Placeholder: ${results.failed}`);
      console.log("========================================");

      return res.json({
        success: true,
        message: "Image thumbnail fix process completed successfully",
        results,
      });
    } catch (error) {
      console.error("Error running image thumbnail fix:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to run image thumbnail fix",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.get("/api/update-image-thumbnails", async (req, res) => {
    try {
      // Get all image content
      const videos = await dbStorage.getVideos(1000, "image");
      console.log(`Retrieved ${videos.length} images to update thumbnails`);

      const results = [];
      let successCount = 0;

      // Process each image
      for (let i = 0; i < videos.length; i++) {
        const video = videos[i];
        try {
          // Skip if no image URL
          if (!video.imageUrl) {
            results.push({
              id: video.id,
              title: video.title,
              success: false,
              error: "No image URL available",
            });
            continue;
          }

          // If it's a URL already, use it as the thumbnail
          if (video.imageUrl.startsWith("http")) {
            // Update the video record to use the image URL as thumbnail
            await dbStorage.updateVideo(video.id, {
              thumbnail: video.imageUrl,
            });

            console.log(
              `Updated thumbnail for image ${video.id}: Using actual image URL`
            );

            results.push({
              id: video.id,
              title: video.title,
              success: true,
              action: "Used image URL",
            });

            successCount++;
          }
          // Handle base64 images
          else if (video.imageUrl.startsWith("data:image")) {
            // These should already be handled correctly in the thumbnail endpoint
            results.push({
              id: video.id,
              title: video.title,
              success: true,
              action: "Base64 image (handled by endpoint)",
            });

            successCount++;
          }
          // SVG placeholder as fallback
          else {
            // No usable image, use placeholder
            const placeholderSvg = getPlaceholderSvg("image");
            const s3Key = `thumbnails/video-${video.id}.jpg`;
            await uploadStringToS3(placeholderSvg, s3Key, "image/svg+xml");

            // Update the video record to use our thumbnail endpoint
            await dbStorage.updateVideo(video.id, {
              thumbnail: `/api/videos/${video.id}/thumbnail`,
            });

            console.log(
              `Updated thumbnail for image ${video.id}: Using SVG placeholder`
            );

            results.push({
              id: video.id,
              title: video.title,
              success: true,
              action: "Used SVG placeholder",
            });

            successCount++;
          }
        } catch (error) {
          console.error(
            `Error updating image thumbnail for ${video.id}:`,
            error
          );
          results.push({
            id: video.id,
            title: video.title,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      return res.json({
        success: true,
        totalProcessed: videos.length,
        successCount,
        results,
      });
    } catch (error) {
      console.error("Error updating image thumbnails:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to update image thumbnails",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.get("/api/fix-image-thumbnails", async (req, res) => {
    try {
      // Redirect to the new endpoint
      return res.redirect("/api/fix-all-image-thumbnails");
    } catch (error) {
      console.error("Error fixing image thumbnails:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fix image thumbnails",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Endpoint '/api/fix-thumbnails-all' removed as requested

  // Endpoint to fix a single thumbnail
  app.get("/api/fix-thumbnail/:videoId", async (req, res) => {
    try {
      const videoId = parseInt(req.params.videoId);

      // Get the video
      const video = await dbStorage.getVideoById(videoId);
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }

      // Get appropriate placeholder based on content type
      let contentType = video.contentType || "video";

      // Normalize content type
      if (contentType === "images") contentType = "image";
      if (contentType === "videos") contentType = "video";

      console.log(
        `Creating placeholder SVG for content type: ${contentType} for video ID ${videoId}`
      );

      // Determine source URL based on content type
      let sourceUrl = null;
      let youtubeId = null;

      if (contentType === "video" && video.videoUrl) {
        sourceUrl = video.videoUrl;
      } else if (contentType === "image" && video.imageUrl) {
        sourceUrl = video.imageUrl;
      } else if (contentType === "embed" && video.embedCode) {
        // Use the youtube utility from ThumbnailService
        youtubeId = youtubeUtils.extractYouTubeVideoId(video.embedCode);
        if (youtubeId) {
          sourceUrl = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
        }
      }

      console.log(
        `Fixing thumbnail for ${contentType} ${videoId} with Cloudinary`
      );

      // Generate a new thumbnail using our unified ThumbnailService
      console.log(
        `Generating a new thumbnail for content ID ${videoId}, type: ${contentType}`
      );
      console.log(
        `Source URL: ${sourceUrl || "none"}, YouTube ID: ${youtubeId || "none"}`
      );

      // The service will handle all the different cases internally
      const result = await thumbnailService.generateThumbnail({
        contentId: videoId,
        contentType: contentType,
        sourceUrl: sourceUrl,
        youtubeId: youtubeId,
        forceRegeneration: true,
        generatePlaceholder: !sourceUrl && !youtubeId,
      });

      // Extract the S3 key from the result
      const s3Key = result.thumbnailPath;

      console.log(`Thumbnail generated using method: ${result.method}`);
      console.log(`Generated thumbnail S3 path: ${s3Key}`);
      console.log(`Success: ${result.success}`);

      if (!result.success && result.error) {
        console.warn(
          `Warning: Thumbnail generation had issues: ${result.error}`
        );
      }

      // Update the video record to use our thumbnail endpoint
      await dbStorage.updateVideo(videoId, {
        thumbnail: `/api/videos/${videoId}/thumbnail`,
      });

      // Get a direct URL to the new S3 object
      const s3Url = await getSignedS3Url(s3Key);

      return res.json({
        success: true,
        message: `Successfully fixed thumbnail for video ${videoId}`,
        url: s3Url,
        videoId,
        s3Key,
      });
    } catch (error) {
      console.error("Error fixing thumbnail:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fix thumbnail",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // The Vimeo connection test endpoint has been removed as we've migrated to AWS S3

  app.get("/api/test-s3-access", async (req, res) => {
    try {
      const testFilePath = path.resolve("./public/default-video-thumbnail.svg");
      const s3Key = `test-thumbnail-${Date.now()}.svg`;

      console.log(`Testing S3 access by uploading ${testFilePath} to ${s3Key}`);

      // Upload the file to S3
      await uploadFileToS3(testFilePath, s3Key);

      // Get the URL
      const s3Url = await getSignedS3Url(s3Key);

      return res.json({
        success: true,
        message: "Successfully uploaded test file to S3",
        url: s3Url,
        key: s3Key,
      });
    } catch (error) {
      console.error("Error testing S3 access:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to test S3 access",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // These middleware declarations will be used and the duplicates below will be removed
  // Search API endpoint
  app.get("/api/search", async (req, res) => {
    try {
      // Get the query and sanitize it
      let query = (req.query.q as string) || "";

      // Remove any unexpected parts of the query (like ?0=/)
      if (query && query.includes("?")) {
        query = query.split("?")[0];
      }

      const categorySlug = (req.query.category as string) || "";
      const contentType = (req.query.type as string) || "all";
      // We can receive categoryId directly from frontend or resolve from slug
      let categoryId: number | undefined = req.query.categoryId
        ? parseInt(req.query.categoryId as string)
        : undefined;

      if (!query || query.trim() === "") {
        return res.status(400).json({ error: "Search query is required" });
      }

      // Get category ID if categorySlug is provided and we don't have categoryId yet
      if (categorySlug && !categoryId) {
        const category = await dbStorage.getCategoryBySlug(categorySlug);
        if (category) {
          categoryId = category.id;
        }
      }

      // Determine what content to search based on type
      let results: any[] = [];

      if (contentType === "all") {
        // Search for all content types
        results = await dbStorage.searchVideos({
          query,
          categoryId,
          limit: 50,
        });
      } else {
        // Search for specific content type (video, image, embed)
        results = await dbStorage.searchVideos({
          query,
          categoryId,
          contentType,
          limit: 30,
        });
      }

      // Fetch categories for mapping
      const categories = await dbStorage.getCategories();

      // Get unique user IDs from results
      const userIds = Array.from(
        new Set(results.map((video) => video.userId).filter(Boolean))
      );

      // Fetch user information
      const users =
        userIds.length > 0 ? await dbStorage.getUsersByIds(userIds) : [];

      // Enhance results with category and user information
      const enhancedResults = results.map((video) => {
        const category = video.categoryId
          ? categories.find((c) => c.id === video.categoryId)
          : null;
        const user = video.userId
          ? users.find((u) => u.id === video.userId)
          : null;
        return {
          ...video,
          categoryName: category?.name || null,
          categorySlug: category?.slug || null,
          uploaderName: user?.username || "Anonymous",
        };
      });

      // Improved logging for search results
      console.log(
        `Search for "${query}" found ${
          enhancedResults.length
        } results with contentType=${contentType}${
          categoryId ? ` and categoryId=${categoryId}` : ""
        }`
      );

      if (enhancedResults.length > 0) {
        console.log(
          `First few search results: [${enhancedResults
            .slice(0, 3)
            .map((v) => v.title)
            .join(", ")}]`
        );
      }

      res.json(enhancedResults);
    } catch (error: any) {
      console.error("Search error:", error);
      res
        .status(500)
        .json({ error: error.message || "Error performing search" });
    }
  });
  // Set up authentication
  setupAuth(app);

  // Password reset endpoints
  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email address is required" });
      }

      // Check if user exists with this email
      const user = await dbStorage.getUserByEmail(email);

      if (!user) {
        // We don't want to reveal if an email exists or not for security reasons
        // Still return a success message
        return res.json({
          message:
            "If your email is registered, you will receive a password reset link.",
        });
      }

      // Generate random token
      const token = randomBytes(32).toString("hex");

      // Set token expiration (1 hour from now)
      const tokenExpires = new Date();
      tokenExpires.setHours(tokenExpires.getHours() + 1);

      // Save token to user account
      await dbStorage.setPasswordResetToken(email, token, tokenExpires);

      // Determine base URL from request
      const protocol = req.headers["x-forwarded-proto"] || req.protocol;
      const baseUrl = `${protocol}://${req.get("host")}`;

      // Send password reset email
      const emailSent = await sendPasswordResetEmail(email, token, baseUrl);

      if (!emailSent) {
        console.error(`Failed to send password reset email to ${email}`);
        return res.status(500).json({
          error: "Failed to send password reset email. Please try again later.",
        });
      }

      res.json({
        message:
          "If your email is registered, you will receive a password reset link.",
      });
    } catch (error) {
      console.error("Password reset request error:", error);
      res
        .status(500)
        .json({ error: "An error occurred while processing your request." });
    }
  });

  app.post("/api/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res
          .status(400)
          .json({ error: "Token and new password are required" });
      }

      // Find user with valid token
      const user = await dbStorage.getUserByResetToken(token);

      if (!user) {
        return res.status(400).json({ error: "Invalid or expired token" });
      }

      // Hash the new password
      const hashedPassword = await hashPassword(newPassword);

      // Update user's password and clear token
      await dbStorage.resetPassword(user.id, hashedPassword);

      res.json({
        message:
          "Password has been reset successfully. You can now log in with your new password.",
      });
    } catch (error) {
      console.error("Password reset error:", error);
      res
        .status(500)
        .json({ error: "An error occurred while resetting your password." });
    }
  });

  app.get("/api/verify-reset-token/:token", async (req, res) => {
    try {
      const { token } = req.params;

      if (!token) {
        return res.status(400).json({ error: "Token is required" });
      }

      // Find user with valid token
      const user = await dbStorage.getUserByResetToken(token);

      if (!user) {
        return res.status(400).json({ error: "Invalid or expired token" });
      }

      res.json({ valid: true });
    } catch (error) {
      console.error("Token verification error:", error);
      res
        .status(500)
        .json({ error: "An error occurred while verifying the token." });
    }
  });

  // Middleware to check if user is authenticated
  const isAuthenticated = (req: Request, res: Response, next: Function) => {
    if (req.isAuthenticated() && req.user) {
      return next();
    }
    res.status(401).json({ error: "Authentication required" });
  };

  // Middleware to check if user is an admin
  const isAdmin = (req: Request, res: Response, next: Function) => {
    if (
      req.isAuthenticated() &&
      req.user &&
      (req.user.isAdmin || req.user.id === 1 || req.user.id === 2)
    ) {
      return next();
    }
    console.log("req.user", req.user);
    res.status(403).json({ error: "Admin access required" });
  };

  // FFmpeg video thumbnail regeneration endpoint
  // Endpoint '/api/regenerate-thumbnails-cloudinary' removed as requested

  // Type guard function to ensure req.user is defined
  function ensureUser(
    req: Request
  ): asserts req is Request & { user: Express.User } {
    if (!req.user) {
      throw new Error("User is not authenticated");
    }
  }

  // Cache variables for content management
  const usedCategoriesCache = new Map<string, Set<number>>();
  const infiniteScrollCache = new Map<string, any[]>();
  let cachedCategories: Category[] = [];

  // Function to log detailed category state information
  function logCategoryState(key: string) {
    const categories = usedCategoriesCache.get(key);
    if (categories) {
      console.log(
        `Current category tracking state for ${key}: ${Array.from(
          categories
        ).join(", ")}`
      );
      console.log(
        `Using ${categories.size} out of ${cachedCategories.length} total categories`
      );
    } else {
      console.log(`No category tracking state for ${key} yet`);
    }
  }

  // Generate consistent mock view counts for categories (for sorting demonstration)
  // In a real application, we would fetch these from a database
  const categoryViewCounts = new Map<number, number>();

  // Function to get view count for a category
  function getCategoryViewCount(categoryId: number): number {
    if (!categoryViewCounts.has(categoryId)) {
      // Pseudo-random but consistent view count generator based on category ID
      // This ensures the same category always gets the same view count in a single session
      const baseCount = 1000;
      const multiplier = (categoryId * 7919) % 10; // Using prime numbers to distribute values
      const viewCount = baseCount + multiplier * 500 + categoryId * 100;
      categoryViewCounts.set(categoryId, viewCount);
    }
    return categoryViewCounts.get(categoryId) || 0;
  }

  // Function to sort categories by view count (descending)
  function sortCategoriesByPopularity(categories: Category[]): Category[] {
    return [...categories].sort((a, b) => {
      const viewsA = getCategoryViewCount(a.id);
      const viewsB = getCategoryViewCount(b.id);
      return viewsB - viewsA; // Descending order
    });
  }

  // Setup predefined categories - must be before the /api/categories/:slug route
  app.get("/api/categories/seed", async (req, res) => {
    try {
      // Get existing categories
      const existingCategories = await dbStorage.getCategories();

      // Define all required categories
      const requiredCategories = [
        { name: "Entertainment", slug: "entertainment", icon: "party-popper" },
        { name: "Parody", slug: "parody", icon: "laugh" }, // Humor-focused
        { name: "Short Film", slug: "short-film", icon: "clapperboard" }, // Represents filmmaking
        { name: "TV Show", slug: "tv-show", icon: "tv" },
        { name: "Documentary", slug: "documentary", icon: "book-open" },
        { name: "Anime", slug: "anime", icon: "eye" },
        { name: "Uncanny", slug: "uncanny", icon: "alert-octagon" }, // For eerie/odd content
        { name: "Avatars", slug: "avatars", icon: "user-circle" },
        { name: "Marketing", slug: "marketing", icon: "megaphone" },
        { name: "Design", slug: "design", icon: "pen-tool" },
        { name: "Music", slug: "music", icon: "music" }, // Already included in first set
        { name: "Education", slug: "education", icon: "graduation-cap" },
      ];

      // Find which categories need to be created
      const existingSlugs = existingCategories.map((c) => c.slug);
      const categoriesToCreate = requiredCategories.filter(
        (c) => !existingSlugs.includes(c.slug)
      );

      // Create missing categories
      const newCategories = [];
      for (const category of categoriesToCreate) {
        const newCategory = await dbStorage.createCategory(category);
        newCategories.push(newCategory);
      }

      res.json({
        message: `${newCategories.length} categories created, ${existingCategories.length} already existed`,
        created: newCategories,
      });
    } catch (error) {
      console.error("Error seeding categories:", error);
      res.status(500).json({ error: "Failed to seed categories" });
    }
  });

  // Categories endpoints
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await dbStorage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  // Define specific routes before parameterized routes
  app.get("/api/categories/by-slug/:slug", async (req, res) => {
    try {
      const category = await dbStorage.getCategoryBySlug(req.params.slug);
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      console.error("Error fetching category:", error);
      res.status(500).json({ error: "Failed to fetch category" });
    }
  });

  // Reports endpoint
  app.post("/api/reports", async (req, res) => {
    try {
      // Define Zod schema for validation
      const reportSchema = z.object({
        videoId: z.number(),
        reason: z.string().min(1),
        userId: z.number().optional(),
      });

      // Validate the request body
      const reportData = reportSchema.parse(req.body);
      console.log("Received valid report data:", reportData);

      // Direct SQL approach as a fallback
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await client.query(
          "INSERT INTO reports (video_id, user_id, reason, status) VALUES ($1, $2, $3, $4) RETURNING *",
          [
            reportData.videoId,
            reportData.userId || null,
            reportData.reason,
            "pending",
          ]
        );
        await client.query("COMMIT");
        console.log("Report created successfully:", result.rows[0]);
        res.status(201).json(result.rows[0]);
      } catch (dbError) {
        await client.query("ROLLBACK");
        console.error("Database error creating report:", dbError);
        res.status(500).json({ error: "Database error creating report" });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error creating report:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create report" });
      }
    }
  });

  app.post("/api/categories", isAuthenticated, async (req, res) => {
    try {
      const categoryData = insertCategorySchema.parse(req.body);
      const category = await dbStorage.createCategory(categoryData);
      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(400).json({ error: "Invalid category data" });
    }
  });

  // Videos endpoints
  app.get("/api/videos", async (req, res) => {
    try {
      const limit = req.query.limit
        ? parseInt(req.query.limit as string)
        : undefined;
      const shuffleSeed = (req.query.shuffleSeed as string) || "";
      const categoryId = req.query.category
        ? parseInt(req.query.category as string)
        : undefined;
      const contentType = req.query.contentType as string;

      // Log what we're fetching
      console.log(
        `Getting videos with sortBy: newest, contentType: ${
          contentType || "all"
        }`
      );

      // Get videos by category if category parameter is provided
      let videos;
      if (categoryId) {
        videos = await dbStorage.getVideosByCategory(
          categoryId,
          contentType,
          limit || 50
        );
      } else {
        videos = await dbStorage.getVideos(limit, contentType);
      }

      // Shuffle videos if a seed is provided
      if (shuffleSeed) {
        // Log the first few IDs for debugging
        console.log(
          "Videos before shuffle: first few IDs:",
          videos.slice(0, 3).map((v) => v.id)
        );

        // Shuffle videos using the seeded shuffle function
        const shuffledVideos = shuffleArray(videos, shuffleSeed);

        // Log the first few IDs after shuffling for debugging
        console.log("Shuffled videos with seed:", shuffleSeed);
        console.log(
          "Videos after shuffle: first few IDs:",
          shuffledVideos.slice(0, 3).map((v) => v.id)
        );

        return res.json(shuffledVideos);
      }

      res.json(videos);
    } catch (error) {
      console.error("Error fetching videos:", error);
      res.status(500).json({ error: "Failed to fetch videos" });
    }
  });

  app.get("/api/videos/featured", async (req, res) => {
    try {
      const limit = req.query.limit
        ? parseInt(req.query.limit as string)
        : undefined;
      const shuffleSeed = (req.query.shuffleSeed as string) || "";

      // Get featured videos
      const videos = await dbStorage.getFeaturedVideos(limit);

      // Shuffle videos if a seed is provided
      if (shuffleSeed) {
        // Log the first few IDs for debugging
        console.log(
          "Featured videos: first few IDs:",
          videos.slice(0, 3).map((v) => v.id)
        );

        // Shuffle videos using the seeded shuffle function
        const shuffledVideos = shuffleArray(videos, shuffleSeed);

        // Log the first few IDs after shuffling for debugging
        console.log("Shuffled featured videos with seed:", shuffleSeed);
        console.log(
          "Featured videos after shuffle: first few IDs:",
          shuffledVideos.slice(0, 3).map((v) => v.id)
        );

        return res.json(shuffledVideos);
      }

      res.json(videos);
    } catch (error) {
      console.error("Error fetching featured videos:", error);
      res.status(500).json({ error: "Failed to fetch featured videos" });
    }
  });

  app.get("/api/videos/new", async (req, res) => {
    try {
      const limit = req.query.limit
        ? parseInt(req.query.limit as string)
        : undefined;
      const videos = await dbStorage.getNewVideos(limit);
      res.json(videos);
    } catch (error) {
      console.error("Error fetching new videos:", error);
      res.status(500).json({ error: "Failed to fetch new videos" });
    }
  });

  // Removed duplicate route - see detailed version below

  app.post("/api/videos", isAuthenticated, async (req, res) => {
    try {
      console.log("req.body", req.body);
      const videoData = insertVideoSchema.parse(req.body);
      console.log(
        `Processing ${videoData.contentType} upload with title: "${videoData.title}"`
      );

      // Check for duplicates if this is a video or image
      if (videoData.contentType !== "embed") {
        let isDuplicate = false;
        let mediaPath = "";

        if (videoData.contentType === "video" && videoData.videoUrl) {
          mediaPath = videoData.videoUrl;
          console.log(`Checking for duplicate video: ${mediaPath}`);

          // If it's an S3 URL, get a clean path for checking
          if (mediaPath.includes("/api/s3/")) {
            const s3Key = mediaPath.split("/api/s3/")[1];
            console.log(`Extracted S3 key for duplicate check: ${s3Key}`);
            try {
              const signedUrl = await s3Service.getSignedS3Url(s3Key);
              console.log(
                `Got signed URL for duplicate check: ${signedUrl.substring(
                  0,
                  50
                )}...`
              );
              const tempFile = await ffmpegUtils.downloadFileToTemp(signedUrl);
              if (tempFile) {
                console.log(
                  `Downloaded video to temp file for duplicate check: ${tempFile}`
                );
                isDuplicate = await PerceptualHashService.isVideoDuplicate(
                  tempFile
                );
                console.log(`Duplicate check result for video: ${isDuplicate}`);
                // Clean up temp file

                if (!isDuplicate) {
                  try {
                    const durationInSeconds =
                      await ffmpegUtils.getVideoDuration(tempFile);
                    videoData.duration = durationInSeconds; // e.g., 123.456
                    console.log("durationInSeconds", durationInSeconds);
                    console.log("videoData.duration", videoData.duration);
                  } catch (error) {
                    console.error("Error getting video duration:", error);
                  }
                }
                try {
                  await fs.unlink(tempFile);
                } catch (e) {
                  console.error("Error deleting temp file:", e);
                }
              } else {
                console.error(
                  "Failed to download file to temp location for duplicate check"
                );
              }
            } catch (error) {
              console.error("Error checking video for duplicates:", error);
            }
          } else {
            console.log(
              "Video URL does not contain /api/s3/, skipping duplicate check"
            );
          }
        } else if (videoData.contentType === "image" && videoData.imageUrl) {
          mediaPath = videoData.imageUrl;
          console.log(
            `Checking for duplicate image: ${mediaPath.substring(0, 50)}...`
          );

          // If it's an S3 URL, get a clean path for checking
          if (mediaPath.includes("/api/s3/")) {
            const s3Key = mediaPath.split("/api/s3/")[1];
            console.log(`Extracted S3 key for duplicate check: ${s3Key}`);
            try {
              const signedUrl = await s3Service.getSignedS3Url(s3Key);
              console.log(
                `Got signed URL for duplicate check: ${signedUrl.substring(
                  0,
                  50
                )}...`
              );
              const tempFile = await ffmpegUtils.downloadFileToTemp(signedUrl);
              if (tempFile) {
                console.log(
                  `Downloaded image to temp file for duplicate check: ${tempFile}`
                );
                isDuplicate = await PerceptualHashService.isImageDuplicate(
                  tempFile
                );
                console.log(`Duplicate check result for image: ${isDuplicate}`);
                // Clean up temp file
                try {
                  await fs.unlink(tempFile);
                } catch (e) {
                  console.error("Error deleting temp file:", e);
                }
              } else {
                console.error(
                  "Failed to download file to temp location for duplicate check"
                );
              }
            } catch (error) {
              console.error("Error checking image for duplicates:", error);
            }
          } else {
            console.log(
              "Image URL does not contain /api/s3/, skipping duplicate check"
            );
          }
        }

        if (isDuplicate) {
          console.log("DUPLICATE CONTENT DETECTED - Rejecting upload");
          return res.status(409).json({
            error: "Duplicate content detected",
            message:
              "This content appears to be a duplicate of existing content and cannot be uploaded.",
          });
        } else {
          console.log("No duplicate detected, proceeding with upload");
        }
      }

      // Auto-approve YouTube embeds
      if (
        videoData.contentType === "embed" &&
        videoData.embedCode &&
        videoData.embedCode.includes("youtube.com/embed")
      ) {
        videoData.reviewStatus = "approved";
      }

      // Fix for image uploads - set a default resolution for images
      if (videoData.contentType === "image") {
        videoData.resolution = "HD"; // Set a default resolution for images
        console.log("Setting default HD resolution for image upload");
      }

      // Create the video entry
      const video = await dbStorage.createVideo(videoData);

      // Compute and store perceptual hashes for non-embed content after successful upload
      if (video.contentType !== "embed") {
        try {
          // Schedule the hash computation to run asynchronously
          (async () => {
            try {
              await PerceptualHashService.computeAndStoreHashesForExistingContent(
                video.id
              );
              console.log(
                `Successfully generated perceptual hashes for content ID ${video.id}`
              );
            } catch (hashError) {
              console.error(
                `Failed to generate perceptual hashes for content ID ${video.id}:`,
                hashError
              );
            }
          })();
        } catch (hashError) {
          console.error(
            `Error scheduling perceptual hash computation for content ID ${video.id}:`,
            hashError
          );
          // Continue with the upload process even if hash computation fails
        }
      }

      // For newly uploaded content, make sure we set the correct thumbnail path
      // and generate a thumbnail if needed (especially for S3-uploaded content)
      try {
        // For videos, images, and embeds, update the thumbnail path to use our unified endpoint
        await dbStorage.updateVideo(video.id, {
          thumbnail: `/api/content/${video.id}/thumbnail`,
        });

        console.log(`Set unified thumbnail path for video ID ${video.id}`);

        // If it's a video or embed with a URL, let's trigger thumbnail generation immediately
        if (
          (video.contentType === "video" && video.videoUrl) ||
          (video.contentType === "embed" && video.embedCode)
        ) {
          // This will call the unified endpoint which will generate a thumbnail if needed
          try {
            console.log(
              `Triggering thumbnail generation for new ${video.contentType} with ID ${video.id}`
            );
            await fetch(
              `http://${process.env.HOST}:${process.env.PORT}/api/content/${video.id}/thumbnail?force=true`,
              {
                method: "GET",
              }
            );
            console.log(
              `Thumbnail generation triggered for content ID ${video.id}`
            );
          } catch (thumbnailError) {
            console.error(
              `Error triggering thumbnail generation for content ID ${video.id}:`,
              thumbnailError
            );
            // Continue even if thumbnail generation fails
          }
        }
      } catch (thumbnailError) {
        console.error(
          `Error updating thumbnail path for video ID ${video.id}:`,
          thumbnailError
        );
        // Continue without failing the request
      }

      // Return the created video
      res.status(201).json(video);
    } catch (error) {
      console.error("Error creating video:", error);
      res.status(400).json({ error: "Invalid video data" });
    }
  });

  app.get("/api/categories/:id/videos", async (req, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      const videos = await dbStorage.getVideosByCategory(categoryId);
      res.json(videos);
    } catch (error) {
      console.error("Error fetching videos by category:", error);
      res.status(500).json({ error: "Failed to fetch videos by category" });
    }
  });

  // Get paginated content with alternating pattern (3 rows videos, 2 rows images)
  // Cache declarations and implementation moved to contentFeedApi.ts

  // Simple test endpoint for FFmpeg
  app.get("/api/test-ffmpeg", async (req, res) => {
    try {
      console.log("Testing FFmpeg availability");

      // Test FFmpeg availability
      const ffmpegTest = await thumbnailService.testFFmpegAvailability();

      console.log(
        `FFmpeg test result: ${ffmpegTest.success ? "Success" : "Failed"}`
      );
      console.log(`Message: ${ffmpegTest.message}`);

      // Return the test results
      return res.json({
        success: ffmpegTest.success,
        message: ffmpegTest.message,
        details: ffmpegTest.details,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("FFmpeg test error:", error);
      res.status(500).json({
        success: false,
        error: String(error),
      });
    }
  });

  // Helper to get or create a cache key
  function getCacheKey(
    categorySlug: string,
    sortBy: string,
    shuffleSeed: string = ""
  ): string {
    return `${categorySlug || "all"}_${sortBy}_${shuffleSeed}`;
  }

  // Using shuffle seed to create a seeded random function
  function createSeededRandom(seed: string): () => number {
    // If no seed is provided, use standard Math.random()
    if (!seed) return Math.random;

    // Create a more robust seeded random number generator using multiple components
    // Ensure the seed is at least 10 characters long for better randomness
    const enhancedSeed = seed.length < 10 ? seed.padEnd(10, seed) : seed;

    // Initialize with better starting values for more distinct results between different seeds
    let s1 = 12345,
      s2 = 67890,
      s3 = 24680,
      s4 = 13579;

    // Use different parts of the seed with different algorithms
    for (let i = 0; i < enhancedSeed.length; i++) {
      const charCode = enhancedSeed.charCodeAt(i);
      s1 = (s1 << 5) - s1 + charCode; // Jenkins hash
      s2 = (s2 * 33) ^ charCode; // Multiplicative hash
      s3 = ((s3 << 7) + s3) ^ charCode; // Alternative shift
      s4 = s4 * 19 + charCode; // Another prime multiplier
    }

    // Make sure we have non-zero values
    s1 = s1 || 12345;
    s2 = s2 || 67890;
    s3 = s3 || 24680;
    s4 = s4 || 13579;

    // Use all seeds in the random function for better distribution
    let calls = 0;
    return function () {
      // Update each state value with different algorithms
      s1 = (s1 * 16807) % 2147483647; // Park-Miller LCG
      s2 = (s2 * 1664525 + 1013904223) >>> 0; // Numerical Recipes LCG
      s3 = s3 ^ (s3 << 13) ^ (s3 >>> 17); // XorShift
      s4 = (s4 * 48271) % 2147483647; // Another prime LCG

      // Combine all four components with different weights
      // This creates very different sequences even with similar seeds
      const n1 = s1 / 2147483647;
      const n2 = s2 / 4294967296;
      const n3 = s3 / 4294967296;
      const n4 = s4 / 2147483647;

      // Mix using different proportions and operations
      const result =
        (n1 * 0.3 + n2 * 0.3 + n3 * 0.2 + n4 * 0.2 + calls * 0.000001) % 1;

      calls++;
      return result;
    };
  }

  // Fisher-Yates shuffle with a seed
  function shuffleArray<T>(array: T[], seed: string): T[] {
    const result = [...array]; // Create a copy to avoid mutating the original
    const random = createSeededRandom(seed);

    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
  }

  // Helper to reset cache when needed
  function resetContentCache(key?: string, resetCategories: boolean = false) {
    if (key) {
      infiniteScrollCache.delete(key);
      console.log(
        `Reset content cache for ${key}, resetCategories=${resetCategories}`
      );
      if (resetCategories) {
        usedCategoriesCache.delete(key);
      }
    } else {
      infiniteScrollCache.clear();
      if (resetCategories) {
        usedCategoriesCache.clear();
      }
      console.log(
        `Reset ALL content cache, resetCategories=${resetCategories}`
      );
    }
  }

  // Helper function to add randomness to database queries based on shuffle seed
  function addRandomSorting(query: any, seed: string): any {
    if (!seed) return query;

    // Use modulo of ASCII values from seed to create a random order
    // This creates effectively random but deterministic sorting based on the seed
    let seedValue = 0;
    for (let i = 0; i < seed.length; i++) {
      seedValue += seed.charCodeAt(i);
    }

    // Use modulo to create different sort orders based on seed value
    const sortType = seedValue % 4;

    switch (sortType) {
      case 0:
        // Sort by ID ascending
        return query.orderBy(asc(videos.id));
      case 1:
        // Sort by ID descending
        return query.orderBy(desc(videos.id));
      case 2:
        // Sort by title ascending
        return query.orderBy(asc(videos.title));
      case 3:
        // Sort by title descending
        return query.orderBy(desc(videos.title));
      default:
        return query;
    }
  }

  // New API endpoint for the completely redesigned content feed
  app.get("/api/content/feed", handleContentFeed);

  // Deprecated endpoint - redirect to the new feed API
  app.get("/api/content/infinite", async (req, res) => {
    return res.status(301).json({
      error:
        "This API endpoint has been deprecated. Please use /api/content/feed instead.",
    });
  });

  app.delete("/api/videos/:id", isAuthenticated, async (req, res) => {
    try {
      ensureUser(req);
      const videoId = parseInt(req.params.id);

      // Check if video exists
      const video = await dbStorage.getVideoById(videoId);
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }

      // Check if the user is an admin or the owner of the video
      const isAdmin =
        req.user.isAdmin || req.user.id === 1 || req.user.id === 2;
      if (!isAdmin && video.userId && video.userId !== req.user.id) {
        return res
          .status(403)
          .json({ error: "You don't have permission to delete this content" });
      }

      await dbStorage.deleteVideo(videoId);

      res.status(200).json({ message: "Video deleted successfully" });
    } catch (error) {
      console.error("Error deleting video:", error);
      res.status(500).json({ error: "Failed to delete video" });
    }
  });

  // Update video endpoint
  app.put("/api/videos/:id", isAuthenticated, async (req, res) => {
    try {
      ensureUser(req);
      const videoId = parseInt(req.params.id);
      const { title, description, categoryId, aiGenerator, prompt, tags } =
        req.body;

      // Validate input
      if (!title || typeof title !== "string" || title.trim().length === 0) {
        return res.status(400).json({ error: "Title is required" });
      }

      if (title.length > 100) {
        return res
          .status(400)
          .json({ error: "Title must be 100 characters or less" });
      }

      if (
        description &&
        typeof description === "string" &&
        description.length > 500
      ) {
        return res
          .status(400)
          .json({ error: "Description must be 500 characters or less" });
      }

      if (
        aiGenerator &&
        typeof aiGenerator === "string" &&
        aiGenerator.length > 100
      ) {
        return res
          .status(400)
          .json({ error: "AI Generator must be 100 characters or less" });
      }

      if (prompt && typeof prompt === "string" && prompt.length > 1000) {
        return res
          .status(400)
          .json({ error: "Prompt must be 1000 characters or less" });
      }

      if (tags && typeof tags === "string" && tags.length > 200) {
        return res
          .status(400)
          .json({ error: "Tags must be 200 characters or less" });
      }

      // Check if video exists
      const video = await dbStorage.getVideoById(videoId);
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }

      // Check if the user is an admin or the owner of the video
      const isAdmin =
        req.user.isAdmin || req.user.id === 1 || req.user.id === 2;
      if (!isAdmin && video.userId && video.userId !== req.user.id) {
        return res
          .status(403)
          .json({ error: "You don't have permission to edit this content" });
      }

      // Update video
      const updatedVideo = await dbStorage.updateVideo(videoId, {
        title: title.trim(),
        description: description ? description.trim() : null,
        categoryId: categoryId ? parseInt(categoryId) : null,
        aiGenerator: aiGenerator ? aiGenerator.trim() : null,
        prompt: prompt ? prompt.trim() : null,
        tags: tags ? tags.trim() : null,
      });

      res.status(200).json({
        message: "Video updated successfully",
        video: updatedVideo,
      });
    } catch (error) {
      console.error("Error updating video:", error);
      res.status(500).json({ error: "Failed to update video" });
    }
  });

  // Wishlist endpoints
  app.get("/api/user/wishlist", isAuthenticated, async (req, res) => {
    try {
      ensureUser(req);
      const wishlist = await dbStorage.getUserWishlist(req.user.id);
      res.json(wishlist);
    } catch (error) {
      console.error("Error fetching user wishlist:", error);
      res.status(500).json({ error: "Failed to fetch user wishlist" });
    }
  });

  app.post("/api/videos/:id/wishlist", isAuthenticated, async (req, res) => {
    try {
      ensureUser(req);
      const videoId = parseInt(req.params.id);

      // Check if video exists
      const video = await dbStorage.getVideoById(videoId);
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }

      // Check if already in wishlist
      const isWishlisted = await dbStorage.isWishlisted(req.user.id, videoId);
      if (isWishlisted) {
        return res.status(400).json({ error: "Video already in wishlist" });
      }

      const wishlistItem = await dbStorage.addToWishlist({
        userId: req.user.id,
        videoId,
      });

      res.status(201).json(wishlistItem);
    } catch (error) {
      console.error("Error adding to wishlist:", error);
      res.status(500).json({ error: "Failed to add to wishlist" });
    }
  });

  app.delete("/api/videos/:id/wishlist", isAuthenticated, async (req, res) => {
    try {
      ensureUser(req);
      const videoId = parseInt(req.params.id);

      await dbStorage.removeFromWishlist(req.user.id, videoId);
      res.sendStatus(204);
    } catch (error) {
      console.error("Error removing from wishlist:", error);
      res.status(500).json({ error: "Failed to remove from wishlist" });
    }
  });

  // Like endpoints
  app.post("/api/videos/:id/like", async (req, res) => {
    try {
      console.log(`POST like request for video ID: ${req.params.id}`);
      console.log(
        `Request from IP: ${req.ip}, authenticated: ${req.isAuthenticated()}`
      );

      const videoId = parseInt(req.params.id);

      // Check if video exists
      const video = await dbStorage.getVideoById(videoId);
      if (!video) {
        console.log(`Video not found: ${videoId}`);
        return res.status(404).json({ error: "Video not found" });
      }

      // Prepare like object based on authentication state
      const likeData: InsertLike = {
        videoId,
        // Store either user ID (if authenticated) or IP/session (if anonymous)
        userId: req.isAuthenticated()
          ? (req.user as Express.User).id
          : undefined,
        ipAddress: !req.isAuthenticated() ? req.ip : undefined,
        sessionId: !req.isAuthenticated() ? req.sessionID : undefined,
      };

      console.log(`Like data: ${JSON.stringify(likeData)}`);

      // Check if already liked
      const isLiked = await dbStorage.isLiked(
        videoId,
        likeData.userId || undefined,
        likeData.ipAddress || undefined,
        likeData.sessionId || undefined
      );

      console.log(`Is video already liked? ${isLiked}`);

      if (isLiked) {
        return res.status(400).json({ error: "Already liked" });
      }

      // Add the like
      const like = await dbStorage.addLike(likeData);

      // Get updated like count
      const likeCount = await dbStorage.getLikeCount(videoId);

      console.log(`Added like. New count: ${likeCount}`);
      res.status(201).json({ like, count: likeCount });
    } catch (error) {
      console.error("Error adding like:", error);
      res.status(500).json({ error: "Failed to add like" });
    }
  });

  app.delete("/api/videos/:id/like", async (req, res) => {
    try {
      const videoId = parseInt(req.params.id);

      // Remove like based on authentication state
      if (req.isAuthenticated()) {
        const userId = (req.user as Express.User).id;
        await dbStorage.removeLike(videoId, userId);
      } else {
        // For anonymous users, use IP and session ID
        await dbStorage.removeLike(videoId, undefined, req.ip, req.sessionID);
      }

      // Get updated like count
      const likeCount = await dbStorage.getLikeCount(videoId);

      res.json({ success: true, count: likeCount });
    } catch (error) {
      console.error("Error removing like:", error);
      res.status(500).json({ error: "Failed to remove like" });
    }
  });

  // Use the already imported YouTube utilities

  // Unified thumbnail endpoint
  app.get("/api/content/:id/thumbnail", async (req, res) => {
    console.log(
      `Unified thumbnail endpoint requested for content ID: ${req.params.id}`
    );
    console.log(`Query params: ${JSON.stringify(req.query)}`);
    console.log("req.query", req.query);

    try {
      const contentId = parseInt(req.params.id);
      // Check if we're forcing a thumbnail regeneration
      const forceRegeneration = req.query.force === "true";
      const forcePlaceholder = req.query.placeholder === "true";
      console.log(
        `Force regeneration: ${forceRegeneration}, Force placeholder: ${forcePlaceholder}`
      );

      // Check if request is from admin (use the isAdmin middleware function manually)
      const isAdminRequest =
        req.isAuthenticated() &&
        (req.user.isAdmin || req.user.id === 1 || req.user.id === 2);

      if (!contentId) {
        throw new Error("Invalid content ID");
      }

      // Get content info from database
      const content = await dbStorage.getVideoById(contentId, true);
      if (!content) {
        throw new Error("Content not found");
      }

      // For admin users, use the real source URL even for pending content
      // This ensures admin can see thumbnails for content under review

      // Special case for YouTube embeds - handle them directly without Cloudinary
      if (content.contentType === "embed" && content.embedCode) {
        // Extract YouTube video ID using our unified ThumbnailService
        const youtubeId = thumbnailService.youtube.extractYouTubeVideoId(
          content.embedCode
        );

        if (youtubeId) {
          // Get the YouTube thumbnail URL directly
          const youtubeThumbnailUrl = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;

          console.log(
            `Directly using YouTube thumbnail for embed ${contentId}: ${youtubeThumbnailUrl}`
          );

          // Update thumbnail path to the unified endpoint
          if (
            !content.thumbnail ||
            !content.thumbnail.startsWith("/api/content/")
          ) {
            await dbStorage.updateVideo(contentId, {
              thumbnail: `/api/content/${contentId}/thumbnail`,
            });
            console.log(
              `Updated YouTube embed ${contentId} with unified thumbnail path`
            );
          }

          return res.redirect(youtubeThumbnailUrl);
        }
      }

      // Generate a new thumbnail if one of these conditions is true:
      // 1. Force regeneration is requested
      // 2. Placeholder is requested
      // 3. No existing thumbnail
      // 4. Thumbnail path doesn't match the unified endpoint pattern
      if (
        forceRegeneration ||
        forcePlaceholder ||
        !content.thumbnail ||
        !content.thumbnail.startsWith("/api/content/")
      ) {
        // Determine the appropriate source URL and YouTube ID (if applicable)
        let sourceUrl = null;
        let youtubeId = null;

        // Check if this is a pending content but being accessed by an admin
        // This allows admins to see real thumbnails for pending content
        const isPendingButAdminAccess =
          isAdminRequest && content.reviewStatus === "pending";

        if (
          content.contentType === "video" ||
          content.contentType === "videos"
        ) {
          sourceUrl = content.videoUrl;
          if (sourceUrl && isPendingButAdminAccess) {
            console.log(
              `Admin access to pending video thumbnail ${contentId}, using real source URL`
            );
          }
        } else if (
          content.contentType === "image" ||
          content.contentType === "images"
        ) {
          sourceUrl = content.imageUrl;
          if (sourceUrl && isPendingButAdminAccess) {
            console.log(
              `Admin access to pending image thumbnail ${contentId}, using real source URL`
            );
          }
        } else if (content.contentType === "embed") {
          // Use unified ThumbnailService for YouTube ID extraction
          const thumbnailService = await import("./services/ThumbnailService");
          youtubeId = thumbnailService.youtube.extractYouTubeVideoId(
            content.embedCode || ""
          );
          if (youtubeId) {
            sourceUrl = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
            console.log(
              `Extracted YouTube ID: ${youtubeId}, using source URL: ${sourceUrl}`
            );
          }
        }

        // For admin access to pending content, ensure we have direct access to the media file
        if (
          isPendingButAdminAccess &&
          !sourceUrl &&
          content.contentType === "video" &&
          content.videoUrl
        ) {
          // Get a signed S3 URL for the video file if possible
          try {
            const s3Key = urlPathToS3Key(content.videoUrl);
            sourceUrl = await getSignedS3Url(s3Key);
            console.log(
              `Admin thumbnail access: Using direct S3 URL for pending video ${contentId}`
            );
          } catch (s3Error) {
            console.error("Admin S3 access error:", s3Error);
          }
        }

        console.log(
          `Generating thumbnail for content ID ${content.id}, type: ${content.contentType}`
        );
        console.log(
          `Source URL: ${
            sourceUrl ? sourceUrl.substring(0, 50) + "..." : "none"
          }, YouTube ID: ${youtubeId || "none"}`
        );

        // Generate thumbnail using our new unified ThumbnailService
        // The service will handle all the different cases internally
        const result = await thumbnailService.generateThumbnail({
          contentId: content.id,
          contentType: content.contentType,
          sourceUrl: sourceUrl,
          youtubeId: youtubeId,
          forceRegeneration: forceRegeneration,
          generatePlaceholder: forcePlaceholder,
        });

        // Extract the S3 key from the result
        let s3Key = result.thumbnailPath;

        // Log the method used to generate the thumbnail
        console.log(`Thumbnail generated using method: ${result.method}`);

        // The thumbnail has already been generated and stored at this point
        // by our unified ThumbnailService

        // Update content record with the new unified thumbnail endpoint path
        await dbStorage.updateVideo(content.id, {
          thumbnail: `/api/content/${content.id}/thumbnail`,
        });
        console.log(
          `Updated content ID ${content.id} with unified thumbnail path`
        );

        // Redirect to S3 URL for the generated thumbnail
        const s3Url = await getSignedS3Url(s3Key);
        console.log(
          `Redirecting to S3 URL for newly generated thumbnail: ${s3Url.substring(
            0,
            100
          )}...`
        );
        return res.redirect(s3Url);
      }

      // Return existing thumbnail using our unified ThumbnailService
      console.log(
        `Using unified ThumbnailService to get URL for existing thumbnail of content ${content.id}`
      );
      try {
        // Use our unified method to get a signed URL
        const s3Url = await thumbnailService.getThumbnailUrl(
          content.id,
          content.contentType
        );

        console.log(
          `Redirecting to existing thumbnail from unified service: ${s3Url.substring(
            0,
            100
          )}...`
        );
        return res.redirect(s3Url);
      } catch (urlError) {
        console.error(`Error getting existing thumbnail URL: ${urlError}`);

        // If we can't get a URL, fallback to old methods for backward compatibility
        console.log(
          `Falling back to compatibility methods for content ${content.id}`
        );

        let existingThumbnailPath = content.thumbnail;

        // If using the old API path, convert to S3 key
        if (existingThumbnailPath.startsWith("/api/videos/")) {
          try {
            // For backward compatibility - this will be updated on next access
            const { getThumbnailS3Key, getSignedS3Url } = await import(
              "./services/ThumbnailService/storage"
            );
            const thumbnailS3Key = getThumbnailS3Key(
              content.id,
              content.contentType
            );
            const s3Url = await getSignedS3Url(thumbnailS3Key);
            return res.redirect(s3Url);
          } catch (oldPathError) {
            console.error(`Error with old API path: ${oldPathError}`);
            // Continue to next fallback
          }
        }

        // If all else fails, generate a placeholder
        console.log(
          `All methods failed, generating placeholder for ${content.id}`
        );
        const placeholderResult = await thumbnailService.generateThumbnail({
          contentId: content.id,
          contentType: content.contentType,
          generatePlaceholder: true,
        });

        // Import storage functions directly
        const { getSignedS3Url } = await import(
          "./services/ThumbnailService/storage"
        );
        const s3Url = await getSignedS3Url(placeholderResult.thumbnailPath);
        return res.redirect(s3Url);
      }
    } catch (error) {
      console.error("Thumbnail error:", error);
      // If an error occurs, redirect to a placeholder
      return res.redirect(
        `/api/placeholder-svg/${req.query.contentType || "unknown"}`
      );
    }
  });

  app.get("/api/placeholder-svg/:type", async (req, res) => {
    try {
      const contentType = req.params.type || "unknown";
      console.log(
        `Generating placeholder SVG for content type: ${contentType}`
      );

      // Use our unified ThumbnailService
      const placeholderResult = await thumbnailService.generateThumbnail({
        contentId: 999999, // Using a high ID to avoid conflicts
        contentType: contentType,
        generatePlaceholder: true,
      });

      // Check if we've got a valid result
      if (placeholderResult && placeholderResult.success) {
        // Try to get the actual SVG content from S3
        try {
          // Get the URL and fetch it
          const { getSignedS3Url } = await import(
            "./services/ThumbnailService/storage"
          );
          const s3Url = await getSignedS3Url(placeholderResult.thumbnailPath);
          const svgResponse = await fetch(s3Url);
          if (svgResponse.ok) {
            const svgContent = await svgResponse.text();

            // Send it back
            res.setHeader("Content-Type", "image/svg+xml");
            res.setHeader("Cache-Control", "public, max-age=86400"); // Cache for a day
            return res.send(svgContent);
          }
        } catch (fetchError) {
          console.error("Error fetching SVG from S3:", fetchError);
          // Continue to fallback
        }
      }

      // Fallback: Generate on the fly without using S3
      // Generate a simple placeholder SVG
      let fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
        <rect width="100%" height="100%" fill="#0f172a"/>
        <text x="50%" y="50%" font-family="Arial" font-size="24" fill="#f59e0b" text-anchor="middle">
          DeepTubeAI ${contentType.charAt(0).toUpperCase() + contentType.slice(1)}
        </text>
      </svg>`;

      res.setHeader("Content-Type", "image/svg+xml");
      return res.send(fallbackSvg);
    } catch (error) {
      console.error("Error generating SVG placeholder:", error);
      // Fallback to a simple SVG
      const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
        <rect width="100%" height="100%" fill="#0f172a"/>
        <text x="50%" y="50%" font-family="Arial" font-size="24" fill="#f59e0b" text-anchor="middle">
          DeepTubeAI Thumbnail
        </text>
      </svg>`;
      res.setHeader("Content-Type", "image/svg+xml");
      return res.send(fallbackSvg);
    }
  });

  // Endpoint '/api/admin/regenerate-video-thumbnails' removed as requested

  // Cloudinary test endpoints removed

  // Regenerate all thumbnails using Cloudinary
  // Endpoint '/api/regenerate-all-thumbnails' removed as requested

  // Admin API for regenerating a single thumbnail using Cloudinary
  app.post(
    "/api/admin/regenerate-video-thumbnail/:videoId",
    isAdmin,
    async (req, res) => {
      try {
        const videoId = parseInt(req.params.videoId);
        if (isNaN(videoId)) {
          return res.status(400).json({ error: "Invalid video ID" });
        }

        // Get the video entry
        const video = await dbStorage.getVideoById(videoId);
        if (!video) {
          return res.status(404).json({ error: "Video not found" });
        }

        console.log(
          `Admin requested thumbnail regeneration for ${video.contentType} ${videoId}:`
        );
        console.log(` - Title: ${video.title}`);
        console.log(` - Content Type: ${video.contentType}`);

        // Special case for YouTube embeds - handle directly without Cloudinary
        if (video.contentType === "embed" && video.embedCode) {
          // Extract YouTube video ID
          const youtubeId = youtubeUtils.extractYouTubeVideoId(video.embedCode);

          if (youtubeId) {
            console.log(` - Detected YouTube embed with ID: ${youtubeId}`);

            // Update the video record with the unified thumbnail path
            await dbStorage.updateVideo(videoId, {
              thumbnail: `/api/content/${videoId}/thumbnail`,
            });

            return res.json({
              success: true,
              message: `Successfully updated YouTube embed thumbnail for ${videoId}`,
              videoId,
              thumbnailUrl: `/api/content/${videoId}/thumbnail`,
              youtubeId,
            });
          }
        }

        // For non-YouTube content, proceed with normal flow
        // Get the appropriate source URL based on content type
        const sourceUrl =
          video.contentType === "video"
            ? video.videoUrl
            : video.contentType === "image"
            ? video.imageUrl
            : null;

        if (!sourceUrl && video.contentType !== "embed") {
          return res.status(400).json({ error: "Content has no source URL" });
        }

        // Detect YouTube embed and extract video ID if present
        let youtubeId = null;
        if (video.contentType === "embed" && video.embedCode) {
          // Use the youtube utility from ThumbnailService
          youtubeId = youtubeUtils.extractYouTubeVideoId(video.embedCode);
        }

        console.log(` - Source URL: ${sourceUrl || "None (embed)"}`);
        console.log(` - YouTube ID: ${youtubeId || "None"}`);

        // Generate thumbnail using our unified ThumbnailService
        const result = await thumbnailService.generateThumbnail({
          contentId: videoId,
          contentType: video.contentType,
          sourceUrl: sourceUrl,
          youtubeId: youtubeId,
          forceRegeneration: true,
        });

        // Update the video record with the unified thumbnail path
        await dbStorage.updateVideo(videoId, {
          thumbnail: `/api/content/${videoId}/thumbnail`,
        });

        return res.json({
          success: true,
          message: `Successfully regenerated thumbnail for ${video.contentType} ${videoId} using method: ${result.method}`,
          videoId,
          thumbnailPath: result.thumbnailPath,
          method: result.method,
          thumbnailUrl: `/api/content/${videoId}/thumbnail`,
        });
      } catch (error) {
        console.error(`Error regenerating video thumbnail:`, error);
        return res.status(500).json({
          error: "Failed to regenerate video thumbnail",
          details: String(error),
        });
      }
    }
  );

  // Test endpoint for thumbnail generation using Cloudinary
  app.get("/api/regenerate-thumbnail/:id", async (req, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const video = await dbStorage.getVideoById(videoId);

      if (!video) {
        return res.status(404).json({ error: "Content not found" });
      }

      // Special case for YouTube embeds - handle directly without Cloudinary
      if (video.contentType === "embed" && video.embedCode) {
        // Extract YouTube video ID
        const youtubeId = youtubeUtils.extractYouTubeVideoId(video.embedCode);

        if (youtubeId) {
          console.log(
            `Detected YouTube embed with ID: ${youtubeId} for content ${videoId}`
          );

          // Update to use unified thumbnail path
          await dbStorage.updateVideo(videoId, {
            thumbnail: `/api/content/${videoId}/thumbnail`,
          });

          return res.json({
            success: true,
            message: `Thumbnail updated for YouTube embed ${videoId}`,
            thumbnailUrl: `/api/content/${videoId}/thumbnail`,
            contentType: video.contentType,
            youtubeId,
            directYoutubeUrl: youtubeUtils.getYouTubeThumbnailUrl(
              youtubeId,
              "hqdefault"
            ),
          });
        }
      }

      // Get the source URL based on content type
      let sourceUrl = null;
      let youtubeId = null;

      if (video.contentType === "video" || video.contentType === "videos") {
        sourceUrl = video.videoUrl;
      } else if (
        video.contentType === "image" ||
        video.contentType === "images"
      ) {
        sourceUrl = video.imageUrl;
      } else if (video.contentType === "embed" && video.embedCode) {
        // Try to extract YouTube ID using the ThumbnailService youtube utility
        youtubeId = youtubeUtils.extractYouTubeVideoId(video.embedCode);
      }

      // If no source URL or YouTube ID is available, we'll use a placeholder
      const generatePlaceholder = !sourceUrl && !youtubeId;

      // Generate thumbnail using our unified ThumbnailService
      console.log(
        `Generating thumbnail for ${video.contentType} ${videoId} using unified service`
      );
      console.log(` - Using placeholder: ${generatePlaceholder}`);
      const result = await thumbnailService.generateThumbnail({
        contentId: videoId,
        contentType: video.contentType,
        sourceUrl: sourceUrl,
        youtubeId: youtubeId,
        forceRegeneration: true,
        generatePlaceholder: generatePlaceholder,
      });

      // Update to use unified thumbnail path
      await dbStorage.updateVideo(videoId, {
        thumbnail: `/api/content/${videoId}/thumbnail`,
      });

      res.json({
        success: true,
        message: `Thumbnail regenerated for ${video.contentType} ${videoId} using method: ${result.method}`,
        thumbnailUrl: `/api/content/${videoId}/thumbnail`,
        contentType: video.contentType,
        sourceUrl,
        youtubeId,
        thumbnailPath: result.thumbnailPath,
        method: result.method,
      });
    } catch (error) {
      console.error("Error regenerating thumbnail:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Thumbnail endpoint
  app.get("/api/videos/:id/thumbnail", async (req, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const forceSvg = req.query.forcesvg === "true";
      const cacheBust = req.query.cachebust || req.query.t;

      // Make sure the naming convention is consistent between local and S3
      const thumbnailPath = `./thumbnails/video-${videoId}.jpg`;
      const s3Key = `thumbnails/video-${videoId}.jpg`;
      const fs = await import("fs/promises");
      const fsSync = await import("fs");
      const { execFile } = await import("child_process");
      const util = await import("util");
      const execFilePromise = util.promisify(execFile);
      const path = await import("path");

      // Get the video data
      const video = await dbStorage.getVideoById(videoId);
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }

      // If forceSvg is true, immediately return SVG placeholder
      if (forceSvg) {
        console.log(`Serving SVG placeholder for video ${videoId} (forced)`);
        // Use the content type to determine which placeholder to show
        return sendSvgPlaceholder(res, video.contentType);
      }

      // Special handling for YouTube embeds - extract YouTube ID and redirect to thumbnail
      if (
        video.contentType === "embed" &&
        video.embedCode &&
        (video.embedCode.includes("youtube.com") ||
          video.embedCode.includes("youtu.be"))
      ) {
        // Extract YouTube video ID from embed code with multiple pattern matching
        const ytMatch = video.embedCode.match(
          /(?:youtube\.com\/embed\/|youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/
        );
        if (ytMatch && ytMatch[1]) {
          const youtubeId = ytMatch[1];

          // Use high quality thumbnail with fallback to medium quality
          // We'll try to fetch and detect if maxresdefault exists, but we'll use the standard thumbnail as a safe option
          const youtubeThumbnailUrl = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;

          console.log(
            `Redirecting to YouTube thumbnail for video ${videoId}: ${youtubeThumbnailUrl}`
          );
          return res.redirect(youtubeThumbnailUrl);
        }
      }

      // Disable caching for all thumbnail responses to ensure freshness
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");

      // Log video information for debugging
      console.log(`Generating thumbnail for video ${videoId}:`);
      console.log(` - Title: ${video.title}`);
      console.log(` - Content Type: ${video.contentType}`);
      console.log(` - Video URL: ${video.videoUrl || "None"}`);
      console.log(` - Existing Thumbnail: ${video.thumbnail || "None"}`);

      // If video has a pre-defined thumbnail, handle it
      if (
        video.thumbnail &&
        !video.thumbnail.includes("placehold.co") &&
        !video.thumbnail.startsWith("data:")
      ) {
        // If thumbnail is internal API route, serve the file directly instead of redirecting
        if (video.thumbnail === `/api/videos/${videoId}/thumbnail`) {
          // Try S3 first, but proxy the request instead of redirecting
          try {
            const signedUrl = await getSignedS3Url(s3Key);
            console.log(
              `Proxying S3 image instead of redirecting for ${videoId}`
            );

            // Get the data and stream it through our server
            const https = await import("https");
            const http = await import("http");
            const protocol = signedUrl.startsWith("https:") ? https : http;

            const proxyRequest = protocol.get(signedUrl, (proxyRes) => {
              if (proxyRes.statusCode === 200) {
                // Set appropriate content type
                res.setHeader(
                  "Content-Type",
                  proxyRes.headers["content-type"] || "image/jpeg"
                );
                // Pipe the S3 response directly to our response
                proxyRes.pipe(res);
              } else {
                // If S3 request fails, fall back to SVG
                console.error(
                  `S3 proxy request failed with status ${proxyRes.statusCode}`
                );
                res.setHeader("Content-Type", "image/svg+xml");
                res.sendFile(
                  path.resolve("./public/default-video-thumbnail.svg")
                );
              }
            });

            proxyRequest.on("error", (error) => {
              console.error(`Error proxying S3 image: ${error.message}`);
              res.setHeader("Content-Type", "image/svg+xml");
              res.sendFile(
                path.resolve("./public/default-video-thumbnail.svg")
              );
            });

            return; // This is important - we need to exit here since the response is handled asynchronously
          } catch (s3Error) {
            // S3 failed, fallback to local file
            try {
              // Check if the cached thumbnail file exists locally
              await fs.access(thumbnailPath);
              // Serve it directly
              return res.sendFile(path.resolve(thumbnailPath));
            } catch (err) {
              // If not yet generated, don't redirect to avoid loops
              console.log(
                `Thumbnail reference exists but file doesn't, regenerating for ${videoId}`
              );
              // Continue with normal processing
            }
          }
        } else {
          // For external URLs, redirect
          return res.redirect(video.thumbnail);
        }
      }

      // If we have a thumbnail already generated, serve it
      try {
        // Try S3 first, but use our new proxy method
        try {
          const signedUrl = await getSignedS3Url(s3Key);
          console.log(
            `Proxying S3 image instead of redirecting for ${videoId} (second case)`
          );

          // Get the data and stream it through our server
          const https = await import("https");
          const http = await import("http");
          const protocol = signedUrl.startsWith("https:") ? https : http;

          const proxyRequest = protocol.get(signedUrl, (proxyRes) => {
            if (proxyRes.statusCode === 200) {
              // Set appropriate content type
              res.setHeader(
                "Content-Type",
                proxyRes.headers["content-type"] || "image/jpeg"
              );
              // Pipe the S3 response directly to our response
              proxyRes.pipe(res);
            } else {
              // If S3 request fails, fall back to local file if available
              console.error(
                `S3 proxy request failed with status ${proxyRes.statusCode}`
              );
              try {
                fs.access(thumbnailPath)
                  .then(() => {
                    res.sendFile(path.resolve(thumbnailPath));
                  })
                  .catch(() => {
                    res.setHeader("Content-Type", "image/svg+xml");
                    return sendSvgPlaceholder(res, video.contentType);
                  });
              } catch {
                res.setHeader("Content-Type", "image/svg+xml");
                res.sendFile(
                  path.resolve("./public/default-video-thumbnail.svg")
                );
              }
            }
          });

          proxyRequest.on("error", (error) => {
            console.error(`Error proxying S3 image: ${error.message}`);
            try {
              fs.access(thumbnailPath)
                .then(() => {
                  res.sendFile(path.resolve(thumbnailPath));
                })
                .catch(() => {
                  res.setHeader("Content-Type", "image/svg+xml");
                  res.sendFile(
                    path.resolve("./public/default-video-thumbnail.svg")
                  );
                });
            } catch {
              res.setHeader("Content-Type", "image/svg+xml");
              res.sendFile(
                path.resolve("./public/default-video-thumbnail.svg")
              );
            }
          });

          return; // This is important - we need to exit here since the response is handled asynchronously
        } catch (s3Error) {
          // S3 failed, try local file
          try {
            await fs.access(thumbnailPath);
            // If file exists, serve it
            return res.sendFile(path.resolve(thumbnailPath));
          } catch (fsErr) {
            // Local file doesn't exist either
            throw fsErr; // Rethrow to be caught by outer catch
          }
        }
      } catch (err) {
        // Neither S3 nor local file exists, continue to generate it
        console.log(
          `Thumbnail doesn't exist yet for video ${videoId}, generating now...`
        );
      }

      // For videos with local file paths (MP4, WebM, etc.), generate a real thumbnail
      if (video.contentType === "video" && video.videoUrl) {
        // Clean the URL - handle both base64 and file path formats
        let videoPath = video.videoUrl;

        if (videoPath.startsWith("data:")) {
          // For base64 videos - can't generate thumbnails from these directly
          console.log(`Serving SVG placeholder for base64 video ${videoId}`);
          return sendSvgPlaceholder(res);
        } else if (videoPath.startsWith("http")) {
          // Remote URL - try to use a frame grab from S3 if already exists
          try {
            const signedUrl = await getSignedS3Url(s3Key);
            console.log(
              `Proxying S3 image instead of redirecting for ${videoId} (remote URL case)`
            );

            // Get the data and stream it through our server
            const https = await import("https");
            const http = await import("http");
            const protocol = signedUrl.startsWith("https:") ? https : http;

            const proxyRequest = protocol.get(signedUrl, (proxyRes) => {
              if (proxyRes.statusCode === 200) {
                // Set appropriate content type
                res.setHeader(
                  "Content-Type",
                  proxyRes.headers["content-type"] || "image/jpeg"
                );
                // Pipe the S3 response directly to our response
                proxyRes.pipe(res);
              } else {
                // If S3 request fails, fall back to SVG
                console.error(
                  `S3 proxy request failed with status ${proxyRes.statusCode}`
                );
                res.setHeader("Content-Type", "image/svg+xml");
                res.sendFile(
                  path.resolve("./public/default-video-thumbnail.svg")
                );
              }
            });

            proxyRequest.on("error", (error) => {
              console.error(`Error proxying S3 image: ${error.message}`);
              res.setHeader("Content-Type", "image/svg+xml");
              res.sendFile(
                path.resolve("./public/default-video-thumbnail.svg")
              );
            });

            return; // This is important - we need to exit here since the response is handled asynchronously
          } catch (s3Error) {
            // If S3 thumbnail doesn't exist, fallback to a better placeholder
            res.setHeader("Content-Type", "image/svg+xml");
            return res.sendFile(
              path.resolve("./public/default-video-thumbnail.svg")
            );
          }
        } else {
          // Local file path - clean it up if needed
          // If the path starts with a slash but doesn't have a proper directory prefix
          if (videoPath.startsWith("/")) {
            // Remove the leading slash and make it relative to current directory
            videoPath = `.${videoPath}`;
          }

          // Make sure we don't have a double period at the start
          if (videoPath.startsWith(".//")) {
            videoPath = videoPath.replace(".//", "./");
          }

          // If it doesn't start with ./, add it
          if (!videoPath.startsWith("./")) {
            videoPath = `./${videoPath}`;
          }

          // Make sure the path exists
          try {
            await fs.access(videoPath);

            // Generate a thumbnail using ffmpeg
            console.log(
              `Generating thumbnail for ${videoPath} to ${thumbnailPath}`
            );

            try {
              // More robust thumbnail generation with multiple fallback positions
              // and added verbose logging for debugging
              console.log(
                `Running FFmpeg command to generate thumbnail from ${videoPath}`
              );

              // First try 1 second in
              try {
                await execFilePromise("ffmpeg", [
                  "-i",
                  videoPath,
                  "-ss",
                  "00:00:01.000",
                  "-vframes",
                  "1",
                  "-vf",
                  "scale=800:450",
                  "-y", // Overwrite if exists
                  thumbnailPath,
                ]);

                console.log(
                  `FFmpeg successfully generated thumbnail at position 1s`
                );
              } catch (err1) {
                console.error(`Failed to generate thumbnail at 1s:`, err1);

                // Try 3 seconds in if 1s fails
                try {
                  await execFilePromise("ffmpeg", [
                    "-i",
                    videoPath,
                    "-ss",
                    "00:00:03.000",
                    "-vframes",
                    "1",
                    "-vf",
                    "scale=800:450",
                    "-y",
                    thumbnailPath,
                  ]);

                  console.log(
                    `FFmpeg successfully generated thumbnail at position 3s`
                  );
                } catch (err2) {
                  console.error(
                    `Failed to generate thumbnail at 3s too:`,
                    err2
                  );

                  // Last attempt with simpler command
                  await execFilePromise("ffmpeg", [
                    "-i",
                    videoPath,
                    "-vframes",
                    "1",
                    "-vf",
                    "scale=800:450",
                    "-y",
                    thumbnailPath,
                  ]);
                }
              }

              console.log(
                `Successfully generated thumbnail for video ${videoId}`
              );

              // Upload the thumbnail to S3
              try {
                await uploadFileToS3(thumbnailPath, s3Key);
                console.log(`Uploaded thumbnail to S3: ${s3Key}`);
              } catch (s3Error) {
                console.error(`Failed to upload thumbnail to S3: ${s3Error}`);
                // Continue even if S3 upload fails
              }

              // Update the video record with the thumbnail path
              await dbStorage.updateVideo(videoId, {
                thumbnail: `/api/videos/${videoId}/thumbnail`,
              });

              // Serve the generated thumbnail
              return res.sendFile(path.resolve(thumbnailPath));
            } catch (ffmpegError) {
              console.error("Error running FFmpeg:", ffmpegError);
              throw new Error("Failed to generate thumbnail with FFmpeg");
            }
          } catch (fileError) {
            console.error(`Video file not found: ${videoPath}`, fileError);
            throw new Error("Video file not found");
          }
        }
      }

      // For YouTube embeds, try to get a thumbnail from YouTube
      if (
        video.contentType === "embed" &&
        video.embedCode &&
        video.embedCode.includes("youtube.com/embed/")
      ) {
        const youtubeIdMatch = video.embedCode.match(
          /youtube\.com\/embed\/([\w-]+)/
        );
        if (youtubeIdMatch && youtubeIdMatch[1]) {
          const youtubeId = youtubeIdMatch[1];
          const youtubeThumbnailUrl = `https://img.youtube.com/vi/${youtubeId}/0.jpg`;

          // Update the video with the YouTube thumbnail URL
          await dbStorage.updateVideo(videoId, {
            thumbnail: youtubeThumbnailUrl,
          });

          return res.redirect(youtubeThumbnailUrl);
        }
      }

      // For image content, check if we have the image URL to use
      if (
        (video.contentType === "image" || video.contentType === "images") &&
        video.imageUrl
      ) {
        // If the image is an actual URL and not a base64 or placeholder
        if (
          video.imageUrl.startsWith("http") &&
          !video.imageUrl.includes("placehold.co")
        ) {
          console.log(
            `Processing image URL for content ${videoId}: ${video.imageUrl}`
          );

          // Check if the URL is directly accessible (not S3)
          if (!video.imageUrl.includes("amazonaws.com")) {
            return res.redirect(video.imageUrl);
          } else {
            // For S3 URLs, we need to proxy them
            try {
              // Parse the S3 URL to get the key
              const s3UrlMatch = video.imageUrl.match(
                /https:\/\/([^.]+)\.s3\.([^.]+)\.amazonaws\.com\/(.*)/i
              );

              if (s3UrlMatch && s3UrlMatch.length >= 4) {
                const s3Key = s3UrlMatch[3]; // The key part of the URL
                const s3KeyForThumbnail = `thumbnails/video-${videoId}.jpg`;

                console.log(
                  `Using S3 key for ${videoId}: Original=${s3Key}, Thumbnail=${s3KeyForThumbnail}`
                );

                // We'll try both the original key and the thumbnail key
                try {
                  // Get the data and stream it through our server
                  const https = await import("https");
                  console.log(`Proxying S3 image URL for ${videoId}`);

                  const proxyRequest = https.get(video.imageUrl, (proxyRes) => {
                    if (proxyRes.statusCode === 200) {
                      // Set appropriate content type
                      res.setHeader(
                        "Content-Type",
                        proxyRes.headers["content-type"] || "image/jpeg"
                      );
                      // Pipe the response directly to our response
                      proxyRes.pipe(res);
                    } else if (
                      proxyRes.statusCode === 403 ||
                      proxyRes.statusCode === 404
                    ) {
                      // If Access Denied or Not Found, we need to try a different approach
                      console.log(
                        `S3 access failed with status ${proxyRes.statusCode}, generating SVG placeholder`
                      );
                      // Check if we need to upload an image based on the content
                      const displayContentType =
                        video.contentType === "images"
                          ? "image"
                          : video.contentType;
                      if (
                        displayContentType === "image" &&
                        video.imageUrl &&
                        video.imageUrl.startsWith("http")
                      ) {
                        console.log(
                          `For ${videoId}: Need to upload image from URL to S3`
                        );
                        // We should upload this to S3 in the background
                        setTimeout(async () => {
                          try {
                            // Use imageUrl directly to get the image
                            if (!video.imageUrl) {
                              console.warn(
                                "Thumbnail migration failed - no source image URL"
                              );
                              return;
                            }
                            const imageResponse = await fetch(video.imageUrl, {
                              method: "GET",
                            });
                            if (imageResponse.ok) {
                              const imageBuffer = Buffer.from(
                                await imageResponse.arrayBuffer()
                              );
                              // Upload to S3 using the standard thumbnail key pattern
                              const s3UploadResult = await uploadStringToS3(
                                imageBuffer.toString("base64"),
                                s3KeyForThumbnail,
                                "image/jpeg"
                              );
                              console.log(
                                `Successfully uploaded image for ${videoId} to S3 as ${s3KeyForThumbnail}`
                              );
                            }
                          } catch (uploadErr) {
                            console.error(
                              `Failed to upload image for ${videoId} to S3:`,
                              uploadErr
                            );
                          }
                        }, 100);
                      }
                      return sendSvgPlaceholder(res, displayContentType);
                    } else {
                      // For other errors, just use the placeholder
                      console.error(
                        `Proxy request failed with status ${proxyRes.statusCode}`
                      );
                      return sendSvgPlaceholder(res, video.contentType);
                    }
                  });

                  proxyRequest.on("error", (error) => {
                    console.error(`Error proxying image: ${error.message}`);
                    return sendSvgPlaceholder(res, video.contentType);
                  });

                  return; // This is important - we need to exit here since the response is handled asynchronously
                } catch (proxyError) {
                  console.error("Error proxying S3 image URL:", proxyError);
                  return sendSvgPlaceholder(res, video.contentType);
                }
              } else {
                console.error("Invalid S3 URL format:", video.imageUrl);
                return sendSvgPlaceholder(res, video.contentType);
              }
            } catch (error) {
              console.error("Error processing S3 URL:", error);
              return sendSvgPlaceholder(res, video.contentType);
            }
          }
        }
      }

      // Generate a generic video/image thumbnail based on content type
      // Map 'videos' to 'video' and 'images' to 'image' for consistent SVG generation
      let displayContentType = video.contentType;
      if (displayContentType === "videos") displayContentType = "video";
      if (displayContentType === "images") displayContentType = "image";

      console.log(
        `Serving SVG placeholder by content type for ${videoId}: ${displayContentType}`
      );
      return sendSvgPlaceholder(res, displayContentType);
    } catch (error) {
      console.error("Error generating thumbnail:", error);
      console.log(`Serving SVG placeholder due to error`);
      return sendSvgPlaceholder(res, "unknown");
    }
  });

  app.get("/api/videos/:id/like", async (req, res) => {
    try {
      const videoId = parseInt(req.params.id);

      // Check like status based on authentication state
      let isLiked = false;
      if (req.isAuthenticated()) {
        const userId = (req.user as Express.User).id;
        isLiked = await dbStorage.isLiked(videoId, userId);
      } else {
        // For anonymous users, use IP and session ID
        isLiked = await dbStorage.isLiked(
          videoId,
          undefined,
          req.ip,
          req.sessionID
        );
      }

      // Get like count
      const likeCount = await dbStorage.getLikeCount(videoId);

      res.json({ isLiked, count: likeCount });
    } catch (error) {
      console.error("Error checking like status:", error);
      res.status(500).json({ error: "Failed to check like status" });
    }
  });

  // Video/image API routes

  // Video/Image detail endpoint
  app.get("/api/videos/:id", async (req, res) => {
    try {
      const videoId = parseInt(req.params.id);
      console.log("API: Fetching video with ID:", videoId);

      if (isNaN(videoId)) {
        console.error("Invalid video ID:", req.params.id);
        return res.status(400).json({ error: "Invalid video ID format" });
      }

      // Always skip visibility check - allow all content to be viewed by anyone
      // This makes all content (including pending) accessible by all users
      const skipVisibilityCheck = true;

      // Get video details without visibility restrictions
      const video = await dbStorage.getVideoById(videoId, skipVisibilityCheck);

      if (!video) {
        console.error("Video not found with ID:", videoId);
        return res.status(404).json({ error: "Video/Image not found" });
      }

      // If the content is pending review, add a notice for the admin
      const userIsAdmin = req.user && (req.user.isAdmin || req.user.id === 1 || req.user.id === 2);
      if (userIsAdmin && video.reviewStatus === "pending") {
        video.adminNotice =
          "This content is pending review and not visible to regular users";
      }

      // Increment view count
      const newViewCount = await dbStorage.incrementViews(videoId);
      console.log(
        `API: Incremented view count for video ${videoId} to ${newViewCount}`
      );

      // Update views count in video object
      video.views = newViewCount;

      console.log(
        "API: Retrieved video:",
        video.id,
        video.title,
        "Content type:",
        video.contentType
      );

      // Debug video URL for MP4 videos
      if (video.contentType === "video" && video.videoUrl) {
        console.log("API: Video URL data:", {
          urlLength: video.videoUrl.length,
          urlPreview: video.videoUrl.substring(0, 50) + "...",
          isMimeTypeIncluded: video.videoUrl.includes("data:video"),
          isMP4: video.videoUrl.includes("mp4"),
          urlStart: video.videoUrl.substring(0, 30),
        });
      }

      // Get category info
      const category = video.categoryId
        ? await dbStorage.getCategoryById(video.categoryId)
        : null;

      // Get comments
      const comments = await dbStorage.getCommentsByVideoId(videoId);
      console.log(
        "API: Retrieved",
        comments.length,
        "comments for video",
        videoId
      );

      // Check if item is wishlisted by current user (if authenticated)
      let isWishlisted = false;
      if (req.isAuthenticated() && req.user) {
        isWishlisted = await dbStorage.isWishlisted(req.user.id, videoId);
      }

      // Modify embed code for proper rendering
      if (video.contentType === "embed" && video.embedCode) {
        // Check if this is a YouTube embed and add autoplay
        if (video.embedCode.includes("youtube.com/embed/")) {
          console.log("API: Found YouTube embed, adding autoplay");

          // First check if the iframe already has autoplay
          if (!video.embedCode.includes("autoplay=1")) {
            // Add autoplay parameters to YouTube embeds with more comprehensive regex
            video.embedCode = video.embedCode
              // Case 1: URL with no query parameters
              .replace(
                /src="(https:\/\/www\.youtube\.com\/embed\/[^?"]+)"/g,
                'src="$1?autoplay=1"'
              )

              // Case 2: URL already has query parameters
              .replace(
                /src="(https:\/\/www\.youtube\.com\/embed\/[^"]+)\?([^"]+)"/g,
                function (match, url, params) {
                  // Don't add autoplay if it's already there
                  if (params.includes("autoplay=")) {
                    return match;
                  }
                  return `src="${url}?autoplay=1&${params}"`;
                }
              )

              // Add allow="autoplay" if it's missing
              .replace(/<iframe([^>]*)>/g, function (match, attributes) {
                if (
                  attributes.includes('allow="') &&
                  !attributes.includes("autoplay")
                ) {
                  return match.replace('allow="', 'allow="autoplay; ');
                } else if (!attributes.includes('allow="')) {
                  return match.replace("<iframe", '<iframe allow="autoplay"');
                }
                return match;
              });
          }

          console.log("API: Modified YouTube embed to include autoplay");
        }
        // Check if this is a Reddit embed and ensure it has the required script
        else if (
          video.embedCode.includes("reddit-embed-bq") ||
          (video.embedCode.includes("reddit.com/r/") &&
            video.embedCode.includes("comments"))
        ) {
          // IMPORTANT: Reddit embeds need special handling to play correctly
          console.log("API: Found Reddit embed, adding special handling");

          // Try multiple regex patterns to extract Reddit info
          let postId = null;
          let subreddit = null;

          // Method 1: Try extracting from data-embed attributes
          const redditRegex1 =
            /data-embed-id="([\w\d]+)" data-embed-live="false" data-embed-created="(\d+)" data-embed-subreddit="([\w\d-]+)"/;
          const redditMatch1 = video.embedCode.match(redditRegex1);

          if (redditMatch1) {
            postId = redditMatch1[1];
            subreddit = redditMatch1[3];
          }

          // Method 2: Try extracting from URL in the embed code
          if (!postId || !subreddit) {
            const redditRegex2 = /reddit\.com\/r\/([^\/]+)\/comments\/([^\/]+)/;
            const redditMatch2 = video.embedCode.match(redditRegex2);

            if (redditMatch2) {
              subreddit = redditMatch2[1];
              postId = redditMatch2[2];
            }
          }

          // Method 3: Try extracting from href attributes
          if (!postId || !subreddit) {
            const hrefRegex =
              /href="https?:\/\/(?:www\.)?reddit\.com\/r\/([^\/]+)\/comments\/([^\/]+)/;
            const hrefMatch = video.embedCode.match(hrefRegex);

            if (hrefMatch) {
              subreddit = hrefMatch[1];
              postId = hrefMatch[2];
            }
          }

          // If we found the Reddit info, create a custom embed with iframe
          if (postId && subreddit) {
            console.log(
              `API: Extracted Reddit info - subreddit: ${subreddit}, postId: ${postId}`
            );

            // Store the Reddit info in a data attribute for easier client-side access
            video.embedCode = `
              <div 
                class="reddit-embed-container" 
                style="position:relative;padding-bottom:120%;height:0;overflow:hidden;"
                data-reddit-subreddit="${subreddit}" 
                data-reddit-postid="${postId}"
              >
                <iframe
                  style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;"
                  src="https://www.redditmedia.com/r/${subreddit}/comments/${postId}/?embed=true&amp;showmedia=true&amp;showedits=true&amp;created=true"
                  allowfullscreen="true"
                  sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                  scrolling="no"
                ></iframe>
              </div>
            `;

            // Also set a custom thumbnail for Reddit embeds if none exists
            if (!video.thumbnail || video.thumbnail.includes("placehold.co")) {
              video.thumbnail = `https://placehold.co/400x225/FF4500/FFFFFF?text=r/${subreddit}`;
            }
          } else {
            // If we can't extract the Reddit post info, add the script as before
            console.log(
              "API: Could not extract Reddit post info, adding standard script"
            );
            if (!video.embedCode.includes("embed.reddit.com/widgets.js")) {
              video.embedCode +=
                '<script async src="https://embed.reddit.com/widgets.js" charset="UTF-8"></script>';
            }
          }
        }
      }

      const responseData = {
        ...video,
        category,
        comments,
        isWishlisted,
      };

      console.log(
        "API: Sending video data with embedCode of length:",
        video.embedCode ? video.embedCode.length : 0
      );

      // Return complete details
      res.json(responseData);
    } catch (error) {
      console.error("Error fetching video details:", error);
      res.status(500).json({ error: "Failed to fetch video details" });
    }
  });

  // Comments API
  app.get("/api/videos/:id/comments", async (req, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const comments = await dbStorage.getCommentsByVideoId(videoId);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  // Related videos API - finds videos with similar titles, keywords, and categories
  app.get("/api/videos/:id/related", async (req, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const currentVideo = await dbStorage.getVideoById(videoId);

      if (!currentVideo) {
        return res.status(404).json({ error: "Video not found" });
      }

      // Get all videos
      const allVideos = await dbStorage.getVideos(100);

      // Filter out the current video
      const otherVideos = allVideos.filter((v) => v.id !== videoId);

      // Create a relevance score for each video
      const scoredVideos = otherVideos.map((video) => {
        let score = 0;

        // Same category gets a big boost
        if (video.categoryId === currentVideo.categoryId) {
          score += 50;
        }

        // Same content type gets a boost
        if (video.contentType === currentVideo.contentType) {
          score += 30;
        }

        // Same AI generator gets a boost
        if (
          video.aiGenerator &&
          currentVideo.aiGenerator &&
          video.aiGenerator.toLowerCase() ===
            currentVideo.aiGenerator.toLowerCase()
        ) {
          score += 25;
        }

        // Title similarity (simple contains check for now)
        if (currentVideo.title && video.title) {
          const currentTitleWords = currentVideo.title
            .toLowerCase()
            .split(/\s+/);
          const videoTitleWords = video.title.toLowerCase().split(/\s+/);

          // Check for shared words in titles
          const sharedWords = currentTitleWords.filter(
            (word) => word.length > 3 && videoTitleWords.includes(word)
          );

          score += sharedWords.length * 10;
        }

        // Prompt similarity (if both have prompts)
        if (currentVideo.prompt && video.prompt) {
          const currentPromptWords = currentVideo.prompt
            .toLowerCase()
            .split(/\s+/);
          const videoPromptWords = video.prompt.toLowerCase().split(/\s+/);

          // Check for shared words in prompts
          const sharedWords = currentPromptWords.filter(
            (word) => word.length > 3 && videoPromptWords.includes(word)
          );

          score += sharedWords.length * 5;
        }

        // Newer content gets a small boost
        if (
          video.createdAt &&
          video.createdAt > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        ) {
          // within 30 days
          score += 10;
        }

        // Append a small random factor for diversity
        score += Math.random() * 5;

        return { video, score };
      });

      // Sort by score (descending) and take top 6
      const relatedVideos = scoredVideos
        .sort((a, b) => b.score - a.score)
        .slice(0, 6)
        .map((item) => item.video);

      console.log(
        `API: Found ${relatedVideos.length} related videos for video ${videoId}`
      );
      res.json(relatedVideos);
    } catch (error) {
      console.error("Error fetching related videos:", error);
      res.status(500).json({ error: "Failed to fetch related videos" });
    }
  });

  app.post("/api/videos/:id/comments", async (req, res) => {
    try {
      const videoId = parseInt(req.params.id);

      // Check if video exists
      const video = await dbStorage.getVideoById(videoId);
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }

      const { content } = req.body;
      let { username } = req.body;

      // Validate content
      if (!content) {
        return res.status(400).json({ error: "Comment content is required" });
      }

      // Create comment data
      const commentData: any = {
        videoId,
        content,
      };

      // If user is authenticated, use their info
      if (req.isAuthenticated() && req.user) {
        commentData.userId = req.user.id;
        // Always use the authenticated user's username from the session, not from the request
        commentData.username = req.user.username;
        console.log(
          `Using authenticated username: ${commentData.username} for comment`
        );
      } else {
        // For non-authenticated users, use the provided username or "Anonymous"
        commentData.username = username || "Anonymous";
        console.log(
          `Using non-authenticated username: ${commentData.username} for comment`
        );
      }

      const comment = await dbStorage.addComment(commentData);
      res.status(201).json(comment);
    } catch (error) {
      console.error("Error adding comment:", error);
      res.status(500).json({ error: "Failed to add comment" });
    }
  });

  // n8n endpoint: returns latest 10 trending videos
  app.get("/api/n8n", async (req, res) => {
    try {
      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const videos = await dbStorage.getTrendingVideos(10);
      
      // Get likes counts for all videos in one query
      const videoIds = videos.map(v => v.id);
      const likesQuery = await pool.query(
        `SELECT video_id, COUNT(*) as like_count FROM likes WHERE video_id = ANY($1) GROUP BY video_id`,
        [videoIds]
      );
      const likesMap = new Map(likesQuery.rows.map(row => [row.video_id, parseInt(row.like_count)]));
      
      const formatted = videos.map((video) => ({
        id: video.id,
        title: video.title,
        description: video.description,
        thumbnailUrl: video.thumbnail
          ? video.thumbnail.startsWith("http")
            ? video.thumbnail
            : baseUrl + video.thumbnail
          : null,
        videoUrl: video.videoUrl
          ? video.videoUrl.startsWith("http")
            ? video.videoUrl
            : baseUrl + video.videoUrl
          : null,
        views: video.views,
        likes: likesMap.get(video.id) || 0,
        contentType: video.contentType,
        categoryName: (video as any).categoryName,
        createdAt: video.createdAt,
        duration: video.duration,
        featured: video.featured,
      }));
      res.json({
        success: true,
        data: formatted,
        total: formatted.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error fetching trending videos for n8n:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch trending videos",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Video uploads are now handled by the /api/videos/upload endpoint

  // Endpoint to get current user's uploaded videos
  app.get("/api/user/videos", isAuthenticated, async (req, res) => {
    try {
      ensureUser(req);

      // Get videos uploaded by this user
      const videos = await dbStorage.getUserVideos(req.user.id);

      console.log(
        `Fetched ${videos.length} videos for user ID: ${req.user.id}`
      );

      // Enhanced video objects with category data if needed
      const enhancedVideos = await Promise.all(
        videos.map(async (video) => {
          if (video.categoryId) {
            const category = await dbStorage.getCategoryById(video.categoryId);
            return {
              ...video,
              category: category
                ? {
                    id: category.id,
                    name: category.name,
                    slug: category.slug,
                  }
                : undefined,
            };
          }
          return video;
        })
      );

      res.json(enhancedVideos);
    } catch (error) {
      console.error("Error fetching user videos:", error);
      res.status(500).json({ error: "Failed to fetch your videos" });
    }
  });

  // Admin endpoints
  // Get all content for admin dashboard
  app.get("/api/content/all", isAdmin, async (req, res) => {
    try {
      const videos = await dbStorage.getVideos(200); // Get up to 200 items
      res.json(videos);
    } catch (error) {
      console.error("Error fetching all content:", error);
      res.status(500).json({ error: "Failed to fetch content" });
    }
  });

  // Get all users for admin dashboard
  app.get("/api/admin/users", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const users = await dbStorage.getAllUsers();

      // Don't return password hashes
      const safeUsers = users.map((user) => {
        // Make a copy without the password
        const { password, ...safeUser } = user;
        return safeUser;
      });

      res.json(safeUsers);
    } catch (error) {
      console.error("Error fetching all users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Get admin dashboard stats
  app.get(
    "/api/admin/dashboard",
    isAuthenticated,
    isAdmin,
    async (req, res) => {
      try {
        // Get pending content for admin review
        const pendingContent = await db
          .select()
          .from(videos)
          .where(eq(videos.reviewStatus, "pending"))
          .limit(20);

        // Get reported content for admin moderation
        const reportedContent = await db
          .select({
            id: videos.id,
            title: videos.title,
            contentType: videos.contentType,
            createdAt: videos.createdAt,
            // Add other needed fields
          })
          .from(videos)
          .innerJoin(reports, eq(reports.videoId, videos.id))
          .limit(20);

        // Get latest registered users
        const latestUsers = await db
          .select()
          .from(users)
          .orderBy(desc(users.createdAt))
          .limit(10);

        // Get system stats
        const [userCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(users);
        const [videoCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(videos);
        const [commentCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(comments);
        const [reportCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(reports);

        const totalUsers = userCount?.count || 0;
        const totalVideos = videoCount?.count || 0;
        const totalComments = commentCount?.count || 0;
        const totalReports = reportCount?.count || 0;

        // Get count of content without perceptual hashes
        const [result] = await db
          .select({ count: sql<number>`count(*)` })
          .from(videos)
          .where(
            and(
              or(
                isNull(videos.perceptualHashes),
                sql`${videos.perceptualHashes} = 'null'::jsonb`
              ),
              not(eq(videos.contentType, "embed")) // Skip embeds
            )
          );
        const contentWithoutHashes = result?.count || 0;

        res.json({
          pendingContent,
          reportedContent,
          latestUsers,
          stats: {
            totalUsers,
            totalVideos,
            totalComments,
            totalReports,
            pendingCount: pendingContent.length,
            reportedCount: reportedContent.length,
            contentWithoutHashes,
          },
        });
      } catch (error) {
        console.error("Error getting admin dashboard data:", error);
        res.status(500).json({ error: "Error getting admin dashboard data" });
      }
    }
  );

  // We're using the other deletion endpoint at "/api/admin/content/:contentId" defined below

  // New endpoint to generate perceptual hashes for all content
  app.post(
    "/api/admin/generate-hashes",
    isAuthenticated,
    isAdmin,
    async (req, res) => {
      try {
        // Find all content without perceptual hashes
        const contentWithoutHashes = await db
          .select()
          .from(videos)
          .where(
            and(
              or(
                isNull(videos.perceptualHashes),
                sql`${videos.perceptualHashes} = 'null'::jsonb`
              ),
              not(eq(videos.contentType, "embed")), // Skip embeds
              not(isNull(videos.reviewStatus)), // Only process content that has been reviewed
              eq(videos.reviewStatus, "approved") // Only process approved content
            )
          )
          .limit(20); // Process in batches to avoid overloading the server

        if (contentWithoutHashes.length === 0) {
          return res.json({
            success: true,
            message: "No content found without perceptual hashes",
          });
        }

        // Schedule hash computation for each content item
        const processingPromises = contentWithoutHashes.map(async (content) => {
          return PerceptualHashService.computeAndStoreHashesForExistingContent(
            content.id
          )
            .then(() => ({ id: content.id, success: true }))
            .catch((error) => ({
              id: content.id,
              success: false,
              error: error.message,
            }));
        });

        // Process in parallel but with a limit
        const results = await Promise.all(processingPromises);

        // Return results
        res.json({
          success: true,
          processed: results.length,
          results,
        });
      } catch (error: any) {
        console.error("Error generating perceptual hashes:", error);
        res.status(500).json({
          success: false,
          error: "Error generating perceptual hashes",
          message: error.message || String(error),
        });
      }
    }
  );

  // Ban/unban user endpoint
  app.put(
    "/api/admin/users/:userId",
    isAuthenticated,
    isAdmin,
    async (req, res) => {
      try {
        const userId = parseInt(req.params.userId);
        const { banned } = req.body;

        if (typeof banned !== "boolean") {
          return res
            .status(400)
            .json({ error: "Banned status must be a boolean" });
        }

        // Check if user exists and update them
        const updatedUser = await dbStorage.updateUser(userId, { banned });

        if (!updatedUser) {
          return res.status(404).json({ error: "User not found" });
        }

        // Don't return password hash
        const { password, ...safeUser } = updatedUser;
        res.json(safeUser);
      } catch (error) {
        console.error("Error updating user ban status:", error);
        res.status(500).json({ error: "Failed to update user ban status" });
      }
    }
  );

  // Admin content review endpoints
  app.get(
    "/api/admin/content/pending",
    isAuthenticated,
    isAdmin,
    async (req, res) => {
      try {
        const pendingContent = await dbStorage.getPendingReviewContent();
        res.json(pendingContent);
      } catch (error) {
        console.error("Error fetching pending content:", error);
        res.status(500).json({ error: "Failed to fetch pending content" });
      }
    }
  );

  // Get all approved content for admin management
  app.get(
    "/api/admin/content/approved",
    isAuthenticated,
    isAdmin,
    async (req, res) => {
      try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;

        const result = await dbStorage.getApprovedContent(page, limit);
        res.json(result);
      } catch (error) {
        console.error("Error fetching approved content:", error);
        res.status(500).json({ error: "Failed to fetch approved content" });
      }
    }
  );

  // Get reported content for admin dashboard
  app.get(
    "/api/admin/content/reported",
    isAuthenticated,
    isAdmin,
    async (req, res) => {
      try {
        // Get all pending reports
        const client = await pool.connect();
        try {
          // Join reports with videos to get full video data with report info
          const result = await client.query(
            `SELECT r.*, v.*, r.created_at as reported_at, u.username as reported_by_username 
           FROM reports r 
           JOIN videos v ON r.video_id = v.id 
           LEFT JOIN users u ON r.user_id = u.id 
           WHERE r.status = 'pending' 
           ORDER BY r.created_at DESC`
          );

          // Format the results
          const reportedContent = result.rows.map((row) => ({
            ...row,
            reportReason: row.reason,
            reportedAt: row.reported_at,
            reportedBy: row.reported_by_username || "Anonymous",
          }));

          res.json(reportedContent);
        } catch (dbError) {
          console.error("Database error fetching reported content:", dbError);
          res
            .status(500)
            .json({ error: "Database error fetching reported content" });
        } finally {
          client.release();
        }
      } catch (error) {
        console.error("Error fetching reported content:", error);
        res.status(500).json({ error: "Failed to fetch reported content" });
      }
    }
  );

  // Admin API for featured content management
  app.get(
    "/api/admin/content/featured",
    isAuthenticated,
    isAdmin,
    async (req, res) => {
      try {
        ensureUser(req);
        console.log(
          `Fetching all featured content for admin user ID: ${req.user.id}`
        );
        const featuredContent = await dbStorage.getAllFeaturedContent();
        res.json(featuredContent);
      } catch (error) {
        console.error("Error fetching featured content:", error);
        res.status(500).json({ error: "Failed to fetch featured content" });
      }
    }
  );

  app.post(
    "/api/admin/content/:contentId/approve",
    isAuthenticated,
    isAdmin,
    async (req, res) => {
      try {
        ensureUser(req);
        const contentId = parseInt(req.params.contentId);
        console.log(
          `Admin approval request for content ID: ${contentId} by user ID: ${req.user.id}`
        );

        // Verify the content exists - using dbStorage.getVideoById WITHOUT visibility filter
        // This is important because we might be approving content that is currently pending
        const content = await db
          .select()
          .from(videos)
          .where(eq(videos.id, contentId));

        if (!content || content.length === 0) {
          console.error(`Content with ID ${contentId} not found for approval`);
          return res.status(404).json({ error: "Content not found" });
        }

        console.log(
          `Found content for approval: ${content[0].title} (ID: ${contentId})`
        );

        // Update the content review status
        const reviewedContent = await dbStorage.updateContentReviewStatus(
          contentId,
          "approved",
          req.user.id
        );

        console.log(`Successfully approved content ID: ${contentId}`);
        res.json(reviewedContent);
      } catch (error) {
        console.error("Error approving content:", error);
        res.status(500).json({
          error: "Failed to approve content",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    }
  );

  // Toggle a video's featured status (for Featured Videos section)
  app.post(
    "/api/admin/content/:contentId/feature",
    isAuthenticated,
    isAdmin,
    async (req, res) => {
      try {
        ensureUser(req);
        const contentId = parseInt(req.params.contentId);
        console.log(
          `Admin feature toggle request for content ID: ${contentId} by user ID: ${req.user.id}`
        );

        // Verify the content exists - using skipVisibilityCheck to see pending content
        const content = await dbStorage.getVideoById(contentId, true);
        if (!content) {
          console.error(
            `Content with ID ${contentId} not found for feature toggle`
          );
          return res.status(404).json({ error: "Content not found" });
        }

        console.log(
          `Found content for feature toggle: ${content.title} (ID: ${contentId}), current feature status: ${content.featured}`
        );

        // Toggle the featured status
        const updatedVideo = await dbStorage.updateVideo(contentId, {
          featured: !content.featured,
        });

        console.log(
          `Successfully updated feature status for content ID: ${contentId} to ${updatedVideo.featured}`
        );
        res.json(updatedVideo);
      } catch (error) {
        console.error("Error toggling feature status:", error);
        res.status(500).json({
          error: "Failed to update feature status",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    }
  );

  app.post(
    "/api/admin/content/:contentId/reject",
    isAuthenticated,
    isAdmin,
    async (req, res) => {
      try {
        ensureUser(req);
        const contentId = parseInt(req.params.contentId);
        const { reason } = req.body;
        console.log(
          `Admin rejection request for content ID: ${contentId} by user ID: ${req.user.id}`
        );

        // Verify the content exists - using skipVisibilityCheck to see pending content
        const content = await dbStorage.getVideoById(contentId, true);
        if (!content) {
          console.error(`Content with ID ${contentId} not found for rejection`);
          return res.status(404).json({ error: "Content not found" });
        }
        console.log(
          `Found content for rejection: ${content.title} (ID: ${contentId})`
        );

        // First update the review status
        await dbStorage.updateContentReviewStatus(
          contentId,
          "rejected",
          req.user.id,
          reason || "Content rejected by admin"
        );

        console.log(
          `Review status updated to rejected for content ID: ${contentId}`
        );

        // Then delete the content
        await dbStorage.deleteVideo(contentId);
        console.log(`Content ID: ${contentId} successfully deleted`);

        await removeFromS3(content);

        console.log(
          `Content ID: ${contentId} successfully deleted after rejection`
        );
        res.json({ success: true, message: "Content rejected and deleted" });
      } catch (error) {
        console.error("Error rejecting content:", error);
        res.status(500).json({
          error: "Failed to reject content",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    }
  );

  // Delete content as admin
  app.delete(
    "/api/admin/content/:contentId",
    isAuthenticated,
    isAdmin,
    async (req, res) => {
      try {
        ensureUser(req);
        const contentId = parseInt(req.params.contentId);
        console.log(
          `Admin delete request for content ID: ${contentId} by user ID: ${req.user.id}`
        );

        // Get the content to verify it exists - using skipVisibilityCheck to see pending content
        const content = await dbStorage.getVideoById(contentId, true);
        if (!content) {
          console.error(`Content with ID ${contentId} not found`);
          return res.status(404).json({ error: "Content not found" });
        }

        console.log(
          `Found content for deletion: ${content.title} (ID: ${content.id})`
        );

        // Mark any reports for this content as resolved
        const client = await pool.connect();
        try {
          const reportUpdateResult = await client.query(
            `UPDATE reports
           SET status = 'reviewed', resolved_at = NOW(), resolved_by = $1
           WHERE video_id = $2 AND status = 'pending'
           RETURNING id`,
            [req.user.id, contentId]
          );
          console.log(
            `Updated ${reportUpdateResult.rowCount} report(s) status for content ID: ${contentId}`
          );
        } catch (dbError) {
          console.error("Error updating report status:", dbError);
          // Continue with content deletion even if report status update fails
        } finally {
          client.release();
        }

        try {
          console.log(`Attempting to delete video with ID: ${contentId}`);
          await dbStorage.deleteVideo(contentId);
          console.log(`Video with ID: ${contentId} successfully deleted`);
          await removeFromS3(content);

          res.json({ success: true, message: "Content deleted successfully" });
        } catch (deleteError) {
          console.error(
            `Error deleting video with ID: ${contentId}:`,
            deleteError
          );
          res.status(500).json({
            error:
              "Failed to delete content: " +
              (deleteError instanceof Error
                ? deleteError.message
                : String(deleteError)),
          });
        }
      } catch (error) {
        console.error("Error in delete content endpoint:", error);
        res.status(500).json({
          error:
            "Failed to delete content: " +
            (error instanceof Error ? error.message : String(error)),
        });
      }
    }
  );

  async function removeFromS3(content: any) {
    const contentType = content.contentType || "video";

    let contenturl =
      contentType === "video" ? content.videoUrl : content.imageUrl;
    let thumbnailUrl = content.thumbnail;

    if (contenturl && contenturl.startsWith("/api/s3")) {
      await deleteFileFromS3(contenturl.replace("/api/s3/", ""));
    }

    if (thumbnailUrl && thumbnailUrl.startsWith("/api/content")) {
      thumbnailUrl = `thumbnails/${contentType}-${content.id}.jpg`;
      await deleteFileFromS3(thumbnailUrl);
    }
  }

  // Endpoint to resolve a report without deleting content
  app.post(
    "/api/admin/reports/:reportId/resolve",
    isAuthenticated,
    isAdmin,
    async (req, res) => {
      try {
        ensureUser(req);
        const reportId = parseInt(req.params.reportId);

        // Update the report status
        const client = await pool.connect();
        try {
          const result = await client.query(
            `UPDATE reports 
           SET status = 'reviewed', resolved_at = NOW(), resolved_by = $1 
           WHERE id = $2 AND status = 'pending' 
           RETURNING *`,
            [req.user.id, reportId]
          );

          if (result.rowCount === 0) {
            return res
              .status(404)
              .json({ error: "Report not found or already resolved" });
          }

          res.json({
            success: true,
            message: "Report marked as resolved",
            report: result.rows[0],
          });
        } catch (dbError) {
          console.error("Database error resolving report:", dbError);
          res.status(500).json({ error: "Database error resolving report" });
        } finally {
          client.release();
        }
      } catch (error) {
        console.error("Error resolving report:", error);
        res.status(500).json({ error: "Failed to resolve report" });
      }
    }
  );

  // Profile management endpoints
  app.patch("/api/user", isAuthenticated, async (req, res) => {
    try {
      ensureUser(req);
      const { username, email } = req.body;

      // If changing username, check if it's already taken
      if (username && username !== req.user.username) {
        const existingUser = await dbStorage.getUserByUsername(username);
        if (existingUser && existingUser.id !== req.user.id) {
          return res.status(400).json({ error: "Username already exists" });
        }
      }

      // Update the user
      const updatedUser = await dbStorage.updateUser(req.user.id, {
        username,
        email,
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // API route for changing password
  app.post("/api/user/change-password", isAuthenticated, async (req, res) => {
    try {
      ensureUser(req);
      const { currentPassword, newPassword } = req.body;

      // Validate that current password is correct
      const user = await dbStorage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Password utilities imported at the top of the file

      // Check if the current password is correct
      const isPasswordValid = await comparePasswords(
        currentPassword,
        user.password
      );
      if (!isPasswordValid) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }

      // Hash the new password
      const hashedPassword = await hashPassword(newPassword);

      // Update the user's password
      await dbStorage.updateUser(req.user.id, { password: hashedPassword });

      res.status(200).json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ error: "Failed to change password" });
    }
  });

  // API route for deleting user account
  app.delete("/api/user", isAuthenticated, async (req, res) => {
    try {
      ensureUser(req);

      // We no longer need to handle the videos here as it's done in dbStorage.deleteUser
      // Just capture the user ID before deletion for logging purposes
      const userId = req.user.id;

      // Delete the user using our improved method that handles all relations
      await dbStorage.deleteUser(userId);

      console.log(`User account ${userId} deleted successfully`);

      // Log the user out
      req.logout((err) => {
        if (err) {
          console.error("Error logging out after account deletion:", err);
          return res.status(500).json({ error: "Failed to delete account" });
        }

        res.status(200).json({ message: "Account deleted successfully" });
      });
    } catch (error) {
      console.error("Error deleting user account:", error);
      // Provide a more descriptive error message in development environment
      const errorMessage =
        process.env.NODE_ENV === "development"
          ? `Failed to delete account: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          : "Failed to delete account";

      res.status(500).json({ error: errorMessage });
    }
  });

  // Public user profile routes
  // Get user by ID
  app.get("/api/users/:userId/profile", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      const user = await dbStorage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Don't expose sensitive data
      const safeUser = {
        id: user.id,
        username: user.username,
        createdAt: user.createdAt,
        isAdmin: Boolean(user.isAdmin), // Safe to expose admin status, but not other fields
      };

      res.json(safeUser);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ error: "Failed to fetch user profile" });
    }
  });

  // Get user by username
  app.get("/api/users/by-username/:username", async (req, res) => {
    try {
      const { username } = req.params;
      if (!username) {
        return res.status(400).json({ error: "Username is required" });
      }

      const user = await dbStorage.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Don't expose sensitive data
      const safeUser = {
        id: user.id,
        username: user.username,
        createdAt: user.createdAt,
        isAdmin: Boolean(user.isAdmin), // Safe to expose admin status, but not other fields
      };

      res.json(safeUser);
    } catch (error) {
      console.error("Error fetching user by username:", error);
      res.status(500).json({ error: "Failed to fetch user profile" });
    }
  });

  // Get all content uploaded by a specific user
  app.get("/api/users/:userId/content", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      // Check if user exists
      const user = await dbStorage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Fetch user's content
      const videos = await dbStorage.getUserVideos(userId);

      // Return videos with username attached
      const videosWithUsername = videos.map((video) => ({
        ...video,
        username: user.username,
      }));

      res.json(videosWithUsername);
    } catch (error) {
      console.error("Error fetching user content:", error);
      res.status(500).json({ error: "Failed to fetch user content" });
    }
  });

  // Messaging API endpoints
  app.post("/api/messages/send", isAuthenticated, async (req, res) => {
    try {
      console.log("Message sending attempt received");
      ensureUser(req);
      console.log("User authenticated:", req.user.id);

      const { receiverId, content } = req.body;
      console.log("Message data:", {
        receiverId,
        content,
        senderUserId: req.user.id,
      });

      if (!receiverId || !content) {
        console.log("Missing required fields");
        return res
          .status(400)
          .json({ error: "Receiver ID and content are required" });
      }

      // Check if receiver exists
      console.log("Looking up receiver with ID:", receiverId);
      const receiver = await dbStorage.getUser(receiverId);
      if (!receiver) {
        console.log("Receiver not found:", receiverId);
        return res.status(404).json({ error: "Receiver not found" });
      }
      console.log("Receiver found:", receiver.username);

      // Check if the sender has blocked the receiver
      const senderBlockedReceiver = await dbStorage.isUserBlocked(
        req.user.id,
        receiverId
      );
      if (senderBlockedReceiver) {
        console.log("Sender has blocked the receiver, cannot send message");
        return res
          .status(403)
          .json({ error: "Cannot send message to a blocked user" });
      }

      // Check if the receiver has blocked the sender
      const receiverBlockedSender = await dbStorage.isUserBlocked(
        receiverId,
        req.user.id
      );
      if (receiverBlockedSender) {
        console.log("Receiver has blocked the sender, cannot send message");
        return res.status(403).json({ error: "This user has blocked you" });
      }

      // Create message
      console.log("Creating message in database");
      const messageData: InsertMessage = {
        senderId: req.user.id,
        receiverId,
        content,
        read: false,
      };

      const message = await dbStorage.createMessage(messageData);
      console.log("Message created successfully with ID:", message.id);

      // Add sender username to the response
      const messageWithUsername = {
        ...message,
        senderName: req.user.username,
      };

      res.status(201).json(messageWithUsername);
    } catch (error) {
      console.error("Error sending message:", error);
      if (error instanceof Error) {
        console.error("Error details:", error.message, error.stack);
      }
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // Get conversation between current user and another user (deprecated route)
  app.get("/api/messages/user/:userId", isAuthenticated, async (req, res) => {
    try {
      ensureUser(req);

      const otherUserId = parseInt(req.params.userId);
      if (isNaN(otherUserId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      // Fetch messages between the two users
      const messages = await dbStorage.getConversation(
        req.user.id,
        otherUserId
      );

      // Mark messages as read if they're sent to the current user
      const unreadMessages = messages.filter(
        (message) => message.receiverId === req.user.id && !message.read
      );

      if (unreadMessages.length > 0) {
        for (const message of unreadMessages) {
          await dbStorage.markMessageAsRead(message.id);
        }
      }

      // Get username for the other user
      const otherUser = await dbStorage.getUser(otherUserId);

      // Add sender and receiver names to the messages
      const messagesWithNames = messages.map((message) => ({
        ...message,
        senderName:
          message.senderId === req.user.id
            ? req.user.username
            : otherUser?.username,
        receiverName:
          message.receiverId === req.user.id
            ? req.user.username
            : otherUser?.username,
      }));

      res.json(messagesWithNames);
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  // Get unread message count
  app.get("/api/messages/unread/count", isAuthenticated, async (req, res) => {
    try {
      ensureUser(req);

      const count = await dbStorage.getUnreadMessageCount(req.user.id);
      res.json({ count });
    } catch (error) {
      console.error("Error getting unread message count:", error);
      res.status(500).json({ error: "Failed to get unread message count" });
    }
  });

  // Get all conversations for the current user
  app.get("/api/messages/conversations", isAuthenticated, async (req, res) => {
    try {
      // Make sure req.user exists and has an id property
      if (!req.user || !req.user.id) {
        console.error("User object missing or invalid:", req.user);
        return res.status(401).json({ error: "Authentication required" });
      }

      console.log(
        `Getting conversations for user ${req.user.id} (${req.user.username})`
      );

      // First, directly check if there are any messages in the database
      const messageCount = await db
        .select({ count: sql`count(*)` })
        .from(messages)
        .where(
          or(
            eq(messages.senderId, req.user.id),
            eq(messages.receiverId, req.user.id)
          )
        );

      console.log(
        `Database reports ${messageCount[0].count} messages for user ${req.user.id}`
      );

      // First, get all messages for the user (sent or received)
      const allMessages = await dbStorage.getAllUserMessages(req.user.id);
      console.log(
        `Retrieved ${allMessages.length} messages for user ${req.user.id}`
      );
      console.log(`Sample messages:`, allMessages.slice(0, 2));

      // Create a map of user IDs to their conversations
      const conversationsMap = new Map();

      // Process all messages to build conversations
      for (const message of allMessages) {
        const isUserSender = message.senderId === req.user.id;
        const otherUserId = isUserSender
          ? message.receiverId
          : message.senderId;

        console.log(
          `Processing message ID=${message.id}, isUserSender=${isUserSender}, otherUserId=${otherUserId}`
        );

        // Skip if this is a message to self
        if (otherUserId === req.user.id) {
          console.log(`Skipping message ID=${message.id} (message to self)`);
          continue;
        }

        // Get or create conversation entry
        if (!conversationsMap.has(otherUserId)) {
          // Get other user's information
          const otherUser = await dbStorage.getUser(otherUserId);

          if (!otherUser) {
            console.log(
              `Skipping message ID=${message.id} (other user ${otherUserId} not found)`
            );
            continue; // Skip if user no longer exists
          }

          console.log(
            `Creating new conversation with user ${otherUser.id} (${otherUser.username})`
          );

          conversationsMap.set(otherUserId, {
            userId: otherUserId,
            username: otherUser.username,
            lastMessage: message.content,
            lastMessageDate: message.createdAt,
            unreadCount: 0,
          });
        } else {
          // Update last message if newer
          const conversation = conversationsMap.get(otherUserId);
          const messageDate = new Date(message.createdAt);
          const lastMessageDate = new Date(conversation.lastMessageDate);

          if (messageDate > lastMessageDate) {
            console.log(
              `Updating conversation with user ${otherUserId} with newer message`
            );
            conversation.lastMessage = message.content;
            conversation.lastMessageDate = message.createdAt;
          }
        }

        // Count unread messages from other user
        if (!isUserSender && !message.read) {
          console.log(`Incrementing unread count for user ${otherUserId}`);
          conversationsMap.get(otherUserId).unreadCount++;
        }
      }

      // Sort conversations by most recent message
      const conversations = Array.from(conversationsMap.values()).sort(
        (a, b) =>
          new Date(b.lastMessageDate).getTime() -
          new Date(a.lastMessageDate).getTime()
      );

      console.log(`Returning ${conversations.length} conversations`);
      res.json(conversations);
    } catch (error) {
      console.error("Error getting conversations:", error);
      if (error instanceof Error) {
        console.error("Error details:", error.message, error.stack);
      }
      res.status(500).json({ error: "Failed to get conversations" });
    }
  });

  // Get specific conversation and mark messages as read
  app.get(
    "/api/messages/conversation/:userId",
    isAuthenticated,
    async (req, res) => {
      try {
        ensureUser(req);

        const otherUserId = parseInt(req.params.userId);
        if (isNaN(otherUserId)) {
          return res.status(400).json({ error: "Invalid user ID" });
        }

        // Get the other user to verify they exist
        const otherUser = await dbStorage.getUser(otherUserId);
        if (!otherUser) {
          return res.status(404).json({ error: "User not found" });
        }

        // Check if the user has blocked this person
        const isBlocked = await dbStorage.isUserBlocked(
          req.user.id,
          otherUserId
        );
        if (isBlocked) {
          return res.status(403).json({ error: "You have blocked this user" });
        }

        // Check if the other user has blocked this user
        const isBlockedByOther = await dbStorage.isUserBlocked(
          otherUserId,
          req.user.id
        );
        if (isBlockedByOther) {
          return res
            .status(403)
            .json({ error: "You have been blocked by this user" });
        }

        // Fetch messages between the two users
        const messages = await dbStorage.getConversation(
          req.user.id,
          otherUserId
        );

        // Mark messages as read if they're sent to the current user
        const unreadMessages = messages.filter(
          (message) => message.receiverId === req.user.id && !message.read
        );

        if (unreadMessages.length > 0) {
          for (const message of unreadMessages) {
            await dbStorage.markMessageAsRead(message.id);
          }
        }

        // Add sender and receiver names to the messages
        const messagesWithNames = messages.map((message) => ({
          ...message,
          senderName:
            message.senderId === req.user.id
              ? req.user.username
              : otherUser.username,
          receiverName:
            message.receiverId === req.user.id
              ? req.user.username
              : otherUser.username,
        }));

        res.json(messagesWithNames);
      } catch (error) {
        console.error("Error fetching conversation:", error);
        res.status(500).json({ error: "Failed to fetch conversation" });
      }
    }
  );

  // Mark all messages from a user as read
  app.post(
    "/api/messages/mark-read/:userId",
    isAuthenticated,
    async (req, res) => {
      try {
        ensureUser(req);

        const otherUserId = parseInt(req.params.userId);
        if (isNaN(otherUserId)) {
          return res.status(400).json({ error: "Invalid user ID" });
        }

        // Mark all messages from other user as read
        await dbStorage.markAllMessagesAsRead(req.user.id, otherUserId);

        res.json({ success: true });
      } catch (error) {
        console.error("Error marking messages as read:", error);
        res.status(500).json({ error: "Failed to mark messages as read" });
      }
    }
  );

  // Delete entire conversation with another user
  app.delete(
    "/api/messages/conversation/:userId",
    isAuthenticated,
    async (req, res) => {
      try {
        ensureUser(req);

        const otherUserId = parseInt(req.params.userId);
        if (isNaN(otherUserId)) {
          return res.status(400).json({ error: "Invalid user ID" });
        }

        // Delete the entire conversation
        await dbStorage.deleteConversation(req.user.id, otherUserId);

        res.json({
          success: true,
          message: "Conversation deleted successfully",
        });
      } catch (error) {
        console.error("Error deleting conversation:", error);
        res.status(500).json({ error: "Failed to delete conversation" });
      }
    }
  );

  // Block a user
  app.post("/api/users/block/:userId", isAuthenticated, async (req, res) => {
    try {
      ensureUser(req);

      const userIdToBlock = parseInt(req.params.userId);
      if (isNaN(userIdToBlock)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      // Prevent blocking yourself
      if (userIdToBlock === req.user.id) {
        return res.status(400).json({ error: "You cannot block yourself" });
      }

      // Make sure the user exists
      const userToBlock = await dbStorage.getUser(userIdToBlock);
      if (!userToBlock) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check if already blocked
      const isAlreadyBlocked = await dbStorage.isUserBlocked(
        req.user.id,
        userIdToBlock
      );
      if (isAlreadyBlocked) {
        return res.status(400).json({ error: "User is already blocked" });
      }

      // Block the user
      await dbStorage.blockUser(req.user.id, userIdToBlock);

      res.json({ success: true, message: "User blocked successfully" });
    } catch (error) {
      console.error("Error blocking user:", error);
      res.status(500).json({ error: "Failed to block user" });
    }
  });

  // Unblock a user
  app.delete("/api/users/block/:userId", isAuthenticated, async (req, res) => {
    try {
      ensureUser(req);

      const userIdToUnblock = parseInt(req.params.userId);
      if (isNaN(userIdToUnblock)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      // Check if actually blocked
      const isBlocked = await dbStorage.isUserBlocked(
        req.user.id,
        userIdToUnblock
      );
      if (!isBlocked) {
        return res.status(400).json({ error: "User is not blocked" });
      }

      // Unblock the user
      await dbStorage.unblockUser(req.user.id, userIdToUnblock);

      res.json({ success: true, message: "User unblocked successfully" });
    } catch (error) {
      console.error("Error unblocking user:", error);
      res.status(500).json({ error: "Failed to unblock user" });
    }
  });

  // Set up preflight handling for all S3 routes
  app.options("/api/s3/:key(*)", (req, res) => {
    // Set CORS headers to allow cross-origin requests
    res.set({
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, Range",
      "Access-Control-Expose-Headers":
        "Content-Length, Content-Range, Content-Type",
      "Access-Control-Max-Age": "86400", // 24 hours cache
      "Cross-Origin-Resource-Policy": "cross-origin",
    });

    res.status(204).end();
  });

  // File upload endpoint
  app.post(
    "/api/upload/file",
    isAuthenticated,
    upload.single("file"),
    async (req, res) => {
      try {
        if (!req.file) {
          console.error("No file in request");
          return res.status(400).json({ error: "No file provided" });
        }

        console.log("File upload request received:", {
          filename: req.file.filename,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          path: req.file.path,
        });

        let duration = 0;
        if (req.file.mimetype.startsWith("video/")) {
          try {
            duration = await ffmpegUtils.getVideoDuration(req.file.path);
            console.log(`Extracted video duration: ${duration} seconds`);
          } catch (durationError) {
            console.warn(
              `Could not extract video duration: ${durationError}. Continuing with upload.`
            );
          }
        }

        // Get the file path from multer
        const filePath = req.file.path;

        // Verify file exists
        try {
          const fs = await import("node:fs/promises");
          await fs.access(filePath);
          console.log(`Verified file exists at path: ${filePath}`);
        } catch (accessError: any) {
          console.error(
            `File does not exist at path ${filePath}: ${accessError.message}`
          );
          return res.status(500).json({
            error: `File upload failed: File not found at ${filePath}`,
          });
        }

        // Create S3 key based on file path
        const filename = req.file.filename;
        const s3Key = `uploads/${filename}`;

        console.log(`Uploading file to S3 with key: ${s3Key}`);

        try {
          // Upload the file to S3
          const s3Url = await uploadFileToS3(filePath, s3Key);
          console.log(`File successfully uploaded to S3: ${s3Url}`);

          // Return the URL for the client to use
          const url = `/api/s3/${s3Key}`;

          // Return success response
          return res.json({
            success: true,
            url,
            s3Key,
            message: "File uploaded successfully",
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
          });
        } catch (s3Error: any) {
          console.error("Error uploading to S3:", s3Error);
          return res.status(500).json({
            error: `Error uploading to S3: ${
              s3Error.message || String(s3Error)
            }`,
            details: "The file was received but could not be stored properly",
          });
        }
      } catch (error: any) {
        console.error("Error in file upload:", error);
        return res.status(500).json({
          error: error.message || "Failed to upload file",
          stack:
            process.env.NODE_ENV === "development" ? error.stack : undefined,
        });
      }
    }
  );

  // S3 file serving endpoint
  app.get("/api/s3/:key(*)", async (req, res) => {
    try {
      const key = req.params.key;
      if (!key) {
        return res.status(400).json({ error: "Invalid S3 key" });
      }

      console.log(
        "S3 request for key:",
        key,
        "getUrl param:",
        req.query.getUrl
      );

      // Get signed URL with short expiry to avoid abuse
      const signedUrl = await getSignedS3Url(key, 3600); // 1 hour expiry

      // Set CORS headers to allow cross-origin requests
      res.set({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, Range",
        "Access-Control-Expose-Headers":
          "Content-Length, Content-Range, Content-Type",
        "Cross-Origin-Resource-Policy": "cross-origin",
      });

      // Return a JSON response for the key fetching endpoint
      if (req.query.getUrl === "true") {
        console.log(
          "Returning signed URL for key:",
          key,
          "(first 50 chars):",
          signedUrl.substring(0, 50) + "..."
        );
        return res.json({ url: signedUrl });
      }

      // Otherwise redirect
      res.redirect(signedUrl);
    } catch (error) {
      console.error("Error serving S3 file:", error);
      res.status(404).json({ error: "File not found or inaccessible" });
    }
  });

  // Direct video URL by ID endpoint - better user experience for video previews
  app.get("/api/videos/:id/direct", async (req, res) => {
    try {
      const videoId = parseInt(req.params.id, 10);
      if (isNaN(videoId)) {
        return res.status(400).json({ error: "Invalid video ID" });
      }

      const video = await dbStorage.getVideoById(videoId);
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }

      if (!video.videoUrl) {
        return res.status(400).json({ error: "No video URL available" });
      }

      // Get the S3 key from the video URL
      let s3Key = "";

      if (video.videoUrl.startsWith("/api/s3/")) {
        s3Key = video.videoUrl.substring("/api/s3/".length);
      } else if (video.videoUrl.includes("workspace/uploads/")) {
        // Handle workspace paths
        const match = video.videoUrl.match(/workspace\/(.+)/);
        if (match && match[1]) {
          s3Key = match[1];
        }
      } else if (video.videoUrl.startsWith("/uploads/")) {
        // Handle relative uploads paths
        s3Key = video.videoUrl.substring(1); // Remove leading slash
      } else {
        // Try to extract filename and use it as key
        const parts = video.videoUrl.split("/");
        const filename = parts[parts.length - 1];
        if (filename) {
          s3Key = `uploads/videos/${filename}`;
        }
      }

      if (!s3Key) {
        return res.status(400).json({
          error: "Could not determine S3 key from video URL: " + video.videoUrl,
        });
      }

      // Get signed URL with longer expiry for video playback
      console.log(`Getting signed URL for video ${videoId}, key: ${s3Key}`);
      const signedUrl = await getSignedS3Url(s3Key, 86400); // 24 hour expiry for better video caching

      // Set CORS headers to allow cross-origin video requests
      res.set({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, Range",
        "Access-Control-Expose-Headers":
          "Content-Length, Content-Range, Content-Type",
        "Cross-Origin-Resource-Policy": "cross-origin",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      });

      return res.json({ url: signedUrl });
    } catch (error) {
      console.error(
        `Error getting direct video URL for ID ${req.params.id}:`,
        error
      );
      return res.status(500).json({ error: "Failed to generate video URL" });
    }
  });

  // Forum API endpoints
  // Get forum categories
  app.get("/api/forum/categories", async (req, res) => {
    try {
      // Query database for forum categories with thread counts
      const results = await db.execute(sql`
        SELECT 
          fc.id, 
          fc.name, 
          COALESCE(COUNT(ft.id), 0)::integer as count
        FROM 
          forum_categories fc
        LEFT JOIN 
          forum_threads ft ON fc.id = ft.category_id
        GROUP BY 
          fc.id, fc.name
        ORDER BY 
          fc.id ASC
      `);

      // Extract just the rows from the result
      if (results && results.rows) {
        res.status(200).json(results.rows);
      } else {
        throw new Error("No categories found");
      }
    } catch (error) {
      console.error("Error fetching forum categories:", error);
      res.status(500).json({ error: "Failed to fetch forum categories" });
    }
  });

  // Get all forum threads with optional filtering
  app.get("/api/forum/threads", async (req, res) => {
    try {
      const categoryId = req.query.categoryId
        ? Number(req.query.categoryId)
        : undefined;
      const sortBy = (req.query.sortBy as string) || "newest";
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const offset = req.query.offset ? Number(req.query.offset) : 0;

      const threads = await dbStorage.getForumThreads({
        categoryId,
        sortBy,
        limit,
        offset,
      });

      res.json(threads);
    } catch (error) {
      console.error("Error fetching forum threads:", error);
      res.status(500).json({ error: "Failed to fetch forum threads" });
    }
  });

  // Get a specific forum thread
  app.get("/api/forum/threads/:id", async (req, res) => {
    try {
      const threadId = Number(req.params.id);
      if (isNaN(threadId)) {
        return res.status(400).json({ error: "Invalid thread ID" });
      }

      const thread = await dbStorage.getForumThreadById(threadId);
      if (!thread) {
        return res.status(404).json({ error: "Thread not found" });
      }

      res.json(thread);
    } catch (error) {
      console.error(`Error fetching forum thread ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to fetch forum thread" });
    }
  });

  // Create a new forum thread
  app.post("/api/forum/threads", isAuthenticated, async (req, res) => {
    try {
      ensureUser(req);

      const { title, content, categoryId, tags, isSticky } = req.body;

      if (!title || !content) {
        return res
          .status(400)
          .json({ error: "Title and content are required" });
      }

      // Only admins can create sticky threads
      const isAdmin =
        req.user.isAdmin || req.user.id === 1 || req.user.id === 2;
      const shouldMakeSticky = isSticky && isAdmin;

      const newThread = await dbStorage.createForumThread({
        title,
        content,
        userId: req.user.id,
        categoryId: categoryId || null,
        tags: tags || null,
        isSticky: shouldMakeSticky,
        upvotes: 0,
      });

      res.status(201).json(newThread);
    } catch (error) {
      console.error("Error creating forum thread:", error);
      res.status(500).json({ error: "Failed to create forum thread" });
    }
  });

  // Update a forum thread
  app.put("/api/forum/threads/:id", isAuthenticated, async (req, res) => {
    try {
      ensureUser(req);
      const threadId = Number(req.params.id);

      if (isNaN(threadId)) {
        return res.status(400).json({ error: "Invalid thread ID" });
      }

      // Get the thread to check ownership
      const thread = await dbStorage.getForumThreadById(threadId);
      if (!thread) {
        return res.status(404).json({ error: "Thread not found" });
      }

      // Only allow the thread owner or an admin to update it
      const isAdmin =
        req.user.isAdmin || req.user.id === 1 || req.user.id === 2;
      if (thread.userId !== req.user.id && !isAdmin) {
        return res
          .status(403)
          .json({ error: "You don't have permission to update this thread" });
      }

      // Update the thread
      const { title, content, categoryId, tags } = req.body;

      const updatedThread = await dbStorage.updateForumThread(threadId, {
        title,
        content,
        categoryId: categoryId || null,
        tags: tags || null,
        updatedAt: new Date(),
      });

      res.json(updatedThread);
    } catch (error) {
      console.error(`Error updating forum thread ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to update forum thread" });
    }
  });

  // Delete a forum thread
  app.delete("/api/forum/threads/:id", isAuthenticated, async (req, res) => {
    try {
      ensureUser(req);
      const threadId = Number(req.params.id);

      if (isNaN(threadId)) {
        return res.status(400).json({ error: "Invalid thread ID" });
      }

      // Get the thread to check ownership
      const thread = await dbStorage.getForumThreadById(threadId);
      if (!thread) {
        return res.status(404).json({ error: "Thread not found" });
      }

      // Only allow the thread owner or an admin to delete it
      const isAdmin =
        req.user.isAdmin || req.user.id === 1 || req.user.id === 2;
      if (thread.userId !== req.user.id && !isAdmin) {
        return res
          .status(403)
          .json({ error: "You don't have permission to delete this thread" });
      }

      // Delete the thread
      await dbStorage.deleteForumThread(threadId);

      res.json({ success: true, message: "Thread deleted successfully" });
    } catch (error) {
      console.error(`Error deleting forum thread ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to delete forum thread" });
    }
  });

  // Get comments for a specific thread
  app.get("/api/forum/threads/:id/comments", async (req, res) => {
    try {
      const threadId = Number(req.params.id);
      if (isNaN(threadId)) {
        return res.status(400).json({ error: "Invalid thread ID" });
      }

      const comments = await dbStorage.getForumCommentsByThreadId(threadId);
      res.json(comments);
    } catch (error) {
      console.error(
        `Error fetching comments for thread ${req.params.id}:`,
        error
      );
      res.status(500).json({ error: "Failed to fetch thread comments" });
    }
  });

  // Add a comment to a thread
  app.post(
    "/api/forum/threads/:id/comments",
    isAuthenticated,
    async (req, res) => {
      try {
        ensureUser(req);
        const threadId = Number(req.params.id);

        if (isNaN(threadId)) {
          return res.status(400).json({ error: "Invalid thread ID" });
        }

        // Verify the thread exists
        const thread = await dbStorage.getForumThreadById(threadId);
        if (!thread) {
          return res.status(404).json({ error: "Thread not found" });
        }

        const { content } = req.body;
        if (!content) {
          return res.status(400).json({ error: "Comment content is required" });
        }

        const newComment = await dbStorage.createForumComment({
          content,
          userId: req.user.id,
          threadId,
        });

        res.status(201).json(newComment);
      } catch (error) {
        console.error(
          `Error adding comment to thread ${req.params.id}:`,
          error
        );
        res.status(500).json({ error: "Failed to add comment" });
      }
    }
  );

  // Update a comment
  app.put("/api/forum/comments/:id", isAuthenticated, async (req, res) => {
    try {
      ensureUser(req);
      const commentId = Number(req.params.id);

      if (isNaN(commentId)) {
        return res.status(400).json({ error: "Invalid comment ID" });
      }

      // Get the comments to check owner
      const comments = await dbStorage.getForumCommentsByThreadId(-1); // Temporary workaround until we have proper getCommentById
      const comment = comments.find((c) => c.id === commentId);

      if (!comment) {
        return res.status(404).json({ error: "Comment not found" });
      }

      // Only allow the comment owner or an admin to update it
      const isAdmin =
        req.user.isAdmin || req.user.id === 1 || req.user.id === 2;
      if (comment.userId !== req.user.id && !isAdmin) {
        return res
          .status(403)
          .json({ error: "You don't have permission to update this comment" });
      }

      const { content } = req.body;
      if (!content) {
        return res.status(400).json({ error: "Comment content is required" });
      }

      const updatedComment = await dbStorage.updateForumComment(commentId, {
        content,
        updatedAt: new Date(),
      });

      res.json(updatedComment);
    } catch (error) {
      console.error(`Error updating comment ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to update comment" });
    }
  });

  // Delete a comment
  app.delete("/api/forum/comments/:id", isAuthenticated, async (req, res) => {
    try {
      ensureUser(req);
      const commentId = Number(req.params.id);

      if (isNaN(commentId)) {
        return res.status(400).json({ error: "Invalid comment ID" });
      }

      // Get the comments to check owner
      const comments = await dbStorage.getForumCommentsByThreadId(-1); // Temporary workaround until we have proper getCommentById
      const comment = comments.find((c) => c.id === commentId);

      if (!comment) {
        return res.status(404).json({ error: "Comment not found" });
      }

      // Only allow the comment owner or an admin to delete it
      const isAdmin =
        req.user.isAdmin || req.user.id === 1 || req.user.id === 2;
      if (comment.userId !== req.user.id && !isAdmin) {
        return res
          .status(403)
          .json({ error: "You don't have permission to delete this comment" });
      }

      await dbStorage.deleteForumComment(commentId);

      res.json({ success: true, message: "Comment deleted successfully" });
    } catch (error) {
      console.error(`Error deleting comment ${req.params.id}:`, error);
      res.status(500).json({ error: "Failed to delete comment" });
    }
  });

  const httpServer = createServer(app);

  // Add WebSocket support
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws) => {
    console.log("WebSocket client connected");

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log("WebSocket message received:", data);

        // Handle different message types here
        if (data.type === "ping") {
          ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
        }
      } catch (error) {
        console.error("Error processing WebSocket message:", error);
      }
    });

    ws.on("close", () => {
      console.log("WebSocket client disconnected");
    });
  });

  return httpServer;
}
