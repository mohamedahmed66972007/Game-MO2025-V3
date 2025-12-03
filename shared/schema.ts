import { pgTable, text, serial, integer, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  displayName: varchar("display_name", { length: 50 }).notNull(),
  username: varchar("username", { length: 30 }).notNull().unique(),
  password: varchar("password", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastSeen: timestamp("last_seen").defaultNow().notNull(),
  isOnline: boolean("is_online").default(false).notNull(),
  currentRoomId: varchar("current_room_id", { length: 10 }),
});

export const accountRelations = relations(accounts, ({ many }) => ({
  sentFriendRequests: many(friendRequests, { relationName: "sentRequests" }),
  receivedFriendRequests: many(friendRequests, { relationName: "receivedRequests" }),
  notifications: many(notifications),
}));

export const friendRequests = pgTable("friend_requests", {
  id: serial("id").primaryKey(),
  fromUserId: integer("from_user_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  toUserId: integer("to_user_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const friendRequestRelations = relations(friendRequests, ({ one }) => ({
  fromUser: one(accounts, {
    fields: [friendRequests.fromUserId],
    references: [accounts.id],
    relationName: "sentRequests",
  }),
  toUser: one(accounts, {
    fields: [friendRequests.toUserId],
    references: [accounts.id],
    relationName: "receivedRequests",
  }),
}));

export const friendships = pgTable("friendships", {
  id: serial("id").primaryKey(),
  userId1: integer("user_id_1").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  userId2: integer("user_id_2").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const friendshipRelations = relations(friendships, ({ one }) => ({
  user1: one(accounts, {
    fields: [friendships.userId1],
    references: [accounts.id],
  }),
  user2: one(accounts, {
    fields: [friendships.userId2],
    references: [accounts.id],
  }),
}));

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  data: text("data"),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notificationRelations = relations(notifications, ({ one }) => ({
  user: one(accounts, {
    fields: [notifications.userId],
    references: [accounts.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertAccountSchema = createInsertSchema(accounts).pick({
  displayName: true,
  username: true,
  password: true,
});

export const insertFriendRequestSchema = createInsertSchema(friendRequests).pick({
  fromUserId: true,
  toUserId: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).pick({
  userId: true,
  type: true,
  title: true,
  message: true,
  data: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type FriendRequest = typeof friendRequests.$inferSelect;
export type InsertFriendRequest = z.infer<typeof insertFriendRequestSchema>;
export type Friendship = typeof friendships.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pushSubscriptionRelations = relations(pushSubscriptions, ({ one }) => ({
  user: one(accounts, {
    fields: [pushSubscriptions.userId],
    references: [accounts.id],
  }),
}));

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).pick({
  userId: true,
  endpoint: true,
  p256dh: true,
  auth: true,
});

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
