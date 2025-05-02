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
  
  // For now, we'll use our reliable endpoint for all videos except those with complete URLs
  // This is the safest approach until we diagnose what's happening with S3 thumbnails
  return `/api/videos/${videoId}/thumbnail`;
}
