import { useEffect, useState } from "react";
import { Routes, Route, useNavigate, useParams, useLocation } from "react-router-dom";
import { useNumberGame } from "./lib/stores/useNumberGame";
import { useAudio } from "./lib/stores/useAudio";
import { send, reconnectToSession, connectWebSocket, reconnectWithRetry, getLastRoomSession, clearSession, clearPersistentRoom, disconnect } from "./lib/websocket";
import { useIsMobile } from "./hooks/use-is-mobile";
import { MobileApp } from "./components/mobile/MobileApp";
import { Menu } from "./components/ui/Menu";
import { MultiplayerLobby } from "./components/ui/MultiplayerLobby";
import { MultiplayerResults } from "./components/ui/MultiplayerResults";
import { ChallengesHub } from "./components/game/ChallengesHub";
import { useChallenges } from "./lib/stores/useChallenges";
import { DesktopSingleplayer } from "./components/desktop/DesktopSingleplayer";
import { MultiplayerGame2D } from "./components/desktop/MultiplayerGame2D";
import "@fontsource/inter";

function MenuPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { setMode, resetMultiplayer } = useNumberGame();
  const { setSuccessSound } = useAudio();

  useEffect(() => {
    const successAudio = new Audio("/sounds/success.mp3");
    successAudio.load();
    setSuccessSound(successAudio);
  }, [setSuccessSound]);

  useEffect(() => {
    resetMultiplayer();
    setMode("menu");
    clearSession();
  }, []);

  if (isMobile) {
    return <MobileApp />;
  }

  return (
    <div dir="rtl" style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <Menu />
    </div>
  );
}

function SingleplayerPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { singleplayer, setMode, restartSingleplayer } = useNumberGame();
  const { setSuccessSound } = useAudio();
  const [showChallengesHub, setShowChallengesHub] = useState(false);
  const { hasWonAnyChallenge, resetToMenu: resetChallengesHub, generateHint: generateChallengeHint } = useChallenges();

  useEffect(() => {
    const successAudio = new Audio("/sounds/success.mp3");
    successAudio.load();
    setSuccessSound(successAudio);
  }, [setSuccessSound]);

  useEffect(() => {
    setMode("singleplayer");
    if (!singleplayer.secretCode || singleplayer.secretCode.length === 0) {
      restartSingleplayer();
    }
  }, []);

  if (isMobile) {
    return <MobileApp />;
  }

  return (
    <div dir="rtl" style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
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
    </div>
  );
}

function MultiplayerPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { multiplayer, setMode, resetMultiplayer, isConnecting, setIsConnecting, connectionError, setConnectionError, setPlayerName } = useNumberGame();
  const { setSuccessSound } = useAudio();
  const [playerNameInput, setPlayerNameInputState] = useState(() => localStorage.getItem("lastPlayerName") || "");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [showJoinForm, setShowJoinForm] = useState(false);

  useEffect(() => {
    const successAudio = new Audio("/sounds/success.mp3");
    successAudio.load();
    setSuccessSound(successAudio);
  }, [setSuccessSound]);

  useEffect(() => {
    setMode("multiplayer");
  }, []);

  useEffect(() => {
    if (multiplayer.roomId) {
      navigate(`/room/${multiplayer.roomId}`, { replace: true });
    }
  }, [multiplayer.roomId, navigate]);

  const handleCreateRoom = () => {
    if (!playerNameInput.trim()) return;
    localStorage.setItem("lastPlayerName", playerNameInput.trim());
    setPlayerName(playerNameInput.trim());
    setIsConnecting(true);
    connectWebSocket(playerNameInput.trim());
  };

  const handleJoinRoom = () => {
    if (!playerNameInput.trim() || !joinRoomId.trim()) return;
    localStorage.setItem("lastPlayerName", playerNameInput.trim());
    setPlayerName(playerNameInput.trim());
    setIsConnecting(true);
    connectWebSocket(playerNameInput.trim(), joinRoomId.trim().toUpperCase());
  };

  if (isMobile) {
    return <MobileApp />;
  }

  return (
    <div dir="rtl" style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
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

      {!isConnecting && !connectionError && (
        <div className="min-h-screen p-6 flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
          <div className="w-full max-w-md space-y-4">
            <div className="bg-white rounded-2xl shadow-xl p-6 space-y-4">
              <button
                onClick={() => navigate("/")}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </button>

              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <span className="text-3xl">👥</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">لعب جماعي</h2>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 text-right">
                  اسمك
                </label>
                <input
                  type="text"
                  value={playerNameInput}
                  onChange={(e) => setPlayerNameInputState(e.target.value)}
                  placeholder="أدخل اسمك"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-right focus:outline-none focus:border-blue-500"
                  dir="rtl"
                />
              </div>

              <button
                onClick={handleCreateRoom}
                disabled={!playerNameInput.trim()}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                إنشاء غرفة جديدة
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">أو</span>
                </div>
              </div>

              {!showJoinForm ? (
                <button
                  onClick={() => setShowJoinForm(true)}
                  className="w-full bg-white border-2 border-gray-300 hover:border-blue-500 text-gray-700 font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  الانضمام لغرفة موجودة
                </button>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 text-right">
                      رقم الغرفة
                    </label>
                    <input
                      type="text"
                      value={joinRoomId}
                      onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                      placeholder="أدخل رقم الغرفة"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-center font-mono uppercase focus:outline-none focus:border-blue-500"
                      maxLength={6}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleJoinRoom}
                      disabled={!playerNameInput.trim() || !joinRoomId.trim()}
                      className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-3 rounded-xl transition-all"
                    >
                      انضم
                    </button>
                    <button
                      onClick={() => setShowJoinForm(false)}
                      className="px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 rounded-xl transition-all"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { multiplayer, setMode, setIsConnecting, setPlayerName, resetMultiplayer, connectionError, setConnectionError, isConnecting } = useNumberGame();
  const { setSuccessSound } = useAudio();
  const [playerNameInput, setPlayerNameInputState] = useState(() => localStorage.getItem("lastPlayerName") || "");
  const [isJoining, setIsJoining] = useState(false);
  const [hasAttemptedReconnect, setHasAttemptedReconnect] = useState(false);

  useEffect(() => {
    const successAudio = new Audio("/sounds/success.mp3");
    successAudio.load();
    setSuccessSound(successAudio);
  }, [setSuccessSound]);

  useEffect(() => {
    setMode("multiplayer");
  }, []);

  useEffect(() => {
    if (hasAttemptedReconnect) return;
    if (!roomId) return;
    if (multiplayer.roomId === roomId && multiplayer.playerId) return;

    const session = reconnectToSession();
    if (session && session.roomId === roomId && session.playerId) {
      console.log("Reconnecting to room from session:", roomId);
      setHasAttemptedReconnect(true);
      setPlayerName(session.playerName);
      setIsConnecting(true);
      reconnectWithRetry(session.playerName, session.playerId, session.roomId);
      
      setTimeout(() => {
        if (useNumberGame.getState().isConnecting) {
          console.error("Connection timeout");
          setIsConnecting(false);
        }
      }, 5000);
      return;
    }

    const lastRoom = getLastRoomSession();
    if (lastRoom && lastRoom.roomId === roomId && lastRoom.playerId) {
      console.log("Reconnecting to last room:", roomId);
      setHasAttemptedReconnect(true);
      setPlayerName(lastRoom.playerName);
      setIsConnecting(true);
      reconnectWithRetry(lastRoom.playerName, lastRoom.playerId, lastRoom.roomId);
      
      setTimeout(() => {
        if (useNumberGame.getState().isConnecting) {
          console.error("Connection timeout");
          setIsConnecting(false);
        }
      }, 5000);
      return;
    }

    setHasAttemptedReconnect(true);
  }, [roomId, hasAttemptedReconnect]);

  const handleJoinRoom = () => {
    if (!playerNameInput.trim() || !roomId) return;
    setIsJoining(true);
    localStorage.setItem("lastPlayerName", playerNameInput.trim());
    setPlayerName(playerNameInput.trim());
    setIsConnecting(true);
    connectWebSocket(playerNameInput.trim(), roomId);
  };

  if (isMobile) {
    return <MobileApp />;
  }

  const isInRoom = multiplayer.roomId === roomId && multiplayer.playerId;
  const isGameActive = multiplayer.gameStatus === "playing" && multiplayer.sharedSecret.length > 0;

  return (
    <div dir="rtl" style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
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

      {!isConnecting && !connectionError && !isInRoom && (
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
                onChange={(e) => setPlayerNameInputState(e.target.value)}
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
      )}

      {isInRoom && !isGameActive && !multiplayer.showResults && (
        <MultiplayerLobby />
      )}
      
      {isInRoom && isGameActive && !multiplayer.showResults && (
        <MultiplayerGame2D />
      )}
      
      {isInRoom && multiplayer.showResults && (
        <MultiplayerResults />
      )}

      {multiplayer.rematchState.requested && multiplayer.rematchState.countdown !== null && (
        <RematchDialog />
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
      <Route path="/" element={<MenuPage />} />
      <Route path="/singleplayer" element={<SingleplayerPage />} />
      <Route path="/multiplayer" element={<MultiplayerPage />} />
      <Route path="/room/:roomId" element={<RoomPage />} />
    </Routes>
  );
}

export default App;
