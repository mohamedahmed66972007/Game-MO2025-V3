import { useEffect, useState, useRef, useCallback } from "react";
import { useChallenges, type DirectionType, type ColorDirection } from "@/lib/stores/useChallenges";
import { useAudio } from "@/lib/stores/useAudio";
import { ArrowLeft, ArrowRight, ArrowUp, ArrowDown, X, Check, Clock, AlertTriangle, Hand } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth < 768;
      setIsMobile(hasTouchScreen && isSmallScreen);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  return isMobile;
};

const directionLabels: Record<DirectionType, string> = {
  right: "يمين",
  left: "يسار",
  up: "فوق",
  down: "تحت",
  notRight: "ليس يمين",
  notLeft: "ليس يسار",
  notUp: "ليس فوق",
  notDown: "ليس تحت",
  nothing: "لا تتحرك",
};

const colorLabels: Record<ColorDirection, string> = {
  green: "أخضر",
  yellow: "أصفر",
  blue: "أزرق",
  red: "أحمر",
};

const colorValues: Record<ColorDirection, string> = {
  green: "#22c55e",
  yellow: "#eab308",
  blue: "#3b82f6",
  red: "#ef4444",
};

export function DirectionChallenge() {
  const {
    directionChallenge,
    directionNextRound,
    directionHandleInput,
    directionTimeOut,
    resetToMenu,
  } = useChallenges();

  const { playConfirm, playError } = useAudio();
  const isMobile = useIsMobile();
  const [progress, setProgress] = useState(100);
  const [showFeedback, setShowFeedback] = useState<"correct" | "wrong" | null>(null);
  const [pulseDirection, setPulseDirection] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const hasInputRef = useRef(false);

  const colorPositions = directionChallenge.colorPositions;

  const handleInput = useCallback((input: "right" | "left" | "up" | "down" | "none") => {
    if (hasInputRef.current) return;
    hasInputRef.current = true;

    const isCorrect = directionHandleInput(input);
    
    if (isCorrect) {
      playConfirm();
      setShowFeedback("correct");
      setPulseDirection(input);
    } else {
      playError();
      setShowFeedback("wrong");
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    if (progressRef.current) clearInterval(progressRef.current);

    setTimeout(() => {
      setShowFeedback(null);
      setPulseDirection(null);
      hasInputRef.current = false;
      directionNextRound();
    }, 400);
  }, [directionHandleInput, directionNextRound, playConfirm, playError]);

  const startRoundTimer = useCallback(() => {
    hasInputRef.current = false;
    setProgress(100);
    
    const startTime = Date.now();
    const duration = directionChallenge.timePerRound;
    
    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      
      if (remaining <= 0) {
        if (progressRef.current) clearInterval(progressRef.current);
      }
    }, 16);

    timerRef.current = setTimeout(() => {
      if (!hasInputRef.current) {
        if (directionChallenge.currentDirection === "nothing") {
          handleInput("none");
        } else {
          directionTimeOut();
          playError();
          setShowFeedback("wrong");
          
          setTimeout(() => {
            setShowFeedback(null);
            hasInputRef.current = false;
            directionNextRound();
          }, 400);
        }
      }
    }, duration);
  }, [directionChallenge.timePerRound, directionChallenge.currentDirection, directionTimeOut, directionNextRound, handleInput, playError]);

  useEffect(() => {
    if (directionChallenge.currentDirection) {
      startRoundTimer();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [directionChallenge.currentRound, startRoundTimer]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (hasInputRef.current || showFeedback) return;
      
      const key = e.key.toLowerCase();
      const code = e.code;
      
      if (key === "arrowright" || key === "d" || code === "KeyD") {
        e.preventDefault();
        handleInput("right");
        return;
      }
      if (key === "arrowleft" || key === "a" || code === "KeyA") {
        e.preventDefault();
        handleInput("left");
        return;
      }
      if (key === "arrowup" || key === "w" || code === "KeyW") {
        e.preventDefault();
        handleInput("up");
        return;
      }
      if (key === "arrowdown" || key === "s" || code === "KeyS") {
        e.preventDefault();
        handleInput("down");
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleInput, showFeedback]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isMobile) return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, [isMobile]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isMobile || !touchStartRef.current || hasInputRef.current) return;
    
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const diffX = endX - touchStartRef.current.x;
    const diffY = endY - touchStartRef.current.y;
    const minSwipeDistance = 30;

    if (Math.abs(diffX) > Math.abs(diffY)) {
      if (Math.abs(diffX) > minSwipeDistance) {
        const direction = diffX > 0 ? "right" : "left";
        handleInput(direction);
      }
    } else {
      if (Math.abs(diffY) > minSwipeDistance) {
        const direction = diffY > 0 ? "down" : "up";
        handleInput(direction);
      }
    }

    touchStartRef.current = null;
  }, [isMobile, handleInput]);

  const getDisplayText = () => {
    if (directionChallenge.useColors && directionChallenge.currentColor) {
      return colorLabels[directionChallenge.currentColor];
    }
    if (directionChallenge.currentDirection) {
      return directionLabels[directionChallenge.currentDirection];
    }
    return "";
  };

  const getDirectionIcon = (dir: "up" | "down" | "left" | "right") => {
    const iconClass = "w-8 h-8 md:w-10 md:h-10";
    switch (dir) {
      case "up": return <ArrowUp className={iconClass} />;
      case "down": return <ArrowDown className={iconClass} />;
      case "left": return <ArrowLeft className={iconClass} />;
      case "right": return <ArrowRight className={iconClass} />;
    }
  };

  const getColorForPosition = (position: 'top' | 'bottom' | 'left' | 'right') => {
    if (!colorPositions) return null;
    for (const [color, pos] of Object.entries(colorPositions)) {
      if (pos === position) return color as ColorDirection;
    }
    return null;
  };

  return (
    <div 
      className="w-full h-full flex flex-col items-center justify-between p-4 md:p-6 lg:p-8 bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 select-none overflow-hidden"
      style={{ touchAction: 'none' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="w-full max-w-2xl z-10">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={resetToMenu}
            className="flex items-center gap-2 bg-white/10 backdrop-blur-xl hover:bg-white/20 text-white px-4 py-2 md:px-6 md:py-3 rounded-2xl transition-all shadow-lg border border-white/10"
          >
            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
            <span className="font-bold text-sm md:text-base">رجوع</span>
          </button>

          <div className="flex items-center gap-2 md:gap-4">
            <motion.div 
              className="bg-white/10 backdrop-blur-xl px-3 py-2 md:px-4 md:py-3 rounded-2xl shadow-lg border border-white/10 flex items-center gap-2"
              animate={{ scale: directionChallenge.errors > 0 ? [1, 1.1, 1] : 1 }}
            >
              <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-red-400" />
              <span className="text-base md:text-lg font-bold text-white">
                {directionChallenge.errors}/{directionChallenge.maxErrors}
              </span>
            </motion.div>

            <div className="bg-white/10 backdrop-blur-xl px-3 py-2 md:px-4 md:py-3 rounded-2xl shadow-lg border border-white/10 flex items-center gap-2">
              <Check className="w-4 h-4 md:w-5 md:h-5 text-green-400" />
              <span className="text-base md:text-lg font-bold text-white">
                {directionChallenge.score}
              </span>
            </div>

            <div className="bg-white/10 backdrop-blur-xl px-3 py-2 md:px-4 md:py-3 rounded-2xl shadow-lg border border-white/10 flex items-center gap-2">
              <Clock className="w-4 h-4 md:w-5 md:h-5 text-cyan-400" />
              <span className="text-base md:text-lg font-bold text-white">
                {directionChallenge.currentRound}/{directionChallenge.totalRounds}
              </span>
            </div>
          </div>
        </div>

        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden backdrop-blur-xl">
          <motion.div
            className="h-full rounded-full"
            style={{
              width: `${progress}%`,
              background: progress > 50 
                ? 'linear-gradient(90deg, #06b6d4, #8b5cf6)' 
                : progress > 25 
                  ? 'linear-gradient(90deg, #eab308, #f97316)' 
                  : 'linear-gradient(90deg, #ef4444, #dc2626)',
            }}
            transition={{ duration: 0.1 }}
          />
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center w-full z-10 py-4">
        <div className="grid grid-cols-3 grid-rows-3 gap-3 md:gap-4" style={{ width: 'min(80vw, 340px)', aspectRatio: '1' }}>
          {/* Empty top-left */}
          <div />
          
          {/* Up arrow */}
          <motion.button
            onClick={() => !hasInputRef.current && handleInput("up")}
            className="w-full h-full rounded-2xl flex items-center justify-center transition-all border-2"
            style={{
              backgroundColor: directionChallenge.useColors && getColorForPosition('top') 
                ? `${colorValues[getColorForPosition('top')!]}30` 
                : 'rgba(255,255,255,0.1)',
              borderColor: directionChallenge.useColors && getColorForPosition('top')
                ? colorValues[getColorForPosition('top')!]
                : 'rgba(255,255,255,0.2)',
              boxShadow: pulseDirection === 'up' 
                ? `0 0 30px rgba(139, 92, 246, 0.5)`
                : 'none',
            }}
            animate={{
              scale: pulseDirection === 'up' ? 1.1 : 1,
              opacity: pulseDirection === 'up' ? 1 : 0.8,
            }}
            whileHover={{ scale: 1.05, opacity: 1 }}
            whileTap={{ scale: 0.95 }}
          >
            <span style={{ color: directionChallenge.useColors && getColorForPosition('top') ? colorValues[getColorForPosition('top')!] : 'white' }}>
              {getDirectionIcon('up')}
            </span>
          </motion.button>
          
          {/* Empty top-right */}
          <div />
          
          {/* Left arrow */}
          <motion.button
            onClick={() => !hasInputRef.current && handleInput("left")}
            className="w-full h-full rounded-2xl flex items-center justify-center transition-all border-2"
            style={{
              backgroundColor: directionChallenge.useColors && getColorForPosition('left') 
                ? `${colorValues[getColorForPosition('left')!]}30` 
                : 'rgba(255,255,255,0.1)',
              borderColor: directionChallenge.useColors && getColorForPosition('left')
                ? colorValues[getColorForPosition('left')!]
                : 'rgba(255,255,255,0.2)',
              boxShadow: pulseDirection === 'left' 
                ? `0 0 30px rgba(139, 92, 246, 0.5)`
                : 'none',
            }}
            animate={{
              scale: pulseDirection === 'left' ? 1.1 : 1,
              opacity: pulseDirection === 'left' ? 1 : 0.8,
            }}
            whileHover={{ scale: 1.05, opacity: 1 }}
            whileTap={{ scale: 0.95 }}
          >
            <span style={{ color: directionChallenge.useColors && getColorForPosition('left') ? colorValues[getColorForPosition('left')!] : 'white' }}>
              {getDirectionIcon('left')}
            </span>
          </motion.button>
          
          {/* Center - Display text */}
          <motion.div
            className="w-full h-full rounded-2xl flex items-center justify-center overflow-hidden bg-slate-800/90 border-2 border-white/20"
            style={{
              boxShadow: '0 0 40px rgba(139, 92, 246, 0.2), inset 0 0 60px rgba(139, 92, 246, 0.1)',
            }}
            animate={{
              scale: showFeedback ? 1.05 : 1,
              rotate: showFeedback === "wrong" ? [0, -5, 5, -5, 5, 0] : 0,
            }}
            transition={{ duration: 0.3 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
            
            <span 
              className="text-xl md:text-2xl lg:text-3xl font-black text-white z-10 text-center px-2"
              style={{
                textShadow: '0 0 20px rgba(255,255,255,0.3)',
              }}
            >
              {getDisplayText()}
            </span>
          </motion.div>
          
          {/* Right arrow */}
          <motion.button
            onClick={() => !hasInputRef.current && handleInput("right")}
            className="w-full h-full rounded-2xl flex items-center justify-center transition-all border-2"
            style={{
              backgroundColor: directionChallenge.useColors && getColorForPosition('right') 
                ? `${colorValues[getColorForPosition('right')!]}30` 
                : 'rgba(255,255,255,0.1)',
              borderColor: directionChallenge.useColors && getColorForPosition('right')
                ? colorValues[getColorForPosition('right')!]
                : 'rgba(255,255,255,0.2)',
              boxShadow: pulseDirection === 'right' 
                ? `0 0 30px rgba(139, 92, 246, 0.5)`
                : 'none',
            }}
            animate={{
              scale: pulseDirection === 'right' ? 1.1 : 1,
              opacity: pulseDirection === 'right' ? 1 : 0.8,
            }}
            whileHover={{ scale: 1.05, opacity: 1 }}
            whileTap={{ scale: 0.95 }}
          >
            <span style={{ color: directionChallenge.useColors && getColorForPosition('right') ? colorValues[getColorForPosition('right')!] : 'white' }}>
              {getDirectionIcon('right')}
            </span>
          </motion.button>
          
          {/* Empty bottom-left */}
          <div />
          
          {/* Down arrow */}
          <motion.button
            onClick={() => !hasInputRef.current && handleInput("down")}
            className="w-full h-full rounded-2xl flex items-center justify-center transition-all border-2"
            style={{
              backgroundColor: directionChallenge.useColors && getColorForPosition('bottom') 
                ? `${colorValues[getColorForPosition('bottom')!]}30` 
                : 'rgba(255,255,255,0.1)',
              borderColor: directionChallenge.useColors && getColorForPosition('bottom')
                ? colorValues[getColorForPosition('bottom')!]
                : 'rgba(255,255,255,0.2)',
              boxShadow: pulseDirection === 'down' 
                ? `0 0 30px rgba(139, 92, 246, 0.5)`
                : 'none',
            }}
            animate={{
              scale: pulseDirection === 'down' ? 1.1 : 1,
              opacity: pulseDirection === 'down' ? 1 : 0.8,
            }}
            whileHover={{ scale: 1.05, opacity: 1 }}
            whileTap={{ scale: 0.95 }}
          >
            <span style={{ color: directionChallenge.useColors && getColorForPosition('bottom') ? colorValues[getColorForPosition('bottom')!] : 'white' }}>
              {getDirectionIcon('down')}
            </span>
          </motion.button>
          
          {/* Empty bottom-right */}
          <div />

          {/* Feedback overlay */}
          <AnimatePresence>
            {showFeedback && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1.5, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
                style={{ gridColumn: '1 / -1', gridRow: '1 / -1' }}
              >
                <div className={`w-20 h-20 md:w-28 md:h-28 rounded-full flex items-center justify-center ${
                  showFeedback === "correct"
                    ? "bg-gradient-to-br from-green-400 to-emerald-600 shadow-2xl shadow-green-500/50"
                    : "bg-gradient-to-br from-red-400 to-rose-600 shadow-2xl shadow-red-500/50"
                }`}>
                  <motion.div
                    initial={{ rotate: -45, scale: 0 }}
                    animate={{ rotate: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    {showFeedback === "correct" ? (
                      <Check className="w-10 h-10 md:w-14 md:h-14 text-white" />
                    ) : (
                      <X className="w-10 h-10 md:w-14 md:h-14 text-white" />
                    )}
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="w-full max-w-lg z-10">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 md:p-6">
          <div className="flex items-center gap-3 justify-center text-white/70 text-sm md:text-base">
            {isMobile ? (
              <>
                <Hand className="w-5 h-5" />
                <span>اسحب في اتجاه الإجابة الصحيحة</span>
              </>
            ) : (
              <>
                <span className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-white/10 rounded-lg text-xs">W</kbd>
                  <kbd className="px-2 py-1 bg-white/10 rounded-lg text-xs">A</kbd>
                  <kbd className="px-2 py-1 bg-white/10 rounded-lg text-xs">S</kbd>
                  <kbd className="px-2 py-1 bg-white/10 rounded-lg text-xs">D</kbd>
                </span>
                <span>أو الأسهم للتحرك</span>
              </>
            )}
          </div>
          
          {directionChallenge.useColors && (
            <div className="mt-3 text-center text-white/50 text-xs md:text-sm">
              اضغط على السهم الذي يطابق لون الكلمة
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
