import { useEffect, useState } from "react";
import { Routes, Route, useNavigate, useParams, useLocation } from "react-router-dom";
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

function RoomRoute() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { multiplayer, setMode, setIsConnecting, setPlayerName, setRoomId, setPlayerId, resetMultiplayer, connectionError, setConnectionError } = useNumberGame();
  const [isJoining, setIsJoining] = useState(false);
  const [playerNameInput, setPlayerNameInput] = useState(() => localStorage.getItem("lastPlayerName") || "");

  useEffect(() => {
    if (roomId && multiplayer.roomId === roomId && multiplayer.playerId) {
      return;
    }

    const session = reconnectToSession();
    if (session && session.roomId === roomId && session.playerId) {
      console.log("Reconnecting to room from URL:", roomId);
      setPlayerName(session.playerName);
      setMode("multiplayer");
      setIsConnecting(true);
      reconnectWithRetry(session.playerName, session.playerId, session.roomId);
      
      setTimeout(() => {
        if (useNumberGame.getState().isConnecting) {
          console.error("Connection timeout");
          setIsConnecting(false);
          navigate("/");
        }
      }, 5000);
      return;
    }

    const lastRoom = getLastRoomSession();
    if (lastRoom && lastRoom.roomId === roomId && lastRoom.playerId) {
      console.log("Reconnecting to last room from URL:", roomId);
      setPlayerName(lastRoom.playerName);
      setMode("multiplayer");
      setIsConnecting(true);
      reconnectWithRetry(lastRoom.playerName, lastRoom.playerId, lastRoom.roomId);
      
      setTimeout(() => {
        if (useNumberGame.getState().isConnecting) {
          console.error("Connection timeout");
          setIsConnecting(false);
          navigate("/");
        }
      }, 5000);
      return;
    }
  }, [roomId]);

  const handleJoinRoom = () => {
    if (!playerNameInput.trim() || !roomId) return;
    setIsJoining(true);
    localStorage.setItem("lastPlayerName", playerNameInput.trim());
    setPlayerName(playerNameInput.trim());
    setMode("multiplayer");
    setIsConnecting(true);
    connectWebSocket(playerNameInput.trim(), roomId);
  };

  if (connectionError) {
    return (
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
              navigate("/");
            }}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-semibold transition-colors"
          >
            العودة للقائمة الرئيسية
          </button>
        </div>
      </div>
    );
  }

  if (multiplayer.roomId === roomId && multiplayer.playerId) {
    return null;
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 z-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 text-center space-y-6">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
          <span className="text-3xl">🎮</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-800">الانضمام للغرفة</h2>
        <p className="text-gray-600">رقم الغرفة: <span className="font-mono font-bold text-blue-600">{roomId}</span></p>
        
        <div className="space-y-4">
          <input
            type="text"
            placeholder="أدخل اسمك"
            value={playerNameInput}
            onChange={(e) => setPlayerNameInput(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-center font-semibold focus:border-blue-500 focus:outline-none transition-colors"
            maxLength={20}
          />
          <button
            onClick={handleJoinRoom}
            disabled={!playerNameInput.trim() || isJoining}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-3 rounded-xl transition-all"
          >
            {isJoining ? "جاري الانضمام..." : "انضم للغرفة"}
          </button>
          <button
            onClick={() => navigate("/")}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition-colors"
          >
            العودة للقائمة
          </button>
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
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
    if (multiplayer.roomId && location.pathname !== `/room/${multiplayer.roomId}`) {
      navigate(`/room/${multiplayer.roomId}`, { replace: true });
    }
  }, [multiplayer.roomId, navigate, location.pathname]);

  useEffect(() => {
    if (location.pathname === "/" || location.pathname === "") {
      const session = reconnectToSession();
      if (session && session.roomId && session.playerId && !multiplayer.roomId) {
        const isGameActive = session.gameState && session.gameState.gameStatus === "playing";
        
        if (isGameActive) {
          console.log("Reconnecting to active session:", session);
          setPlayerName(session.playerName);
          
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
          
          const ws = reconnectWithRetry(session.playerName, session.playerId, session.roomId);
          
          setTimeout(() => {
            if (useNumberGame.getState().isConnecting) {
              console.error("Connection timeout - redirecting to menu");
              setIsConnecting(false);
              setMode("menu");
            }
          }, 3000);
        } else {
          const lastRoom = getLastRoomSession();
          if (lastRoom && lastRoom.roomId && lastRoom.playerId) {
            console.log("Game finished but reconnecting to last room:", lastRoom);
            setPlayerName(lastRoom.playerName);
            setMode("multiplayer");
            setIsConnecting(true);
            
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
            sessionStorage.removeItem("multiplayerSession");
          }
        }
      } else {
        const lastRoom = getLastRoomSession();
        if (lastRoom && lastRoom.roomId && lastRoom.playerId && !multiplayer.roomId) {
          console.log("Auto-reconnecting to last room:", lastRoom);
          setPlayerName(lastRoom.playerName);
          setMode("multiplayer");
          setIsConnecting(true);
          
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
    }
  }, [location.pathname]);

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
                    navigate("/");
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-semibold transition-colors"
                >
                  العودة للقائمة الرئيسية
                </button>
              </div>
            </div>
          )}

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

          {!isConnecting && multiplayer.roomId && multiplayer.gameStatus === "waiting" && !multiplayer.showResults && (
            <MultiplayerLobby />
          )}
          
          {isMultiplayerGameActive && !multiplayer.showResults && (
            <MultiplayerGame2D />
          )}
          
          {multiplayer.showResults && <MultiplayerResults />}

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
        <div>
          <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full mx-auto mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">هل تريد إعادة المباراة؟</h2>
          <p className="text-sm md:text-base text-gray-600">لديك <span className="font-bold text-blue-600">{multiplayer.rematchState.countdown}s</span> للتصويت</p>
        </div>

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

function App() {
  return (
    <Routes>
      <Route path="/" element={<AppContent />} />
      <Route path="/room/:roomId" element={<><RoomRoute /><AppContent /></>} />
    </Routes>
  );
}

export default App;
