import { Video } from "@shared/schema";
import express, { Request, Response } from "express";
import { storage as dbStorage } from './storage';

// Variable to store cache of content response
let contentCache: { [key: string]: any } = {};
// Variable to store cached categories
let cachedCategories: any[] = [];

/**
 * New Content Feed API Handler
 * Implements the unified endless content feed with 4 rows videos, 2 rows images
 * and random advertisement placement
 */
export async function handleContentFeed(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const categorySlug = req.query.category as string || '';
    // Add sortBy parameter handling
    const sortBy = (req.query.sortBy as 'newest' | 'oldest' | 'most-viewed' | 'trending' | 'popular') || 'trending';
    
    // IMPROVED SHUFFLE APPROACH - PRIORITIZE SHUFFLESEED PARAMETER
    // Check for shuffle parameter in URL
    const hasShuffleParam = req.query.shuffle !== undefined;
    // Check for the new shuffleSeed parameter (used by newer client code)
    const hasShuffleSeedParam = req.query.shuffleSeed !== undefined;
    
    // For debugging
    console.log(`Content feed request: page=${page}, category=${categorySlug || 'all'}, sortBy=${sortBy}, hasShuffleInURL=${hasShuffleParam}, hasShuffleSeedParam=${hasShuffleSeedParam}`);
    
    // Force shuffle to true when we have any shuffle parameter in URL
    const shuffle = hasShuffleParam || hasShuffleSeedParam;
    
    // Generate the seed for shuffling, with priority
    let shuffleSeed = '';
    if (hasShuffleSeedParam) {
      shuffleSeed = req.query.shuffleSeed as string;
    } else if (hasShuffleParam) {
      shuffleSeed = req.query.shuffle as string;
    } else if (shuffle) {
      // Generate a random shuffle seed
      const timestamp = Date.now();
      shuffleSeed = `server-${timestamp.toString(36)}`;
    }
    
    if (shuffleSeed) {
      console.log(`Shuffle mode is ACTIVE, using seed: ${shuffleSeed}`);
    }
    
    // Create cache key based on parameters
    const cacheKey = getCacheKey(categorySlug, sortBy, shuffleSeed);
    
    // Cache categories to avoid multiple DB calls
    if (cachedCategories.length === 0) {
      cachedCategories = await dbStorage.getCategories();
      console.log(`Cached ${cachedCategories.length} categories for content selection`);
    }

    // New response structure for the unified content feed
    const response: {
      featured: {
        video: Video | null
      },
      content: {
        videos: Video[],
        images: Video[],
        adPositions: number[],
        hasMore: boolean
      }
    } = {
      featured: {
        video: null
      },
      content: {
        videos: [],
        images: [],
        adPositions: [],
        hasMore: false
      }
    };

    // On first page or if we're refreshing content
    if (page === 1 || (shuffle && shuffleSeed)) {
      // Reset cache if forced shuffle
      if (shuffle && shuffleSeed) {
        const cacheTimestamp = Date.now();
        resetContentCache(`${categorySlug}_feed_${cacheTimestamp}`, false);
      }
      
      // 1. Get Featured Video - Pick a random approved video
      const featuredVideos = await dbStorage.getFeaturedVideos(categorySlug);
      console.log(`Featured videos found: ${featuredVideos.length}, first few IDs: [ ${featuredVideos.slice(0, 3).map((v: Video) => v.id).join(', ')} ]`);
      
      if (featuredVideos.length > 0) {
        // Randomize the featured video based on the shuffle seed, or pick the newest one if no shuffle
        if (shuffleSeed) {
          const seededRandom = createSeededRandom(shuffleSeed + '-featured');
          const randomIndex = Math.floor(seededRandom() * featuredVideos.length);
          response.featured.video = featuredVideos[randomIndex];
        } else {
          // Default to the newest featured video
          response.featured.video = featuredVideos[0];
        }
      }
      
      // Log featured video selection
      console.log(`First featured video details: ID=${response.featured.video?.id}, type=${response.featured.video?.contentType}`);
    }
    
    // Unified all content for the endless feed
    // Set limits: Get more videos than images
    const videoLimit = page === 1 ? 50 : 30; // More videos on first page
    const imageLimit = page === 1 ? 20 : 10; // Fewer images on first page
    
    // Combined approach:
    // 1. On page 1, fetch videos from different sources (trending, new, popular)
    // 2. On subsequent pages, just fetch more by popularity/views
    let videos: Video[] = [];
    let images: Video[] = [];
    
    // Track unique content IDs
    const uniqueContentIds = new Set<number>();
    
    // Add featured video to the unique set if it exists
    if (response.featured.video) {
      uniqueContentIds.add(response.featured.video.id);
    }
    
    // First page loads - get a mix of trending, new, and popular
    if (page === 1) {
      // Get trending videos
      console.log(`Using randomized shuffle ordering for trending with seed: ${shuffleSeed}`);
      const trendingVideos = await dbStorage.getTrendingVideos(
        videoLimit, 
        categorySlug, 
        shuffle ? shuffleSeed : '', 
        'video'
      );
      console.log(`Retrieved ${trendingVideos.length} trending videos. First few IDs: [ ${trendingVideos.slice(0, 3).map((v: Video) => v.id).join(', ')} ]`);
      
      // Get new videos
      const newVideos = await dbStorage.getVideos({
        sortBy: 'newest',
        limit: videoLimit,
        contentType: 'video',
        category: categorySlug,
        shuffle: shuffle,
        shuffleSeed: shuffleSeed,
        offset: 0
      });
      
      // Get popular videos (most viewed)
      const popularVideos = await dbStorage.getVideos({
        sortBy: 'most-viewed',
        limit: videoLimit,
        contentType: 'video',
        category: categorySlug,
        shuffle: shuffle,
        shuffleSeed: shuffleSeed,
        offset: 0
      });
      
      // Get trending images
      const trendingImages = await dbStorage.getTrendingVideos(
        imageLimit, 
        categorySlug, 
        shuffle ? shuffleSeed : '', 
        'image'
      );
      
      // Get new images
      const newImages = await dbStorage.getVideos({
        sortBy: 'newest',
        limit: imageLimit,
        contentType: 'image',
        category: categorySlug,
        shuffle: shuffle,
        shuffleSeed: shuffleSeed,
        offset: 0
      });
      
      // Combine everything with de-duplication
      videos = mergeAndDeduplicate([...trendingVideos, ...newVideos, ...popularVideos], uniqueContentIds);
      images = mergeAndDeduplicate([...trendingImages, ...newImages], uniqueContentIds);
    } 
    // Subsequent pages - focus more on popular/trending content
    else {
      // Get more videos of user's selected sort preference
      const moreVideos = await dbStorage.getVideos({
        sortBy,
        limit: videoLimit,
        contentType: 'video',
        category: categorySlug,
        shuffle: shuffle,
        shuffleSeed: `${shuffleSeed}-page${page}`,
        offset: (page - 1) * videoLimit
      });
      
      // Get more images of user's selected sort preference
      const moreImages = await dbStorage.getVideos({
        sortBy,
        limit: imageLimit,
        contentType: 'image',
        category: categorySlug,
        shuffle: shuffle,
        shuffleSeed: `${shuffleSeed}-page${page}`,
        offset: (page - 1) * imageLimit
      });
      
      videos = mergeAndDeduplicate(moreVideos, uniqueContentIds);
      images = mergeAndDeduplicate(moreImages, uniqueContentIds);
    }
    
    // Generate random ad positions for every 6 content chunks (4 rows videos + 2 rows images)
    const numChunks = Math.max(
      Math.ceil(videos.length / (4 * 3)), // 4 rows of videos with 3 columns
      Math.ceil(images.length / (2 * 3))  // 2 rows of images with 3 columns
    );
    
    // Place ads randomly, approximately once every 6 rows (1 per chunk)
    const adPositions = [];
    for (let i = 0; i < numChunks; i += 1) {
      // 50% chance for each chunk to have an ad
      if (Math.random() > 0.5) {
        adPositions.push(i);
      }
    }
    
    // Add content to response
    response.content.videos = videos;
    response.content.images = images;
    response.content.adPositions = adPositions;
    response.content.hasMore = videos.length >= videoLimit || images.length >= imageLimit;
    
    // Log content totals
    console.log(`Response prepared with ${uniqueContentIds.size} unique content items`);
    
    // Send response
    return res.json(response);
  } catch (error) {
    console.error('Error in content feed API:', error);
    return res.status(500).json({ error: 'Failed to load content feed' });
  }
}

