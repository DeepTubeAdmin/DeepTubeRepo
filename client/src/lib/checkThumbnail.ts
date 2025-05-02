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
  if (thumbnailUrl.includes('youtube.com/') || thumbnailUrl.includes('img.youtube.com/') || thumbnailUrl.includes('ytimg.com/')) {
    // If it's already a full URL, use it directly
    if (thumbnailUrl.startsWith('http')) {
      return thumbnailUrl;
    }
    
    // If it's a video ID, create a proper YouTube thumbnail URL
    const youtubeIdMatch = thumbnailUrl.match(/([a-zA-Z0-9_-]{11})/); 
    if (youtubeIdMatch) {
      const videoId = youtubeIdMatch[1];
      return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    }
  }
  
  // For all other cases, use our reliable API endpoint that proxies the S3 content
  // Add a cache buster to ensure we get fresh content
  return `/api/videos/${videoId}/thumbnail?t=${Date.now()}`;
}
