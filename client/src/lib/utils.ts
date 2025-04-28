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

// Convert YouTube URL to embed code
export function youtubeUrlToEmbedCode(url: string): string | null {
  const videoId = extractYoutubeVideoId(url);
  
  if (!videoId) return null;
  
  return `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${videoId}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
}

// Get YouTube thumbnail URL from video ID
export function getYoutubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}
