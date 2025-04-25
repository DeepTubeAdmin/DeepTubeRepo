import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import Stripe from "stripe";
import { z } from "zod";
import { insertCategorySchema, insertVideoSchema } from "@shared/schema";

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
  
  // Stripe setup
  let stripe: Stripe | null = null;
  if (process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16" as any, // Type cast to fix compatibility issue
    });
  } else {
    console.warn("Missing STRIPE_SECRET_KEY environment variable. Stripe payment functionality will not work.");
  }

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

  app.get("/api/categories/:slug", async (req, res) => {
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

  // User purchases endpoints
  app.get("/api/user/purchases", isAuthenticated, async (req, res) => {
    try {
      const purchases = await storage.getUserPurchases(req.user.id);
      res.json(purchases);
    } catch (error) {
      console.error("Error fetching user purchases:", error);
      res.status(500).json({ error: "Failed to fetch user purchases" });
    }
  });

  app.post("/api/videos/:id/purchase", isAuthenticated, async (req, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const video = await storage.getVideoById(videoId);
      
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }
      
      // Check if user already purchased this video
      const alreadyPurchased = await storage.isPurchased(req.user.id, videoId);
      if (alreadyPurchased) {
        return res.status(400).json({ error: "Video already purchased" });
      }
      
      // Check if user has enough credits
      if (req.user.credits < video.credits) {
        return res.status(400).json({ error: "Insufficient credits" });
      }
      
      // Process purchase
      const purchase = await storage.createPurchase({
        userId: req.user.id,
        videoId: video.id,
        creditsPaid: video.credits,
      });
      
      // Update user's credits
      const newCredits = req.user.credits - video.credits;
      await storage.updateUserCredits(req.user.id, newCredits);
      
      // Create credit transaction record
      await storage.createCreditTransaction({
        userId: req.user.id,
        amount: -video.credits,
        type: "purchase",
      });
      
      res.status(201).json({ purchase, remainingCredits: newCredits });
    } catch (error) {
      console.error("Error purchasing video:", error);
      res.status(500).json({ error: "Failed to purchase video" });
    }
  });

  // Wishlist endpoints
  app.get("/api/user/wishlist", isAuthenticated, async (req, res) => {
    try {
      const wishlist = await storage.getUserWishlist(req.user.id);
      res.json(wishlist);
    } catch (error) {
      console.error("Error fetching user wishlist:", error);
      res.status(500).json({ error: "Failed to fetch user wishlist" });
    }
  });

  app.post("/api/videos/:id/wishlist", isAuthenticated, async (req, res) => {
    try {
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
      const videoId = parseInt(req.params.id);
      
      await storage.removeFromWishlist(req.user.id, videoId);
      res.sendStatus(204);
    } catch (error) {
      console.error("Error removing from wishlist:", error);
      res.status(500).json({ error: "Failed to remove from wishlist" });
    }
  });

  // Credit purchase with Stripe
  app.post("/api/create-payment-intent", isAuthenticated, async (req, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ error: "Stripe is not configured" });
      }
      
      const { amount } = req.body;
      
      // Validate amount
      if (!amount || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
      }
      
      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "usd",
        metadata: {
          userId: req.user.id.toString(),
          credits: (amount * 1000).toString(), // $1 = 1000 credits
        },
      });
      
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ error: "Failed to create payment intent" });
    }
  });

  // Webhook for Stripe events
  app.post("/api/webhook", async (req, res) => {
    if (!stripe) {
      return res.status(500).json({ error: "Stripe is not configured" });
    }
    
    const sig = req.headers['stripe-signature'];
    
    if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
      return res.status(400).json({ error: "Missing Stripe signature or webhook secret" });
    }
    
    let event;
    
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err: any) {
      console.error(`Webhook Error: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    // Handle successful payment
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      const userId = parseInt(paymentIntent.metadata.userId);
      const credits = parseInt(paymentIntent.metadata.credits);
      
      try {
        // Get current user
        const user = await storage.getUser(userId);
        if (!user) {
          console.error(`User not found: ${userId}`);
          return res.status(404).json({ error: "User not found" });
        }
        
        // Update user credits
        const newCredits = user.credits + credits;
        await storage.updateUserCredits(userId, newCredits);
        
        // Create credit transaction record
        await storage.createCreditTransaction({
          userId,
          amount: credits,
          type: "purchase",
          stripePaymentId: paymentIntent.id,
        });
        
        console.log(`Added ${credits} credits to user ${userId}`);
      } catch (error) {
        console.error("Error processing payment success:", error);
        return res.status(500).json({ error: "Failed to process payment" });
      }
    }
    
    res.json({ received: true });
  });

  const httpServer = createServer(app);
  return httpServer;
}