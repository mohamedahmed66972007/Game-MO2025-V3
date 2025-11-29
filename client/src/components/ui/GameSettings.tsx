import { useState } from "react";
import { Button } from "./button";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { useNumberGame } from "@/lib/stores/useNumberGame";
import { send } from "@/lib/websocket";
import { Sliders, Sparkles, Eye, Clock, Shield, RefreshCw, Snowflake, Gamepad2, Shuffle, Brain, ArrowUp, CloudRain, Hash, Check } from "lucide-react";

type ChallengeType = "memory" | "direction" | "raindrops" | "pattern" | "random";

interface GameSettingsProps {
  onConfirm: (settings: { numDigits: number; maxAttempts: number; cardsEnabled?: boolean; selectedChallenge?: ChallengeType }) => void;
  isMultiplayer?: boolean;
}

const challenges: { id: ChallengeType; name: string; description: string; icon: React.ReactNode; color: string }[] = [
  { id: "memory", name: "تحدي الذاكرة", description: "تذكر الأرقام المعروضة", icon: <Brain className="w-5 h-5" />, color: "indigo" },
  { id: "direction", name: "تحدي الاتجاهات", description: "اضغط الاتجاه الصحيح", icon: <ArrowUp className="w-5 h-5" />, color: "blue" },
  { id: "raindrops", name: "تحدي المطر", description: "اكتب الأرقام المتساقطة", icon: <CloudRain className="w-5 h-5" />, color: "purple" },
  { id: "pattern", name: "تحدي التخمين", description: "أكمل النمط الرقمي", icon: <Hash className="w-5 h-5" />, color: "green" },
  { id: "random", name: "عشوائي", description: "يختار النظام تحدي عشوائياً", icon: <Shuffle className="w-5 h-5" />, color: "orange" },
];

