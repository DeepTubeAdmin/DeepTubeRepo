/**
 * Sitemap Generation Service
 * 
 * This module provides functions to generate XML sitemaps for the website,
 * including a specialized video sitemap for better search engine indexing.
 */

import { Request, Response } from 'express';
import { Video, Category } from '@shared/schema';
import { formatISO } from 'date-fns';
import { storage } from './storage';
import { getSignedS3Url } from './combined-services';

const BASE_URL = 'https://deeptube.co';

/**
 * Generate the basic site sitemap
 * @returns XML string of the sitemap
 */
export async function generateBasicSitemap(): Promise<string> {
  // Get categories for sitemap
  const categories = await storage.getCategories();
  
  // Start XML
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  
  // Add home page
  xml += `  <url>
    <loc>${BASE_URL}</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>\n`;
  
  // Add category pages
  for (const category of categories) {
    xml += `  <url>
    <loc>${BASE_URL}/category/${category.slug}</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>\n`;
  }
  
  // Add other important pages
  const staticPages = [
    { url: '/about', priority: '0.7' },
    { url: '/faq', priority: '0.7' },
    { url: '/terms', priority: '0.7' },
    { url: '/privacy', priority: '0.7' },
    { url: '/auth', priority: '0.6' },
  ];
  
  for (const page of staticPages) {
    xml += `  <url>
    <loc>${BASE_URL}${page.url}</loc>
    <changefreq>monthly</changefreq>
    <priority>${page.priority}</priority>
  </url>\n`;
  }
  
  // Close XML
  xml += '</urlset>';
  
  return xml;
}

/**
 * Generate a video sitemap following Google's guidelines
 * @returns XML string of the video sitemap
 */
export async function generateVideoSitemap(): Promise<string> {
  // Get all approved videos - limit to a reasonable number for performance
  const videos = await storage.getApprovedVideos(500);
  
  // Start XML
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
  xml += '        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n';
  
  // Add each video
  for (const video of videos) {
    if (!video || video.contentType !== 'video') continue;
    
    // Calculate SEO-friendly URL (we will implement this later)
    const seoFriendlyUrl = createSeoFriendlyUrl(video);
    
    // Get the thumbnail URL with signed URL if needed
    let thumbnailUrl = video.thumbnail;
    if (thumbnailUrl && thumbnailUrl.includes('s3.amazonaws.com')) {
      try {
        // This pattern allows us to extract the S3 key from the thumbnail URL
        const s3Key = thumbnailUrl.split('/').slice(-1)[0].split('?')[0];
        if (s3Key) {
          thumbnailUrl = await getSignedS3Url(`thumbnails/${s3Key}`, 86400 * 7); // 7 day expiry for search engines
        }
      } catch (error) {
        console.error('Error generating signed URL for thumbnail:', error);
      }
    }

    let videoUrl = video.videoUrl;
    if (videoUrl && videoUrl.includes('s3.amazonaws.com')) {
      try {
        // Extract S3 key from the video URL
        const s3Key = videoUrl.split('/').slice(-1)[0].split('?')[0];
        if (s3Key) {
          videoUrl = await getSignedS3Url(`uploads/${s3Key}`, 86400 * 7); // 7 day expiry for search engines
        }
      } catch (error) {
        console.error('Error generating signed URL for video:', error);
      }
    }
    
    // Generate ISO date format for publication date
    const pubDate = video.createdAt ? formatISO(new Date(video.createdAt)) : formatISO(new Date());
    
    // Create duration string for the video
    const duration = video.duration ? Math.floor(video.duration) : 0;
    
    // Get category name if available
    let categoryName = '';
    if (video.categoryId) {
      try {
        const category = await storage.getCategoryById(video.categoryId);
        if (category) {
          categoryName = category.name;
        }
      } catch (error) {
        console.error('Error fetching category:', error);
      }
    }
    
    // Generate tags for the video
    const tags = [
      'AI generated video',
      video.aiGenerator || 'AI technology',
      categoryName,
      'DeepTube'
    ].filter(Boolean).join(',');
    
    // Add the video entry
    xml += `  <url>
    <loc>${BASE_URL}/media/${video.id}</loc>
    <video:video>
      <video:thumbnail_loc>${thumbnailUrl}</video:thumbnail_loc>
      <video:title>${escapeXml(video.title)}</video:title>
      <video:description>${escapeXml(video.description || `${video.title} - AI generated video on DeepTube`)}</video:description>
      ${videoUrl ? `<video:content_loc>${videoUrl}</video:content_loc>` : ''}
      <video:player_loc>${BASE_URL}/embed/${video.id}</video:player_loc>
      <video:duration>${duration}</video:duration>
      <video:publication_date>${pubDate}</video:publication_date>
      <video:family_friendly>yes</video:family_friendly>
      <video:requires_subscription>no</video:requires_subscription>
      <video:live>no</video:live>
      <video:tag>${escapeXml(tags)}</video:tag>
      <video:category>${escapeXml(categoryName || 'AI media')}</video:category>
    </video:video>
  </url>\n`;
  }
  
  // Close XML
  xml += '</urlset>';
  
  return xml;
}

