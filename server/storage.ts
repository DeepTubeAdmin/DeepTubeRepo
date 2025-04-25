import { 
  users, categories, videos, purchases, wishlistItems, creditTransactions,
  type User, type InsertUser, 
  type Category, type InsertCategory,
  type Video, type InsertVideo,
  type Purchase, type InsertPurchase,
  type WishlistItem, type InsertWishlistItem,
  type CreditTransaction, type InsertCreditTransaction
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";
import session from "express-session";
import type { Store as SessionStore } from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

// Convert in-memory storage to database storage
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User>;
  updateUserCredits(id: number, credits: number): Promise<User>;
  updateStripeCustomerId(id: number, customerId: string): Promise<User>;
  updateUserStripeInfo(id: number, data: { stripeCustomerId: string, stripeSubscriptionId: string }): Promise<User>;
  
  // Category operations
  getCategories(): Promise<Category[]>;
  getCategoryBySlug(slug: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  
  // Video operations
  getVideos(limit?: number): Promise<Video[]>;
  getVideoById(id: number): Promise<Video | undefined>;
  getVideosByCategory(categoryId: number): Promise<Video[]>;
  getFeaturedVideos(limit?: number): Promise<Video[]>;
  getNewVideos(limit?: number): Promise<Video[]>;
  createVideo(video: InsertVideo): Promise<Video>;
  
  // Purchase operations
  createPurchase(purchase: InsertPurchase): Promise<Purchase>;
  getUserPurchases(userId: number): Promise<Purchase[]>;
  isPurchased(userId: number, videoId: number): Promise<boolean>;
  
  // Wishlist operations
  addToWishlist(item: InsertWishlistItem): Promise<WishlistItem>;
  removeFromWishlist(userId: number, videoId: number): Promise<void>;
  getUserWishlist(userId: number): Promise<WishlistItem[]>;
  isWishlisted(userId: number, videoId: number): Promise<boolean>;
  
  // Credit transactions operations
  createCreditTransaction(transaction: InsertCreditTransaction): Promise<CreditTransaction>;
  getUserCreditTransactions(userId: number): Promise<CreditTransaction[]>;
  
  // Session store
  sessionStore: SessionStore;
}

// Define PostgreSQL session store
const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  sessionStore: SessionStore;
  
  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  
  async updateUser(id: number, data: Partial<InsertUser>): Promise<User> {
    const [user] = await db.update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return user;
  }
  
  async updateUserCredits(id: number, credits: number): Promise<User> {
    const [user] = await db.update(users)
      .set({ credits })
      .where(eq(users.id, id))
      .returning();
    return user;
  }
  
  async updateStripeCustomerId(id: number, stripeCustomerId: string): Promise<User> {
    const [user] = await db.update(users)
      .set({ stripeCustomerId })
      .where(eq(users.id, id))
      .returning();
    return user;
  }
  
  async updateUserStripeInfo(id: number, data: { stripeCustomerId: string, stripeSubscriptionId: string }): Promise<User> {
    const [user] = await db.update(users)
      .set({ 
        stripeCustomerId: data.stripeCustomerId,
        stripeSubscriptionId: data.stripeSubscriptionId 
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Category operations
  async getCategories(): Promise<Category[]> {
    return db.select().from(categories);
  }
  
  async getCategoryBySlug(slug: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.slug, slug));
    return category;
  }
  
  async createCategory(category: InsertCategory): Promise<Category> {
    const [result] = await db.insert(categories).values(category).returning();
    return result;
  }

  // Video operations
  async getVideos(limit: number = 50): Promise<Video[]> {
    return db.select().from(videos).limit(limit);
  }
  
  async getVideoById(id: number): Promise<Video | undefined> {
    const [video] = await db.select().from(videos).where(eq(videos.id, id));
    return video;
  }
  
  async getVideosByCategory(categoryId: number): Promise<Video[]> {
    return db.select().from(videos).where(eq(videos.categoryId, categoryId));
  }
  
  async getFeaturedVideos(limit: number = 10): Promise<Video[]> {
    // Featured videos could be based on criteria like number of purchases
    return db.select().from(videos).limit(limit);
  }
  
  async getNewVideos(limit: number = 10): Promise<Video[]> {
    return db.select()
      .from(videos)
      .orderBy(desc(videos.createdAt))
      .limit(limit);
  }
  
  async createVideo(video: InsertVideo): Promise<Video> {
    const [result] = await db.insert(videos).values(video).returning();
    return result;
  }

  // Purchase operations
  async createPurchase(purchase: InsertPurchase): Promise<Purchase> {
    const [result] = await db.insert(purchases).values(purchase).returning();
    return result;
  }
  
  async getUserPurchases(userId: number): Promise<Purchase[]> {
    return db.select().from(purchases).where(eq(purchases.userId, userId));
  }
  
  async isPurchased(userId: number, videoId: number): Promise<boolean> {
    const [purchase] = await db.select().from(purchases)
      .where(and(
        eq(purchases.userId, userId),
        eq(purchases.videoId, videoId)
      ));
    return !!purchase;
  }

  // Wishlist operations
  async addToWishlist(item: InsertWishlistItem): Promise<WishlistItem> {
    const [result] = await db.insert(wishlistItems).values(item).returning();
    return result;
  }
  
  async removeFromWishlist(userId: number, videoId: number): Promise<void> {
    await db.delete(wishlistItems)
      .where(and(
        eq(wishlistItems.userId, userId),
        eq(wishlistItems.videoId, videoId)
      ));
  }
  
  async getUserWishlist(userId: number): Promise<WishlistItem[]> {
    return db.select().from(wishlistItems).where(eq(wishlistItems.userId, userId));
  }
  
  async isWishlisted(userId: number, videoId: number): Promise<boolean> {
    const [item] = await db.select().from(wishlistItems)
      .where(and(
        eq(wishlistItems.userId, userId),
        eq(wishlistItems.videoId, videoId)
      ));
    return !!item;
  }

  // Credit transactions operations
  async createCreditTransaction(transaction: InsertCreditTransaction): Promise<CreditTransaction> {
    const [result] = await db.insert(creditTransactions).values(transaction).returning();
    return result;
  }
  
  async getUserCreditTransactions(userId: number): Promise<CreditTransaction[]> {
    return db.select().from(creditTransactions)
      .where(eq(creditTransactions.userId, userId))
      .orderBy(desc(creditTransactions.transactionDate));
  }
}

export const storage = new DatabaseStorage();
