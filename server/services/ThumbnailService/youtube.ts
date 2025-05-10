/**
 * YouTube utilities for ThumbnailService
 */

/**
 * Extract YouTube video ID from a URL
 * @param url YouTube URL
 * @returns YouTube video ID or null if not found
 */
export function extractYouTubeVideoId(url: string | null): string | null {
  if (!url) return null;
  
  // Match various YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/vi\/|img\.youtube\.com\/vi\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * YouTube thumbnail quality options
 */
type YouTubeThumbnailQuality = 'default' | 'hqdefault' | 'mqdefault' | 'sddefault' | 'maxresdefault';

/**
 * Get YouTube thumbnail URL for a video ID
 * @param youtubeId YouTube video ID
 * @param quality Thumbnail quality (default, hqdefault, mqdefault, sddefault, maxresdefault)
 * @returns YouTube thumbnail URL
 */
export function getYouTubeThumbnailUrl(youtubeId: string | null, quality: string = 'hqdefault'): string | null {
  if (!youtubeId) return null;
  
  // Ensure quality is a valid option
  const validQualities: YouTubeThumbnailQuality[] = ['default', 'hqdefault', 'mqdefault', 'sddefault', 'maxresdefault'];
  const thumbnailQuality = validQualities.includes(quality as YouTubeThumbnailQuality) 
    ? quality 
    : 'hqdefault';
  
  return `https://img.youtube.com/vi/${youtubeId}/${thumbnailQuality}.jpg`;
}

/**
 * Download a YouTube thumbnail
 * @param youtubeId YouTube video ID
 * @param quality Thumbnail quality
 * @returns The thumbnail binary data or null if an error occurred
 */
export async function downloadYouTubeThumbnail(youtubeId: string | null, quality: string = 'hqdefault'): Promise<Buffer | null> {
  if (!youtubeId) return null;
  
  const thumbnailUrl = getYouTubeThumbnailUrl(youtubeId, quality);
  if (!thumbnailUrl) return null;
  
  try {
    const response = await fetch(thumbnailUrl);
    if (!response.ok) {
      console.error(`Failed to download YouTube thumbnail: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('Error downloading YouTube thumbnail:', error);
    return null;
  }
}