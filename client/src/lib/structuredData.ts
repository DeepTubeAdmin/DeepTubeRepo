/**
 * Utility functions for generating structured data (schema.org) markup
 * for better SEO and rich snippets in search results
 */

import { Video as SchemaVideo } from '@shared/schema';
import { Video as TypeVideo } from '@/types';

// Type can be either from schema or client-side type definition
type Video = SchemaVideo | TypeVideo;

/**
 * Generate VideoObject structured data for a video
 * @param video The video object
 * @param baseUrl The base URL of the site
 * @returns JSON-LD structured data as a string
 */
export function generateVideoStructuredData(video: Video, baseUrl: string = 'https://www.deeptubeai.com'): string {
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
    },
    'keywords': [
      'AI generated video',
      'AI media',
      video.aiGenerator || 'AI technology',
      'ethical AI',
      'DeepTube',
      ...(video.prompt ? [video.prompt.split(' ').slice(0, 5).join(', ')] : []),
      ...(video.categoryId ? ['AI ' + video.contentType] : [])
    ].join(', ')
  };

  // Add AI generator and prompt information if available
  if (video.aiGenerator) {
    videoData['creator'] = {
      '@type': 'Organization',
      'name': video.aiGenerator
    };
  }
  
  // Add the prompt as a specific property
  if (video.prompt) {
    videoData['about'] = {
      '@type': 'Thing',
      'name': 'AI Prompt',
      'description': video.prompt
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
export function generateImageStructuredData(image: Video, baseUrl: string = 'https://www.deeptubeai.com'): string {
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
    'license': 'https://creativecommons.org/licenses/by/4.0/',
    'keywords': [
      'AI generated image',
      'AI art',
      image.aiGenerator || 'AI technology',
      'ethical AI',
      'DeepTube',
      ...(image.prompt ? [image.prompt.split(' ').slice(0, 5).join(', ')] : []),
      ...(image.categoryId ? ['AI ' + image.contentType] : [])
    ].join(', ')
  };

  // Add dimensions if available - using a type assertion since width/height might come from API
  const imageWithDimensions = image as any;
  if (imageWithDimensions.width && imageWithDimensions.height) {
    imageData['width'] = imageWithDimensions.width;
    imageData['height'] = imageWithDimensions.height;
  }

  // Add AI generator and prompt information if available
  if (image.aiGenerator) {
    imageData['creator'] = {
      '@type': 'Organization',
      'name': image.aiGenerator
    };
  }
  
  // Add the prompt as a specific property
  if (image.prompt) {
    imageData['about'] = {
      '@type': 'Thing',
      'name': 'AI Prompt',
      'description': image.prompt
    };
  }

  return JSON.stringify(imageData);
}

/**
 * Generate WebSite structured data
 * @param baseUrl The base URL of the site
 * @returns JSON-LD structured data as a string
 */
export function generateWebsiteStructuredData(baseUrl: string = 'https://www.deeptubeai.com'): string {
  const websiteData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    'name': 'DeepTubeAI.com',
    'alternateName': 'DeepTube',
    'url': baseUrl,
    'description': 'AI-generated video & image sharing platform for cutting-edge tech and creators. Connect with innovators and showcase your work!',
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
