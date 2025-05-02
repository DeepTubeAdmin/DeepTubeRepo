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
  
  // For YouTube thumbnails, leave them as is
  if (thumbnailUrl.includes('youtube.com') || thumbnailUrl.includes('img.youtube.com')) {
    return thumbnailUrl;
  }
  
  // For S3 URLs, leave them as is
  if (thumbnailUrl.includes('amazonaws.com') || thumbnailUrl.includes('deeptubebucket')) {
    return thumbnailUrl;
  }
  
  // If it's pointing to a relative path, fix it
  if (thumbnailUrl.startsWith('./') || (thumbnailUrl.startsWith('/') && !thumbnailUrl.startsWith('/api/'))) {
    return `/api/videos/${videoId}/thumbnail`;
  }
  
  // Return the original URL for other valid URLs
  return thumbnailUrl;
}
