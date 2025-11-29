import { useState, useEffect } from "react";
import { Button } from "./button";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { useNumberGame } from "@/lib/stores/useNumberGame";
import { useCards, DEFAULT_CARD_SETTINGS, CardSettings } from "@/lib/stores/useCards";
import { send } from "@/lib/websocket";
import { Sliders, Sparkles, Eye, XCircle, Hash, Snowflake, Shield, Gamepad2, Shuffle, Brain, Zap, CloudRain, Lightbulb, Check, Clock, Settings2 } from "lucide-react";

type ChallengeType = "guess" | "memory" | "direction" | "raindrops" | "random";
type CardTypeId = "revealNumber" | "burnNumber" | "revealParity" | "freeze" | "shield";

interface GameSettingsProps {
  onConfirm: (settings: { numDigits: number; maxAttempts: number; cardsEnabled?: boolean; selectedChallenge?: ChallengeType; allowedCards?: CardTypeId[] }) => void;
  isMultiplayer?: boolean;
}

const SETTINGS_STORAGE_KEY = "multiplayer_room_settings";

const challenges: { id: ChallengeType; name: string; description: string; icon: React.ReactNode; color: string }[] = [
  { id: "guess", name: "تحدي تسلسل الأضواء", description: "تذكر تسلسل الألوان وأعده بالترتيب", icon: <Lightbulb className="w-5 h-5" />, color: "blue" },
  { id: "memory", name: "لوحة الذاكرة", description: "تذكر المربعات المضيئة واضغط عليها", icon: <Brain className="w-5 h-5" />, color: "purple" },
  { id: "direction", name: "ترتيب الاتجاهات", description: "اضغط الاتجاه الصحيح بسرعة", icon: <Zap className="w-5 h-5" />, color: "orange" },
  { id: "raindrops", name: "حبات المطر", description: "حل المسائل قبل وصول القطرات", icon: <CloudRain className="w-5 h-5" />, color: "cyan" },
  { id: "random", name: "عشوائي", description: "يختار النظام تحدي عشوائياً", icon: <Shuffle className="w-5 h-5" />, color: "pink" },
];

const cardTypes: { id: CardTypeId; name: string; icon: React.ReactNode; color: string }[] = [
  { id: "revealNumber", name: "إظهار رقم", icon: <Eye className="w-3 h-3" />, color: "purple" },
  { id: "burnNumber", name: "حرق رقم", icon: <XCircle className="w-3 h-3" />, color: "red" },
  { id: "revealParity", name: "زوجي/فردي", icon: <Hash className="w-3 h-3" />, color: "green" },
  { id: "freeze", name: "تجميد", icon: <Snowflake className="w-3 h-3" />, color: "cyan" },
  { id: "shield", name: "درع", icon: <Shield className="w-3 h-3" />, color: "blue" },
];

const allCardIds: CardTypeId[] = ["revealNumber", "burnNumber", "revealParity", "freeze", "shield"];

const loadSavedSettings = () => {
  try {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.log("Failed to load saved settings");
  }
  return null;
};

const saveSettings = (settings: any) => {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.log("Failed to save settings");
  }
};

