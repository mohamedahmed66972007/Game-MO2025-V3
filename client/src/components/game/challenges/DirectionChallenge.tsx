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

export function DirectionChallenge({ onExit }: { onExit?: () => void } = {}) {
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
    const iconClass = "w-6 h-6 md:w-8 md:h-8";
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
      className="w-full h-full flex flex-col items-center justify-center p-4 md:p-6 lg:p-8 bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 select-none overflow-hidden relative"
      style={{ touchAction: 'none' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Header */}
      <div className="w-full max-w-2xl z-10 mb-6 flex items-center justify-between">
        <button
          onClick={() => {
            resetToMenu();
            onExit?.();
          }}
          className="flex items-center gap-2 bg-white/10 backdrop-blur-xl hover:bg-white/20 text-white px-4 py-2 rounded-xl transition-all shadow-lg border border-white/10"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-bold text-sm">رجوع</span>
        </button>

        <div className="flex items-center gap-2 md:gap-3">
          <motion.div 
            className="bg-white/10 backdrop-blur-xl px-3 py-2 rounded-lg shadow-lg border border-white/10 flex items-center gap-2"
            animate={{ scale: directionChallenge.errors > 0 ? [1, 1.1, 1] : 1 }}
          >
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-sm font-bold text-white">{directionChallenge.errors}/{directionChallenge.maxErrors}</span>
          </motion.div>

          <div className="bg-white/10 backdrop-blur-xl px-3 py-2 rounded-lg shadow-lg border border-white/10 flex items-center gap-2">
            <Check className="w-4 h-4 text-green-400" />
            <span className="text-sm font-bold text-white">{directionChallenge.score}</span>
          </div>

          <div className="bg-white/10 backdrop-blur-xl px-3 py-2 rounded-lg shadow-lg border border-white/10 flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-bold text-white">{directionChallenge.currentRound}/{directionChallenge.totalRounds}</span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-2xl h-1.5 bg-white/10 rounded-full overflow-hidden backdrop-blur-xl mb-8 z-10">
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

      {/* Game Area - Grid layout for perfect alignment */}
      <div className="flex-1 flex items-center justify-center w-full z-10 px-4">
        <div 
          className="grid"
          style={{
            gridTemplateColumns: '70px 150px 70px',
            gridTemplateRows: '70px 150px 70px',
            gap: '24px',
            placeItems: 'center',
            width: 'fit-content',
          }}
        >
          {/* Up Arrow - Grid position: row 0, col 1 */}
          <motion.button
            onClick={() => !hasInputRef.current && handleInput("up")}
            className="rounded-2xl flex items-center justify-center transition-all border-2 backdrop-blur-sm"
            style={{
              gridColumn: '2',
              gridRow: '1',
              width: '70px',
              height: '70px',
              backgroundColor: directionChallenge.useColors && getColorForPosition('top') 
                ? `${colorValues[getColorForPosition('top')!]}30` 
                : 'rgba(255,255,255,0.1)',
              borderColor: directionChallenge.useColors && getColorForPosition('top')
                ? colorValues[getColorForPosition('top')!]
                : 'rgba(255,255,255,0.3)',
              boxShadow: pulseDirection === 'up' 
                ? `0 0 30px rgba(139, 92, 246, 0.8)`
                : '0 4px 15px rgba(0,0,0,0.3)',
            }}
            animate={{
              scale: pulseDirection === 'up' ? 1.15 : 1,
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <span style={{ color: directionChallenge.useColors && getColorForPosition('top') ? colorValues[getColorForPosition('top')!] : 'white' }}>
              {getDirectionIcon('up')}
            </span>
          </motion.button>
          
          {/* Left Arrow - Grid position varies by device */}
          <motion.button
            onClick={() => !hasInputRef.current && handleInput("left")}
            className="rounded-2xl flex items-center justify-center transition-all border-2 backdrop-blur-sm"
            style={{
              gridColumn: isMobile ? '3' : '3',
              gridRow: '2',
              width: '70px',
              height: '70px',
              backgroundColor: directionChallenge.useColors && getColorForPosition('left') 
                ? `${colorValues[getColorForPosition('left')!]}30` 
                : 'rgba(255,255,255,0.1)',
              borderColor: directionChallenge.useColors && getColorForPosition('left')
                ? colorValues[getColorForPosition('left')!]
                : 'rgba(255,255,255,0.3)',
              boxShadow: pulseDirection === 'left' 
                ? `0 0 30px rgba(139, 92, 246, 0.8)`
                : '0 4px 15px rgba(0,0,0,0.3)',
            }}
            animate={{
              scale: pulseDirection === 'left' ? 1.15 : 1,
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <span style={{ color: directionChallenge.useColors && getColorForPosition('left') ? colorValues[getColorForPosition('left')!] : 'white' }}>
              {getDirectionIcon('left')}
            </span>
          </motion.button>

          {/* Center card - Grid position: row 1, col 1 */}
          <motion.div
            className="rounded-2xl flex items-center justify-center overflow-hidden bg-slate-800/95 border-2 border-white/40 shadow-2xl"
            style={{
              gridColumn: '2',
              gridRow: '2',
              width: '150px',
              height: '150px',
              boxShadow: '0 0 50px rgba(139, 92, 246, 0.4), inset 0 0 80px rgba(139, 92, 246, 0.2)',
            }}
            animate={{
              scale: showFeedback ? 1.05 : 1,
              rotate: showFeedback === "wrong" ? [0, -5, 5, -5, 5, 0] : 0,
            }}
            transition={{ duration: 0.3 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl" />
            
            <span 
              className="text-xl md:text-2xl font-black text-white z-10 text-center px-3 leading-tight"
              style={{
                textShadow: '0 0 20px rgba(255,255,255,0.3)',
              }}
            >
              {getDisplayText()}
            </span>

          </motion.div>
          
          {/* Right Arrow - Grid position varies by device */}
          <motion.button
            onClick={() => !hasInputRef.current && handleInput("right")}
            className="rounded-2xl flex items-center justify-center transition-all border-2 backdrop-blur-sm"
            style={{
              gridColumn: isMobile ? '1' : '1',
              gridRow: '2',
              width: '70px',
              height: '70px',
              backgroundColor: directionChallenge.useColors && getColorForPosition('right') 
                ? `${colorValues[getColorForPosition('right')!]}30` 
                : 'rgba(255,255,255,0.1)',
              borderColor: directionChallenge.useColors && getColorForPosition('right')
                ? colorValues[getColorForPosition('right')!]
                : 'rgba(255,255,255,0.3)',
              boxShadow: pulseDirection === 'right' 
                ? `0 0 30px rgba(139, 92, 246, 0.8)`
                : '0 4px 15px rgba(0,0,0,0.3)',
            }}
            animate={{
              scale: pulseDirection === 'right' ? 1.15 : 1,
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <span style={{ color: directionChallenge.useColors && getColorForPosition('right') ? colorValues[getColorForPosition('right')!] : 'white' }}>
              {getDirectionIcon('right')}
            </span>
          </motion.button>
          
          {/* Down Arrow - Grid position: row 2, col 1 */}
          <motion.button
            onClick={() => !hasInputRef.current && handleInput("down")}
            className="rounded-2xl flex items-center justify-center transition-all border-2 backdrop-blur-sm"
            style={{
              gridColumn: '2',
              gridRow: '3',
              width: '70px',
              height: '70px',
              backgroundColor: directionChallenge.useColors && getColorForPosition('bottom') 
                ? `${colorValues[getColorForPosition('bottom')!]}30` 
                : 'rgba(255,255,255,0.1)',
              borderColor: directionChallenge.useColors && getColorForPosition('bottom')
                ? colorValues[getColorForPosition('bottom')!]
                : 'rgba(255,255,255,0.3)',
              boxShadow: pulseDirection === 'down' 
                ? `0 0 30px rgba(139, 92, 246, 0.8)`
                : '0 4px 15px rgba(0,0,0,0.3)',
            }}
            animate={{
              scale: pulseDirection === 'down' ? 1.15 : 1,
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <span style={{ color: directionChallenge.useColors && getColorForPosition('bottom') ? colorValues[getColorForPosition('bottom')!] : 'white' }}>
              {getDirectionIcon('down')}
            </span>
          </motion.button>
        </div>
      </div>

      {/* Instructions */}
      <div className="w-full max-w-lg z-10 mt-6">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
          <div className="flex items-center gap-3 justify-center text-white/70 text-xs md:text-sm">
            {isMobile ? (
              <>
                <Hand className="w-4 h-4" />
                <span>اسحب في اتجاه الإجابة الصحيحة</span>
              </>
            ) : (
              <>
                <span className="flex items-center gap-1">
                  <kbd className="px-2 py-1 bg-white/10 rounded text-xs">↑</kbd>
                  <kbd className="px-2 py-1 bg-white/10 rounded text-xs">←</kbd>
                  <kbd className="px-2 py-1 bg-white/10 rounded text-xs">↓</kbd>
                  <kbd className="px-2 py-1 bg-white/10 rounded text-xs">→</kbd>
                </span>
                <span>أو الأسهم</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
