import { useState, useEffect, useRef } from "react";
import { Bell, X, Check, Users, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAccount, loadNotifications, markNotificationRead, markAllNotificationsRead, loadUnreadCount } from "@/lib/stores/useAccount";

export function NotificationsDropdown() {
  const navigate = useNavigate();
  const { account, notifications, unreadCount, setNotifications, setUnreadCount } = useAccount();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (account) {
      loadNotifications(account.id);
      loadUnreadCount(account.id);
    }
  }, [account]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!account) return null;

  const handleNotificationClick = async (notification: typeof notifications[0]) => {
    if (!notification.isRead) {
      await markNotificationRead(notification.id);
    }

    if (notification.type === "room_invite" && notification.data) {
      try {
        const data = JSON.parse(notification.data);
        if (data.roomId) {
          navigate(`/room/${data.roomId}`);
          setIsOpen(false);
        }
      } catch (err) {
        console.error("Error parsing notification data:", err);
      }
    }
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead(account.id);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "friend_request":
        return <UserPlus className="w-5 h-5 text-blue-500" />;
      case "friend_accepted":
        return <Check className="w-5 h-5 text-green-500" />;
      case "room_invite":
        return <Users className="w-5 h-5 text-purple-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Bell className="w-6 h-6 text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50" dir="rtl">
          <div className="flex items-center justify-between p-3 bg-gray-50 border-b">
            <h3 className="font-bold text-gray-800">الإشعارات</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-sm text-blue-600 hover:underline"
              >
                قراءة الكل
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <Bell className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>لا توجد إشعارات</p>
              </div>
            ) : (
              notifications.slice(0, 10).map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-3 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                    !notification.isRead ? "bg-blue-50" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm">{notification.title}</p>
                      <p className="text-gray-600 text-sm">{notification.message}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(notification.createdAt).toLocaleDateString("ar-EG", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
