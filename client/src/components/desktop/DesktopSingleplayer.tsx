import { useState, useEffect } from "react";
import { useNumberGame } from "@/lib/stores/useNumberGame";
import { useAudio } from "@/lib/stores/useAudio";
import { Home, Check, X, Maximize2, Minimize2, Lightbulb } from "lucide-react";
import { useChallenges } from "@/lib/stores/useChallenges";

function useResponsiveSizes() {
  const [screenWidth, setScreenWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 0);

  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // حساب الأحجام بناءً على عرض الشاشة الفعلي
  const getButtonHeight = () => {
    if (screenWidth < 480) return 'h-9';
    if (screenWidth < 640) return 'h-10';
    if (screenWidth < 768) return 'h-11';
    if (screenWidth < 1024) return 'h-12';
    return 'h-12';
  };

  const getInputSize = () => {
    if (screenWidth < 480) return { width: 'w-9', height: 'h-11' };
    if (screenWidth < 640) return { width: 'w-10', height: 'h-12' };
    if (screenWidth < 768) return { width: 'w-11', height: 'h-14' };
    if (screenWidth < 1024) return { width: 'w-12', height: 'h-16' };
    return { width: 'w-12', height: 'h-16' };
  };

  const getTextSize = () => {
    if (screenWidth < 480) return 'text-xs';
    if (screenWidth < 640) return 'text-sm';
    if (screenWidth < 768) return 'text-base';
    return 'text-lg';
  };

  const getIconSize = () => {
    if (screenWidth < 480) return 'w-3 h-3';
    if (screenWidth < 640) return 'w-4 h-4';
    if (screenWidth < 768) return 'w-5 h-5';
    return 'w-6 h-6';
  };

  return { getButtonHeight, getInputSize, getTextSize, getIconSize, screenWidth };
}

