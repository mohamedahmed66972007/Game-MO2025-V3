import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { useChallenges, type RainDrop } from "@/lib/stores/useChallenges";
import { useAudio } from "@/lib/stores/useAudio";
import { Pause, X, Play, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function RainBackground() {
  const rainDrops = useMemo(() => {
    const drops = [];
    for (let i = 0; i < 80; i++) {
      drops.push({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 2,
        duration: 1 + Math.random() * 1,
        opacity: 0.1 + Math.random() * 0.2,
      });
    }
    return drops;
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {rainDrops.map((drop) => (
        <motion.div
          key={drop.id}
          className="absolute w-[2px] bg-gradient-to-b from-white/40 to-transparent"
          style={{
            left: `${drop.left}%`,
            height: '20px',
            opacity: drop.opacity,
          }}
          animate={{
            y: ['0vh', '100vh'],
          }}
          transition={{
            duration: drop.duration,
            repeat: Infinity,
            delay: drop.delay,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  );
}

function WaterWaves() {
  return (
    <div className="absolute bottom-0 left-0 right-0 h-16 overflow-hidden">
      <svg 
        viewBox="0 0 1200 60" 
        preserveAspectRatio="none"
        className="absolute bottom-0 w-full h-full"
      >
        <path
          d="M0,30 L30,45 L60,30 L90,45 L120,30 L150,45 L180,30 L210,45 L240,30 L270,45 L300,30 L330,45 L360,30 L390,45 L420,30 L450,45 L480,30 L510,45 L540,30 L570,45 L600,30 L630,45 L660,30 L690,45 L720,30 L750,45 L780,30 L810,45 L840,30 L870,45 L900,30 L930,45 L960,30 L990,45 L1020,30 L1050,45 L1080,30 L1110,45 L1140,30 L1170,45 L1200,30 L1200,60 L0,60 Z"
          fill="url(#waveGradient)"
        />
        <defs>
          <linearGradient id="waveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4338ca" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#1e1b4b" stopOpacity="1" />
          </linearGradient>
        </defs>
      </svg>
      <svg 
        viewBox="0 0 1200 60" 
        preserveAspectRatio="none"
        className="absolute bottom-0 w-full h-full opacity-50"
        style={{ transform: 'translateX(-15px)' }}
      >
        <path
          d="M0,35 L30,50 L60,35 L90,50 L120,35 L150,50 L180,35 L210,50 L240,35 L270,50 L300,35 L330,50 L360,35 L390,50 L420,35 L450,50 L480,35 L510,50 L540,35 L570,50 L600,35 L630,50 L660,35 L690,50 L720,35 L750,50 L780,35 L810,50 L840,35 L870,50 L900,35 L930,50 L960,35 L990,50 L1020,35 L1050,50 L1080,35 L1110,50 L1140,35 L1170,50 L1200,35 L1200,60 L0,60 Z"
          fill="#6366f1"
          opacity="0.3"
        />
      </svg>
    </div>
  );
}

interface EquationBubbleProps {
  drop: RainDrop;
  containerHeight: number;
  containerWidth: number;
}

function EquationBubble({ drop, containerHeight, containerWidth }: EquationBubbleProps) {
  const parts = drop.equation.match(/(\d+)\s*([+\-×÷])\s*(\d+)/);
  
  if (!parts) {
    return (
      <div className="bg-slate-900/95 rounded-full w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 flex items-center justify-center shadow-2xl border-2 border-slate-700">
        <span className="text-white font-bold text-lg">{drop.equation}</span>
      </div>
    );
  }

  const [, num1, operator, num2] = parts;

  return (
    <motion.div
      className="absolute"
      style={{
        left: `${drop.x}%`,
        top: `${(drop.y / 100) * containerHeight}px`,
        transform: 'translate(-50%, -50%)',
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
    >
      <div className="bg-slate-900/95 rounded-full w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 flex flex-col items-center justify-center shadow-2xl border-2 border-slate-700/50 backdrop-blur-sm">
        <span className="text-white font-bold text-sm md:text-base lg:text-lg leading-none">{num1}</span>
        <div className="flex items-center gap-0.5 my-0.5">
          <span className="text-cyan-400 font-bold text-lg md:text-xl lg:text-2xl leading-none">{operator}</span>
        </div>
        <span className="text-white font-bold text-sm md:text-base lg:text-lg leading-none">{num2}</span>
      </div>
    </motion.div>
  );
}

export function RainDropsChallenge() {
  const {
    raindropsChallenge,
    raindropsAddDrop,
    raindropsUpdateDrops,
    raindropsSetInput,
    raindropsSubmitAnswer,
    raindropsMissedDrop,
    raindropsRemoveDrop,
    raindropsUpdateTime,
    resetToMenu,
    completeChallenge,
  } = useChallenges();

  const { playConfirm, playError } = useAudio();
  const [showFeedback, setShowFeedback] = useState<"correct" | "wrong" | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const gameLoopRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(Date.now());
  const dropSpawnRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(400);
  const [containerWidth, setContainerWidth] = useState(400);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
        setContainerWidth(containerRef.current.clientWidth);
      }
      const isLandscape = window.innerHeight < window.innerWidth;
      const isLargeScreen = window.innerWidth >= 1024;
      setIsDesktop(isLargeScreen || (window.innerWidth >= 768 && !isLandscape));
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    window.addEventListener('orientationchange', updateDimensions);
    return () => {
      window.removeEventListener('resize', updateDimensions);
      window.removeEventListener('orientationchange', updateDimensions);
    };
  }, []);

  const handleSubmit = useCallback(() => {
    if (!raindropsChallenge.currentInput || isPaused) return;
    
    const success = raindropsSubmitAnswer();
    if (success) {
      playConfirm();
      setShowFeedback("correct");
    } else {
      playError();
      setShowFeedback("wrong");
    }
    
    setTimeout(() => setShowFeedback(null), 300);
  }, [raindropsChallenge.currentInput, raindropsSubmitAnswer, playConfirm, playError, isPaused]);

  const handleNumberPress = useCallback((num: string) => {
    if (isPaused) return;
    if (raindropsChallenge.currentInput.length < 4) {
      raindropsSetInput(raindropsChallenge.currentInput + num);
    }
  }, [raindropsChallenge.currentInput, raindropsSetInput, isPaused]);

  const handleDelete = useCallback(() => {
    if (isPaused) return;
    raindropsSetInput(raindropsChallenge.currentInput.slice(0, -1));
  }, [raindropsChallenge.currentInput, raindropsSetInput, isPaused]);

  const togglePause = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);

  useEffect(() => {
    if (!raindropsChallenge.isGameActive || isPaused) return;

    const gameLoop = () => {
      const now = Date.now();
      const deltaTime = now - lastTimeRef.current;
      lastTimeRef.current = now;

      raindropsUpdateDrops(deltaTime);

      const { drops, errors, maxErrors } = useChallenges.getState().raindropsChallenge;
      
      drops.forEach((drop) => {
        if (drop.y >= 95) {
          raindropsMissedDrop();
          raindropsRemoveDrop(drop.id);
          playError();
        }
      });

      const currentErrors = useChallenges.getState().raindropsChallenge.errors;
      if (currentErrors >= maxErrors) {
        completeChallenge(false);
        return;
      }

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    lastTimeRef.current = Date.now();
    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [raindropsChallenge.isGameActive, isPaused, raindropsUpdateDrops, raindropsMissedDrop, raindropsRemoveDrop, playError, completeChallenge]);

  useEffect(() => {
    if (!raindropsChallenge.isGameActive || isPaused) return;

    const spawnDrop = () => {
      raindropsAddDrop();
      const baseInterval = 4000;
      const minInterval = 2000;
      const difficultyReduction = raindropsChallenge.difficulty * 150;
      const nextInterval = Math.max(minInterval, baseInterval - difficultyReduction);
      
      dropSpawnRef.current = setTimeout(spawnDrop, nextInterval);
    };

    dropSpawnRef.current = setTimeout(spawnDrop, 1500);

    return () => {
      if (dropSpawnRef.current) {
        clearTimeout(dropSpawnRef.current);
      }
    };
  }, [raindropsChallenge.isGameActive, raindropsChallenge.difficulty, raindropsAddDrop, isPaused]);

  useEffect(() => {
    if (!raindropsChallenge.isGameActive || isPaused) return;

    timerRef.current = setInterval(() => {
      const { timeRemaining } = useChallenges.getState().raindropsChallenge;
      if (timeRemaining <= 1) {
        completeChallenge(true);
      } else {
        raindropsUpdateTime(timeRemaining - 1);
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [raindropsChallenge.isGameActive, raindropsUpdateTime, completeChallenge, isPaused]);

  return (
    <div className="w-full h-full flex flex-col md:flex-row bg-gradient-to-b from-indigo-600 via-purple-600 to-indigo-900 select-none overflow-hidden relative">
      <RainBackground />
      
      {/* Desktop: Side panel for controls */}
      <div className={`${isDesktop ? 'w-80 order-2 flex flex-col' : 'hidden'} bg-slate-900/95 backdrop-blur-xl z-20 relative`}>
        {/* Header for desktop */}
        <div className="flex items-center justify-between p-4 border-b border-purple-500/30">
          <button
            onClick={resetToMenu}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-bold">رجوع</span>
          </button>
          <button
            onClick={togglePause}
            className="w-12 h-12 bg-white/20 backdrop-blur-xl hover:bg-white/30 text-white rounded-full flex items-center justify-center transition-all shadow-lg"
          >
            {isPaused ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
          </button>
        </div>

        {/* Stats for desktop */}
        <div className="p-4 space-y-4">
          <div className="bg-gradient-to-br from-purple-600/50 to-indigo-600/50 rounded-2xl p-4 text-center border border-purple-400/30">
            <span className="text-white/70 text-sm block mb-1">النتيجة</span>
            <span className="text-4xl font-bold text-white">{raindropsChallenge.score}</span>
          </div>
          <div className="bg-gradient-to-br from-cyan-600/50 to-blue-600/50 rounded-2xl p-4 text-center border border-cyan-400/30">
            <span className="text-white/70 text-sm block mb-1">الوقت المتبقي</span>
            <span className="text-4xl font-bold text-white">{raindropsChallenge.timeRemaining}s</span>
          </div>
          <div className="bg-gradient-to-br from-red-600/50 to-orange-600/50 rounded-2xl p-4 text-center border border-red-400/30">
            <span className="text-white/70 text-sm block mb-1">الأخطاء</span>
            <span className="text-4xl font-bold text-white">{raindropsChallenge.errors}/{raindropsChallenge.maxErrors}</span>
          </div>
        </div>

        {/* Desktop numpad */}
        <div className="flex-1 p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 bg-purple-300/30 rounded-xl px-4 py-4 text-center border border-purple-400/30">
              <span className="text-3xl font-bold text-white font-mono">
                {raindropsChallenge.currentInput || '‎'}
              </span>
            </div>
            <button
              onClick={handleDelete}
              className="w-14 h-14 bg-purple-400/30 hover:bg-purple-400/50 text-white font-bold rounded-xl transition-all flex items-center justify-center border border-purple-400/30"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handleNumberPress(num.toString())}
                className="h-16 bg-purple-600/80 hover:bg-purple-500/80 text-white text-2xl font-bold rounded-xl shadow-lg active:scale-95 transition-all border border-purple-400/30"
              >
                {num}
              </button>
            ))}
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleNumberPress('0')}
              className="h-16 bg-purple-600/80 hover:bg-purple-500/80 text-white text-2xl font-bold rounded-xl shadow-lg active:scale-95 transition-all border border-purple-400/30"
            >
              0
            </button>
            <button
              onClick={handleSubmit}
              disabled={!raindropsChallenge.currentInput}
              className="h-16 bg-indigo-500/80 hover:bg-indigo-400/80 disabled:bg-gray-600/50 disabled:cursor-not-allowed text-white text-lg font-bold rounded-xl shadow-lg active:scale-95 transition-all border border-indigo-400/30"
            >
              إدخال
            </button>
          </div>
        </div>
      </div>

      {/* Main game area */}
      <div className={`flex-1 flex flex-col ${isDesktop ? 'order-1' : ''}`}>
        {/* Mobile header */}
        {!isDesktop && (
          <div className="flex items-center justify-between p-3 z-20 relative">
            <button
              onClick={togglePause}
              className="w-10 h-10 bg-white/20 backdrop-blur-xl hover:bg-white/30 text-white rounded-full flex items-center justify-center transition-all shadow-lg"
            >
              {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-3">
              <div className="bg-slate-800/80 backdrop-blur-xl px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                <span className="text-white/70 text-xs">النتيجة</span>
                <span className="text-base font-bold text-white">{raindropsChallenge.score}</span>
              </div>
              <div className="bg-slate-800/80 backdrop-blur-xl px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                <span className="text-white/70 text-xs">الوقت</span>
                <span className="text-base font-bold text-cyan-400">{raindropsChallenge.timeRemaining}s</span>
              </div>
            </div>
          </div>
        )}

        {/* Game container - larger on desktop */}
        <div 
          ref={containerRef}
          className={`flex-1 relative overflow-hidden z-10 ${isDesktop ? 'min-h-[70vh]' : ''}`}
          style={{ minHeight: isDesktop ? '70vh' : '50vh' }}
        >
          <AnimatePresence>
            {raindropsChallenge.drops.map((drop) => (
              <EquationBubble 
                key={drop.id} 
                drop={drop} 
                containerHeight={containerHeight}
                containerWidth={containerWidth}
              />
            ))}
          </AnimatePresence>

          <AnimatePresence>
            {showFeedback && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1.2, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center z-30 ${
                  showFeedback === "correct"
                    ? "bg-gradient-to-br from-green-400 to-green-600 shadow-lg shadow-green-500/50"
                    : "bg-gradient-to-br from-red-400 to-red-600 shadow-lg shadow-red-500/50"
                }`}
              >
                {showFeedback === "correct" ? (
                  <span className="text-white text-2xl md:text-3xl">✓</span>
                ) : (
                  <X className="w-8 h-8 md:w-10 md:h-10 text-white" />
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {isPaused && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-40">
              <div className="bg-slate-800/90 backdrop-blur-xl rounded-2xl p-8 text-center">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">إيقاف مؤقت</h2>
                <div className="flex gap-4">
                  <button
                    onClick={togglePause}
                    className="px-6 py-3 md:px-8 md:py-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl transition-all text-lg"
                  >
                    استمرار
                  </button>
                  <button
                    onClick={resetToMenu}
                    className="px-6 py-3 md:px-8 md:py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all text-lg"
                  >
                    خروج
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <WaterWaves />
      </div>

      {/* Mobile numpad */}
      {!isDesktop && (
        <div className="bg-slate-900/95 backdrop-blur-xl p-3 z-20 relative">
          <div className="max-w-sm mx-auto">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 bg-purple-300/30 rounded-xl px-4 py-3 text-center border border-purple-400/30">
                <span className="text-2xl font-bold text-white font-mono">
                  {raindropsChallenge.currentInput || ''}
                </span>
              </div>
              <button
                onClick={handleDelete}
                className="w-12 h-12 bg-purple-400/30 hover:bg-purple-400/50 text-white font-bold rounded-xl transition-all flex items-center justify-center border border-purple-400/30"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  onClick={() => handleNumberPress(num.toString())}
                  className="h-12 bg-purple-600/80 hover:bg-purple-500/80 text-white text-xl font-bold rounded-xl shadow-lg active:scale-95 transition-all border border-purple-400/30"
                >
                  {num}
                </button>
              ))}
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleNumberPress('0')}
                className="h-12 bg-purple-600/80 hover:bg-purple-500/80 text-white text-xl font-bold rounded-xl shadow-lg active:scale-95 transition-all border border-purple-400/30"
              >
                0
              </button>
              <button
                onClick={handleSubmit}
                disabled={!raindropsChallenge.currentInput}
                className="h-12 bg-indigo-500/80 hover:bg-indigo-400/80 disabled:bg-gray-600/50 disabled:cursor-not-allowed text-white text-base font-bold rounded-xl shadow-lg active:scale-95 transition-all border border-indigo-400/30"
              >
                إدخال
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
