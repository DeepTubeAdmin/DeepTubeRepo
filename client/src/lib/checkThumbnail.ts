/**
 * Helper function to check if a thumbnail is loading correctly
 * and replace with a placeholder if not
 */
export function checkThumbnail(thumbnailUrl: string, videoId: number): string {
  // If no thumbnail is provided, use our API endpoint
  if (!thumbnailUrl || thumbnailUrl === 'null' || thumbnailUrl === 'undefined' || thumbnailUrl === '') {
    return `/api/videos/${videoId}/thumbnail`;
  }
  
  // If it's already using our endpoint, return as is
  if (thumbnailUrl.startsWith('/api/videos/')) {
    return thumbnailUrl;
  }
  
  // If it's a YouTube URL, use it directly
  if (thumbnailUrl.includes('youtube.com/') || thumbnailUrl.includes('img.youtube.com/')) {
    return thumbnailUrl;
  }
  
  // For all other cases, use our reliable API endpoint that proxies the S3 content
  // Add a cache buster to ensure we get fresh content
  return `/api/videos/${videoId}/thumbnail?t=${Date.now()}`;
}
