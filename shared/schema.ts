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
  credits: integer("credits").default(0).notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  purchases: many(purchases),
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

// Videos table
export const videos = pgTable("videos", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  thumbnail: text("thumbnail").notNull(),
  videoUrl: text("video_url"),
  preview: text("preview"),
  credits: integer("credits").notNull(),
  resolution: text("resolution").notNull(),
  duration: integer("duration").notNull(), // in seconds
  categoryId: integer("category_id").references(() => categories.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const videosRelations = relations(videos, ({ one, many }) => ({
  category: one(categories, {
    fields: [videos.categoryId],
    references: [categories.id],
  }),
  purchases: many(purchases),
  wishlistItems: many(wishlistItems),
}));

// Purchases table
export const purchases = pgTable("purchases", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  videoId: integer("video_id").references(() => videos.id),
  purchaseDate: timestamp("purchase_date").defaultNow().notNull(),
  creditsPaid: integer("credits_paid").notNull(),
});

export const purchasesRelations = relations(purchases, ({ one }) => ({
  user: one(users, {
    fields: [purchases.userId],
    references: [users.id],
  }),
  video: one(videos, {
    fields: [purchases.videoId],
    references: [videos.id],
  }),
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

// Credit transactions table
export const creditTransactions = pgTable("credit_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  amount: integer("amount").notNull(),
  type: text("type").notNull(), // 'purchase', 'refund', etc.
  stripePaymentId: text("stripe_payment_id"),
  transactionDate: timestamp("transaction_date").defaultNow().notNull(),
});

export const creditTransactionsRelations = relations(creditTransactions, ({ one }) => ({
  user: one(users, {
    fields: [creditTransactions.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  credits: true,
});

export const insertCategorySchema = createInsertSchema(categories);
export const insertVideoSchema = createInsertSchema(videos);
export const insertPurchaseSchema = createInsertSchema(purchases);
export const insertWishlistItemSchema = createInsertSchema(wishlistItems);
export const insertCreditTransactionSchema = createInsertSchema(creditTransactions);

// Type definitions
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type Video = typeof videos.$inferSelect;

export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;
export type Purchase = typeof purchases.$inferSelect;

export type InsertWishlistItem = z.infer<typeof insertWishlistItemSchema>;
export type WishlistItem = typeof wishlistItems.$inferSelect;

export type InsertCreditTransaction = z.infer<typeof insertCreditTransactionSchema>;
export type CreditTransaction = typeof creditTransactions.$inferSelect;
