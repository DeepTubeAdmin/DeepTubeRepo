/**
 * YouTube Utilities
 * 
 * A collection of helper functions for working with YouTube videos
 * and embed codes.
 */

/**
 * Extract YouTube video ID from various formats of YouTube URLs or embed codes
 * 
 * @param text The text containing a YouTube URL or embed code
 * @returns The YouTube video ID or null if not found
 */
export function extractYouTubeVideoId(text: string | null): string | null {
  if (!text) return null;

  // Match patterns like:
  // - youtube.com/watch?v=VIDEO_ID
  // - youtu.be/VIDEO_ID
  // - youtube.com/embed/VIDEO_ID
  // - youtube.com/v/VIDEO_ID
  const patterns = [
    /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/i,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/i,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/i,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/i,
    /youtube\.com\/watch\?.*&v=([a-zA-Z0-9_-]{11})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Generate a YouTube thumbnail URL from a video ID
 * 
 * @param videoId The YouTube video ID
 * @param quality The thumbnail quality (default: 'hqdefault')
 * @returns The URL to the YouTube thumbnail
 */
export function getYouTubeThumbnailUrl(videoId: string, quality: 'default' | 'hqdefault' | 'mqdefault' | 'sddefault' | 'maxresdefault' = 'hqdefault'): string {
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
}

/**
 * Generate a YouTube embed URL from a video ID
 * 
 * @param videoId The YouTube video ID
 * @param autoplay Whether to enable autoplay (default: false)
 * @returns The YouTube embed URL
 */
export function getYouTubeEmbedUrl(videoId: string, autoplay: boolean = false): string {
  return `https://www.youtube.com/embed/${videoId}${autoplay ? '?autoplay=1' : ''}`;
}

/**
 * Generate a YouTube share URL from a video ID
 * 
 * @param videoId The YouTube video ID
 * @returns The YouTube share URL
 */
export function getYouTubeShareUrl(videoId: string): string {
  return `https://youtu.be/${videoId}`;
}