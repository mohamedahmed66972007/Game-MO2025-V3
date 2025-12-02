import { useNavigate } from "react-router-dom";
import { Users, X, Check } from "lucide-react";

interface RoomInviteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  fromUserName: string;
}

export function RoomInviteDialog({ isOpen, onClose, roomId, fromUserName }: RoomInviteDialogProps) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleAccept = () => {
    onClose();
    navigate(`/room/${roomId}`);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center space-y-4 animate-in fade-in zoom-in duration-200">
        <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg">
          <Users className="w-8 h-8 text-white" />
        </div>
        
        <h2 className="text-xl font-bold text-gray-800">
          دعوة للانضمام لغرفة
        </h2>
        
        <p className="text-gray-600">
          <span className="font-bold text-blue-600">{fromUserName}</span> يدعوك للانضمام إلى غرفته
        </p>
        
        <p className="text-sm text-gray-500 font-mono">
          رقم الغرفة: {roomId}
        </p>
        
        <div className="flex gap-3">
          <button
            onClick={handleAccept}
            className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5" />
            قبول
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
          >
            <X className="w-5 h-5" />
            رفض
          </button>
        </div>
      </div>
    </div>
  );
}
