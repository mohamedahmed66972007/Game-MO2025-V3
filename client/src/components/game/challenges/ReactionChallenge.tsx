import { useEffect, useState, useRef } from "react";
import { useChallenges } from "@/lib/stores/useChallenges";
import { useAudio } from "@/lib/stores/useAudio";
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

  const { playConfirm, playError } = useAudio();
  const [currentSpeed, setCurrentSpeed] = useState(1500);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const spawnRef = useRef<NodeJS.Timeout | null>(null);
  const fakeOutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    reactionStartGame();

    timerRef.current = setInterval(() => {
      reactionUpdateTimer();
    }, 1000);

    spawnTarget();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (spawnRef.current) clearTimeout(spawnRef.current);
      if (fakeOutRef.current) clearTimeout(fakeOutRef.current);
    };
  }, []);

  useEffect(() => {
    const elapsedTime = 45 - reactionChallenge.timeRemaining;
    
    // Last 10 seconds: decelerate from 1500ms to 700ms
    if (reactionChallenge.timeRemaining <= 10) {
      const progressInLast10 = (10 - reactionChallenge.timeRemaining) / 10;
      const newSpeed = 1500 - (progressInLast10 * 800);
      setCurrentSpeed(Math.max(newSpeed, 700));
    } else {
      // Initial speed: 1500ms
      setCurrentSpeed(1500);
    }
  }, [reactionChallenge.timeRemaining]);

  const spawnTarget = () => {
    const timeRemainingWhenSpawned = reactionChallenge.timeRemaining;
    
    // Calculate speed based on current time remaining
    let speed = 1500;
    if (timeRemainingWhenSpawned <= 10) {
      const progressInLast10 = (10 - timeRemainingWhenSpawned) / 10;
      speed = Math.max(1500 - (progressInLast10 * 800), 700);
    }
    
    reactionSpawnTarget();

    // Fake-out behavior in last 20 seconds
    if (timeRemainingWhenSpawned <= 20 && Math.random() > 0.5) {
      // Create a fake-out: show target briefly then hide it
      fakeOutRef.current = setTimeout(() => {
        if (reactionChallenge.currentTarget !== null) {
          // Hide the target (spawn null or new location)
          const totalCells = reactionChallenge.gridSize * reactionChallenge.gridSize;
          const newCell = Math.floor(Math.random() * totalCells);
          reactionSpawnTarget();
        }
      }, 300); // Show fake target for 300ms then switch
    }

    spawnRef.current = setTimeout(() => {
      if (reactionChallenge.currentTarget !== null) {
        const newErrors = reactionChallenge.errors + 1;
        if (newErrors < 5) {
          spawnTarget();
        }
      }
    }, speed);
  };

  const handleCellClick = (cell: number, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const isCorrect = reactionChallenge.currentTarget === cell;
    
    if (isCorrect) {
      playConfirm();
    } else {
      playError();
    }
    
    reactionClickCell(cell);
    
    if (spawnRef.current) {
      clearTimeout(spawnRef.current);
    }
    if (fakeOutRef.current) {
      clearTimeout(fakeOutRef.current);
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
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-1">
              لعبة رد الفعل
            </h2>
            <p className="text-sm sm:text-base lg:text-lg text-gray-400">اضغط على المربع المضيء بسرعة!</p>
          </div>

          <div className="w-24"></div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-around gap-4 sm:gap-3 lg:gap-4 mb-8 w-full">
          <div className="bg-slate-800/80 backdrop-blur-xl px-4 sm:px-6 py-3 sm:py-4 rounded-2xl shadow-lg flex-1 sm:flex-none">
            <div className="flex items-center gap-2 sm:gap-3">
              <Clock className="w-5 sm:w-6 h-5 sm:h-6 text-blue-400" />
              <div>
                <p className="text-gray-400 text-xs sm:text-sm">الوقت المتبقي</p>
                <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
                  {reactionChallenge.timeRemaining}s
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/80 backdrop-blur-xl px-4 sm:px-6 py-3 sm:py-4 rounded-2xl shadow-lg flex-1 sm:flex-none">
            <div className="flex items-center gap-2 sm:gap-3">
              <Zap className="w-5 sm:w-6 h-5 sm:h-6 text-green-400" />
              <div>
                <p className="text-gray-400 text-xs sm:text-sm">النقاط</p>
                <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
                  {reactionChallenge.score}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/80 backdrop-blur-xl px-4 sm:px-6 py-3 sm:py-4 rounded-2xl shadow-lg flex-1 sm:flex-none">
            <div className="flex items-center gap-2 sm:gap-3">
              <svg
                className="w-5 sm:w-6 h-5 sm:h-6 text-red-400"
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
                <p className="text-gray-400 text-xs sm:text-sm">الأخطاء</p>
                <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
                  {reactionChallenge.errors} / 5
                </p>
              </div>
            </div>
          </div>
        </div>

        <div
          className="grid grid-cols-5 gap-1 sm:gap-2 md:gap-3 lg:gap-4 w-full max-w-xs sm:max-w-sm md:max-w-xl lg:max-w-3xl mx-auto px-2 sm:px-4"
        >
          {Array.from({ length: 25 }).map((_, i) => {
            const isTarget = reactionChallenge.currentTarget === i;

            return (
              <button
                key={i}
                onClick={(e) => handleCellClick(i, e)}
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
          <p className="text-sm sm:text-base lg:text-lg text-gray-400">
            السرعة الحالية: {(currentSpeed / 1000).toFixed(1)}s
          </p>
        </div>
      </div>
    </div>
  );
}
