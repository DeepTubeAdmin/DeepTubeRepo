/**
 * Shared shuffle utilities that can be used on both client and server
 */

import seedrandom from 'seedrandom';

/**
 * Create a seeded random number generator
 * @param seed Seed string to create a deterministic random number generator
 * @returns A function that returns a random number between 0 and 1
 */
export function createSeededRandom(seed: string): () => number {
  return seedrandom(seed);
}

/**
 * Generate a random shuffle seed
 * @returns A string to use as a shuffle seed
 */
export function generateShuffleSeed(): string {
  // Use a timestamp for uniqueness
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `shuffle-${random}-${timestamp}`;
}

/**
 * Shuffle an array using a seeded random number generator
 * @param array Array to shuffle
 * @param seed Seed for random number generator
 * @returns A new shuffled array
 */
export function shuffleArray<T>(array: T[], seed: string): T[] {
  const rng = createSeededRandom(seed);
  // Create a copy of the array to avoid modifying the original
  const shuffled = [...array];
  
  // Fisher-Yates shuffle algorithm with seeded random
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

/**
 * Check if the seed param exists in the URL
 * @param url URL to check
 * @returns true if the URL has a shuffle or shuffleSeed parameter
 */
export function hasShuffleSeedParam(url: string): boolean {
  const urlObj = new URL(url, 'http://example.com');
  return urlObj.searchParams.has('shuffle') || urlObj.searchParams.has('shuffleSeed');
}

/**
 * Extract or generate a shuffle seed from a URL
 * @param url URL string to parse
 * @returns Shuffle seed from URL or a newly generated one
 */
export function getShuffleSeedFromUrl(url: string): string | null {
  const urlObj = new URL(url, 'http://example.com');
  
  // Get the seed from the URL parameters
  if (urlObj.searchParams.has('shuffleSeed')) {
    return urlObj.searchParams.get('shuffleSeed');
  }
  
  // Generate a new seed if shuffle is enabled but no seed is provided
  if (urlObj.searchParams.has('shuffle') && urlObj.searchParams.get('shuffle') !== 'false') {
    return generateShuffleSeed();
  }
  
  // No shuffle requested
  return null;
}