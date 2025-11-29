import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useChallenges, type DirectionType, type ColorDirection } from "@/lib/stores/useChallenges";
import { useAudio } from "@/lib/stores/useAudio";
import { ArrowLeft, ArrowRight, ArrowUp, ArrowDown, X, Check, Clock, AlertTriangle, Smartphone, Monitor } from "lucide-react";
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
  nothing: "لا شيء",
};

const colorLabels: Record<ColorDirection, string> = {
  green: "أخضر",
  yellow: "أصفر",
  blue: "أزرق",
  red: "أحمر",
};

const colorToDirection: Record<ColorDirection, string> = {
  green: "يمين",
  yellow: "يسار",
  blue: "فوق",
  red: "تحت",
};

const colorStyles: Record<ColorDirection, string> = {
  green: "bg-white border-slate-300",
  yellow: "bg-white border-slate-300",
  blue: "bg-white border-slate-300",
  red: "bg-white border-slate-300",
};

const colorToColorValue: Record<ColorDirection, string> = {
  green: "#22c55e",
  yellow: "#eab308",
  blue: "#3b82f6",
  red: "#ef4444",
};

interface ColorPosition {
  yellow: 'left' | 'right' | 'top' | 'bottom';
  green: 'left' | 'right' | 'top' | 'bottom';
  blue: 'left' | 'right' | 'top' | 'bottom';
  red: 'left' | 'right' | 'top' | 'bottom';
}

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
  const [cardTransform, setCardTransform] = useState({ x: 0, y: 0, z: 0 });
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const hasInputRef = useRef(false);

  // Use color positions from store
  const colorPositions = directionChallenge.colorPositions;

  const handleInput = useCallback((input: "right" | "left" | "up" | "down" | "none") => {
    if (hasInputRef.current) return;
    hasInputRef.current = true;

    const isCorrect = directionHandleInput(input);
    
    if (directionChallenge.useColors && directionChallenge.currentColor && colorPositions) {
      const position = colorPositions[directionChallenge.currentColor];
      const expectedDir = position === 'top' ? 'up' : position === 'bottom' ? 'down' : position;
      console.log(`[Direction] Color: ${directionChallenge.currentColor} at ${position}, Expected: ${expectedDir}, Input: ${input}, Correct: ${isCorrect}`);
    }
    
    if (isCorrect) {
      playConfirm();
      setShowFeedback("correct");
      
      if (input === "right") setCardTransform({ x: 50, y: 0, z: 0 });
      else if (input === "left") setCardTransform({ x: -50, y: 0, z: 0 });
      else if (input === "up") setCardTransform({ x: 0, y: -50, z: 0 });
      else if (input === "down") setCardTransform({ x: 0, y: 50, z: 0 });
    } else {
      playError();
      setShowFeedback("wrong");
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    if (progressRef.current) clearInterval(progressRef.current);

    setTimeout(() => {
      setShowFeedback(null);
      setCardTransform({ x: 0, y: 0, z: 0 });
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

  const getCubeStyle = () => {
    return "bg-transparent";
  };

  const getCubeTextColor = () => {
    return "text-white";
  };

  // Calculate border and glow colors
  const colorMap: Record<ColorDirection, string> = {
    red: "rgba(239, 68, 68, 0.8)",
    green: "rgba(34, 197, 94, 0.8)",
    blue: "rgba(59, 130, 246, 0.8)",
    yellow: "rgba(234, 179, 8, 0.8)",
  };

  const glowColorMap: Record<ColorDirection, string> = {
    red: "rgba(239, 68, 68, 0.4)",
    green: "rgba(34, 197, 94, 0.4)",
    blue: "rgba(59, 130, 246, 0.4)",
    yellow: "rgba(234, 179, 8, 0.4)",
  };

  const borderColor = directionChallenge.useColors && directionChallenge.currentColor
    ? colorMap[directionChallenge.currentColor] || "rgba(255, 255, 255, 0.5)"
    : "rgba(255, 255, 255, 0.5)";

  const glowColor = directionChallenge.useColors && directionChallenge.currentColor
    ? glowColorMap[directionChallenge.currentColor] || "rgba(255, 255, 255, 0.3)"
    : "rgba(255, 255, 255, 0.3)";

  return (
    <div 
      className="w-full h-full flex flex-col items-center justify-center p-4 sm:p-8 bg-gradient-to-b from-purple-900 to-slate-950 select-none overflow-hidden"
      style={{ touchAction: 'none' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={resetToMenu}
            className="flex items-center gap-2 bg-slate-800/80 hover:bg-slate-700/80 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-xl transition-all shadow-lg"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="font-bold text-sm sm:text-base">رجوع</span>
          </button>

          <div className="text-center flex-1 mx-4">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-1">
              ترتيب الاتجاهات
            </h2>
          </div>

          <div className="w-16 sm:w-24"></div>
        </div>

        <div className="flex items-center justify-center gap-4 sm:gap-8 mb-20 flex-wrap">
          <div className="bg-slate-800/80 backdrop-blur-xl px-3 sm:px-4 py-2 sm:py-3 rounded-xl shadow-lg">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
              <div className="text-center">
                <p className="text-gray-400 text-xs">الجولة</p>
                <p className="text-lg sm:text-xl font-bold text-white">
                  {directionChallenge.currentRound} / {directionChallenge.totalRounds}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/80 backdrop-blur-xl px-3 sm:px-4 py-2 sm:py-3 rounded-xl shadow-lg">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
              <div className="text-center">
                <p className="text-gray-400 text-xs">النقاط</p>
                <p className="text-lg sm:text-xl font-bold text-white">
                  {directionChallenge.score}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/80 backdrop-blur-xl px-3 sm:px-4 py-2 sm:py-3 rounded-xl shadow-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
              <div className="text-center">
                <p className="text-gray-400 text-xs">الأخطاء</p>
                <p className="text-lg sm:text-xl font-bold text-white">
                  {directionChallenge.errors} / {directionChallenge.maxErrors}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative flex flex-col items-center justify-center my-8">
          <AnimatePresence>
            {showFeedback && (
              <motion.div
                initial={{ scale: 0, opacity: 0, y: 20 }}
                animate={{ scale: 1.2, opacity: 1, y: 0 }}
                exit={{ scale: 0, opacity: 0, y: -20 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                className={`absolute -top-32 z-50 w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center ${
                  showFeedback === "correct" 
                    ? "bg-gradient-to-br from-green-400 to-green-600 shadow-lg shadow-green-500/50" 
                    : "bg-gradient-to-br from-red-400 to-red-600 shadow-lg shadow-red-500/50"
                }`}
              >
                <motion.div
                  initial={{ rotate: -45 }}
                  animate={{ rotate: 0 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  {showFeedback === "correct" ? (
                    <Check className="w-12 h-12 sm:w-14 sm:h-14 text-white" />
                  ) : (
                    <X className="w-12 h-12 sm:w-14 sm:h-14 text-white" />
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Progress bar - Wide bar below cube */}
          <div className="absolute top-80 w-72 h-6 bg-slate-900/60 rounded-lg overflow-hidden z-40 shadow-lg border-2 border-slate-700">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 shadow-lg shadow-blue-500/50 rounded-lg"
              style={{ width: `${progress}%` }}
              transition={{ type: "linear" }}
            />
          </div>

          <div style={{ perspective: '1000px' }} className="relative h-80 flex items-center justify-center">
            <motion.div
              style={{
                width: '200px',
                height: '200px',
                boxSizing: 'border-box',
              }}
              animate={{
                x: cardTransform.x,
                y: cardTransform.y,
                rotateZ: cardTransform.z,
                scale: showFeedback ? 1.15 : 1,
              }}
              transition={{ 
                type: "tween",
                duration: 0.3,
                ease: "easeInOut"
              }}
            >
              {/* Card Container with colored borders */}
              <div
                className={getCubeStyle()}
                style={{
                  position: 'absolute',
                  width: '200px',
                  height: '200px',
                  borderRadius: '48px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxSizing: 'border-box',
                  overflow: 'visible',
                  backdropFilter: 'blur(8px)',
                } as React.CSSProperties}
              >
                {/* Left border - Dynamic color based on colorPositions */}
                {(!directionChallenge.useColors || !colorPositions) && (
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', backgroundColor: '#ffffff', borderRadius: '30px 0 0 30px', boxShadow: '0 0 15px rgba(255, 255, 255, 0.8)' }} />
                )}
                {directionChallenge.useColors && colorPositions && (
                  <>
                    {colorPositions.yellow === 'left' && (
                      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', backgroundColor: '#eab308', borderRadius: '30px 0 0 30px', boxShadow: directionChallenge.currentColor === 'yellow' ? '0 0 20px rgba(234, 179, 8, 1), 0 0 35px rgba(234, 179, 8, 0.6)' : '0 0 10px rgba(234, 179, 8, 0.5)' }} />
                    )}
                    {colorPositions.green === 'left' && (
                      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', backgroundColor: '#22c55e', borderRadius: '30px 0 0 30px', boxShadow: directionChallenge.currentColor === 'green' ? '0 0 20px rgba(34, 197, 94, 1), 0 0 35px rgba(34, 197, 94, 0.6)' : '0 0 10px rgba(34, 197, 94, 0.5)' }} />
                    )}
                    {colorPositions.blue === 'left' && (
                      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', backgroundColor: '#3b82f6', borderRadius: '30px 0 0 30px', boxShadow: directionChallenge.currentColor === 'blue' ? '0 0 20px rgba(59, 130, 246, 1), 0 0 35px rgba(59, 130, 246, 0.6)' : '0 0 10px rgba(59, 130, 246, 0.5)' }} />
                    )}
                    {colorPositions.red === 'left' && (
                      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', backgroundColor: '#ef4444', borderRadius: '30px 0 0 30px', boxShadow: directionChallenge.currentColor === 'red' ? '0 0 20px rgba(239, 68, 68, 1), 0 0 35px rgba(239, 68, 68, 0.6)' : '0 0 10px rgba(239, 68, 68, 0.5)' }} />
                    )}
                  </>
                )}

                {/* Right border - Dynamic color based on colorPositions */}
                {(!directionChallenge.useColors || !colorPositions) && (
                  <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '3px', backgroundColor: '#ffffff', borderRadius: '0 30px 30px 0', boxShadow: '0 0 15px rgba(255, 255, 255, 0.8)' }} />
                )}
                {directionChallenge.useColors && colorPositions && (
                  <>
                    {colorPositions.yellow === 'right' && (
                      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '3px', backgroundColor: '#eab308', borderRadius: '0 30px 30px 0', boxShadow: directionChallenge.currentColor === 'yellow' ? '0 0 20px rgba(234, 179, 8, 1), 0 0 35px rgba(234, 179, 8, 0.6)' : '0 0 10px rgba(234, 179, 8, 0.5)' }} />
                    )}
                    {colorPositions.green === 'right' && (
                      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '3px', backgroundColor: '#22c55e', borderRadius: '0 30px 30px 0', boxShadow: directionChallenge.currentColor === 'green' ? '0 0 20px rgba(34, 197, 94, 1), 0 0 35px rgba(34, 197, 94, 0.6)' : '0 0 10px rgba(34, 197, 94, 0.5)' }} />
                    )}
                    {colorPositions.blue === 'right' && (
                      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '3px', backgroundColor: '#3b82f6', borderRadius: '0 30px 30px 0', boxShadow: directionChallenge.currentColor === 'blue' ? '0 0 20px rgba(59, 130, 246, 1), 0 0 35px rgba(59, 130, 246, 0.6)' : '0 0 10px rgba(59, 130, 246, 0.5)' }} />
                    )}
                    {colorPositions.red === 'right' && (
                      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '3px', backgroundColor: '#ef4444', borderRadius: '0 30px 30px 0', boxShadow: directionChallenge.currentColor === 'red' ? '0 0 20px rgba(239, 68, 68, 1), 0 0 35px rgba(239, 68, 68, 0.6)' : '0 0 10px rgba(239, 68, 68, 0.5)' }} />
                    )}
                  </>
                )}

                {/* Top border - Dynamic color based on colorPositions */}
                {(!directionChallenge.useColors || !colorPositions) && (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', backgroundColor: '#ffffff', borderRadius: '30px 30px 0 0', boxShadow: '0 0 15px rgba(255, 255, 255, 0.8)' }} />
                )}
                {directionChallenge.useColors && colorPositions && (
                  <>
                    {colorPositions.yellow === 'top' && (
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', backgroundColor: '#eab308', borderRadius: '30px 30px 0 0', boxShadow: directionChallenge.currentColor === 'yellow' ? '0 0 20px rgba(234, 179, 8, 1), 0 0 35px rgba(234, 179, 8, 0.6)' : '0 0 10px rgba(234, 179, 8, 0.5)' }} />
                    )}
                    {colorPositions.green === 'top' && (
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', backgroundColor: '#22c55e', borderRadius: '30px 30px 0 0', boxShadow: directionChallenge.currentColor === 'green' ? '0 0 20px rgba(34, 197, 94, 1), 0 0 35px rgba(34, 197, 94, 0.6)' : '0 0 10px rgba(34, 197, 94, 0.5)' }} />
                    )}
                    {colorPositions.blue === 'top' && (
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', backgroundColor: '#3b82f6', borderRadius: '30px 30px 0 0', boxShadow: directionChallenge.currentColor === 'blue' ? '0 0 20px rgba(59, 130, 246, 1), 0 0 35px rgba(59, 130, 246, 0.6)' : '0 0 10px rgba(59, 130, 246, 0.5)' }} />
                    )}
                    {colorPositions.red === 'top' && (
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', backgroundColor: '#ef4444', borderRadius: '30px 30px 0 0', boxShadow: directionChallenge.currentColor === 'red' ? '0 0 20px rgba(239, 68, 68, 1), 0 0 35px rgba(239, 68, 68, 0.6)' : '0 0 10px rgba(239, 68, 68, 0.5)' }} />
                    )}
                  </>
                )}

                {/* Bottom border - Dynamic color based on colorPositions */}
                {(!directionChallenge.useColors || !colorPositions) && (
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', backgroundColor: '#ffffff', borderRadius: '0 0 30px 30px', boxShadow: '0 0 15px rgba(255, 255, 255, 0.8)' }} />
                )}
                {directionChallenge.useColors && colorPositions && (
                  <>
                    {colorPositions.yellow === 'bottom' && (
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', backgroundColor: '#eab308', borderRadius: '0 0 30px 30px', boxShadow: directionChallenge.currentColor === 'yellow' ? '0 0 20px rgba(234, 179, 8, 1), 0 0 35px rgba(234, 179, 8, 0.6)' : '0 0 10px rgba(234, 179, 8, 0.5)' }} />
                    )}
                    {colorPositions.green === 'bottom' && (
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', backgroundColor: '#22c55e', borderRadius: '0 0 30px 30px', boxShadow: directionChallenge.currentColor === 'green' ? '0 0 20px rgba(34, 197, 94, 1), 0 0 35px rgba(34, 197, 94, 0.6)' : '0 0 10px rgba(34, 197, 94, 0.5)' }} />
                    )}
                    {colorPositions.blue === 'bottom' && (
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', backgroundColor: '#3b82f6', borderRadius: '0 0 30px 30px', boxShadow: directionChallenge.currentColor === 'blue' ? '0 0 20px rgba(59, 130, 246, 1), 0 0 35px rgba(59, 130, 246, 0.6)' : '0 0 10px rgba(59, 130, 246, 0.5)' }} />
                    )}
                    {colorPositions.red === 'bottom' && (
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', backgroundColor: '#ef4444', borderRadius: '0 0 30px 30px', boxShadow: directionChallenge.currentColor === 'red' ? '0 0 20px rgba(239, 68, 68, 1), 0 0 35px rgba(239, 68, 68, 0.6)' : '0 0 10px rgba(239, 68, 68, 0.5)' }} />
                    )}
                  </>
                )}

                {/* Inner content */}
                <motion.span 
                  className={`text-5xl font-black text-center z-10 ${getCubeTextColor()}`}
                  animate={{
                    scale: showFeedback ? [1, 1.08, 1] : 1,
                  }}
                  transition={{ duration: 0.25 }}
                >
                  {getDisplayText()}
                </motion.span>

              </div>
            </motion.div>
          </div>

          {isMobile ? (
            <div className="flex flex-col items-center gap-4 mt-8">
              <Smartphone className="w-8 h-8 text-gray-400" />
              <p className="text-gray-400 text-center text-sm">اسحب بإصبعك يمين أو شمال أو أعلى أو أسفل</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 mt-8">
              <p className="text-gray-300 text-center text-sm font-semibold">استخدم لوحة المفاتيح</p>
              <p className="text-gray-400 text-center text-sm">W = أعلى | A = يسار | S = أسفل | D = يمين</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
