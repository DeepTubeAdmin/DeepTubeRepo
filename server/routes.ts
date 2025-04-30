import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage as dbStorage } from "./storage";
import { setupAuth, comparePasswords, hashPassword } from "./auth";
import { z } from "zod";
import { insertCategorySchema, insertVideoSchema, type Video } from "@shared/schema";
import * as vimeoService from "./vimeo";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';

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
    fileSize: 100 * 1024 * 1024, // 100MB limit
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
  
  // Middleware to check if user is authenticated
  const isAuthenticated = (req: Request, res: Response, next: Function) => {
    if (req.isAuthenticated() && req.user) {
      return next();
    }
    res.status(401).json({ error: "Authentication required" });
  };
  
  // Middleware to check if user is an admin
  const isAdmin = (req: Request, res: Response, next: Function) => {
    if (req.isAuthenticated() && req.user && (req.user.id === 1 || req.user.id === 2)) {
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
      const videos = await dbStorage.getVideos(limit);
      res.json(videos);
    } catch (error) {
      console.error("Error fetching videos:", error);
      res.status(500).json({ error: "Failed to fetch videos" });
    }
  });

  app.get("/api/videos/featured", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const videos = await dbStorage.getFeaturedVideos(limit);
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
  
  // Helper to get or create a cache key
  function getCacheKey(categorySlug: string, sortBy: string): string {
    return `${categorySlug || 'all'}_${sortBy}`;
  }
  
  // Helper to reset cache when needed
  function resetContentCache(key?: string) {
    if (key) {
      infiniteScrollCache.delete(key);
    } else {
      infiniteScrollCache.clear();
    }
  }
  
  app.get("/api/content/infinite", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 5; // Default to 5 blocks per page
      const categorySlug = req.query.category as string || '';
      const sortBy = (req.query.sortBy as 'newest' | 'oldest' | 'viewed') || 'newest';
      
      // Get categoryId if category slug is provided
      let categoryId: number | undefined = undefined;
      if (categorySlug && categorySlug !== 'trending' && categorySlug !== 'most-viewed') {
        const category = await dbStorage.getCategoryBySlug(categorySlug);
        categoryId = category?.id;
      }
      
      // Special handling for "trending" and "most-viewed" categories
      const isTrending = categorySlug === 'trending';
      const isMostViewed = categorySlug === 'most-viewed';
      
      // Create a response with mixed content blocks
      const response = {
        page,
        pageSize,
        hasMore: page < 10, // For demo, limit to 10 pages
        blocks: [] as Array<{
          type: 'videos' | 'images';
          id: number;
          title: string;
          items: Video[];
        }>
      };
      
      const baseIndex = (page - 1) * pageSize;
      
      // Reset cache if we're starting a new page (page 1) or changing categories/filters
      const cacheKey = getCacheKey(categorySlug, sortBy);
      
      // If page 1, reset the cache for this category/sort combo
      if (page === 1) {
        resetContentCache(cacheKey);
      }
      
      // Get or create the set of used content IDs for this view
      if (!infiniteScrollCache.has(cacheKey)) {
        infiniteScrollCache.set(cacheKey, new Set<number>());
      }
      const usedContentIds = infiniteScrollCache.get(cacheKey)!;
      
      // Create pattern of 3 video blocks followed by 2 image blocks
      for (let i = 0; i < pageSize; i++) {
        const blockId = baseIndex + i;
        const blockType = i < 3 ? 'videos' : 'images';
        
        // Define our row size constant for reuse between blocks
        const itemsPerRow = 8; // Increased from 5 to fill rows better
        // Request more items than needed to allow for filtering out duplicates
        const fetchLimit = itemsPerRow * 3; // Request even more to account for used IDs across pages
        
        if (blockType === 'videos') {
          // Get video content based on filters
          let videos: Video[] = [];
          
          if (isTrending) {
            // For trending, use featured videos
            videos = await dbStorage.getFeaturedVideos(fetchLimit);
            console.log(`Category trending videos (video): first few IDs: [ ${videos.slice(0, 3).map(v => v.id).join(', ')} ]`);
          } else if (isMostViewed) {
            // For most viewed, use random order for now (will be replaced with actual view count)
            videos = await dbStorage.getVideos(fetchLimit, 'video', undefined, 'viewed');
            console.log(`Category most-viewed videos (video): first few IDs: [ ${videos.slice(0, 3).map(v => v.id).join(', ')} ]`);
          } else if (categoryId) {
            // Filter by category if specified
            videos = await dbStorage.getVideosByCategory(categoryId, 'video', fetchLimit);
            console.log(`Category ${categoryId} videos (video): first few IDs: [ ${videos.slice(0, 3).map(v => v.id).join(', ')} ]`);
          } else {
            // No filter - include all types (video, image, and embeds)
            videos = await dbStorage.getVideos(fetchLimit, 'video', undefined, sortBy);
            console.log(`General videos (video): first few IDs: [ ${videos.slice(0, 3).map(v => v.id).join(', ')} ]`);
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
          
          response.blocks.push({
            type: 'videos',
            id: blockId,
            title: '',
            items: selectedVideos
          });
        } else {
          // Get image content based on filters
          let images: Video[] = [];
          
          // Use the same number of images per row as videos but fetch more to allow for filtering
          const imagesPerRow = itemsPerRow;
          
          if (isTrending) {
            // For trending, use newest images
            images = await dbStorage.getVideos(fetchLimit, 'image', undefined, 'newest');
            console.log(`Category trending videos (image): first few IDs: [ ${images.slice(0, 3).map(v => v.id).join(', ')} ]`);
          } else if (isMostViewed) {
            // For most viewed, use "viewed" sort
            images = await dbStorage.getVideos(fetchLimit, 'image', undefined, 'viewed');
            console.log(`Category most-viewed videos (image): first few IDs: [ ${images.slice(0, 3).map(v => v.id).join(', ')} ]`);
          } else if (categoryId) {
            // Filter by category if specified
            images = await dbStorage.getVideosByCategory(categoryId, 'image', fetchLimit);
            console.log(`Category ${categoryId} videos (image): first few IDs: [ ${images.slice(0, 3).map(v => v.id).join(', ')} ]`);
          } else {
            // No filter - include all image types
            images = await dbStorage.getVideos(fetchLimit, 'image', undefined, sortBy);
            console.log(`General videos (image): first few IDs: [ ${images.slice(0, 3).map(v => v.id).join(', ')} ]`);
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
          
          response.blocks.push({
            type: 'images',
            id: blockId,
            title: '',
            items: selectedImages
          });
        }
      }
      
      // If we have a 'reset=true' query param, clear the cache
      if (req.query.reset === 'true') {
        resetContentCache(cacheKey);
      }
      
      // Also reset cache if we have no more content to show
      const hasEmptyBlock = response.blocks.some(block => block.items.length === 0);
      if (hasEmptyBlock) {
        console.log(`Some blocks are empty, resetting cache for ${cacheKey}`);
        resetContentCache(cacheKey);
        response.hasMore = false;
      }
      
      // Log the current state of the cache
      console.log(`Used content IDs for ${cacheKey}: ${infiniteScrollCache.get(cacheKey)?.size} items`);
      
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
      
      // Generate a path that can be accessed via the /uploads static route
      const relativePath = file.path.split('uploads/')[1]; // Gets "videos/video-123456.mp4" or "images/image-123456.jpg"
      const publicUrl = `/uploads/${relativePath}`;
      
      console.log(`File uploaded: ${file.originalname} (${file.mimetype}) - Size: ${file.size}b`);
      console.log(`Stored at: ${file.path}`);
      console.log(`Public URL: ${publicUrl}`);
      
      // Return the file info including the public accessible URL
      res.status(201).json({
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        filePath: file.path,
        url: publicUrl,
        contentType: isVideo ? 'video' : 'image'
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
      const userVideos = await dbStorage.getUserVideos(req.user.id);
      
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
          // Add autoplay parameters to YouTube embeds
          video.embedCode = video.embedCode
            // Add autoplay=1 parameter to YouTube URLs
            .replace(/src="(https:\/\/www\.youtube\.com\/embed\/[^?"]+)"/g, 'src="$1?autoplay=1&mute=1"')
            // If URL already has query parameters, append autoplay=1
            .replace(/src="(https:\/\/www\.youtube\.com\/embed\/[^"]+)\?([^"]+)"/g, 'src="$1?autoplay=1&mute=1&$2"')
            // Add allow="autoplay" to the iframe
            .replace('allow="', 'allow="autoplay; ');
            
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


  const httpServer = createServer(app);
  return httpServer;
}