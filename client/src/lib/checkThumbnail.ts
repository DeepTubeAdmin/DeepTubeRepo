/**
 * Helper function to check if a thumbnail is loading correctly
 * and replace with a placeholder if not
 */
export function checkThumbnail(thumbnailUrl: string, videoId: number): string {
  // If no thumbnail is provided, use our API endpoint
  if (!thumbnailUrl || thumbnailUrl === 'null' || thumbnailUrl === 'undefined') {
    return `/api/videos/${videoId}/thumbnail`;
  }
  
  // If it's already using our endpoint, return as is
  if (thumbnailUrl.startsWith('/api/videos/')) {
    return thumbnailUrl;
  }
  
  // If it's pointing to a relative path that doesn't exist or an invalid URL, fix it
  if (thumbnailUrl.startsWith('./') || thumbnailUrl.startsWith('/')) {
    return `/api/videos/${videoId}/thumbnail`;
  }
  
  // Return the original URL for valid remote URLs
  return thumbnailUrl;
}
