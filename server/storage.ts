import { 
  users, categories, videos, wishlistItems, comments, likes, messages,
  type User, type InsertUser, 
  type Category, type InsertCategory,
  type Video, type InsertVideo,
  type WishlistItem, type InsertWishlistItem,
  type Comment, type InsertComment,
  type Like, type InsertLike,
  type Message, type InsertMessage
} from "@shared/schema";
import { count } from "drizzle-orm";
import { db } from "./db";
import { eq, and, desc, asc, sql, or, ilike } from "drizzle-orm";
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
  updateUser(id: number, data: Partial<InsertUser> & { banned?: boolean }): Promise<User>;
  deleteUser(id: number): Promise<void>;
  getAllUsers(): Promise<User[]>;
  
  // Category operations
  getCategories(): Promise<Category[]>;
  getCategoryById(id: number): Promise<Category | undefined>;
  getCategoryBySlug(slug: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  
  // Video operations
  getVideos(limit?: number, contentType?: string, offset?: number, sortBy?: string): Promise<Video[]>;
  getVideoById(id: number): Promise<Video | undefined>;
  getVideosByCategory(categoryId: number, contentType?: string, limit?: number): Promise<Video[]>;
  getFeaturedVideos(limit?: number): Promise<Video[]>;
  getNewVideos(limit?: number): Promise<Video[]>;
  createVideo(video: InsertVideo): Promise<Video>;
  updateVideo(id: number, data: Partial<InsertVideo>): Promise<Video>;
  deleteVideo(id: number): Promise<void>;
  getUserVideos(userId: number): Promise<Video[]>;
  
  // Content review operations
  getPendingReviewContent(limit?: number): Promise<Video[]>;
  updateContentReviewStatus(contentId: number, status: 'approved' | 'rejected', reviewerId: number, rejectionReason?: string): Promise<Video>;
  
  // Search operations
  searchVideos(options: {
    query: string;
    categoryId?: number;
    contentType?: string;
    limit?: number;
    offset?: number;
  }): Promise<Video[]>;
  
  // Wishlist operations
  addToWishlist(item: InsertWishlistItem): Promise<WishlistItem>;
  removeFromWishlist(userId: number, videoId: number): Promise<void>;
  getUserWishlist(userId: number): Promise<WishlistItem[]>;
  isWishlisted(userId: number, videoId: number): Promise<boolean>;
  
  // Comment operations
  addComment(comment: InsertComment): Promise<Comment>;
  getCommentsByVideoId(videoId: number): Promise<Comment[]>;
  
  // Like operations
  addLike(like: InsertLike): Promise<Like>;
  removeLike(videoId: number, userId?: number, ipAddress?: string, sessionId?: string): Promise<void>;
  isLiked(videoId: number, userId?: number, ipAddress?: string, sessionId?: string): Promise<boolean>;
  getLikesByVideoId(videoId: number): Promise<Like[]>;
  getLikeCount(videoId: number): Promise<number>;
  
  // View tracking operations
  incrementViews(videoId: number): Promise<number>;
  getMostViewedVideos(limit?: number, contentType?: string): Promise<Video[]>;
  getTrendingVideos(limit?: number, contentType?: string): Promise<Video[]>;
  getPopularVideos(limit?: number, contentType?: string): Promise<Video[]>;
  
  // Messaging operations
  createMessage(message: InsertMessage): Promise<Message>;
  getConversation(userId1: number, userId2: number): Promise<Message[]>;
  markMessageAsRead(messageId: number): Promise<Message>;
  getUnreadMessageCount(userId: number): Promise<number>;
  
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
  
  async updateUser(id: number, data: Partial<InsertUser> & { banned?: boolean }): Promise<User> {
    const [user] = await db.update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return user;
  }
  
  // Get all users for admin purposes
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }
  
  async deleteUser(id: number): Promise<void> {
    // First delete related data
    // Delete wishlist items
    await db.delete(wishlistItems).where(eq(wishlistItems.userId, id));
    
    // Delete comments by this user (if they have a userId field)
    await db.delete(comments).where(eq(comments.userId, id));
    
    // Finally delete the user
    await db.delete(users).where(eq(users.id, id));
  }

  // Category operations
  async getCategories(): Promise<Category[]> {
    // Get categories from the database
    const allCategories = await db.select().from(categories);
    
    // Custom ordering with Parody (ID 16) after Entertainment (ID 3)
    return allCategories.sort((a, b) => {
      // If it's Entertainment (ID 3), it should come before Parody
      if (a.id === 3) return -1;
      if (b.id === 3) return 1;
      
      // If it's Parody (ID 16), it should come right after Entertainment
      if (a.id === 16 && b.id !== 3) return -1;
      if (b.id === 16 && a.id !== 3) return 1;
      
      // Natural ordering for other categories based on ID
      return a.id - b.id;
    });
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
    sortBy: 'newest' | 'oldest' | 'viewed' | 'most-viewed' | 'trending' | 'popular' = 'newest'
  ): Promise<Video[]> {
    // Handle special sort cases that require different query structures
    if (sortBy === 'popular') {
      return this.getPopularVideos(limit, contentType);
    }
    
    if (sortBy === 'trending') {
      return this.getTrendingVideos(limit, contentType);
    }
    
    if (sortBy === 'most-viewed') {
      return this.getMostViewedVideos(limit, contentType);
    }
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
    
    // Add ordering with YouTube-like algorithm
    if (sortBy === 'newest') {
      // Order by ID desc ensures newest uploads appear first
      queryBuilder = queryBuilder.orderBy(desc(videos.id));
    } else if (sortBy === 'oldest') {
      queryBuilder = queryBuilder.orderBy(asc(videos.createdAt));
    } else if (sortBy === 'viewed') {
      // YouTube-like algorithm that combines recency and engagement
      // This simulates YouTube's algorithm by combining:
      // 1. Recency - newer content gets higher priority
      // 2. Engagement - videos with engagement get better ranking (simulated here)
      // 3. Some randomness to ensure variety
      queryBuilder = queryBuilder.orderBy(
        sql`(EXTRACT(EPOCH FROM CURRENT_TIMESTAMP) - EXTRACT(EPOCH FROM ${videos.createdAt})) / 86400 * 0.7 + RANDOM() * 0.3`
      );
    } else {
      // Default sorting (YouTube-like "For You" feed)
      // Combination of recent uploads with some randomness for discovery
      queryBuilder = queryBuilder.orderBy(
        sql`CASE 
          WHEN (EXTRACT(EPOCH FROM CURRENT_TIMESTAMP) - EXTRACT(EPOCH FROM ${videos.createdAt})) < 604800 THEN 
            (RANDOM() * 0.3) + 0.7 
          ELSE 
            (RANDOM() * 0.7) + 0.3 
          END DESC, ${videos.id} DESC`
      );
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
    // Get videos uploaded by this user
    const results = await db.select()
      .from(videos)
      .where(eq(videos.userId, userId))
      .orderBy(desc(videos.id));
      
    if (results.length > 0) {
      console.log(`User videos: first few IDs:`, results.slice(0, 3).map(v => v.id));
    }
    
    return results;
  }
  
  async deleteVideo(id: number): Promise<void> {
    await db.delete(videos).where(eq(videos.id, id));
  }
  
  async updateVideo(id: number, data: Partial<InsertVideo>): Promise<Video> {
    const [updatedVideo] = await db.update(videos)
      .set(data)
      .where(eq(videos.id, id))
      .returning();
    return updatedVideo;
  }

  // Content review operations
  async getPendingReviewContent(limit: number = 50): Promise<Video[]> {
    return db.select()
      .from(videos)
      .where(eq(videos.reviewStatus, 'pending'))
      .orderBy(desc(videos.createdAt))
      .limit(limit);
  }

  async updateContentReviewStatus(
    contentId: number, 
    status: 'approved' | 'rejected', 
    reviewerId: number,
    rejectionReason?: string
  ): Promise<Video> {
    const [result] = await db.update(videos)
      .set({
        reviewStatus: status,
        reviewedAt: new Date(),
        reviewedBy: reviewerId,
        rejectionReason: status === 'rejected' ? rejectionReason : null,
      })
      .where(eq(videos.id, contentId))
      .returning();
    
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

  // Search operations
  async searchVideos(options: {
    query: string;
    categoryId?: number;
    contentType?: string;
    limit?: number;
    offset?: number;
  }): Promise<Video[]> {
    const { query, categoryId, contentType, limit = 20, offset = 0 } = options;
    
    // Start with base query
    let queryBuilder = db.select().from(videos);
    
    // Search in title and description with ILIKE for case-insensitive search
    queryBuilder = queryBuilder.where(
      or(
        ilike(videos.title, `%${query}%`),
        ilike(videos.description || '', `%${query}%`),
        ilike(videos.prompt || '', `%${query}%`)
      )
    );
    
    // Add content type filter if specified
    if (contentType) {
      queryBuilder = queryBuilder.where(eq(videos.contentType, contentType));
    }
    
    // Add category filter if specified
    if (categoryId) {
      queryBuilder = queryBuilder.where(eq(videos.categoryId, categoryId));
    }
    
    // Add ordering (newest first)
    queryBuilder = queryBuilder.orderBy(desc(videos.id));
    
    // Add pagination
    queryBuilder = queryBuilder.limit(limit).offset(offset);
    
    // Execute the query
    const results = await queryBuilder;
    
    // Log search results
    console.log(`Search for "${query}" found ${results.length} results`);
    
    return results;
  }

  // Like operations
  async addLike(like: InsertLike): Promise<Like> {
    try {
      // First check if this video is already liked by this user/IP/session
      const isAlreadyLiked = await this.isLiked(
        like.videoId, 
        like.userId, 
        like.ipAddress || undefined, 
        like.sessionId || undefined
      );
      
      if (isAlreadyLiked) {
        throw new Error('Video already liked');
      }
      
      // If not, add the like
      const [result] = await db.insert(likes).values(like).returning();
      return result;
    } catch (error) {
      console.error('Error adding like:', error);
      throw error;
    }
  }
  
  async removeLike(videoId: number, userId?: number, ipAddress?: string, sessionId?: string): Promise<void> {
    try {
      // Build query conditions based on available identifiers
      const conditions = [eq(likes.videoId, videoId)];
      
      if (userId) {
        conditions.push(eq(likes.userId, userId));
      } else if (ipAddress && sessionId) {
        conditions.push(eq(likes.ipAddress, ipAddress));
        conditions.push(eq(likes.sessionId, sessionId));
      } else {
        throw new Error('Must provide either userId or both ipAddress and sessionId');
      }
      
      await db.delete(likes).where(and(...conditions));
    } catch (error) {
      console.error('Error removing like:', error);
      throw error;
    }
  }
  
  async isLiked(videoId: number, userId?: number, ipAddress?: string, sessionId?: string): Promise<boolean> {
    try {
      // Build query conditions based on available identifiers
      const conditions = [eq(likes.videoId, videoId)];
      
      if (userId) {
        conditions.push(eq(likes.userId, userId));
      } else if (ipAddress && sessionId) {
        conditions.push(eq(likes.ipAddress, ipAddress));
        conditions.push(eq(likes.sessionId, sessionId));
      } else {
        // If no identifiers provided, cannot check for likes
        return false;
      }
      
      const [like] = await db.select().from(likes).where(and(...conditions));
      return !!like;
    } catch (error) {
      console.error('Error checking like status:', error);
      return false;
    }
  }
  
  async getLikesByVideoId(videoId: number): Promise<Like[]> {
    try {
      return await db.select().from(likes).where(eq(likes.videoId, videoId));
    } catch (error) {
      console.error('Error getting likes for video:', error);
      return [];
    }
  }
  
  async getLikeCount(videoId: number): Promise<number> {
    try {
      const result = await db.select({ count: count() }).from(likes).where(eq(likes.videoId, videoId));
      return result[0].count;
    } catch (error) {
      console.error('Error getting like count:', error);
      return 0;
    }
  }
  
  // View tracking operations
  async incrementViews(videoId: number): Promise<number> {
    try {
      // Increment views and return the new view count
      const [updatedVideo] = await db.update(videos)
        .set({ views: sql`${videos.views} + 1` })
        .where(eq(videos.id, videoId))
        .returning({ views: videos.views });
      
      console.log(`Incremented views for video ${videoId} to ${updatedVideo.views}`);
      return updatedVideo.views;
    } catch (error) {
      console.error('Error incrementing views:', error);
      return 0;
    }
  }
  
  async getMostViewedVideos(limit: number = 20, contentType?: string): Promise<Video[]> {
    try {
      // Start with base query
      let queryBuilder = db.select().from(videos);
      
      // Add content type filter if specified
      if (contentType) {
        queryBuilder = queryBuilder.where(eq(videos.contentType, contentType));
      }
      
      // Order by views count descending
      queryBuilder = queryBuilder.orderBy(desc(videos.views));
      
      // Add limit
      const results = await queryBuilder.limit(limit);
      console.log(`Retrieved ${results.length} most viewed videos. First few IDs:`, 
        results.length > 0 ? results.slice(0, 3).map(v => v.id) : 'none');
        
      return results;
    } catch (error) {
      console.error('Error getting most viewed videos:', error);
      return [];
    }
  }
  
  async getTrendingVideos(limit: number = 20, contentType?: string): Promise<Video[]> {
    try {
      // Start with base query
      let queryBuilder = db.select().from(videos);
      
      // Add content type filter if specified
      if (contentType) {
        queryBuilder = queryBuilder.where(eq(videos.contentType, contentType));
      }
      
      // Order by a combination of views and recency (trending algorithm)
      // This algorithm prioritizes videos that are newer and have more views
      queryBuilder = queryBuilder.orderBy(
        sql`(${videos.views} * 0.6) + ((EXTRACT(EPOCH FROM CURRENT_TIMESTAMP) - EXTRACT(EPOCH FROM ${videos.createdAt})) / 86400) * 0.4 DESC`
      );
      
      // Add limit
      const results = await queryBuilder.limit(limit);
      console.log(`Retrieved ${results.length} trending videos. First few IDs:`, 
        results.length > 0 ? results.slice(0, 3).map(v => v.id) : 'none');
        
      return results;
    } catch (error) {
      console.error('Error getting trending videos:', error);
      return [];
    }
  }
  
  async getPopularVideos(limit: number = 20, contentType?: string): Promise<Video[]> {
    try {
      // Start with base query to count likes
      let queryBuilder = db
        .select({
          videoId: videos.id,
          title: videos.title,
          video: videos,
          likeCount: sql<number>`COUNT(${likes.id})`
        })
        .from(videos)
        .leftJoin(likes, eq(videos.id, likes.videoId));
      
      // Add content type filter if specified
      if (contentType) {
        queryBuilder = queryBuilder.where(eq(videos.contentType, contentType));
      }
      
      // Group by video ID and order by like count descending
      queryBuilder = queryBuilder
        .groupBy(videos.id)
        .orderBy(desc(sql<number>`COUNT(${likes.id})`));
      
      // Add limit
      const results = await queryBuilder.limit(limit);
      
      // Map the results to Video objects
      const popularVideos = results.map(result => result.video);
      
      console.log(`Retrieved ${popularVideos.length} popular videos. First few IDs:`, 
        popularVideos.length > 0 ? popularVideos.slice(0, 3).map(v => v.id) : 'none');
        
      return popularVideos;
    } catch (error) {
      console.error('Error getting popular videos:', error);
      return [];
    }
  }
  
  // Messaging operations
  async createMessage(message: InsertMessage): Promise<Message> {
    const [result] = await db.insert(messages).values(message).returning();
    return result;
  }
  
  async getConversation(userId1: number, userId2: number): Promise<Message[]> {
    // Get messages where these two users are sender and receiver (in either direction)
    return db.select()
      .from(messages)
      .where(
        or(
          and(
            eq(messages.senderId, userId1),
            eq(messages.receiverId, userId2)
          ),
          and(
            eq(messages.senderId, userId2),
            eq(messages.receiverId, userId1)
          )
        )
      )
      .orderBy(asc(messages.createdAt));
  }
  
  async markMessageAsRead(messageId: number): Promise<Message> {
    const [result] = await db.update(messages)
      .set({ read: true })
      .where(eq(messages.id, messageId))
      .returning();
    return result;
  }
  
  async getUnreadMessageCount(userId: number): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(messages)
      .where(
        and(
          eq(messages.receiverId, userId),
          eq(messages.read, false)
        )
      );
    return result?.count || 0;
  }
}

export const storage = new DatabaseStorage();
