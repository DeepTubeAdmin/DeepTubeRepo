import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('Missing STRIPE_SECRET_KEY environment variable. Stripe payment functionality will not work.');
}

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" }) 
  : null;

export async function registerRoutes(app: Express): Promise<Server> {
  // User authentication routes
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });

  // Credit transactions routes
  app.post("/api/credits/purchase", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (!stripe) return res.status(500).json({ message: "Stripe payment not configured" });

    try {
      const { amount } = req.body;
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "usd",
        metadata: {
          userId: req.user?.id.toString(),
          creditAmount: Math.round(amount * 1000).toString(), // $1 = 1000 credits
        },
      });
      
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      res.status(500).json({ message: "Error creating payment intent: " + error.message });
    }
  });

  // Payment confirmation webhook
  app.post("/api/webhook/stripe", async (req, res) => {
    if (!stripe) return res.status(500).json({ message: "Stripe payment not configured" });
    
    let event;
    
    try {
      const sig = req.headers["stripe-signature"];
      
      if (!process.env.STRIPE_WEBHOOK_SECRET || !sig) {
        throw new Error("Missing Stripe webhook signature");
      }
      
      event = stripe.webhooks.constructEvent(
        req.body, 
        sig, 
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err: any) {
      console.log(`Webhook Error: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object;
      const userId = parseInt(paymentIntent.metadata.userId);
      const creditAmount = parseInt(paymentIntent.metadata.creditAmount);
      
      if (userId && creditAmount) {
        try {
          // Get current user credits
          const user = await storage.getUser(userId);
          if (!user) throw new Error("User not found");
          
          // Update user credits
          const newCredits = user.credits + creditAmount;
          await storage.updateUserCredits(userId, newCredits);
          
          // Record the transaction
          await storage.createCreditTransaction({
            userId,
            amount: creditAmount,
            transactionType: "purchase",
            transactionDate: new Date(),
            description: `Purchased ${creditAmount} credits`,
          });
        } catch (err: any) {
          console.error("Error updating user credits:", err);
        }
      }
    }
    
    res.json({ received: true });
  });
  
  // Video endpoints
  app.get("/api/videos", async (req, res) => {
    try {
      const videos = await storage.getVideos();
      res.json(videos);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.get("/api/videos/featured", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const videos = await storage.getFeaturedVideos(limit);
      res.json(videos);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.get("/api/videos/new", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const videos = await storage.getNewVideos(limit);
      res.json(videos);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
  
  app.get("/api/videos/category/:slug", async (req, res) => {
    try {
      const category = await storage.getCategoryBySlug(req.params.slug);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      const videos = await storage.getVideosByCategory(category.id);
      res.json(videos);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
