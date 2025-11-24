import { useEffect, useState, useRef } from "react";
import { useChallenges } from "@/lib/stores/useChallenges";
import { ArrowLeft, Clock, Zap } from "lucide-react";

export function ReactionChallenge() {
  const {
    reactionChallenge,
    reactionStartGame,
    reactionClickCell,
    reactionUpdateTimer,
    reactionSpawnTarget,
    resetToMenu,
  } = useChallenges();

  const [currentSpeed, setCurrentSpeed] = useState(2000);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const spawnRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    reactionStartGame();

    timerRef.current = setInterval(() => {
      reactionUpdateTimer();
    }, 1000);

    spawnTarget();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (spawnRef.current) clearTimeout(spawnRef.current);
    };
  }, []);

  useEffect(() => {
    const elapsedTime = 45 - reactionChallenge.timeRemaining;
    const newSpeed = Math.max(3000 - elapsedTime * 40, 1200);
    setCurrentSpeed(newSpeed);
  }, [reactionChallenge.timeRemaining]);

  const spawnTarget = () => {
    reactionSpawnTarget();

    spawnRef.current = setTimeout(() => {
      if (reactionChallenge.currentTarget !== null) {
        const newErrors = reactionChallenge.errors + 1;
        if (newErrors < 5) {
          spawnTarget();
        }
      }
    }, currentSpeed);
  };

  const handleCellClick = (cell: number) => {
    reactionClickCell(cell);
    
    if (spawnRef.current) {
      clearTimeout(spawnRef.current);
    }

    if (reactionChallenge.errors < 5) {
      setTimeout(() => {
        spawnTarget();
      }, 300);
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-slate-950">
      <div className="w-full max-w-3xl">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={resetToMenu}
            className="flex items-center gap-2 bg-slate-800/80 hover:bg-slate-700/80 text-white px-6 py-3 rounded-xl transition-all shadow-lg"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-bold">رجوع</span>
          </button>

          <div className="text-center">
            <h2 className="text-3xl font-bold text-white mb-1">
              لعبة رد الفعل
            </h2>
            <p className="text-gray-400">اضغط على المربع المضيء بسرعة!</p>
          </div>

          <div className="w-24"></div>
        </div>

        <div className="flex items-center justify-around mb-8">
          <div className="bg-slate-800/80 backdrop-blur-xl px-6 py-4 rounded-2xl shadow-lg">
            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6 text-blue-400" />
              <div>
                <p className="text-gray-400 text-sm">الوقت المتبقي</p>
                <p className="text-3xl font-bold text-white">
                  {reactionChallenge.timeRemaining}s
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/80 backdrop-blur-xl px-6 py-4 rounded-2xl shadow-lg">
            <div className="flex items-center gap-3">
              <Zap className="w-6 h-6 text-green-400" />
              <div>
                <p className="text-gray-400 text-sm">النقاط</p>
                <p className="text-3xl font-bold text-white">
                  {reactionChallenge.score}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/80 backdrop-blur-xl px-6 py-4 rounded-2xl shadow-lg">
            <div className="flex items-center gap-3">
              <svg
                className="w-6 h-6 text-red-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="text-gray-400 text-sm">الأخطاء</p>
                <p className="text-3xl font-bold text-white">
                  {reactionChallenge.errors} / 5
                </p>
              </div>
            </div>
          </div>
        </div>

        <div
          className="grid grid-cols-5 gap-1 sm:gap-2 md:gap-3 w-full max-w-xs sm:max-w-sm md:max-w-lg mx-auto px-2 sm:px-4"
        >
          {Array.from({ length: 25 }).map((_, i) => {
            const isTarget = reactionChallenge.currentTarget === i;

            return (
              <button
                key={i}
                onClick={() => handleCellClick(i)}
                className={`aspect-square rounded-xl transition-all transform shadow-lg ${
                  isTarget
                    ? "bg-yellow-500 scale-110 shadow-2xl shadow-yellow-500/50 animate-pulse"
                    : "bg-slate-700 hover:bg-slate-600 hover:scale-105"
                }`}
              />
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-400">
            السرعة الحالية: {(currentSpeed / 1000).toFixed(1)}s
          </p>
        </div>
      </div>
    </div>
  );
}
