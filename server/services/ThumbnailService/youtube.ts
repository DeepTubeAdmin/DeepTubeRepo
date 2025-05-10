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