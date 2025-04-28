import { 
  users, categories, videos, wishlistItems, comments,
  type User, type InsertUser, 
  type Category, type InsertCategory,
  type Video, type InsertVideo,
  type WishlistItem, type InsertWishlistItem,
  type Comment, type InsertComment
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
  
  // Category operations
  getCategories(): Promise<Category[]>;
  getCategoryById(id: number): Promise<Category | undefined>;
  getCategoryBySlug(slug: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  
  // Video operations
  getVideos(limit?: number): Promise<Video[]>;
  getVideoById(id: number): Promise<Video | undefined>;
  getVideosByCategory(categoryId: number): Promise<Video[]>;
  getFeaturedVideos(limit?: number): Promise<Video[]>;
  getNewVideos(limit?: number): Promise<Video[]>;
  createVideo(video: InsertVideo): Promise<Video>;
  
  // Wishlist operations
  addToWishlist(item: InsertWishlistItem): Promise<WishlistItem>;
  removeFromWishlist(userId: number, videoId: number): Promise<void>;
  getUserWishlist(userId: number): Promise<WishlistItem[]>;
  isWishlisted(userId: number, videoId: number): Promise<boolean>;
  
  // Comment operations
  addComment(comment: InsertComment): Promise<Comment>;
  getCommentsByVideoId(videoId: number): Promise<Comment[]>;
  
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
  
  // User methods implementations

  // Category operations
  async getCategories(): Promise<Category[]> {
    return db.select().from(categories);
  }
  
  async getCategoryById(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
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
  async getVideos(limit: number = 50, contentType?: string): Promise<Video[]> {
    let query = db.select().from(videos);
    
    // Filter by content type if specified
    if (contentType) {
      return db.select()
        .from(videos)
        .where(eq(videos.contentType, contentType))
        .orderBy(sql`RANDOM()`)
        .limit(limit);
    }
    
    // If no content type filter, use a simpler query
    return db.select()
      .from(videos)
      .orderBy(sql`RANDOM()`)
      .limit(limit);
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

  // Comment operations
  async addComment(comment: InsertComment): Promise<Comment> {
    const [result] = await db.insert(comments).values(comment).returning();
    return result;
  }
  
  async getCommentsByVideoId(videoId: number): Promise<Comment[]> {
    return db.select()
      .from(comments)
      .where(eq(comments.videoId, videoId))
      .orderBy(desc(comments.createdAt));
  }

  // End of implementation
}

export const storage = new DatabaseStorage();
