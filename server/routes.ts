import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { insertCategorySchema, insertVideoSchema } from "@shared/schema";
import * as vimeoService from "./vimeo";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';

// Get directory paths in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set up multer for file uploads
const upload = multer({
  dest: path.join(__dirname, '../uploads/'),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);
  
  // Middleware to check if user is authenticated
  const isAuthenticated = (req: Request, res: Response, next: Function) => {
    if (req.isAuthenticated() && req.user) {
      return next();
    }
    res.status(401).json({ error: "Authentication required" });
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
      const existingCategories = await storage.getCategories();
      
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
        const newCategory = await storage.createCategory(category);
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
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  // Define specific routes before parameterized routes
  app.get("/api/categories/by-slug/:slug", async (req, res) => {
    try {
      const category = await storage.getCategoryBySlug(req.params.slug);
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
      const category = await storage.createCategory(categoryData);
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
      const videos = await storage.getVideos(limit);
      res.json(videos);
    } catch (error) {
      console.error("Error fetching videos:", error);
      res.status(500).json({ error: "Failed to fetch videos" });
    }
  });

  app.get("/api/videos/featured", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const videos = await storage.getFeaturedVideos(limit);
      res.json(videos);
    } catch (error) {
      console.error("Error fetching featured videos:", error);
      res.status(500).json({ error: "Failed to fetch featured videos" });
    }
  });

  app.get("/api/videos/new", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const videos = await storage.getNewVideos(limit);
      res.json(videos);
    } catch (error) {
      console.error("Error fetching new videos:", error);
      res.status(500).json({ error: "Failed to fetch new videos" });
    }
  });

  app.get("/api/videos/:id", async (req, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const video = await storage.getVideoById(videoId);
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }
      res.json(video);
    } catch (error) {
      console.error("Error fetching video:", error);
      res.status(500).json({ error: "Failed to fetch video" });
    }
  });

  app.post("/api/videos", isAuthenticated, async (req, res) => {
    try {
      const videoData = insertVideoSchema.parse(req.body);
      const video = await storage.createVideo(videoData);
      res.status(201).json(video);
    } catch (error) {
      console.error("Error creating video:", error);
      res.status(400).json({ error: "Invalid video data" });
    }
  });

  app.get("/api/categories/:id/videos", async (req, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      const videos = await storage.getVideosByCategory(categoryId);
      res.json(videos);
    } catch (error) {
      console.error("Error fetching videos by category:", error);
      res.status(500).json({ error: "Failed to fetch videos by category" });
    }
  });

  // Video upload endpoint
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
        contentType = "video" 
      } = req.body;
      
      // Only title and category are required now
      if (!title) {
        return res.status(400).json({ error: "Title is required" });
      }
      
      if (!categoryId) {
        return res.status(400).json({ error: "Category selection is required" });
      }
      
      // Verify category exists
      if (categoryId) {
        const category = await storage.getCategoryById(parseInt(categoryId));
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
      
      // Create video record
      const video = await storage.createVideo({
        title,
        description: description || "",
        aiGenerator,
        prompt,
        thumbnail: thumbnail || "https://placehold.co/400x225?text=AI+Video", // Placeholder
        videoUrl: vimeoId ? `https://vimeo.com/${vimeoId}` : null,
        preview: null,
        resolution,
        duration: vimeoDetails?.duration || duration,
        contentType,
        categoryId: parseInt(categoryId),
        vimeoId,
      });
      
      res.status(201).json(video);
    } catch (error) {
      console.error("Error uploading video:", error);
      res.status(500).json({ error: "Failed to upload video" });
    }
  });

  // Wishlist endpoints
  app.get("/api/user/wishlist", isAuthenticated, async (req, res) => {
    try {
      ensureUser(req);
      const wishlist = await storage.getUserWishlist(req.user.id);
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
      const video = await storage.getVideoById(videoId);
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }
      
      // Check if already in wishlist
      const isWishlisted = await storage.isWishlisted(req.user.id, videoId);
      if (isWishlisted) {
        return res.status(400).json({ error: "Video already in wishlist" });
      }
      
      const wishlistItem = await storage.addToWishlist({
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
      
      await storage.removeFromWishlist(req.user.id, videoId);
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
            const video = await storage.createVideo({
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


  const httpServer = createServer(app);
  return httpServer;
}