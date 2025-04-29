import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
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

  // Removed duplicate route - see detailed version below

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
  
  // Get paginated content with alternating pattern (3 rows videos, 2 rows images)
  app.get("/api/content/infinite", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 5; // Default to 5 blocks per page
      const categorySlug = req.query.category as string || '';
      const sortBy = (req.query.sortBy as 'newest' | 'oldest' | 'viewed') || 'newest';
      
      // Get categoryId if category slug is provided
      let categoryId: number | undefined = undefined;
      if (categorySlug && categorySlug !== 'trending' && categorySlug !== 'most-viewed') {
        const category = await storage.getCategoryBySlug(categorySlug);
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
      
      // Create pattern of 3 video blocks followed by 2 image blocks
      for (let i = 0; i < pageSize; i++) {
        const blockId = baseIndex + i;
        const blockType = i < 3 ? 'videos' : 'images';
        
        if (blockType === 'videos') {
          // Get video content based on filters
          let videos: Video[] = [];
          
          if (isTrending) {
            // For trending, use featured videos
            videos = await storage.getFeaturedVideos(5);
          } else if (isMostViewed) {
            // For most viewed, use random order for now (will be replaced with actual view count)
            videos = await storage.getVideos(5, 'video', undefined, 'viewed');
          } else if (categoryId) {
            // Filter by category if specified
            videos = await storage.getVideosByCategory(categoryId, 'video', 5);
          } else {
            // No filter - include all types (video, image, and embeds)
            videos = await storage.getVideos(5, undefined, undefined, sortBy);
          }
          
          response.blocks.push({
            type: 'videos',
            id: blockId,
            title: '',
            items: videos
          });
        } else {
          // Get image content based on filters
          let images: Video[] = [];
          
          if (isTrending) {
            // For trending, use newest images
            images = await storage.getVideos(5, 'image', undefined, 'newest');
          } else if (isMostViewed) {
            // For most viewed, use "viewed" sort
            images = await storage.getVideos(5, 'image', undefined, 'viewed');
          } else if (categoryId) {
            // Filter by category if specified
            images = await storage.getVideosByCategory(categoryId, 'image', 5);
          } else {
            // No filter - include all image types
            images = await storage.getVideos(5, 'image', undefined, sortBy);
          }
          
          response.blocks.push({
            type: 'images',
            id: blockId,
            title: '',
            items: images
          });
        }
      }
      
      res.json(response);
    } catch (error) {
      console.error("Error fetching infinite content:", error);
      res.status(500).json({ error: "Failed to fetch content" });
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
        credits: 0, // Default to 0 credits for free content
        embedCode: contentType === "embed" ? embedCode : null,
        imageUrl: contentType === "image" ? imageUrl : null,
      });
      
      res.status(201).json(video);
    } catch (error) {
      console.error("Error uploading video:", error);
      res.status(500).json({ error: "Failed to upload video" });
    }
  });

  // User videos endpoints
  app.get("/api/user/videos", isAuthenticated, async (req, res) => {
    try {
      ensureUser(req);
      const userVideos = await storage.getUserVideos(req.user.id);
      
      // Get category info for each video
      const videosWithCategories = await Promise.all(userVideos.map(async (video) => {
        const category = video.categoryId 
          ? await storage.getCategoryById(video.categoryId) 
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
      const video = await storage.getVideoById(videoId);
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }
      
      // In a real implementation, we'd check if the user owns this video
      // For this demo version, we'll allow any authenticated user to delete
      await storage.deleteVideo(videoId);
      
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
      const video = await storage.getVideoById(videoId);
      
      if (!video) {
        console.error("Video not found with ID:", videoId);
        return res.status(404).json({ error: "Video/Image not found" });
      }
      
      console.log("API: Retrieved video:", video.id, video.title, "Content type:", video.contentType);
      
      // Get category info
      const category = video.categoryId 
        ? await storage.getCategoryById(video.categoryId) 
        : null;
      
      // Get comments
      const comments = await storage.getCommentsByVideoId(videoId);
      console.log("API: Retrieved", comments.length, "comments for video", videoId);
      
      // Check if item is wishlisted by current user (if authenticated)
      let isWishlisted = false;
      if (req.isAuthenticated() && req.user) {
        isWishlisted = await storage.isWishlisted(req.user.id, videoId);
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
        else if (video.embedCode.includes('reddit-embed-bq')) {
          // IMPORTANT: Reddit embeds need special handling to play correctly
          console.log("API: Found Reddit embed, adding special handling");
          
          // Extract Reddit post ID and subreddit from the embed code
          const redditRegex = /data-embed-id="([\w\d]+)" data-embed-live="false" data-embed-created="(\d+)" data-embed-subreddit="([\w\d-]+)"/;
          const redditMatch = video.embedCode.match(redditRegex);
          
          if (redditMatch) {
            const postId = redditMatch[1];
            const subreddit = redditMatch[3];
            console.log(`API: Extracted Reddit info - subreddit: ${subreddit}, postId: ${postId}`);
            
            // Create a custom embed that will load properly
            video.embedCode = `
              <div class="reddit-embed-container" style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;">
                <iframe
                  style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;"
                  src="https://www.reddit.com/r/${subreddit}/comments/${postId}/embed/"
                  allowfullscreen="true"
                  sandbox="allow-scripts allow-same-origin allow-popups"
                  scrolling="no"
                ></iframe>
                <div id="reddit-embed-overlay-${postId}" 
                     style="position:absolute;top:0;left:0;width:100%;height:100%;display:flex;justify-content:center;align-items:center;background:rgba(0,0,0,0.1);cursor:pointer;"
                     onclick="window.open('https://www.reddit.com/r/${subreddit}/comments/${postId}/', '_blank')">
                  <div style="background:rgba(0,0,0,0.7);color:white;padding:10px 20px;border-radius:4px;">
                    Click to view on Reddit
                  </div>
                </div>
                <script>
                  // Remove overlay after 3 seconds to allow interaction with the iframe
                  setTimeout(function() {
                    const overlay = document.getElementById('reddit-embed-overlay-${postId}');
                    if (overlay) overlay.style.display = 'none';
                  }, 3000);
                </script>
              </div>
            `;
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
      const comments = await storage.getCommentsByVideoId(videoId);
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
      const video = await storage.getVideoById(videoId);
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
      
      const comment = await storage.addComment(commentData);
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


  const httpServer = createServer(app);
  return httpServer;
}