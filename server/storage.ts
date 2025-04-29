import { 
  users, categories, videos, wishlistItems, comments,
  type User, type InsertUser, 
  type Category, type InsertCategory,
  type Video, type InsertVideo,
  type WishlistItem, type InsertWishlistItem,
  type Comment, type InsertComment
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, sql } from "drizzle-orm";
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
  async getVideos(
    limit: number = 50, 
    contentType?: string, 
    categoryId?: number, 
    sortBy: 'newest' | 'oldest' | 'viewed' = 'newest'
  ): Promise<Video[]> {
    // Start with base query
    let queryBuilder = db.select().from(videos);
    
    // Add content type filter
    if (contentType) {
      queryBuilder = queryBuilder.where(eq(videos.contentType, contentType));
    }
    
    // Add category filter if specified (must be after the first where condition)
    if (categoryId && contentType) {
      queryBuilder = queryBuilder.where(eq(videos.categoryId, categoryId));
    } else if (categoryId) {
      queryBuilder = queryBuilder.where(eq(videos.categoryId, categoryId));
    }
    
    // Add ordering - always prioritize newest videos by ID first
    if (sortBy === 'newest') {
      // Order by ID desc ensures newest uploads appear first
      queryBuilder = queryBuilder.orderBy(desc(videos.id));
    } else if (sortBy === 'oldest') {
      queryBuilder = queryBuilder.orderBy(asc(videos.createdAt));
    } else if (sortBy === 'viewed') {
      // For "most viewed" we'll add a random order since we don't track actual views yet
      // In a real application, this would order by a viewCount column
      queryBuilder = queryBuilder.orderBy(sql`RANDOM()`);
    }
    
    // Log query info for debugging
    console.log(`Getting videos with sortBy: ${sortBy}, contentType: ${contentType || 'all'}`);
    
    // Add limit and execute
    const results = await queryBuilder.limit(limit);
    
    // Log result IDs for debugging
    if (results.length > 0) {
      console.log(`Retrieved ${results.length} videos. First few IDs:`, 
        results.slice(0, 3).map(v => v.id));
    }
    
    return results;
  }
  
  async getVideoById(id: number): Promise<Video | undefined> {
    const [video] = await db.select().from(videos).where(eq(videos.id, id));
    return video;
  }
  
  async getVideosByCategory(categoryId: number, contentType?: string, limit: number = 50): Promise<Video[]> {
    let builder = db.select().from(videos).where(eq(videos.categoryId, categoryId));
    
    if (contentType) {
      // Create a new query with both conditions
      builder = db.select()
        .from(videos)
        .where(and(
          eq(videos.categoryId, categoryId),
          eq(videos.contentType, contentType)
        ));
    }
    
    // Order by ID to get newest videos first
    const results = await builder.orderBy(desc(videos.id)).limit(limit);
    
    // Log for debugging
    if (results.length > 0) {
      console.log(`Category ${categoryId} videos (${contentType || 'all types'}): first few IDs:`, 
        results.slice(0, 3).map(v => v.id));
    }
    
    return results;
  }
  
  async getFeaturedVideos(limit: number = 10): Promise<Video[]> {
    // Featured videos could be based on criteria like number of purchases
    // For now, return newest videos
    const results = await db.select().from(videos).orderBy(desc(videos.id)).limit(limit);
    
    if (results.length > 0) {
      console.log(`Featured videos: first few IDs:`, results.slice(0, 3).map(v => v.id));
    }
    
    return results;
  }
  
  async getNewVideos(limit: number = 10): Promise<Video[]> {
    const results = await db.select()
      .from(videos)
      .orderBy(desc(videos.id))
      .limit(limit);
      
    if (results.length > 0) {
      console.log(`New videos: first few IDs:`, results.slice(0, 3).map(v => v.id));
    }
    
    return results;
  }
  
  async createVideo(video: InsertVideo): Promise<Video> {
    const [result] = await db.insert(videos).values(video).returning();
    console.log(`Created new video with ID: ${result.id}`, result.title);
    return result;
  }
  
  async getUserVideos(userId: number): Promise<Video[]> {
    // For now, we don't have a userId field in videos table
    // We'll get all videos for demo purposes
    // In a real implementation, this would filter by userId
    const results = await db.select()
      .from(videos)
      .orderBy(desc(videos.id));
      
    if (results.length > 0) {
      console.log(`User videos: first few IDs:`, results.slice(0, 3).map(v => v.id));
    }
    
    return results;
  }
  
  async deleteVideo(id: number): Promise<void> {
    await db.delete(videos).where(eq(videos.id, id));
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
