import { pgTable, text, serial, integer, real, timestamp, boolean, primaryKey, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  dateOfBirth: timestamp("date_of_birth"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  wishlist: many(wishlistItems),
}));

// Categories table
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  icon: text("icon"),
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
  preview: text("preview"),
  contentType: text("content_type").notNull().default("video"), // "video" or "image"
  resolution: text("resolution").default("HD"),
  duration: integer("duration").default(0), // in seconds
  categoryId: integer("category_id").references(() => categories.id),
  vimeoId: text("vimeo_id"), // Store Vimeo video ID
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const videosRelations = relations(videos, ({ one, many }) => ({
  category: one(categories, {
    fields: [videos.categoryId],
    references: [categories.id],
  }),
  wishlistItems: many(wishlistItems),
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

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  dateOfBirth: true,
});

export const insertCategorySchema = createInsertSchema(categories);
export const insertVideoSchema = createInsertSchema(videos);
export const insertWishlistItemSchema = createInsertSchema(wishlistItems);
export const insertCommentSchema = createInsertSchema(comments);

// Type definitions
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type Video = typeof videos.$inferSelect;

export type InsertWishlistItem = z.infer<typeof insertWishlistItemSchema>;
export type WishlistItem = typeof wishlistItems.$inferSelect;

export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;
