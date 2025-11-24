import { useEffect, useState } from "react";
import { useNumberGame } from "./lib/stores/useNumberGame";
import { useAudio } from "./lib/stores/useAudio";
import { send, reconnectToSession, connectWebSocket, reconnectWithRetry, getLastRoomSession } from "./lib/websocket";
import { useIsMobile } from "./hooks/use-is-mobile";
import { MobileApp } from "./components/mobile/MobileApp";
import { GameScene } from "./components/game/GameScene";
import { Menu } from "./components/ui/Menu";
import { WinScreen } from "./components/ui/WinScreen";
import { LoseScreen } from "./components/ui/LoseScreen";
import { MultiplayerLobby } from "./components/ui/MultiplayerLobby";
import { MultiplayerResults } from "./components/ui/MultiplayerResults";
import { GameHUD } from "./components/ui/GameHUD";
import { ChallengesHub } from "./components/game/ChallengesHub";
import { useChallenges } from "./lib/stores/useChallenges";
import { DesktopSingleplayer } from "./components/desktop/DesktopSingleplayer";
import { MultiplayerGame2D } from "./components/desktop/MultiplayerGame2D";
import "@fontsource/inter";

function App() {
  const isMobile = useIsMobile();
  const { mode, singleplayer, multiplayer, connectionError, setMode, isConnecting, setIsConnecting, setPlayerName, setRoomId, setPlayerId, setConnectionError, resetMultiplayer } = useNumberGame();
  const { setSuccessSound } = useAudio();
  const [showChallengesHub, setShowChallengesHub] = useState(false);
  const challenges = useChallenges();
  const { hasWonAnyChallenge, resetToMenu: resetChallengesHub, generateHint: generateChallengeHint } = challenges;

  useEffect(() => {
    const successAudio = new Audio("/sounds/success.mp3");
    successAudio.load();
    setSuccessSound(successAudio);
  }, [setSuccessSound]);

  useEffect(() => {
    const session = reconnectToSession();
    if (session && session.roomId && session.playerId && !multiplayer.roomId) {
      // Only auto-reconnect if game is actively playing (not finished/results shown)
      const isGameActive = session.gameState && session.gameState.gameStatus === "playing";
      
      if (isGameActive) {
        console.log("Reconnecting to active session:", session);
        setPlayerName(session.playerName);
        
        // Restore game state if it was active
        if (session.gameState) {
          const store = useNumberGame.getState();
          if (session.gameState.gameStatus) {
            store.setGameStatus(session.gameState.gameStatus);
          }
          if (session.gameState.sharedSecret) {
            store.setSharedSecret(session.gameState.sharedSecret);
          }
          if (session.gameState.settings) {
            store.setMultiplayerSettings(session.gameState.settings);
          }
          if (session.gameState.attempts) {
            useNumberGame.setState((state) => ({
              multiplayer: {
                ...state.multiplayer,
                attempts: session.gameState.attempts,
                startTime: session.gameState.startTime || Date.now(),
              },
            }));
          }
        }
        
        setMode("multiplayer");
        setIsConnecting(true);
        
        // Attempt reconnection with retry
        const ws = reconnectWithRetry(session.playerName, session.playerId, session.roomId);
        
        // Add timeout to prevent infinite loading (network issues only)
        setTimeout(() => {
          if (useNumberGame.getState().isConnecting) {
            console.error("Connection timeout - redirecting to menu");
            setIsConnecting(false);
            setMode("menu");
          }
        }, 3000);
      } else {
        // Game is finished, try to reconnect to last room if available
        const lastRoom = getLastRoomSession();
        if (lastRoom && lastRoom.roomId && lastRoom.playerId) {
          console.log("Game finished but reconnecting to last room:", lastRoom);
          setPlayerName(lastRoom.playerName);
          setMode("multiplayer");
          setIsConnecting(true);
          
          // Restore startTime if available (preserve elapsed time)
          useNumberGame.setState((state) => ({
            multiplayer: {
              ...state.multiplayer,
              gameStatus: "waiting",
              startTime: lastRoom.startTime || 0,
            },
          }));
          
          const ws = reconnectWithRetry(lastRoom.playerName, lastRoom.playerId, lastRoom.roomId);
          
          setTimeout(() => {
            if (useNumberGame.getState().isConnecting) {
              console.error("Connection timeout - redirecting to menu");
              setIsConnecting(false);
              setMode("menu");
            }
          }, 3000);
        } else {
          // No active game and no last room, clear the session
          sessionStorage.removeItem("multiplayerSession");
        }
      }
    } else {
      // Check if there's a last room to rejoin
      const lastRoom = getLastRoomSession();
      if (lastRoom && lastRoom.roomId && lastRoom.playerId && !multiplayer.roomId) {
        console.log("Auto-reconnecting to last room:", lastRoom);
        setPlayerName(lastRoom.playerName);
        setMode("multiplayer");
        setIsConnecting(true);
        
        // Restore startTime if available (preserve elapsed time)
        useNumberGame.setState((state) => ({
          multiplayer: {
            ...state.multiplayer,
            gameStatus: "waiting",
            startTime: lastRoom.startTime || 0,
          },
        }));
        
        const ws = reconnectWithRetry(lastRoom.playerName, lastRoom.playerId, lastRoom.roomId);
        
        setTimeout(() => {
          if (useNumberGame.getState().isConnecting) {
            console.error("Connection timeout - redirecting to menu");
            setIsConnecting(false);
            setMode("menu");
          }
        }, 3000);
      }
    }
  }, []);

  if (isMobile) {
    return <MobileApp />;
  }

  const isMultiplayerGameActive = multiplayer.gameStatus === "playing" && multiplayer.sharedSecret.length > 0;

  return (
    <div dir="rtl" style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {mode === "menu" && <Menu />}

      {mode === "singleplayer" && (
        <>
          {!showChallengesHub && singleplayer.secretCode.length > 0 && (
            <DesktopSingleplayer onStartChallenge={() => setShowChallengesHub(true)} />
          )}
          {showChallengesHub && (
            <ChallengesHub onExit={() => {
              if (hasWonAnyChallenge()) {
                generateChallengeHint(singleplayer.secretCode);
              }
              setShowChallengesHub(false);
              resetChallengesHub();
            }} />
          )}
        </>
      )}

      {mode === "multiplayer" && (
        <>
          {/* Show connection error */}
          {connectionError && (
            <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-red-50 z-50">
              <div className="text-center relative max-w-md mx-4">
                <div className="inline-flex items-center justify-center mb-4">
                  <div className="text-6xl">❌</div>
                </div>
                <p className="text-gray-800 text-xl font-semibold mb-4">{connectionError}</p>
                <button
                  onClick={() => {
                    setConnectionError(null);
                    resetMultiplayer();
                    setMode("menu");
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-semibold transition-colors"
                >
                  العودة للقائمة الرئيسية
                </button>
              </div>
            </div>
          )}

          {/* Show loading screen while connecting */}
          {isConnecting && !connectionError && (
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

          {/* Show lobby when not in game */}
          {!isConnecting && multiplayer.roomId && multiplayer.gameStatus === "waiting" && !multiplayer.showResults && (
            <MultiplayerLobby />
          )}
          
          {/* Show game */}
          {isMultiplayerGameActive && !multiplayer.showResults && (
            <MultiplayerGame2D />
          )}
          
          {/* Show results */}
          {multiplayer.showResults && <MultiplayerResults />}

          {/* Rematch countdown dialog */}
          {multiplayer.rematchState.requested && multiplayer.rematchState.countdown !== null && (
            <RematchDialog />
          )}
          
          {!isConnecting && !multiplayer.roomId && <Menu />}
        </>
      )}
    </div>
  );
}

function RematchDialog() {
  const { multiplayer } = useNumberGame();
  const myVote = multiplayer.rematchState.votes.find(v => v.playerId === multiplayer.playerId);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4">
      <div className="w-full max-w-2xl bg-gradient-to-br from-blue-50 to-white rounded-3xl shadow-2xl border-2 border-blue-300 p-6 md:p-8 text-center space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full mx-auto mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">هل تريد إعادة المباراة؟</h2>
          <p className="text-sm md:text-base text-gray-600">لديك <span className="font-bold text-blue-600">{multiplayer.rematchState.countdown}s</span> للتصويت</p>
        </div>

        {/* Voting Buttons - Only show if player hasn't voted */}
        {!myVote && (
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <button
              onClick={() => send({ type: "rematch_vote", accepted: true })}
              className="bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 md:py-4 px-4 md:px-6 rounded-xl transition-all transform hover:scale-105 shadow-lg flex flex-col items-center gap-2"
            >
              <span className="text-xl md:text-2xl">✓</span>
              <span className="text-xs md:text-sm">موافق</span>
            </button>
            <button
              onClick={() => send({ type: "rematch_vote", accepted: false })}
              className="bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold py-3 md:py-4 px-4 md:px-6 rounded-xl transition-all transform hover:scale-105 shadow-lg flex flex-col items-center gap-2"
            >
              <span className="text-xl md:text-2xl">✗</span>
              <span className="text-xs md:text-sm">رافض</span>
            </button>
          </div>
        )}

        {/* Player Voting Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {multiplayer.players.map(player => {
            const vote = multiplayer.rematchState.votes.find(v => v.playerId === player.id);
            const isCurrentPlayer = player.id === multiplayer.playerId;
            
            return (
              <div
                key={player.id}
                className={`relative rounded-2xl p-4 md:p-5 border-2 transition-all transform ${
                  vote?.accepted
                    ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-400 scale-100'
                    : vote?.accepted === false
                    ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-400 scale-100'
                    : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-300 animate-pulse'
                }`}
              >
                {/* Vote Status Icon */}
                <div className="absolute top-2 right-2 md:top-3 md:right-3">
                  {vote?.accepted ? (
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                      <span className="text-white font-bold text-lg md:text-xl">✓</span>
                    </div>
                  ) : vote?.accepted === false ? (
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                      <span className="text-white font-bold text-lg md:text-xl">✗</span>
                    </div>
                  ) : (
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-gray-400 rounded-full flex items-center justify-center shadow-lg">
                      <span className="text-white font-bold text-lg md:text-xl">⏳</span>
                    </div>
                  )}
                </div>

                {/* Player Info */}
                <div className="pr-10 md:pr-12">
                  <p className="font-bold text-gray-800 text-sm md:text-base flex items-center gap-2">
                    {player.name}
                    {isCurrentPlayer && <span className="text-xs bg-blue-200 text-blue-700 px-2 py-0.5 rounded-lg">(أنت)</span>}
                  </p>
                  <p className={`text-xs md:text-sm font-semibold mt-1 ${
                    vote?.accepted ? 'text-green-700' : vote?.accepted === false ? 'text-red-700' : 'text-gray-500'
                  }`}>
                    {vote?.accepted ? 'موافق ✓' : vote?.accepted === false ? 'رافض ✗' : 'في الانتظار...'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function HomeButton() {
  const { setMode, resetMultiplayer } = useNumberGame();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleQuit = () => {
    import("@/lib/websocket").then(({ send, clearSession, disconnect }) => {
      send({ type: "leave_room" });
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
