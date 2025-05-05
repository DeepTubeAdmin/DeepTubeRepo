/**
 * Thumbnail Routes - Handles all thumbnail-related API endpoints
 * 
 * These routes provide access to thumbnails for videos, images, and embedded content.
 * They use the thumbnailService and s3Service to generate, retrieve, and serve thumbnails.
 */

import type { Express, Request, Response } from "express";
import s3Service from "./services/s3Service";
import thumbnailService from "./services/thumbnailService";
import { storage as dbStorage } from "./storage";
import path from "path";
import fs from "fs/promises";

/**
 * Register all thumbnail-related routes
 * @param app Express application
 */
export function registerThumbnailRoutes(app: Express): void {
  // Main endpoint for retrieving thumbnails
  app.get("/api/videos/:id/thumbnail", getThumbnail);
  app.get("/api/content/:id/thumbnail", getThumbnail); // Alternative endpoint name
  
  // Admin endpoints for thumbnail regeneration
  app.post("/api/admin/regenerate-thumbnail/:id", regenerateThumbnail);
  app.post("/api/admin/regenerate-all-thumbnails", regenerateAllThumbnails);
  
  // Utility endpoint for SVG placeholders
  app.get("/api/placeholder-svg/:type", getPlaceholderSvg);
}

/**
 * Handle thumbnail requests for any content type
 * @param req Express request
 * @param res Express response
 */
