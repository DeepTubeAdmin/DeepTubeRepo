import { Video } from "@shared/schema";
import express, { Request, Response } from "express";
import { storage as dbStorage } from './storage';

/**
 * Helper function to get category ID from slug
 */
async function getCategoryId(slug: string): Promise<number | undefined> {
  const categories = await dbStorage.getCategories();
  const category = categories.find(c => c.slug === slug);
  return category?.id;
}

// Store cached categories to avoid multiple DB calls
let cachedCategories: any[] = [];

/**
 * Simplified Content Feed API Handler
 * Displays content from the selected category with simple sorting algorithms
 */
export async function handleContentFeed(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const categorySlug = req.query.category as string || '';
    // Default sort is popular
    const sortBy = (req.query.sortBy as 'newest' | 'oldest' | 'most-viewed' | 'trending' | 'popular') || 'popular';
    
    // For debugging
    console.log(`Content feed request: page=${page}, category=${categorySlug || 'all'}, sortBy=${sortBy}`);
    
    // Cache categories to avoid multiple DB calls
    if (cachedCategories.length === 0) {
      cachedCategories = await dbStorage.getCategories();
      console.log(`Cached ${cachedCategories.length} categories for content selection`);
    }

    // Response structure for the content feed
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

    // Get the category ID if a category is selected
    const categoryId = categorySlug ? await getCategoryId(categorySlug) : undefined;
    
    // 1. Get Featured Video - Pick a top approved video
    if (page === 1) {
      const featuredVideos = await dbStorage.getFeaturedVideos(3, categoryId);
      console.log(`Featured videos found: ${featuredVideos.length}${featuredVideos.length > 0 ? ', first few IDs: [ ' + featuredVideos.slice(0, 3).map((v: Video) => v.id).join(', ') + ' ]' : ''}`);
      
      if (featuredVideos.length > 0) {
        // Choose the first featured video
        response.featured.video = featuredVideos[0];
        console.log(`Featured video details: ID=${response.featured.video?.id}, type=${response.featured.video?.contentType}`);
      }
    }
    
    // Set content limits - more videos than images
    const videoLimit = 50;
    const imageLimit = 20;
    
    // Track unique content IDs to avoid duplicates
    const uniqueContentIds = new Set<number>();
    
    // Add featured video to the unique set if it exists
    if (response.featured.video) {
      uniqueContentIds.add(response.featured.video.id);
    }
    
    // Get videos based on the selected sort
    let videos = await dbStorage.getVideos(
      videoLimit,
      'video',
      categoryId,
      sortBy,
      undefined, // No shuffle seed
      page
    );
    
    // Get images with same sort
    let images = await dbStorage.getVideos(
      imageLimit,
      'image',
      categoryId,
      sortBy,
      undefined, // No shuffle seed
      page
    );
    
    // Apply deduplication to avoid showing featured item again
    videos = mergeAndDeduplicate(videos, uniqueContentIds);
    images = mergeAndDeduplicate(images, uniqueContentIds);
    
    console.log(`Retrieved ${videos.length} ${sortBy} videos with category ${categoryId || 'none'}`);
    console.log(`Retrieved ${images.length} ${sortBy} images with category ${categoryId || 'none'}`);
    
    // Generate ad positions - one ad per 6 content items
    const totalItems = videos.length + images.length;
    const numAds = Math.floor(totalItems / 6);
    
    // Generate ad positions - first ad after position 3, then every 6 items
    const adPositions: number[] = [];
    if (numAds > 0) {
      let position = 3; // Start after the first 3 items
      adPositions.push(position);
      
      for (let i = 1; i < numAds; i++) {
        position += 6; // One ad every 6 items
        
        if (position < totalItems) {
          adPositions.push(position);
        }
      }
    }
    
    // Update the response
    response.content.videos = videos;
    response.content.images = images;
    response.content.adPositions = adPositions;
    response.content.hasMore = videos.length > 0 || images.length > 0;
    
    console.log(`Response prepared with ${videos.length + images.length} unique content items`);
    
    // Return the response
    return res.json(response);
  } catch (error) {
    console.error("Error in content feed:", error);
    return res.status(500).json({ error: "Failed to fetch content feed" });
  }
}

/**
 * Helper function to merge arrays and deduplicate based on IDs
 */
function mergeAndDeduplicate(items: Video[], uniqueIds: Set<number>): Video[] {
  const result: Video[] = [];
  
  for (const item of items) {
    if (!uniqueIds.has(item.id)) {
      result.push(item);
      uniqueIds.add(item.id);
    }
  }
  
  return result;
}