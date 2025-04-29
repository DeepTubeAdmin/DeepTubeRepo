import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function calculatePrice(credits: number): string {
  const price = (credits / 1000).toFixed(2);
  return `$${price}`;
}

export function extractVideoId(vimeoUrl: string | null): string | null {
  if (!vimeoUrl) return null;
  
  // Match patterns like:
  // https://vimeo.com/123456789
  // https://player.vimeo.com/video/123456789
  const regex = /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)([0-9]+)/;
  const match = vimeoUrl.match(regex);
  
  return match ? match[1] : null;
}

// Extract YouTube video ID from various YouTube URL formats
export function extractYoutubeVideoId(url: string): string | null {
  if (!url) return null;
  
  // Handle various YouTube URL formats
  // youtube.com/watch?v=VIDEOID
  // youtu.be/VIDEOID
  // youtube.com/embed/VIDEOID
  // youtube.com/v/VIDEOID
  const regex = /(?:youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=)|youtu\.be\/)([\w-]{11})/;
  const match = url.match(regex);
  
  return match ? match[1] : null;
}

// Extract YouTube video ID from embed code
export function extractYoutubeIdFromEmbed(embedCode: string): string | null {
  if (!embedCode) return null;
  
  // Extract from iframe src attribute
  const srcRegex = /src="https?:\/\/(?:www\.)?youtube\.com\/embed\/([\w-]{11})(?:\?.*)?"/;
  const match = embedCode.match(srcRegex);
  
  return match ? match[1] : null;
}

// Convert YouTube URL to embed code
export function youtubeUrlToEmbedCode(url: string): string | null {
  const videoId = extractYoutubeVideoId(url);
  
  if (!videoId) return null;
  
  // Note: We're using different embed parameters for different contexts.
  // In the preview we use mute=1 and in the modal we enable autoplay
  return `<iframe 
    width="100%" 
    height="100%" 
    src="https://www.youtube.com/embed/${videoId}?rel=0&enablejsapi=1&mute=1" 
    title="YouTube video player" 
    frameborder="0" 
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
    allowfullscreen 
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
  ></iframe>`;
}

// Get YouTube thumbnail URL from video ID
export function getYoutubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

// Extract Reddit embed information
export function extractRedditInfo(embedCode: string): { subreddit: string | null, postId: string | null, user: string | null } {
  if (!embedCode) return { subreddit: null, postId: null, user: null };
  
  // Handle blockquote Reddit embed format
  // <blockquote class="reddit-embed-bq" data-embed-height="546">
  // <a href="https://www.reddit.com/r/aivideo/comments/1k80go8/face_punching_iconic_characters/">Face Punching Iconic Characters</a>
  // by<a href="https://www.reddit.com/user/Cloud_Reviews/">u/Cloud_Reviews</a>
  // in<a href="https://www.reddit.com/r/aivideo/">aivideo</a>
  // </blockquote><script async="" src="https://embed.reddit.com/widgets.js" charset="UTF-8"></script>
  
  let subreddit = null;
  let postId = null;
  let user = null;
  
  // Extract subreddit
  const subredditRegex = /reddit\.com\/r\/([^\/]+)/;
  const subredditMatch = embedCode.match(subredditRegex);
  if (subredditMatch) {
    subreddit = subredditMatch[1];
  }
  
  // Extract post ID
  const postIdRegex = /comments\/([^\/]+)/;
  const postIdMatch = embedCode.match(postIdRegex);
  if (postIdMatch) {
    postId = postIdMatch[1];
  }
  
  // Extract username
  const userRegex = /user\/([^\/]+)/;
  const userMatch = embedCode.match(userRegex);
  if (userMatch) {
    user = userMatch[1];
  }
  
  return { subreddit, postId, user };
}

// Check if a string is a Reddit embed
export function isRedditEmbed(code: string): boolean {
  return code.includes('reddit-embed-bq') || 
         code.includes('embed.reddit.com') || 
         (code.includes('reddit.com/r/') && code.includes('comments'));
}

// Get a Reddit thumbnail URL (fallback)
export function getRedditThumbnailUrl(subreddit: string): string {
  return `https://placehold.co/400x225?text=r/${subreddit}`;
}

// Convert a Reddit URL to an embed code
export function redditUrlToEmbedCode(url: string): string | null {
  if (!url || !url.includes('reddit.com/r/')) return null;
  
  // Regular expression to extract subreddit, post ID, and title
  const regex = /reddit\.com\/r\/([^\/]+)\/comments\/([^\/]+)(?:\/([^\/]+))?/;
  const match = url.match(regex);
  
  if (!match) return null;
  
  const subreddit = match[1];
  const postId = match[2];
  let title = match[3] || '';
  
  // Format title for readability
  title = title
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
    
  return `<blockquote class="reddit-embed-bq" style="height:500px" data-embed-height="546">
  <a href="${url}">${title || 'Reddit Post'}</a>
  in <a href="https://www.reddit.com/r/${subreddit}/">r/${subreddit}</a>
  </blockquote>
  <script async src="https://embed.reddit.com/widgets.js" charset="UTF-8"></script>`;
}
