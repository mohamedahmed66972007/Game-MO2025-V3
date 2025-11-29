import { useState, useEffect } from "react";
import { useNumberGame } from "@/lib/stores/useNumberGame";
import { useCards } from "@/lib/stores/useCards";

export function GameHUD() {
  const { mode, singleplayer, multiplayer } = useNumberGame();
  const { cardSettings } = useCards();
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const getRemainingTime = () => {
    if (multiplayer.gameStatus === "playing" && multiplayer.startTime > 0) {
      const elapsed = currentTime - multiplayer.startTime;
      const totalDuration = cardSettings.roundDuration * 60 * 1000;
      const remaining = totalDuration - elapsed;
      return Math.max(0, remaining);
    }
    return cardSettings.roundDuration * 60 * 1000;
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const isTimeWarning = () => {
    const remaining = getRemainingTime();
    return remaining <= 30000;
  };

  if (mode === "singleplayer") {
    return (
      <div className="fixed top-4 left-4 bg-black bg-opacity-70 text-white p-4 rounded-lg z-40">
        <div className="space-y-2">
          <p className="text-sm text-gray-300">المحاولات: {singleplayer.attempts.length}/{singleplayer.settings.maxAttempts}</p>
          <p className="text-xs text-gray-400">اضغط ESC لإلغاء القفل</p>
        </div>
      </div>
    );
  }

  if (mode === "multiplayer") {
    return (
      <div className="fixed top-4 left-4 bg-black bg-opacity-70 text-white p-4 rounded-lg z-40">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-blue-300">
            لعبة جماعية
          </p>
          <p className="text-sm text-gray-300">
            محاولاتك: {multiplayer.attempts.length}/{multiplayer.settings.maxAttempts}
          </p>
          {multiplayer.gameStatus === "playing" && multiplayer.startTime > 0 && (
            <p className={`text-sm ${isTimeWarning() ? 'text-red-400 animate-pulse' : 'text-yellow-400'}`}>
              الوقت المتبقي: {formatTime(getRemainingTime())}
            </p>
          )}
          <p className="text-xs text-gray-400">اضغط ESC لإلغاء القفل</p>
        </div>
      </div>
    );
  }

  return null;
}
