/**
 * YouTube utilities for ThumbnailService
 */

import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';

/**
 * Extract YouTube video ID from a URL
 * @param url YouTube URL
 * @returns YouTube video ID or null
 */
export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  
  // YouTube URL patterns
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/user\/\w+\/\w+\/|youtube\.com\/attribution_link\?a=\w+&u=\/watch\?v=)([^#&?]*).*/,
    /(?:youtube.com\/shorts\/)([^#&?]*).*/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * Get YouTube thumbnail URL
 * @param youtubeId YouTube video ID
 * @param quality Thumbnail quality ('maxresdefault', 'hqdefault', 'mqdefault', 'default')
 * @returns YouTube thumbnail URL
 */
export function getYouTubeThumbnailUrl(youtubeId: string | null, quality: string = 'maxresdefault'): string | null {
  if (!youtubeId) return null;
  return `https://img.youtube.com/vi/${youtubeId}/${quality}.jpg`;
}

/**
 * Download a YouTube thumbnail to a local file
 * @param youtubeId YouTube video ID
 * @param outputPath Path to save the thumbnail
 * @param quality Thumbnail quality
 * @returns Whether the download was successful
 */
export async function downloadYouTubeThumbnail(
  youtubeId: string,
  outputPath: string,
  quality: string = 'maxresdefault'
): Promise<boolean> {
  try {
    const url = getYouTubeThumbnailUrl(youtubeId, quality);
    if (!url) return false;
    
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to download YouTube thumbnail: ${response.status}`);
      return false;
    }
    
    const buffer = Buffer.from(await response.arrayBuffer());
    
    // Ensure output directory exists
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });
    
    // Write the thumbnail file
    await fs.writeFile(outputPath, buffer);
    
    return true;
  } catch (error) {
    console.error('Error downloading YouTube thumbnail:', error);
    return false;
  }
}