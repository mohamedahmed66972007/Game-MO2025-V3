import { useState, useEffect } from "react";
import { MultiplayerResults } from "../ui/MultiplayerResults";
import { useNumberGame } from "@/lib/stores/useNumberGame";
import { useAudio } from "@/lib/stores/useAudio";
import { useCards } from "@/lib/stores/useCards";
import { send, connectWebSocket, disconnect } from "@/lib/websocket";
import { Home, Check, X, Users, Copy, Crown, Play, Settings, RefreshCw, Eye, Trophy, Maximize2, Minimize2, LogOut } from "lucide-react";
import { GameSettings } from "../ui/GameSettings";
import { clearSession, clearPersistentRoom } from "@/lib/websocket";
import { CardHand, CardEffectDisplay } from "../game/cards/CardSystem";
import { MultiplayerChallenge } from "../game/MultiplayerChallenge";

export function MultiplayerGame2D() {
  const {
    multiplayer,
    setMode,
    resetMultiplayer,
    addMultiplayerDigit,
    deleteMultiplayerDigit,
    submitMultiplayerGuess,
    setShowPreGameChallenge,
  } = useNumberGame();

  const { playDigit, playDelete, playConfirm, playError, successSound } = useAudio();
  const [playerName, setPlayerName] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [expandedAttempts, setExpandedAttempts] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());

  const [input, setInput] = useState<string[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const numDigits = multiplayer.settings.numDigits;

  useEffect(() => {
    const savedName = localStorage.getItem("lastPlayerName");
    if (savedName) {
      setPlayerName(savedName);
    }
  }, []);

  useEffect(() => {
    if (playerName.trim()) {
      localStorage.setItem("lastPlayerName", playerName);
    }
  }, [playerName]);

  useEffect(() => {
    setInput(new Array(numDigits).fill(""));
    setFocusedIndex(0);
  }, [numDigits]);

  useEffect(() => {
    if (multiplayer.currentGuess.length < numDigits) {
      const newInput = [...multiplayer.currentGuess.map(String), ...new Array(numDigits - multiplayer.currentGuess.length).fill("")];
      setInput(newInput);
      setFocusedIndex(multiplayer.currentGuess.length);
    } else if (multiplayer.currentGuess.length === numDigits) {
      setInput(multiplayer.currentGuess.map(String));
      setFocusedIndex(numDigits);
    }
  }, [multiplayer.currentGuess, numDigits]);

  // Live timer update
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Keyboard controls for game input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (multiplayer.gameStatus !== "playing" || multiplayer.phase !== "playing") return;
      if (expandedAttempts) return;
      
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleNumberInput(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (!input.some(val => val === "")) {
          handleSubmit();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [multiplayer.gameStatus, multiplayer.phase, focusedIndex, input, numDigits, expandedAttempts]);

  const handleCreateRoom = () => {
    if (!playerName.trim()) return;
    connectWebSocket(playerName.trim());
  };

  const handleJoinRoom = () => {
    if (!playerName.trim() || !joinRoomId.trim()) return;
    connectWebSocket(playerName.trim(), joinRoomId.trim().toUpperCase());
  };

  const handleStartGame = () => {
    if (multiplayer.isHost && multiplayer.players.length >= 2) {
      send({ type: "start_game" });
    }
  };

  const { hasActiveEffect, removeExpiredEffects } = useCards();
  
  const isPlayerFrozen = () => {
    removeExpiredEffects();
    return hasActiveEffect(multiplayer.playerId, "freeze");
  };

  const handleNumberInput = (num: string) => {
    if (multiplayer.gameStatus !== "playing" || multiplayer.phase !== "playing") return;
    if (focusedIndex >= numDigits) return;
    
    if (isPlayerFrozen()) {
      playError();
      return;
    }

    playDigit(parseInt(num));
    addMultiplayerDigit(parseInt(num));
  };

  const handleBackspace = () => {
    if (multiplayer.gameStatus !== "playing" || multiplayer.phase !== "playing") return;
    if (focusedIndex === 0) return;

    playDelete();
    deleteMultiplayerDigit();
  };

  const handleSubmit = () => {
    if (multiplayer.gameStatus !== "playing" || multiplayer.phase !== "playing") return;
    if (input.some(val => val === "")) {
      playError();
      return;
    }
    
    if (isPlayerFrozen()) {
      playError();
      return;
    }

    playConfirm();
    send({
      type: "submit_guess",
      guess: multiplayer.currentGuess,
    });
    submitMultiplayerGuess();
  };

  const handleLeaveRoom = () => {
    send({ type: "leave_room" });
    clearSession();
    clearPersistentRoom();
    disconnect();
    resetMultiplayer();
  };

  const handleHome = () => {
    if (multiplayer.roomId) {
      handleLeaveRoom();
    }
    setMode("menu");
  };

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(multiplayer.roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRematchVote = (accepted: boolean) => {
    send({ type: "rematch_vote", accepted });
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${seconds}s`;
  };

  const getCurrentDuration = () => {
    if (multiplayer.gameStatus === "playing" && multiplayer.startTime > 0) {
      return currentTime - multiplayer.startTime;
    }
    return 0;
  };

  // Check if current player has finished
  const playerFinished = multiplayer.phase === "won" || multiplayer.phase === "lost";
  
  // Show results screen only if explicitly requested via showResults flag
  const shouldShowResults = multiplayer.showResults;

  // Check if there are still players playing
  const hasPlayersStillPlaying = multiplayer.stillPlaying && multiplayer.stillPlaying.length > 0;

  // Get player details from winners, losers, or stillPlaying
  const playerDetails = selectedPlayer 
    ? [...multiplayer.winners, ...multiplayer.losers, ...(multiplayer.stillPlaying || [])].find(p => p.playerId === selectedPlayer)
    : null;

  // Get available players to watch (stillPlaying + winners if not yet finished)
  const availableToWatch = playerFinished && !shouldShowResults
    ? multiplayer.stillPlaying || []
    : [];

  // Initialize spectator mode when player finishes
  useEffect(() => {
    if (playerFinished && !multiplayer.showResults) {
      // If there are still players playing, auto-select the first one for spectating
      if (hasPlayersStillPlaying && !selectedPlayer) {
        setSelectedPlayer(multiplayer.stillPlaying[0]?.playerId || null);
      }
      console.log("Player finished, watching mode enabled. Still playing:", availableToWatch.length);
    }
  }, [playerFinished, multiplayer.showResults, hasPlayersStillPlaying]);

  if (showSettings && multiplayer.isHost && multiplayer.gameStatus === "waiting") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
        <GameSettings
          onConfirm={(settings) => {
            send({ 
              type: "update_settings", 
              settings: { numDigits: settings.numDigits, maxAttempts: settings.maxAttempts }
            });
            setShowSettings(false);
          }}
          isMultiplayer={true}
        />
      </div>
    );
  }

  if (shouldShowResults) {
    return <MultiplayerResults />;
  }

  if (multiplayer.gameStatus === "playing" && multiplayer.showPreGameChallenge) {
    return (
      <MultiplayerChallenge 
        onComplete={(won) => {
          console.log("Challenge completed, won:", won);
          setShowPreGameChallenge(false);
          send({ type: "challenge_completed" });
        }}
      />
    );
  }

  // Waiting for other players to finish challenges
  if (multiplayer.gameStatus === "playing" && multiplayer.sharedSecret.length > 0 && multiplayer.startTime === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="relative w-32 h-32">
              <div className="absolute inset-0 bg-blue-500 rounded-full animate-pulse"></div>
              <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                <span className="text-6xl">⏳</span>
              </div>
            </div>
          </div>
          <h2 className="text-4xl font-bold text-gray-800">انتظر قليلاً</h2>
          <p className="text-xl text-gray-600">
            انتهيت من التحدي! اللعبة ستبدأ عندما ينتهي جميع اللاعبين من التحدياتهم.
          </p>
          <div className="space-y-4 mt-8">
            <p className="text-lg text-gray-500">اللاعبون المتصلون: {multiplayer.players.length}</p>
            <div className="flex flex-wrap gap-3 justify-center">
              {multiplayer.players.map((player) => (
                <div
                  key={player.id}
                  className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg font-semibold text-lg"
                >
                  {player.name === multiplayer.playerName ? `${player.name} ✓` : player.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Spectator mode: show list of players still playing when current player finished
  if (playerFinished && !shouldShowResults && hasPlayersStillPlaying && !selectedPlayer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="bg-white rounded-xl p-6 shadow-md text-center">
            <div className="text-5xl mb-4">👀</div>
            <h2 className="text-3xl font-bold text-blue-600 mb-2">انتهيت من اللعبة! 🎉</h2>
            <p className="text-gray-600 mb-6">اختر لاعب لمشاهدة محاولاته</p>
            
            <div className="space-y-3">
              {multiplayer.stillPlaying.map((player) => (
                <button
                  key={player.playerId}
                  onClick={() => setSelectedPlayer(player.playerId)}
                  className="w-full flex items-center justify-between bg-gradient-to-r from-blue-100 to-purple-100 p-4 rounded-xl border-2 border-blue-300 hover:border-blue-600 hover:shadow-lg transition-all"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Eye className="w-6 h-6 text-blue-600" />
                    <div className="text-right flex-1">
                      <p className="font-bold text-gray-800">{player.playerName}</p>
                      <p className="text-sm text-gray-600">
                        {player.attempts} محاولات · {formatDuration(player.duration)}
                      </p>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-purple-600 ml-4">
                    {player.attempts}/{multiplayer.settings.maxAttempts}
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => handleLeaveRoom()}
              className="w-full mt-6 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-xl font-bold transition-colors"
            >
              <LogOut className="w-5 h-5" />
              خروج من الغرفة
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (selectedPlayer && playerDetails) {
    // Get navigation for watching mode
    const watchingPlayers = playerFinished && availableToWatch.length > 0 ? availableToWatch : null;
    const currentPlayerIndex = watchingPlayers ? watchingPlayers.findIndex(p => p.playerId === selectedPlayer) : -1;
    const canGoPrevious = watchingPlayers && currentPlayerIndex > 0;
    const canGoNext = watchingPlayers && currentPlayerIndex < watchingPlayers.length - 1;

    const goToPreviousPlayer = () => {
      if (canGoPrevious && watchingPlayers) {
        setSelectedPlayer(watchingPlayers[currentPlayerIndex - 1].playerId);
      }
    };

    const goToNextPlayer = () => {
      if (canGoNext && watchingPlayers) {
        setSelectedPlayer(watchingPlayers[currentPlayerIndex + 1].playerId);
      }
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="flex items-center justify-between bg-white rounded-xl p-4 shadow-md">
            <div className="flex items-center gap-2">
              {watchingPlayers && (
                <>
                  <button
                    onClick={goToPreviousPlayer}
                    disabled={!canGoPrevious}
                    className={`p-2 rounded-lg transition-colors ${
                      canGoPrevious
                        ? "hover:bg-gray-100 text-gray-700"
                        : "text-gray-300 cursor-not-allowed"
                    }`}
                  >
                    ←
                  </button>
                  <span className="text-sm text-gray-600 min-w-[60px] text-center">
                    {currentPlayerIndex + 1} / {watchingPlayers.length}
                  </span>
                  <button
                    onClick={goToNextPlayer}
                    disabled={!canGoNext}
                    className={`p-2 rounded-lg transition-colors ${
                      canGoNext
                        ? "hover:bg-gray-100 text-gray-700"
                        : "text-gray-300 cursor-not-allowed"
                    }`}
                  >
                    →
                  </button>
                </>
              )}
            </div>
            <h2 className="text-xl font-bold text-gray-800">{playerDetails.playerName}</h2>
            <button
              onClick={() => watchingPlayers ? setSelectedPlayer(null) : handleLeaveRoom()}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title={watchingPlayers ? "العودة إلى القائمة" : "خروج"}
            >
              <X className="w-6 h-6 text-gray-700" />
            </button>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-md">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">عدد المحاولات:</span>
                <span className="text-2xl font-bold text-blue-600">{playerDetails.attempts}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">الوقت المستغرق:</span>
                <span className="text-xl font-bold text-green-600">{formatDuration(playerDetails.duration)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-md">
            <h3 className="text-lg font-bold text-gray-800 mb-4">المحاولات</h3>
            <div className="space-y-3">
              {playerDetails.attemptsDetails.map((attempt, idx) => (
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
        </div>
      </div>
    );
  }

  if (false) { // Removed old finished game screen - use results component instead
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="bg-white rounded-xl p-6 shadow-md text-center">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-3xl font-bold text-purple-600 mb-6">نتائج اللعبة</h2>
            
            {multiplayer.winners.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xl font-bold text-green-600 mb-3 flex items-center justify-center gap-2">
                  <Trophy className="w-6 h-6" />
                  الفائزون
                </h3>
                <div className="space-y-2">
                  {multiplayer.winners.map((winner, idx) => (
                    <button
                      key={winner.playerId}
                      onClick={() => setSelectedPlayer(winner.playerId)}
                      className="w-full flex items-center justify-between bg-gradient-to-r from-yellow-100 to-green-100 p-4 rounded-xl border-2 border-green-400 hover:border-green-600 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold text-purple-600">#{idx + 1}</span>
                        <Crown className="w-6 h-6 text-yellow-500" />
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-800">{winner.playerName}</p>
                        <p className="text-sm text-gray-600">
                          {winner.attempts} محاولات · {formatDuration(winner.duration)}
                        </p>
                      </div>
                      <Eye className="w-5 h-5 text-gray-500" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {multiplayer.losers.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xl font-bold text-red-600 mb-3">لم يكملوا</h3>
                <div className="space-y-2">
                  {multiplayer.losers.map((loser) => (
                    <button
                      key={loser.playerId}
                      onClick={() => setSelectedPlayer(loser.playerId)}
                      className="w-full flex items-center justify-between bg-gray-100 p-4 rounded-xl border-2 border-gray-300 hover:border-gray-400 transition-colors"
                    >
                      <span className="font-bold text-gray-700">{loser.playerName}</span>
                      <Eye className="w-5 h-5 text-gray-500" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {multiplayer.rematchState.requested && (
              <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4 mb-4">
                <p className="text-lg font-bold text-blue-800 mb-3">هل تريد إعادة المباراة؟</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleRematchVote(true)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-colors"
                  >
                    نعم
                  </button>
                  <button
                    onClick={() => handleRematchVote(false)}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-colors"
                  >
                    لا
                  </button>
                </div>
              </div>
            )}

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

  // Show game while playing
  if (multiplayer.gameStatus === "playing" && multiplayer.sharedSecret.length > 0) {
    return (
      <div className="min-h-screen h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 overflow-y-auto">
        <div className="w-full h-full flex flex-col p-4">
          {/* Header - Same for all devices */}
          <div className="flex flex-row-reverse items-center justify-between bg-white rounded-xl p-4 shadow-md gap-4 mb-4 max-w-6xl mx-auto w-full">
            <div className="flex gap-2">
              <button
                onClick={() => {
                  handleLeaveRoom();
                  setMode("menu");
                }}
                className="p-2 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0 text-red-600"
                title="الخروج من الغرفة"
              >
                <LogOut className="w-6 h-6" />
              </button>
              <button
                onClick={() => {
                  handleLeaveRoom();
                  setMode("menu");
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                title="الصفحة الرئيسية"
              >
                <Home className="w-6 h-6 text-gray-700" />
              </button>
            </div>
            <div className="text-right flex-1">
              <p className="text-sm text-gray-600">المحاولات المتبقية من {multiplayer.settings.maxAttempts}</p>
              <p className="text-2xl font-bold text-blue-600">{multiplayer.settings.maxAttempts - multiplayer.attempts.length}</p>
            </div>
            <div className="text-right flex-1 border-l-2 border-gray-300 pl-4">
              <p className="text-sm text-gray-600">الوقت المنقضي</p>
              <p className="text-2xl font-bold text-green-600">{formatDuration(getCurrentDuration())}</p>
            </div>
          </div>

          {/* Main Game Area - Different layouts for desktop vs mobile/tablet */}
          <div className="flex-1 flex flex-col xl:flex-row gap-4 max-w-6xl mx-auto w-full">
            {/* Desktop: Attempts on RIGHT (order-2), Number pad on LEFT (order-1) */}
            {/* Mobile/Tablet: Number pad first, then attempts below */}
            
            {/* Number Input Section - LEFT on desktop, TOP on mobile/tablet */}
            <div className="bg-white rounded-xl p-4 shadow-md xl:flex-1 xl:order-1">
              <h3 className="text-lg font-bold text-gray-800 mb-3 text-center">أدخل {numDigits} أرقام</h3>
              
              <div className="flex gap-3 justify-center mb-4" dir="ltr">
                {input.map((digit, idx) => (
                  <div
                    key={idx}
                    className={`w-14 h-16 md:w-16 md:h-18 xl:w-14 xl:h-16 border-2 rounded-xl flex items-center justify-center text-2xl md:text-3xl xl:text-2xl font-bold transition-all ${
                      focusedIndex === idx
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-300 bg-white"
                    }`}
                  >
                    {digit}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto" dir="ltr">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    onClick={() => handleNumberInput(num.toString())}
                    className="h-14 md:h-16 xl:h-14 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-xl font-bold rounded-xl shadow-md active:scale-95 transition-all"
                  >
                    {num}
                  </button>
                ))}
                <button
                  onClick={handleBackspace}
                  className="h-14 md:h-16 xl:h-14 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center"
                >
                  <X className="w-6 h-6" />
                </button>
                <button
                  onClick={() => handleNumberInput("0")}
                  className="h-14 md:h-16 xl:h-14 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-xl font-bold rounded-xl shadow-md active:scale-95 transition-all"
                >
                  0
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={input.some(val => val === "")}
                  className="h-14 md:h-16 xl:h-14 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center"
                >
                  <Check className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Attempts Section - RIGHT on desktop (order-2), BOTTOM on mobile/tablet */}
            <div className="bg-white rounded-xl p-4 shadow-md flex-1 overflow-hidden flex flex-col min-h-[200px] xl:order-2 xl:min-w-[350px] xl:max-w-[400px]">
              <div className="flex items-center justify-between mb-3 flex-shrink-0">
                <h3 className="text-lg font-bold text-gray-800">المحاولات ({multiplayer.attempts.length} / {multiplayer.settings.maxAttempts})</h3>
                {multiplayer.attempts.length > 3 && (
                  <button
                    onClick={() => setExpandedAttempts(true)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Maximize2 className="w-5 h-5 text-gray-600" />
                  </button>
                )}
              </div>
              <div className="overflow-y-auto flex-1 space-y-2">
                {multiplayer.attempts.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">لا توجد محاولات بعد</p>
                ) : (
                  [...multiplayer.attempts].reverse().map((attempt, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-green-50 rounded-xl border border-gray-200 flex-row-reverse"
                    >
                      <span className="font-mono text-xl font-bold text-gray-800">
                        {attempt.guess.join("")}
                      </span>
                      <div className="flex gap-2 text-sm">
                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-lg font-semibold">
                          {attempt.correctCount} صح
                        </span>
                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-lg font-semibold">
                          {attempt.correctPositionCount} مكان
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Expanded Attempts Modal */}
          {expandedAttempts && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
                  <h3 className="text-xl font-bold text-gray-800">المحاولات ({multiplayer.attempts.length} / {multiplayer.settings.maxAttempts})</h3>
                  <button
                    onClick={() => setExpandedAttempts(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Minimize2 className="w-6 h-6 text-gray-600" />
                  </button>
                </div>
                <div className="overflow-y-auto flex-1 p-4">
                  <div className="space-y-3">
                    {[...multiplayer.attempts].reverse().map((attempt, idx) => (
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
                            <span className="text-xs text-green-600">مكان</span>
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

        {/* Cards System UI */}
        {multiplayer.settings.cardsEnabled && (
          <>
            <CardEffectDisplay playerId={multiplayer.playerId} />
            <CardHand
              playerId={multiplayer.playerId}
              onUseCard={(cardId, targetPlayerId) => {
                const cardsState = useCards.getState();
                const playerCards = cardsState.playerCards.find(p => p.playerId === multiplayer.playerId);
                const card = playerCards?.cards.find(c => c.id === cardId);
                
                if (!card) return;
                
                // Calculate effect value for reveal cards
                let effectValue: any = undefined;
                let effectDuration = 30000;
                
                if (card.type === "revealNumber" && multiplayer.sharedSecret.length > 0) {
                  const randomPos = Math.floor(Math.random() * multiplayer.sharedSecret.length);
                  effectValue = [randomPos, multiplayer.sharedSecret[randomPos]];
                  effectDuration = 60000;
                } else if (card.type === "burnNumber" && multiplayer.sharedSecret.length > 0) {
                  const possibleNumbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
                  const notInSecret = possibleNumbers.filter(n => !multiplayer.sharedSecret.includes(n));
                  if (notInSecret.length > 0) {
                    effectValue = notInSecret[Math.floor(Math.random() * notInSecret.length)];
                    effectDuration = 60000;
                  }
                } else if (card.type === "revealParity" && multiplayer.sharedSecret.length > 0) {
                  const positions = [];
                  const usedPositions: number[] = [];
                  for (let i = 0; i < 2 && i < multiplayer.sharedSecret.length; i++) {
                    let pos;
                    do {
                      pos = Math.floor(Math.random() * multiplayer.sharedSecret.length);
                    } while (usedPositions.includes(pos));
                    usedPositions.push(pos);
                    positions.push({
                      position: pos,
                      isEven: multiplayer.sharedSecret[pos] % 2 === 0
                    });
                  }
                  effectValue = positions;
                  effectDuration = 60000;
                } else if (card.type === "freeze" || card.type === "blindMode") {
                  effectDuration = 30000;
                } else if (card.type === "shield") {
                  effectDuration = 120000;
                }
                
                // Remove card from local state
                const success = cardsState.useCard(multiplayer.playerId, cardId, targetPlayerId, multiplayer.sharedSecret);
                
                if (success) {
                  // Send card use via WebSocket
                  send({
                    type: "use_card",
                    cardId,
                    cardType: card.type,
                    targetPlayerId,
                    effectDuration,
                    effectValue,
                  });
                  console.log("Card sent via WebSocket:", card.type);
                }
              }}
              otherPlayers={multiplayer.players
                .filter(p => p.id !== multiplayer.playerId)
                .map(p => ({ id: p.id, name: p.name }))}
            />
          </>
        )}
      </div>
    );
  }

  if (!multiplayer.roomId) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="w-full max-w-md space-y-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 space-y-4">
            <button
              onClick={handleHome}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Home className="w-6 h-6 text-gray-700" />
            </button>

            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">لعب جماعي</h2>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 text-right">
                اسمك
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="أدخل اسمك"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-right focus:outline-none focus:border-blue-500"
                dir="rtl"
              />
            </div>

            <button
              onClick={handleCreateRoom}
              disabled={!playerName.trim()}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Users className="w-5 h-5" />
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
                disabled={!playerName.trim()}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl transition-colors"
              >
                الانضمام لغرفة
              </button>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                  placeholder="رمز الغرفة"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-center focus:outline-none focus:border-blue-500 font-mono text-xl uppercase"
                  maxLength={6}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowJoinForm(false)}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 rounded-xl transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleJoinRoom}
                    disabled={!playerName.trim() || !joinRoomId.trim() || joinRoomId.length !== 6}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors"
                  >
                    انضمام
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Mobile lobby screen (waiting for game to start)
  if (multiplayer.gameStatus === "waiting") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Header */}
          <div className="bg-white rounded-xl p-4 shadow-md">
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={handleHome}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Home className="w-6 h-6 text-gray-700" />
              </button>
              <div className="text-center flex-1">
                <h3 className="text-sm text-gray-600">رمز الغرفة</h3>
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={handleCopyRoomId}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    {copied ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <Copy className="w-5 h-5 text-gray-600" />
                    )}
                  </button>
                  <p className="text-3xl font-mono font-bold text-blue-600">{multiplayer.roomId}</p>
                </div>
              </div>
              {multiplayer.isHost && (
                <button
                  onClick={() => setShowSettings(true)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Settings className="w-6 h-6 text-gray-700" />
                </button>
              )}
            </div>

            {/* Settings Display */}
            <div className="bg-gray-100 rounded-lg p-3 text-center text-sm text-gray-600">
              أرقام: <span className="font-bold text-gray-800">{multiplayer.settings.numDigits}</span> · محاولات: <span className="font-bold text-gray-800">{multiplayer.settings.maxAttempts}</span>
            </div>
          </div>

          {/* Players List */}
          <div className="bg-white rounded-xl p-4 shadow-md">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
              <Users className="w-5 h-5 ml-2" />
              اللاعبون ({multiplayer.players.length})
            </h3>
            <div className="space-y-2">
              {multiplayer.players.map((player) => {
                const isHost = player.id === multiplayer.hostId;
                const isYou = player.id === multiplayer.playerId;
                
                return (
                  <div
                    key={player.id}
                    className={`p-3 rounded-xl flex items-center gap-3 ${
                      isYou
                        ? "bg-gradient-to-r from-blue-100 to-purple-100 border-2 border-blue-300"
                        : "bg-gray-50 border border-gray-200"
                    }`}
                  >
                    {isHost && (
                      <Crown className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    )}
                    {!isHost && (
                      <span className="w-5 h-5 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs">
                        👤
                      </span>
                    )}
                    <span className="font-bold text-gray-800">{player.name}</span>
                    {isYou && (
                      <span className="text-xs bg-blue-200 text-blue-700 px-2 py-0.5 rounded-lg ml-auto">
                        (أنت)
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            {multiplayer.players.length < 2 && (
              <div className="bg-blue-50 p-3 rounded-xl border-2 border-blue-300 mt-3">
                <p className="text-blue-800 text-center font-medium text-sm">
                  🕒 في انتظار انضمام لاعبين آخرين...
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            {multiplayer.isHost && multiplayer.players.length >= 2 && (
              <button
                onClick={handleStartGame}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5" />
                ابدأ اللعبة
              </button>
            )}

            {!multiplayer.isHost && (
              <div className="bg-purple-50 border-2 border-purple-300 rounded-xl p-3">
                <p className="text-purple-800 text-center font-semibold text-sm">
                  ⏳ في انتظار بدء المضيف للعبة...
                </p>
              </div>
            )}

            <button
              onClick={handleLeaveRoom}
              className="w-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2"
            >
              <LogOut className="w-5 h-5" />
              مغادرة الغرفة
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If we reach here, something is wrong - return empty or fallback
  return null;
}