export function GameSettings({ onConfirm, isMultiplayer = false }: GameSettingsProps) {
  const { singleplayer, multiplayer, setSingleplayerSettings, setMultiplayerSettings } = useNumberGame();
  const { cardSettings, setCardSettings } = useCards();
  const currentSettings = isMultiplayer ? multiplayer.settings : singleplayer.settings;
  
  const savedSettings = isMultiplayer ? loadSavedSettings() : null;
  
  const [numDigits, setNumDigits] = useState(savedSettings?.numDigits ?? currentSettings.numDigits);
  const [maxAttempts, setMaxAttempts] = useState(savedSettings?.maxAttempts ?? currentSettings.maxAttempts);
  const [cardsEnabled, setCardsEnabled] = useState(savedSettings?.cardsEnabled ?? currentSettings.cardsEnabled ?? false);
  const [selectedChallenge, setSelectedChallenge] = useState<ChallengeType>(
    savedSettings?.selectedChallenge ?? (currentSettings.selectedChallenge as ChallengeType) ?? "random"
  );
  const [allowedCards, setAllowedCards] = useState<CardTypeId[]>(
    savedSettings?.allowedCards ?? (currentSettings.allowedCards as CardTypeId[]) ?? allCardIds
  );
  
  const [showCardSettings, setShowCardSettings] = useState(false);
  const [roundDuration, setRoundDuration] = useState(savedSettings?.cardSettings?.roundDuration ?? cardSettings.roundDuration);
  const [revealNumberShowPosition, setRevealNumberShowPosition] = useState(savedSettings?.cardSettings?.revealNumberShowPosition ?? cardSettings.revealNumberShowPosition);
  const [burnNumberCount, setBurnNumberCount] = useState(savedSettings?.cardSettings?.burnNumberCount ?? cardSettings.burnNumberCount);
  const [revealParitySlots, setRevealParitySlots] = useState(Math.min(savedSettings?.cardSettings?.revealParitySlots ?? cardSettings.revealParitySlots, numDigits));
  const [freezeDuration, setFreezeDuration] = useState(savedSettings?.cardSettings?.freezeDuration ?? cardSettings.freezeDuration);
  const [shieldDuration, setShieldDuration] = useState(savedSettings?.cardSettings?.shieldDuration ?? cardSettings.shieldDuration);

  const toggleCard = (cardId: CardTypeId) => {
    if (allowedCards.includes(cardId)) {
      if (allowedCards.length > 1) {
        setAllowedCards(allowedCards.filter(id => id !== cardId));
      }
    } else {
      setAllowedCards([...allowedCards, cardId]);
    }
  };

  const handleConfirm = () => {
    const settings = { 
      numDigits, 
      maxAttempts, 
      cardsEnabled: isMultiplayer ? cardsEnabled : undefined,
      selectedChallenge: isMultiplayer && cardsEnabled ? selectedChallenge : undefined,
      allowedCards: isMultiplayer && cardsEnabled ? allowedCards : undefined
    };
    
    if (isMultiplayer) {
      const cardSettingsToSave = {
        roundDuration,
        revealNumberShowPosition,
        burnNumberCount,
        revealParitySlots: Math.min(revealParitySlots, numDigits),
        freezeDuration,
        shieldDuration,
      };
      
      setCardSettings(cardSettingsToSave);
      
      setMultiplayerSettings({ 
        numDigits, 
        maxAttempts, 
        cardsEnabled, 
        selectedChallenge: selectedChallenge as any, 
        allowedCards 
      });
      
      saveSettings({
        numDigits,
        maxAttempts,
        cardsEnabled,
        selectedChallenge,
        allowedCards,
        cardSettings: cardSettingsToSave,
      });
      
      send({
        type: "update_settings",
        settings: { 
          numDigits, 
          maxAttempts, 
          cardsEnabled, 
          selectedChallenge, 
          allowedCards,
          cardSettings: cardSettingsToSave,
        },
      });
    } else {
      setSingleplayerSettings({ numDigits, maxAttempts });
    }
    onConfirm(settings);
  };

  const canSave = numDigits >= 3 && numDigits <= 10 && maxAttempts >= 5 && maxAttempts <= 50;

  const getChallengeColors = (color: string, isSelected: boolean) => {
    const colors: Record<string, { bg: string; selectedBg: string; border: string; text: string; iconBg: string }> = {
      blue: { bg: "#eff6ff", selectedBg: "#dbeafe", border: "#60a5fa", text: "#1e40af", iconBg: "#3b82f6" },
      purple: { bg: "#faf5ff", selectedBg: "#f3e8ff", border: "#c084fc", text: "#6b21a8", iconBg: "#a855f7" },
      orange: { bg: "#fff7ed", selectedBg: "#ffedd5", border: "#fb923c", text: "#9a3412", iconBg: "#f97316" },
      cyan: { bg: "#ecfeff", selectedBg: "#cffafe", border: "#22d3ee", text: "#155e75", iconBg: "#06b6d4" },
      pink: { bg: "#fdf2f8", selectedBg: "#fce7f3", border: "#f472b6", text: "#9d174d", iconBg: "#ec4899" },
    };
    return colors[color] || colors.blue;
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
              {/* مدة الجولة - تظهر دائماً في اللعب الجماعي */}
              <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
                <label className="block text-gray-700 font-semibold mb-3 text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  مدة الجولة: <span className="text-blue-600 text-lg">{roundDuration} دقائق</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="15"
                  value={roundDuration}
                  onChange={(e) => setRoundDuration(Number(e.target.value))}
                  className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>1 دقيقة</span>
                  <span>15 دقيقة</span>
                </div>
                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-gray-700">
                    الوقت: <span className="font-semibold">
                      {roundDuration <= 3 ? "قصير" : roundDuration <= 7 ? "متوسط" : "طويل"}
                    </span>
                  </p>
                </div>
              </div>
              
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
                      {challenges.map((challenge) => {
                        const colors = getChallengeColors(challenge.color, selectedChallenge === challenge.id);
                        return (
                          <button
                            key={challenge.id}
                            onClick={() => setSelectedChallenge(challenge.id)}
                            className="w-full p-3 rounded-lg border-2 transition-all duration-200 flex items-center gap-3"
                            style={{
                              backgroundColor: selectedChallenge === challenge.id ? colors.selectedBg : colors.bg,
                              borderColor: selectedChallenge === challenge.id ? colors.border : `${colors.border}50`,
                            }}
                          >
                            <div 
                              className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                              style={{ backgroundColor: colors.iconBg }}
                            >
                              {challenge.icon}
                            </div>
                            <div className="flex-1 text-right">
                              <p className="font-semibold text-sm" style={{ color: colors.text }}>
                                {challenge.name}
                              </p>
                              <p className="text-xs text-gray-600">{challenge.description}</p>
                            </div>
                            {selectedChallenge === challenge.id && (
                              <div 
                                className="w-6 h-6 rounded-full flex items-center justify-center text-white"
                                style={{ backgroundColor: colors.iconBg }}
                              >
                                <Check className="w-4 h-4" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-3 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                    <p className="text-xs text-gray-700 font-medium mb-2 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      اختر البطاقات المسموحة ({allowedCards.length} من {cardTypes.length}):
                    </p>
                    <p className="text-xs text-gray-500 mb-2">
                      الفائز يحصل على بطاقة عشوائية من البطاقات المختارة
                    </p>
                    <div className="grid grid-cols-2 gap-1.5 text-xs">
                      {cardTypes.map((card) => {
                        const isSelected = allowedCards.includes(card.id);
                        return (
                          <button
                            key={card.id}
                            onClick={() => toggleCard(card.id)}
                            className={`px-2 py-1.5 rounded flex items-center gap-1 transition-all duration-200 border-2 ${
                              isSelected 
                                ? card.color === 'purple' ? 'bg-purple-100 text-purple-700 border-purple-400' :
                                  card.color === 'red' ? 'bg-red-100 text-red-700 border-red-400' :
                                  card.color === 'green' ? 'bg-green-100 text-green-700 border-green-400' :
                                  card.color === 'cyan' ? 'bg-cyan-100 text-cyan-700 border-cyan-400' :
                                  card.color === 'blue' ? 'bg-blue-100 text-blue-700 border-blue-400' :
                                  'bg-orange-100 text-orange-700 border-orange-400'
                                : 'bg-gray-100 text-gray-400 border-gray-200 opacity-60'
                            }`}
                          >
                            {card.icon} {card.name}
                            {isSelected && <Check className="w-3 h-3 mr-auto" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* إعدادات البطاقات المتقدمة */}
                  <div className="p-3 bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg border border-gray-200">
                    <button
                      onClick={() => setShowCardSettings(!showCardSettings)}
                      className="w-full flex items-center justify-between text-sm text-gray-700 font-medium"
                    >
                      <span className="flex items-center gap-2">
                        <Settings2 className="w-4 h-4" />
                        إعدادات البطاقات المتقدمة
                      </span>
                      <span className={`transform transition-transform ${showCardSettings ? 'rotate-180' : ''}`}>▼</span>
                    </button>
                    
                    {showCardSettings && (
                      <div className="mt-4 space-y-4">
                        {/* إعداد بطاقة إظهار رقم */}
                        {allowedCards.includes("revealNumber") && (
                          <div className="p-2 bg-purple-50 rounded-lg border border-purple-200">
                            <p className="text-xs font-medium text-purple-700 mb-2 flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              بطاقة إظهار رقم
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setRevealNumberShowPosition(true)}
                                className={`flex-1 px-2 py-1.5 text-xs rounded border-2 transition-all ${
                                  revealNumberShowPosition 
                                    ? 'bg-purple-100 border-purple-400 text-purple-700' 
                                    : 'bg-white border-gray-200 text-gray-500'
                                }`}
                              >
                                إظهار في الخانة
                              </button>
                              <button
                                onClick={() => setRevealNumberShowPosition(false)}
                                className={`flex-1 px-2 py-1.5 text-xs rounded border-2 transition-all ${
                                  !revealNumberShowPosition 
                                    ? 'bg-purple-100 border-purple-400 text-purple-700' 
                                    : 'bg-white border-gray-200 text-gray-500'
                                }`}
                              >
                                إشعار فقط
                              </button>
                            </div>
                          </div>
                        )}

                        {/* إعداد بطاقة حرق رقم */}
                        {allowedCards.includes("burnNumber") && (
                          <div className="p-2 bg-red-50 rounded-lg border border-red-200">
                            <p className="text-xs font-medium text-red-700 mb-2 flex items-center gap-1">
                              <XCircle className="w-3 h-3" />
                              عدد الأرقام المحروقة: <span className="text-red-600 font-bold">{burnNumberCount}</span>
                            </p>
                            <input
                              type="range"
                              min="1"
                              max="3"
                              value={burnNumberCount}
                              onChange={(e) => setBurnNumberCount(Number(e.target.value))}
                              className="w-full h-1.5 bg-red-200 rounded-lg appearance-none cursor-pointer accent-red-600"
                            />
                          </div>
                        )}

                        {/* إعداد بطاقة كشف الزوجي/الفردي */}
                        {allowedCards.includes("revealParity") && (
                          <div className="p-2 bg-green-50 rounded-lg border border-green-200">
                            <p className="text-xs font-medium text-green-700 mb-2 flex items-center gap-1">
                              <Hash className="w-3 h-3" />
                              عدد الخانات المكشوفة: <span className="text-green-600 font-bold">{Math.min(revealParitySlots, numDigits)}</span>
                            </p>
                            <input
                              type="range"
                              min="1"
                              max={numDigits}
                              value={Math.min(revealParitySlots, numDigits)}
                              onChange={(e) => setRevealParitySlots(Number(e.target.value))}
                              className="w-full h-1.5 bg-green-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                            />
                          </div>
                        )}

                        {/* إعداد بطاقة التجميد */}
                        {allowedCards.includes("freeze") && (
                          <div className="p-2 bg-cyan-50 rounded-lg border border-cyan-200">
                            <p className="text-xs font-medium text-cyan-700 mb-2 flex items-center gap-1">
                              <Snowflake className="w-3 h-3" />
                              مدة التجميد: <span className="text-cyan-600 font-bold">{freezeDuration} ثانية</span>
                            </p>
                            <input
                              type="range"
                              min="10"
                              max="120"
                              step="10"
                              value={freezeDuration}
                              onChange={(e) => setFreezeDuration(Number(e.target.value))}
                              className="w-full h-1.5 bg-cyan-200 rounded-lg appearance-none cursor-pointer accent-cyan-600"
                            />
                          </div>
                        )}

                        {/* إعداد بطاقة الدرع */}
                        {allowedCards.includes("shield") && (
                          <div className="p-2 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-xs font-medium text-blue-700 mb-2 flex items-center gap-1">
                              <Shield className="w-3 h-3" />
                              مدة الدرع: <span className="text-blue-600 font-bold">{shieldDuration} ثانية</span>
                            </p>
                            <input
                              type="range"
                              min="30"
                              max="300"
                              step="30"
                              value={shieldDuration}
                              onChange={(e) => setShieldDuration(Number(e.target.value))}
                              className="w-full h-1.5 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              ملاحظة: الدرع لا يلغي التجميد إذا كان مفعّلاً قبله
                            </p>
                          </div>
                        )}
                      </div>
                    )}
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
                  <li>مدة الجولة: <span className="font-bold text-blue-600">{roundDuration} دقائق</span></li>
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
