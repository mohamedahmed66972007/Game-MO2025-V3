import { useEffect, useState } from "react";
import { useNumberGame } from "./lib/stores/useNumberGame";
import { useAudio } from "./lib/stores/useAudio";
import { send, reconnectToSession, connectWebSocket } from "./lib/websocket";
import { useIsMobile } from "./hooks/use-is-mobile";
import { MobileApp } from "./components/mobile/MobileApp";
import { GameScene } from "./components/game/GameScene";
import { Menu } from "./components/ui/Menu";
import { WinScreen } from "./components/ui/WinScreen";
import { LoseScreen } from "./components/ui/LoseScreen";
import { MultiplayerLobby } from "./components/ui/MultiplayerLobby";
import { SecretCodeSetup } from "./components/ui/SecretCodeSetup";
import { GameHUD } from "./components/ui/GameHUD";
import { GameOverScreen } from "./components/ui/GameOverScreen";
import { OpponentAttemptsDialog } from "./components/ui/OpponentAttemptsDialog";
import { WaitingForOpponentScreen } from "./components/ui/WaitingForOpponentScreen";
import "@fontsource/inter";

function App() {
  const isMobile = useIsMobile();
  const { mode, singleplayer, multiplayer, setMode, isConnecting, setIsConnecting, setPlayerName, setRoomId, setPlayerId } = useNumberGame();
  const { setSuccessSound } = useAudio();
  const [isPointerLocked, setIsPointerLocked] = useState(false);

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

  if (isMobile) {
    return <MobileApp />;
  }

  const numDigits = multiplayer.settings.numDigits;
  const hasMySecretCode = multiplayer.mySecretCode.length === numDigits && numDigits > 0;

  const isMultiplayerGameActive =
    multiplayer.opponentId &&
    multiplayer.challengeStatus === "accepted" &&
    hasMySecretCode &&
    multiplayer.playersGaming.length > 0; // Game has actually started on server

  const isWaitingForOpponent =
    multiplayer.opponentId &&
    multiplayer.challengeStatus === "accepted" &&
    hasMySecretCode &&
    multiplayer.playersGaming.length === 0; // Waiting for opponent to set secret code

  return (
    <div dir="rtl" style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {mode === "menu" && <Menu />}

      {mode === "singleplayer" && (
        <>
          {singleplayer.secretCode.length > 0 && (
            <>
              <GameScene />
              <GameHUD />
              {singleplayer.phase === "won" && <WinScreen />}
              {singleplayer.phase === "lost" && <LoseScreen />}
            </>
          )}
        </>
      )}

      {mode === "multiplayer" && (
        <>
          {/* Show loading screen while connecting */}
          {isConnecting && (
            <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 z-50">
              <div className="text-center relative">
                <div className="inline-flex items-center justify-center mb-4">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500"></div>
                </div>
                <p className="text-gray-800 text-xl font-semibold">جاري الاتصال...</p>
                <p className="text-gray-600 text-sm mt-2">يرجى الانتظار</p>
              </div>
            </div>
          )}

          {/* Show lobby once connected */}
          {!isConnecting && multiplayer.roomId && !multiplayer.opponentId && <MultiplayerLobby />}
          
          {/* Show lobby while waiting for challenge acceptance */}
          {!isConnecting && multiplayer.roomId && multiplayer.opponentId && multiplayer.challengeStatus !== "accepted" && (
            <MultiplayerLobby />
          )}
          
          {/* Show secret code setup or game after challenge accepted */}
          {multiplayer.opponentId && multiplayer.challengeStatus === "accepted" && (
            <>
              {/* Show secret code setup only when player hasn't entered code */}
              {!hasMySecretCode && <SecretCodeSetup />}
              
              {/* Show waiting screen while opponent enters their secret code */}
              {isWaitingForOpponent && <WaitingForOpponentScreen />}
              
              {/* Show game or results */}
              {isMultiplayerGameActive && (
                <>
                  {!multiplayer.showResults && (
                    <>
                      <GameScene />
                      <GameHUD />
                      <HomeButton />
                    </>
                  )}
                  {multiplayer.showResults && multiplayer.gameResult === "won" && <WinScreen />}
                  {multiplayer.showResults && multiplayer.gameResult === "tie" && <WinScreen />}
                  {multiplayer.showResults && multiplayer.gameResult === "lost" && <LoseScreen />}
                </>
              )}
            </>
          )}

          {multiplayer.opponentId && multiplayer.rematchRequested && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
              <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-center space-y-6 border border-gray-200 mx-4">
                <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl mx-auto">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-gray-800">طلب إعادة مبارة</h2>
                <p className="text-gray-600 text-lg">الخصم يريد لعب مبارة أخرى</p>
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      send({ type: "accept_rematch" });
                    }}
                    className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
                  >
                    قبول
                  </button>
                  <button
                    onClick={() => {
                      const { setChallengeStatus, setOpponentId, setOpponentName, setMySecretCode, resetMultiplayer, setShowResults } = useNumberGame.getState();
                      setChallengeStatus("none");
                      setOpponentId(null);
                      setOpponentName("");
                      setMySecretCode([]);
                      setShowResults(false);
                      resetMultiplayer();
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
                  >
                    رفض والعودة للغرفة
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {!isConnecting && !multiplayer.roomId && <Menu />}
        </>
      )}
      
      <OpponentAttemptsDialog />
    </div>
  );
}

function HomeButton() {
  const { setMode, resetMultiplayer, multiplayer } = useNumberGame();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleQuit = () => {
    import("@/lib/websocket").then(({ send, clearSession, disconnect }) => {
      if (multiplayer.opponentId) {
        send({ type: "opponent_quit" });
      }
      clearSession();
      disconnect();
    });
    resetMultiplayer();
    setMode("menu");
    setTimeout(() => {
      window.location.reload();
    }, 300);
  };

  if (showConfirm) {
    return (
      <div className="fixed top-4 right-4 z-50 bg-red-900 border-2 border-red-600 rounded-lg p-4 shadow-lg">
        <p className="text-white font-semibold mb-3">هل تريد الانسحاب؟</p>
        <div className="flex gap-2">
          <button
            onClick={handleQuit}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-semibold"
          >
            نعم
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm font-semibold"
          >
            لا
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="fixed top-4 right-4 z-40 w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-full flex items-center justify-center shadow-lg text-xl transition-transform duration-200 hover:scale-110"
      title="البيت"
    >
      🏠
    </button>
  );
}

export default App;
