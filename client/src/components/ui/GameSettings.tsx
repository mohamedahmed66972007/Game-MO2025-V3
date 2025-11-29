import { useState } from "react";
import { Button } from "./button";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { useNumberGame } from "@/lib/stores/useNumberGame";
import { send } from "@/lib/websocket";
import { Sliders, Sparkles } from "lucide-react";

interface GameSettingsProps {
  onConfirm: (settings: { numDigits: number; maxAttempts: number; cardsEnabled?: boolean }) => void;
  isMultiplayer?: boolean;
}

export function GameSettings({ onConfirm, isMultiplayer = false }: GameSettingsProps) {
  const { singleplayer, multiplayer, setSingleplayerSettings, setMultiplayerSettings } = useNumberGame();
  const currentSettings = isMultiplayer ? multiplayer.settings : singleplayer.settings;
  
  const [numDigits, setNumDigits] = useState(currentSettings.numDigits);
  const [maxAttempts, setMaxAttempts] = useState(currentSettings.maxAttempts);
  const [cardsEnabled, setCardsEnabled] = useState(currentSettings.cardsEnabled || false);

  const handleConfirm = () => {
    const settings = { numDigits, maxAttempts, cardsEnabled: isMultiplayer ? cardsEnabled : undefined };
    if (isMultiplayer) {
      setMultiplayerSettings({ numDigits, maxAttempts, cardsEnabled });
      send({
        type: "update_settings",
        settings: { numDigits, maxAttempts, cardsEnabled },
      });
    } else {
      setSingleplayerSettings({ numDigits, maxAttempts });
    }
    onConfirm(settings);
  };

  const canSave = numDigits >= 3 && numDigits <= 10 && maxAttempts >= 5 && maxAttempts <= 50;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-md bg-white shadow-xl border border-gray-200 rounded-2xl relative overflow-hidden my-auto">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
        
        <CardHeader className="text-center pb-2 pt-6">
          <div className="mb-4 flex justify-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Sliders className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-center text-gray-800 text-3xl font-bold mb-2">
            {isMultiplayer ? "إعدادات المبارة" : "إعدادات اللعبة"}
          </CardTitle>
          <p className="text-center text-gray-600 text-base">
            اختر مستوى الصعوبة والمحاولات
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6 p-6 max-h-96 overflow-y-auto">
          <div>
            <label className="block text-gray-700 font-semibold mb-3 text-sm">
              عدد الأرقام المراد تخمينها: <span className="text-blue-600 text-lg">{numDigits}</span>
            </label>
            <input
              type="range"
              min="3"
              max="10"
              value={numDigits}
              onChange={(e) => setNumDigits(Number(e.target.value))}
              className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>3</span>
              <span>10</span>
            </div>
            <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-gray-700">
                صعوبة: <span className="font-semibold">
                  {numDigits <= 4 ? "سهلة 😊" : numDigits <= 6 ? "متوسطة 😐" : "صعبة 😰"}
                </span>
              </p>
            </div>
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-3 text-sm">
              عدد المحاولات المسموح بها: <span className="text-purple-600 text-lg">{maxAttempts}</span>
            </label>
            <input
              type="range"
              min="5"
              max="50"
              step="5"
              value={maxAttempts}
              onChange={(e) => setMaxAttempts(Number(e.target.value))}
              className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>5</span>
              <span>50</span>
            </div>
            <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-sm text-gray-700">
                الفرص: <span className="font-semibold">
                  {maxAttempts <= 15 ? "قليلة ⚡" : maxAttempts <= 25 ? "متوسطة 🎯" : "الكثير ✨"}
                </span>
              </p>
            </div>
          </div>

          {isMultiplayer && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center shadow-md">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">وضع البطاقات</p>
                    <p className="text-xs text-gray-600">استخدم بطاقات خاصة أثناء اللعب</p>
                  </div>
                </div>
                <button
                  onClick={() => setCardsEnabled(!cardsEnabled)}
                  className={`relative w-14 h-7 rounded-full transition-all duration-300 ${
                    cardsEnabled 
                      ? "bg-gradient-to-r from-green-400 to-green-500" 
                      : "bg-gray-300"
                  }`}
                >
                  <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${
                    cardsEnabled ? "right-0.5" : "left-0.5"
                  }`} />
                </button>
              </div>
              
              {cardsEnabled && (
                <div className="p-3 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                  <p className="text-xs text-gray-700 font-medium mb-2">📦 البطاقات المتاحة:</p>
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    <span className="px-2 py-0.5 bg-purple-100 rounded text-purple-700">👁️ تلميح</span>
                    <span className="px-2 py-0.5 bg-green-100 rounded text-green-700">⏱️ وقت إضافي</span>
                    <span className="px-2 py-0.5 bg-blue-100 rounded text-blue-700">🛡️ درع</span>
                    <span className="px-2 py-0.5 bg-orange-100 rounded text-orange-700">🔄 تبديل</span>
                    <span className="px-2 py-0.5 bg-cyan-100 rounded text-cyan-700">❄️ تجميد</span>
                    <span className="px-2 py-0.5 bg-yellow-100 rounded text-yellow-700">✨ نقاط مضاعفة</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-4 rounded-xl border border-blue-200">
            <p className="text-sm text-gray-700 font-semibold mb-2">ملخص الإعدادات:</p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>🎯 سيتم توليد رقم سري من <span className="font-bold">{numDigits} أرقام</span></li>
              <li>📝 لديك <span className="font-bold">{maxAttempts} محاولات</span> للتخمين</li>
              <li>✓ يجب تخمين جميع الأرقام في أماكنها الصحيحة للفوز</li>
              {isMultiplayer && cardsEnabled && (
                <li>✨ البطاقات: <span className="font-bold text-yellow-600">مفعّلة</span></li>
              )}
            </ul>
          </div>

          <Button
            onClick={handleConfirm}
            disabled={!canSave}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 disabled:opacity-50 text-white font-semibold text-base py-6 rounded-xl shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-2"
          >
            ✓ تأكيد الإعدادات
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