export function DesktopSingleplayer({ onStartChallenge }: { onStartChallenge?: () => void }) {
  const {
    singleplayer,
    setMode,
    restartSingleplayer,
  } = useNumberGame();
  const hint = useChallenges((state) => state.hint);
  const { hasWonAnyChallenge, generateHint } = useChallenges();
  const hasWonChallenge = hasWonAnyChallenge();
  
  const { playDigit, playDelete, playError, successSound } = useAudio();
  const numDigits = singleplayer.settings.numDigits;
  const [input, setInput] = useState<string[]>(Array(numDigits).fill(""));
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [expandedAttempts, setExpandedAttempts] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [expandedAttemptIndex, setExpandedAttemptIndex] = useState(singleplayer.attempts.length - 1);
  const { getButtonHeight, getInputSize, getTextSize, getIconSize } = useResponsiveSizes();

  useEffect(() => {
    if (!singleplayer.secretCode || singleplayer.secretCode.length === 0) {
      restartSingleplayer();
    }
  }, [singleplayer.secretCode, restartSingleplayer]);

  useEffect(() => {
    setInput(Array(numDigits).fill(""));
    setFocusedIndex(0);
  }, [numDigits]);

  useEffect(() => {
    if (singleplayer.phase === "won" && !hint && singleplayer.secretCode) {
      console.log("✨ Singleplayer won - generating hint");
      generateHint(singleplayer.secretCode);
    }
  }, [singleplayer.phase, hint, singleplayer.secretCode, generateHint]);

  const handleNumberInput = (num: string) => {
    if (focusedIndex >= numDigits) return;
    
    playDigit(parseInt(num));
    const newInput = [...input];
    newInput[focusedIndex] = num;
    setInput(newInput);
    
    if (focusedIndex < numDigits - 1) {
      setFocusedIndex(focusedIndex + 1);
    }
  };

  const handleBackspace = () => {
    playDelete();
    if (focusedIndex > 0) {
      const newInput = [...input];
      if (input[focusedIndex] === "") {
        newInput[focusedIndex - 1] = "";
        setFocusedIndex(focusedIndex - 1);
      } else {
        newInput[focusedIndex] = "";
      }
      setInput(newInput);
    } else if (input[0] !== "") {
      const newInput = [...input];
      newInput[0] = "";
      setInput(newInput);
    }
  };

  const handleSubmit = () => {
    if (input.some(val => val === "")) {
      return;
    }

    const guess = input.map(Number);
    let correctCount = 0;
    let correctPositionCount = 0;

    const secretCopy = [...singleplayer.secretCode];
    const guessCopy = [...guess];
    const numDigits = singleplayer.settings.numDigits;

    for (let i = 0; i < numDigits; i++) {
      if (guessCopy[i] === secretCopy[i]) {
        correctPositionCount++;
        secretCopy[i] = -1;
        guessCopy[i] = -2;
      }
    }

    for (let i = 0; i < numDigits; i++) {
      if (guessCopy[i] !== -2) {
        const index = secretCopy.indexOf(guessCopy[i]);
        if (index !== -1) {
          correctCount++;
          secretCopy[index] = -1;
        }
      }
    }

    correctCount += correctPositionCount;

    useNumberGame.setState((state) => ({
      singleplayer: {
        ...state.singleplayer,
        attempts: [...state.singleplayer.attempts, { guess, correctCount, correctPositionCount }],
      },
    }));

    if (correctPositionCount === numDigits) {
      if (successSound) {
        successSound.currentTime = 0;
        successSound.play();
      }
      useNumberGame.setState((state) => ({
        singleplayer: {
          ...state.singleplayer,
          phase: "won",
        },
      }));
    } else if (singleplayer.attempts.length >= singleplayer.settings.maxAttempts - 1) {
      useNumberGame.setState((state) => ({
        singleplayer: {
          ...state.singleplayer,
          phase: "lost",
        },
      }));
    }

    setInput(Array(numDigits).fill(""));
    setFocusedIndex(0);
  };

  const handleHome = () => {
    const { resetToMenu } = useChallenges.getState();
    resetToMenu();
    restartSingleplayer();
    setMode("menu");
  };

  useEffect(() => {
    if (singleplayer.phase === "won") {
      console.log("🏆 Player won - generating hint if needed");
      if (!hint && singleplayer.secretCode) {
        console.log("📝 Generating hint on win...");
        generateHint(singleplayer.secretCode);
      }
    }
  }, [singleplayer.phase, hint, singleplayer.secretCode, generateHint]);

  const hintText = hint
    ? hint.type === "digit"
      ? `الخانة ${(hint.position || 0) + 1}: ${hint.value}`
      : String(hint.value)
    : "";

  if (singleplayer.phase === "won") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md sm:max-w-lg bg-white rounded-2xl shadow-2xl p-6 sm:p-8 text-center space-y-6">
          <div className="text-5xl sm:text-6xl">🎉</div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-green-600">مبروك! فزت</h2>
          <p className="text-sm sm:text-base lg:text-lg text-gray-600">
            عدد المحاولات: <span className="font-bold text-blue-600">{singleplayer.attempts.length}</span>
          </p>
          <p className="text-sm sm:text-base text-gray-700">
            الرقم السري كان: <span className="font-mono text-lg sm:text-xl lg:text-2xl font-bold text-purple-600">{singleplayer.secretCode.join("")}</span>
          </p>
          <div className="space-y-3">
            <button
              onClick={handleHome}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
            >
              العودة للقائمة
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (singleplayer.phase === "lost") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md sm:max-w-lg bg-white rounded-2xl shadow-2xl p-6 sm:p-8 text-center space-y-6">
          <div className="text-5xl sm:text-6xl">😢</div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-red-600">خسرت!</h2>
          <p className="text-sm sm:text-base text-gray-700">
            الرقم السري كان: <span className="font-mono text-lg sm:text-xl lg:text-2xl font-bold text-purple-600">{singleplayer.secretCode.join("")}</span>
          </p>
          <div className="space-y-3">
            <button
              onClick={restartSingleplayer}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
            >
              لعب مرة أخرى
            </button>
            <button
              onClick={handleHome}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
            >
              العودة للقائمة
            </button>
          </div>
        </div>
      </div>
    );
  }

  const attemptsLeft = singleplayer.settings.maxAttempts - singleplayer.attempts.length;

  return (
    <div className="min-h-screen p-6 pb-safe overflow-y-auto">
      <div className="max-w-7xl mx-auto w-full min-h-[calc(100vh-3rem)]">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* لوحة المحاولات - على اليسار */}
          <div className="bg-white rounded-xl p-6 shadow-md overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-800">المحاولات ({singleplayer.attempts.length} / {singleplayer.settings.maxAttempts})</h3>
              {singleplayer.attempts.length > 5 && !expandedAttempts && (
                <button
                  onClick={() => setExpandedAttempts(true)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Maximize2 className="w-5 sm:w-6 h-5 sm:h-6 text-gray-600" />
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto space-y-3">
              {singleplayer.attempts.length === 0 ? (
                <p className="text-gray-400 text-center py-8">لا توجد محاولات بعد</p>
              ) : (
                [...singleplayer.attempts].reverse().slice(0, 5).map((attempt, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-4 sm:p-5 md:p-6 bg-gradient-to-r from-blue-50 to-green-50 rounded-xl border border-gray-200 flex-row-reverse"
                  >
                    <span className="font-mono text-xl sm:text-2xl md:text-3xl font-bold text-gray-800">
                      {attempt.guess.join("")}
                    </span>
                    <div className="flex gap-2 sm:gap-3 md:gap-4">
                      <div className="flex flex-col items-center">
                        <span className="text-lg sm:text-2xl md:text-3xl font-bold text-blue-600">{attempt.correctCount}</span>
                        <span className="text-xs sm:text-sm text-blue-600">صح</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-lg sm:text-2xl md:text-3xl font-bold text-green-600">{attempt.correctPositionCount}</span>
                        <span className="text-xs sm:text-sm text-green-600">مكانهم</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* لوحة الأرقام والإدخال - على اليمين */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between bg-white rounded-xl p-2 md:p-3 shadow-md">
              <button
                onClick={handleHome}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Home className={`${getIconSize()} text-gray-700`} />
              </button>
              <div className="text-right">
                <p className={`${getTextSize()} text-gray-600`}>المحاولات المتبقية من {singleplayer.settings.maxAttempts}</p>
                <p className={`${getTextSize()} font-bold text-blue-600`}>{attemptsLeft}</p>
              </div>
            </div>

            {onStartChallenge && (
              !hasWonChallenge ? (
                <button
                  onClick={onStartChallenge}
                  className="w-full flex items-center gap-2 justify-center bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-3 rounded-lg transition-colors shadow-md"
                >
                  <Lightbulb className={getIconSize()} />
                  <span className={getTextSize()}>احصل على تلميح</span>
                </button>
              ) : hint ? (
                <div className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-lg p-2 md:p-3 shadow-md">
                  <h3 className={`text-white font-bold ${getTextSize()} mb-1 flex items-center gap-2`}>
                    <Lightbulb className={getIconSize()} />
                    التلميح:
                  </h3>
                  <p className={`text-white ${getTextSize()} font-bold`}>{hint.type === "digit" ? `في الخانة ${(hint.position || 0) + 1}: رقم ${hint.value}` : String(hint.value)}</p>
                </div>
              ) : null
            )}

            <div className="bg-white rounded-xl p-6 shadow-md flex-1 flex flex-col justify-center">
          <h3 className={`${getTextSize()} font-bold text-gray-800 mb-3 text-center`}>أدخل {numDigits} أرقام</h3>
          
          <div className="flex gap-1 sm:gap-2 md:gap-2 justify-center mb-4" dir="ltr">
            {input.map((digit, idx) => {
              const inputSize = getInputSize();
              return (
                <div
                  key={idx}
                  className={`${inputSize.width} ${inputSize.height} border-2 rounded-lg flex items-center justify-center ${getTextSize()} font-bold transition-all ${
                    focusedIndex === idx
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-300 bg-white"
                  }`}
                >
                  {digit}
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-3 gap-1 mb-1" dir="ltr">
            {[1, 2, 3].map((num) => (
              <button
                key={num}
                onClick={() => handleNumberInput(num.toString())}
                className={`${getButtonHeight()} bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white ${getTextSize()} font-bold rounded-lg shadow-md active:scale-95 transition-all`}
              >
                {num}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-1 mb-1" dir="ltr">
            {[4, 5, 6].map((num) => (
              <button
                key={num}
                onClick={() => handleNumberInput(num.toString())}
                className={`${getButtonHeight()} bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white ${getTextSize()} font-bold rounded-lg shadow-md active:scale-95 transition-all`}
              >
                {num}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-1 mb-1" dir="ltr">
            {[7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handleNumberInput(num.toString())}
                className={`${getButtonHeight()} bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white ${getTextSize()} font-bold rounded-lg shadow-md active:scale-95 transition-all`}
              >
                {num}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-1" dir="ltr">
            <button
              onClick={handleBackspace}
              className={`${getButtonHeight()} bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold rounded-lg shadow-md active:scale-95 transition-all flex items-center justify-center col-span-1`}
            >
              <X className={getIconSize()} />
            </button>
            <button
              onClick={() => handleNumberInput("0")}
              className={`${getButtonHeight()} bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white ${getTextSize()} font-bold rounded-lg shadow-md active:scale-95 transition-all col-span-1`}
            >
              0
            </button>
            <button
              onClick={handleSubmit}
              disabled={input.some(val => val === "")}
              className={`${getButtonHeight()} bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-bold rounded-lg shadow-md active:scale-95 transition-all flex items-center justify-center col-span-1`}
            >
              <Check className={getIconSize()} />
            </button>
          </div>
            </div>
          </div>
        </div>

        {expandedAttempts && (
          <div className="fixed inset-0 bg-black/50 flex items-end z-50 p-4">
            <div className="w-full bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
                <h3 className="text-2xl font-bold text-gray-800">محاولات ({singleplayer.attempts.length} / {singleplayer.settings.maxAttempts})</h3>
                <button
                  onClick={() => setExpandedAttempts(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Minimize2 className="w-6 h-6 text-gray-600" />
                </button>
              </div>
              <div className="overflow-y-scroll flex-1 p-4">
                <div className="space-y-3">
                  {[...singleplayer.attempts].reverse().map((attempt, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-xl border border-gray-200 flex-row-reverse"
                    >
                      <span className="font-mono text-2xl font-bold text-gray-800">
                        {attempt.guess.join("")}
                      </span>
                      <div className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <span className="text-2xl font-bold text-blue-600">{attempt.correctCount}</span>
                          <span className="text-xs text-blue-600">صح</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-2xl font-bold text-green-600">{attempt.correctPositionCount}</span>
                          <span className="text-xs text-green-600">مكانهم</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setExpandedAttempts(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 m-4 rounded-xl transition-colors flex-shrink-0"
              >
                إغلاق
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
