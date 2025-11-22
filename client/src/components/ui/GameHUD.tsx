import { useEffect } from "react";
import { useNumberGame } from "@/lib/stores/useNumberGame";
import { send } from "@/lib/websocket";

export function GameHUD() {
  const { mode, singleplayer, multiplayer, setTurnTimeLeft } = useNumberGame();

  // Turn timer for multiplayer
  useEffect(() => {
    if (mode !== "multiplayer" || !multiplayer.isMyTurn) {
      return;
    }

    const interval = setInterval(() => {
      setTurnTimeLeft(Math.max(0, multiplayer.turnTimeLeft - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [mode, multiplayer.isMyTurn, multiplayer.turnTimeLeft, setTurnTimeLeft]);

  // Handle timeout when time reaches 0
  useEffect(() => {
    if (mode !== "multiplayer" || !multiplayer.isMyTurn || multiplayer.turnTimeLeft > 0) {
      return;
    }

    // Send timeout message to server
    send({
      type: "turn_timeout",
      opponentId: multiplayer.opponentId,
    });

    // Disable input by setting isMyTurn to false
    setTurnTimeLeft(0);
  }, [mode, multiplayer.isMyTurn, multiplayer.turnTimeLeft, multiplayer.opponentId]);

  // Render based on mode
  if (mode === "singleplayer") {
    return (
      <div className="fixed top-4 left-4 bg-black bg-opacity-70 text-white p-4 rounded-lg z-40">
        <div className="space-y-2">
          <p className="text-sm text-gray-300">المحاولات: {singleplayer.attempts.length}</p>
          <p className="text-xs text-gray-400">اضغط ESC لإلغاء القفل</p>
        </div>
      </div>
    );
  }

  if (mode === "multiplayer") {
    return (
      <div className="fixed top-4 left-4 bg-black bg-opacity-70 text-white p-4 rounded-lg z-40">
        <div className="space-y-2">
          <p className="text-sm font-semibold">
            {multiplayer.isMyTurn ? "دورك!" : "دور الخصم"}
          </p>
          {multiplayer.isMyTurn && (
            <p className="text-lg font-bold text-yellow-400">
              {multiplayer.turnTimeLeft}s
            </p>
          )}
          <p className="text-sm text-gray-300">
            محاولاتك: {multiplayer.attempts.length}
          </p>
          <p className="text-sm text-gray-300">
            محاولات الخصم: {multiplayer.opponentAttempts.length}
          </p>
          <p className="text-xs text-gray-400">اضغط ESC لإلغاء القفل</p>
        </div>
      </div>
    );
  }

  return null;
}
