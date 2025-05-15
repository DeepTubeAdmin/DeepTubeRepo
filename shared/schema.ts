import { pgTable, text, serial, integer, real, timestamp, boolean, primaryKey, varchar, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull(), // Email is now required
  dateOfBirth: timestamp("date_of_birth"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  banned: boolean("banned").default(false),
  isAdmin: boolean("is_admin").default(false),
  resetToken: text("reset_token"),
  resetTokenExpires: timestamp("reset_token_expires"),
});

export const usersRelations = relations(users, ({ many }) => ({
  wishlist: many(wishlistItems),
}));

// Categories table
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  icon: text("icon").notNull().default(''),
  image: text("image"),
});

export const categoriesRelations = relations(categories, ({ many }) => ({
  videos: many(videos),
}));

// Videos and Images table (renamed in code but keeping same table name for DB compatibility)
export const videos = pgTable("videos", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  aiGenerator: text("ai_generator"),
  prompt: text("prompt"),
  thumbnail: text("thumbnail").notNull(),
  videoUrl: text("video_url"),
  imageUrl: text("image_url"),
  embedCode: text("embed_code"),
  preview: text("preview"),
  contentType: text("content_type").notNull().default("video"), // "video", "image", or "embed"
  resolution: varchar("resolution", { enum: ["HD", "4K"] }).notNull().default("HD"),
  duration: integer("duration").default(0), // in seconds, with default to avoid null issues
  categoryId: integer("category_id").references(() => categories.id),
  vimeoId: text("vimeo_id"), // Store Vimeo video ID
  userId: integer("user_id").references(() => users.id), // Added userId for tracking ownership
  createdAt: timestamp("created_at").defaultNow().notNull(),
  credits: integer("credits").notNull().default(0), // Number of credits required to purchase
  views: integer("views").notNull().default(0), // Track number of views
  featured: boolean("featured").default(false).notNull(), // Marks video as featured for display in Featured Videos section
  reviewStatus: varchar("review_status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  rejectionReason: text("rejection_reason"),
  perceptualHashes: jsonb("perceptual_hashes"), // Store perceptual hashes for duplicate detection
});

export const videosRelations = relations(videos, ({ one, many }) => ({
  category: one(categories, {
    fields: [videos.categoryId],
    references: [categories.id],
  }),
  user: one(users, {
    fields: [videos.userId],
    references: [users.id],
  }),
  reviewer: one(users, {
    fields: [videos.reviewedBy],
    references: [users.id],
  }),
  wishlistItems: many(wishlistItems),
  likes: many(likes),
  comments: many(comments),
}));

// Wishlist table
export const wishlistItems = pgTable("wishlist_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  videoId: integer("video_id").references(() => videos.id),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

export const wishlistItemsRelations = relations(wishlistItems, ({ one }) => ({
  user: one(users, {
    fields: [wishlistItems.userId],
    references: [users.id],
  }),
  video: one(videos, {
    fields: [wishlistItems.videoId],
    references: [videos.id],
  }),
}));

// Comments table for videos/images
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  videoId: integer("video_id").references(() => videos.id, { onDelete: "cascade" }).notNull(),
  username: text("username").notNull(), // Can be anonymous
  userId: integer("user_id").references(() => users.id), // Optional for anonymous users
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const commentsRelations = relations(comments, ({ one }) => ({
  video: one(videos, {
    fields: [comments.videoId],
    references: [videos.id],
  }),
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
}));

// Likes table for videos/images (supports both anonymous and logged-in users)
export const likes = pgTable("likes", {
  id: serial("id").primaryKey(),
  videoId: integer("video_id").references(() => videos.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id), // Optional for anonymous users
  ipAddress: text("ip_address"), // To track anonymous likes by IP
  sessionId: text("session_id"), // Alternative to IP for tracking anonymous users
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Create a unique constraint to prevent duplicate likes
export const likesConstraint = pgTable("likes_constraint", {
  videoId: integer("video_id").references(() => videos.id).notNull(),
  userId: integer("user_id").references(() => users.id),
  ipAddress: text("ip_address"),
  sessionId: text("session_id"),
}, (table) => {
  // Constraint ensures a user/IP/session can only like a video once
  return {
    unique_like: primaryKey({ columns: [table.videoId, 
      // Use either userId or the combination of IP and session
      table.userId || table.ipAddress, 
      table.sessionId] 
    })
  };
});

export const likesRelations = relations(likes, ({ one }) => ({
  video: one(videos, {
    fields: [likes.videoId],
    references: [videos.id],
  }),
  user: one(users, {
    fields: [likes.userId],
    references: [users.id],
  }),
}));

// Messages table for user-to-user messaging
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  receiverId: integer("receiver_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  content: text("content").notNull(),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
  receiver: one(users, {
    fields: [messages.receiverId],
    references: [users.id],
  }),
}));

// Content reports table
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  videoId: integer("video_id").references(() => videos.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  reason: text("reason").notNull(),
  status: varchar("status", { enum: ["pending", "reviewed", "ignored"] }).default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: integer("resolved_by").references(() => users.id, { onDelete: "set null" }),
});

