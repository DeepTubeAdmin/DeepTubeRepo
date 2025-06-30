import moment from "moment";
import { Video } from "@shared/schema";
import express, { Request, Response } from "express";
import { storage as dbStorage } from "./storage";
import {
  createSeededRandom,
  generateShuffleSeed,
} from "../shared/shuffleUtils";

/**
 * Helper function to get category ID from slug
 */
async function getCategoryId(slug: string): Promise<number | undefined> {
  const categories = await dbStorage.getCategories();
  const category = categories.find((c) => c.slug === slug);
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
    const categorySlug = (req.query.category as string) || "";
    const sortBy =
      (req.query.sortBy as
        | "newest"
        | "oldest"
        | "most-viewed"
        | "trending"
        | "popular") || "trending";

    // Handle shuffle seed - only use for page 1, not for pagination
    const isChronologicalSort = sortBy === "newest" || sortBy === "oldest";
    const hasShuffleParam = req.query.shuffle !== undefined;
    const hasShuffleSeedParam = req.query.shuffleSeed !== undefined;

    // Only apply shuffle to page 1 to maintain content order for pagination
    const shuffle =
      page === 1 && (hasShuffleParam || hasShuffleSeedParam) && !isChronologicalSort;

    let shuffleSeed = "";
    if (page === 1) {
      if (hasShuffleSeedParam) {
        shuffleSeed = req.query.shuffleSeed as string;
      } else if (hasShuffleParam) {
        shuffleSeed = req.query.shuffle as string;
      } else if (shuffle) {
        shuffleSeed = generateShuffleSeed();
      }
    }

    if (isChronologicalSort) {
      shuffleSeed = "";
    }

    const response: any = {
      featured: {
        video: null,
      },
      content: {
        videos: [],
        images: [],
        adPositions: [],
        hasMore: false,
      },
    };

    // Only show featured video on page 1
    if (page === 1) {
      const featuredVideos = await dbStorage.getFeaturedVideos(6);
      if (featuredVideos.length > 0) {
        if (shuffleSeed) {
          const seededRandom = createSeededRandom(shuffleSeed + "-featured");
          const randomIndex = Math.floor(
            seededRandom() * featuredVideos.length
          );
          response.featured.video = featuredVideos[randomIndex];
        } else {
          response.featured.video = featuredVideos[0];
        }
      }
    }

    // Simplified pagination: 12 videos and 6 images per page consistently
    const videosPerPage = 12;
    const imagesPerPage = 6;
    
    // Calculate offset based on page number
    const videoOffset = (page - 1) * videosPerPage;
    const imageOffset = (page - 1) * imagesPerPage;

    let videos: Video[] = [];
    let images: Video[] = [];
    const uniqueContentIds = new Set<number>();

    // Add featured video to unique IDs to avoid duplicates
    if (response.featured.video) {
      uniqueContentIds.add(response.featured.video.id);
    }

    const categoryId = categorySlug
      ? await getCategoryId(categorySlug)
      : undefined;

    // Get videos and images with proper offset
    if (sortBy === "trending") {
      // For trending, we need to get a larger set and then slice to avoid duplicates
      const allTrendingVideos = await dbStorage.getTrendingVideos(
        1000, // Get a large set
        "video",
        shuffle ? shuffleSeed : undefined,
        categoryId
      );
      const allTrendingImages = await dbStorage.getTrendingVideos(
        1000, // Get a large set
        "image",
        shuffle ? shuffleSeed : undefined,
        categoryId
      );
      
      // Filter out featured video and slice for pagination
      const filteredVideos = allTrendingVideos.filter(v => !uniqueContentIds.has(v.id));
      const filteredImages = allTrendingImages.filter(i => !uniqueContentIds.has(i.id));
      
      videos = filteredVideos.slice(videoOffset, videoOffset + videosPerPage);
      images = filteredImages.slice(imageOffset, imageOffset + imagesPerPage);
    } else {
      // For other sorts, use offset-based pagination
      const allVideos = await dbStorage.getVideos(
        videosPerPage,
        "video",
        categoryId,
        sortBy,
        shuffle ? shuffleSeed : undefined,
        videoOffset
      );
      const allImages = await dbStorage.getVideos(
        imagesPerPage,
        "image",
        categoryId,
        sortBy,
        shuffle ? shuffleSeed : undefined,
        imageOffset
      );
      
      // Filter out featured video
      videos = allVideos.filter(v => !uniqueContentIds.has(v.id));
      images = allImages.filter(i => !uniqueContentIds.has(i.id));
    }

    // Generate ad positions (every chunk gets an ad position)
    const videoChunks = Math.ceil(videos.length / 12); // 4 rows × 3 columns = 12 videos per chunk
    const imageChunks = Math.ceil(images.length / 6);  // 2 rows × 3 columns = 6 images per chunk
    const totalChunks = Math.max(videoChunks, imageChunks);
    
    const adPositions = [];
    for (let i = 0; i < totalChunks; i++) {
      adPositions.push(i);
    }

    response.content.videos = videos;
    response.content.images = images;
    response.content.adPositions = adPositions;
    
    // Simple hasMore logic: if we got the full requested amount, there might be more
    let hasMoreVideos = false;
    let hasMoreImages = false;
    
    try {
      // Check if there's content for the next page
      const nextVideoOffset = page * videosPerPage;
      const nextImageOffset = page * imagesPerPage;
      
      if (sortBy === "trending") {
        // For trending, check if we have more content beyond current page
        const allTrendingVideos = await dbStorage.getTrendingVideos(
          1000,
          "video",
          undefined, // Don't use shuffle for checking more content
          categoryId
        );
        const allTrendingImages = await dbStorage.getTrendingVideos(
          1000,
          "image", 
          undefined, // Don't use shuffle for checking more content
          categoryId
        );
        
        hasMoreVideos = allTrendingVideos.length > nextVideoOffset;
        hasMoreImages = allTrendingImages.length > nextImageOffset;
      } else {
        const nextVideos = await dbStorage.getVideos(
          1,
          "video",
          categoryId,
          sortBy,
          undefined,
          nextVideoOffset
        );
        const nextImages = await dbStorage.getVideos(
          1,
          "image",
          categoryId,
          sortBy,
          undefined,
          nextImageOffset
        );
        
        hasMoreVideos = nextVideos.length > 0;
        hasMoreImages = nextImages.length > 0;
      }
    } catch (error) {
      console.error("Error checking for more content:", error);
      hasMoreVideos = false;
      hasMoreImages = false;
    }
    
    // If neither videos nor images have more content, set hasMore to false
    response.content.hasMore = hasMoreVideos || hasMoreImages;

    return res.json(response);
  } catch (error) {
    console.error("Error in content feed API:", error);
    return res.status(500).json({ error: "Failed to load content feed" });
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
function getCacheKey(
  categorySlug: string,
  sortBy: string,
  shuffleSeed: string = ""
): string {
  return `${categorySlug || "all"}_${sortBy}_${shuffleSeed}`;
}

/**
 * Reset the content cache
 */
function resetContentCache(key?: string, resetCategories: boolean = false) {
  if (key) {
    console.log(`Reset content cache for ${key}, fresh shuffle`);
    contentCache[key] = null;
  } else {
    console.log("Reset ALL content cache");
    contentCache = {};
  }

  if (resetCategories) {
    console.log("Reset categories cache");
    cachedCategories = [];
  }
}

// Function removed; using imported createSeededRandom from shared/shuffleUtils.ts instead
