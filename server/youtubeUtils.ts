/**
 * YouTube Utilities
 * 
 * Provides helper functions for working with YouTube videos,
 * including thumbnail extraction, video ID parsing, and more.
 */

/**
 * Extract YouTube video ID from an embed code or URL
 * @param embedCode YouTube embed code or URL
 * @returns YouTube video ID or null if not found
 */
export function extractYoutubeVideoId(embedCode: string | null): string | null {
  if (!embedCode) return null;
  
  // Match various YouTube URL formats
  const patterns = [
    // Standard YouTube watch URL
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})(?:&|$)/i,
    
    // YouTube short URL
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})(?:&|$)/i,
    
    // YouTube embed URL
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})(?:&|$)/i,
    
    // YouTube iframe embed
    /src="[^"]*(?:youtube\.com\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:&|$)/i,
    
    // YouTube shorts URL
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})(?:&|$)/i,
    
    // Fall back to just looking for a standard YouTube ID anywhere in the string
    /([a-zA-Z0-9_-]{11})/i
  ];
  
  for (const pattern of patterns) {
    const match = embedCode.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Get the URL for a YouTube thumbnail
 * @param videoId YouTube video ID
 * @param quality Thumbnail quality (maxresdefault, hqdefault, mqdefault, sddefault)
 * @returns Full URL to YouTube thumbnail
 */
export function getYoutubeThumbnailUrl(videoId: string, quality: 'maxresdefault' | 'hqdefault' | 'mqdefault' | 'sddefault' = 'hqdefault'): string {
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
}

/**
 * Check if a video ID is a valid YouTube video ID format
 * @param videoId Potential YouTube video ID
 * @returns true if the string matches YouTube ID format
 */
export function isValidYoutubeId(videoId: string): boolean {
  if (!videoId) return false;
  
  // YouTube IDs are 11 characters consisting of letters, numbers, - and _
  return /^[a-zA-Z0-9_-]{11}$/.test(videoId);
}