export const reportsRelations = relations(reports, ({ one }) => ({
  video: one(videos, {
    fields: [reports.videoId],
    references: [videos.id],
  }),
  user: one(users, {
    fields: [reports.userId],
    references: [users.id],
  }),
  resolver: one(users, {
    fields: [reports.resolvedBy],
    references: [users.id],
  }),
}));

// Blocked users table
export const blockedUsers = pgTable("blocked_users", {
  id: serial("id").primaryKey(),
  userId: integer("userId").references(() => users.id, { onDelete: "cascade" }).notNull(),
  blockedUserId: integer("blockedUserId").references(() => users.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => {
  return {
    // Constraint to ensure a user can only block another user once
    unique_block: primaryKey({ columns: [table.userId, table.blockedUserId] })
  };
});

export const blockedUsersRelations = relations(blockedUsers, ({ one }) => ({
  user: one(users, {
    fields: [blockedUsers.userId],
    references: [users.id],
  }),
  blockedUser: one(users, {
    fields: [blockedUsers.blockedUserId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users)
  .pick({
    username: true,
    password: true,
    email: true,
    dateOfBirth: true,
    isAdmin: true,
  })
  .extend({
    // Add additional validation for username format
    username: z.string()
      .min(3, "Username must be at least 3 characters")
      .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens"),
  });

export const insertCategorySchema = createInsertSchema(categories);
// Properly defining the insert schema for videos
export const insertVideoSchema = createInsertSchema(videos).pick({
  userId: true, // Explicitly include userId
  title: true,
  description: true,
  aiGenerator: true,
  prompt: true,
  thumbnail: true,
  videoUrl: true,
  imageUrl: true,
  embedCode: true,
  preview: true,
  contentType: true,
  resolution: true,
  duration: true,
  categoryId: true,
  vimeoId: true,
  credits: true,
  views: true,
  featured: true,
  reviewStatus: true,
  reviewedAt: true,
  reviewedBy: true,
  rejectionReason: true,
  perceptualHashes: true
});
export const insertWishlistItemSchema = createInsertSchema(wishlistItems);
export const insertCommentSchema = createInsertSchema(comments);
export const insertLikeSchema = createInsertSchema(likes);
export const insertMessageSchema = createInsertSchema(messages);
export const insertReportSchema = createInsertSchema(reports).pick({
  videoId: true,
  userId: true,
  reason: true
});
export const insertBlockedUserSchema = createInsertSchema(blockedUsers).pick({
  userId: true,
  blockedUserId: true
});

// Type definitions
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type Video = typeof videos.$inferSelect & { 
  uploaderName?: string;
  adminNotice?: string; // For admin-only notifications about content status
};

export type InsertWishlistItem = z.infer<typeof insertWishlistItemSchema>;
export type WishlistItem = typeof wishlistItems.$inferSelect;

export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;

export type InsertLike = z.infer<typeof insertLikeSchema>;
export type Like = typeof likes.$inferSelect;

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reports.$inferSelect;

export type InsertBlockedUser = z.infer<typeof insertBlockedUserSchema>;
export type BlockedUser = typeof blockedUsers.$inferSelect;
