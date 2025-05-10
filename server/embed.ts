/**
 * Embed View Functionality
 * 
 * This module provides HTML templates and handlers for external embedding
 * of DeepTube content on other websites.
 */

import { Request, Response } from 'express';
import { Video } from '@shared/schema';
import * as youtubeUtils from './lib/youtubeUtils';

// Generate embed HTML for different content types
export function generateEmbedHtml(content: Video, baseUrl: string): string {
  // Create different embed HTML based on content type
  if (content.contentType === 'video' && content.videoUrl) {
    // For videos, create a simple video player
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="description" content="${content.description || `AI-generated content shared on DeepTube`}">
        <meta name="generator" content="${content.aiGenerator || 'DeepTube'}">
        <meta property="og:title" content="${content.title}">
        <meta property="og:type" content="video">
        <meta property="og:image" content="${content.thumbnail || ''}">
        <meta property="og:url" content="${baseUrl}/media/${content.id}">
        <title>${content.title} - DeepTube</title>
        <style>
          body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background-color: #000; }
          .video-container { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
          video { max-width: 100%; max-height: 100%; }
          .watermark { position: absolute; bottom: 10px; right: 10px; color: rgba(255,255,255,0.7); font-family: Arial, sans-serif; font-size: 14px; }
          a { color: #f97316; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="video-container">
          <video src="${content.videoUrl}" controls autoplay playsinline></video>
          <div class="watermark">Hosted on <a href="${baseUrl}/media/${content.id}" target="_blank">DeepTube</a></div>
        </div>
      </body>
      </html>
    `;
  } else if (content.contentType === 'image' && content.imageUrl) {
    // For images, create a responsive image viewer
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="description" content="${content.description || `AI-generated image shared on DeepTube`}">
        <meta name="generator" content="${content.aiGenerator || 'DeepTube'}">
        <meta property="og:title" content="${content.title}">
        <meta property="og:type" content="image">
        <meta property="og:image" content="${content.imageUrl || ''}">
        <meta property="og:url" content="${baseUrl}/media/${content.id}">
        <title>${content.title} - DeepTube</title>
        <style>
          body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background-color: #000; }
          .image-container { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
          img { max-width: 100%; max-height: 100%; object-fit: contain; }
          .watermark { position: absolute; bottom: 10px; right: 10px; color: rgba(255,255,255,0.7); font-family: Arial, sans-serif; font-size: 14px; }
          a { color: #f97316; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="image-container">
          <img src="${content.imageUrl}" alt="${content.title}">
          <div class="watermark">Hosted on <a href="${baseUrl}/media/${content.id}" target="_blank">DeepTube</a></div>
        </div>
      </body>
      </html>
    `;
  } else if (content.contentType === 'embed' && content.embedCode) {
    // For embeds like YouTube or Vimeo, parse the embed code
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
    } else if (content.vimeoId) {
      // For Vimeo
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
            <iframe src="https://player.vimeo.com/video/${content.vimeoId}" frameborder="0" allowfullscreen></iframe>
            <div class="watermark">Shared via <a href="${baseUrl}/media/${content.id}" target="_blank">DeepTube</a></div>
          </div>
        </body>
        </html>
      `;
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
export async function handleEmbedRequest(req: Request, res: Response, getVideoById: (id: number) => Promise<Video | undefined>) {
  try {
    const contentId = parseInt(req.params.id);
    if (isNaN(contentId)) {
      return res.status(400).send('Invalid content ID');
    }
    
    // Get the content details
    const content = await getVideoById(contentId);
    if (!content) {
      return res.status(404).send('Content not found');
    }
    
    // Only allow embedding approved content or featured content (admin selected)
    if (content.reviewStatus !== 'approved' && !content.featured) {
      return res.status(403).send('This content is not available for embedding');
    }
    
    // Generate base URL
    const baseUrl = process.env.HOST || req.protocol + '://' + req.get('host');
    
    // Generate HTML
    const embedHtml = generateEmbedHtml(content, baseUrl);
    
    // Set content type and send the HTML
    res.setHeader('Content-Type', 'text/html');
    res.send(embedHtml);
    
  } catch (error) {
    console.error('Error creating embed view:', error);
    res.status(500).send('Error creating embed view');
  }
}