/**
 * Embed Routes
 * 
 * Handles routes related to embedded content views
 */

import { Express } from 'express';
import { handleEmbedRequest } from '../embed';
import { storage as dbStorage } from '../storage';

// List of known bot/crawler user agent patterns
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
  /baiduspider/i
];

// Function to check if request is from a bot
function isBot(userAgent: string): boolean {
  if (!userAgent) return false;
  return botPatterns.some(pattern => pattern.test(userAgent));
}

export function registerEmbedRoutes(app: Express) {
  // Handler for both embed routes
  const embedHandler = (req: any, res: any) => {
    const userAgent = req.get('user-agent');
    
    if (isBot(userAgent)) {
      // For bots/crawlers, show the embed page with meta tags
      handleEmbedRequest(req, res, dbStorage.getVideoById);
    } else {
      // For regular browsers, redirect to the media page
      const contentId = req.params.id;
      res.redirect(302, `/media/${contentId}`);
    }
  };

  // Embed view for content - allows direct embedding on external sites
  app.get('/media/:id/embed', embedHandler);
  
  // Alternative route to support the embed URL format in share dialog
  app.get('/embed/:id', embedHandler);
  
  console.log('Embed routes registered successfully');
}