/**
 * Helper function to merge arrays and deduplicate based on IDs
 */
function mergeAndDeduplicate(items: Video[], uniqueIds: Set<number>): Video[] {
  const result: Video[] = [];
  
  for (const item of items) {
    if (!uniqueIds.has(item.id)) {
      uniqueIds.add(item.id);
      result.push(item);
    }
  }
  
  return result;
}

/**
 * Generate a cache key for content
 */
function getCacheKey(categorySlug: string, sortBy: string, shuffleSeed: string = ''): string {
  return `${categorySlug || 'all'}_${sortBy}_${shuffleSeed}`;
}

/**
 * Reset the content cache
 */
function resetContentCache(key?: string, resetCategories: boolean = false) {
  if (key) {
    console.log(`Reset content cache for ${key}, fresh shuffle`);
    contentCache[key] = null;
  } else {
    console.log('Reset ALL content cache');
    contentCache = {};
  }
  
  if (resetCategories) {
    console.log('Reset categories cache');
    cachedCategories = [];
  }
}

/**
 * Create a seeded random function
 */
function createSeededRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  
  let state = hash || 1;
  
  // Simple xorshift algorithm for pseudo-random number generation
  return function() {
    state ^= state << 13;
    state ^= state >> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296; // Convert to [0, 1) range
  };
}