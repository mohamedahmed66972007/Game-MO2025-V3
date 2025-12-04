import { 
  users, accounts, friendRequests, friendships, notifications, pushSubscriptions,
  permanentRooms, permanentRoomMembers,
  type User, type InsertUser, type Account, type InsertAccount,
  type FriendRequest, type InsertFriendRequest, type Notification, type InsertNotification,
  type PushSubscription, type InsertPushSubscription,
  type PermanentRoom, type InsertPermanentRoom, type PermanentRoomMember, type InsertPermanentRoomMember
} from "@shared/schema";
import { db } from "./db";
import { eq, or, and, like, desc, inArray } from "drizzle-orm";
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
    
    const entries = Array.from(this.friendshipsMap.entries());
    for (const [id, f] of entries) {
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

  private pushSubscriptionsMap: Map<number, PushSubscription> = new Map();
  private pushSubscriptionId: number = 1;

  async getPushSubscriptions(userId: number): Promise<PushSubscription[]> {
    if (db) {
      return await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
    }
    return Array.from(this.pushSubscriptionsMap.values()).filter(sub => sub.userId === userId);
  }

  async savePushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription> {
    if (db) {
      const existing = await db.select().from(pushSubscriptions)
        .where(and(
          eq(pushSubscriptions.userId, subscription.userId),
          eq(pushSubscriptions.endpoint, subscription.endpoint)
        ))
        .limit(1);
      
      if (existing.length > 0) {
        return existing[0];
      }
      
      const result = await db.insert(pushSubscriptions).values(subscription).returning();
      return result[0];
    }
    
    const existing = Array.from(this.pushSubscriptionsMap.values())
      .find(sub => sub.userId === subscription.userId && sub.endpoint === subscription.endpoint);
    
    if (existing) {
      return existing;
    }
    
    const id = this.pushSubscriptionId++;
    const newSubscription: PushSubscription = {
      ...subscription,
      id,
      createdAt: new Date(),
    };
    this.pushSubscriptionsMap.set(id, newSubscription);
    return newSubscription;
  }

  async deletePushSubscription(subscriptionId: number): Promise<void> {
    if (db) {
      await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, subscriptionId));
      return;
    }
    this.pushSubscriptionsMap.delete(subscriptionId);
  }

  async deletePushSubscriptionByEndpoint(userId: number, endpoint: string): Promise<void> {
    if (db) {
      await db.delete(pushSubscriptions).where(and(
        eq(pushSubscriptions.userId, userId),
        eq(pushSubscriptions.endpoint, endpoint)
      ));
      return;
    }
    
    const entries = Array.from(this.pushSubscriptionsMap.entries());
    for (const [id, sub] of entries) {
      if (sub.userId === userId && sub.endpoint === endpoint) {
        this.pushSubscriptionsMap.delete(id);
        break;
      }
    }
  }

  private permanentRoomsMap: Map<number, PermanentRoom> = new Map();
  private permanentRoomMembersMap: Map<number, PermanentRoomMember> = new Map();
  private permanentRoomId: number = 1;
  private permanentRoomMemberId: number = 1;

  async createPermanentRoom(room: InsertPermanentRoom): Promise<PermanentRoom> {
    if (db) {
      const result = await db.insert(permanentRooms).values(room).returning();
      return result[0];
    }
    const id = this.permanentRoomId++;
    const newRoom: PermanentRoom = {
      ...room,
      id,
      name: room.name || null,
      isActive: true,
      numDigits: room.numDigits || 4,
      maxAttempts: room.maxAttempts || 20,
      cardsEnabled: room.cardsEnabled || false,
      createdAt: new Date(),
      lastActivityAt: new Date(),
    };
    this.permanentRoomsMap.set(id, newRoom);
    return newRoom;
  }

  async getPermanentRoomByRoomId(roomId: string): Promise<PermanentRoom | undefined> {
    if (db) {
      const result = await db.select().from(permanentRooms)
        .where(eq(permanentRooms.roomId, roomId))
        .limit(1);
      return result[0];
    }
    return Array.from(this.permanentRoomsMap.values()).find(r => r.roomId === roomId);
  }

  async getPermanentRoomById(id: number): Promise<PermanentRoom | undefined> {
    if (db) {
      const result = await db.select().from(permanentRooms)
        .where(eq(permanentRooms.id, id))
        .limit(1);
      return result[0];
    }
    return this.permanentRoomsMap.get(id);
  }

  async getUserPermanentRoom(userId: number): Promise<PermanentRoom | undefined> {
    if (db) {
      const memberResult = await db.select().from(permanentRoomMembers)
        .where(eq(permanentRoomMembers.userId, userId))
        .limit(1);
      
      if (memberResult.length === 0) return undefined;
      
      const roomResult = await db.select().from(permanentRooms)
        .where(eq(permanentRooms.id, memberResult[0].roomId))
        .limit(1);
      
      return roomResult[0];
    }
    
    const member = Array.from(this.permanentRoomMembersMap.values())
      .find(m => m.userId === userId);
    
    if (!member) return undefined;
    return this.permanentRoomsMap.get(member.roomId);
  }

  async updatePermanentRoomActivity(roomId: string): Promise<void> {
    if (db) {
      await db.update(permanentRooms)
        .set({ lastActivityAt: new Date() })
        .where(eq(permanentRooms.roomId, roomId));
      return;
    }
    const room = Array.from(this.permanentRoomsMap.values()).find(r => r.roomId === roomId);
    if (room) {
      room.lastActivityAt = new Date();
    }
  }

  async updatePermanentRoomLeader(roomId: string, leaderId: number): Promise<void> {
    if (db) {
      await db.update(permanentRooms)
        .set({ leaderId, lastActivityAt: new Date() })
        .where(eq(permanentRooms.roomId, roomId));
      return;
    }
    const room = Array.from(this.permanentRoomsMap.values()).find(r => r.roomId === roomId);
    if (room) {
      room.leaderId = leaderId;
      room.lastActivityAt = new Date();
    }
  }

  async updatePermanentRoomSettings(roomId: string, settings: { numDigits?: number; maxAttempts?: number; cardsEnabled?: boolean }): Promise<void> {
    if (db) {
      await db.update(permanentRooms)
        .set({ 
          ...settings,
          lastActivityAt: new Date() 
        })
        .where(eq(permanentRooms.roomId, roomId));
      return;
    }
    const room = Array.from(this.permanentRoomsMap.values()).find(r => r.roomId === roomId);
    if (room) {
      if (settings.numDigits !== undefined) room.numDigits = settings.numDigits;
      if (settings.maxAttempts !== undefined) room.maxAttempts = settings.maxAttempts;
      if (settings.cardsEnabled !== undefined) room.cardsEnabled = settings.cardsEnabled;
      room.lastActivityAt = new Date();
    }
  }

  async addPermanentRoomMember(member: InsertPermanentRoomMember): Promise<PermanentRoomMember> {
    if (db) {
      const existing = await db.select().from(permanentRoomMembers)
        .where(and(
          eq(permanentRoomMembers.roomId, member.roomId),
          eq(permanentRoomMembers.userId, member.userId)
        ))
        .limit(1);
      
      if (existing.length > 0) {
        return existing[0];
      }
      
      const result = await db.insert(permanentRoomMembers).values(member).returning();
      return result[0];
    }
    
    const existing = Array.from(this.permanentRoomMembersMap.values())
      .find(m => m.roomId === member.roomId && m.userId === member.userId);
    
    if (existing) return existing;
    
    const id = this.permanentRoomMemberId++;
    const newMember: PermanentRoomMember = {
      ...member,
      id,
      role: member.role || "member",
      isReady: false,
      joinedAt: new Date(),
      lastReadyAt: null,
    };
    this.permanentRoomMembersMap.set(id, newMember);
    return newMember;
  }

  async getPermanentRoomMembers(roomId: number): Promise<(PermanentRoomMember & { user: Account })[]> {
    if (db) {
      const members = await db.select().from(permanentRoomMembers)
        .where(eq(permanentRoomMembers.roomId, roomId));
      
      if (members.length === 0) return [];
      
      const userIds = members.map(m => m.userId);
      const users = await db.select().from(accounts)
        .where(inArray(accounts.id, userIds));
      
      const userMap = new Map(users.map(u => [u.id, u]));
      
      return members.map(m => ({
        ...m,
        user: userMap.get(m.userId)!,
      })).filter(m => m.user);
    }
    
    const members = Array.from(this.permanentRoomMembersMap.values())
      .filter(m => m.roomId === roomId);
    
    return members.map(m => {
      const user = this.accountsMap.get(m.userId);
      return user ? { ...m, user } : null;
    }).filter(Boolean) as (PermanentRoomMember & { user: Account })[];
  }

  async updateMemberReady(roomId: number, userId: number, isReady: boolean): Promise<void> {
    if (db) {
      await db.update(permanentRoomMembers)
        .set({ 
          isReady,
          lastReadyAt: isReady ? new Date() : null
        })
        .where(and(
          eq(permanentRoomMembers.roomId, roomId),
          eq(permanentRoomMembers.userId, userId)
        ));
      return;
    }
    
    const member = Array.from(this.permanentRoomMembersMap.values())
      .find(m => m.roomId === roomId && m.userId === userId);
    
    if (member) {
      member.isReady = isReady;
      member.lastReadyAt = isReady ? new Date() : null;
    }
  }

  async resetAllMemberReady(roomId: number): Promise<void> {
    if (db) {
      await db.update(permanentRoomMembers)
        .set({ isReady: false, lastReadyAt: null })
        .where(eq(permanentRoomMembers.roomId, roomId));
      return;
    }
    
    this.permanentRoomMembersMap.forEach(m => {
      if (m.roomId === roomId) {
        m.isReady = false;
        m.lastReadyAt = null;
      }
    });
  }

  async removePermanentRoomMember(roomId: number, userId: number): Promise<void> {
    if (db) {
      await db.delete(permanentRoomMembers).where(and(
        eq(permanentRoomMembers.roomId, roomId),
        eq(permanentRoomMembers.userId, userId)
      ));
      return;
    }
    
    const entries = Array.from(this.permanentRoomMembersMap.entries());
    for (const [id, m] of entries) {
      if (m.roomId === roomId && m.userId === userId) {
        this.permanentRoomMembersMap.delete(id);
        break;
      }
    }
  }

  async deletePermanentRoom(roomId: string): Promise<void> {
    if (db) {
      const room = await this.getPermanentRoomByRoomId(roomId);
      if (room) {
        await db.delete(permanentRoomMembers).where(eq(permanentRoomMembers.roomId, room.id));
        await db.delete(permanentRooms).where(eq(permanentRooms.roomId, roomId));
      }
      return;
    }
    
    const room = Array.from(this.permanentRoomsMap.values()).find(r => r.roomId === roomId);
    if (room) {
      const memberEntries = Array.from(this.permanentRoomMembersMap.entries());
      for (const [id, m] of memberEntries) {
        if (m.roomId === room.id) {
          this.permanentRoomMembersMap.delete(id);
        }
      }
      this.permanentRoomsMap.delete(room.id);
    }
  }
}

export const storage = new MemStorage();
