import { Video } from "@shared/schema";
import express, { Request, Response } from "express";
import { storage as dbStorage } from './storage';
import { createSeededRandom, generateShuffleSeed } from '../shared/shuffleUtils';

/**
 * Helper function to get category ID from slug
 */
async function getCategoryId(slug: string): Promise<number | undefined> {
  const categories = await dbStorage.getCategories();
  const category = categories.find(c => c.slug === slug);
  return category?.id;
}

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
    
    // Only enable shuffle when we have a shuffle parameter in URL
    // AND we're NOT using a chronological sort option (newest/oldest)
    const isChronologicalSort = sortBy === 'newest' || sortBy === 'oldest';
    const shuffle = (hasShuffleParam || hasShuffleSeedParam) && !isChronologicalSort;
    
    // Generate the seed for shuffling, with priority
    let shuffleSeed = '';
    if (hasShuffleSeedParam) {
      shuffleSeed = req.query.shuffleSeed as string;
    } else if (hasShuffleParam) {
      shuffleSeed = req.query.shuffle as string;
    } else if (shuffle) {
      // Generate a random shuffle seed using our shared utility
      shuffleSeed = generateShuffleSeed();
    }
    
    // Clear the shuffle seed for chronological sorts to ensure proper ordering
    if (isChronologicalSort) {
      if (shuffleSeed) {
        console.log(`Forcing chronological ordering for ${sortBy} sort, disabling shuffle mode`);
      }
      shuffleSeed = '';
    } else if (shuffleSeed) {
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

    // First page always includes featured content
    if (page === 1) {
      // Reset cache if forced shuffle
      if (shuffle && shuffleSeed) {
        const cacheTimestamp = Date.now();
        resetContentCache(`${categorySlug}_feed_${cacheTimestamp}`, false);
      }
      
      // 1. Get Featured Video - This should ALWAYS work for page 1
      // Get featured videos directly from storage
      const featuredVideos = await dbStorage.getFeaturedVideos(10);
      console.log(`Featured videos found: ${featuredVideos.length}, first few IDs: [ ${featuredVideos.slice(0, 3).map((v: Video) => v.id).join(', ')} ]`);
      
      // Make sure we have a featured video regardless of sort type
      if (featuredVideos.length > 0) {
        // Always select a featured video, regardless of sorting method
        if (shuffleSeed) {
          // Use seeded random for shuffle views
          const seededRandom = createSeededRandom(shuffleSeed + '-featured');
          const randomIndex = Math.floor(seededRandom() * featuredVideos.length);
          response.featured.video = featuredVideos[randomIndex];
        } else {
          // Default to the newest featured video
          response.featured.video = featuredVideos[0];
        }
        console.log(`Selected featured video ID: ${response.featured.video.id}`);
      } else {
        // Fallback to a recent video if no featured videos exist
        const recentVideos = await dbStorage.getNewVideos(5);
        if (recentVideos.length > 0) {
          response.featured.video = recentVideos[0];
          console.log(`No featured videos, falling back to recent video ID: ${response.featured.video.id}`);
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
    
    // First page loads - use the user's sortBy parameter or mix content if trending
    if (page === 1) {
      const categoryId = categorySlug ? await getCategoryId(categorySlug) : undefined;
      console.log(`First page load with sortBy: ${sortBy}, shuffle seed: ${shuffleSeed}, categoryId: ${categoryId || 'none'}`);
      
      // Load videos and images based on sort preference
      if (sortBy === 'trending') {
        // For trending, we'll still mix content types for a better experience
        // Get trending videos - always pass categoryId regardless of shuffle
        const trendingVideos = await dbStorage.getTrendingVideos(
          videoLimit, 
          'video',
          shuffle ? shuffleSeed : undefined,
          categoryId
        );
        console.log(`Retrieved ${trendingVideos.length} trending videos with category ${categoryId || 'none'}. First few IDs: [ ${trendingVideos.slice(0, 3).map((v: Video) => v.id).join(', ')} ]`);
        
        // Get new videos
        const newVideos = await dbStorage.getVideos(
          videoLimit,
          'video',
          categoryId,
          'newest',
          shuffleSeed
        );
        
        // Get popular videos (most viewed)
        const popularVideos = await dbStorage.getVideos(
          videoLimit,
          'video',
          categoryId,
          'most-viewed',
          shuffleSeed
        );
        
        // Get trending images - always pass categoryId regardless of shuffle
        const trendingImages = await dbStorage.getTrendingVideos(
          imageLimit, 
          'image',
          shuffle ? shuffleSeed : undefined,
          categoryId
        );
        console.log(`Retrieved ${trendingImages.length} trending images with category ${categoryId || 'none'}. First few IDs: [ ${trendingImages.slice(0, 3).map((v: Video) => v.id).join(', ')} ]`);
        
        // Get new images
        const newImages = await dbStorage.getVideos(
          imageLimit,
          'image',
          categoryId,
          'newest',
          shuffleSeed
        );
        
        // Combine everything with de-duplication
        videos = mergeAndDeduplicate([...trendingVideos, ...newVideos, ...popularVideos], uniqueContentIds);
        images = mergeAndDeduplicate([...trendingImages, ...newImages], uniqueContentIds);
      } else {
        // For other sort options (newest, oldest, most-viewed, popular), respect the user's choice
        console.log(`Using sortBy=${sortBy} for video content`);
        
        // Get videos with the selected sort option
        const sortedVideos = await dbStorage.getVideos(
          videoLimit,
          'video',
          categoryId,
          sortBy,
          shuffleSeed
        );
        
        // Get images with the selected sort option
        const sortedImages = await dbStorage.getVideos(
          imageLimit,
          'image',
          categoryId,
          sortBy, 
          shuffleSeed
        );
        
        videos = mergeAndDeduplicate(sortedVideos, uniqueContentIds);
        images = mergeAndDeduplicate(sortedImages, uniqueContentIds);
      }
    } 
    // Subsequent pages - focus more on popular/trending content
    else {
      // Get more videos of user's selected sort preference
      const moreVideos = await dbStorage.getVideos(
        videoLimit,
        'video',
        categorySlug ? await getCategoryId(categorySlug) : undefined,
        sortBy,
        shuffle ? `${shuffleSeed}-page${page}` : undefined
      );
      
      // Get more images of user's selected sort preference
      const moreImages = await dbStorage.getVideos(
        imageLimit,
        'image',
        categorySlug ? await getCategoryId(categorySlug) : undefined,
        sortBy,
        shuffle ? `${shuffleSeed}-page${page}` : undefined
      );
      
      videos = mergeAndDeduplicate(moreVideos, uniqueContentIds);
      images = mergeAndDeduplicate(moreImages, uniqueContentIds);
    }
    
    // Generate random ad positions for every 6 content chunks (4 rows videos + 2 rows images)
    const numChunks = Math.max(
      Math.ceil(videos.length / (4 * 3)), // 4 rows of videos with 3 columns
      Math.ceil(images.length / (2 * 3))  // 2 rows of images with 3 columns
    );
    
    // Place ads exactly once every 6 rows (content chunks)
    const adPositions = [];
    for (let i = 0; i < numChunks; i++) {
      // Ensure each chunk has an ad (every chunk contains 6 rows: 4 video + 2 image)
      adPositions.push(i);
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

// Function removed; using imported createSeededRandom from shared/shuffleUtils.ts instead