import { 
  users, accounts, friendRequests, friendships, notifications,
  type User, type InsertUser, type Account, type InsertAccount,
  type FriendRequest, type InsertFriendRequest, type Notification, type InsertNotification
} from "@shared/schema";
import { db } from "./db";
import { eq, or, and, like, desc } from "drizzle-orm";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getAccount(id: number): Promise<Account | undefined>;
  getAccountByUsername(username: string): Promise<Account | undefined>;
  createAccount(account: InsertAccount): Promise<Account>;
  updateAccount(id: number, updates: { displayName?: string; username?: string; password?: string }): Promise<Account | undefined>;
  updateAccountPassword(id: number, hashedPassword: string): Promise<void>;
  updateAccountOnline(id: number, isOnline: boolean, roomId?: string): Promise<void>;
  searchAccounts(query: string): Promise<Account[]>;
  
  getFriends(userId: number): Promise<Account[]>;
  areFriends(userId1: number, userId2: number): Promise<boolean>;
  createFriendship(userId1: number, userId2: number): Promise<void>;
  removeFriendship(userId1: number, userId2: number): Promise<void>;
  
  getPendingFriendRequests(userId: number): Promise<(FriendRequest & { fromUser: Account })[]>;
  getSentFriendRequests(userId: number): Promise<(FriendRequest & { toUser: Account })[]>;
  createFriendRequest(request: InsertFriendRequest): Promise<FriendRequest>;
  updateFriendRequestStatus(requestId: number, status: string): Promise<void>;
  deleteFriendRequest(requestId: number): Promise<void>;
  
  getNotifications(userId: number, limit?: number): Promise<Notification[]>;
  getUnreadNotificationsCount(userId: number): Promise<number>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(notificationId: number): Promise<void>;
  markAllNotificationsAsRead(userId: number): Promise<void>;
  deleteNotification(notificationId: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private accountsMap: Map<number, Account>;
  private friendshipsMap: Map<number, { userId1: number; userId2: number }>;
  private friendRequestsMap: Map<number, FriendRequest>;
  private notificationsMap: Map<number, Notification>;
  currentId: number;
  accountId: number;
  friendshipId: number;
  friendRequestId: number;
  notificationId: number;

  constructor() {
    this.users = new Map();
    this.accountsMap = new Map();
    this.friendshipsMap = new Map();
    this.friendRequestsMap = new Map();
    this.notificationsMap = new Map();
    this.currentId = 1;
    this.accountId = 1;
    this.friendshipId = 1;
    this.friendRequestId = 1;
    this.notificationId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getAccount(id: number): Promise<Account | undefined> {
    if (db) {
      const result = await db.select().from(accounts).where(eq(accounts.id, id)).limit(1);
      return result[0];
    }
    return this.accountsMap.get(id);
  }

  async getAccountByUsername(username: string): Promise<Account | undefined> {
    if (db) {
      const result = await db.select().from(accounts).where(eq(accounts.username, username.toLowerCase())).limit(1);
      return result[0];
    }
    return Array.from(this.accountsMap.values()).find(
      (account) => account.username.toLowerCase() === username.toLowerCase(),
    );
  }

  async createAccount(insertAccount: InsertAccount): Promise<Account> {
    const hashedPassword = await bcrypt.hash(insertAccount.password, SALT_ROUNDS);
    
    if (db) {
      const result = await db.insert(accounts).values({
        displayName: insertAccount.displayName,
        username: insertAccount.username.toLowerCase(),
        password: hashedPassword,
      }).returning();
      return result[0];
    }
    const id = this.accountId++;
    const account: Account = { 
      ...insertAccount, 
      id, 
      username: insertAccount.username.toLowerCase(),
      password: hashedPassword,
      createdAt: new Date(),
      lastSeen: new Date(),
      isOnline: false,
      currentRoomId: null,
    };
    this.accountsMap.set(id, account);
    return account;
  }

  async updateAccount(id: number, updates: { displayName?: string; username?: string; password?: string }): Promise<Account | undefined> {
    const updateData: any = {};
    if (updates.displayName) updateData.displayName = updates.displayName;
    if (updates.username) updateData.username = updates.username.toLowerCase();
    if (updates.password) {
      updateData.password = await bcrypt.hash(updates.password, SALT_ROUNDS);
    }
    
    if (db) {
      const result = await db.update(accounts)
        .set(updateData)
        .where(eq(accounts.id, id))
        .returning();
      return result[0];
    }
    const account = this.accountsMap.get(id);
    if (account) {
      if (updateData.displayName) account.displayName = updateData.displayName;
      if (updateData.username) account.username = updateData.username;
      if (updateData.password) account.password = updateData.password;
    }
    return account;
  }

  async updateAccountPassword(id: number, hashedPassword: string): Promise<void> {
    if (db) {
      await db.update(accounts)
        .set({ password: hashedPassword })
        .where(eq(accounts.id, id));
      return;
    }
    const account = this.accountsMap.get(id);
    if (account) {
      account.password = hashedPassword;
    }
  }

  async updateAccountOnline(id: number, isOnline: boolean, roomId?: string): Promise<void> {
    if (db) {
      await db.update(accounts)
        .set({ 
          isOnline, 
          lastSeen: new Date(),
          currentRoomId: roomId || null
        })
        .where(eq(accounts.id, id));
      return;
    }
    const account = this.accountsMap.get(id);
    if (account) {
      account.isOnline = isOnline;
      account.lastSeen = new Date();
      account.currentRoomId = roomId || null;
    }
  }

  async searchAccounts(query: string): Promise<Account[]> {
    if (db) {
      const result = await db.select().from(accounts)
        .where(or(
          like(accounts.username, `%${query.toLowerCase()}%`),
          like(accounts.displayName, `%${query}%`)
        ))
        .limit(20);
      return result;
    }
    const lowerQuery = query.toLowerCase();
    return Array.from(this.accountsMap.values()).filter(
      (account) => 
        account.username.toLowerCase().includes(lowerQuery) ||
        account.displayName.toLowerCase().includes(lowerQuery)
    ).slice(0, 20);
  }

  async getFriends(userId: number): Promise<Account[]> {
    if (db) {
      const result = await db.select().from(friendships)
        .where(or(
          eq(friendships.userId1, userId),
          eq(friendships.userId2, userId)
        ));
      
      const friendIds = result.map(f => f.userId1 === userId ? f.userId2 : f.userId1);
      if (friendIds.length === 0) return [];
      
      const friends = await db.select().from(accounts)
        .where(or(...friendIds.map(id => eq(accounts.id, id))));
      return friends;
    }
    
    const friendIds: number[] = [];
    this.friendshipsMap.forEach((f) => {
      if (f.userId1 === userId) friendIds.push(f.userId2);
      else if (f.userId2 === userId) friendIds.push(f.userId1);
    });
    
    return friendIds.map(id => this.accountsMap.get(id)).filter(Boolean) as Account[];
  }

  async areFriends(userId1: number, userId2: number): Promise<boolean> {
    if (db) {
      const result = await db.select().from(friendships)
        .where(or(
          and(eq(friendships.userId1, userId1), eq(friendships.userId2, userId2)),
          and(eq(friendships.userId1, userId2), eq(friendships.userId2, userId1))
        ))
        .limit(1);
      return result.length > 0;
    }
    
    return Array.from(this.friendshipsMap.values()).some(
      f => (f.userId1 === userId1 && f.userId2 === userId2) ||
           (f.userId1 === userId2 && f.userId2 === userId1)
    );
  }

  async createFriendship(userId1: number, userId2: number): Promise<void> {
    if (db) {
      await db.insert(friendships).values({ userId1, userId2 });
      return;
    }
    const id = this.friendshipId++;
    this.friendshipsMap.set(id, { userId1, userId2 });
  }

  async removeFriendship(userId1: number, userId2: number): Promise<void> {
    if (db) {
      await db.delete(friendships)
        .where(or(
          and(eq(friendships.userId1, userId1), eq(friendships.userId2, userId2)),
          and(eq(friendships.userId1, userId2), eq(friendships.userId2, userId1))
        ));
      return;
    }
    
    for (const [id, f] of this.friendshipsMap.entries()) {
      if ((f.userId1 === userId1 && f.userId2 === userId2) ||
          (f.userId1 === userId2 && f.userId2 === userId1)) {
        this.friendshipsMap.delete(id);
        break;
      }
    }
  }

  async getPendingFriendRequests(userId: number): Promise<(FriendRequest & { fromUser: Account })[]> {
    if (db) {
      const result = await db.select({
        id: friendRequests.id,
        fromUserId: friendRequests.fromUserId,
        toUserId: friendRequests.toUserId,
        status: friendRequests.status,
        createdAt: friendRequests.createdAt,
        fromUser: accounts,
      })
      .from(friendRequests)
      .innerJoin(accounts, eq(friendRequests.fromUserId, accounts.id))
      .where(and(
        eq(friendRequests.toUserId, userId),
        eq(friendRequests.status, "pending")
      ))
      .orderBy(desc(friendRequests.createdAt));
      
      return result;
    }
    
    const requests: (FriendRequest & { fromUser: Account })[] = [];
    this.friendRequestsMap.forEach((req) => {
      if (req.toUserId === userId && req.status === "pending") {
        const fromUser = this.accountsMap.get(req.fromUserId);
        if (fromUser) {
          requests.push({ ...req, fromUser });
        }
      }
    });
    return requests;
  }

  async getSentFriendRequests(userId: number): Promise<(FriendRequest & { toUser: Account })[]> {
    if (db) {
      const result = await db.select({
        id: friendRequests.id,
        fromUserId: friendRequests.fromUserId,
        toUserId: friendRequests.toUserId,
        status: friendRequests.status,
        createdAt: friendRequests.createdAt,
        toUser: accounts,
      })
      .from(friendRequests)
      .innerJoin(accounts, eq(friendRequests.toUserId, accounts.id))
      .where(and(
        eq(friendRequests.fromUserId, userId),
        eq(friendRequests.status, "pending")
      ))
      .orderBy(desc(friendRequests.createdAt));
      
      return result;
    }
    
    const requests: (FriendRequest & { toUser: Account })[] = [];
    this.friendRequestsMap.forEach((req) => {
      if (req.fromUserId === userId && req.status === "pending") {
        const toUser = this.accountsMap.get(req.toUserId);
        if (toUser) {
          requests.push({ ...req, toUser });
        }
      }
    });
    return requests;
  }

  async createFriendRequest(request: InsertFriendRequest): Promise<FriendRequest> {
    if (db) {
      const result = await db.insert(friendRequests).values(request).returning();
      return result[0];
    }
    const id = this.friendRequestId++;
    const friendRequest: FriendRequest = {
      ...request,
      id,
      status: "pending",
      createdAt: new Date(),
    };
    this.friendRequestsMap.set(id, friendRequest);
    return friendRequest;
  }

  async updateFriendRequestStatus(requestId: number, status: string): Promise<void> {
    if (db) {
      await db.update(friendRequests)
        .set({ status })
        .where(eq(friendRequests.id, requestId));
      return;
    }
    const request = this.friendRequestsMap.get(requestId);
    if (request) {
      request.status = status;
    }
  }

  async deleteFriendRequest(requestId: number): Promise<void> {
    if (db) {
      await db.delete(friendRequests).where(eq(friendRequests.id, requestId));
      return;
    }
    this.friendRequestsMap.delete(requestId);
  }

  async getNotifications(userId: number, limit: number = 50): Promise<Notification[]> {
    if (db) {
      const result = await db.select().from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(limit);
      return result;
    }
    
    return Array.from(this.notificationsMap.values())
      .filter(n => n.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async getUnreadNotificationsCount(userId: number): Promise<number> {
    if (db) {
      const result = await db.select().from(notifications)
        .where(and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        ));
      return result.length;
    }
    
    return Array.from(this.notificationsMap.values())
      .filter(n => n.userId === userId && !n.isRead).length;
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    if (db) {
      const result = await db.insert(notifications).values(notification).returning();
      return result[0];
    }
    const id = this.notificationId++;
    const newNotification: Notification = {
      ...notification,
      id,
      data: notification.data || null,
      isRead: false,
      createdAt: new Date(),
    };
    this.notificationsMap.set(id, newNotification);
    return newNotification;
  }

  async markNotificationAsRead(notificationId: number): Promise<void> {
    if (db) {
      await db.update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.id, notificationId));
      return;
    }
    const notification = this.notificationsMap.get(notificationId);
    if (notification) {
      notification.isRead = true;
    }
  }

  async markAllNotificationsAsRead(userId: number): Promise<void> {
    if (db) {
      await db.update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.userId, userId));
      return;
    }
    this.notificationsMap.forEach((n) => {
      if (n.userId === userId) {
        n.isRead = true;
      }
    });
  }

  async deleteNotification(notificationId: number): Promise<void> {
    if (db) {
      await db.delete(notifications).where(eq(notifications.id, notificationId));
      return;
    }
    this.notificationsMap.delete(notificationId);
  }
}

export const storage = new MemStorage();
