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
