import { 
  users, categories, videos, wishlistItems, comments, likes, messages, reports, blockedUsers,
  type User, type InsertUser, 
  type Category, type InsertCategory,
  type Video, type InsertVideo,
  type WishlistItem, type InsertWishlistItem,
  type Comment, type InsertComment,
  type Like, type InsertLike,
  type Message, type InsertMessage,
  type Report, type InsertReport,
  type BlockedUser, type InsertBlockedUser
} from "@shared/schema";
import { count } from "drizzle-orm";
import { db } from "./db";
import { eq, and, desc, asc, sql, or, ilike, gt, like } from "drizzle-orm";
import session from "express-session";
import type { Store as SessionStore } from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

// Convert in-memory storage to database storage
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<InsertUser> & { banned?: boolean, resetToken?: string, resetTokenExpires?: Date }): Promise<User>;
  deleteUser(id: number): Promise<void>;
  getAllUsers(): Promise<User[]>;
  setPasswordResetToken(email: string, token: string, expiry: Date): Promise<User | undefined>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  resetPassword(userId: number, newPassword: string): Promise<User | undefined>;
  
  // User blocking operations
  blockUser(userId: number, blockedUserId: number): Promise<BlockedUser>;
  unblockUser(userId: number, blockedUserId: number): Promise<void>;
  getBlockedUsers(userId: number): Promise<BlockedUser[]>;
  isUserBlocked(userId: number, blockedUserId: number): Promise<boolean>;
  
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
  getMostViewedVideos(limit?: number, contentType?: string, categoryId?: number): Promise<Video[]>;
  getTrendingVideos(limit?: number, contentType?: string, shuffleSeed?: string, categoryId?: number): Promise<Video[]>;
  getPopularVideos(limit?: number, contentType?: string, shuffleSeed?: string, categoryId?: number): Promise<Video[]>;
  
  // Messaging operations
  createMessage(message: InsertMessage): Promise<Message>;
  getConversation(userId1: number, userId2: number): Promise<Message[]>;
  markMessageAsRead(messageId: number): Promise<Message>;
  getUnreadMessageCount(userId: number): Promise<number>;
  getAllUserMessages(userId: number): Promise<Message[]>;
  markAllMessagesAsRead(receiverId: number, senderId: number): Promise<void>;
  deleteConversation(userId: number, otherUserId: number): Promise<void>;
  
  // Report operations
  createReport(report: InsertReport): Promise<Report>;
  getReportById(id: number): Promise<Report | undefined>;
  getReportsByVideoId(videoId: number): Promise<Report[]>;
  getPendingReports(limit?: number): Promise<Report[]>;
  updateReportStatus(id: number, status: 'pending' | 'reviewed' | 'ignored', resolvedBy?: number): Promise<Report>;
  
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
  
  async updateUser(id: number, data: Partial<InsertUser> & { banned?: boolean, resetToken?: string, resetTokenExpires?: Date }): Promise<User> {
    const [user] = await db.update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return user;
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  
  async setPasswordResetToken(email: string, token: string, expiry: Date): Promise<User | undefined> {
    // First find the user by email
    const user = await this.getUserByEmail(email);
    if (!user) return undefined;
    
    // Update the user with the reset token
    const updatedUser = await this.updateUser(user.id, {
      resetToken: token,
      resetTokenExpires: expiry
    });
    
    return updatedUser;
  }
  
  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users)
      .where(and(
        eq(users.resetToken, token),
        gt(users.resetTokenExpires as any, new Date()) // Cast needed due to type issue
      ));
    return user;
  }
  
  async resetPassword(userId: number, newPassword: string): Promise<User | undefined> {
    const updatedUser = await this.updateUser(userId, {
      password: newPassword,
      resetToken: null as any, // Clear the reset token
      resetTokenExpires: null as any // Clear the expiry date
    });
    
    return updatedUser;
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
    sortBy: 'newest' | 'oldest' | 'viewed' | 'most-viewed' | 'trending' | 'popular' = 'newest',
    shuffleSeed?: string,
    offset: number = 0
  ): Promise<Video[]> {
    console.log(`getVideos called with contentType=${contentType || 'undefined'}, limit=${limit}, sortBy=${sortBy}`);
    
    // Use the simplified and consistent getContentByType method for all queries
    // This provides a more efficient and consistent shuffle functionality
    return this.getContentByType(categoryId, contentType, limit, sortBy, shuffleSeed, offset);
  }
  
  async getVideoById(id: number, skipVisibilityCheck: boolean = false): Promise<Video | undefined> {
    // If skipVisibilityCheck is true, return the video regardless of review status
    // This is used for admin operations where we need to see pending content
    
    if (skipVisibilityCheck) {
      const [video] = await db.select()
        .from(videos)
        .where(eq(videos.id, id));
      return video;
    }
    
    // Otherwise get video by ID with visibility filtering
    const [video] = await db.select()
      .from(videos)
      .where(
        and(
          eq(videos.id, id),
          or(
            eq(videos.reviewStatus, 'approved'),
            and(
              eq(videos.contentType, 'embed'),
              like(videos.embedCode || '', '%youtube%')
            )
          )
        )
      );
    return video;
  }
  
  async getVideosByCategory(categoryId: number, contentType?: string, limit: number = 50): Promise<Video[]> {
    // Start with base query
    let builder = db.select().from(videos);
    
    // Start with all filter conditions
    let conditions = [];
    
    // Always add category filter
    conditions.push(eq(videos.categoryId, categoryId));
    
    // Add content type filter if specified
    if (contentType) {
      console.log(`Filtering by category=${categoryId} and contentType="${contentType}"`);
      conditions.push(eq(videos.contentType, contentType));
    }
    
    // Add visibility filter - only show approved content or YouTube embeds
    conditions.push(
      or(
        eq(videos.reviewStatus, 'approved'),
        and(
          eq(videos.contentType, 'embed'),
          like(videos.embedCode || '', '%youtube%')
        )
      )
    );
    
    // Apply all conditions with AND
    if (conditions.length > 0) {
      builder = builder.where(and(...conditions));
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
    // Get videos where featured is true, ordered by newest first
    // Note: We deliberately don't filter by review status for featured videos
    // since these are explicitly chosen by admins and should be displayed
    // regardless of their review status
    const results = await db.select()
      .from(videos)
      .where(eq(videos.featured, true))
      .orderBy(desc(videos.id))
      .limit(limit);
    
    if (results.length > 0) {
      console.log(`Featured videos found: ${results.length}, first few IDs:`, results.slice(0, 3).map(v => v.id));
    } else {
      console.log('No featured videos found in database, falling back to newest videos');
      // Fallback to newest videos if no featured videos exist
      return await this.getNewVideos(limit);
    }
    
    return results;
  }
  
  async getNewVideos(limit: number = 10): Promise<Video[]> {
    // Add visibility filter to ensure only approved content or YouTube embeds are shown
    const results = await db.select()
      .from(videos)
      .where(
        or(
          eq(videos.reviewStatus, 'approved'),
          and(
            eq(videos.contentType, 'embed'),
            like(videos.embedCode || '', '%youtube%')
          )
        )
      )
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
    // Get videos uploaded by this user with visibility filter
    const results = await db.select()
      .from(videos)
      .where(
        and(
          eq(videos.userId, userId),
          or(
            eq(videos.reviewStatus, 'approved'),
            and(
              eq(videos.contentType, 'embed'),
              like(videos.embedCode || '', '%youtube%')
            )
          )
        )
      )
      .orderBy(desc(videos.id));
      
    if (results.length > 0) {
      console.log(`User videos: first few IDs:`, results.slice(0, 3).map(v => v.id));
    }
    
    return results;
  }
  
  async deleteVideo(id: number): Promise<void> {
    console.log(`Starting deletion of video with ID: ${id}`);
    
    try {
      // First, delete all related wishlist items (no cascade)
      await db.delete(wishlistItems)
        .where(eq(wishlistItems.videoId, id));
      console.log(`Deleted wishlist items for video ID: ${id}`);
      
      // The following have cascade delete in schema, but we'll explicitly delete to be safe
      // Delete related comments
      await db.delete(comments)
        .where(eq(comments.videoId, id));
      console.log(`Deleted comments for video ID: ${id}`);
      
      // Delete related likes
      await db.delete(likes)
        .where(eq(likes.videoId, id));
      console.log(`Deleted likes for video ID: ${id}`);
      
      // Delete related reports
      await db.delete(reports)
        .where(eq(reports.videoId, id));
      console.log(`Deleted reports for video ID: ${id}`);
      
      // Finally delete the video itself
      const result = await db.delete(videos)
        .where(eq(videos.id, id));
      
      console.log(`Successfully deleted video with ID: ${id}`);
    } catch (error) {
      console.error(`Error deleting video with ID: ${id}:`, error);
      throw error;
    }
  }
  
  async updateVideo(id: number, data: Partial<InsertVideo>): Promise<Video> {
    const [updatedVideo] = await db.update(videos)
      .set(data)
      .where(eq(videos.id, id))
      .returning();
    return updatedVideo;
  }

  // Content review operations
  async getPendingReviewContent(limit: number = 50): Promise<(Video & { uploaderName?: string })[]> {
    // Join with users table to get the uploader's username
    return db.select({
      id: videos.id,
      createdAt: videos.createdAt,
      userId: videos.userId,
      title: videos.title,
      description: videos.description,
      aiGenerator: videos.aiGenerator,
      prompt: videos.prompt,
      thumbnail: videos.thumbnail,
      videoUrl: videos.videoUrl,
      imageUrl: videos.imageUrl,
      embedCode: videos.embedCode,
      contentType: videos.contentType,
      categoryId: videos.categoryId,
      views: videos.views,
      featured: videos.featured,
      reviewStatus: videos.reviewStatus,
      preview: videos.preview,
      videoLength: videos.videoLength,
      youtubeId: videos.youtubeId,
      vimeoId: videos.vimeoId,
      reviewedAt: videos.reviewedAt,
      reviewedBy: videos.reviewedBy,
      rejectionReason: videos.rejectionReason,
      uploaderName: users.username
    })
      .from(videos)
      .leftJoin(users, eq(videos.userId, users.id))
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
    // Join with videos table to get only approved content or YouTube embeds
    return db.select({
        wishlistItem: wishlistItems
      })
      .from(wishlistItems)
      .innerJoin(videos, eq(wishlistItems.videoId, videos.id))
      .where(
        and(
          eq(wishlistItems.userId, userId),
          or(
            eq(videos.reviewStatus, 'approved'),
            and(
              eq(videos.contentType, 'embed'),
              like(videos.embedCode || '', '%youtube%')
            )
          )
        )
      )
      .orderBy(desc(wishlistItems.addedAt))
      .then(results => results.map(r => r.wishlistItem));
  }
  
  async isWishlisted(userId: number, videoId: number): Promise<boolean> {
    // Join with videos table to apply visibility filtering
    const [result] = await db.select()
      .from(wishlistItems)
      .innerJoin(videos, eq(wishlistItems.videoId, videos.id))
      .where(
        and(
          eq(wishlistItems.userId, userId),
          eq(wishlistItems.videoId, videoId),
          or(
            eq(videos.reviewStatus, 'approved'),
            and(
              eq(videos.contentType, 'embed'),
              like(videos.embedCode || '', '%youtube%')
            )
          )
        )
      );
    return !!result;
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
    
    if (!query || query.trim() === '') {
      console.log('Empty search query provided');
      return [];
    }
    
    // Improved query preprocessing for better search results
    const preprocessedQuery = query.trim()
      // Replace multiple spaces with a single space
      .replace(/\s+/g, ' ')
      // Convert to lowercase to improve matching
      .toLowerCase();
    
    console.log(`Original search query: "${query}"`);
    console.log(`Preprocessed search query: "${preprocessedQuery}"`);
    
    // Split the query into individual terms for better word-by-word searching
    const searchTerms = preprocessedQuery.split(' ').filter(Boolean);
    
    // Escape the % and _ characters which have special meaning in LIKE/ILIKE patterns
    const escapedTerms = searchTerms.map(term => 
      term.replace(/%/g, '\\%').replace(/_/g, '\\_')
    );
    
    console.log(`Search using terms: [${escapedTerms.join(', ')}]`);
    
    if (escapedTerms.length === 0) {
      console.log('No valid search terms found after processing');
      return [];
    }
    
    // Start with base query
    let queryBuilder = db.select().from(videos);
    
    // Build the search conditions
    const searchConditions = [];
    
    // For each individual search term, create a more comprehensive OR condition
    // that checks if the term exists in any searchable field
    for (const term of escapedTerms) {
      // Create more comprehensive search conditions for each term
      searchConditions.push(
        or(
          // Match word at the beginning
          ilike(videos.title, `${term}%`),
          // Match word in the middle (with spaces)
          ilike(videos.title, `% ${term}%`),
          // Match as part of a word
          ilike(videos.title, `%${term}%`),
          
          // Same pattern for description
          ilike(videos.description || '', `${term}%`),
          ilike(videos.description || '', `% ${term}%`),
          ilike(videos.description || '', `%${term}%`),
          
          // Same pattern for prompt
          ilike(videos.prompt || '', `${term}%`),
          ilike(videos.prompt || '', `% ${term}%`),
          ilike(videos.prompt || '', `%${term}%`),
          
          // Same pattern for aiGenerator
          ilike(videos.aiGenerator || '', `${term}%`),
          ilike(videos.aiGenerator || '', `% ${term}%`),
          ilike(videos.aiGenerator || '', `%${term}%`)
        )
      );
    }
    
    // Additionally, search for the exact full query to catch exact phrases
    const fullQueryEscaped = preprocessedQuery.replace(/%/g, '\\%').replace(/_/g, '\\_');
    searchConditions.push(
      or(
        ilike(videos.title, `%${fullQueryEscaped}%`),
        ilike(videos.description || '', `%${fullQueryEscaped}%`),
        ilike(videos.prompt || '', `%${fullQueryEscaped}%`),
        ilike(videos.aiGenerator || '', `%${fullQueryEscaped}%`)
      )
    );
    
    // Start building ALL the filters we want to apply with AND
    const allFilters = [];
    
    // Add the combined search term conditions with OR - at least one must match
    allFilters.push(or(...searchConditions));
    
    // Add content type filter if specified
    if (contentType && contentType !== 'all') {
      allFilters.push(eq(videos.contentType, contentType));
      console.log(`Filtering search by contentType: "${contentType}"`);
    }
    
    // Add category filter if specified
    if (categoryId) {
      allFilters.push(eq(videos.categoryId, categoryId));
      console.log(`Filtering search by categoryId: ${categoryId}`);
    }
    
    // Add review status filter - only show approved content or YouTube embeds in search results
    allFilters.push(
      or(
        eq(videos.reviewStatus, 'approved'),
        and(
          eq(videos.contentType, 'embed'),
          like(videos.embedCode || '', '%youtube%')
        )
      )
    );
    
    // Apply the filters in a type-safe way
    const filteredQuery = queryBuilder.where(and(...allFilters));
    
    // Order by relevance using a conditional sort expression
    const relevanceSortSql = sql`CASE WHEN ${videos.title} ILIKE ${`%${fullQueryEscaped}%`} THEN 1 ELSE 0 END DESC`;
    
    // Use a type-safe approach to build the query
    const orderedQuery = filteredQuery.orderBy(relevanceSortSql, desc(videos.id));
    
    // Apply pagination in a type-safe way
    const paginatedQuery = orderedQuery.limit(limit).offset(offset);
    
    try {
      // Execute the query with proper variable names
      const results = await paginatedQuery;
      
      // Log search results
      console.log(`Search for "${query}" found ${results.length} results after preprocessing`);
      
      return results;
    } catch (error) {
      console.error('Error in search query execution:', error);
      // Return an empty array instead of throwing
      return [];
    }
  }

  // Like operations
  async addLike(like: InsertLike): Promise<Like> {
    try {
      // First check if this video is already liked by this user/IP/session
      const isAlreadyLiked = await this.isLiked(
        like.videoId, 
        like.userId as number | undefined | null, 
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
  
  async isLiked(videoId: number, userId?: number | null, ipAddress?: string, sessionId?: string): Promise<boolean> {
    try {
      // Build query conditions based on available identifiers
      const conditions = [eq(likes.videoId, videoId)];
      
      // Handle both undefined and null for userId
      if (userId !== undefined && userId !== null) {
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
  
  async getMostViewedVideos(limit: number = 20, contentType?: string, categoryId?: number): Promise<Video[]> {
    try {
      // Start with base query
      let queryBuilder = db.select().from(videos);
      
      // Create an array of filter conditions to apply with AND
      const conditions = [];
      
      // Add content type filter if specified
      if (contentType) {
        conditions.push(eq(videos.contentType, contentType));
        console.log(`Filtering most viewed by contentType: "${contentType}"`);
      }
      
      // Add category filter if specified
      if (categoryId) {
        conditions.push(eq(videos.categoryId, categoryId));
        console.log(`Filtering most viewed by categoryId: ${categoryId}`);
      }
      
      // Add visibility filter - only show approved content or YouTube embeds
      conditions.push(
        or(
          eq(videos.reviewStatus, 'approved'),
          and(
            eq(videos.contentType, 'embed'),
            like(videos.embedCode || '', '%youtube%')
          )
        )
      );
      
      // Apply all conditions with AND
      if (conditions.length > 0) {
        queryBuilder = queryBuilder.where(and(...conditions));
      }
      
      // Order by views count descending
      queryBuilder = queryBuilder.orderBy(desc(videos.views));
      
      // Add limit
      const results = await queryBuilder.limit(limit);
      console.log(`Retrieved ${results.length} most viewed videos with category ${categoryId || 'none'}. First few IDs:`, 
        results.length > 0 ? results.slice(0, 3).map(v => v.id) : 'none');
        
      return results;
    } catch (error) {
      console.error('Error getting most viewed videos:', error);
      return [];
    }
  }
  
  /**
   * Get content by type with simplified shuffling 
   * This method replaces the complex shuffling with a single, consistent approach
   * @param categoryId Optional category ID filter
   * @param contentType Content type filter (video, image, embed)
   * @param limit Max number of items to return
   * @param sortBy Sort method
   * @param shuffleSeed Optional seed for deterministic shuffling
   * @param offset Optional offset for pagination
   * @returns Array of content items
   */
  async getContentByType(
    categoryId?: number,
    contentType?: string,
    limit: number = 20,
    sortBy: string = 'trending',
    shuffleSeed?: string | null,
    offset: number = 0
  ): Promise<Video[]> {
    try {
      // Start with all video filters
      let conditions = [];
      
      // Add content type filter
      if (contentType) {
        conditions.push(eq(videos.contentType, contentType));
      }
      
      // Add category filter if specified
      if (categoryId) {
        conditions.push(eq(videos.categoryId, categoryId));
      }
      
      // Only show approved content or YouTube embeds
      conditions.push(
        or(
          eq(videos.reviewStatus, 'approved'),
          and(
            eq(videos.contentType, 'embed'),
            like(videos.embedCode || '', '%youtube%')
          )
        )
      );
      
      // Create base query with conditions
      let query = db.select().from(videos).where(and(...conditions));
      
      // Apply ordering based on sortBy parameter
      if (shuffleSeed) {
        // When using shuffle, use a simple, consistent approach for all content types
        // This creates a deterministic random order based on the seed
        // We convert the seed to a numeric value for SQL operations
        const seedValue = shuffleSeed
          .split('')
          .reduce((acc, char) => acc + char.charCodeAt(0), 0) % 999;

        // Featured content should always appear first regardless of shuffle
        query = query.orderBy(
          sql`CASE WHEN ${videos.featured} THEN 0 ELSE 1 END ASC, 
              (${videos.id} * ${seedValue}) % 997`
        );
      } else {
        // Normal sorting without shuffle
        switch(sortBy) {
          case 'newest':
            query = query.orderBy(desc(videos.id));
            break;
          case 'oldest':
            query = query.orderBy(asc(videos.id));
            break;
          case 'most-viewed':
            query = query.orderBy(desc(videos.views));
            break;
          case 'trending':
          default:
            // Get like counts through a subquery for trending algorithm
            query = query.orderBy(
              sql`CASE WHEN ${videos.featured} THEN 0 ELSE 1 END ASC,
                  CASE
                    WHEN EXTRACT(EPOCH FROM CURRENT_TIMESTAMP) - EXTRACT(EPOCH FROM ${videos.createdAt}) < 2592000 THEN 
                      (${videos.views} * 0.6) + ((SELECT COUNT(*) FROM ${likes} WHERE ${likes.videoId} = ${videos.id}) * 0.4) + 1000
                    ELSE
                      (${videos.views} * 0.6) + ((SELECT COUNT(*) FROM ${likes} WHERE ${likes.videoId} = ${videos.id}) * 0.4)
                  END DESC`
            );
        }
      }
      
      // Apply pagination
      query = query.limit(limit).offset(offset);
      
      const results = await query;
      return results;
    } catch (error) {
      console.error('Error getting content by type:', error);
      return [];
    }
  }

  async getTrendingVideos(limit: number = 20, contentType?: string, shuffleSeed?: string, categoryId?: number): Promise<Video[]> {
    // For backward compatibility, redirect to the new simplified method
    return this.getContentByType(categoryId, contentType, limit, 'trending', shuffleSeed);
  }
  
  async getPopularVideos(limit: number = 20, contentType?: string, shuffleSeed?: string, categoryId?: number): Promise<Video[]> {
    // For backward compatibility, redirect to the new simplified method
    // For popular content, we use the same getContentByType but with 'most-viewed' as sortBy
    // This maintains the same behavior but with a simpler implementation
    return this.getContentByType(categoryId, contentType, limit, 'most-viewed', shuffleSeed);
  }
  
  // User blocking operations
  async blockUser(userId: number, blockedUserId: number): Promise<BlockedUser> {
    try {
      const [result] = await db.insert(blockedUsers)
        .values({ userId, blockedUserId })
        .returning();
      return result;
    } catch (error) {
      console.error(`Error blocking user ${blockedUserId} by user ${userId}:`, error);
      throw error;
    }
  }
  
  async unblockUser(userId: number, blockedUserId: number): Promise<void> {
    await db.delete(blockedUsers)
      .where(
        and(
          eq(blockedUsers.userId, userId),
          eq(blockedUsers.blockedUserId, blockedUserId)
        )
      );
  }
  
  async getBlockedUsers(userId: number): Promise<BlockedUser[]> {
    return db.select()
      .from(blockedUsers)
      .where(eq(blockedUsers.userId, userId));
  }
  
  async isUserBlocked(userId: number, blockedUserId: number): Promise<boolean> {
    const [result] = await db.select({ count: count() })
      .from(blockedUsers)
      .where(
        and(
          eq(blockedUsers.userId, userId),
          eq(blockedUsers.blockedUserId, blockedUserId)
        )
      );
    return result.count > 0;
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
  
  async deleteConversation(userId: number, otherUserId: number): Promise<void> {
    try {
      // Delete all messages between these two users
      await db.delete(messages)
        .where(
          or(
            and(
              eq(messages.senderId, userId),
              eq(messages.receiverId, otherUserId)
            ),
            and(
              eq(messages.senderId, otherUserId),
              eq(messages.receiverId, userId)
            )
          )
        );
        
      console.log(`Deleted conversation between user ${userId} and user ${otherUserId}`);
    } catch (error) {
      console.error(`Error deleting conversation between user ${userId} and user ${otherUserId}:`, error);
      throw error;
    }
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
  
  async getAllUserMessages(userId: number): Promise<Message[]> {
    console.log(`Getting all messages for user ${userId}`);
    try {
      // Get all messages that involve this user (sent or received)
      const result = await db.select()
        .from(messages)
        .where(or(
          eq(messages.senderId, userId),
          eq(messages.receiverId, userId)
        ))
        .orderBy(desc(messages.createdAt));
      
      console.log(`Found ${result.length} messages for user ${userId}`);
      return result;
    } catch (error) {
      console.error(`Error getting messages for user ${userId}:`, error);
      if (error instanceof Error) {
        console.error(`Error stack:`, error.stack);
      }
      return [];
    }
  }
  
  async markAllMessagesAsRead(receiverId: number, senderId: number): Promise<void> {
    // Mark all unread messages from sender to receiver as read
    await db.update(messages)
      .set({ read: true })
      .where(and(
        eq(messages.receiverId, receiverId),
        eq(messages.senderId, senderId),
        eq(messages.read, false)
      ));
  }
  
  // Report operations
  async createReport(report: InsertReport): Promise<Report> {
    const [result] = await db.insert(reports).values(report).returning();
    return result;
  }
  
  async getReportById(id: number): Promise<Report | undefined> {
    const [report] = await db.select().from(reports).where(eq(reports.id, id));
    return report;
  }
  
  async getReportsByVideoId(videoId: number): Promise<Report[]> {
    return db.select().from(reports).where(eq(reports.videoId, videoId));
  }
  
  async getPendingReports(limit: number = 50): Promise<Report[]> {
    return db.select()
      .from(reports)
      .where(eq(reports.status, 'pending'))
      .orderBy(desc(reports.createdAt))
      .limit(limit);
  }
  
  async updateReportStatus(id: number, status: 'pending' | 'reviewed' | 'ignored', resolvedBy?: number): Promise<Report> {
    const [result] = await db.update(reports)
      .set({
        status,
        resolvedAt: status !== 'pending' ? new Date() : undefined,
        resolvedBy: status !== 'pending' ? resolvedBy : undefined,
      })
      .where(eq(reports.id, id))
      .returning();
    
    return result;
  }
}

export const storage = new DatabaseStorage();
