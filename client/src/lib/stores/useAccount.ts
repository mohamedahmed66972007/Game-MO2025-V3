import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Account {
  id: number;
  displayName: string;
  username: string;
  isOnline?: boolean;
  currentRoomId?: string | null;
}

export interface FriendRequest {
  id: number;
  fromUserId: number;
  toUserId: number;
  status: string;
  createdAt: string;
  fromUser?: Account;
  toUser?: Account;
}

export interface Notification {
  id: number;
  userId: number;
  type: string;
  title: string;
  message: string;
  data?: string;
  isRead: boolean;
  createdAt: string;
}

interface AccountState {
  account: Account | null;
  friends: Account[];
  friendRequests: FriendRequest[];
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  
  setAccount: (account: Account | null) => void;
  setFriends: (friends: Account[]) => void;
  addFriend: (friend: Account) => void;
  removeFriend: (friendId: number) => void;
  setFriendRequests: (requests: FriendRequest[]) => void;
  addFriendRequest: (request: FriendRequest) => void;
  removeFriendRequest: (requestId: number) => void;
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markNotificationAsRead: (notificationId: number) => void;
  setUnreadCount: (count: number) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAccount = create<AccountState>()(
  persist(
    (set) => ({
      account: null,
      friends: [],
      friendRequests: [],
      notifications: [],
      unreadCount: 0,
      isLoading: false,

      setAccount: (account) => set({ account }),
      
      setFriends: (friends) => set({ friends }),
      
      addFriend: (friend) => set((state) => ({
        friends: [...state.friends, friend],
      })),
      
      removeFriend: (friendId) => set((state) => ({
        friends: state.friends.filter((f) => f.id !== friendId),
      })),
      
      setFriendRequests: (friendRequests) => set({ friendRequests }),
      
      addFriendRequest: (request) => set((state) => ({
        friendRequests: [...state.friendRequests, request],
      })),
      
      removeFriendRequest: (requestId) => set((state) => ({
        friendRequests: state.friendRequests.filter((r) => r.id !== requestId),
      })),
      
      setNotifications: (notifications) => set({ notifications }),
      
      addNotification: (notification) => set((state) => ({
        notifications: [notification, ...state.notifications],
        unreadCount: state.unreadCount + 1,
      })),
      
      markNotificationAsRead: (notificationId) => set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === notificationId ? { ...n, isRead: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      })),
      
      setUnreadCount: (unreadCount) => set({ unreadCount }),
      
      setLoading: (isLoading) => set({ isLoading }),
      
      logout: () => set({
        account: null,
        friends: [],
        friendRequests: [],
        notifications: [],
        unreadCount: 0,
      }),
    }),
    {
      name: "account-storage",
      partialize: (state) => ({ account: state.account }),
    }
  )
);

export async function createAccount(displayName: string, username: string): Promise<Account> {
  const response = await fetch("/api/accounts/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ displayName, username }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "فشل إنشاء الحساب");
  }
  
  const account = await response.json();
  useAccount.getState().setAccount(account);
  return account;
}

export async function checkAccount(username: string): Promise<{ exists: boolean; account?: Account }> {
  const response = await fetch(`/api/accounts/check/${encodeURIComponent(username)}`);
  return response.json();
}

export async function searchAccounts(query: string): Promise<Account[]> {
  const response = await fetch(`/api/accounts/search?q=${encodeURIComponent(query)}`);
  return response.json();
}

export async function loadFriends(userId: number): Promise<Account[]> {
  const response = await fetch(`/api/friends/${userId}`);
  const friends = await response.json();
  useAccount.getState().setFriends(friends);
  return friends;
}

export async function sendFriendRequest(fromUserId: number, toUserId: number): Promise<void> {
  const response = await fetch("/api/friends/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fromUserId, toUserId }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "فشل إرسال طلب الصداقة");
  }
}

export async function loadFriendRequests(userId: number): Promise<FriendRequest[]> {
  const response = await fetch(`/api/friends/requests/${userId}`);
  const requests = await response.json();
  useAccount.getState().setFriendRequests(requests);
  return requests;
}

export async function acceptFriendRequest(requestId: number, userId: number): Promise<void> {
  const response = await fetch("/api/friends/accept", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requestId, userId }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "فشل قبول طلب الصداقة");
  }
  
  useAccount.getState().removeFriendRequest(requestId);
}

export async function rejectFriendRequest(requestId: number): Promise<void> {
  await fetch("/api/friends/reject", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requestId }),
  });
  
  useAccount.getState().removeFriendRequest(requestId);
}

export async function removeFriend(userId1: number, userId2: number): Promise<void> {
  await fetch("/api/friends/remove", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId1, userId2 }),
  });
  
  useAccount.getState().removeFriend(userId2);
}

export async function loadNotifications(userId: number): Promise<Notification[]> {
  const response = await fetch(`/api/notifications/${userId}`);
  const notifications = await response.json();
  useAccount.getState().setNotifications(notifications);
  return notifications;
}

export async function loadUnreadCount(userId: number): Promise<number> {
  const response = await fetch(`/api/notifications/unread/${userId}`);
  const { count } = await response.json();
  useAccount.getState().setUnreadCount(count);
  return count;
}

export async function markNotificationRead(notificationId: number): Promise<void> {
  await fetch("/api/notifications/markRead", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notificationId }),
  });
  
  useAccount.getState().markNotificationAsRead(notificationId);
}

export async function markAllNotificationsRead(userId: number): Promise<void> {
  await fetch("/api/notifications/markAllRead", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  
  const state = useAccount.getState();
  state.setNotifications(state.notifications.map((n) => ({ ...n, isRead: true })));
  state.setUnreadCount(0);
}

export async function sendRoomInvite(fromUserId: number, toUserId: number, roomId: string): Promise<{ success: boolean; isOnline: boolean }> {
  const response = await fetch("/api/invite/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fromUserId, toUserId, roomId }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "فشل إرسال الدعوة");
  }
  
  return response.json();
}
