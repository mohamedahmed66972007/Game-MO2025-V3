import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useNumberGame } from "@/lib/stores/useNumberGame";
import { useAudio } from "@/lib/stores/useAudio";
import { Home, Check, X, Maximize2, Minimize2, Lightbulb, RefreshCw, Settings } from "lucide-react";
import { useChallenges } from "@/lib/stores/useChallenges";
import { GameSettings } from "../ui/GameSettings";

export function DesktopSingleplayer({ onStartChallenge }: { onStartChallenge?: () => void }) {
  const navigate = useNavigate();
  const {
    singleplayer,
    setMode,
    restartSingleplayer,
    addDigitToGuess,
    deleteLastDigit,
    submitGuess,
  } = useNumberGame();
  const hint = useChallenges((state) => state.hint);
  const { hasWonAnyChallenge, generateHint } = useChallenges();
  const hasWonChallenge = hasWonAnyChallenge();
  
  const { playDigit, playDelete, playError, successSound } = useAudio();
  const numDigits = singleplayer.settings.numDigits;
  const [expandedAttempts, setExpandedAttempts] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [startTime] = useState(Date.now());
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    if (!singleplayer.secretCode || singleplayer.secretCode.length === 0) {
      restartSingleplayer();
    }
  }, [singleplayer.secretCode, restartSingleplayer]);

  useEffect(() => {
    if (singleplayer.phase === "won" && !hint && singleplayer.secretCode) {
      generateHint(singleplayer.secretCode);
    }
  }, [singleplayer.phase, hint, singleplayer.secretCode, generateHint]);

  useEffect(() => {
    if (singleplayer.phase === "won" && successSound) {
      successSound.currentTime = 0;
      successSound.play();
    }
  }, [singleplayer.phase, successSound]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (singleplayer.phase !== "playing") return;
      if (expandedAttempts) return;
      
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleNumberInput(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (singleplayer.currentGuess.length === numDigits) {
          handleSubmit();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [singleplayer.phase, singleplayer.currentGuess, numDigits, expandedAttempts]);

  const handleNumberInput = (num: string) => {
    if (singleplayer.currentGuess.length >= numDigits) return;
    
    playDigit(parseInt(num));
    addDigitToGuess(parseInt(num));
  };

  const handleBackspace = () => {
    if (singleplayer.currentGuess.length > 0) {
      playDelete();
      deleteLastDigit();
    }
  };

  const handleSubmit = () => {
    if (singleplayer.currentGuess.length !== numDigits) {
      return;
    }
    submitGuess();
  };

  const handleHome = () => {
    const { resetToMenu } = useChallenges.getState();
    resetToMenu();
    restartSingleplayer();
    setMode("menu");
    navigate("/");
  };

  const handleRestart = () => {
    const { resetToMenu } = useChallenges.getState();
    resetToMenu();
    restartSingleplayer();
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getElapsedTime = () => {
    if (singleplayer.phase === "playing") {
      return currentTime - startTime;
    }
    return 0;
  };

  if (showSettings) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
        <GameSettings
          onConfirm={() => {
            setShowSettings(false);
            restartSingleplayer();
          }}
          isMultiplayer={false}
        />
      </div>
    );
  }

  if (singleplayer.phase === "won") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-blue-50 via-white to-purple-50">
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
              onClick={handleRestart}
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

  if (singleplayer.phase === "lost") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="w-full max-w-md sm:max-w-lg bg-white rounded-2xl shadow-2xl p-6 sm:p-8 text-center space-y-6">
          <div className="text-5xl sm:text-6xl">😢</div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-red-600">خسرت!</h2>
          <p className="text-sm sm:text-base text-gray-700">
            الرقم السري كان: <span className="font-mono text-lg sm:text-xl lg:text-2xl font-bold text-purple-600">{singleplayer.secretCode.join("")}</span>
          </p>
          <div className="space-y-3">
            <button
              onClick={handleRestart}
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 overflow-y-auto">
      <div className="max-w-6xl mx-auto w-full space-y-4">
        <div className="flex items-center justify-between bg-white rounded-xl p-4 shadow-md">
          <div className="flex items-center gap-3">
            <button
              onClick={handleHome}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="القائمة الرئيسية"
            >
              <Home className="w-6 h-6 text-gray-700" />
            </button>
            <button
              onClick={handleRestart}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="إعادة اللعبة"
            >
              <RefreshCw className="w-6 h-6 text-gray-700" />
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="الإعدادات"
            >
              <Settings className="w-6 h-6 text-gray-700" />
            </button>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-sm text-gray-500">الوقت</p>
              <p className="text-xl font-bold text-blue-600">{formatDuration(getElapsedTime())}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">المحاولات</p>
              <p className="text-xl font-bold text-purple-600">{singleplayer.attempts.length} / {singleplayer.settings.maxAttempts}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">عدد الأرقام</p>
              <p className="text-xl font-bold text-green-600">{numDigits}</p>
            </div>
          </div>
        </div>

        {onStartChallenge && (
          !hasWonChallenge ? (
            <button
              onClick={onStartChallenge}
              className="w-full flex items-center gap-3 justify-center bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg"
            >
              <Lightbulb className="w-6 h-6" />
              <span className="text-lg">احصل على تلميح عبر التحديات</span>
            </button>
          ) : hint ? (
            <div className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-xl p-4 shadow-lg">
              <div className="flex items-center gap-3 text-white">
                <Lightbulb className="w-6 h-6" />
                <div>
                  <h3 className="font-bold text-lg">التلميح:</h3>
                  <p className="text-xl font-bold">{hint.type === "digit" ? `في الخانة ${(hint.position || 0) + 1}: رقم ${hint.value}` : String(hint.value)}</p>
                </div>
              </div>
            </div>
          ) : null
        )}

        <div className="grid lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl p-6 shadow-md overflow-hidden flex flex-col order-2 lg:order-1">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <h3 className="text-xl font-bold text-gray-800">المحاولات السابقة</h3>
              {singleplayer.attempts.length > 5 && (
                <button
                  onClick={() => setExpandedAttempts(true)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Maximize2 className="w-5 h-5 text-gray-600" />
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 max-h-[400px]">
              {singleplayer.attempts.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-lg">لا توجد محاولات بعد</p>
                  <p className="text-gray-300 text-sm mt-2">ابدأ بإدخال تخمينك الأول</p>
                </div>
              ) : (
                [...singleplayer.attempts].reverse().slice(0, 5).map((attempt, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-gray-200"
                  >
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <span className="text-2xl font-bold text-blue-600">{attempt.correctCount}</span>
                        <span className="text-xs text-blue-600">صح</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-2xl font-bold text-green-600">{attempt.correctPositionCount}</span>
                        <span className="text-xs text-green-600">مكانهم</span>
                      </div>
                    </div>
                    <span className="font-mono text-2xl font-bold text-gray-800" dir="ltr">
                      {attempt.guess.join("")}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md order-1 lg:order-2">
            <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">أدخل تخمينك</h3>
            
            <div className="flex gap-2 justify-center mb-6" dir="ltr">
              {Array.from({ length: numDigits }).map((_, idx) => (
                <div
                  key={idx}
                  className={`w-14 h-16 border-2 rounded-xl flex items-center justify-center text-2xl font-bold transition-all ${
                    singleplayer.currentGuess.length === idx
                      ? "border-blue-500 bg-blue-50 shadow-lg"
                      : "border-gray-300 bg-white"
                  }`}
                >
                  {singleplayer.currentGuess[idx] ?? ""}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2 mb-2" dir="ltr">
              {[1, 2, 3].map((num) => (
                <button
                  key={num}
                  onClick={() => handleNumberInput(num.toString())}
                  className="h-14 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-xl font-bold rounded-xl shadow-md active:scale-95 transition-all"
                >
                  {num}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2 mb-2" dir="ltr">
              {[4, 5, 6].map((num) => (
                <button
                  key={num}
                  onClick={() => handleNumberInput(num.toString())}
                  className="h-14 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-xl font-bold rounded-xl shadow-md active:scale-95 transition-all"
                >
                  {num}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2 mb-2" dir="ltr">
              {[7, 8, 9].map((num) => (
                <button
                  key={num}
                  onClick={() => handleNumberInput(num.toString())}
                  className="h-14 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-xl font-bold rounded-xl shadow-md active:scale-95 transition-all"
                >
                  {num}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2" dir="ltr">
              <button
                onClick={handleBackspace}
                className="h-14 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center"
              >
                <X className="w-6 h-6" />
              </button>
              <button
                onClick={() => handleNumberInput("0")}
                className="h-14 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-xl font-bold rounded-xl shadow-md active:scale-95 transition-all"
              >
                0
              </button>
              <button
                onClick={handleSubmit}
                disabled={singleplayer.currentGuess.length !== numDigits}
                className="h-14 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center"
              >
                <Check className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {expandedAttempts && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
                <h3 className="text-2xl font-bold text-gray-800">جميع المحاولات ({singleplayer.attempts.length})</h3>
                <button
                  onClick={() => setExpandedAttempts(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Minimize2 className="w-6 h-6 text-gray-600" />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 p-4">
                <div className="space-y-3">
                  {[...singleplayer.attempts].reverse().map((attempt, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-gray-200"
                    >
                      <div className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <span className="text-2xl font-bold text-blue-600">{attempt.correctCount}</span>
                          <span className="text-xs text-blue-600">صح</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-2xl font-bold text-green-600">{attempt.correctPositionCount}</span>
                          <span className="text-xs text-green-600">مكانهم</span>
                        </div>
                      </div>
                      <span className="font-mono text-2xl font-bold text-gray-800" dir="ltr">
                        {attempt.guess.join("")}
                      </span>
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
