import { useState, useEffect } from "react";
import { X, Search, UserPlus, Users, Check, XCircle, Loader2, Circle, Send } from "lucide-react";
import { useAccount, searchAccounts, sendFriendRequest, loadFriends, loadFriendRequests, acceptFriendRequest, rejectFriendRequest, removeFriend, sendRoomInvite, type Account, type FriendRequest } from "@/lib/stores/useAccount";
import { toast } from "sonner";

interface FriendsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  roomId?: string;
}

export function FriendsDialog({ isOpen, onClose, roomId }: FriendsDialogProps) {
  const { account, friends, friendRequests, setFriends, setFriendRequests } = useAccount();
  const [tab, setTab] = useState<"friends" | "search" | "requests">("friends");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Account[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && account) {
      loadFriends(account.id).then(setFriends);
      loadFriendRequests(account.id).then(setFriendRequests);
    }
  }, [isOpen, account]);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      setIsSearching(true);
      const timeout = setTimeout(async () => {
        try {
          const results = await searchAccounts(searchQuery);
          setSearchResults(results.filter((r) => r.id !== account?.id));
        } catch (err) {
          console.error("Search error:", err);
        } finally {
          setIsSearching(false);
        }
      }, 300);
      return () => clearTimeout(timeout);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, account?.id]);

  if (!isOpen || !account) return null;

  const handleSendRequest = async (toUserId: number) => {
    try {
      await sendFriendRequest(account.id, toUserId);
      toast.success("تم إرسال طلب الصداقة");
      setSearchResults(searchResults.filter((r) => r.id !== toUserId));
    } catch (err: any) {
      toast.error(err.message || "فشل إرسال طلب الصداقة");
    }
  };

  const handleAcceptRequest = async (requestId: number) => {
    try {
      await acceptFriendRequest(requestId, account.id);
      toast.success("تم قبول طلب الصداقة");
      loadFriends(account.id);
    } catch (err: any) {
      toast.error(err.message || "فشل قبول الطلب");
    }
  };

  const handleRejectRequest = async (requestId: number) => {
    try {
      await rejectFriendRequest(requestId);
      toast.info("تم رفض طلب الصداقة");
    } catch (err) {
      toast.error("فشل رفض الطلب");
    }
  };

  const handleRemoveFriend = async (friendId: number) => {
    try {
      await removeFriend(account.id, friendId);
      toast.info("تم إزالة الصديق");
    } catch (err) {
      toast.error("فشل إزالة الصديق");
    }
  };

  const handleInviteFriend = async (friendId: number) => {
    if (!roomId) return;
    try {
      const result = await sendRoomInvite(account.id, friendId, roomId);
      if (result.isOnline) {
        toast.success("تم إرسال الدعوة");
      } else {
        toast.info("تم إرسال إشعار بالدعوة (الصديق غير متصل)");
      }
    } catch (err: any) {
      toast.error(err.message || "فشل إرسال الدعوة");
    }
  };

  const isFriend = (userId: number) => friends.some((f) => f.id === userId);
  const hasPendingRequest = (userId: number) => {
    return friendRequests.some((r) => r.fromUserId === userId || r.toUserId === userId);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full max-h-[80vh] flex flex-col animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-500" />
            الأصدقاء
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setTab("friends")}
            className={`flex-1 py-2 px-3 rounded-lg font-semibold text-sm transition-colors ${
              tab === "friends" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            أصدقائي ({friends.length})
          </button>
          <button
            onClick={() => setTab("search")}
            className={`flex-1 py-2 px-3 rounded-lg font-semibold text-sm transition-colors ${
              tab === "search" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            بحث
          </button>
          <button
            onClick={() => setTab("requests")}
            className={`flex-1 py-2 px-3 rounded-lg font-semibold text-sm transition-colors relative ${
              tab === "requests" ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            الطلبات
            {friendRequests.length > 0 && (
              <span className="absolute -top-1 -left-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {friendRequests.length}
              </span>
            )}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {tab === "friends" && (
            <div className="space-y-2">
              {friends.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>لا يوجد أصدقاء بعد</p>
                  <p className="text-sm">ابحث عن أصدقاء وأضفهم!</p>
                </div>
              ) : (
                friends.map((friend) => (
                  <div key={friend.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                          {friend.displayName.charAt(0)}
                        </div>
                        <Circle 
                          className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 ${friend.isOnline ? 'text-green-500 fill-green-500' : 'text-gray-400 fill-gray-400'}`} 
                        />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{friend.displayName}</p>
                        <p className="text-sm text-gray-500 font-mono">@{friend.username}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {roomId && (
                        <button
                          onClick={() => handleInviteFriend(friend.id)}
                          className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                          title="دعوة للغرفة"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveFriend(friend.id)}
                        className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                        title="إزالة"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === "search" && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث باسم المستخدم..."
                  className="w-full pr-10 pl-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 font-mono"
                  dir="ltr"
                />
              </div>

              {isSearching ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center text-white font-bold">
                          {user.displayName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{user.displayName}</p>
                          <p className="text-sm text-gray-500 font-mono">@{user.username}</p>
                        </div>
                      </div>
                      {isFriend(user.id) ? (
                        <span className="text-green-600 text-sm font-semibold">صديق</span>
                      ) : hasPendingRequest(user.id) ? (
                        <span className="text-yellow-600 text-sm font-semibold">طلب معلق</span>
                      ) : (
                        <button
                          onClick={() => handleSendRequest(user.id)}
                          className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                        >
                          <UserPlus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : searchQuery.length >= 2 ? (
                <p className="text-center text-gray-500 py-4">لا توجد نتائج</p>
              ) : (
                <p className="text-center text-gray-500 py-4">أدخل حرفين على الأقل للبحث</p>
              )}
            </div>
          )}

          {tab === "requests" && (
            <div className="space-y-2">
              {friendRequests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <UserPlus className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>لا توجد طلبات صداقة</p>
                </div>
              ) : (
                friendRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                        {request.fromUser?.displayName?.charAt(0) || "?"}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{request.fromUser?.displayName}</p>
                        <p className="text-sm text-gray-500 font-mono">@{request.fromUser?.username}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAcceptRequest(request.id)}
                        className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRejectRequest(request.id)}
                        className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
