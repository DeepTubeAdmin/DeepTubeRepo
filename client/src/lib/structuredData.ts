/**
 * Utility functions for generating structured data (schema.org) markup
 * for better SEO and rich snippets in search results
 */

import { Video } from '@shared/schema';

/**
 * Generate VideoObject structured data for a video
 * @param video The video object
 * @param baseUrl The base URL of the site
 * @returns JSON-LD structured data as a string
 */
export function generateVideoStructuredData(video: Video, baseUrl: string = 'https://deeptube.co'): string {
  const videoUrl = `${baseUrl}/media/${video.id}`;
  const embedUrl = video.videoUrl || '';
  const thumbnailUrl = video.thumbnail || '';
  
  const videoData: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    'name': video.title,
    'description': video.description || `${video.title} - AI generated content on DeepTube`,
    'thumbnailUrl': thumbnailUrl,
    'uploadDate': new Date(video.createdAt).toISOString(),
    'duration': video.duration ? `PT${Math.floor(video.duration / 60)}M${video.duration % 60}S` : 'PT0M0S',
    'contentUrl': embedUrl,
    'embedUrl': embedUrl,
    'potentialAction': {
      '@type': 'WatchAction',
      'target': videoUrl
    }
  };

  // Add AI generator and prompt information if available
  if (video.aiGenerator) {
    videoData['creator'] = {
      '@type': 'Organization',
      'name': video.aiGenerator
    };
  }

  return JSON.stringify(videoData);
}

/**
 * Generate ImageObject structured data for an image
 * @param image The image object (using Video type since we store images in the same table)
 * @param baseUrl The base URL of the site
 * @returns JSON-LD structured data as a string
 */
export function generateImageStructuredData(image: Video, baseUrl: string = 'https://deeptube.co'): string {
  const imageUrl = `${baseUrl}/media/${image.id}`;
  const contentUrl = image.imageUrl || image.thumbnail || '';
  
  const imageData: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    'name': image.title,
    'description': image.description || `${image.title} - AI generated image on DeepTube`,
    'contentUrl': contentUrl,
    'thumbnailUrl': image.thumbnail || '',
    'uploadDate': new Date(image.createdAt).toISOString(),
    'license': 'https://creativecommons.org/licenses/by/4.0/'
  };

  // Add AI generator and prompt information if available
  if (image.aiGenerator) {
    imageData['creator'] = {
      '@type': 'Organization',
      'name': image.aiGenerator
    };
  }

  return JSON.stringify(imageData);
}

/**
 * Generate WebSite structured data
 * @param baseUrl The base URL of the site
 * @returns JSON-LD structured data as a string
 */
export function generateWebsiteStructuredData(baseUrl: string = 'https://deeptube.co'): string {
  const websiteData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    'name': 'DeepTube.co',
    'alternateName': 'DeepTube',
    'url': baseUrl,
    'description': 'Discover and share AI-generated videos, images, and content. Join DeepTube, the ethical community for AI media creators and enthusiasts.',
    'potentialAction': {
      '@type': 'SearchAction',
      'target': {
        '@type': 'EntryPoint',
        'urlTemplate': `${baseUrl}/search?q={search_term_string}`
      },
      'query-input': 'required name=search_term_string'
    }
  };

  return JSON.stringify(websiteData);
}
