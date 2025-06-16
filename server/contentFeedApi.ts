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

    const isChronologicalSort = sortBy === "newest" || sortBy === "oldest";
    const hasShuffleParam = req.query.shuffle !== undefined;
    const hasShuffleSeedParam = req.query.shuffleSeed !== undefined;

    const shuffle =
      (hasShuffleParam || hasShuffleSeedParam) && !isChronologicalSort;

    let shuffleSeed = "";
    if (hasShuffleSeedParam) {
      shuffleSeed = req.query.shuffleSeed as string;
    } else if (hasShuffleParam) {
      shuffleSeed = req.query.shuffle as string;
    } else if (shuffle) {
      shuffleSeed = generateShuffleSeed();
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

    const videoLimit = page === 1 ? 15 : 12;  // More videos for first page to fill 4 rows
    const imageLimit = page === 1 ? 8 : 6;   // More images for first page to fill 2 rows

    let videos: Video[] = [];
    let images: Video[] = [];
    const uniqueContentIds = new Set<number>();

    if (response.featured.video) {
      uniqueContentIds.add(response.featured.video.id);
    }

    const categoryId = categorySlug
      ? await getCategoryId(categorySlug)
      : undefined;

    if (page === 1) {
      if (sortBy === "trending") {
        const trendingVideos = await dbStorage.getTrendingVideos(
          Math.ceil(videoLimit * 0.6), // 60% from trending
          "video",
          shuffle ? shuffleSeed : undefined,
          categoryId
        );

        const newVideos = await dbStorage.getVideos(
          Math.ceil(videoLimit * 0.3), // 30% from newest
          "video",
          categoryId,
          "newest",
          undefined,
          0
        );

        const popularVideos = await dbStorage.getVideos(
          Math.ceil(videoLimit * 0.1), // 10% from popular
          "video",
          categoryId,
          "most-viewed",
          undefined,
          0
        );

        const trendingImages = await dbStorage.getTrendingVideos(
          Math.ceil(imageLimit * 0.7), // 70% from trending
          "image",
          shuffle ? shuffleSeed : undefined,
          categoryId
        );

        const newImages = await dbStorage.getVideos(
          Math.ceil(imageLimit * 0.3), // 30% from newest
          "image",
          categoryId,
          "newest",
          undefined,
          0
        );

        videos = mergeAndDeduplicate(
          [...trendingVideos, ...newVideos, ...popularVideos],
          uniqueContentIds
        ).slice(0, videoLimit); // Enforce final limit
        images = mergeAndDeduplicate(
          [...trendingImages, ...newImages],
          uniqueContentIds
        ).slice(0, imageLimit); // Enforce final limit
      } else {
        const sortedVideos = await dbStorage.getVideos(
          videoLimit,
          "video",
          categoryId,
          sortBy,
          shuffle ? shuffleSeed : undefined,
          0
        );
        const sortedImages = await dbStorage.getVideos(
          imageLimit,
          "image",
          categoryId,
          sortBy,
          shuffle ? shuffleSeed : undefined,
          0
        );

        videos = mergeAndDeduplicate(sortedVideos, uniqueContentIds);
        images = mergeAndDeduplicate(sortedImages, uniqueContentIds);
      }
    } else {
      // For subsequent pages, calculate offset
      const videoOffset = (page - 1) * videoLimit;
      const imageOffset = (page - 1) * imageLimit;
      
      const seedForPage =
        shuffle && !isChronologicalSort
          ? `${shuffleSeed}-page${page}`
          : undefined;
      const moreVideos = await dbStorage.getVideos(
        videoLimit,
        "video",
        categoryId,
        sortBy,
        seedForPage,
        videoOffset
      );
      const moreImages = await dbStorage.getVideos(
        imageLimit,
        "image",
        categoryId,
        sortBy,
        seedForPage,
        imageOffset
      );

      videos = mergeAndDeduplicate(moreVideos, uniqueContentIds);
      images = mergeAndDeduplicate(moreImages, uniqueContentIds);
    }

    const numChunks = Math.max(
      Math.ceil(videos.length / (4 * 3)), // 4 video rows (3 columns = 12 videos per chunk)
      Math.ceil(images.length / (2 * 3))  // 2 image rows (3 columns = 6 images per chunk)
    );

    const adPositions = [];
    for (let i = 0; i < numChunks; i++) {
      adPositions.push(i);
    }

    response.content.videos = videos;
    response.content.images = images;
    response.content.adPositions = adPositions;
    
    // Check if there's more content by requesting one extra item for the next page
    const nextVideoLimit = 1;
    const nextImageLimit = 1;
    const nextPage = page + 1;
    
    let hasMoreVideos = false;
    let hasMoreImages = false;
    
    // Simple fallback: if we got less than requested, there's likely no more
    if (videos.length < videoLimit && images.length < imageLimit) {
      hasMoreVideos = false;
      hasMoreImages = false;
    } else {
      // Calculate theoretical maximum items we could have seen so far
      const expectedVideosSoFar = (page - 1) * videoLimit + videos.length;
      const expectedImagesSoFar = (page - 1) * imageLimit + images.length;
      
      // For chronological sorts, we can be more precise about running out
      if (isChronologicalSort) {
        // For chronological sorts, check if we're approaching database limits
        // This is a rough estimate - you'd want to replace with actual DB counts
        hasMoreVideos = expectedVideosSoFar < 45; // Assume ~45 videos max
        hasMoreImages = expectedImagesSoFar < 25; // Assume ~25 images max
      } else {
        try {
          const nextVideoOffset = page * videoLimit;
          const nextImageOffset = page * imageLimit;
          
          if (sortBy === "trending") {
            const nextVideos = await dbStorage.getTrendingVideos(
              nextVideoLimit,
              "video",
              shuffle ? `${shuffleSeed}-page${nextPage}` : undefined,
              categoryId
            );
            const nextImages = await dbStorage.getTrendingVideos(
              nextImageLimit,
              "image",
              shuffle ? `${shuffleSeed}-page${nextPage}` : undefined,
              categoryId
            );
            hasMoreVideos = nextVideos.length > 0;
            hasMoreImages = nextImages.length > 0;
          } else {
            const seedForNextPage = shuffle && !isChronologicalSort 
              ? `${shuffleSeed}-page${nextPage}` 
              : undefined;
            const nextVideos = await dbStorage.getVideos(
              nextVideoLimit,
              "video",
              categoryId,
              sortBy,
              seedForNextPage,
              nextVideoOffset
            );
            const nextImages = await dbStorage.getVideos(
              nextImageLimit,
              "image",
              categoryId,
              sortBy,
              seedForNextPage,
              nextImageOffset
            );
            hasMoreVideos = nextVideos.length > 0;
            hasMoreImages = nextImages.length > 0;
          }
        } catch (error) {
          console.error("Error checking for more content:", error);
          // Default to false if we can't check and got partial results
          hasMoreVideos = videos.length >= videoLimit;
          hasMoreImages = images.length >= imageLimit;
        }
      }
    }
    
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
