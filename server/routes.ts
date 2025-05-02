import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage as dbStorage } from "./storage";
import { setupAuth, comparePasswords, hashPassword } from "./auth";
import { randomBytes } from "crypto";
import { sendPasswordResetEmail } from "./sendgrid";
import { z } from "zod";
import { insertCategorySchema, insertVideoSchema, type Video, type Category, type InsertLike } from "@shared/schema";
import * as vimeoService from "./vimeo";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';
import { getSignedS3Url, uploadFileToS3, deleteFileFromS3, localPathToS3Key, urlPathToS3Key } from "./s3";
import { WebSocketServer } from 'ws';

// Get directory paths in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads/');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Specific directory for videos
const videosDir = path.join(uploadsDir, 'videos');
if (!fs.existsSync(videosDir)) {
  fs.mkdirSync(videosDir, { recursive: true });
}

// Specific directory for images
const imagesDir = path.join(uploadsDir, 'images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

// Configure multer for file uploads
const multerStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Determine where to store the file based on mimetype
    if (file.mimetype.startsWith('video/')) {
      cb(null, videosDir);
    } else if (file.mimetype.startsWith('image/')) {
      cb(null, imagesDir);
    } else {
      cb(null, uploadsDir);
    }
  },
  filename: function (req, file, cb) {
    // Create a unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// Set up multer with the storage configuration
const upload = multer({
  storage: multerStorage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // These middleware declarations will be used and the duplicates below will be removed
  // Search API endpoint
  app.get('/api/search', async (req, res) => {
    try {
      const query = req.query.q as string || '';
      const categorySlug = req.query.category as string || '';
      const contentType = req.query.type as string || 'all';
      // We can receive categoryId directly from frontend or resolve from slug
      let categoryId: number | undefined = req.query.categoryId ? 
        parseInt(req.query.categoryId as string) : 
        undefined;
      
      if (!query) {
        return res.status(400).json({ error: 'Search query is required' });
      }

      // Get category ID if categorySlug is provided and we don't have categoryId yet
      if (categorySlug && !categoryId) {
        const category = await dbStorage.getCategoryBySlug(categorySlug);
        if (category) {
          categoryId = category.id;
        }
      }
      
      // Determine what content to search based on type
      let results: any[] = [];
      
      if (contentType === 'all') {
        // Search for all content types
        results = await dbStorage.searchVideos({
          query,
          categoryId,
          limit: 50,
        });
      } else {
        // Search for specific content type (video, image, embed)
        results = await dbStorage.searchVideos({
          query,
          categoryId,
          contentType,
          limit: 30,
        });
      }
      
      console.log(`Search for "${query}" returned ${results.length} results with contentType=${contentType}${categoryId ? ` and categoryId=${categoryId}` : ''}`);
      
      res.json(results);
    } catch (error: any) {
      console.error('Search error:', error);
      res.status(500).json({ error: error.message || 'Error performing search' });
    }
  });
  // Set up authentication
  setupAuth(app);
  
  // Password reset endpoints
  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email address is required" });
      }
      
      // Check if user exists with this email
      const user = await dbStorage.getUserByEmail(email);
      
      if (!user) {
        // We don't want to reveal if an email exists or not for security reasons
        // Still return a success message
        return res.json({ message: "If your email is registered, you will receive a password reset link." });
      }
      
      // Generate random token
      const token = randomBytes(32).toString('hex');
      
      // Set token expiration (1 hour from now)
      const tokenExpires = new Date();
      tokenExpires.setHours(tokenExpires.getHours() + 1);
      
      // Save token to user account
      await dbStorage.setPasswordResetToken(email, token, tokenExpires);
      
      // Determine base URL from request
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const baseUrl = `${protocol}://${req.get('host')}`;
      
      // Send password reset email
      const emailSent = await sendPasswordResetEmail(email, token, baseUrl);
      
      if (!emailSent) {
        console.error(`Failed to send password reset email to ${email}`);
        return res.status(500).json({ error: "Failed to send password reset email. Please try again later." });
      }
      
      res.json({ message: "If your email is registered, you will receive a password reset link." });
    } catch (error) {
      console.error("Password reset request error:", error);
      res.status(500).json({ error: "An error occurred while processing your request." });
    }
  });
  
  app.post("/api/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ error: "Token and new password are required" });
      }
      
      // Find user with valid token
      const user = await dbStorage.getUserByResetToken(token);
      
      if (!user) {
        return res.status(400).json({ error: "Invalid or expired token" });
      }
      
      // Hash the new password
      const hashedPassword = await hashPassword(newPassword);
      
      // Update user's password and clear token
      await dbStorage.resetPassword(user.id, hashedPassword);
      
      res.json({ message: "Password has been reset successfully. You can now log in with your new password." });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ error: "An error occurred while resetting your password." });
    }
  });
  
  app.get("/api/verify-reset-token/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      if (!token) {
        return res.status(400).json({ error: "Token is required" });
      }
      
      // Find user with valid token
      const user = await dbStorage.getUserByResetToken(token);
      
      if (!user) {
        return res.status(400).json({ error: "Invalid or expired token" });
      }
      
      res.json({ valid: true });
    } catch (error) {
      console.error("Token verification error:", error);
      res.status(500).json({ error: "An error occurred while verifying the token." });
    }
  });
  
  // Middleware to check if user is authenticated
  const isAuthenticated = (req: Request, res: Response, next: Function) => {
    if (req.isAuthenticated() && req.user) {
      return next();
    }
    res.status(401).json({ error: "Authentication required" });
  };
  
  // Middleware to check if user is an admin
  const isAdmin = (req: Request, res: Response, next: Function) => {
    if (req.isAuthenticated() && req.user && (req.user.isAdmin || req.user.id === 1 || req.user.id === 2)) {
      return next();
    }
    res.status(403).json({ error: "Admin access required" });
  };
  
  // Type guard function to ensure req.user is defined
  function ensureUser(req: Request): asserts req is Request & { user: Express.User } {
    if (!req.user) {
      throw new Error("User is not authenticated");
    }
  }
  
  // Function to log detailed category state information
  function logCategoryState(key: string) {
    const categories = usedCategoriesCache.get(key);
    if (categories) {
      console.log(`Current category tracking state for ${key}: ${Array.from(categories).join(', ')}`);
      console.log(`Using ${categories.size} out of ${cachedCategories.length} total categories`);
    } else {
      console.log(`No category tracking state for ${key} yet`);
    }
  }
  
  // Generate consistent mock view counts for categories (for sorting demonstration)
  // In a real application, we would fetch these from a database
  const categoryViewCounts = new Map<number, number>();
  
  // Function to get view count for a category
  function getCategoryViewCount(categoryId: number): number {
    if (!categoryViewCounts.has(categoryId)) {
      // Pseudo-random but consistent view count generator based on category ID
      // This ensures the same category always gets the same view count in a single session
      const baseCount = 1000;
      const multiplier = (categoryId * 7919) % 10; // Using prime numbers to distribute values
      const viewCount = baseCount + (multiplier * 500) + (categoryId * 100);
      categoryViewCounts.set(categoryId, viewCount);
    }
    return categoryViewCounts.get(categoryId) || 0;
  }
  
  // Function to sort categories by view count (descending)
  function sortCategoriesByPopularity(categories: Category[]): Category[] {
    return [...categories].sort((a, b) => {
      const viewsA = getCategoryViewCount(a.id);
      const viewsB = getCategoryViewCount(b.id);
      return viewsB - viewsA; // Descending order
    });
  }
  
  // Setup predefined categories - must be before the /api/categories/:slug route
  app.get("/api/categories/seed", async (req, res) => {
    try {
      // Get existing categories
      const existingCategories = await dbStorage.getCategories();
      
      // Define all required categories
      const requiredCategories = [
        { name: "Sci-Fi", slug: "sci-fi", icon: "rocket" },
        { name: "Comedy", slug: "comedy", icon: "smile" },
        { name: "Animation", slug: "animation", icon: "film" },
        { name: "Music", slug: "music", icon: "music" },
        { name: "Horror", slug: "horror", icon: "skull" },
        { name: "Romance", slug: "romance", icon: "heart" },
        { name: "Action", slug: "action", icon: "zap" },
        { name: "Surreal", slug: "surreal", icon: "cloud-rain" },
        { name: "Historical", slug: "historical", icon: "book" },
        { name: "Kids", slug: "kids", icon: "baby" },
        { name: "People", slug: "people", icon: "users" }
      ];
      
      // Find which categories need to be created
      const existingSlugs = existingCategories.map(c => c.slug);
      const categoriesToCreate = requiredCategories.filter(
        c => !existingSlugs.includes(c.slug)
      );
      
      // Create missing categories
      const newCategories = [];
      for (const category of categoriesToCreate) {
        const newCategory = await dbStorage.createCategory(category);
        newCategories.push(newCategory);
      }
      
      res.json({
        message: `${newCategories.length} categories created, ${existingCategories.length} already existed`,
        created: newCategories
      });
    } catch (error) {
      console.error("Error seeding categories:", error);
      res.status(500).json({ error: "Failed to seed categories" });
    }
  });

  // Categories endpoints
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await dbStorage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  // Define specific routes before parameterized routes
  app.get("/api/categories/by-slug/:slug", async (req, res) => {
    try {
      const category = await dbStorage.getCategoryBySlug(req.params.slug);
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      console.error("Error fetching category:", error);
      res.status(500).json({ error: "Failed to fetch category" });
    }
  });

  app.post("/api/categories", isAuthenticated, async (req, res) => {
    try {
      const categoryData = insertCategorySchema.parse(req.body);
      const category = await dbStorage.createCategory(categoryData);
      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(400).json({ error: "Invalid category data" });
    }
  });

  // Videos endpoints
  app.get("/api/videos", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const shuffleSeed = req.query.shuffleSeed as string || '';
      const categoryId = req.query.category ? parseInt(req.query.category as string) : undefined;
      
      // Get videos by category if category parameter is provided
      let videos;
      if (categoryId) {
        videos = await dbStorage.getVideosByCategory(categoryId, undefined, limit || 50);
      } else {
        videos = await dbStorage.getVideos(limit);
      }
      
      // Shuffle videos if a seed is provided
      if (shuffleSeed) {
        // Log the first few IDs for debugging
        console.log('Videos before shuffle: first few IDs:', videos.slice(0, 3).map(v => v.id));
        
        // Shuffle videos using the seeded shuffle function
        const shuffledVideos = shuffleArray(videos, shuffleSeed);
        
        // Log the first few IDs after shuffling for debugging
        console.log('Shuffled videos with seed:', shuffleSeed);
        console.log('Videos after shuffle: first few IDs:', shuffledVideos.slice(0, 3).map(v => v.id));
        
        return res.json(shuffledVideos);
      }
      
      res.json(videos);
    } catch (error) {
      console.error("Error fetching videos:", error);
      res.status(500).json({ error: "Failed to fetch videos" });
    }
  });

  app.get("/api/videos/featured", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const shuffleSeed = req.query.shuffleSeed as string || '';
      
      // Get featured videos
      const videos = await dbStorage.getFeaturedVideos(limit);
      
      // Shuffle videos if a seed is provided
      if (shuffleSeed) {
        // Log the first few IDs for debugging
        console.log('Featured videos: first few IDs:', videos.slice(0, 3).map(v => v.id));
        
        // Shuffle videos using the seeded shuffle function
        const shuffledVideos = shuffleArray(videos, shuffleSeed);
        
        // Log the first few IDs after shuffling for debugging
        console.log('Shuffled featured videos with seed:', shuffleSeed);
        console.log('Featured videos after shuffle: first few IDs:', shuffledVideos.slice(0, 3).map(v => v.id));
        
        return res.json(shuffledVideos);
      }
      
      res.json(videos);
    } catch (error) {
      console.error("Error fetching featured videos:", error);
      res.status(500).json({ error: "Failed to fetch featured videos" });
    }
  });

  app.get("/api/videos/new", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const videos = await dbStorage.getNewVideos(limit);
      res.json(videos);
    } catch (error) {
      console.error("Error fetching new videos:", error);
      res.status(500).json({ error: "Failed to fetch new videos" });
    }
  });

  // Removed duplicate route - see detailed version below

  app.post("/api/videos", isAuthenticated, async (req, res) => {
    try {
      const videoData = insertVideoSchema.parse(req.body);
      
      // Auto-approve YouTube embeds
      if (videoData.contentType === 'embed' && videoData.embedCode && 
          videoData.embedCode.includes('youtube.com/embed')) {
        videoData.reviewStatus = 'approved';
      }
      
      const video = await dbStorage.createVideo(videoData);
      res.status(201).json(video);
    } catch (error) {
      console.error("Error creating video:", error);
      res.status(400).json({ error: "Invalid video data" });
    }
  });

  app.get("/api/categories/:id/videos", async (req, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      const videos = await dbStorage.getVideosByCategory(categoryId);
      res.json(videos);
    } catch (error) {
      console.error("Error fetching videos by category:", error);
      res.status(500).json({ error: "Failed to fetch videos by category" });
    }
  });
  
  // Get paginated content with alternating pattern (3 rows videos, 2 rows images)
  // Track used content IDs for the infinite scroll feature
  // Use a Map with category+sortBy as keys to store used IDs for different views
  const infiniteScrollCache = new Map<string, Set<number>>();
  
  // Track used categories to ensure variety in blocks
  // This must be a persistent map that exists across requests
  const usedCategoriesCache = new Map<string, Set<number>>();
  
  // Cache all categories to avoid multiple DB calls
  let cachedCategories: Category[] = [];
  
  // Helper to get or create a cache key
  function getCacheKey(categorySlug: string, sortBy: string, shuffleSeed: string = ''): string {
    return `${categorySlug || 'all'}_${sortBy}_${shuffleSeed}`;
  }
  
  // Using shuffle seed to create a seeded random function
  function createSeededRandom(seed: string): () => number {
    // If no seed is provided, use standard Math.random()
    if (!seed) return Math.random;
    
    // Create a simple seeded random number generator
    let s = 0;
    for (let i = 0; i < seed.length; i++) {
      s += seed.charCodeAt(i);
    }
    
    return function() {
      s = Math.sin(s) * 10000;
      return s - Math.floor(s);
    };
  }
  
  // Fisher-Yates shuffle with a seed
  function shuffleArray<T>(array: T[], seed: string): T[] {
    const result = [...array]; // Create a copy to avoid mutating the original
    const random = createSeededRandom(seed);
    
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    
    return result;
  }
  
  // Helper to reset cache when needed
  function resetContentCache(key?: string, resetCategories: boolean = false) {
    if (key) {
      infiniteScrollCache.delete(key);
      console.log(`Reset content cache for ${key}, resetCategories=${resetCategories}`);
      if (resetCategories) {
        usedCategoriesCache.delete(key);
      }
    } else {
      infiniteScrollCache.clear();
      if (resetCategories) {
        usedCategoriesCache.clear();
      }
      console.log(`Reset ALL content cache, resetCategories=${resetCategories}`);
    }
  }
  
  app.get("/api/content/infinite", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 5; // Default to 5 blocks per page
      const categorySlug = req.query.category as string || '';
      const sortBy = (req.query.sortBy as 'newest' | 'oldest' | 'most-viewed' | 'trending' | 'popular') || 'newest';
      const shuffleSeed = req.query.shuffleSeed as string || '';
      
      // For database compatibility - convert 'most-viewed' to 'viewed' for the storage layer
      const dbSortBy = sortBy === 'most-viewed' ? 'viewed' : sortBy;
      
      // Get categoryId if category slug is provided
      let categoryId: number | undefined = undefined;
      if (categorySlug && categorySlug !== 'trending' && categorySlug !== 'most-viewed') {
        const category = await dbStorage.getCategoryBySlug(categorySlug);
        categoryId = category?.id;
      }
      
      // Special handling for "trending" and "most-viewed" categories
      const isTrending = categorySlug === 'trending' || sortBy === 'trending';
      const isMostViewed = categorySlug === 'most-viewed' || sortBy === 'most-viewed';
      
      // Create a response with mixed content blocks
      const response = {
        page,
        pageSize,
        hasMore: true, // Always true to enable infinite scrolling
        blocks: [] as Array<{
          type: 'videos' | 'images';
          id: number;
          title: string;
          categoryName?: string;
          items: Video[];
        }>
      };
      
      const baseIndex = (page - 1) * pageSize;
      
      // Reset cache if we're starting a new page (page 1) or changing categories/filters
      const cacheKey = getCacheKey(categorySlug, sortBy, shuffleSeed);
      
      // If page 1, reset the cache for this category/sort combo
      if (page === 1) {
        // Only reset content but not category tracking when restarting from page 1
        resetContentCache(cacheKey, false);
      }
      
      // Get or create the set of used content IDs for this view
      if (!infiniteScrollCache.has(cacheKey)) {
        infiniteScrollCache.set(cacheKey, new Set<number>());
      }
      const usedContentIds = infiniteScrollCache.get(cacheKey)!;
      
      // Get or create the set of used category IDs for this view
      if (!usedCategoriesCache.has(cacheKey)) {
        console.log(`Creating new category tracking set for ${cacheKey}`);
        usedCategoriesCache.set(cacheKey, new Set<number>());
        
        // Pre-populate with some random categories if this is a new category set
        // This ensures variety even on the very first page load after server restart
        if (cachedCategories.length === 0) {
          cachedCategories = await dbStorage.getCategories();
          console.log(`Cached ${cachedCategories.length} categories for content selection`);
        }
        
        // Pre-select least popular categories to mark as "used" (about 1/3 of all categories)
        // This way, the most popular categories will be shown first
        if (!categoryId && !isTrending && !isMostViewed) {
          const categoriesToPreselect = Math.floor(cachedCategories.length / 3);
          
          // Sort all categories by popularity (most viewed first)
          const categoriesByPopularity = sortCategoriesByPopularity(cachedCategories);
          
          // Select the LEAST popular categories to mark as "used"
          // This ensures that the MOST popular ones will be shown first
          const leastPopularCategories = categoriesByPopularity.slice(-categoriesToPreselect);
          
          for (const category of leastPopularCategories) {
            usedCategoriesCache.get(cacheKey)!.add(category.id);
            console.log(`Pre-marking least popular category as used: ${category.name} (${category.id}) with ${getCategoryViewCount(category.id)} views`);
          }
          
          console.log(`Pre-selected ${categoriesToPreselect} least popular categories as used: ${Array.from(usedCategoriesCache.get(cacheKey)!).join(', ')}`);
        }
      }
      
      const usedCategoryIds = usedCategoriesCache.get(cacheKey)!;
      console.log(`Initial category tracking state for ${cacheKey}: ${Array.from(usedCategoryIds).join(', ')}`);
      
      // Debug check to ensure the cache survives across requests
      if (Array.from(usedCategoryIds).length > 0) {
        console.log(`✓ Category tracking state persisted for ${cacheKey}`);
      }
      
      // Cache categories to avoid multiple DB calls
      if (cachedCategories.length === 0) {
        cachedCategories = await dbStorage.getCategories();
        console.log(`Cached ${cachedCategories.length} categories for content selection`);
      }
      
      // Use cached categories
      const allCategories = cachedCategories;
      
      // Create pattern of 3 video blocks followed by 1 image block (repeating)
      for (let i = 0; i < pageSize; i++) {
        const blockId = baseIndex + i;
        const blockType = i % 4 < 3 ? 'videos' : 'images';
        
        // Define our row size constant for reuse between blocks
        // Videos are 3 per row (with special cases for first two blocks - 9 videos each), images are 4 per row
        let itemsPerRow = blockType === 'videos' ? 3 : 4;
        
        // Special case: For trending and recent videos (first two blocks), we want 9 videos (3 rows of 3)
        if (blockType === 'videos' && (blockId === 0 || blockId === 1)) {
          itemsPerRow = 9; // 3 rows of 3 videos each
        }
        
        // Request more items than needed to allow for filtering out duplicates
        const fetchLimit = itemsPerRow * 5; // Request even more to account for used IDs across pages
        
        if (blockType === 'videos') {
          // Get video content based on filters
          let videos: Video[] = [];
          
          if (isTrending) {
            // For trending, use featured videos
            videos = await dbStorage.getFeaturedVideos(fetchLimit);
            // Filter to only video and embed types for video blocks
            videos = videos.filter(v => v.contentType === 'video' || v.contentType === 'embed');
            // Apply shuffle with seed if provided
            if (shuffleSeed) {
              videos = shuffleArray(videos, shuffleSeed);
              console.log(`Shuffled trending videos with seed: ${shuffleSeed}`);
            }
            console.log(`Category trending videos (video): first few IDs: [ ${videos.slice(0, 3).map(v => v.id).join(', ')} ]`);
          } else if (isMostViewed) {
            // For most viewed, use random order for now (will be replaced with actual view count)
            videos = await dbStorage.getVideos(fetchLimit, undefined, undefined, 'viewed');
            // Filter to only video and embed types for video blocks
            videos = videos.filter(v => v.contentType === 'video' || v.contentType === 'embed');
            // Apply shuffle with seed if provided
            if (shuffleSeed) {
              videos = shuffleArray(videos, shuffleSeed);
              console.log(`Shuffled most-viewed videos with seed: ${shuffleSeed}`);
            }
            console.log(`Category most-viewed videos (video): first few IDs: [ ${videos.slice(0, 3).map(v => v.id).join(', ')} ]`);
          } else if (categoryId) {
            // Filter by category if specified
            videos = await dbStorage.getVideosByCategory(categoryId, undefined, fetchLimit);
            // Filter to only video and embed types for video blocks
            videos = videos.filter(v => v.contentType === 'video' || v.contentType === 'embed');
            // Apply shuffle with seed if provided
            if (shuffleSeed) {
              videos = shuffleArray(videos, shuffleSeed);
              console.log(`Shuffled category ${categoryId} videos with seed: ${shuffleSeed}`);
            }
            console.log(`Category ${categoryId} videos (video): first few IDs: [ ${videos.slice(0, 3).map(v => v.id).join(', ')} ]`);
          } else {
            // No specific category filter - try to find a new unused category
            let selectedCategoryId: number | undefined = undefined;
            
            // Find unused categories first (if we have any)
            const unusedCategories = allCategories.filter(cat => !usedCategoryIds.has(cat.id));
            
            if (unusedCategories.length > 0) {
              // Sort unused categories by popularity (most viewed first)
              const sortedUnusedCategories = sortCategoriesByPopularity(unusedCategories);
              
              // Select the most popular unused category that isn't already in use
              selectedCategoryId = sortedUnusedCategories[0].id;
              
              // Debug: Show the view counts for the unused categories
              const debugCategoriesWithViews = sortedUnusedCategories.map(cat => ({
                id: cat.id, 
                name: cat.name, 
                views: getCategoryViewCount(cat.id)
              }));
              console.log('Unused categories sorted by popularity:', JSON.stringify(debugCategoriesWithViews));
              
              console.log(`Selected most popular unused category: ${sortedUnusedCategories[0].name} (${selectedCategoryId}) with ${getCategoryViewCount(selectedCategoryId)} views`);
              
              // Get videos for this category
              if (selectedCategoryId !== undefined) {
                videos = await dbStorage.getVideosByCategory(selectedCategoryId, undefined, fetchLimit);
                
                // Apply shuffle with seed if provided
                if (shuffleSeed) {
                  videos = shuffleArray(videos, shuffleSeed);
                  console.log(`Shuffled selected category ${selectedCategoryId} videos with seed: ${shuffleSeed}`);
                }
                
                // Mark this category as used
                usedCategoryIds.add(selectedCategoryId);
                console.log(`✓ Marked category ${selectedCategoryId} as used. Total used: ${usedCategoryIds.size}/${allCategories.length}`);
                
                // If we've used all categories, reset the tracking
                if (usedCategoryIds.size >= allCategories.length) {
                  console.log('All video categories have been used, resetting category tracking');
                  usedCategoryIds.clear();
                }
              }
            } else {
              // If all categories have been used or something went wrong, get general videos
              // Use the user-selected sort option
              if (sortBy === 'popular') {
                videos = await dbStorage.getPopularVideos(fetchLimit);
                // Apply shuffle with seed if provided
                if (shuffleSeed) {
                  videos = shuffleArray(videos, shuffleSeed);
                  console.log(`Shuffled popular videos with seed: ${shuffleSeed}`);
                }
              } else if (sortBy === 'trending') {
                videos = await dbStorage.getTrendingVideos(fetchLimit);
                // Apply shuffle with seed if provided
                if (shuffleSeed) {
                  videos = shuffleArray(videos, shuffleSeed);
                  console.log(`Shuffled trending videos with seed: ${shuffleSeed}`);
                }
              } else if (sortBy === 'most-viewed') {
                videos = await dbStorage.getMostViewedVideos(fetchLimit);
                // Apply shuffle with seed if provided
                if (shuffleSeed) {
                  videos = shuffleArray(videos, shuffleSeed);
                  console.log(`Shuffled most-viewed videos with seed: ${shuffleSeed}`);
                }
              } else {
                videos = await dbStorage.getVideos(fetchLimit, undefined, undefined, dbSortBy as 'newest' | 'oldest' | 'viewed');
                // Apply shuffle with seed if provided
                if (shuffleSeed) {
                  videos = shuffleArray(videos, shuffleSeed);
                  console.log(`Shuffled ${dbSortBy} videos with seed: ${shuffleSeed}`);
                }
              }
            }
            
            // Filter to only video and embed types for video blocks
            videos = videos.filter(v => v.contentType === 'video' || v.contentType === 'embed');
            console.log(`Videos for category ID ${selectedCategoryId ?? 'general'}: first few IDs: [ ${videos.slice(0, 3).map(v => v.id).join(', ')} ]`);
          }
          
          // Filter out videos that have already been used in previous pages
          const uniqueVideos = videos.filter(video => !usedContentIds.has(video.id));
          
          // Only take the number needed for the row
          const selectedVideos = uniqueVideos.slice(0, itemsPerRow);
          
          // Log if we're running out of unique content
          if (selectedVideos.length < itemsPerRow) {
            console.log(`Warning: Running low on unique video content. Only found ${selectedVideos.length} videos for block ${blockId}`);
          }
          
          // Add these video IDs to the used set for persistent tracking across page loads
          selectedVideos.forEach(video => usedContentIds.add(video.id));
          
          // Get category info if available for the first video
          let categoryName = '';
          if (selectedVideos.length > 0 && selectedVideos[0].categoryId) {
            const category = await dbStorage.getCategoryById(selectedVideos[0].categoryId);
            categoryName = category?.name || '';
          }
          
          response.blocks.push({
            type: 'videos',
            id: blockId,
            title: '',
            categoryName, 
            items: selectedVideos
          });
        } else {
          // Get image content based on filters
          let images: Video[] = [];
          
          // Images are always 4 per row
          const imagesPerRow = 4;
          
          if (isTrending) {
            // For trending, use trending algorithm
            images = await dbStorage.getTrendingVideos(fetchLimit, 'image');
            // Apply shuffle with seed if provided
            if (shuffleSeed) {
              images = shuffleArray(images, shuffleSeed);
              console.log(`Shuffled trending images with seed: ${shuffleSeed}`);
            }
            console.log(`Category trending videos (image): first few IDs: [ ${images.slice(0, 3).map(v => v.id).join(', ')} ]`);
          } else if (isMostViewed) {
            // For most viewed, use most viewed sorting
            images = await dbStorage.getMostViewedVideos(fetchLimit, 'image');
            // Apply shuffle with seed if provided
            if (shuffleSeed) {
              images = shuffleArray(images, shuffleSeed);
              console.log(`Shuffled most-viewed images with seed: ${shuffleSeed}`);
            }
            console.log(`Category most-viewed videos (image): first few IDs: [ ${images.slice(0, 3).map(v => v.id).join(', ')} ]`);
          } else if (categoryId) {
            // Filter by category if specified
            images = await dbStorage.getVideosByCategory(categoryId, 'image', fetchLimit);
            // Apply shuffle with seed if provided
            if (shuffleSeed) {
              images = shuffleArray(images, shuffleSeed);
              console.log(`Shuffled category ${categoryId} images with seed: ${shuffleSeed}`);
            }
            console.log(`Category ${categoryId} videos (image): first few IDs: [ ${images.slice(0, 3).map(v => v.id).join(', ')} ]`);
          } else {
            // No specific category filter - try to find a new unused category
            let selectedCategoryId: number | undefined = undefined;
            
            // Find unused categories first (if we have any)
            const unusedCategories = allCategories.filter(cat => !usedCategoryIds.has(cat.id));
            
            if (unusedCategories.length > 0) {
              // Sort unused categories by popularity (most viewed first)
              const sortedUnusedCategories = sortCategoriesByPopularity(unusedCategories);
              
              // Select the most popular unused category that isn't already in use
              selectedCategoryId = sortedUnusedCategories[0].id;
              
              // Debug: Show the view counts for the unused categories
              const debugCategoriesWithViews = sortedUnusedCategories.map(cat => ({
                id: cat.id, 
                name: cat.name, 
                views: getCategoryViewCount(cat.id)
              }));
              console.log('Unused image categories sorted by popularity:', JSON.stringify(debugCategoriesWithViews));
              
              console.log(`Selected most popular unused category for images: ${sortedUnusedCategories[0].name} (${selectedCategoryId}) with ${getCategoryViewCount(selectedCategoryId)} views`);
              
              // Get images for this category
              images = await dbStorage.getVideosByCategory(selectedCategoryId, 'image', fetchLimit);
              
              // Apply shuffle with seed if provided
              if (shuffleSeed) {
                images = shuffleArray(images, shuffleSeed);
                console.log(`Shuffled selected category ${selectedCategoryId} images with seed: ${shuffleSeed}`);
              }
              
              // Mark this category as used
              usedCategoryIds.add(selectedCategoryId);
              console.log(`✓ Marked category ${selectedCategoryId} as used. Total used: ${usedCategoryIds.size}/${allCategories.length}`);
              
              // If we've used all categories, reset the tracking
              if (usedCategoryIds.size >= allCategories.length) {
                console.log('All image categories have been used, resetting category tracking');
                usedCategoryIds.clear();
              }
            } else {
              // If all categories have been used or something went wrong, get general images
              // Use the user-selected sort option
              if (sortBy === 'popular') {
                images = await dbStorage.getPopularVideos(fetchLimit, 'image');
                // Apply shuffle with seed if provided
                if (shuffleSeed) {
                  images = shuffleArray(images, shuffleSeed);
                  console.log(`Shuffled popular images with seed: ${shuffleSeed}`);
                }
              } else if (sortBy === 'trending') {
                images = await dbStorage.getTrendingVideos(fetchLimit, 'image');
                // Apply shuffle with seed if provided
                if (shuffleSeed) {
                  images = shuffleArray(images, shuffleSeed);
                  console.log(`Shuffled trending images with seed: ${shuffleSeed}`);
                }
              } else if (sortBy === 'most-viewed') {
                images = await dbStorage.getMostViewedVideos(fetchLimit, 'image');
                // Apply shuffle with seed if provided
                if (shuffleSeed) {
                  images = shuffleArray(images, shuffleSeed);
                  console.log(`Shuffled most-viewed images with seed: ${shuffleSeed}`);
                }
              } else {
                images = await dbStorage.getVideos(fetchLimit, 'image', undefined, dbSortBy as 'newest' | 'oldest' | 'viewed');
                // Apply shuffle with seed if provided
                if (shuffleSeed) {
                  images = shuffleArray(images, shuffleSeed);
                  console.log(`Shuffled ${dbSortBy} images with seed: ${shuffleSeed}`);
                }
              }
            }
            
            console.log(`Images for category ID ${selectedCategoryId ?? 'general'}: first few IDs: [ ${images.slice(0, 3).map(v => v.id).join(', ')} ]`);
          }
          
          // Filter out images that have already been used in previous pages
          const uniqueImages = images.filter(image => !usedContentIds.has(image.id));
          
          // Only take the number needed for the row
          const selectedImages = uniqueImages.slice(0, imagesPerRow);
          
          // Log if we're running out of unique content
          if (selectedImages.length < imagesPerRow) {
            console.log(`Warning: Running low on unique image content. Only found ${selectedImages.length} images for block ${blockId}`);
          }
          
          // Add these image IDs to the used set for persistent tracking across page loads
          selectedImages.forEach(image => usedContentIds.add(image.id));
          
          // Get category info if available for the first image
          let categoryName = '';
          if (selectedImages.length > 0 && selectedImages[0].categoryId) {
            const category = await dbStorage.getCategoryById(selectedImages[0].categoryId);
            categoryName = category?.name || '';
          }
          
          response.blocks.push({
            type: 'images',
            id: blockId,
            title: '',
            categoryName,
            items: selectedImages
          });
        }
      }
      
      // If we have a 'reset=true' query param, clear the cache
      if (req.query.reset === 'true') {
        // Only reset content but not category rotation when requested explicitly
        resetContentCache(cacheKey, false);
      }
      
      // Reset cache if we have no more content to show, but keep loading
      const hasEmptyBlock = response.blocks.some(block => block.items.length === 0);
      if (hasEmptyBlock) {
        console.log(`Some blocks are empty, resetting cache for ${cacheKey}`);
        // Reset content IDs but keep category tracking
        infiniteScrollCache.delete(cacheKey);
        // DON'T reset usedCategoriesCache here - let categories cycle completely
        // Always keep hasMore true for infinite scrolling
        // response.hasMore = false; 
      }
      
      // Log the current state of the cache
      console.log(`Used content IDs for ${cacheKey}: ${infiniteScrollCache.get(cacheKey)?.size} items`);
      console.log(`Used category IDs for ${cacheKey}: ${Array.from(usedCategoryIds).join(', ')}`);
      console.log(`Total categories in cache: ${allCategories.length}, Used categories: ${usedCategoryIds.size}`);
      
      // If all categories have been used, reset to allow for a fresh cycle in next request
      if (usedCategoryIds.size >= allCategories.length) {
        console.log('All categories have been used, resetting category tracking for next request');
        usedCategoryIds.clear();
      }
      
      res.json(response);
    } catch (error) {
      console.error("Error fetching infinite content:", error);
      res.status(500).json({ error: "Failed to fetch content" });
    }
  });

  // Video/Media upload endpoint (JSON data)
  app.post("/api/videos/upload", isAuthenticated, async (req, res) => {
    try {
      ensureUser(req);
      
      const { 
        title, 
        description, 
        aiGenerator, 
        prompt, 
        thumbnail, 
        categoryId, 
        resolution = "HD", 
        duration = 0,
        vimeoId,        // Added support for Vimeo ID
        contentType = "video",
        embedCode,      // For embedded content
        imageUrl,       // For image uploads
        videoUrl        // For direct video URLs
      } = req.body;
      
      // Only title and category are required now
      if (!title) {
        return res.status(400).json({ error: "Title is required" });
      }
      
      if (!categoryId) {
        return res.status(400).json({ error: "Category selection is required" });
      }
      
      // Block Reddit embeds at the server level
      if (contentType === "embed" && embedCode &&
          (embedCode.includes('reddit.com/r/') || 
           embedCode.includes('reddit-embed-bq') || 
           embedCode.includes('embed.reddit.com'))) {
        console.log("API: Blocking Reddit embed attempt");
        return res.status(400).json({ error: "Reddit embeds are not supported. Please use YouTube or Vimeo links instead." });
      }
      
      // Check if image content is actually HTML (basic check)
      if (contentType === "image" && imageUrl && 
          (imageUrl.includes('<!DOCTYPE html>') || 
           imageUrl.includes('<html') || 
           imageUrl.includes('<body'))) {
        console.log("API: Detected HTML content in image upload");
        // We'll allow it but warn the user in the frontend
      }
      
      // Verify category exists
      if (categoryId) {
        const category = await dbStorage.getCategoryById(parseInt(categoryId));
        if (!category) {
          return res.status(400).json({ error: "Selected category does not exist" });
        }
      }
      
      // If Vimeo ID is provided, try to get video details from Vimeo
      let vimeoDetails = null;
      if (vimeoId) {
        try {
          vimeoDetails = await vimeoService.getVideo(vimeoId);
        } catch (vimeoError) {
          console.error("Error fetching Vimeo video details:", vimeoError);
          // Continue with upload even if Vimeo fetch fails
        }
      }
      
      // Debug the request - see what's happening
      console.log("DEBUG - Creating video with userId:", req.user.id);
      console.log("DEBUG - Current user info:", JSON.stringify(req.user));
      
      // Create video record with explicit userId
      const video = await dbStorage.createVideo({
        title,
        description: description || "",
        aiGenerator,
        prompt,
        thumbnail: thumbnail || "https://placehold.co/400x225?text=AI+Video", // Placeholder
        videoUrl: vimeoId ? `https://vimeo.com/${vimeoId}` : videoUrl,
        preview: null,
        resolution,
        duration: vimeoDetails?.duration || duration,
        contentType,
        categoryId: parseInt(categoryId),
        vimeoId,
        userId: req.user.id, // Force this value
        credits: 0, // Default to 0 credits for free content
        embedCode: contentType === "embed" ? embedCode : null,
        imageUrl: contentType === "image" ? imageUrl : null
      });
      
      console.log("Created new video with ID:", video.id, video.title);
      
      res.status(201).json(video);
    } catch (error) {
      console.error("Error uploading video:", error);
      res.status(500).json({ error: "Failed to upload video" });
    }
  });
  
  // File upload endpoint for videos and images
  app.post("/api/upload/file", isAuthenticated, upload.single('file'), async (req, res) => {
    try {
      ensureUser(req);
      
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      const file = req.file;
      const isVideo = file.mimetype.startsWith('video/');
      const isImage = file.mimetype.startsWith('image/');
      
      if (!isVideo && !isImage) {
        // Clean up the file if it's not a supported type
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        return res.status(400).json({ 
          error: "Unsupported file type. Please upload video or image files only." 
        });
      }
      
      // Generate a local path that can be accessed via the /uploads static route (for backward compatibility)
      const relativePath = file.path.split('uploads/')[1]; // Gets "videos/video-123456.mp4" or "images/image-123456.jpg"
      const localPublicUrl = `/uploads/${relativePath}`;
      
      // Upload the file to S3
      let s3Key;
      let s3Url;
      
      try {
        // Use a consistent S3 key derived from the local path
        s3Key = localPathToS3Key(file.path);
        
        // Upload to S3
        await uploadFileToS3(file.path, s3Key);
        
        // Generate the API endpoint URL that will serve the file via signed S3 URL
        s3Url = `/api/s3/${s3Key}`;
        
        console.log(`File uploaded to S3: ${s3Key}`);
      } catch (s3Error) {
        console.error("Error uploading to S3:", s3Error);
        // Continue with local file if S3 upload fails
        console.log("Falling back to local storage");
      }
      
      console.log(`File uploaded: ${file.originalname} (${file.mimetype}) - Size: ${file.size}b`);
      console.log(`Stored at: ${file.path}`);
      console.log(`Public URL: ${s3Url || localPublicUrl}`);
      
      // Return the file info including the public accessible URL
      // Prefer S3 URL if available, otherwise use local URL
      res.status(201).json({
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        filePath: file.path,
        url: s3Url || localPublicUrl,
        contentType: isVideo ? 'video' : 'image',
        s3Key: s3Key // Include S3 key for reference
      });
      
    } catch (error) {
      console.error("Error handling file upload:", error);
      
      // Clean up the file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      res.status(500).json({ error: "Failed to process file upload" });
    }
  });

  // User videos endpoints
  app.get("/api/user/videos", isAuthenticated, async (req, res) => {
    try {
      ensureUser(req);
      console.log("DEBUG - Fetching videos for user ID:", req.user.id);
      
      // First check for this user's videos directly in the database
      const { pool } = await import('./db');
      const rawResults = await pool.query(
        'SELECT * FROM videos WHERE user_id = $1 ORDER BY id DESC',
        [req.user.id]
      );
      console.log("DEBUG - Direct SQL found videos:", rawResults.rows.length, "videos");
      
      const userVideos = await dbStorage.getUserVideos(req.user.id);
      console.log("DEBUG - getUserVideos returned:", userVideos.length, "videos");
      
      // Get category info for each video
      const videosWithCategories = await Promise.all(userVideos.map(async (video) => {
        const category = video.categoryId 
          ? await dbStorage.getCategoryById(video.categoryId) 
          : null;
        
        return {
          ...video,
          category
        };
      }));
      
      console.log("DEBUG - Sending videos to client:", videosWithCategories.length);
      res.json(videosWithCategories);
    } catch (error) {
      console.error("Error fetching user videos:", error);
      res.status(500).json({ error: "Failed to fetch user videos" });
    }
  });
  
  app.delete("/api/videos/:id", isAuthenticated, async (req, res) => {
    try {
      ensureUser(req);
      const videoId = parseInt(req.params.id);
      
      // Check if video exists
      const video = await dbStorage.getVideoById(videoId);
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }
      
      // Check if the user is an admin or the owner of the video
      const isAdmin = req.user.id === 1 || req.user.id === 2;
      if (!isAdmin && video.userId && video.userId !== req.user.id) {
        return res.status(403).json({ error: "You don't have permission to delete this content" });
      }
      
      await dbStorage.deleteVideo(videoId);
      
      res.status(200).json({ message: "Video deleted successfully" });
    } catch (error) {
      console.error("Error deleting video:", error);
      res.status(500).json({ error: "Failed to delete video" });
    }
  });
  
  // Wishlist endpoints
  app.get("/api/user/wishlist", isAuthenticated, async (req, res) => {
    try {
      ensureUser(req);
      const wishlist = await dbStorage.getUserWishlist(req.user.id);
      res.json(wishlist);
    } catch (error) {
      console.error("Error fetching user wishlist:", error);
      res.status(500).json({ error: "Failed to fetch user wishlist" });
    }
  });

  app.post("/api/videos/:id/wishlist", isAuthenticated, async (req, res) => {
    try {
      ensureUser(req);
      const videoId = parseInt(req.params.id);
      
      // Check if video exists
      const video = await dbStorage.getVideoById(videoId);
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }
      
      // Check if already in wishlist
      const isWishlisted = await dbStorage.isWishlisted(req.user.id, videoId);
      if (isWishlisted) {
        return res.status(400).json({ error: "Video already in wishlist" });
      }
      
      const wishlistItem = await dbStorage.addToWishlist({
        userId: req.user.id,
        videoId,
      });
      
      res.status(201).json(wishlistItem);
    } catch (error) {
      console.error("Error adding to wishlist:", error);
      res.status(500).json({ error: "Failed to add to wishlist" });
    }
  });

  app.delete("/api/videos/:id/wishlist", isAuthenticated, async (req, res) => {
    try {
      ensureUser(req);
      const videoId = parseInt(req.params.id);
      
      await dbStorage.removeFromWishlist(req.user.id, videoId);
      res.sendStatus(204);
    } catch (error) {
      console.error("Error removing from wishlist:", error);
      res.status(500).json({ error: "Failed to remove from wishlist" });
    }
  });

  // Like endpoints
  app.post("/api/videos/:id/like", async (req, res) => {
    try {
      console.log(`POST like request for video ID: ${req.params.id}`);
      console.log(`Request from IP: ${req.ip}, authenticated: ${req.isAuthenticated()}`);
      
      const videoId = parseInt(req.params.id);
      
      // Check if video exists
      const video = await dbStorage.getVideoById(videoId);
      if (!video) {
        console.log(`Video not found: ${videoId}`);
        return res.status(404).json({ error: "Video not found" });
      }
      
      // Prepare like object based on authentication state
      const likeData: InsertLike = {
        videoId,
        // Store either user ID (if authenticated) or IP/session (if anonymous)
        userId: req.isAuthenticated() ? (req.user as Express.User).id : undefined,
        ipAddress: !req.isAuthenticated() ? req.ip : undefined,
        sessionId: !req.isAuthenticated() ? req.sessionID : undefined
      };
      
      console.log(`Like data: ${JSON.stringify(likeData)}`);
      
      // Check if already liked
      const isLiked = await dbStorage.isLiked(
        videoId, 
        likeData.userId || undefined, 
        likeData.ipAddress || undefined, 
        likeData.sessionId || undefined
      );
      
      console.log(`Is video already liked? ${isLiked}`);
      
      if (isLiked) {
        return res.status(400).json({ error: "Already liked" });
      }
      
      // Add the like
      const like = await dbStorage.addLike(likeData);
      
      // Get updated like count
      const likeCount = await dbStorage.getLikeCount(videoId);
      
      console.log(`Added like. New count: ${likeCount}`);
      res.status(201).json({ like, count: likeCount });
    } catch (error) {
      console.error("Error adding like:", error);
      res.status(500).json({ error: "Failed to add like" });
    }
  });

  app.delete("/api/videos/:id/like", async (req, res) => {
    try {
      const videoId = parseInt(req.params.id);
      
      // Remove like based on authentication state
      if (req.isAuthenticated()) {
        const userId = (req.user as Express.User).id;
        await dbStorage.removeLike(videoId, userId);
      } else {
        // For anonymous users, use IP and session ID
        await dbStorage.removeLike(videoId, undefined, req.ip, req.sessionID);
      }
      
      // Get updated like count
      const likeCount = await dbStorage.getLikeCount(videoId);
      
      res.json({ success: true, count: likeCount });
    } catch (error) {
      console.error("Error removing like:", error);
      res.status(500).json({ error: "Failed to remove like" });
    }
  });

  // Thumbnail generation endpoint
  app.get("/api/videos/:id/thumbnail", async (req, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const thumbnailPath = `./thumbnails/video_${videoId}.jpg`;
      const s3Key = `thumbnails/video-${videoId}.jpg`;
      const fs = await import('fs/promises');
      const { execFile } = await import('child_process');
      const util = await import('util');
      const execFilePromise = util.promisify(execFile);
      const path = await import('path');
      
      // Get the video data
      const video = await dbStorage.getVideoById(videoId);
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }
      
      // Log video information for debugging
      console.log(`Generating thumbnail for video ${videoId}:`); 
      console.log(` - Title: ${video.title}`); 
      console.log(` - Content Type: ${video.contentType}`);
      console.log(` - Video URL: ${video.videoUrl || 'None'}`);
      console.log(` - Existing Thumbnail: ${video.thumbnail || 'None'}`);
      
      // If video has a pre-defined thumbnail, handle it
      if (video.thumbnail && !video.thumbnail.includes("placehold.co") && !video.thumbnail.startsWith("data:")) {
        // If thumbnail is internal API route, serve the file directly instead of redirecting
        if (video.thumbnail === `/api/videos/${videoId}/thumbnail`) {
          // Try S3 first, then fallback to local file
          try {
            const signedUrl = await getSignedS3Url(s3Key);
            return res.redirect(signedUrl);
          } catch (s3Error) {
            // S3 failed, fallback to local file
            try {
              // Check if the cached thumbnail file exists locally
              await fs.access(thumbnailPath);
              // Serve it directly
              return res.sendFile(path.resolve(thumbnailPath));
            } catch (err) {
              // If not yet generated, don't redirect to avoid loops
              console.log(`Thumbnail reference exists but file doesn't, regenerating for ${videoId}`);
              // Continue with normal processing
            }
          }
        } else {
          // For external URLs, redirect
          return res.redirect(video.thumbnail);
        }
      }
      
      // If we have a thumbnail already generated, serve it
      try {
        // Try S3 first
        try {
          const signedUrl = await getSignedS3Url(s3Key);
          return res.redirect(signedUrl);
        } catch (s3Error) {
          // S3 failed, try local file
          try {
            await fs.access(thumbnailPath);
            // If file exists, serve it
            return res.sendFile(path.resolve(thumbnailPath));
          } catch (fsErr) {
            // Local file doesn't exist either
            throw fsErr; // Rethrow to be caught by outer catch
          }
        }
      } catch (err) {
        // Neither S3 nor local file exists, continue to generate it
        console.log(`Thumbnail doesn't exist yet for video ${videoId}, generating now...`);
      }
      
      // For videos with local file paths (MP4, WebM, etc.), generate a real thumbnail
      if (video.contentType === 'video' && video.videoUrl) {
        // Clean the URL - handle both base64 and file path formats
        let videoPath = video.videoUrl;
        
        if (videoPath.startsWith('data:')) {
          // For base64 videos - can't generate thumbnails from these directly
          // Fallback to colorful placeholder
          const title = video.title || "Video";
          const firstLetter = title.charAt(0).toUpperCase();
          const hue = (firstLetter.charCodeAt(0) % 26) * 10; 
          return res.redirect(`https://placehold.co/800x450/${hue.toString(16).padStart(2, '0')}0066/FFFFFF?text=${encodeURIComponent(title)}`);
        } else if (videoPath.startsWith('http')) {
          // Remote URL, use a placeholder for now (can't easily process remote videos)
          const title = video.title || "Video";
          const firstLetter = title.charAt(0).toUpperCase();
          const hue = (firstLetter.charCodeAt(0) % 26) * 10;
          return res.redirect(`https://placehold.co/800x450/${hue.toString(16).padStart(2, '0')}0066/FFFFFF?text=${encodeURIComponent(title)}`);
        } else {
          // Local file path - clean it up if needed
          // If the path starts with a slash but doesn't have a proper directory prefix
          if (videoPath.startsWith('/')) {
            // Remove the leading slash and make it relative to current directory
            videoPath = `.${videoPath}`;
          }
          
          // Make sure we don't have a double period at the start
          if (videoPath.startsWith('.//')) {
            videoPath = videoPath.replace('.//','./'); 
          }
          
          // If it doesn't start with ./, add it
          if (!videoPath.startsWith('./')) {
            videoPath = `./${videoPath}`;
          }
          
          // Make sure the path exists
          try {
            await fs.access(videoPath);
            
            // Generate a thumbnail using ffmpeg
            console.log(`Generating thumbnail for ${videoPath} to ${thumbnailPath}`);
            
            try {
              // Take a screenshot at 1 second into the video
              await execFilePromise('ffmpeg', [
                '-i', videoPath,
                '-ss', '00:00:01.000',
                '-vframes', '1',
                '-vf', 'scale=800:450',
                thumbnailPath
              ]);
              
              console.log(`Successfully generated thumbnail for video ${videoId}`);
              
              // Upload the thumbnail to S3
              try {
                await uploadFileToS3(thumbnailPath, s3Key);
                console.log(`Uploaded thumbnail to S3: ${s3Key}`);
              } catch (s3Error) {
                console.error(`Failed to upload thumbnail to S3: ${s3Error}`);
                // Continue even if S3 upload fails
              }
              
              // Update the video record with the thumbnail path
              await dbStorage.updateVideo(videoId, { thumbnail: `/api/videos/${videoId}/thumbnail` });
              
              // Serve the generated thumbnail
              return res.sendFile(path.resolve(thumbnailPath));
            } catch (ffmpegError) {
              console.error('Error running FFmpeg:', ffmpegError);
              throw new Error('Failed to generate thumbnail with FFmpeg');
            }
          } catch (fileError) {
            console.error(`Video file not found: ${videoPath}`, fileError);
            throw new Error('Video file not found');
          }
        }
      } 
      
      // For YouTube embeds, try to get a thumbnail from YouTube
      if (video.contentType === 'embed' && video.embedCode && video.embedCode.includes('youtube.com/embed/')) {
        const youtubeIdMatch = video.embedCode.match(/youtube\.com\/embed\/([\w-]+)/);
        if (youtubeIdMatch && youtubeIdMatch[1]) {
          const youtubeId = youtubeIdMatch[1];
          const youtubeThumbnailUrl = `https://img.youtube.com/vi/${youtubeId}/0.jpg`;
          
          // Update the video with the YouTube thumbnail URL
          await dbStorage.updateVideo(videoId, { thumbnail: youtubeThumbnailUrl });
          
          return res.redirect(youtubeThumbnailUrl);
        }
      }
      
      // Generate a colorful default thumbnail based on the video title for other cases
      const title = video.title || "Video";
      const firstLetter = title.charAt(0).toUpperCase();
      const hue = (firstLetter.charCodeAt(0) % 26) * 10; // Generate a color based on first letter
      
      // Redirect to a placeholder with the title
      return res.redirect(`https://placehold.co/800x450/${hue.toString(16).padStart(2, '0')}0066/FFFFFF?text=${encodeURIComponent(title)}`);
      
    } catch (error) {
      console.error("Error generating thumbnail:", error);
      // Fall back to a generic placeholder
      res.redirect("https://placehold.co/800x450/333/FFF?text=AI+Video");
    }
  });

  app.get("/api/videos/:id/like", async (req, res) => {
    try {
      const videoId = parseInt(req.params.id);
      
      // Check like status based on authentication state
      let isLiked = false;
      if (req.isAuthenticated()) {
        const userId = (req.user as Express.User).id;
        isLiked = await dbStorage.isLiked(videoId, userId);
      } else {
        // For anonymous users, use IP and session ID
        isLiked = await dbStorage.isLiked(videoId, undefined, req.ip, req.sessionID);
      }
      
      // Get like count
      const likeCount = await dbStorage.getLikeCount(videoId);
      
      res.json({ isLiked, count: likeCount });
    } catch (error) {
      console.error("Error checking like status:", error);
      res.status(500).json({ error: "Failed to check like status" });
    }
  });

  // Vimeo Integration Routes
  
  // Get user's Vimeo videos
  app.get("/api/vimeo/videos", isAuthenticated, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const perPage = parseInt(req.query.perPage as string) || 10;
      
      const videos = await vimeoService.getUserVideos(page, perPage);
      res.json(videos);
    } catch (error) {
      console.error("Error fetching Vimeo videos:", error);
      res.status(500).json({ error: "Failed to fetch videos" });
    }
  });
  
  // Get a specific Vimeo video
  app.get("/api/vimeo/videos/:id", async (req, res) => {
    try {
      const videoId = req.params.id;
      const video = await vimeoService.getVideo(videoId);
      res.json(video);
    } catch (error) {
      console.error("Error fetching Vimeo video:", error);
      res.status(500).json({ error: "Failed to fetch video" });
    }
  });
  
  // Search Vimeo videos
  app.get("/api/vimeo/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      const page = parseInt(req.query.page as string) || 1;
      const perPage = parseInt(req.query.perPage as string) || 10;
      
      if (!query) {
        return res.status(400).json({ error: "Search query is required" });
      }
      
      const results = await vimeoService.searchVideos(query, page, perPage);
      res.json(results);
    } catch (error) {
      console.error("Error searching Vimeo videos:", error);
      res.status(500).json({ error: "Failed to search videos" });
    }
  });
  
  // Video/Image detail endpoint
  app.get("/api/videos/:id", async (req, res) => {
    try {
      const videoId = parseInt(req.params.id);
      console.log("API: Fetching video with ID:", videoId);
      
      if (isNaN(videoId)) {
        console.error("Invalid video ID:", req.params.id);
        return res.status(400).json({ error: "Invalid video ID format" });
      }
      
      // Get video details
      const video = await dbStorage.getVideoById(videoId);
      
      if (!video) {
        console.error("Video not found with ID:", videoId);
        return res.status(404).json({ error: "Video/Image not found" });
      }
      
      // Increment view count
      const newViewCount = await dbStorage.incrementViews(videoId);
      console.log(`API: Incremented view count for video ${videoId} to ${newViewCount}`);
      
      // Update views count in video object
      video.views = newViewCount;
      
      console.log("API: Retrieved video:", video.id, video.title, "Content type:", video.contentType);
      
      // Debug video URL for MP4 videos
      if (video.contentType === 'video' && video.videoUrl) {
        console.log("API: Video URL data:", {
          urlLength: video.videoUrl.length,
          urlPreview: video.videoUrl.substring(0, 50) + '...',
          isMimeTypeIncluded: video.videoUrl.includes('data:video'),
          isMP4: video.videoUrl.includes('mp4'),
          urlStart: video.videoUrl.substring(0, 30)
        });
      }
      
      // Get category info
      const category = video.categoryId 
        ? await dbStorage.getCategoryById(video.categoryId) 
        : null;
      
      // Get comments
      const comments = await dbStorage.getCommentsByVideoId(videoId);
      console.log("API: Retrieved", comments.length, "comments for video", videoId);
      
      // Check if item is wishlisted by current user (if authenticated)
      let isWishlisted = false;
      if (req.isAuthenticated() && req.user) {
        isWishlisted = await dbStorage.isWishlisted(req.user.id, videoId);
      }
      
      // Modify embed code for proper rendering
      if (video.contentType === 'embed' && video.embedCode) {
        // Check if this is a YouTube embed and add autoplay
        if (video.embedCode.includes('youtube.com/embed/')) {
          console.log("API: Found YouTube embed, adding autoplay");
          
          // First check if the iframe already has autoplay
          if (!video.embedCode.includes('autoplay=1')) {
            // Add autoplay parameters to YouTube embeds with more comprehensive regex
            video.embedCode = video.embedCode
              // Case 1: URL with no query parameters
              .replace(/src="(https:\/\/www\.youtube\.com\/embed\/[^?"]+)"/g, 'src="$1?autoplay=1"')
              
              // Case 2: URL already has query parameters
              .replace(/src="(https:\/\/www\.youtube\.com\/embed\/[^"]+)\?([^"]+)"/g, function(match, url, params) {
                // Don't add autoplay if it's already there
                if (params.includes('autoplay=')) {
                  return match;
                }
                return `src="${url}?autoplay=1&${params}"`;
              })
              
              // Add allow="autoplay" if it's missing
              .replace(/<iframe([^>]*)>/g, function(match, attributes) {
                if (attributes.includes('allow="') && !attributes.includes('autoplay')) {
                  return match.replace('allow="', 'allow="autoplay; ');
                } else if (!attributes.includes('allow="')) {
                  return match.replace('<iframe', '<iframe allow="autoplay"');
                }
                return match;
              });
          }
          
          console.log("API: Modified YouTube embed to include autoplay");
        } 
        // Check if this is a Reddit embed and ensure it has the required script
        else if (video.embedCode.includes('reddit-embed-bq') || 
                 video.embedCode.includes('reddit.com/r/') && video.embedCode.includes('comments')) {
          // IMPORTANT: Reddit embeds need special handling to play correctly
          console.log("API: Found Reddit embed, adding special handling");
          
          // Try multiple regex patterns to extract Reddit info
          let postId = null;
          let subreddit = null;
          
          // Method 1: Try extracting from data-embed attributes
          const redditRegex1 = /data-embed-id="([\w\d]+)" data-embed-live="false" data-embed-created="(\d+)" data-embed-subreddit="([\w\d-]+)"/;
          const redditMatch1 = video.embedCode.match(redditRegex1);
          
          if (redditMatch1) {
            postId = redditMatch1[1];
            subreddit = redditMatch1[3];
          }
          
          // Method 2: Try extracting from URL in the embed code
          if (!postId || !subreddit) {
            const redditRegex2 = /reddit\.com\/r\/([^\/]+)\/comments\/([^\/]+)/;
            const redditMatch2 = video.embedCode.match(redditRegex2);
            
            if (redditMatch2) {
              subreddit = redditMatch2[1];
              postId = redditMatch2[2];
            }
          }
          
          // Method 3: Try extracting from href attributes
          if (!postId || !subreddit) {
            const hrefRegex = /href="https?:\/\/(?:www\.)?reddit\.com\/r\/([^\/]+)\/comments\/([^\/]+)/;
            const hrefMatch = video.embedCode.match(hrefRegex);
            
            if (hrefMatch) {
              subreddit = hrefMatch[1];
              postId = hrefMatch[2];
            }
          }
          
          // If we found the Reddit info, create a custom embed with iframe
          if (postId && subreddit) {
            console.log(`API: Extracted Reddit info - subreddit: ${subreddit}, postId: ${postId}`);
            
            // Store the Reddit info in a data attribute for easier client-side access
            video.embedCode = `
              <div 
                class="reddit-embed-container" 
                style="position:relative;padding-bottom:120%;height:0;overflow:hidden;"
                data-reddit-subreddit="${subreddit}" 
                data-reddit-postid="${postId}"
              >
                <iframe
                  style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;"
                  src="https://www.redditmedia.com/r/${subreddit}/comments/${postId}/?embed=true&amp;showmedia=true&amp;showedits=true&amp;created=true"
                  allowfullscreen="true"
                  sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                  scrolling="no"
                ></iframe>
              </div>
            `;
            
            // Also set a custom thumbnail for Reddit embeds if none exists
            if (!video.thumbnail || video.thumbnail.includes('placehold.co')) {
              video.thumbnail = `https://placehold.co/400x225/FF4500/FFFFFF?text=r/${subreddit}`;
            }
          } else {
            // If we can't extract the Reddit post info, add the script as before
            console.log("API: Could not extract Reddit post info, adding standard script");
            if (!video.embedCode.includes('embed.reddit.com/widgets.js')) {
              video.embedCode += '<script async src="https://embed.reddit.com/widgets.js" charset="UTF-8"></script>';
            }
          }
        }
      }
      
      const responseData = {
        ...video,
        category,
        comments,
        isWishlisted
      };
      
      console.log("API: Sending video data with embedCode of length:", 
                 video.embedCode ? video.embedCode.length : 0);
      
      // Return complete details
      res.json(responseData);
      
    } catch (error) {
      console.error("Error fetching video details:", error);
      res.status(500).json({ error: "Failed to fetch video details" });
    }
  });
  
  // Comments API
  app.get("/api/videos/:id/comments", async (req, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const comments = await dbStorage.getCommentsByVideoId(videoId);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });
  
  app.post("/api/videos/:id/comments", async (req, res) => {
    try {
      const videoId = parseInt(req.params.id);
      
      // Check if video exists
      const video = await dbStorage.getVideoById(videoId);
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }
      
      const { username, content } = req.body;
      
      // Validate required fields
      if (!username) {
        return res.status(400).json({ error: "Username is required" });
      }
      
      if (!content) {
        return res.status(400).json({ error: "Comment content is required" });
      }
      
      // Create comment with or without user ID
      const commentData: any = {
        videoId,
        username,
        content
      };
      
      // If user is authenticated, associate comment with user
      if (req.isAuthenticated() && req.user) {
        commentData.userId = req.user.id;
      }
      
      const comment = await dbStorage.addComment(commentData);
      res.status(201).json(comment);
      
    } catch (error) {
      console.error("Error adding comment:", error);
      res.status(500).json({ error: "Failed to add comment" });
    }
  });

  // Upload a video to Vimeo
  app.post("/api/vimeo/upload", isAuthenticated, upload.single("video"), async (req, res) => {
    try {
      ensureUser(req);
      
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      const { name, description, privacy, categoryId, aiGenerator, prompt } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: "Video name is required" });
      }
      
      const filePath = req.file.path;
      
      try {
        const result = await vimeoService.uploadVideo(
          filePath, 
          name, 
          description || "", 
          privacy as any || "anybody"
        );
        
        // Clean up temporary file
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        
        // If categoryId is provided, create a video record in our database
        if (categoryId && result.videoId) {
          try {
            // Get video data from Vimeo to extract thumbnail and duration
            const vimeoVideo = await vimeoService.getVideo(result.videoId);
            const thumbnail = vimeoService.getThumbnail(vimeoVideo);
            
            // Calculate duration in seconds
            const duration = vimeoVideo.duration || 0;
            
            // Create a video record
            const video = await dbStorage.createVideo({
              title: name,
              description: description || "",
              aiGenerator: aiGenerator || null,
              prompt: prompt || null,
              thumbnail: thumbnail || "https://placehold.co/400x225?text=Video",
              videoUrl: `https://vimeo.com/${result.videoId}`,
              contentType: "video",
              resolution: "HD",
              duration,
              categoryId: parseInt(categoryId),
              vimeoId: result.videoId,
              credits: 0, // Default to 0 credits for free content
              preview: null,
            });
            
            // Return both Vimeo result and our video record
            return res.json({
              ...result,
              video
            });
          } catch (dbError) {
            console.error("Error saving video to database:", dbError);
            // Still return the Vimeo result even if database save fails
            return res.json({
              ...result,
              dbError: "Failed to save video to database, but Vimeo upload was successful"
            });
          }
        }
        
        res.json(result);
      } catch (uploadError) {
        // Clean up temporary file on error
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        throw uploadError;
      }
    } catch (error) {
      console.error("Error uploading to Vimeo:", error);
      res.status(500).json({ error: "Failed to upload video" });
    }
  });
  
  // Endpoint to get current user's uploaded videos
  app.get("/api/user/videos", isAuthenticated, async (req, res) => {
    try {
      ensureUser(req);
      
      // Get videos uploaded by this user
      const videos = await dbStorage.getUserVideos(req.user.id);
      
      console.log(`Fetched ${videos.length} videos for user ID: ${req.user.id}`);
      
      // Enhanced video objects with category data if needed
      const enhancedVideos = await Promise.all(videos.map(async (video) => {
        if (video.categoryId) {
          const category = await dbStorage.getCategoryById(video.categoryId);
          return {
            ...video,
            category: category ? {
              id: category.id,
              name: category.name,
              slug: category.slug
            } : undefined
          };
        }
        return video;
      }));
      
      res.json(enhancedVideos);
    } catch (error) {
      console.error("Error fetching user videos:", error);
      res.status(500).json({ error: "Failed to fetch your videos" });
    }
  });

  // Admin endpoints
  // Get all content for admin dashboard
  app.get("/api/content/all", isAdmin, async (req, res) => {
    try {
      const videos = await dbStorage.getVideos(200); // Get up to 200 items
      res.json(videos);
    } catch (error) {
      console.error("Error fetching all content:", error);
      res.status(500).json({ error: "Failed to fetch content" });
    }
  });
  
  // Get all users for admin dashboard
  app.get("/api/admin/users", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const users = await dbStorage.getAllUsers();
      
      // Don't return password hashes
      const safeUsers = users.map(user => {
        // Make a copy without the password
        const { password, ...safeUser } = user;
        return safeUser;
      });
      
      res.json(safeUsers);
    } catch (error) {
      console.error("Error fetching all users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });
  
  // We're using the other deletion endpoint at "/api/admin/content/:contentId" defined below
  
  // Ban/unban user endpoint
  app.put("/api/admin/users/:userId", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { banned } = req.body;
      
      if (typeof banned !== 'boolean') {
        return res.status(400).json({ error: "Banned status must be a boolean" });
      }
      
      // Check if user exists and update them
      const updatedUser = await dbStorage.updateUser(userId, { banned });
      
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Don't return password hash
      const { password, ...safeUser } = updatedUser;
      res.json(safeUser);
    } catch (error) {
      console.error("Error updating user ban status:", error);
      res.status(500).json({ error: "Failed to update user ban status" });
    }
  });
  
  // Admin content review endpoints
  app.get("/api/admin/content/pending", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const pendingContent = await dbStorage.getPendingReviewContent();
      res.json(pendingContent);
    } catch (error) {
      console.error("Error fetching pending content:", error);
      res.status(500).json({ error: "Failed to fetch pending content" });
    }
  });

  app.post("/api/admin/content/:contentId/approve", isAuthenticated, isAdmin, async (req, res) => {
    try {
      ensureUser(req);
      const contentId = parseInt(req.params.contentId);
      
      // Verify the content exists
      const content = await dbStorage.getVideoById(contentId);
      if (!content) {
        return res.status(404).json({ error: "Content not found" });
      }
      
      const reviewedContent = await dbStorage.updateContentReviewStatus(
        contentId, 
        'approved', 
        req.user.id
      );
      
      res.json(reviewedContent);
    } catch (error) {
      console.error("Error approving content:", error);
      res.status(500).json({ error: "Failed to approve content" });
    }
  });

  app.post("/api/admin/content/:contentId/reject", isAuthenticated, isAdmin, async (req, res) => {
    try {
      ensureUser(req);
      const contentId = parseInt(req.params.contentId);
      const { reason } = req.body;
      
      // Verify the content exists
      const content = await dbStorage.getVideoById(contentId);
      if (!content) {
        return res.status(404).json({ error: "Content not found" });
      }
      
      // First update the review status
      await dbStorage.updateContentReviewStatus(
        contentId, 
        'rejected', 
        req.user.id, 
        reason || 'Content rejected by admin'
      );
      
      // Then delete the content
      await dbStorage.deleteVideo(contentId);
      
      res.json({ success: true, message: "Content rejected and deleted" });
    } catch (error) {
      console.error("Error rejecting content:", error);
      res.status(500).json({ error: "Failed to reject content" });
    }
  });
  
  // Delete content as admin
  app.delete("/api/admin/content/:contentId", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const contentId = parseInt(req.params.contentId);
      
      // Get the content to verify it exists
      const content = await dbStorage.getVideoById(contentId);
      if (!content) {
        return res.status(404).json({ error: "Content not found" });
      }
      
      await dbStorage.deleteVideo(contentId);
      res.json({ success: true, message: "Content deleted successfully" });
    } catch (error) {
      console.error("Error deleting content:", error);
      res.status(500).json({ error: "Failed to delete content" });
    }
  });
  
  // Profile management endpoints
  app.patch("/api/user", isAuthenticated, async (req, res) => {
    try {
      ensureUser(req);
      const { username, email } = req.body;
      
      // If changing username, check if it's already taken
      if (username && username !== req.user.username) {
        const existingUser = await dbStorage.getUserByUsername(username);
        if (existingUser && existingUser.id !== req.user.id) {
          return res.status(400).json({ error: "Username already exists" });
        }
      }
      
      // Update the user
      const updatedUser = await dbStorage.updateUser(req.user.id, { 
        username, 
        email 
      });
      
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });
  
  // API route for changing password
  app.post("/api/user/change-password", isAuthenticated, async (req, res) => {
    try {
      ensureUser(req);
      const { currentPassword, newPassword } = req.body;
      
      // Validate that current password is correct
      const user = await dbStorage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Password utilities imported at the top of the file
      
      // Check if the current password is correct
      const isPasswordValid = await comparePasswords(currentPassword, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }
      
      // Hash the new password
      const hashedPassword = await hashPassword(newPassword);
      
      // Update the user's password
      await dbStorage.updateUser(req.user.id, { password: hashedPassword });
      
      res.status(200).json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ error: "Failed to change password" });
    }
  });
  
  // API route for deleting user account
  app.delete("/api/user", isAuthenticated, async (req, res) => {
    try {
      ensureUser(req);
      
      // Delete the user's content (videos, comments, etc.)
      // This would be more complex in a real system to handle all user data
      const userVideos = await dbStorage.getUserVideos(req.user.id);
      for (const video of userVideos) {
        await dbStorage.deleteVideo(video.id);
      }
      
      // Delete the user
      await dbStorage.deleteUser(req.user.id);
      
      // Log the user out
      req.logout((err) => {
        if (err) {
          console.error("Error logging out after account deletion:", err);
          return res.status(500).json({ error: "Failed to delete account" });
        }
        
        res.status(200).json({ message: "Account deleted successfully" });
      });
    } catch (error) {
      console.error("Error deleting user account:", error);
      res.status(500).json({ error: "Failed to delete account" });
    }
  });
  
  // Public user profile routes
  // Get user by ID
  app.get("/api/users/:userId/profile", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }
      
      const user = await dbStorage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Don't expose sensitive data
      const safeUser = {
        id: user.id,
        username: user.username,
        createdAt: user.createdAt,
        isAdmin: Boolean(user.isAdmin), // Safe to expose admin status, but not other fields
      };
      
      res.json(safeUser);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ error: "Failed to fetch user profile" });
    }
  });
  
  // Get user by username
  app.get("/api/users/by-username/:username", async (req, res) => {
    try {
      const { username } = req.params;
      if (!username) {
        return res.status(400).json({ error: "Username is required" });
      }
      
      const user = await dbStorage.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Don't expose sensitive data
      const safeUser = {
        id: user.id,
        username: user.username,
        createdAt: user.createdAt,
        isAdmin: Boolean(user.isAdmin), // Safe to expose admin status, but not other fields
      };
      
      res.json(safeUser);
    } catch (error) {
      console.error("Error fetching user by username:", error);
      res.status(500).json({ error: "Failed to fetch user profile" });
    }
  });
  
  // Get all content uploaded by a specific user
  app.get("/api/users/:userId/content", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }
      
      // Check if user exists
      const user = await dbStorage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Fetch user's content
      const videos = await dbStorage.getUserVideos(userId);
      
      // Return videos with username attached
      const videosWithUsername = videos.map(video => ({
        ...video,
        username: user.username
      }));
      
      res.json(videosWithUsername);
    } catch (error) {
      console.error("Error fetching user content:", error);
      res.status(500).json({ error: "Failed to fetch user content" });
    }
  });
  
  // Messaging API endpoints
  app.post("/api/messages", isAuthenticated, async (req, res) => {
    try {
      ensureUser(req);
      
      const { receiverId, content } = req.body;
      if (!receiverId || !content) {
        return res.status(400).json({ error: "Receiver ID and content are required" });
      }
      
      // Check if receiver exists
      const receiver = await dbStorage.getUser(receiverId);
      if (!receiver) {
        return res.status(404).json({ error: "Receiver not found" });
      }
      
      // Create message
      const message = await dbStorage.createMessage({
        senderId: req.user.id,
        receiverId,
        content,
        read: false
      });
      
      // Add sender username to the response
      const messageWithUsername = {
        ...message,
        senderName: req.user.username
      };
      
      res.status(201).json(messageWithUsername);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });
  
  // Get conversation between current user and another user
  app.get("/api/messages/:userId", isAuthenticated, async (req, res) => {
    try {
      ensureUser(req);
      
      const otherUserId = parseInt(req.params.userId);
      if (isNaN(otherUserId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }
      
      // Fetch messages between the two users
      const messages = await dbStorage.getConversation(req.user.id, otherUserId);
      
      // Mark messages as read if they're sent to the current user
      const unreadMessages = messages.filter(
        message => message.receiverId === req.user.id && !message.read
      );
      
      if (unreadMessages.length > 0) {
        for (const message of unreadMessages) {
          await dbStorage.markMessageAsRead(message.id);
        }
      }
      
      // Get username for the other user
      const otherUser = await dbStorage.getUser(otherUserId);
      
      // Add sender and receiver names to the messages
      const messagesWithNames = messages.map(message => ({
        ...message,
        senderName: message.senderId === req.user.id ? req.user.username : otherUser?.username,
        receiverName: message.receiverId === req.user.id ? req.user.username : otherUser?.username
      }));
      
      res.json(messagesWithNames);
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });
  
  // Get unread message count
  app.get("/api/messages/unread/count", isAuthenticated, async (req, res) => {
    try {
      ensureUser(req);
      
      const count = await dbStorage.getUnreadMessageCount(req.user.id);
      res.json({ count });
    } catch (error) {
      console.error("Error getting unread message count:", error);
      res.status(500).json({ error: "Failed to get unread message count" });
    }
  });
  
  // Get all conversations for the current user
  app.get("/api/messages/conversations", isAuthenticated, async (req, res) => {
    try {
      ensureUser(req);
      
      // First, get all messages for the user (sent or received)
      const allMessages = await dbStorage.getAllUserMessages(req.user.id);
      
      // Create a map of user IDs to their conversations
      const conversationsMap = new Map();
      
      // Process all messages to build conversations
      for (const message of allMessages) {
        const isUserSender = message.senderId === req.user.id;
        const otherUserId = isUserSender ? message.receiverId : message.senderId;
        
        // Skip if this is a message to self
        if (otherUserId === req.user.id) continue;
        
        // Get or create conversation entry
        if (!conversationsMap.has(otherUserId)) {
          // Get other user's information
          const otherUser = await dbStorage.getUser(otherUserId);
          if (!otherUser) continue; // Skip if user no longer exists
          
          conversationsMap.set(otherUserId, {
            userId: otherUserId,
            username: otherUser.username,
            lastMessage: message.content,
            lastMessageDate: message.createdAt,
            unreadCount: 0
          });
        } else {
          // Update last message if newer
          const conversation = conversationsMap.get(otherUserId);
          const messageDate = new Date(message.createdAt);
          const lastMessageDate = new Date(conversation.lastMessageDate);
          
          if (messageDate > lastMessageDate) {
            conversation.lastMessage = message.content;
            conversation.lastMessageDate = message.createdAt;
          }
        }
        
        // Count unread messages from other user
        if (!isUserSender && !message.read) {
          conversationsMap.get(otherUserId).unreadCount++;
        }
      }
      
      // Sort conversations by most recent message
      const conversations = Array.from(conversationsMap.values())
        .sort((a, b) => new Date(b.lastMessageDate).getTime() - new Date(a.lastMessageDate).getTime());
      
      res.json(conversations);
    } catch (error) {
      console.error("Error getting conversations:", error);
      res.status(500).json({ error: "Failed to get conversations" });
    }
  });
  
  // Get specific conversation and mark messages as read
  app.get("/api/messages/conversation/:userId", isAuthenticated, async (req, res) => {
    try {
      ensureUser(req);
      
      const otherUserId = parseInt(req.params.userId);
      if (isNaN(otherUserId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }
      
      // Get the other user to verify they exist
      const otherUser = await dbStorage.getUser(otherUserId);
      if (!otherUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Fetch messages between the two users
      const messages = await dbStorage.getConversation(req.user.id, otherUserId);
      
      // Mark messages as read if they're sent to the current user
      const unreadMessages = messages.filter(
        message => message.receiverId === req.user.id && !message.read
      );
      
      if (unreadMessages.length > 0) {
        for (const message of unreadMessages) {
          await dbStorage.markMessageAsRead(message.id);
        }
      }
      
      // Add sender and receiver names to the messages
      const messagesWithNames = messages.map(message => ({
        ...message,
        senderName: message.senderId === req.user.id ? req.user.username : otherUser.username,
        receiverName: message.receiverId === req.user.id ? req.user.username : otherUser.username
      }));
      
      res.json(messagesWithNames);
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });
  
  // Mark all messages from a user as read
  app.post("/api/messages/mark-read/:userId", isAuthenticated, async (req, res) => {
    try {
      ensureUser(req);
      
      const otherUserId = parseInt(req.params.userId);
      if (isNaN(otherUserId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }
      
      // Mark all messages from other user as read
      await dbStorage.markAllMessagesAsRead(req.user.id, otherUserId);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking messages as read:", error);
      res.status(500).json({ error: "Failed to mark messages as read" });
    }
  });

  // S3 file serving endpoint
  app.get("/api/s3/:key(*)", async (req, res) => {
    try {
      const key = req.params.key;
      if (!key) {
        return res.status(400).json({ error: "Invalid S3 key" });
      }
      
      // Get signed URL with short expiry to avoid abuse
      const signedUrl = await getSignedS3Url(key, 3600); // 1 hour expiry
      
      // Set CORS headers to allow cross-origin requests
      res.set({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cross-Origin-Resource-Policy': 'cross-origin'
      });
      
      // Return a JSON response for the key fetching endpoint
      if (req.query.getUrl === 'true') {
        return res.json({ url: signedUrl });
      }
      
      // Otherwise redirect
      res.redirect(signedUrl);
    } catch (error) {
      console.error("Error serving S3 file:", error);
      res.status(404).json({ error: "File not found or inaccessible" });
    }
  });

  const httpServer = createServer(app);
  
  // Add WebSocket support
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('WebSocket message received:', data);
        
        // Handle different message types here
        if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });

  return httpServer;
}