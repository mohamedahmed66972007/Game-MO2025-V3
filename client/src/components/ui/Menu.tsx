import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./button";
import { Card } from "./card";
import { useNumberGame } from "@/lib/stores/useNumberGame";
import { getLastPlayerName } from "@/lib/websocket";
import { Gamepad2, Users, BookOpen } from "lucide-react";
import { GameSettings } from "./GameSettings";

export function Menu() {
  const navigate = useNavigate();
  const { startSingleplayer } = useNumberGame();
  const [showSettings, setShowSettings] = useState(false);

  const handleSingleplayer = () => {
    setShowSettings(true);
  };

  const handleMultiplayerMenu = () => {
    navigate("/multiplayer");
  };

  const handleSettingsConfirm = (settings: { numDigits: number; maxAttempts: number }) => {
    startSingleplayer(settings);
    setShowSettings(false);
    navigate("/singleplayer");
  };

  if (showSettings) {
    return <GameSettings onConfirm={handleSettingsConfirm} isMultiplayer={false} />;
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 z-50 p-4">
      <Card className="w-full max-w-6xl bg-white shadow-xl border border-gray-200 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
        
        <div className="grid grid-cols-2 gap-8 p-8">
          {/* Right Side - Title and Buttons */}
          <div className="flex flex-col justify-start">
            <div className="mb-6 flex justify-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Gamepad2 className="w-12 h-12 text-white" />
              </div>
            </div>
            <h1 className="text-center text-gray-800 text-4xl font-bold mb-2">
              لعبة التخمين
            </h1>
            <p className="text-center text-gray-700 text-base mb-2">
              خمن الرقم السري المكون من <span className="text-blue-600 font-bold">4 أرقام</span>
            </p>
            <p className="text-center text-gray-600 text-sm mb-8">

            </p>

            <div className="space-y-4">
              <Button
                onClick={handleSingleplayer}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold text-lg py-6 rounded-xl shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-3"
                size="lg"
              >
                <Gamepad2 className="w-6 h-6" />
                لعب فردي
              </Button>

              <Button
                onClick={handleMultiplayerMenu}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-semibold text-lg py-6 rounded-xl shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-3"
                size="lg"
              >
                <Users className="w-6 h-6" />
                لعب متعدد اللاعبين
              </Button>
            </div>
          </div>

          {/* Left Side - Instructions */}
          <div className="bg-blue-50 p-6 rounded-xl border border-blue-200 h-fit">
            <h3 className="text-gray-800 font-bold mb-4 text-lg flex items-center">
              <BookOpen className="w-5 h-5 ml-2" />
              📖 شرح اللعبة:
            </h3>
            <ul className="text-gray-800 text-sm space-y-3">
              <li className="flex items-start">
                <span className="text-blue-600 font-bold ml-3 mt-0.5">①</span>
                <span><strong className="text-blue-700">اختر رقمك السري:</strong> سيطلب منك كتابة 4 أرقام سرية يحاول الخصم تخمينها</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 font-bold ml-3 mt-0.5">②</span>
                <span><strong className="text-blue-700">ادخل اللعبة:</strong> انقر على الشاشة لقفل المؤشر ودخول الغرفة </span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 font-bold ml-3 mt-0.5">③</span>
                <span><strong className="text-blue-700">التحكم:</strong> استخدم <span className="text-purple-700 font-mono bg-white px-1 rounded">W/A/S/D</span> للتحرك والماوس للنظر</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 font-bold ml-3 mt-0.5">④</span>
                <span><strong className="text-blue-700">التخمين:</strong> انقر على الأرقام في الغرفة لبناء تخمينك، ثم اضغط ✓ للتأكيد</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 font-bold ml-3 mt-0.5">⑤</span>
                <span><strong className="text-blue-700">الملاحظات:</strong> 🔵 أزرق = رقم صحيح بأي موضع | 🟢 أخضر = رقم صحيح بالموضع الصحيح</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 font-bold ml-3 mt-0.5">⑥</span>
                <span><strong className="text-blue-700">الفائز:</strong> من يخمن رقم الخصم السري أولاً يفوز بالمبارة! 🏆</span>
              </li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
