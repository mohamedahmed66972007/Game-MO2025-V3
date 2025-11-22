import { useState } from "react";
import { Button } from "./button";
import { Input } from "./input";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { useNumberGame } from "@/lib/stores/useNumberGame";
import { connectWebSocket } from "@/lib/websocket";
import { Gamepad2, Users, User, Key, DoorOpen, ArrowLeft, BookOpen } from "lucide-react";
import { GameSettings } from "./GameSettings";

export function Menu() {
  const { setMode, startSingleplayer, setPlayerName } = useNumberGame();
  const [showMultiplayer, setShowMultiplayer] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [playerName, setPlayerNameInput] = useState("");
  const [roomId, setRoomId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSingleplayer = () => {
    setShowSettings(true);
  };

  const handleMultiplayerMenu = () => {
    setShowMultiplayer(true);
  };

  const handleSettingsConfirm = (settings: { numDigits: number; maxAttempts: number }) => {
    startSingleplayer(settings);
    setShowSettings(false);
  };

  if (showSettings) {
    return <GameSettings onConfirm={handleSettingsConfirm} isMultiplayer={false} />;
  }

  const handleCreateRoom = () => {
    if (!playerName.trim()) {
      alert("الرجاء إدخال اسمك");
      return;
    }
    setIsLoading(true);
    setPlayerName(playerName);
    setMode("multiplayer");
    connectWebSocket(playerName);
  };

  const handleJoinRoom = () => {
    if (!playerName.trim()) {
      alert("الرجاء إدخال اسمك");
      return;
    }
    if (!roomId.trim()) {
      alert("الرجاء إدخال رقم الغرفة");
      return;
    }
    setIsLoading(true);
    setPlayerName(playerName);
    setMode("multiplayer");
    connectWebSocket(playerName, roomId.toUpperCase());
  };

  if (showMultiplayer) {
    if (isLoading) {
      return (
        <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 z-50">
          <div className="text-center relative">
            <div className="inline-flex items-center justify-center mb-4">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500"></div>
            </div>
            <p className="text-gray-800 text-xl font-semibold">جاري الاتصال...</p>
            <p className="text-gray-600 text-sm mt-2">يرجى الانتظار</p>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 z-50 p-4">
        <Card className="w-full max-w-4xl bg-white shadow-xl border border-gray-200 rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
          
          <CardHeader className="text-center pb-4 pt-8 border-b border-gray-200">
            <div className="mb-4 flex justify-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Users className="w-8 h-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-center text-gray-800 text-3xl font-bold mb-2">
              لعب متعدد اللاعبين
            </CardTitle>
            <p className="text-center text-gray-600 text-base">
              تحدٍ بينك وبين أصدقائك
            </p>
          </CardHeader>
          
          <CardContent className="p-8 space-y-6">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <label className="text-gray-700 text-sm mb-2 block font-semibold flex items-center">
                <User className="w-4 h-4 ml-2" />
                اسمك
              </label>
              <Input
                type="text"
                placeholder="أدخل اسمك"
                value={playerName}
                onChange={(e) => setPlayerNameInput(e.target.value)}
                className="bg-white text-gray-800 border-gray-300 placeholder:text-gray-400 h-12 rounded-lg focus:border-blue-500 focus:ring-blue-500 text-base"
              />
            </div>

            <div className="grid grid-cols-2 gap-8">
              {/* Left - Create Room */}
              <div className="space-y-5">
                <div>
                  <h3 className="text-gray-800 font-bold text-lg mb-4 flex items-center">
                    <span className="text-blue-600 font-bold ml-2">①</span>
                    إنشاء غرفة جديدة
                  </h3>
                </div>

                <Button
                  onClick={handleCreateRoom}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold text-base py-6 rounded-xl shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <Users className="w-5 h-5" />
                  إنشاء غرفة
                </Button>
              </div>

              {/* Right - Join Room */}
              <div className="space-y-5">
                <div>
                  <h3 className="text-gray-800 font-bold text-lg mb-4 flex items-center">
                    <span className="text-purple-600 font-bold ml-2">②</span>
                    الانضمام لغرفة موجودة
                  </h3>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <label className="text-gray-700 text-sm mb-2 block font-semibold flex items-center">
                    <Key className="w-4 h-4 ml-2" />
                    رقم الغرفة
                  </label>
                  <Input
                    type="text"
                    placeholder="أدخل رقم الغرفة"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                    className="bg-white text-gray-800 border-gray-300 placeholder:text-gray-400 h-12 rounded-lg font-mono text-center text-lg focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <Button
                  onClick={handleJoinRoom}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-semibold text-base py-6 rounded-xl shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <DoorOpen className="w-5 h-5" />
                  الانضمام
                </Button>
              </div>
            </div>

            <Button
              onClick={() => {
                setShowMultiplayer(false);
                setIsLoading(false);
              }}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold text-base py-5 rounded-xl shadow-sm hover:shadow-md transform hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              رجوع
            </Button>
          </CardContent>
        </Card>
      </div>
    );
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
              لديك <span className="text-purple-600 font-semibold">20 محاولة</span> فقط!
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
                <span><strong className="text-blue-700">ادخل اللعبة:</strong> انقر على الشاشة لقفل المؤشر ودخول الغرفة الثلاثية</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 font-bold ml-3 mt-0.5">③</span>
                <span><strong className="text-blue-700">التحكم:</strong> استخدم <span className="text-purple-700 font-mono bg-white px-1 rounded">W/A/S/D</span> للتحرك والماوس للنظر</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 font-bold ml-3 mt-0.5">④</span>
                <span><strong className="text-blue-700">الخمن:</strong> انقر على الأرقام في الغرفة لبناء تخمينك، ثم اضغط ✓ للتأكيد</span>
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
