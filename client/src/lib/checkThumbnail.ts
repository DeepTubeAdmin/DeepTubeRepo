/**
 * Enhanced helper function to check if a thumbnail is loading correctly
 * and replace with a placeholder if not
 * 
 * Now with enhanced error handling and retry capabilities
 */

// Keep track of failed thumbnails to avoid repeated failures
const failedThumbnails = new Set<string>();

// Keep track of thumbnails in validation process to prevent redundant checks
const inProgressValidations = new Map<string, Promise<string>>();

/**
 * Validates if a thumbnail URL is actually accessible
 * @param url The URL to validate
 * @param retries Number of retry attempts
 * @param timeout Timeout in milliseconds
 * @returns Promise resolving to true if valid, false otherwise
 */
async function validateThumbnailUrl(url: string, retries = 2, timeout = 3000): Promise<boolean> {
  // Skip validation for data URLs and already known good formats
  if (url.startsWith('data:image/')) {
    return true;
  }
  
  // Skip validation for already known failed URLs
  if (failedThumbnails.has(url)) {
    return false;
  }
  
  // Add AbortController to handle timeouts properly
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Only attempt validation for URLs that can be fetched (http/https)
      if (!url.startsWith('http') && !url.startsWith('/api/')) {
        return false;
      }
      
      // For local API endpoints, simply check if they're in the right format
      if (url.startsWith('/api/videos/') && url.includes('/thumbnail')) {
        return true;
      }
      
      const response = await fetch(url, {
        method: 'HEAD', // Only fetch headers to check status
        signal: controller.signal,
        cache: 'no-cache', // Prevent caching issues
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        // Verify it's actually an image by checking content-type
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.startsWith('image/')) {
          return true;
        }
      }
      
      // Wait before retrying
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
      }
    } catch (error) {
      console.warn(`Thumbnail validation attempt ${attempt + 1} failed for ${url}:`, error);
      
      // Wait before retrying
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }
  
  // If we reach here, all attempts failed
  failedThumbnails.add(url);
  return false;
}

/**
 * Get a default SVG placeholder for a video
 */
function getDefaultPlaceholder(videoId: number): string {
  return `/api/videos/${videoId}/thumbnail`;
}

/**
 * Main function to check and process thumbnails with validation
 */
export async function validateAndGetThumbnail(thumbnailUrl: string, videoId: number): Promise<string> {
  // If there's already a validation in progress for this URL, return its promise
  const cacheKey = `${thumbnailUrl}-${videoId}`;
  if (inProgressValidations.has(cacheKey)) {
    return inProgressValidations.get(cacheKey)!;
  }
  
  const validationPromise = (async () => {
    // If no thumbnail is provided, use our API endpoint
    if (!thumbnailUrl || thumbnailUrl === 'null' || thumbnailUrl === 'undefined' || thumbnailUrl === '') {
      return getDefaultPlaceholder(videoId);
    }
    
    // If it's already using our endpoint, check if it works
    if (thumbnailUrl.startsWith('/api/videos/')) {
      const isValid = await validateThumbnailUrl(thumbnailUrl);
      return isValid ? thumbnailUrl : getDefaultPlaceholder(videoId);
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
        const ytUrl = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
        const isValid = await validateThumbnailUrl(ytUrl);
        return isValid ? ytUrl : getDefaultPlaceholder(videoId);
      }
      
      // If URL extraction failed but we have a full URL, validate it
      if (thumbnailUrl.startsWith('http')) {
        const isValid = await validateThumbnailUrl(thumbnailUrl);
        return isValid ? thumbnailUrl : getDefaultPlaceholder(videoId);
      }
    }
    
    // Direct image URL handling with validation
    if (thumbnailUrl.startsWith('data:image/') || 
        thumbnailUrl.startsWith('http') || 
        thumbnailUrl.startsWith('https')) {
      const isValid = await validateThumbnailUrl(thumbnailUrl);
      return isValid ? thumbnailUrl : getDefaultPlaceholder(videoId);
    }
    
    // Handle S3 URLs with validation
    if (thumbnailUrl.includes('s3.amazonaws.com')) {
      const isValid = await validateThumbnailUrl(thumbnailUrl);
      return isValid ? thumbnailUrl : getDefaultPlaceholder(videoId);
    }
    
    // For all other cases, use API endpoint
    return getDefaultPlaceholder(videoId);
  })();
  
  // Store the promise in the map to prevent duplicate validations
  inProgressValidations.set(cacheKey, validationPromise);
  
  try {
    const result = await validationPromise;
    return result;
  } finally {
    // Clean up after resolution to prevent memory leaks
    inProgressValidations.delete(cacheKey);
  }
}

/**
 * Synchronous version that returns immediately while validation happens in background
 * This prevents UI blocking while still ensuring thumbnails are validated
 */
export function checkThumbnail(thumbnailUrl: string, videoId: number): string {
  // If no thumbnail is provided, use our API endpoint immediately
  if (!thumbnailUrl || thumbnailUrl === 'null' || thumbnailUrl === 'undefined' || thumbnailUrl === '') {
    return getDefaultPlaceholder(videoId);
  }
  
  // If it's already using our endpoint, return as is
  if (thumbnailUrl.startsWith('/api/videos/')) {
    return thumbnailUrl;
  }
  
  // Start async validation in background
  validateAndGetThumbnail(thumbnailUrl, videoId).catch(err => {
    console.error(`Error validating thumbnail for video ${videoId}:`, err);
  });
  
  // Return immediately with best guess, the validation will update UI if needed
  
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
  
  // For all other cases, use SVG placeholder while thumbnail generates
  return getDefaultPlaceholder(videoId);
}