export function GameSettings({ onConfirm, isMultiplayer = false }: GameSettingsProps) {
  const { singleplayer, multiplayer, setSingleplayerSettings, setMultiplayerSettings } = useNumberGame();
  const currentSettings = isMultiplayer ? multiplayer.settings : singleplayer.settings;
  
  const [numDigits, setNumDigits] = useState(currentSettings.numDigits);
  const [maxAttempts, setMaxAttempts] = useState(currentSettings.maxAttempts);
  const [cardsEnabled, setCardsEnabled] = useState(currentSettings.cardsEnabled || false);
  const [selectedChallenge, setSelectedChallenge] = useState<ChallengeType>("random");

  const handleConfirm = () => {
    const settings = { 
      numDigits, 
      maxAttempts, 
      cardsEnabled: isMultiplayer ? cardsEnabled : undefined,
      selectedChallenge: isMultiplayer && cardsEnabled ? selectedChallenge : undefined
    };
    if (isMultiplayer) {
      setMultiplayerSettings({ numDigits, maxAttempts, cardsEnabled, selectedChallenge });
      send({
        type: "update_settings",
        settings: { numDigits, maxAttempts, cardsEnabled, selectedChallenge },
      });
    } else {
      setSingleplayerSettings({ numDigits, maxAttempts });
    }
    onConfirm(settings);
  };

  const canSave = numDigits >= 3 && numDigits <= 10 && maxAttempts >= 5 && maxAttempts <= 50;

  const getColorClasses = (color: string, isSelected: boolean) => {
    const colors: Record<string, { bg: string; border: string; text: string; selectedBg: string }> = {
      indigo: { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-700", selectedBg: "bg-indigo-100" },
      blue: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", selectedBg: "bg-blue-100" },
      purple: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", selectedBg: "bg-purple-100" },
      green: { bg: "bg-green-50", border: "border-green-200", text: "text-green-700", selectedBg: "bg-green-100" },
      orange: { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", selectedBg: "bg-orange-100" },
    };
    const c = colors[color] || colors.blue;
    return isSelected ? `${c.selectedBg} ${c.border} ${c.text} ring-2 ring-${color}-400` : `${c.bg} ${c.border} ${c.text}`;
  };

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
        
        <CardContent className="space-y-6 p-6 max-h-[70vh] overflow-y-auto">
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
                  {numDigits <= 4 ? "سهلة" : numDigits <= 6 ? "متوسطة" : "صعبة"}
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
                  {maxAttempts <= 15 ? "قليلة" : maxAttempts <= 25 ? "متوسطة" : "الكثير"}
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
                    <p className="text-xs text-gray-600">العب تحدي في البداية للحصول على بطاقة</p>
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
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl border border-indigo-200">
                    <p className="text-sm text-gray-800 font-semibold mb-3 flex items-center gap-2">
                      <Gamepad2 className="w-4 h-4" />
                      اختر التحدي:
                    </p>
                    <p className="text-xs text-gray-600 mb-3">
                      الفائز بالتحدي يحصل على بطاقة واحدة يستخدمها في اللعبة
                    </p>
                    
                    <div className="space-y-2">
                      {challenges.map((challenge) => (
                        <button
                          key={challenge.id}
                          onClick={() => setSelectedChallenge(challenge.id)}
                          className={`w-full p-3 rounded-lg border-2 transition-all duration-200 flex items-center gap-3 ${
                            selectedChallenge === challenge.id
                              ? `bg-${challenge.color}-100 border-${challenge.color}-400 ring-2 ring-${challenge.color}-300`
                              : `bg-${challenge.color}-50 border-${challenge.color}-200 hover:bg-${challenge.color}-100`
                          }`}
                          style={{
                            backgroundColor: selectedChallenge === challenge.id 
                              ? challenge.color === 'indigo' ? '#e0e7ff' 
                              : challenge.color === 'blue' ? '#dbeafe'
                              : challenge.color === 'purple' ? '#f3e8ff'
                              : challenge.color === 'green' ? '#dcfce7'
                              : '#ffedd5'
                              : challenge.color === 'indigo' ? '#eef2ff'
                              : challenge.color === 'blue' ? '#eff6ff'
                              : challenge.color === 'purple' ? '#faf5ff'
                              : challenge.color === 'green' ? '#f0fdf4'
                              : '#fff7ed',
                            borderColor: selectedChallenge === challenge.id
                              ? challenge.color === 'indigo' ? '#818cf8'
                              : challenge.color === 'blue' ? '#60a5fa'
                              : challenge.color === 'purple' ? '#c084fc'
                              : challenge.color === 'green' ? '#4ade80'
                              : '#fb923c'
                              : challenge.color === 'indigo' ? '#c7d2fe'
                              : challenge.color === 'blue' ? '#bfdbfe'
                              : challenge.color === 'purple' ? '#e9d5ff'
                              : challenge.color === 'green' ? '#bbf7d0'
                              : '#fed7aa'
                          }}
                        >
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            challenge.color === 'indigo' ? 'bg-indigo-500'
                            : challenge.color === 'blue' ? 'bg-blue-500'
                            : challenge.color === 'purple' ? 'bg-purple-500'
                            : challenge.color === 'green' ? 'bg-green-500'
                            : 'bg-orange-500'
                          } text-white`}>
                            {challenge.icon}
                          </div>
                          <div className="flex-1 text-right">
                            <p className={`font-semibold text-sm ${
                              challenge.color === 'indigo' ? 'text-indigo-800'
                              : challenge.color === 'blue' ? 'text-blue-800'
                              : challenge.color === 'purple' ? 'text-purple-800'
                              : challenge.color === 'green' ? 'text-green-800'
                              : 'text-orange-800'
                            }`}>{challenge.name}</p>
                            <p className="text-xs text-gray-600">{challenge.description}</p>
                          </div>
                          {selectedChallenge === challenge.id && (
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                              challenge.color === 'indigo' ? 'bg-indigo-500'
                              : challenge.color === 'blue' ? 'bg-blue-500'
                              : challenge.color === 'purple' ? 'bg-purple-500'
                              : challenge.color === 'green' ? 'bg-green-500'
                              : 'bg-orange-500'
                            } text-white`}>
                              <Check className="w-4 h-4" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                    <p className="text-xs text-gray-700 font-medium mb-2 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      البطاقات المتاحة للفائز:
                    </p>
                    <div className="flex flex-wrap gap-1.5 text-xs">
                      <span className="px-2 py-0.5 bg-purple-100 rounded text-purple-700 flex items-center gap-1">
                        <Eye className="w-3 h-3" /> تلميح
                      </span>
                      <span className="px-2 py-0.5 bg-green-100 rounded text-green-700 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> وقت إضافي
                      </span>
                      <span className="px-2 py-0.5 bg-blue-100 rounded text-blue-700 flex items-center gap-1">
                        <Shield className="w-3 h-3" /> درع
                      </span>
                      <span className="px-2 py-0.5 bg-orange-100 rounded text-orange-700 flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" /> تبديل
                      </span>
                      <span className="px-2 py-0.5 bg-cyan-100 rounded text-cyan-700 flex items-center gap-1">
                        <Snowflake className="w-3 h-3" /> تجميد
                      </span>
                      <span className="px-2 py-0.5 bg-yellow-100 rounded text-yellow-700 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> نقاط مضاعفة
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-4 rounded-xl border border-blue-200">
            <p className="text-sm text-gray-700 font-semibold mb-2">ملخص الإعدادات:</p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>سيتم توليد رقم سري من <span className="font-bold">{numDigits} أرقام</span></li>
              <li>لديك <span className="font-bold">{maxAttempts} محاولات</span> للتخمين</li>
              <li>يجب تخمين جميع الأرقام في أماكنها الصحيحة للفوز</li>
              {isMultiplayer && cardsEnabled && (
                <>
                  <li>البطاقات: <span className="font-bold text-yellow-600">مفعّلة</span></li>
                  <li>التحدي: <span className="font-bold text-indigo-600">
                    {challenges.find(c => c.id === selectedChallenge)?.name}
                  </span></li>
                </>
              )}
            </ul>
          </div>

          <Button
            onClick={handleConfirm}
            disabled={!canSave}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 disabled:opacity-50 text-white font-semibold text-base py-6 rounded-xl shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200 flex items-center justify-center gap-2"
          >
            تأكيد الإعدادات
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
