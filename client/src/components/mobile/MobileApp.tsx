import { useEffect } from "react";
import { useNumberGame } from "@/lib/stores/useNumberGame";
import { useAudio } from "@/lib/stores/useAudio";
import { reconnectToSession, connectWebSocket } from "@/lib/websocket";
import { MobileMenu } from "./MobileMenu";
import { MobileSingleplayer } from "./MobileSingleplayer";
import { MobileMultiplayer } from "./MobileMultiplayer";

export function MobileApp() {
  const { mode, setMode, setPlayerName, setRoomId, setPlayerId, setIsConnecting, multiplayer } = useNumberGame();
  const { setSuccessSound } = useAudio();

  useEffect(() => {
    const successAudio = new Audio("/sounds/success.mp3");
    successAudio.load();
    setSuccessSound(successAudio);
  }, [setSuccessSound]);

  useEffect(() => {
    const session = reconnectToSession();
    if (session && !multiplayer.roomId) {
      setPlayerName(session.playerName);
      setRoomId(session.roomId);
      setPlayerId(session.playerId);
      
      // Restore game state if it was active
      if (session.gameState) {
        const store = useNumberGame.getState();
        store.setOpponentId(session.gameState.opponentId);
        store.setOpponentName(session.gameState.opponentName);
        store.setMySecretCode(session.gameState.mySecretCode);
        store.setChallengeStatus(session.gameState.challengeStatus);
        
        // Restore active game state if player was in game
        if (session.gameState.playersGaming && session.gameState.playersGaming.length > 0) {
          store.setPlayersGaming(session.gameState.playersGaming);
          store.setIsMyTurn(session.gameState.isMyTurn);
          useNumberGame.setState((state) => ({
            multiplayer: {
              ...state.multiplayer,
              attempts: session.gameState.attempts || [],
              opponentAttempts: session.gameState.opponentAttempts || [],
              turnTimeLeft: session.gameState.turnTimeLeft || 60,
            },
          }));
        }
      }
      
      setMode("multiplayer");
      setIsConnecting(true);
      connectWebSocket(session.playerName, session.roomId);
    }
  }, []);

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {mode === "menu" && <MobileMenu />}
      {mode === "singleplayer" && <MobileSingleplayer />}
      {mode === "multiplayer" && <MobileMultiplayer />}
    </div>
  );
}
