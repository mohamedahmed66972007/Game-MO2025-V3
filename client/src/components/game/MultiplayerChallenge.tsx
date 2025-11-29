import { useEffect, useState, useRef } from "react";
import { useNumberGame } from "@/lib/stores/useNumberGame";
import { useCards } from "@/lib/stores/useCards";
import { useChallenges, type ChallengeType } from "@/lib/stores/useChallenges";
import { Brain, Target, Zap, Calculator, Shuffle, Trophy, Sparkles } from "lucide-react";
import { GuessChallenge } from "./challenges/GuessChallenge";
import { MemoryChallenge } from "./challenges/MemoryChallenge";
import { DirectionChallenge } from "./challenges/DirectionChallenge";
import { RainDropsChallenge } from "./challenges/RainDropsChallenge";

interface ChallengeInfo {
  id: ChallengeType;
  name: string;
  description: string;
  icon: React.ReactNode;
  bgColor: string;
}

const challengeInfoMap: Record<ChallengeType | "random", ChallengeInfo> = {
  guess: {
    id: "guess",
    name: "تحدي تسلسل الأضواء",
    description: "تذكر التسلسل الصحيح من الألوان وأعده",
    icon: <Brain className="w-8 h-8" />,
    bgColor: "#3b82f6",
  },
  memory: {
    id: "memory",
    name: "لوحة الذاكرة",
    description: "تذكر المربعات المضيئة واضغط عليها",
    icon: <Target className="w-8 h-8" />,
    bgColor: "#a855f7",
  },
  direction: {
    id: "direction",
    name: "ترتيب الاتجاهات",
    description: "حرك المكعب حسب الاتجاه المطلوب بسرعة",
    icon: <Zap className="w-8 h-8" />,
    bgColor: "#f97316",
  },
  raindrops: {
    id: "raindrops",
    name: "حبات المطر",
    description: "حل المسائل الحسابية قبل أن تصل الحبات للأسفل",
    icon: <Calculator className="w-8 h-8" />,
    bgColor: "#06b6d4",
  },
  random: {
    id: "guess",
    name: "عشوائي",
    description: "تحدي عشوائي",
    icon: <Shuffle className="w-8 h-8" />,
    bgColor: "#f97316",
  },
};

interface MultiplayerChallengeProps {
  onComplete: (won: boolean) => void;
}

export function MultiplayerChallenge({ onComplete }: MultiplayerChallengeProps) {
  const { multiplayer } = useNumberGame();
  const { awardWinnerCard } = useCards();
  const { 
    currentPhase, 
    selectChallenge, 
    startChallenge, 
    resetToMenu,
    resetChallengesHub 
  } = useChallenges();
  
  const [phase, setPhase] = useState<"intro" | "playing" | "result">("intro");
  const [countdown, setCountdown] = useState(3);
  const [hasWon, setHasWon] = useState(false);
  const hasStartedRef = useRef(false);
  const hasCompletedRef = useRef(false);

  const selectedChallenge = multiplayer.settings.selectedChallenge || "random";
  const [actualChallenge] = useState<ChallengeType>(() => {
    if (selectedChallenge === "random") {
      const challenges: ChallengeType[] = ["guess", "memory", "direction", "raindrops"];
      return challenges[Math.floor(Math.random() * challenges.length)];
    }
    return selectedChallenge as ChallengeType;
  });
  
  const challengeInfo = challengeInfoMap[actualChallenge] || challengeInfoMap.guess;

  // Watch for challenge phase changes (won/lost)
  useEffect(() => {
    if (phase === "playing" && !hasCompletedRef.current) {
      if (currentPhase === "won") {
        console.log("Challenge won!");
        hasCompletedRef.current = true;
        setHasWon(true);
        awardWinnerCard(multiplayer.playerId);
        setPhase("result");
      } else if (currentPhase === "lost") {
        console.log("Challenge lost!");
        hasCompletedRef.current = true;
        setHasWon(false);
        setPhase("result");
      }
    }
  }, [currentPhase, phase, awardWinnerCard, multiplayer.playerId]);

  // Intro countdown
  useEffect(() => {
    if (phase === "intro") {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            // Start the actual challenge
            if (!hasStartedRef.current) {
              hasStartedRef.current = true;
              console.log("Starting challenge:", actualChallenge);
              resetChallengesHub();
              setTimeout(() => {
                selectChallenge(actualChallenge);
                startChallenge();
                setPhase("playing");
              }, 100);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [phase, actualChallenge, selectChallenge, startChallenge, resetChallengesHub]);

  const handleContinue = () => {
    console.log("Continuing with result:", hasWon);
    resetToMenu();
    onComplete(hasWon);
  };

  // Intro Phase
  if (phase === "intro") {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center z-50">
        <div className="text-center space-y-8 p-8">
          <div 
            className="w-24 h-24 mx-auto rounded-3xl flex items-center justify-center shadow-2xl animate-pulse"
            style={{ backgroundColor: challengeInfo.bgColor }}
          >
            <div className="text-white">{challengeInfo.icon}</div>
          </div>
          
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">{challengeInfo.name}</h1>
            <p className="text-xl text-gray-300">{challengeInfo.description}</p>
          </div>
          
          <div className="flex items-center justify-center gap-4 text-gray-300">
            <Sparkles className="w-6 h-6 text-yellow-400" />
            <span className="text-lg">الفائز يحصل على بطاقة تلميح!</span>
          </div>
          
          <div className="text-8xl font-bold text-white animate-bounce">
            {countdown}
          </div>
          
          <p className="text-gray-400">استعد...</p>
        </div>
      </div>
    );
  }

  // Playing Phase - Render actual challenge components
  if (phase === "playing" && currentPhase === "playing") {
    return (
      <div className="fixed inset-0 bg-slate-950 z-50">
        {actualChallenge === "guess" && <GuessChallenge />}
        {actualChallenge === "memory" && <MemoryChallenge />}
        {actualChallenge === "direction" && <DirectionChallenge isMultiplayer={true} />}
        {actualChallenge === "raindrops" && <RainDropsChallenge />}
      </div>
    );
  }

  // Result Phase
  if (phase === "result" || currentPhase === "won" || currentPhase === "lost") {
    const won = hasWon || currentPhase === "won";
    
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center z-50 p-4">
        <div className="w-full max-w-md bg-slate-800/90 backdrop-blur-xl rounded-3xl p-8 text-center space-y-6">
          <div className="text-8xl animate-bounce">
            {won ? "🎉" : "😢"}
          </div>
          
          <h2 className={`text-4xl font-bold ${won ? "text-green-400" : "text-red-400"}`}>
            {won ? "أحسنت! فزت!" : "للأسف! لم تنجح"}
          </h2>
          
          {won && (
            <div className="flex items-center justify-center gap-3 bg-yellow-500/20 border border-yellow-500/50 rounded-xl p-4">
              <Trophy className="w-8 h-8 text-yellow-400" />
              <span className="text-xl text-yellow-300 font-bold">حصلت على بطاقة تلميح!</span>
            </div>
          )}
          
          <p className="text-gray-300">
            {won 
              ? "يمكنك استخدام البطاقة أثناء اللعبة للحصول على مساعدة"
              : "لا تقلق، يمكنك اللعب بدون بطاقات"}
          </p>
          
          <button
            onClick={handleContinue}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg text-xl"
          >
            ابدأ اللعبة الآن
          </button>
        </div>
      </div>
    );
  }

  // Loading state while challenge is starting
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center z-50">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto"></div>
        <p className="text-white text-xl">جاري تحميل التحدي...</p>
      </div>
    </div>
  );
}
