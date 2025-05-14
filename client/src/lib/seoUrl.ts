/**
 * Utility functions for SEO-friendly URLs
 */

import { Video } from "@/types";

/**
 * Creates a SEO-friendly URL slug from a video title and ID
 * @param video A video object with title and ID
 * @returns SEO-friendly URL slug
 */
export function createSeoFriendlySlug(video: { title: string; id: number | string }): string {
  if (!video || !video.title) {
    return `${video?.id || ''}`;
  }
  
  // Create a URL-friendly slug from the title
  const slug = video.title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with a single one
    .trim() // Trim leading/trailing spaces or hyphens
    .slice(0, 50); // Limit length for compatibility
  
  // Return the slug with ID for uniqueness
  return `${slug}-${video.id}`;
}

/**
 * Extracts an ID from a slug
 * @param slug SEO-friendly URL slug
 * @returns The extracted ID or undefined
 */
export function getIdFromSlug(slug: string): number | undefined {
  if (!slug) return undefined;
  
  // Get the last segment after the last hyphen
  // Format is usually: my-nice-title-123
  const match = slug.match(/-(\d+)$/);
  
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  
  return undefined;
}

/**
 * Creates a full SEO-friendly URL for a video
 * @param video Video object
 * @param baseUrl Base URL of the site
 * @returns Full SEO-friendly URL
 */
export function getSeoUrl(video: { title: string; id: number | string }, baseUrl = ''): string {
  const slug = createSeoFriendlySlug(video);
  return `${baseUrl}/media/${slug}`;
}