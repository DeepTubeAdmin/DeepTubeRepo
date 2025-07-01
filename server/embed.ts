/**
 * Embed View Functionality
 *
 * This module provides HTML templates and handlers for external embedding
 * of DeepTube content on other websites.
 */

import { Request, Response } from "express";
import { Video } from "@shared/schema";
import * as youtubeUtils from "./lib/youtubeUtils";
import { storage as dbStorage } from "./storage";

// Generate embed HTML for different content types
export function generateEmbedHtml(content: Video, baseUrl: string): string {
  console.log("baseUrl==>", baseUrl);
  let thumbnail = `${baseUrl}/logo.jpg`;

  if (content.thumbnail) {
    thumbnail = `https://deeptubebucket.s3.us-east-2.amazonaws.com/thumbnails/${content.contentType}-${content.id}.jpg`;
  }

  if (content.contentType === "video" && content.videoUrl) {
    // For videos, create a simple video player
    console.log("Generating embed HTML for video content:", content);

    let videoUrl = content.videoUrl;
    if (content.videoUrl) {
      videoUrl = `${baseUrl}${videoUrl}`;
    }
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        
        <!-- Primary Meta Tags -->
        <title>${content.title} - DeepTube</title>
        <meta name="title" content="${content.title} - DeepTube">
        <meta name="description" content="${
          content.description || `AI-generated content shared on DeepTube`
        }">
        <meta name="generator" content="${content.aiGenerator || "DeepTube"}">
        <meta name="author" content="DeepTube">
        <meta name="robots" content="index, follow">
        <link rel="canonical" href="${baseUrl}/media/${content.id}">

        <!-- Open Graph / Facebook -->
        <meta property="fb:app_id" content="${
          process.env.FACEBOOK_APP_ID || ""
        }">
        <meta property="og:type" content="article">
        <meta property="og:url" content="${baseUrl}/media/${content.id}">
        <meta property="og:site_name" content="DeepTube">
        <meta property="og:title" content="${content.title}">
        <meta property="og:description" content="${
          content.description || `AI-generated content shared on DeepTube`
        }">
        <meta property="og:image" content="${thumbnail}">
        <meta property="og:image:secure_url" content="${thumbnail}">
        <meta property="og:image:width" content="1280">
        <meta property="og:image:height" content="720">
        <meta property="og:locale" content="en_US">
        
        <!-- Twitter -->
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" content="${content.title}">
        <meta name="twitter:description" content="${
          content.description || `AI-generated content shared on DeepTube`
        }">
        <meta name="twitter:image" content="${thumbnail}">
        <meta name="twitter:site" content="@DeepTube">

        <style>
          body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background-color: #000; }
          .content-container { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; position: relative; cursor: pointer; }
          .thumbnail { max-width: 100%; max-height: 100%; object-fit: contain; }
          .play-overlay { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.7); border-radius: 50%; padding: 20px; transition: all 0.3s ease; }
          .play-overlay:hover { background: rgba(0,0,0,0.9); transform: translate(-50%, -50%) scale(1.1); }
          .play-button { width: 0; height: 0; border-left: 30px solid #f97316; border-top: 20px solid transparent; border-bottom: 20px solid transparent; margin-left: 10px; }
          .watermark { position: absolute; bottom: 10px; right: 10px; color: rgba(255,255,255,0.7); font-family: Arial, sans-serif; font-size: 14px; }
          a { color: #f97316; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="content-container" onclick="window.open('${baseUrl}/media/${content.id}', '_blank')">
          <img src="${thumbnail}" alt="${content.title}" class="thumbnail">
          <div class="play-overlay">
            <div class="play-button"></div>
          </div>
          <div class="watermark">Watch on <a href="${baseUrl}/media/${
      content.id
    }" target="_blank">DeepTube</a></div>
        </div>
      </body>
      </html>
    `;
  } else if (content.contentType === "image" && content.imageUrl) {
    // For images, create a responsive image viewer
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="description" content="${
          content.description || `AI-generated image shared on DeepTube`
        }">
        <meta name="generator" content="${content.aiGenerator || "DeepTube"}">
        <meta property="og:title" content="${content.title}">
        <meta property="og:type" content="article">
        <meta property="og:image" content="${thumbnail}">
        <meta property="og:image:secure_url" content="${thumbnail}">
        <meta property="og:image:width" content="1280">
        <meta property="og:image:height" content="720">
        <meta property="og:url" content="${baseUrl}/media/${content.id}">
        
        <!-- Twitter -->
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" content="${content.title}">
        <meta name="twitter:description" content="${
          content.description || `AI-generated image shared on DeepTube`
        }">
        <meta name="twitter:image" content="${thumbnail}">
        <meta name="twitter:site" content="@DeepTube">
        
        <title>${content.title} - DeepTube</title>
        <style>
          body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background-color: #000; }
          .content-container { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; position: relative; cursor: pointer; }
          .thumbnail { max-width: 100%; max-height: 100%; object-fit: contain; }
          .watermark { position: absolute; bottom: 10px; right: 10px; color: rgba(255,255,255,0.7); font-family: Arial, sans-serif; font-size: 14px; }
          a { color: #f97316; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="content-container" onclick="window.open('${baseUrl}/media/${content.id}', '_blank')">
          <img src="${content.imageUrl}" alt="${content.title}" class="thumbnail">
          <div class="watermark">View on <a href="${baseUrl}/media/${
      content.id
    }" target="_blank">DeepTube</a></div>
        </div>
      </body>
      </html>
    `;
  } else if (content.contentType === "embed" && content.embedCode) {
    // For embeds like YouTube, parse the embed code
    // First check if it's YouTube
    const youtubeId = youtubeUtils.extractYouTubeVideoId(content.embedCode);

    if (youtubeId) {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${content.title} - DeepTube</title>
          <style>
            body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; }
            .embed-container { position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; }
            .embed-container iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
            .watermark { position: absolute; bottom: 10px; right: 10px; color: rgba(255,255,255,0.7); font-family: Arial, sans-serif; font-size: 14px; z-index: 10; }
            a { color: #f97316; text-decoration: none; }
          </style>
        </head>
        <body>
          <div class="embed-container">
            <iframe src="https://www.youtube.com/embed/${youtubeId}" frameborder="0" allowfullscreen></iframe>
            <div class="watermark">Shared via <a href="${baseUrl}/media/${content.id}" target="_blank">DeepTube</a></div>
          </div>
        </body>
        </html>
      `;
      // Vimeo support has been removed
    } else {
      // Generic embed code
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${content.title} - DeepTube</title>
          <style>
            body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; }
            .embed-container { position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; }
            .embed-container iframe, .embed-container div { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
            .watermark { position: absolute; bottom: 10px; right: 10px; color: rgba(255,255,255,0.7); font-family: Arial, sans-serif; font-size: 14px; z-index: 10; }
            a { color: #f97316; text-decoration: none; }
          </style>
        </head>
        <body>
          <div class="embed-container">
            <div>${content.embedCode}</div>
            <div class="watermark">Shared via <a href="${baseUrl}/media/${content.id}" target="_blank">DeepTube</a></div>
          </div>
        </body>
        </html>
      `;
    }
  }

  // Fallback for unsupported content
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${content.title} - DeepTube</title>
      <style>
        body, html { margin: 0; padding: 0; font-family: Arial, sans-serif; background: #121212; color: #fff; display: flex; justify-content: center; align-items: center; height: 100%; }
        .container { text-align: center; padding: 20px; }
        a { color: #f97316; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Content Not Available for Embedding</h2>
        <p>This content type is not supported for direct embedding.</p>
        <p><a href="${baseUrl}/media/${content.id}" target="_blank">View on DeepTube</a></p>
      </div>
    </body>
    </html>
  `;
}

// Handle requests for media embed
export async function handleEmbedRequest(
  req: Request,
  res: Response,
  getVideoById: (id: number) => Promise<Video | undefined>
) {
  try {
    const contentId = parseInt(req.params.id);
    if (isNaN(contentId)) {
      return res.status(400).send("Invalid content ID");
    }

    // Get the content details
    const content = await getVideoById(contentId);
    if (!content) {
      return res.status(404).send("Content not found");
    }

    // Only allow embedding approved content or featured content (admin selected)
    if (content.reviewStatus !== "approved" && !content.featured) {
      return res
        .status(403)
        .send("This content is not available for embedding");
    }

    // Generate base URL
    // const baseUrl = req.protocol + "://" + req.get("host");
    const baseUrl = "https://www.deeptubeai.com";

    // Generate HTML
    const embedHtml = generateEmbedHtml(content, baseUrl);

    // Track this embed view for analytics
    try {
      // Update view count for embedded content
      // This helps track popularity of content shared externally
      await dbStorage.incrementViews(contentId);
      console.log(`Tracked embed view for content ID: ${contentId}`);
    } catch (viewError) {
      console.error("Error tracking embed view:", viewError);
      // Continue despite error - viewing should still work
    }

    // Set content type and send the HTML
    res.setHeader("Content-Type", "text/html");
    res.setHeader("X-Frame-Options", "ALLOW-FROM *"); // Allow embedding in iframes
    res.setHeader("Access-Control-Allow-Origin", "*"); // Allow cross-origin embedding
    res.send(embedHtml);
  } catch (error) {
    console.error("Error creating embed view:", error);
    res.status(500).send("Error creating embed view");
  }
}
