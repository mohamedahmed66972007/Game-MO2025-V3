import { useEffect, useState } from "react";
import { useChallenges } from "@/lib/stores/useChallenges";
import { ArrowLeft, Check, X, Minus } from "lucide-react";

export function MemoryChallenge() {
  const {
    memoryChallenge,
    memoryFlashCells,
    memorySelectCell,
    memoryCheckSelection,
    memoryNextLevel,
    resetToMenu,
  } = useChallenges();

  const [showingPhase, setShowingPhase] = useState(false);
  const [flashingCells, setFlashingCells] = useState<number[]>([]);
  const [selectionComplete, setSelectionComplete] = useState(false);
  const [results, setResults] = useState<{cell: number; status: 'correct' | 'wrong' | 'missed'}[]>([]);

  useEffect(() => {
    startLevel();
  }, [memoryChallenge.currentLevel]);

  const startLevel = () => {
    setShowingPhase(true);
    setSelectionComplete(false);
    setResults([]);
    
    const gridSize = 5;
    const totalCells = gridSize * gridSize;
    const flashCounts = [4, 6, 8, 11, 13];
    const numFlash = flashCounts[Math.min(memoryChallenge.currentLevel, 4)];
    
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

  const handleCellClick = (cell: number) => {
    if (showingPhase || selectionComplete) return;
    
    memorySelectCell(cell);

    if (memoryChallenge.selectedCells.length + 1 === memoryChallenge.flashedCells.length) {
      const allSelected = [...memoryChallenge.selectedCells, cell];
      const correct = memoryCheckSelection();

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

      if (correct) {
        setTimeout(() => {
          memoryNextLevel();
        }, 2000);
      }
    }
  };

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
    if (status === "correct") return <Check className="w-8 h-8 text-white" />;
    if (status === "wrong") return <X className="w-8 h-8 text-white" />;
    if (status === "missed") return <Minus className="w-8 h-8 text-white" />;
    return null;
  };

  const gridCols = `grid-cols-${memoryChallenge.gridSize}`;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-slate-950">
      <div className="w-full max-w-2xl">
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
              اختبار الذاكرة
            </h2>
            <p className="text-gray-400">المستوى {memoryChallenge.currentLevel} / 5</p>
          </div>

          <div className="w-24"></div>
        </div>

        <div className="text-center mb-8">
          {showingPhase ? (
            <p className="text-2xl font-bold text-yellow-400 animate-pulse">
              راقب المربعات المضيئة...
            </p>
          ) : (
            <div>
              <p className="text-xl text-white mb-2">
                اضغط على المربعات التي ضاءت
              </p>
              <p className="text-gray-400">
                {memoryChallenge.selectedCells.length} / {memoryChallenge.flashedCells.length}
              </p>
            </div>
          )}
        </div>

        <div 
          className={`grid gap-1 sm:gap-2 md:gap-3 w-full max-w-xs sm:max-w-sm md:max-w-lg mx-auto px-2 sm:px-4`}
          style={{
            gridTemplateColumns: `repeat(5, minmax(0, 1fr))`
          }}
        >
          {Array.from({ length: 25 }).map((_, i) => {
            const status = getCellStatus(i);
            const color = getCellColor(status);
            const icon = getCellIcon(status);

            return (
              <button
                key={i}
                onClick={() => handleCellClick(i)}
                disabled={showingPhase || selectionComplete}
                className={`aspect-square rounded-xl transition-all transform ${color} ${
                  !showingPhase && !selectionComplete
                    ? "hover:scale-105 cursor-pointer"
                    : "cursor-not-allowed"
                } flex items-center justify-center shadow-lg`}
              >
                {icon}
              </button>
            );
          })}
        </div>

        {selectionComplete && (
          <div className="mt-8 text-center">
            <div className="flex items-center justify-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-green-500 rounded"></div>
                <span className="text-white">صحيح</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-red-500 rounded"></div>
                <span className="text-white">خطأ</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-orange-500 rounded"></div>
                <span className="text-white">فائت</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
