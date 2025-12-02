import { WifiOff } from "lucide-react";

interface OfflineDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OfflineDialog({ isOpen, onClose }: OfflineDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center space-y-4 animate-in fade-in zoom-in duration-200">
        <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center mx-auto shadow-lg">
          <WifiOff className="w-8 h-8 text-white" />
        </div>
        
        <h2 className="text-xl font-bold text-gray-800">
          أنت غير متصل بالإنترنت
        </h2>
        
        <p className="text-gray-600 text-sm">
          لعب متعدد اللاعبين يتطلب اتصال بالإنترنت. يمكنك اللعب في الوضع الفردي حتى يعود الاتصال.
        </p>
        
        <button
          onClick={onClose}
          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl"
        >
          موافق
        </button>
      </div>
    </div>
  );
}