async function getThumbnail(req: Request, res: Response): Promise<void> {
  try {
    const contentId = parseInt(req.params.id);
    const forcePlaceholder = req.query.placeholder === 'true';
    
    if (isNaN(contentId)) {
      res.status(400).send('Invalid content ID');
      return;
    }

    // Get content info from database
    const content = await dbStorage.getVideoById(contentId);
    if (!content) {
      res.status(404).send('Content not found');
      return;
    }

    // Set cache control headers
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // If forced placeholder is requested, serve it immediately
    if (forcePlaceholder) {
      console.log(`Serving SVG placeholder for video ${contentId} (forced)`);
      return servePlaceholderSvg(res, content.contentType);
    }
    
    // For YouTube embeds, extract the ID and redirect to YouTube's thumbnail
    if (content.contentType === 'embed' && content.embedCode) {
      const youtubeId = thumbnailService.extractYoutubeVideoId(content.embedCode);
      if (youtubeId) {
        const youtubeThumbnailUrl = thumbnailService.getYoutubeThumbnailUrl(youtubeId);
        console.log(`Redirecting to YouTube thumbnail for video ${contentId}: ${youtubeThumbnailUrl}`);
        res.redirect(youtubeThumbnailUrl);
        return;
      }
    }
    
    // Try to retrieve an existing S3 thumbnail
    try {
      const s3Key = s3Service.getThumbnailS3Key(contentId);
      const signedUrl = await s3Service.getSignedS3Url(s3Key);
      
      console.log(`Proxying S3 image for content ${contentId}`);
      
      // We proxy the request to avoid CORS issues and add our own headers
      const response = await fetch(signedUrl);
      if (response.ok) {
        const buffer = Buffer.from(await response.arrayBuffer());
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        
        res.setHeader('Content-Type', contentType);
        res.send(buffer);
        return;
      }
    } catch (error) {
      console.log(`No existing S3 thumbnail found for ${contentId}, generating new one`);
    }
    
    // Only generate a new thumbnail if this is an explicit regeneration request
    // or if we truly couldn't find an existing thumbnail
    if (req.query.regenerate === 'true' || !content.thumbnail) {
      try {
        // Determine source URL and content type
        let sourceUrl = null;
        let youtubeId = null;
        
        if (content.contentType === 'video') {
          sourceUrl = content.videoUrl;
        } else if (content.contentType === 'image') {
          sourceUrl = content.imageUrl;
        } else if (content.contentType === 'embed' && content.embedCode) {
          youtubeId = thumbnailService.extractYoutubeVideoId(content.embedCode);
        }
        
        // Generate a new thumbnail
        const s3Key = await thumbnailService.generateThumbnail(
          contentId,
          content.contentType,
          sourceUrl,
          youtubeId
        );
      
      // Update the database with the new thumbnail path
      await dbStorage.updateVideo(contentId, {
        thumbnail: `/api/videos/${contentId}/thumbnail`
      });
      
      // Now try to serve the newly generated thumbnail
      try {
        const signedUrl = await s3Service.getSignedS3Url(s3Key);
        const response = await fetch(signedUrl);
        
        if (response.ok) {
          const buffer = Buffer.from(await response.arrayBuffer());
          const contentType = response.headers.get('content-type') || 'image/jpeg';
          
          res.setHeader('Content-Type', contentType);
          res.send(buffer);
          return;
        }
      } catch (finalError) {
        console.error(`Failed to serve newly generated thumbnail: ${finalError}`);
      }
    } catch (generationError) {
      console.error(`Error generating thumbnail: ${generationError}`);
    }
    
    // If all else fails, serve a placeholder SVG
    servePlaceholderSvg(res, content.contentType);
  } catch (error) {
    console.error(`Error in thumbnail endpoint: ${error}`);
    res.status(500).send('Internal server error');
  }
}

/**
 * Admin endpoint to regenerate a single thumbnail
 * @param req Express request
 * @param res Express response
 */
async function regenerateThumbnail(req: Request, res: Response): Promise<void> {
  try {
    const contentId = parseInt(req.params.id);
    
    if (isNaN(contentId)) {
      res.status(400).json({ error: 'Invalid content ID' });
      return;
    }

    // Get content info
    const content = await dbStorage.getVideoById(contentId);
    if (!content) {
      res.status(404).json({ error: 'Content not found' });
      return;
    }
    
    // Determine source URL and content type
    let sourceUrl = null;
    let youtubeId = null;
    
    if (content.contentType === 'video') {
      sourceUrl = content.videoUrl;
    } else if (content.contentType === 'image') {
      sourceUrl = content.imageUrl;
    } else if (content.contentType === 'embed' && content.embedCode) {
      youtubeId = thumbnailService.extractYoutubeVideoId(content.embedCode);
    }
    
    // Force regenerate the thumbnail
    const s3Key = await thumbnailService.generateThumbnail(
      contentId,
      content.contentType,
      sourceUrl,
      youtubeId
    );
    
    // Update the database with the thumbnail path
    await dbStorage.updateVideo(contentId, {
      thumbnail: `/api/videos/${contentId}/thumbnail`
    });
    
    res.json({
      success: true,
      message: `Successfully regenerated thumbnail for content ${contentId}`,
      contentId,
      s3Key,
      thumbnailUrl: `/api/videos/${contentId}/thumbnail`
    });
  } catch (error) {
    console.error(`Error regenerating thumbnail: ${error}`);
    res.status(500).json({ error: 'Failed to regenerate thumbnail' });
  }
}

/**
 * Admin endpoint to regenerate all thumbnails
 * @param req Express request
 * @param res Express response
 */
async function regenerateAllThumbnails(req: Request, res: Response): Promise<void> {
  try {
    // Get all content
    const contentType = req.query.type as string | undefined;
    const content = await dbStorage.getVideos(undefined, contentType);
    
    const results = {
      total: content.length,
      succeeded: 0,
      failed: 0,
      details: [] as Array<{ id: number; title: string; success: boolean; error?: string }>
    };
    
    // Process each item
    for (const item of content) {
      try {
        // Determine source URL and content type
        let sourceUrl = null;
        let youtubeId = null;
        
        if (item.contentType === 'video') {
          sourceUrl = item.videoUrl;
        } else if (item.contentType === 'image') {
          sourceUrl = item.imageUrl;
        } else if (item.contentType === 'embed' && item.embedCode) {
          youtubeId = thumbnailService.extractYoutubeVideoId(item.embedCode);
        }
        
        if (!sourceUrl && !youtubeId) {
          throw new Error('No source URL or YouTube ID available');
        }
        
        // Generate the thumbnail
        await thumbnailService.generateThumbnail(
          item.id,
          item.contentType,
          sourceUrl,
          youtubeId
        );
        
        // Update the database with the thumbnail path
        await dbStorage.updateVideo(item.id, {
          thumbnail: `/api/videos/${item.id}/thumbnail`
        });
        
        results.succeeded++;
        results.details.push({
          id: item.id,
          title: item.title,
          success: true
        });
      } catch (itemError) {
        results.failed++;
        results.details.push({
          id: item.id,
          title: item.title,
          success: false,
          error: itemError instanceof Error ? itemError.message : String(itemError)
        });
      }
    }
    
    res.json({
      success: true,
      message: 'Thumbnail regeneration process completed',
      results
    });
  } catch (error) {
    console.error(`Error regenerating all thumbnails: ${error}`);
    res.status(500).json({ error: 'Failed to regenerate all thumbnails' });
  }
}

/**
 * Generate and serve an SVG placeholder
 * @param res Express response
 * @param contentType Content type (video, image, embed)
 */
async function getPlaceholderSvg(req: Request, res: Response): Promise<void> {
  try {
    const contentType = req.params.type || 'unknown';
    const svg = await generatePlaceholderSvg(contentType);
    
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for a day
    res.send(svg);
  } catch (error) {
    console.error(`Error generating SVG placeholder: ${error}`);
    res.status(500).send('Failed to generate placeholder');
  }
}

/**
 * Helper function to serve an SVG placeholder
 * @param res Express response
 * @param contentType Content type
 */
function servePlaceholderSvg(res: Response, contentType = 'video'): void {
  console.log(`Serving SVG placeholder for content type: ${contentType}`);
  
  const normalizedType = contentType === 'videos' ? 'video' : 
                         contentType === 'images' ? 'image' : 
                         contentType;
  
  const svg = generatePlaceholderSvg(normalizedType);
  
  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(svg);
}

/**
 * Generate an SVG placeholder for the given content type
 * @param contentType Content type
 * @returns SVG string
 */
function generatePlaceholderSvg(contentType: string): string {
  const bgColor = '#0f172a';
  const textColor = '#f59e0b';
  const width = 800;
  const height = 450;
  
  // Display proper content type in the SVG
  const displayType = contentType.charAt(0).toUpperCase() + contentType.slice(1);
  
  if (contentType === 'image') {
    return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${bgColor}" />
  <rect x="${width/2 - 125}" y="${height/2 - 75}" width="250" height="150" fill="#222" />
  <circle cx="${width/2}" cy="${height/2 - 45}" r="20" fill="${textColor}" />
  <rect x="${width/2 - 75}" y="${height/2}" width="150" height="60" fill="#333" />
  <text x="${width/2}" y="${height - 50}" font-family="Arial" font-size="24" fill="${textColor}" text-anchor="middle">
    AI Generated ${displayType}
  </text>
</svg>`;
  }
  
  // Default video placeholder with play button
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${bgColor}" />
  <circle cx="${width/2}" cy="${height/2}" r="100" fill="#222" />
  <polygon points="${width/2 - 30},${height/2 - 45} ${width/2 - 30},${height/2 + 45} ${width/2 + 45},${height/2}" fill="${textColor}" stroke="#000" stroke-width="2" />
  <text x="${width/2}" y="${height - 50}" font-family="Arial" font-size="24" fill="${textColor}" text-anchor="middle">
    AI Generated ${displayType}
  </text>
</svg>`;
}
