import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useNumberGame } from "@/lib/stores/useNumberGame";
import { Gamepad2, Users, WifiOff, User, LogOut, Download, Settings } from "lucide-react";
import { GameSettings } from "../ui/GameSettings";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { OfflineDialog } from "../ui/OfflineDialog";
import { AccountDialog } from "../ui/AccountDialog";
import { FriendsDialog } from "../ui/FriendsDialog";
import { ProfileDialog } from "../ui/ProfileDialog";
import { NotificationsDropdown } from "../ui/NotificationsDropdown";
import { useAccount } from "@/lib/stores/useAccount";

export function MobileMenu() {
  const navigate = useNavigate();
  const { startSingleplayer } = useNumberGame();
  const { account, logout } = useAccount();
  const [showSettings, setShowSettings] = useState(false);
  const [showOfflineDialog, setShowOfflineDialog] = useState(false);
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [showFriendsDialog, setShowFriendsDialog] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const isOnline = useOnlineStatus();

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  const handleSingleplayer = () => {
    setShowSettings(true);
  };

  const handleSettingsConfirm = (settings: { numDigits: number; maxAttempts: number }) => {
    startSingleplayer(settings);
    setShowSettings(false);
    navigate("/singleplayer");
  };

  if (showSettings) {
    return <GameSettings onConfirm={handleSettingsConfirm} isMultiplayer={false} />;
  }

  const handleMultiplayer = () => {
    if (!isOnline) {
      setShowOfflineDialog(true);
      return;
    }
    navigate("/multiplayer");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <OfflineDialog isOpen={showOfflineDialog} onClose={() => setShowOfflineDialog(false)} />
      <AccountDialog isOpen={showAccountDialog} onClose={() => setShowAccountDialog(false)} />
      <FriendsDialog isOpen={showFriendsDialog} onClose={() => setShowFriendsDialog(false)} />
      <ProfileDialog isOpen={showProfileDialog} onClose={() => setShowProfileDialog(false)} />
      
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <a
            href="https://game-spy-mo2025.onrender.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-1.5 bg-white/10 backdrop-blur-md border border-gray-800/40 hover:border-gray-700 text-gray-800 hover:bg-white/20 rounded-lg transition-all text-xs font-bold shadow-md"
          >
            <span className="text-sm">#</span>
            <span>الجاسوس</span>
          </a>
          {isInstallable && (
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1 px-2 py-1.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg transition-colors text-xs font-medium shadow-md"
            >
              <Download className="w-3 h-3" />
              <span>تحميل</span>
            </button>
          )}
          {account && <NotificationsDropdown />}
          {account && (
            <button
              onClick={() => setShowFriendsDialog(true)}
              className="flex items-center gap-1 px-2 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg transition-colors text-xs font-medium shadow-md"
            >
              <Users className="w-3 h-3" />
              <span>أصدقاء</span>
            </button>
          )}
        </div>
        
        {account ? (
          <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg shadow-md border border-gray-200">
            <button
              onClick={() => setShowProfileDialog(true)}
              className="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xs hover:opacity-90 transition-opacity"
              title="الملف الشخصي"
            >
              {account.displayName.charAt(0)}
            </button>
            <button
              onClick={() => setShowProfileDialog(true)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="الإعدادات"
            >
              <Settings className="w-4 h-4 text-gray-500" />
            </button>
            <button
              onClick={logout}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="تسجيل خروج"
            >
              <LogOut className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAccountDialog(true)}
            className="flex items-center gap-1 px-2 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-xs font-medium"
          >
            <User className="w-3 h-3" />
            <span>تسجيل</span>
          </button>
        )}
      </div>
      
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl shadow-lg">
            <Gamepad2 className="w-10 h-10 text-white" />
          </div>
          
          <h1 className="text-4xl font-bold text-gray-800">
            لعبة التخمين
          </h1>
          
          <div className="space-y-2 text-gray-600">
            <p className="text-lg">خمن الرقم السري المكون من 4 أرقام</p>
          </div>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleSingleplayer}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3"
          >
            <Gamepad2 className="w-6 h-6" />
            <span className="text-lg">لعب فردي</span>
          </button>

          <button
            onClick={handleMultiplayer}
            className={`w-full ${isOnline 
              ? 'bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700' 
              : 'bg-gradient-to-r from-gray-400 to-gray-500'
            } text-white font-bold py-4 px-6 rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 relative`}
          >
            {!isOnline && <WifiOff className="w-5 h-5 absolute left-4" />}
            <Users className="w-6 h-6" />
            <span className="text-lg">لعب متعدد اللاعبين</span>
          </button>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-md space-y-3">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <span>📖</span>
            <span>كيف تلعب:</span>
          </h3>
          <ul className="space-y-2 text-sm text-gray-700 text-right">
            <li>1. <strong>اختر رقمك السري:</strong> 4 أرقام يحاول الخصم تخمينها</li>
            <li>2. <strong>خمن الرقم:</strong> أدخل 4 أرقام من اختيارك</li>
            <li>3. <strong>الملاحظات:</strong> رقم أزرق = صح بأي موضع، رقم أخضر = صح بالموضع الصحيح</li>
            <li>4. من يخمن الرقم السري أولاً يفوز!</li>
            <li>5. يمكن تخصيص عدد الأرقام وعدد المحاولات في كل جولة</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
