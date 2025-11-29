import { useEffect, useState, useRef } from "react";
import { useChallenges } from "@/lib/stores/useChallenges";
import { useAudio } from "@/lib/stores/useAudio";
import { ArrowLeft, Check, X, Minus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function MemoryChallenge() {
  const {
    memoryChallenge,
    memoryFlashCells,
    memorySelectCell,
    memoryCheckSelection,
    memoryNextLevel,
    memorySetScanner,
    memorySetSuccess,
    resetToMenu,
  } = useChallenges();

  const { playConfirm, playError, playSuccess } = useAudio();
  const [showingPhase, setShowingPhase] = useState(false);
  const [flashingCells, setFlashingCells] = useState<number[]>([]);
  const [selectionComplete, setSelectionComplete] = useState(false);
  const [results, setResults] = useState<{cell: number; status: 'correct' | 'wrong' | 'missed'}[]>([]);
  const [scannerPosition, setScannerPosition] = useState(0);
  const [showLevelSuccess, setShowLevelSuccess] = useState(false);
  const scannerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    startLevel();
  }, [memoryChallenge.currentLevel]);

  const startLevel = () => {
    setShowingPhase(true);
    setSelectionComplete(false);
    setResults([]);
    setShowLevelSuccess(false);
    setScannerPosition(0);
    
    const gridSize = 5;
    const totalCells = gridSize * gridSize;
    const flashCounts = [4, 6, 8, 11, 11];
    const numFlash = flashCounts[Math.min(memoryChallenge.currentLevel - 1, 4)];
    
    const cells: number[] = [];
    while (cells.length < numFlash) {
      const cell = Math.floor(Math.random() * totalCells);
      if (!cells.includes(cell)) {
        cells.push(cell);
      }
    }

    memoryFlashCells(cells);
    setFlashingCells(cells);
    
    setTimeout(() => {
      setFlashingCells([]);
      setShowingPhase(false);
    }, 2000);
  };

  const playScannerSound = () => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.5);
  };

  const playSuccessChime = () => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const notes = [523, 659, 784, 1047];
    
    notes.forEach((freq, i) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.value = freq;
      oscillator.type = 'sine';
      
      const startTime = ctx.currentTime + i * 0.1;
      gainNode.gain.setValueAtTime(0.15, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.3);
    });
  };

  const handleCellClick = (cell: number, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (showingPhase || selectionComplete) return;
    
    if (memoryChallenge.selectedCells.includes(cell)) return;
    
    const isCorrect = memoryChallenge.flashedCells.includes(cell);
    if (isCorrect) {
      playConfirm();
    } else {
      playError();
    }
    
    memorySelectCell(cell);

    const newSelectedCells = [...memoryChallenge.selectedCells, cell];

    if (newSelectedCells.length === memoryChallenge.flashedCells.length) {
      const allSelected = newSelectedCells;
      
      let allCorrect = true;
      for (const selectedCell of allSelected) {
        if (!memoryChallenge.flashedCells.includes(selectedCell)) {
          allCorrect = false;
          break;
        }
      }

      const newResults: {cell: number; status: 'correct' | 'wrong' | 'missed'}[] = [];
      
      for (const selectedCell of allSelected) {
        if (memoryChallenge.flashedCells.includes(selectedCell)) {
          newResults.push({ cell: selectedCell, status: 'correct' });
        } else {
          newResults.push({ cell: selectedCell, status: 'wrong' });
        }
      }

      for (const flashedCell of memoryChallenge.flashedCells) {
        if (!allSelected.includes(flashedCell)) {
          newResults.push({ cell: flashedCell, status: 'missed' });
        }
      }

      setResults(newResults);
      setSelectionComplete(true);

      if (allCorrect) {
        memorySetScanner(true);
        playScannerSound();
        
        let pos = 0;
        scannerRef.current = setInterval(() => {
          pos += 5;
          setScannerPosition(pos);
          if (pos >= 100) {
            if (scannerRef.current) clearInterval(scannerRef.current);
            memorySetScanner(false);
            
            setTimeout(() => {
              setShowLevelSuccess(true);
              memorySetSuccess(true);
              playSuccessChime();
              
              setTimeout(() => {
                setShowLevelSuccess(false);
                memorySetSuccess(false);
                memoryNextLevel();
              }, 1500);
            }, 200);
          }
        }, 20);
      } else {
        setTimeout(() => {
          memoryCheckSelection();
        }, 1500);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) clearInterval(scannerRef.current);
    };
  }, []);

  const getCellStatus = (cell: number) => {
    if (showingPhase && flashingCells.includes(cell)) return "flashing";
    if (selectionComplete) {
      const result = results.find(r => r.cell === cell);
      if (result) return result.status;
    }
    if (memoryChallenge.selectedCells.includes(cell)) return "selected";
    return "normal";
  };

  const getCellColor = (status: string) => {
    if (status === "flashing") return "bg-yellow-500 shadow-lg shadow-yellow-500/50";
    if (status === "correct") return "bg-green-500";
    if (status === "wrong") return "bg-red-500";
    if (status === "missed") return "bg-orange-500";
    if (status === "selected") return "bg-blue-400";
    return "bg-slate-700 hover:bg-slate-600";
  };

  const getCellIcon = (status: string) => {
    if (status === "correct") return <Check className="w-6 h-6 sm:w-8 sm:h-8 text-white" />;
    if (status === "wrong") return <X className="w-6 h-6 sm:w-8 sm:h-8 text-white" />;
    if (status === "missed") return <Minus className="w-6 h-6 sm:w-8 sm:h-8 text-white" />;
    return null;
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 sm:p-8 bg-slate-950">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <button
            onClick={resetToMenu}
            className="flex items-center gap-2 bg-slate-800/80 hover:bg-slate-700/80 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-xl transition-all shadow-lg"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="font-bold text-sm sm:text-base">رجوع</span>
          </button>

          <div className="text-center">
            <h2 className="text-xl sm:text-2xl lg:text-4xl font-bold text-white mb-1">
              لوحة الذاكرة
            </h2>
            <p className="text-sm sm:text-base lg:text-lg text-gray-400">المستوى {memoryChallenge.currentLevel} / 5</p>
          </div>

          <div className="w-16 sm:w-24"></div>
        </div>

        <div className="text-center mb-6 sm:mb-8">
          {showingPhase ? (
            <p className="text-base sm:text-lg lg:text-2xl font-bold text-yellow-400 animate-pulse">
              راقب المربعات المضيئة...
            </p>
          ) : (
            <div>
              <p className="text-sm sm:text-base lg:text-xl text-white mb-2">
                اضغط على المربعات التي ضاءت
              </p>
              <p className="text-xs sm:text-sm lg:text-lg text-gray-400">
                {memoryChallenge.selectedCells.length} / {memoryChallenge.flashedCells.length}
              </p>
            </div>
          )}
        </div>

        <div className="relative flex justify-center">
          <div 
            className="grid gap-2 sm:gap-3"
            style={{
              gridTemplateColumns: `repeat(5, minmax(0, 1fr))`,
              width: 'min(90vw, 320px)',
              maxWidth: '320px'
            }}
          >
            {Array.from({ length: 25 }).map((_, i) => {
              const status = getCellStatus(i);
              const color = getCellColor(status);
              const icon = getCellIcon(status);

              return (
                <motion.button
                  key={i}
                  onClick={(e) => handleCellClick(i, e)}
                  disabled={showingPhase || selectionComplete}
                  className={`aspect-square rounded-lg transition-all transform ${color} ${
                    !showingPhase && !selectionComplete
                      ? "hover:scale-105 cursor-pointer"
                      : "cursor-not-allowed"
                  } flex items-center justify-center shadow-lg`}
                  whileTap={{ scale: 0.95 }}
                  animate={
                    status === "selected" && !selectionComplete
                      ? { scale: [1, 1.1, 1] }
                      : {}
                  }
                  transition={{ duration: 0.2 }}
                >
                  <AnimatePresence>
                    {icon && (
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      >
                        {icon}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}
          </div>

          <AnimatePresence>
            {memoryChallenge.showingScanner && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl"
              >
                <motion.div
                  className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-lg shadow-cyan-400/50"
                  style={{ top: `${scannerPosition}%` }}
                />
                <div 
                  className="absolute inset-0 bg-gradient-to-b from-cyan-500/10 to-transparent"
                  style={{ height: `${scannerPosition}%` }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showLevelSuccess && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1] }}
                  transition={{ duration: 0.5 }}
                  className="w-24 h-24 sm:w-32 sm:h-32 bg-green-500 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/50"
                >
                  <Check className="w-16 h-16 sm:w-20 sm:h-20 text-white" />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {selectionComplete && !memoryChallenge.showingScanner && !showLevelSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 sm:mt-8 text-center"
          >
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 sm:w-6 sm:h-6 bg-green-500 rounded"></div>
                <span className="text-xs sm:text-base text-white">صحيح</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 sm:w-6 sm:h-6 bg-red-500 rounded"></div>
                <span className="text-xs sm:text-base text-white">خطأ</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 sm:w-6 sm:h-6 bg-orange-500 rounded"></div>
                <span className="text-xs sm:text-base text-white">فائت</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
