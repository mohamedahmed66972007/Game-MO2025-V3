import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import * as gameStorage from "./game-storage";

interface Player {
  id: string;
  name: string;
  ws: WebSocket;
  roomId: string;
  disconnectTime?: number;
  timeoutHandle?: NodeJS.Timeout;
}

interface PlayerAttempt {
  guess: number[];
  correctCount: number;
  correctPositionCount: number;
  timestamp: number;
}

interface PlayerGameData {
  playerId: string;
  playerName: string;
  attempts: PlayerAttempt[];
  startTime: number;
  endTime: number | null;
  won: boolean;
  finished: boolean;
}

interface RematchVote {
  playerId: string;
  accepted: boolean;
}

interface GameSession {
  sharedSecret: number[];
  status: "waiting" | "pre_game_challenge" | "playing" | "finished";
  players: Map<string, PlayerGameData>;
  startTime: number;
  endTime: number | null;
  gameTimerHandle?: NodeJS.Timeout; // 5-minute game timer
  challengesCompleted: Set<string>; // Track which players completed challenges
  lastResults?: {
    winners: any[];
    losers: any[];
    stillPlaying: any[];
    reason: string;
  }; // Store latest results for reconnecting players
  rematchState: {
    requested: boolean;
    votes: Map<string, boolean>; // playerId -> accepted
    countdown: number | null;
    countdownHandle?: NodeJS.Timeout;
  };
}

interface CardSettings {
  roundDuration: number;
  maxCards?: number;
  revealNumberShowPosition?: boolean;
  burnNumberCount?: number;
  revealParitySlots?: number;
  freezeDuration?: number;
  shieldDuration?: number;
}

interface Room {
  id: string;
  hostId: string;
  players: Player[];
  disconnectedPlayers: Map<string, { player: Player; disconnectTime: number; timeoutHandle: NodeJS.Timeout }>;
  game: GameSession | null;
  settings: { numDigits: number; maxAttempts: number; cardsEnabled?: boolean; cardSettings?: CardSettings; selectedChallenge?: string; allowedCards?: string[] };
  roomTimeoutHandle?: NodeJS.Timeout;
  readyPlayers: Set<string>;
  isPermanent?: boolean;
  permanentRoomDbId?: number;
  hostAccountId?: number;
}

const rooms = new Map<string, Room>();
const players = new Map<WebSocket, Player>();

function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function generatePlayerId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function generateSecretCode(numDigits: number): number[] {
  return Array.from({ length: numDigits }, () => Math.floor(Math.random() * 10));
}

function checkGuess(secret: number[], guess: number[]): { correctCount: number; correctPositionCount: number } {
  let correctCount = 0;
  let correctPositionCount = 0;

  const secretCopy = [...secret];
  const guessCopy = [...guess];
  const length = Math.min(secret.length, guess.length);

  for (let i = 0; i < length; i++) {
    if (guessCopy[i] === secretCopy[i]) {
      correctPositionCount++;
      secretCopy[i] = -1;
      guessCopy[i] = -2;
    }
  }

  for (let i = 0; i < length; i++) {
    if (guessCopy[i] !== -2) {
      const index = secretCopy.indexOf(guessCopy[i]);
      if (index !== -1) {
        correctCount++;
        secretCopy[index] = -1;
      }
    }
  }

  correctCount += correctPositionCount;

  return { correctCount, correctPositionCount };
}

