/**
 * Utility functions for handling YouTube videos
 */

// Extract YouTube video ID from various YouTube URL formats
export function extractYoutubeVideoId(url: string): string | null {
  if (!url) return null;
  
  console.log("YouTube URL detected:", url);
  
  // Handle YouTube Shorts format
  if (url.includes('youtube.com/shorts/')) {
    const shortsRegex = /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/;
    const shortsMatch = url.match(shortsRegex);
    if (shortsMatch) {
      console.log("Extracted YouTube Shorts ID:", shortsMatch[1]);
      return shortsMatch[1];
    }
  }
  
  // Handle various other YouTube URL formats
  // youtube.com/watch?v=VIDEOID
  // youtu.be/VIDEOID
  // youtube.com/embed/VIDEOID
  // youtube.com/v/VIDEOID
  const regex = /(?:youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=)|youtu\.be\/)([\w-]{11})/;
  const match = url.match(regex);
  
  console.log("Extracted YouTube ID:", match ? match[1] : null);
  return match ? match[1] : null;
}

// Extract YouTube video ID from embed code
export function extractYoutubeIdFromEmbed(embedCode: string): string | null {
  if (!embedCode) return null;
  
  console.log('Extracting YouTube ID from embed code:', embedCode.substring(0, 100));
  
  // Extract from iframe src attribute (improved pattern to handle various formats)
  const srcRegex = /src="https?:\/\/(?:www\.)?youtube\.com\/embed\/([\w-]{11})(?:\?.*)?"|\/embed\/([\w-]{11})(?:\?.*)?"|\/embed\/([\w-]{11})(?:\?.*)? /;
  const match = embedCode.match(srcRegex);
  
  if (match) {
    // The ID could be in group 1, 2, or 3 depending on which pattern matched
    const videoId = match[1] || match[2] || match[3];
    console.log('Extracted YouTube ID from embed code:', videoId);
    return videoId;
  }
  
  return null;
}

// Convert YouTube URL to embed code
export function youtubeUrlToEmbedCode(url: string, autoplay: boolean = false): string | null {
  const videoId = extractYoutubeVideoId(url);
  
  if (!videoId) return null;
  
  // Note: We add different parameters for different contexts
  // Always include origin parameter to avoid cross-origin issues with YouTube API
  // Use a dynamic origin based on current window location
  const host = typeof window !== 'undefined' ? window.location.host : 'deeptube.replit.app';
  const protocol = typeof window !== 'undefined' ? window.location.protocol : 'https:';
  const origin = `${protocol}//${host}`;
  
  console.log(`youtubeUrlToEmbedCode: Using origin ${origin} for YouTube embed`);
  
  // Build a simple parameter string without URLSearchParams (which can cause issues)
  const params = [
    'rel=0',                  // Don't show related videos
    'enablejsapi=1',          // Enable JavaScript API
    'modestbranding=1',       // Reduce YouTube branding
    'playsinline=1',          // Play inline on mobile devices
    'iv_load_policy=3',       // Don't show annotations
    'controls=1',             // Show video controls 
    `origin=${encodeURIComponent(origin)}` // Set origin for postMessage API
  ];
  
  // Add autoplay param if requested
  if (autoplay) {
    params.push('autoplay=1');
    // For player in popup we want to start unmuted
    params.push('mute=0');
  } else {
    // For preview/thumbnail we want to start muted
    params.push('mute=1');
  }
  
  // Construct the embed code - ensure we're consistent with all embeds
  return `<iframe 
    width="100%" 
    height="100%" 
    src="https://www.youtube.com/embed/${videoId}?${params.join('&')}" 
    title="YouTube video player" 
    frameborder="0" 
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
    allowfullscreen 
    loading="lazy"
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
  ></iframe>`;
}

// Get YouTube thumbnail URL from video ID
export function getYoutubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}
