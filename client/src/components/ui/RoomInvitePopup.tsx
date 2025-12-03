import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, X, Check } from "lucide-react";

interface RoomInvite {
  roomId: string;
  fromUser: {
    id: number;
    displayName: string;
    username: string;
  };
}

export function RoomInvitePopup() {
  const navigate = useNavigate();
  const [pendingInvites, setPendingInvites] = useState<RoomInvite[]>([]);

  useEffect(() => {
    const handleInvite = (event: CustomEvent<RoomInvite>) => {
      setPendingInvites(prev => {
        const exists = prev.some(inv => inv.roomId === event.detail.roomId);
        if (exists) return prev;
        return [...prev, event.detail];
      });
    };

    window.addEventListener("room_invite_received", handleInvite as EventListener);
    return () => {
      window.removeEventListener("room_invite_received", handleInvite as EventListener);
    };
  }, []);

  const handleAccept = (invite: RoomInvite) => {
    setPendingInvites(prev => prev.filter(inv => inv.roomId !== invite.roomId));
    navigate(`/room/${invite.roomId}`);
  };

  const handleReject = (invite: RoomInvite) => {
    setPendingInvites(prev => prev.filter(inv => inv.roomId !== invite.roomId));
  };

  if (pendingInvites.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
      <div className="space-y-3 max-w-sm w-full">
        {pendingInvites.map((invite) => (
          <div
            key={invite.roomId}
            className="bg-white rounded-2xl shadow-2xl border-2 border-blue-400 p-4 pointer-events-auto animate-bounce-in"
            dir="rtl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                {invite.fromUser.displayName.charAt(0)}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-800 text-lg">دعوة للعب!</h3>
                <p className="text-gray-600 text-sm">
                  {invite.fromUser.displayName} يدعوك للانضمام لغرفته
                </p>
              </div>
              <Users className="w-6 h-6 text-blue-500" />
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-3 mb-4">
              <p className="text-center text-gray-600 text-sm">رمز الغرفة</p>
              <p className="text-center font-mono font-bold text-xl text-blue-600">
                {invite.roomId}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleAccept(invite)}
                className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <Check className="w-5 h-5" />
                <span>موافق</span>
              </button>
              <button
                onClick={() => handleReject(invite)}
                className="flex-1 bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <X className="w-5 h-5" />
                <span>رفض</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes bounce-in {
          0% {
            opacity: 0;
            transform: scale(0.8) translateY(-20px);
          }
          50% {
            transform: scale(1.05) translateY(5px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .animate-bounce-in {
          animation: bounce-in 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}