const onlineUsers = new Map<number, WebSocket>();

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  app.post("/api/accounts/create", async (req, res) => {
    try {
      const { displayName, username, password } = req.body;

      if (!displayName || !username || !password) {
        return res.status(400).json({ error: "الاسم واسم المستخدم وكلمة المرور مطلوبان" });
      }

      if (username.length < 3 || username.length > 30) {
        return res.status(400).json({ error: "اسم المستخدم يجب أن يكون بين 3 و 30 حرف" });
      }

      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return res.status(400).json({ error: "اسم المستخدم يجب أن يحتوي على أحرف إنجليزية وأرقام فقط" });
      }

      if (password.length < 4) {
        return res.status(400).json({ error: "كلمة المرور يجب أن تكون 4 أحرف على الأقل" });
      }

      const existing = await storage.getAccountByUsername(username);
      if (existing) {
        return res.status(409).json({ error: "اسم المستخدم مستخدم بالفعل" });
      }

      const account = await storage.createAccount({ displayName, username, password });
      res.json({ id: account.id, displayName: account.displayName, username: account.username });
    } catch (error) {
      console.error("Error creating account:", error);
      res.status(500).json({ error: "حدث خطأ أثناء إنشاء الحساب" });
    }
  });

  app.post("/api/accounts/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: "اسم المستخدم وكلمة المرور مطلوبان" });
      }

      const account = await storage.getAccountByUsername(username);
      if (!account) {
        return res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
      }

      let isValidPassword = false;

      if (account.password.startsWith("$2b$") || account.password.startsWith("$2a$")) {
        isValidPassword = await bcrypt.compare(password, account.password);
      } else {
        isValidPassword = password === account.password;
        if (isValidPassword) {
          const hashedPassword = await bcrypt.hash(password, 10);
          await storage.updateAccountPassword(account.id, hashedPassword);
        }
      }

      if (!isValidPassword) {
        return res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
      }

      res.json({ id: account.id, displayName: account.displayName, username: account.username });
    } catch (error) {
      console.error("Error logging in:", error);
      res.status(500).json({ error: "حدث خطأ أثناء تسجيل الدخول" });
    }
  });

  app.post("/api/accounts/update", async (req, res) => {
    try {
      const { id, displayName, username, currentPassword, newPassword } = req.body;

      if (!id) {
        return res.status(400).json({ error: "معرف الحساب مطلوب" });
      }

      const account = await storage.getAccount(id);
      if (!account) {
        return res.status(404).json({ error: "الحساب غير موجود" });
      }

      const updates: { displayName?: string; username?: string; password?: string } = {};

      if (displayName && displayName !== account.displayName) {
        updates.displayName = displayName;
      }

      if (username && username.toLowerCase() !== account.username) {
        if (username.length < 3 || username.length > 30) {
          return res.status(400).json({ error: "اسم المستخدم يجب أن يكون بين 3 و 30 حرف" });
        }
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
          return res.status(400).json({ error: "اسم المستخدم يجب أن يحتوي على أحرف إنجليزية وأرقام فقط" });
        }
        const existing = await storage.getAccountByUsername(username);
        if (existing && existing.id !== id) {
          return res.status(409).json({ error: "اسم المستخدم مستخدم بالفعل" });
        }
        updates.username = username;
      }

      if (newPassword) {
        if (!currentPassword) {
          return res.status(400).json({ error: "كلمة المرور الحالية مطلوبة" });
        }

        let isValidPassword = false;
        if (account.password.startsWith("$2b$") || account.password.startsWith("$2a$")) {
          isValidPassword = await bcrypt.compare(currentPassword, account.password);
        } else {
          isValidPassword = currentPassword === account.password;
        }

        if (!isValidPassword) {
          return res.status(401).json({ error: "كلمة المرور الحالية غير صحيحة" });
        }
        if (newPassword.length < 4) {
          return res.status(400).json({ error: "كلمة المرور الجديدة يجب أن تكون 4 أحرف على الأقل" });
        }
        updates.password = newPassword;
      }

      if (Object.keys(updates).length === 0) {
        return res.json({ id: account.id, displayName: account.displayName, username: account.username });
      }

      const updatedAccount = await storage.updateAccount(id, updates);
      res.json({ id: updatedAccount?.id, displayName: updatedAccount?.displayName, username: updatedAccount?.username });
    } catch (error) {
      console.error("Error updating account:", error);
      res.status(500).json({ error: "حدث خطأ أثناء تحديث الحساب" });
    }
  });

  app.get("/api/accounts/check/:username", async (req, res) => {
    try {
      const account = await storage.getAccountByUsername(req.params.username);
      if (account) {
        res.json({ exists: true, account: { id: account.id, displayName: account.displayName, username: account.username } });
      } else {
        res.json({ exists: false });
      }
    } catch (error) {
      console.error("Error checking account:", error);
      res.status(500).json({ error: "حدث خطأ" });
    }
  });

  app.get("/api/accounts/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.length < 2) {
        return res.json([]);
      }
      const accounts = await storage.searchAccounts(query);
      res.json(accounts.map(a => ({ id: a.id, displayName: a.displayName, username: a.username, isOnline: a.isOnline })));
    } catch (error) {
      console.error("Error searching accounts:", error);
      res.status(500).json({ error: "حدث خطأ" });
    }
  });

  app.get("/api/friends/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const friends = await storage.getFriends(userId);
      res.json(friends.map(f => ({ id: f.id, displayName: f.displayName, username: f.username, isOnline: f.isOnline, currentRoomId: f.currentRoomId })));
    } catch (error) {
      console.error("Error getting friends:", error);
      res.status(500).json({ error: "حدث خطأ" });
    }
  });

  app.post("/api/friends/request", async (req, res) => {
    try {
      const { fromUserId, toUserId } = req.body;

      if (fromUserId === toUserId) {
        return res.status(400).json({ error: "لا يمكنك إضافة نفسك" });
      }

      const areFriends = await storage.areFriends(fromUserId, toUserId);
      if (areFriends) {
        return res.status(400).json({ error: "أنتما أصدقاء بالفعل" });
      }

      const pendingRequests = await storage.getSentFriendRequests(fromUserId);
      const alreadySent = pendingRequests.some(r => r.toUserId === toUserId);
      if (alreadySent) {
        return res.status(400).json({ error: "تم إرسال طلب الصداقة بالفعل" });
      }

      const request = await storage.createFriendRequest({ fromUserId, toUserId });

      const fromUser = await storage.getAccount(fromUserId);
      await storage.createNotification({
        userId: toUserId,
        type: "friend_request",
        title: "طلب صداقة جديد",
        message: `${fromUser?.displayName || "شخص ما"} يريد إضافتك كصديق`,
        data: JSON.stringify({ requestId: request.id, fromUserId }),
      });

      const targetWs = onlineUsers.get(toUserId);
      if (targetWs && targetWs.readyState === WebSocket.OPEN) {
        targetWs.send(JSON.stringify({
          type: "friend_request_received",
          request: { id: request.id, fromUserId, fromUser: { id: fromUser?.id, displayName: fromUser?.displayName, username: fromUser?.username } },
        }));
      }

      res.json(request);
    } catch (error) {
      console.error("Error creating friend request:", error);
      res.status(500).json({ error: "حدث خطأ" });
    }
  });

  app.get("/api/friends/requests/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const requests = await storage.getPendingFriendRequests(userId);
      res.json(requests);
    } catch (error) {
      console.error("Error getting friend requests:", error);
      res.status(500).json({ error: "حدث خطأ" });
    }
  });

  app.post("/api/friends/accept", async (req, res) => {
    try {
      const { requestId, userId } = req.body;

      const requests = await storage.getPendingFriendRequests(userId);
      const request = requests.find(r => r.id === requestId);

      if (!request) {
        return res.status(404).json({ error: "طلب الصداقة غير موجود" });
      }

      await storage.createFriendship(request.fromUserId, request.toUserId);
      await storage.deleteFriendRequest(requestId);

      const toUser = await storage.getAccount(userId);
      await storage.createNotification({
        userId: request.fromUserId,
        type: "friend_accepted",
        title: "تم قبول طلب الصداقة",
        message: `${toUser?.displayName || "شخص ما"} قبل طلب صداقتك`,
        data: JSON.stringify({ userId }),
      });

      const fromWs = onlineUsers.get(request.fromUserId);
      if (fromWs && fromWs.readyState === WebSocket.OPEN) {
        fromWs.send(JSON.stringify({
          type: "friend_request_accepted",
          friend: { id: toUser?.id, displayName: toUser?.displayName, username: toUser?.username, isOnline: toUser?.isOnline },
        }));
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error accepting friend request:", error);
      res.status(500).json({ error: "حدث خطأ" });
    }
  });

  app.post("/api/friends/reject", async (req, res) => {
    try {
      const { requestId } = req.body;
      await storage.deleteFriendRequest(requestId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error rejecting friend request:", error);
      res.status(500).json({ error: "حدث خطأ" });
    }
  });

  app.post("/api/friends/remove", async (req, res) => {
    try {
      const { userId1, userId2 } = req.body;
      await storage.removeFriendship(userId1, userId2);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing friend:", error);
      res.status(500).json({ error: "حدث خطأ" });
    }
  });

  app.get("/api/notifications/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const notifications = await storage.getNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error getting notifications:", error);
      res.status(500).json({ error: "حدث خطأ" });
    }
  });

  app.get("/api/notifications/unread/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const count = await storage.getUnreadNotificationsCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error getting unread count:", error);
      res.status(500).json({ error: "حدث خطأ" });
    }
  });

  app.post("/api/notifications/markRead", async (req, res) => {
    try {
      const { notificationId } = req.body;
      await storage.markNotificationAsRead(notificationId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ error: "حدث خطأ" });
    }
  });

  app.post("/api/notifications/markAllRead", async (req, res) => {
    try {
      const { userId } = req.body;
      await storage.markAllNotificationsAsRead(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ error: "حدث خطأ" });
    }
  });

  app.post("/api/invite/send", async (req, res) => {
    try {
      const { fromUserId, toUserId, roomId } = req.body;

      const fromUser = await storage.getAccount(fromUserId);
      const toUser = await storage.getAccount(toUserId);

      if (!toUser) {
        return res.status(404).json({ error: "المستخدم غير موجود" });
      }

      await storage.createNotification({
        userId: toUserId,
        type: "room_invite",
        title: "دعوة للانضمام لغرفة",
        message: `${fromUser?.displayName || "صديقك"} يدعوك للانضمام إلى غرفته`,
        data: JSON.stringify({ roomId, fromUserId, fromUserName: fromUser?.displayName }),
      });

      const targetWs = onlineUsers.get(toUserId);
      if (targetWs && targetWs.readyState === WebSocket.OPEN) {
        targetWs.send(JSON.stringify({
          type: "room_invite",
          roomId,
          fromUser: { id: fromUser?.id, displayName: fromUser?.displayName, username: fromUser?.username },
        }));
      }

      if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
        try {
          const subscriptions = await storage.getPushSubscriptions(toUserId);
          if (subscriptions.length > 0) {
            const webpush = require("web-push");
            webpush.setVapidDetails(
              `mailto:${process.env.VAPID_EMAIL || "admin@example.com"}`,
              process.env.VAPID_PUBLIC_KEY,
              process.env.VAPID_PRIVATE_KEY
            );

            const payload = JSON.stringify({
              title: "دعوة للعب!",
              body: `${fromUser?.displayName || "صديقك"} يدعوك للانضمام لغرفته`,
              icon: "/favicon.svg",
              badge: "/favicon.svg",
              tag: `room-invite-${roomId}`,
              data: { roomId, fromUserId, fromUserName: fromUser?.displayName }
            });

            for (const sub of subscriptions) {
              try {
                await webpush.sendNotification({
                  endpoint: sub.endpoint,
                  keys: { p256dh: sub.p256dh, auth: sub.auth }
                }, payload);
              } catch (pushError: any) {
                if (pushError.statusCode === 410) {
                  await storage.deletePushSubscription(sub.id);
                }
                console.error("Push notification error:", pushError);
              }
            }
          }
        } catch (pushError) {
          console.error("Push notification setup error:", pushError);
        }
      }

      res.json({ success: true, isOnline: !!targetWs });
    } catch (error) {
      console.error("Error sending invite:", error);
      res.status(500).json({ error: "حدث خطأ" });
    }
  });

  app.get("/api/push/vapid-key", (req, res) => {
    if (process.env.VAPID_PUBLIC_KEY) {
      res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
    } else {
      res.status(404).json({ error: "Push notifications not configured" });
    }
  });

  app.post("/api/push/subscribe", async (req, res) => {
    try {
      const { userId, subscription } = req.body;

      if (!userId || !subscription) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      await storage.savePushSubscription({
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error saving push subscription:", error);
      res.status(500).json({ error: "حدث خطأ" });
    }
  });

  app.post("/api/push/unsubscribe", async (req, res) => {
    try {
      const { userId, endpoint } = req.body;

      if (!userId || !endpoint) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      await storage.deletePushSubscriptionByEndpoint(userId, endpoint);

      res.json({ success: true });
    } catch (error) {
      console.error("Error removing push subscription:", error);
      res.status(500).json({ error: "حدث خطأ" });
    }
  });

  // Permanent Room API Endpoints
  app.post("/api/permanent-rooms/create", async (req, res) => {
    try {
      const { userId, name } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "معرف المستخدم مطلوب" });
      }

      // Check if user already has a permanent room
      const existingRoom = await storage.getUserPermanentRoom(userId);
      if (existingRoom) {
        return res.status(400).json({ error: "لديك غرفة دائمة بالفعل", roomId: existingRoom.roomId });
      }

      const roomId = generateRoomId();
      const permanentRoom = await storage.createPermanentRoom({
        roomId,
        ownerId: userId,
        leaderId: userId,
        name: name || null,
      });

      // Add owner as member with leader role
      await storage.addPermanentRoomMember({
        roomId: permanentRoom.id,
        userId,
        role: "leader",
      });

      res.json({ 
        success: true, 
        roomId: permanentRoom.roomId,
        room: permanentRoom,
      });
    } catch (error) {
      console.error("Error creating permanent room:", error);
      res.status(500).json({ error: "حدث خطأ أثناء إنشاء الغرفة" });
    }
  });

  app.get("/api/permanent-rooms/user/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const room = await storage.getUserPermanentRoom(userId);

      if (!room) {
        return res.json({ room: null });
      }

      const members = await storage.getPermanentRoomMembers(room.id);

      res.json({ 
        room,
        members: members.map(m => ({
          id: m.userId,
          displayName: m.user.displayName,
          username: m.user.username,
          role: m.role,
          isReady: m.isReady,
          isOnline: m.user.isOnline,
        })),
      });
    } catch (error) {
      console.error("Error getting user permanent room:", error);
      res.status(500).json({ error: "حدث خطأ" });
    }
  });

  app.get("/api/permanent-rooms/:roomId", async (req, res) => {
    try {
      const roomId = req.params.roomId;
      const room = await storage.getPermanentRoomByRoomId(roomId);

      if (!room) {
        return res.status(404).json({ error: "الغرفة غير موجودة" });
      }

      const members = await storage.getPermanentRoomMembers(room.id);

      res.json({ 
        room,
        members: members.map(m => ({
          id: m.userId,
          displayName: m.user.displayName,
          username: m.user.username,
          role: m.role,
          isReady: m.isReady,
          isOnline: m.user.isOnline,
        })),
      });
    } catch (error) {
      console.error("Error getting permanent room:", error);
      res.status(500).json({ error: "حدث خطأ" });
    }
  });

  app.post("/api/permanent-rooms/join", async (req, res) => {
    try {
      const { userId, roomId } = req.body;

      if (!userId || !roomId) {
        return res.status(400).json({ error: "معرف المستخدم ومعرف الغرفة مطلوبان" });
      }

      const room = await storage.getPermanentRoomByRoomId(roomId);
      if (!room) {
        return res.status(404).json({ error: "الغرفة غير موجودة" });
      }

      // Check if already in another permanent room
      const existingRoom = await storage.getUserPermanentRoom(userId);
      if (existingRoom && existingRoom.id !== room.id) {
        return res.status(400).json({ error: "أنت موجود في غرفة دائمة أخرى", roomId: existingRoom.roomId });
      }

      await storage.addPermanentRoomMember({
        roomId: room.id,
        userId,
        role: "member",
      });

      await storage.updatePermanentRoomActivity(roomId);

      res.json({ success: true, room });
    } catch (error) {
      console.error("Error joining permanent room:", error);
      res.status(500).json({ error: "حدث خطأ" });
    }
  });

  app.post("/api/permanent-rooms/leave", async (req, res) => {
    try {
      const { userId, roomId } = req.body;

      const room = await storage.getPermanentRoomByRoomId(roomId);
      if (!room) {
        return res.status(404).json({ error: "الغرفة غير موجودة" });
      }

      // If leaving user is the owner, delete the room
      if (room.ownerId === userId) {
        await storage.deletePermanentRoom(roomId);
        res.json({ success: true, roomDeleted: true });
      } else {
        await storage.removePermanentRoomMember(room.id, userId);
        res.json({ success: true, roomDeleted: false });
      }
    } catch (error) {
      console.error("Error leaving permanent room:", error);
      res.status(500).json({ error: "حدث خطأ" });
    }
  });

  // Send notification to permanent room members and friends when user comes online
  async function notifyOnlineStatus(userId: number) {
    try {
      const user = await storage.getAccount(userId);
      if (!user) return;

      // Notify friends
      const friends = await storage.getFriends(userId);
      for (const friend of friends) {
        const friendWs = onlineUsers.get(friend.id);
        if (friendWs && friendWs.readyState === WebSocket.OPEN) {
          friendWs.send(JSON.stringify({
            type: "friend_online",
            userId: userId,
            displayName: user.displayName,
          }));
        }

        // Send push notification if friend has subscriptions
        if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
          try {
            const subscriptions = await storage.getPushSubscriptions(friend.id);
            if (subscriptions.length > 0) {
              const webpush = require("web-push");
              webpush.setVapidDetails(
                `mailto:${process.env.VAPID_EMAIL || "admin@example.com"}`,
                process.env.VAPID_PUBLIC_KEY,
                process.env.VAPID_PRIVATE_KEY
              );

              const payload = JSON.stringify({
                title: "صديق متصل!",
                body: `${user.displayName} أصبح متصلاً الآن`,
                icon: "/favicon.svg",
                badge: "/favicon.svg",
                tag: `friend-online-${userId}`,
                data: { userId, displayName: user.displayName, type: "friend_online" }
              });

              for (const sub of subscriptions) {
                try {
                  await webpush.sendNotification({
                    endpoint: sub.endpoint,
                    keys: { p256dh: sub.p256dh, auth: sub.auth }
                  }, payload);
                } catch (pushError: any) {
                  if (pushError.statusCode === 410) {
                    await storage.deletePushSubscription(sub.id);
                  }
                }
              }
            }
          } catch (pushError) {
            console.error("Push notification error:", pushError);
          }
        }
      }

      // Notify permanent room members
      const permanentRoom = await storage.getUserPermanentRoom(userId);
      if (permanentRoom) {
        const members = await storage.getPermanentRoomMembers(permanentRoom.id);
        for (const member of members) {
          if (member.userId === userId) continue;

          const memberWs = onlineUsers.get(member.userId);
          if (memberWs && memberWs.readyState === WebSocket.OPEN) {
            memberWs.send(JSON.stringify({
              type: "room_member_online",
              userId: userId,
              displayName: user.displayName,
              roomId: permanentRoom.roomId,
            }));
          }

          // Send push notification
          if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
            try {
              const subscriptions = await storage.getPushSubscriptions(member.userId);
              if (subscriptions.length > 0) {
                const webpush = require("web-push");
                webpush.setVapidDetails(
                  `mailto:${process.env.VAPID_EMAIL || "admin@example.com"}`,
                  process.env.VAPID_PUBLIC_KEY,
                  process.env.VAPID_PRIVATE_KEY
                );

                const payload = JSON.stringify({
                  title: "عضو الغرفة متصل!",
                  body: `${user.displayName} متصل الآن في غرفتك الدائمة`,
                  icon: "/favicon.svg",
                  badge: "/favicon.svg",
                  tag: `room-member-online-${userId}`,
                  data: { userId, displayName: user.displayName, roomId: permanentRoom.roomId, type: "room_member_online" }
                });

                for (const sub of subscriptions) {
                  try {
                    await webpush.sendNotification({
                      endpoint: sub.endpoint,
                      keys: { p256dh: sub.p256dh, auth: sub.auth }
                    }, payload);
                  } catch (pushError: any) {
                    if (pushError.statusCode === 410) {
                      await storage.deletePushSubscription(sub.id);
                    }
                  }
                }
              }
            } catch (pushError) {
              console.error("Push notification error:", pushError);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error notifying online status:", error);
    }
  }

  httpServer.on("upgrade", (request, socket, head) => {
    const pathname = new URL(request.url!, `http://${request.headers.host}`).pathname;

    if (pathname === "/game") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  });

  wss.on("connection", (ws: WebSocket) => {
    console.log("New game WebSocket connection");

    ws.on("message", (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        handleMessage(ws, message);
      } catch (error) {
        console.error("Error parsing message:", error);
      }
    });

    ws.on("close", () => {
      const player = players.get(ws);
      if (player) {
        const room = rooms.get(player.roomId);
        if (room) {
          // Remove from active players
          room.players = room.players.filter((p) => p.id !== player.id);

          // Keep player in disconnectedPlayers for reconnection indefinitely
          const disconnectTime = Date.now();
          player.disconnectTime = disconnectTime;

          // No timeout - keep players in room indefinitely until they explicitly leave
          // Create a dummy timeout handle that never fires (for interface compatibility)
          const dummyTimeoutHandle = setTimeout(() => {}, 365 * 24 * 60 * 60 * 1000); // 1 year (effectively never)

          room.disconnectedPlayers.set(player.id, { player, disconnectTime, timeoutHandle: dummyTimeoutHandle });
          console.log(`Player ${player.name} disconnected from ${room.game?.status === "finished" ? "finished" : "active"} game - allowing reconnection indefinitely`);

          // Notify others that player disconnected (but only if game is active)
          if (!room.game || room.game.status !== "finished") {
            broadcastToRoom(room, {
              type: "player_disconnected",
              playerId: player.id,
              playerName: player.name,
            });
          }

          // Check if room should be deleted (only if all players left explicitly, not just disconnected)
          // Only delete if no active AND no disconnected players
          if (room.players.length === 0 && room.disconnectedPlayers.size === 0) {
            if (room.game?.rematchState.countdownHandle) {
              clearInterval(room.game.rematchState.countdownHandle);
            }
            if (room.game?.gameTimerHandle) {
              clearTimeout(room.game.gameTimerHandle);
            }
            rooms.delete(room.id);
            console.log(`Room ${room.id} deleted (all players left)`);
          } else if (room.players.length > 0) {
            // Update host if needed (only if there are still active players)
            if (room.hostId === player.id) {
              room.hostId = room.players[0].id;
              broadcastToRoom(room, {
                type: "host_changed",
                newHostId: room.hostId,
              });
            }

            // Notify remaining players
            broadcastToRoom(room, {
              type: "players_updated",
              players: room.players.map((p) => ({ 
                id: p.id, 
                name: p.name, 
                isHost: p.id === room!.hostId,
                isReady: room!.readyPlayers.has(p.id)
              })),
              hostId: room.hostId,
              readyPlayers: Array.from(room.readyPlayers),
            });
          }
        }
        players.delete(ws);
      }
    });
  });

  // Check if room should be deleted (only if no players left)
  function checkAndDeleteRoomIfNeeded(room: Room): boolean {
    const totalPlayers = room.players.length + room.disconnectedPlayers.size;

    // Only delete room if NO players are left (not even the host)
    if (totalPlayers === 0) {
      // Clean up all timers
      if (room.game?.rematchState.countdownHandle) {
        clearInterval(room.game.rematchState.countdownHandle);
      }
      if (room.game?.gameTimerHandle) {
        clearTimeout(room.game.gameTimerHandle);
      }
      room.disconnectedPlayers.forEach((disconnected) => {
        clearTimeout(disconnected.timeoutHandle);
      });

      rooms.delete(room.id);
      console.log(`Room ${room.id} deleted (no players left)`);
      return true;
    }

    return false;
  }

  // Send current game results to ALL finished players
  function sendResultsToAllFinishedPlayers(room: Room, reason: string = "player_finished") {
    if (!room.game) return;

    const results = calculateGameResults(room);

    // Store results for reconnecting players
    room.game.lastResults = {
      winners: results.winners,
      losers: results.losers,
      stillPlaying: results.stillPlaying,
      reason: reason,
    };

    // Send updated results to ALL connected players who have finished
    room.players.forEach((player) => {
      const playerData = room.game!.players.get(player.id);
      if (playerData && playerData.finished) {
        send(player.ws, {
          type: "game_results",
          winners: results.winners,
          losers: results.losers,
          stillPlaying: results.stillPlaying,
          sharedSecret: room.game!.sharedSecret,
          reason: reason,
        });
      }
    });
  }

  function checkGameEnd(room: Room) {
    if (!room.game || room.game.status !== "playing") return;

    const allGamePlayers = Array.from(room.game.players.values());
    const allPlayersFinished = allGamePlayers.every(p => p.finished);

    // Only end game when ALL players have finished (won, lost, or timed out)
    // Do NOT auto-win the last remaining player - they must play until they finish naturally
    if (allPlayersFinished && room.game) {
      room.game.status = "finished";
      room.game.endTime = Date.now();

      // Clear the game timer since game is ending
      if (room.game.gameTimerHandle) {
        clearTimeout(room.game.gameTimerHandle);
        room.game.gameTimerHandle = undefined;
      }

      // Send final results to ALL finished players (everyone at this point)
      sendResultsToAllFinishedPlayers(room, "all_finished");
    }
  }

  function calculateGameResults(room: Room) {
    if (!room.game) return { winners: [], losers: [], stillPlaying: [] };

    const winners: any[] = [];
    const losers: any[] = [];
    const stillPlaying: any[] = [];

    room.game.players.forEach((playerData) => {
      const endTime = playerData.endTime || Date.now();
      const playerInfo = {
        playerId: playerData.playerId,
        playerName: playerData.playerName,
        attempts: playerData.attempts.length,
        duration: endTime - playerData.startTime,
        attemptsDetails: playerData.attempts,
      };

      if (playerData.won) {
        winners.push(playerInfo);
      } else if (playerData.finished) {
        losers.push(playerInfo);
      } else {
        stillPlaying.push(playerInfo);
      }
    });

    // Sort winners: first by attempts (ascending), then by duration (ascending)
    winners.sort((a, b) => {
      if (a.attempts !== b.attempts) {
        return a.attempts - b.attempts;
      }
      return a.duration - b.duration;
    });

    // Sort losers by duration (ascending) - those who lasted longer are ranked better among losers
    losers.sort((a, b) => b.duration - a.duration);

    // Assign ranks to winners
    winners.forEach((winner, index) => {
      winner.rank = index + 1;
    });

    return { winners, losers, stillPlaying };
  }

  function handleMessage(ws: WebSocket, message: any) {
    switch (message.type) {
      case "create_room": {
        const result = gameStorage.createRoom(message.playerName, message.gameMode);
        const { room: gsRoom, playerId, sessionToken } = result;

        const player: Player = {
          id: playerId,
          name: message.playerName,
          ws,
          roomId: gsRoom.id,
        };

        const room: Room = {
          id: gsRoom.id,
          hostId: playerId,
          players: [player],
          disconnectedPlayers: new Map(),
          game: null,
          settings: gsRoom.settings as any,
          readyPlayers: new Set(),
        };

        rooms.set(gsRoom.id, room);
        players.set(ws, player);

        gameStorage.setPlayerConnection(playerId, ws);
        const gsPlayer = gsRoom.players.find((p: gameStorage.Player) => p.id === playerId);
        if (gsPlayer) {
          gsPlayer.ws = ws;
        }

        send(ws, {
          type: "room_created",
          roomId: gsRoom.id,
          playerId,
          sessionToken,
          hostId: playerId,
          players: [{ id: playerId, name: message.playerName, isHost: true, isReady: false }],
          readyPlayers: [],
        });

        console.log(`[create_room] Room ${gsRoom.id} created by ${message.playerName} (${playerId})`);
        break;
      }

      case "join_room": {
        const roomCode = message.roomId.toUpperCase();
        const joinResult = gameStorage.joinRoom(message.playerName, roomCode);

        if ("error" in joinResult) {
          send(ws, { type: "error", message: joinResult.error });
          return;
        }

        const { room: gsRoom, playerId, sessionToken } = joinResult;

        let room = rooms.get(roomCode);
        if (!room) {
          send(ws, { type: "error", message: "الغرفة غير موجودة" });
          return;
        }

        const player: Player = {
          id: playerId,
          name: message.playerName,
          ws,
          roomId: room.id,
        };

        if (!room.disconnectedPlayers) {
          room.disconnectedPlayers = new Map();
        }

        room.players.push(player);
        players.set(ws, player);

        gameStorage.setPlayerConnection(playerId, ws);
        const gsPlayer = gsRoom.players.find((p: gameStorage.Player) => p.id === playerId);
        if (gsPlayer) {
          gsPlayer.ws = ws;
        }

        send(ws, {
          type: "room_joined",
          roomId: room.id,
          playerId,
          sessionToken,
          hostId: room.hostId,
          players: room.players.map((p) => ({ id: p.id, name: p.name, isHost: p.id === room!.hostId, isReady: room!.readyPlayers.has(p.id) })),
          readyPlayers: Array.from(room.readyPlayers),
        });

        send(ws, {
          type: "settings_updated",
          settings: room.settings,
        });

        broadcastToRoom(room, {
          type: "players_updated",
          players: room.players.map((p) => ({ id: p.id, name: p.name, isHost: p.id === room!.hostId, isReady: room!.readyPlayers.has(p.id) })),
          hostId: room.hostId,
          readyPlayers: Array.from(room.readyPlayers),
        });

        console.log(`[join_room] Player ${message.playerName} (${playerId}) joined room ${roomCode}`);
        break;
      }

      case "update_settings": {
        const player = players.get(ws);
        if (!player) return;

        const room = rooms.get(player.roomId);
        if (!room) return;

        // Only host can update settings
        if (room.hostId !== player.id) {
          send(ws, { type: "error", message: "Only host can update settings" });
          return;
        }

        // Can't update during active game
        if (room.game && room.game.status === "playing") {
          send(ws, { type: "error", message: "Cannot update settings during game" });
          return;
        }

        // Deep merge settings to properly update cardSettings and other nested properties
        room.settings = {
          ...room.settings,
          ...message.settings,
          cardSettings: message.settings.cardSettings 
            ? { ...room.settings.cardSettings, ...message.settings.cardSettings }
            : room.settings.cardSettings,
        };

        console.log(`[update_settings] Room ${room.id} - roundDuration: ${room.settings.cardSettings?.roundDuration}, cardsEnabled: ${room.settings.cardsEnabled}`);

        broadcastToRoom(room, {
          type: "settings_updated",
          settings: room.settings,
        });
        break;
      }

      case "toggle_ready": {
        const player = players.get(ws);
        if (!player) return;

        const room = rooms.get(player.roomId);
        if (!room) return;

        // Can't toggle ready during active game
        if (room.game && room.game.status === "playing") {
          send(ws, { type: "error", message: "لا يمكن تغيير حالة الاستعداد أثناء اللعب" });
          return;
        }

        // Toggle ready state based on current server state (not client input for security)
        const wasReady = room.readyPlayers.has(player.id);
        if (wasReady) {
          room.readyPlayers.delete(player.id);
        } else {
          room.readyPlayers.add(player.id);
        }

        console.log(`[toggle_ready] Player ${player.name} (${player.id}) is now ${!wasReady ? 'ready' : 'not ready'}. Room ${room.id} has ${room.readyPlayers.size} ready players.`);

        // Broadcast ready state to all players
        broadcastToRoom(room, {
          type: "ready_players_updated",
          readyPlayers: Array.from(room.readyPlayers),
        });
        break;
      }

      case "notify_ready": {
        const player = players.get(ws);
        if (!player) return;

        const room = rooms.get(player.roomId);
        if (!room) return;

        // Only host can send notifications
        if (room.hostId !== player.id) {
          send(ws, { type: "error", message: "فقط قائد الغرفة يمكنه إرسال التنبيهات" });
          return;
        }

        console.log(`[notify_ready] Host ${player.name} is notifying players to get ready in room ${room.id}`);

        // Broadcast notification to all players in the room
        broadcastToRoom(room, {
          type: "ready_notification",
          message: "القائد يطلب منك الاستعداد للعب!",
        });
        break;
      }

      case "start_game": {
        const player = players.get(ws);
        if (!player) return;

        const room = rooms.get(player.roomId);
        if (!room) return;

        // Only host can start game
        if (room.hostId !== player.id) {
          send(ws, { type: "error", message: "فقط قائد الغرفة يمكنه بدء اللعبة" });
          return;
        }

        // Need at least 2 players
        if (room.players.length < 2) {
          send(ws, { type: "error", message: "يجب أن يكون هناك لاعبان على الأقل" });
          return;
        }

        // Check if this is a force start or a restart after a game
        const forceStart = (message as any).forceStart === true;
        const isRestart = (message as any).isRestart === true;

        // Also skip ready check if there's a finished game (meaning this is a restart from lobby)
        const hasFinishedGame = room.game && room.game.status === "finished";

        // Skip ready check if this is a restart after a game ended
        if (!isRestart && !forceStart && !hasFinishedGame) {
          // Count ready players - host is automatically counted as ready
          // So we need at least 1 other ready player (total effective ready = readyPlayers + host if not in set)
          const hostIsInReadySet = room.readyPlayers.has(room.hostId);
          const effectiveReadyCount = hostIsInReadySet ? room.readyPlayers.size : room.readyPlayers.size + 1;

          // Need at least 2 ready players (host + 1 other), unless force starting
          if (effectiveReadyCount < 2) {
            send(ws, { type: "error", message: "يجب أن يكون هناك لاعب واحد جاهز على الأقل (القائد جاهز تلقائياً)" });
            return;
          }
        }

        console.log(`[start_game] Force start: ${forceStart}, isRestart: ${isRestart}, hasFinishedGame: ${hasFinishedGame}`);

        // Clear ready states for the new game
        room.readyPlayers.clear();

        // Generate shared secret
        const sharedSecret = generateSecretCode(room.settings.numDigits);

        // Initialize game session - start in pre-game challenge mode
        const game: GameSession = {
          sharedSecret,
          status: "pre_game_challenge",
          players: new Map(),
          startTime: Date.now(),
          endTime: null,
          challengesCompleted: new Set(),
          rematchState: {
            requested: false,
            votes: new Map(),
            countdown: null,
          },
        };

        // Initialize player data
        room.players.forEach((p) => {
          game.players.set(p.id, {
            playerId: p.id,
            playerName: p.name,
            attempts: [],
            startTime: Date.now(),
            endTime: null,
            won: false,
            finished: false,
          });
        });

        room.game = game;

        // Only start game timer immediately if cards are NOT enabled
        // If cards are enabled, timer starts after all players complete challenges
        const cardsEnabled = room.settings.cardsEnabled ?? false;
        console.log(`[start_game] Room ${room.id} - cardsEnabled: ${cardsEnabled}, cardSettings: ${JSON.stringify(room.settings.cardSettings)}`);
        if (!cardsEnabled) {
          // No challenges - start playing immediately
          const gameStartTime = Date.now();
          game.status = "playing";
          game.startTime = gameStartTime;

          // Update all player startTimes
          game.players.forEach((playerData) => {
            playerData.startTime = gameStartTime;
          });

          const roundDurationMinutes = room.settings.cardSettings?.roundDuration ?? 5;
          const timerDuration = roundDurationMinutes * 60 * 1000;
          console.log(`Cards disabled - Starting game timer immediately: ${roundDurationMinutes} minutes (${timerDuration}ms) for room ${room.id}`);
          const gameTimerHandle = setTimeout(() => {
            console.log(`${roundDurationMinutes}-minute timer expired for room ${room.id}`);
            if (room.game && room.game.status === "playing") {
              room.game.players.forEach((playerData) => {
                if (!playerData.finished) {
                  playerData.finished = true;
                  playerData.endTime = Date.now();
                  playerData.won = false;
                }
              });
              room.game.status = "finished";
              room.game.endTime = Date.now();
              room.game.gameTimerHandle = undefined;
              sendResultsToAllFinishedPlayers(room, "time_expired");
            }
          }, timerDuration);
          game.gameTimerHandle = gameTimerHandle;
        }

        // Broadcast game start to all players with server start time for sync
        // Ensure cardSettings is always included
        const settingsToSend = {
          ...room.settings,
          cardSettings: room.settings.cardSettings || {
            roundDuration: 5,
            maxCards: 3,
            revealNumberShowPosition: true,
            burnNumberCount: 1,
            revealParitySlots: 4,
            freezeDuration: 5000,
            shieldDuration: 5000
          }
        };

        broadcastToRoom(room, {
          type: "game_started",
          sharedSecret, // All players get the same secret
          settings: settingsToSend,
          serverStartTime: cardsEnabled ? 0 : game.startTime, // 0 means wait for challenges to complete
        });
        break;
      }

      case "challenges_completed": {
        const player = players.get(ws);
        if (!player) return;

        const room = rooms.get(player.roomId);
        if (!room || !room.game) return;

        // Mark this player as completed challenges
        room.game.challengesCompleted.add(player.id);

        // Check if all players completed challenges
        if (room.game.challengesCompleted.size === room.players.length) {
          // All players completed challenges - start the actual game
          room.game.status = "playing";
          const gameStartTime = Date.now();
          room.game.startTime = gameStartTime;

          // Update all player startTimes to match the actual game start time
          room.game.players.forEach((playerData) => {
            playerData.startTime = gameStartTime;
          });

          // Clear any existing timer and restart the game timer based on roundDuration
          if (room.game.gameTimerHandle) {
            clearTimeout(room.game.gameTimerHandle);
          }

          const roundDurationMinutes = room.settings.cardSettings?.roundDuration ?? 5;
          const timerDuration = roundDurationMinutes * 60 * 1000;
          console.log(`Starting game timer: ${roundDurationMinutes} minutes (${timerDuration}ms) for room ${room.id}`);
          const gameTimerHandle = setTimeout(() => {
            console.log(`${roundDurationMinutes}-minute timer expired for room ${room.id}`);
            if (room.game && room.game.status === "playing") {
              room.game.players.forEach((playerData) => {
                if (!playerData.finished) {
                  playerData.finished = true;
                  playerData.endTime = Date.now();
                  playerData.won = false;
                }
              });
              room.game.status = "finished";
              room.game.endTime = Date.now();
              room.game.gameTimerHandle = undefined;
              sendResultsToAllFinishedPlayers(room, "time_expired");
            }
          }, timerDuration);

          room.game.gameTimerHandle = gameTimerHandle;

          // Notify all players game is starting with server timestamp for sync
          broadcastToRoom(room, {
            type: "game_starting",
            message: "جميع اللاعبين انتهوا من التحديات - بدء اللعبة!",
            serverStartTime: room.game.startTime,
          });
        }
        break;
      }

      case "submit_guess": {
        const player = players.get(ws);
        if (!player) return;

        const room = rooms.get(player.roomId);
        if (!room || !room.game) return;

        const playerData = room.game.players.get(player.id);
        if (!playerData) return;

        // Check if player already finished
        if (playerData.finished) {
          send(ws, { type: "error", message: "You have already finished" });
          return;
        }

        // Check if max attempts already reached (shouldn't happen but safety check)
        if (playerData.attempts.length >= room.settings.maxAttempts) {
          send(ws, { type: "error", message: "لقد استنفذت جميع محاولاتك بالفعل" });
          return;
        }

        const { correctCount, correctPositionCount } = checkGuess(room.game.sharedSecret, message.guess);

        const attempt: PlayerAttempt = {
          guess: message.guess,
          correctCount,
          correctPositionCount,
          timestamp: Date.now(),
        };

        playerData.attempts.push(attempt);

        const won = correctPositionCount === room.settings.numDigits;
        const isLastAttempt = playerData.attempts.length >= room.settings.maxAttempts;

        // Mark as finished if won OR if this was the last attempt and didn't win
        if (won) {
          playerData.won = true;
          playerData.finished = true;
          playerData.endTime = Date.now();
        } else if (isLastAttempt) {
          // Out of attempts and didn't win - mark as loser
          playerData.won = false;
          playerData.finished = true;
          playerData.endTime = Date.now();
        }

        // Send result to the player
        send(ws, {
          type: "guess_result",
          guess: message.guess,
          correctCount,
          correctPositionCount,
          won,
          attemptNumber: playerData.attempts.length,
          isLastAttempt,
        });

        // Broadcast to others that this player made an attempt
        broadcastToRoom(room, {
          type: "player_attempt",
          playerId: player.id,
          playerName: player.name,
          attemptNumber: playerData.attempts.length,
          guess: message.guess,
          correctCount,
          correctPositionCount,
          won,
        }, ws);

        // If player just finished (won or ran out of attempts), send updated results
        if (playerData.finished) {
          if (isLastAttempt && !won) {
            // Notify player they're out of attempts
            send(ws, {
              type: "max_attempts_reached",
              message: "لقد استنفذت جميع محاولاتك",
            });
          }

          sendResultsToAllFinishedPlayers(room, "player_finished");
          // Check if all players finished for final cleanup
          checkGameEnd(room);
        }
        break;
      }

      case "request_attempt_details": {
        const player = players.get(ws);
        if (!player) return;

        const room = rooms.get(player.roomId);
        if (!room || !room.game) return;

        const targetPlayerData = room.game.players.get(message.targetPlayerId);
        if (!targetPlayerData) return;

        send(ws, {
          type: "player_details",
          playerId: targetPlayerData.playerId,
          playerName: targetPlayerData.playerName,
          attempts: targetPlayerData.attempts,
          duration: targetPlayerData.endTime ? targetPlayerData.endTime - targetPlayerData.startTime : 0,
        });
        break;
      }

      case "request_rematch": {
        const player = players.get(ws);
        if (!player) return;

        const room = rooms.get(player.roomId);
        if (!room || !room.game) return;

        // Game must be finished
        if (room.game.status !== "finished") {
          send(ws, { type: "error", message: "Game is not finished yet" });
          return;
        }

        // Check if rematch already requested
        if (room.game.rematchState.requested) {
          send(ws, { type: "error", message: "Rematch already requested" });
          return;
        }

        // Initialize rematch state
        room.game.rematchState.requested = true;
        room.game.rematchState.votes.clear();
        room.game.rematchState.countdown = 10;

        // Player who requested automatically votes yes
        room.game.rematchState.votes.set(player.id, true);

        // Broadcast rematch request with current votes
        broadcastToRoom(room, {
          type: "rematch_requested",
          countdown: 10,
          requestedBy: player.name,
          votes: Array.from(room.game.rematchState.votes.entries()).map(([playerId, accepted]) => ({
            playerId,
            accepted,
          })),
        });

        // Start countdown
        const countdownHandle = setInterval(() => {
          if (!room.game || !room.game.rematchState.countdown) {
            clearInterval(countdownHandle);
            return;
          }

          room.game.rematchState.countdown--;

          if (room.game.rematchState.countdown <= 0) {
            clearInterval(countdownHandle);

            // Process rematch
            const acceptedPlayers = Array.from(room.game.rematchState.votes.entries())
              .filter(([_, accepted]) => accepted)
              .map(([playerId, _]) => playerId);

            // Need at least 2 players who accepted
            if (acceptedPlayers.length >= 2) {
              // Remove players who didn't accept
              const rejectedPlayers = room.players.filter(
                p => !acceptedPlayers.includes(p.id) && p.id !== room.hostId
              );

              rejectedPlayers.forEach(p => {
                send(p.ws, {
                  type: "kicked_from_room",
                  message: "لم تقبل إعادة المباراة",
                });
              });

              room.players = room.players.filter(p => 
                acceptedPlayers.includes(p.id) || p.id === room.hostId
              );

              // Reset game
              room.game = null;

              broadcastToRoom(room, {
                type: "rematch_starting",
                players: room.players.map((p) => ({ id: p.id, name: p.name })),
              });
            } else {
              broadcastToRoom(room, {
                type: "rematch_cancelled",
                message: "لم يكن هناك لاعبين كافيين",
              });
              room.game.rematchState.requested = false;
            }
          } else {
            broadcastToRoom(room, {
              type: "rematch_countdown",
              countdown: room.game.rematchState.countdown,
              votes: Array.from(room.game.rematchState.votes.entries()).map(([playerId, accepted]) => ({
                playerId,
                accepted,
              })),
            });
          }
        }, 1000);

        room.game.rematchState.countdownHandle = countdownHandle;
        break;
      }

      case "request_rematch_state": {
        const player = players.get(ws);
        if (!player) return;

        const room = rooms.get(player.roomId);
        if (!room || !room.game) return;

        // If there's an active rematch request, send it to the player
        if (room.game.rematchState && room.game.rematchState.requested && room.game.rematchState.countdown !== null) {
          send(ws, {
            type: "rematch_requested",
            countdown: room.game.rematchState.countdown,
            votes: Array.from(room.game.rematchState.votes.entries()).map(([playerId, accepted]) => ({
              playerId,
              accepted,
            })),
          });
        }
        break;
      }

      case "rematch_vote": {
        const player = players.get(ws);
        if (!player) return;

        const room = rooms.get(player.roomId);
        if (!room || !room.game) return;

        if (!room.game.rematchState.requested) {
          send(ws, { type: "error", message: "No rematch requested" });
          return;
        }

        room.game.rematchState.votes.set(player.id, message.accepted);

        // Broadcast updated votes
        broadcastToRoom(room, {
          type: "rematch_vote_update",
          playerId: player.id,
          accepted: message.accepted,
          votes: Array.from(room.game.rematchState.votes.entries()).map(([playerId, accepted]) => ({
            playerId,
            accepted,
          })),
        });

        // Check if we have at least 2 acceptances - if so, start immediately
        const acceptedPlayers = Array.from(room.game.rematchState.votes.entries())
          .filter(([_, accepted]) => accepted)
          .map(([playerId, _]) => playerId);

        if (acceptedPlayers.length >= 2) {
          // Clear the countdown timer
          if (room.game.rematchState.countdownHandle) {
            clearInterval(room.game.rematchState.countdownHandle);
          }

          // Remove players who didn't accept
          const rejectedPlayers = room.players.filter(
            p => !acceptedPlayers.includes(p.id) && p.id !== room.hostId
          );

          rejectedPlayers.forEach(p => {
            send(p.ws, {
              type: "kicked_from_room",
              message: "لم تقبل إعادة المباراة",
            });
          });

          room.players = room.players.filter(p => 
            acceptedPlayers.includes(p.id) || p.id === room.hostId
          );

          // Remove players from disconnected as well
          rejectedPlayers.forEach(p => {
            room.disconnectedPlayers?.delete(p.id);
          });

          // Reset game
          room.game = null;

          // Notify accepted players that rematch is starting
          broadcastToRoom(room, {
            type: "rematch_starting",
            players: room.players.map((p) => ({ id: p.id, name: p.name })),
          });

          // Start new game automatically
          const sharedSecret = generateSecretCode(room.settings.numDigits);
          const game: GameSession = {
            sharedSecret,
            status: "pre_game_challenge",
            startTime: Date.now(),
            endTime: null,
            players: new Map(),
            lastResults: undefined,
            gameTimerHandle: undefined,
            challengesCompleted: new Set(),
            rematchState: {
              requested: false,
              votes: new Map(),
              countdown: null,
            },
          };

          // Initialize player data
          room.players.forEach((p) => {
            game.players.set(p.id, {
              playerId: p.id,
              playerName: p.name,
              attempts: [],
              startTime: Date.now(),
              endTime: null,
              won: false,
              finished: false,
            });
          });

          // Start 5-minute game timer
          const gameTimerHandle = setTimeout(() => {
            console.log(`5-minute timer expired for room ${room.id}`);
            if (room.game && room.game.status === "playing") {
              room.game.players.forEach((playerData) => {
                if (!playerData.finished) {
                  playerData.finished = true;
                  playerData.endTime = Date.now();
                  playerData.won = false;
                }
              });

              room.game.status = "finished";
              room.game.endTime = Date.now();
              room.game.gameTimerHandle = undefined;

              sendResultsToAllFinishedPlayers(room, "time_expired");
            }
          }, 5 * 60 * 1000);

          game.gameTimerHandle = gameTimerHandle;
          room.game = game;

          // Broadcast game start
          broadcastToRoom(room, {
            type: "game_started",
            sharedSecret,
            settings: room.settings,
          });
        }
        break;
      }

      case "reconnect": {
        const roomCode = message.roomCode || message.roomId;
        if (!roomCode) {
          send(ws, { type: "error", message: "رمز الغرفة مطلوب" });
          return;
        }

        const gsResult = gameStorage.reconnectPlayer(message.sessionToken, roomCode.toUpperCase());

        if ("error" in gsResult) {
          const room = rooms.get(roomCode.toUpperCase());
          if (!room) {
            send(ws, { type: "error", message: gsResult.error });
            return;
          }

          const disconnected = room.disconnectedPlayers?.get(message.playerId);
          if (!disconnected) {
            send(ws, { type: "error", message: gsResult.error });
            return;
          }

          clearTimeout(disconnected.timeoutHandle);
          room.disconnectedPlayers.delete(message.playerId);

          const playerName = message.playerName && message.playerName.trim() !== "" 
            ? message.playerName 
            : disconnected.player.name;

          const reconnectedPlayer: Player = {
            id: message.playerId,
            name: playerName,
            ws,
            roomId: room.id,
          };

          room.players.push(reconnectedPlayer);
          players.set(ws, reconnectedPlayer);

          handleReconnectSuccess(ws, room, message.playerId, playerName);
          return;
        }

        const { room: gsRoom, player: gsPlayer } = gsResult;

        let room = rooms.get(gsRoom.id);
        if (!room) {
          send(ws, { type: "error", message: "الغرفة غير موجودة" });
          return;
        }

        room.disconnectedPlayers?.delete(gsPlayer.id);

        const existingPlayerIndex = room.players.findIndex(p => p.id === gsPlayer.id);
        if (existingPlayerIndex !== -1) {
          room.players[existingPlayerIndex].ws = ws;
        } else {
          const reconnectedPlayer: Player = {
            id: gsPlayer.id,
            name: gsPlayer.name,
            ws,
            roomId: room.id,
          };
          room.players.push(reconnectedPlayer);
        }

        players.set(ws, { id: gsPlayer.id, name: gsPlayer.name, ws, roomId: room.id });
        gameStorage.setPlayerConnection(gsPlayer.id, ws);
        gsPlayer.ws = ws;

        handleReconnectSuccess(ws, room, gsPlayer.id, gsPlayer.name);
        break;
      }

      case "transfer_host": {
        const player = players.get(ws);
        if (!player) return;

        const room = rooms.get(player.roomId);
        if (!room) return;

        if (room.hostId !== player.id) {
          send(ws, { type: "error", message: "فقط المضيف يمكنه نقل القيادة" });
          return;
        }

        const newHostId = message.newHostId;
        const newHost = room.players.find(p => p.id === newHostId);

        if (!newHost) {
          send(ws, { type: "error", message: "اللاعب غير موجود" });
          return;
        }

        const gsResult = gameStorage.transferHost(room.id, player.id, newHostId);
        if (!gsResult.success) {
          send(ws, { type: "error", message: gsResult.error });
          return;
        }

        room.hostId = newHostId;

        broadcastToRoom(room, {
          type: "host_changed",
          newHostId: newHostId,
          newHostName: newHost.name,
        });

        broadcastToRoom(room, {
          type: "players_updated",
          players: room.players.map((p) => ({ 
            id: p.id, 
            name: p.name, 
            isHost: p.id === newHostId,
            isReady: room!.readyPlayers.has(p.id)
          })),
          hostId: newHostId,
          readyPlayers: Array.from(room.readyPlayers),
        });

        console.log(`[transfer_host] Host transferred from ${player.name} to ${newHost.name} in room ${room.id}`);
        break;
      }

      case "kick_player": {
        const player = players.get(ws);
        if (!player) return;

        const room = rooms.get(player.roomId);
        if (!room) return;

        if (room.hostId !== player.id) {
          send(ws, { type: "error", message: "فقط المضيف يمكنه طرد اللاعبين" });
          return;
        }

        const targetPlayerId = message.targetPlayerId;

        if (targetPlayerId === player.id) {
          send(ws, { type: "error", message: "لا يمكنك طرد نفسك" });
          return;
        }

        const targetPlayer = room.players.find(p => p.id === targetPlayerId);
        if (!targetPlayer) {
          send(ws, { type: "error", message: "اللاعب غير موجود" });
          return;
        }

        const gsResult = gameStorage.kickPlayer(room.id, player.id, targetPlayerId);
        if (!gsResult.success) {
          send(ws, { type: "error", message: gsResult.error });
          return;
        }

        // Send kick message to target player immediately
        send(targetPlayer.ws, {
          type: "kicked_from_room",
          message: "تم طردك من الغرفة من قبل المضيف",
        });

        // Remove player immediately from room
        room.players = room.players.filter(p => p.id !== targetPlayerId);
        room.readyPlayers.delete(targetPlayerId);
        players.delete(targetPlayer.ws);
        gameStorage.removePlayerConnection(targetPlayer.ws);

        // Notify others that player was kicked
        broadcastToRoom(room, {
          type: "player_kicked",
          playerId: targetPlayerId,
          playerName: targetPlayer.name,
        });

        // Send updated players list to all remaining players
        broadcastToRoom(room, {
          type: "players_updated",
          players: room.players.map((p) => ({ 
            id: p.id, 
            name: p.name, 
            isHost: p.id === room!.hostId,
            isReady: room!.readyPlayers.has(p.id)
          })),
          hostId: room.hostId,
          readyPlayers: Array.from(room.readyPlayers),
        });

        console.log(`[kick_player] Player ${targetPlayer.name} kicked from room ${room.id} by ${player.name}`);
        break;
      }

      case "leave_room": {
        const player = players.get(ws);
        if (!player) return;

        const room = rooms.get(player.roomId);
        if (!room) return;

        // Handle cleanup (same as disconnect)
        if (room.game && room.game.status === "playing") {
          const playerData = room.game.players.get(player.id);
          if (playerData && !playerData.finished) {
            playerData.finished = true;
            playerData.endTime = Date.now();

            broadcastToRoom(room, {
              type: "player_quit",
              playerId: player.id,
              playerName: player.name,
            }, ws);

            checkGameEnd(room);
          }
        }

        room.players = room.players.filter((p) => p.id !== player.id);

        // Check if room should be deleted
        if (!checkAndDeleteRoomIfNeeded(room)) {
          // Room still has enough players
          if (room.hostId === player.id && room.players.length > 0) {
            room.hostId = room.players[0].id;
            broadcastToRoom(room, {
              type: "host_changed",
              newHostId: room.hostId,
            });
          }

          broadcastToRoom(room, {
            type: "players_updated",
            players: room.players.map((p) => ({ id: p.id, name: p.name })),
            hostId: room.hostId,
          });
        }

        players.delete(ws);
        break;
      }

      case "use_card": {
        const player = players.get(ws);
        if (!player) return;

        const room = rooms.get(player.roomId);
        if (!room || !room.game || room.game.status !== "playing") return;

        // Get target player info
        const targetPlayer = message.targetPlayerId 
          ? room.players.find(p => p.id === message.targetPlayerId)
          : null;

        // Broadcast card usage to ALL players in the room (including the user)
        broadcastToRoom(room, {
          type: "card_used",
          fromPlayerId: player.id,
          fromPlayerName: player.name,
          targetPlayerId: message.targetPlayerId,
          targetPlayerName: targetPlayer?.name,
          cardType: message.cardType,
          cardId: message.cardId,
          effectDuration: message.effectDuration,
          effectValue: message.effectValue,
        });

        console.log(`[Cards] ${player.name} used ${message.cardType} on ${targetPlayer?.name || "self"}`);
        break;
      }
    }
  }

  function handleReconnectSuccess(ws: WebSocket, room: Room, playerId: string, playerName: string) {
    console.log(`Player ${playerName} reconnected to room ${room.id}`);

    const allPlayersInfo = [
      ...room.players.map((p) => ({ 
        id: p.id, 
        name: p.name,
        isHost: p.id === room.hostId,
        isReady: room.readyPlayers.has(p.id)
      })),
      ...Array.from(room.disconnectedPlayers?.entries() || []).map(([id, data]) => ({ 
        id, 
        name: data.player.name,
        isHost: false,
        isReady: false,
        disconnected: true 
      }))
    ];

    send(ws, {
      type: "room_rejoined",
      roomId: room.id,
      playerId: playerId,
      playerName: playerName,
      hostId: room.hostId,
      players: allPlayersInfo,
      readyPlayers: Array.from(room.readyPlayers),
    });

    if (room.game) {
      send(ws, {
        type: "game_state",
        sharedSecret: room.game.sharedSecret,
        status: room.game.status,
        settings: room.settings,
        gameStartTime: room.game.startTime,
      });

      const playerData = room.game.players.get(playerId);
      if (playerData) {
        send(ws, {
          type: "player_game_state",
          attempts: playerData.attempts,
          finished: playerData.finished,
          won: playerData.won,
        });

        if (playerData.finished) {
          const freshResults = calculateGameResults(room);
          const reason = room.game.lastResults?.reason || "player_finished";
          send(ws, {
            type: "game_results",
            winners: freshResults.winners,
            losers: freshResults.losers,
            stillPlaying: freshResults.stillPlaying,
            sharedSecret: room.game.sharedSecret,
            reason: reason,
          });
        }
      }
    }

    broadcastToRoom(room, {
      type: "player_reconnected",
      playerId: playerId,
      playerName: playerName,
    }, ws);

    const allPlayersForBroadcast = [
      ...room.players.map((p) => ({ 
        id: p.id, 
        name: p.name,
        isHost: p.id === room.hostId,
        isReady: room.readyPlayers.has(p.id)
      })),
      ...Array.from(room.disconnectedPlayers?.entries() || []).map(([id, data]) => ({ 
        id, 
        name: data.player.name,
        isHost: false,
        isReady: false,
        disconnected: true 
      }))
    ];

    broadcastToRoom(room, {
      type: "players_updated",
      players: allPlayersForBroadcast,
      hostId: room.hostId,
      readyPlayers: Array.from(room.readyPlayers),
    });
  }

  function send(ws: WebSocket, message: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  function broadcastToRoom(room: Room, message: any, exclude?: WebSocket) {
    room.players.forEach((player) => {
      if (player.ws !== exclude) {
        send(player.ws, message);
      }
    });
  }

  return httpServer;
}