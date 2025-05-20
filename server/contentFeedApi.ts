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

    const videoLimit = page === 1 ? 50 : 30;
    const imageLimit = page === 1 ? 20 : 10;

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
          videoLimit,
          "video",
          shuffle ? shuffleSeed : undefined,
          categoryId
        );

        const newVideos = await dbStorage.getVideos(
          videoLimit,
          "video",
          categoryId,
          "newest",
          undefined
        );

        const popularVideos = await dbStorage.getVideos(
          videoLimit,
          "video",
          categoryId,
          "most-viewed",
          undefined
        );

        const trendingImages = await dbStorage.getTrendingVideos(
          imageLimit,
          "image",
          shuffle ? shuffleSeed : undefined,
          categoryId
        );

        const newImages = await dbStorage.getVideos(
          imageLimit,
          "image",
          categoryId,
          "newest",
          undefined
        );

        videos = mergeAndDeduplicate(
          [...trendingVideos, ...newVideos, ...popularVideos],
          uniqueContentIds
        );
        images = mergeAndDeduplicate(
          [...trendingImages, ...newImages],
          uniqueContentIds
        );
      } else {
        const sortedVideos = await dbStorage.getVideos(
          videoLimit,
          "video",
          categoryId,
          sortBy,
          shuffle ? shuffleSeed : undefined
        );
        const sortedImages = await dbStorage.getVideos(
          imageLimit,
          "image",
          categoryId,
          sortBy,
          shuffle ? shuffleSeed : undefined
        );

        videos = mergeAndDeduplicate(sortedVideos, uniqueContentIds);
        images = mergeAndDeduplicate(sortedImages, uniqueContentIds);
      }
    } else {
      const seedForPage =
        shuffle && !isChronologicalSort
          ? `${shuffleSeed}-page${page}`
          : undefined;
      const moreVideos = await dbStorage.getVideos(
        videoLimit,
        "video",
        categoryId,
        sortBy,
        seedForPage
      );
      const moreImages = await dbStorage.getVideos(
        imageLimit,
        "image",
        categoryId,
        sortBy,
        seedForPage
      );

      videos = mergeAndDeduplicate(moreVideos, uniqueContentIds);
      images = mergeAndDeduplicate(moreImages, uniqueContentIds);
    }

    const numChunks = Math.max(
      Math.ceil(videos.length / (4 * 3)),
      Math.ceil(images.length / (2 * 3))
    );

    const adPositions = [];
    for (let i = 0; i < numChunks; i++) {
      adPositions.push(i);
    }

    response.content.videos = videos;
    response.content.images = images;
    response.content.adPositions = adPositions;
    response.content.hasMore =
      videos.length >= videoLimit || images.length >= imageLimit;

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