/**
 * Generate an image sitemap following Google's guidelines
 * @returns XML string of the image sitemap
 */
export async function generateImageSitemap(): Promise<string> {
  // Get all approved images - limit to a reasonable number for performance
  const images = await storage.getApprovedImages(500);
  
  // Start XML
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
  xml += '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';
  
  // Add each image
  for (const image of images) {
    if (!image || image.contentType !== 'image') continue;
    
    // Get the image URL with signed URL if needed
    let imageUrl = image.imageUrl || image.thumbnail;
    if (imageUrl && imageUrl.includes('s3.amazonaws.com')) {
      try {
        // This pattern allows us to extract the S3 key from the image URL
        const s3Key = imageUrl.split('/').slice(-1)[0].split('?')[0];
        if (s3Key) {
          imageUrl = await getSignedS3Url(
            image.contentType === 'image' ? `uploads/${s3Key}` : `thumbnails/${s3Key}`,
            86400 * 7
          ); // 7 day expiry for search engines
        }
      } catch (error) {
        console.error('Error generating signed URL for image:', error);
      }
    }
    
    // Add the image entry
    xml += `  <url>
    <loc>${BASE_URL}/media/${image.id}</loc>
    <image:image>
      <image:loc>${imageUrl}</image:loc>
      <image:title>${escapeXml(image.title)}</image:title>
      <image:caption>${escapeXml(image.description || `${image.title} - AI generated image on DeepTube`)}</image:caption>
    </image:image>
  </url>\n`;
  }
  
  // Close XML
  xml += '</urlset>';
  
  return xml;
}

/**
 * Generate a sitemap index file that references all the individual sitemaps
 * @returns XML string of the sitemap index
 */
export async function generateSitemapIndex(): Promise<string> {
  const lastmod = formatISO(new Date());
  
  // Start XML
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  
  // Add each sitemap
  xml += `  <sitemap>
    <loc>${BASE_URL}/sitemap.xml</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>\n`;
  
  xml += `  <sitemap>
    <loc>${BASE_URL}/sitemap-video.xml</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>\n`;
  
  xml += `  <sitemap>
    <loc>${BASE_URL}/sitemap-image.xml</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>\n`;
  
  // Close XML
  xml += '</sitemapindex>';
  
  return xml;
}

/**
 * Handle the sitemap request
 * @param req Express request
 * @param res Express response
 */
export async function handleSitemapRequest(req: Request, res: Response) {
  try {
    const sitemap = await generateBasicSitemap();
    res.header('Content-Type', 'application/xml');
    res.send(sitemap);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
}

/**
 * Handle the video sitemap request
 * @param req Express request
 * @param res Express response
 */
export async function handleVideoSitemapRequest(req: Request, res: Response) {
  try {
    const sitemap = await generateVideoSitemap();
    res.header('Content-Type', 'application/xml');
    res.send(sitemap);
  } catch (error) {
    console.error('Error generating video sitemap:', error);
    res.status(500).send('Error generating video sitemap');
  }
}

/**
 * Handle the image sitemap request
 * @param req Express request
 * @param res Express response
 */
export async function handleImageSitemapRequest(req: Request, res: Response) {
  try {
    const sitemap = await generateImageSitemap();
    res.header('Content-Type', 'application/xml');
    res.send(sitemap);
  } catch (error) {
    console.error('Error generating image sitemap:', error);
    res.status(500).send('Error generating image sitemap');
  }
}

/**
 * Handle the sitemap index request
 * @param req Express request
 * @param res Express response
 */
export async function handleSitemapIndexRequest(req: Request, res: Response) {
  try {
    const sitemapIndex = await generateSitemapIndex();
    res.header('Content-Type', 'application/xml');
    res.send(sitemapIndex);
  } catch (error) {
    console.error('Error generating sitemap index:', error);
    res.status(500).send('Error generating sitemap index');
  }
}

/**
 * Create a SEO-friendly URL slug from a video title and ID
 * @param video The video object
 * @returns SEO-friendly URL
 */
export function createSeoFriendlyUrl(video: Video): string {
  // Create a URL-friendly slug from the title
  const slug = video.title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with a single one
    .trim(); // Trim leading/trailing spaces or hyphens
  
  // Return the URL with the slug and ID for uniqueness
  return `${BASE_URL}/media/${slug}-${video.id}`;
}

/**
 * Escape XML special characters
 * @param text The text to escape
 * @returns Escaped text
 */
function escapeXml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Add these methods to storage.ts interface and implementation later
declare module './storage' {
  interface IStorage {
    getApprovedVideos(limit?: number): Promise<Video[]>;
    getApprovedImages(limit?: number): Promise<Video[]>;
    getCategoryById(id: number): Promise<Category | undefined>;
  }
}