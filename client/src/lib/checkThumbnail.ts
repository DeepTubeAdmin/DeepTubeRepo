/**
 * Enhanced helper function to check if a thumbnail is loading correctly
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
  
  // YouTube handling - extract ID and use direct YouTube image API
  if (thumbnailUrl.includes('youtube.com') || thumbnailUrl.includes('youtu.be') || 
      thumbnailUrl.includes('ytimg.com')) {
    
    // Extract YouTube ID using multiple patterns
    let youtubeId = null;
    const patterns = [
      /youtube\.com\/vi\/([a-zA-Z0-9_-]{11})/,
      /img\.youtube\.com\/vi\/([a-zA-Z0-9_-]{11})/,
      /youtu\.be\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
      /([a-zA-Z0-9_-]{11})/ // Last resort
    ];
    
    for (const pattern of patterns) {
      const match = thumbnailUrl.match(pattern);
      if (match && match[1]) {
        youtubeId = match[1];
        break;
      }
    }
    
    if (youtubeId) {
      // Use YouTube's thumbnail API with the high-quality version
      return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
    }
    
    // If URL extraction failed but we have a full URL, use it
    if (thumbnailUrl.startsWith('http')) {
      return thumbnailUrl;
    }
  }
  
  // Direct image URL handling
  if (thumbnailUrl.startsWith('data:image/') || 
      thumbnailUrl.startsWith('http') || 
      thumbnailUrl.startsWith('https')) {
    return thumbnailUrl;
  }
  
  // Handle S3 URLs
  if (thumbnailUrl.includes('s3.amazonaws.com')) {
    return thumbnailUrl;
  }
  
  // For all other cases, use our reliable API endpoint
  // Add a cache buster to ensure we get fresh content
  return `/api/videos/${videoId}/thumbnail?t=${Date.now()}`;
}