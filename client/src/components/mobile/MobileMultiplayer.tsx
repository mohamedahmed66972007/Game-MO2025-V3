import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { MultiplayerResults } from "../ui/MultiplayerResults";
import { useNumberGame } from "@/lib/stores/useNumberGame";
import { useAudio } from "@/lib/stores/useAudio";
import { useCards } from "@/lib/stores/useCards";
import { send, connectWebSocket, disconnect } from "@/lib/websocket";
import { Home, Check, X, Users, Copy, Crown, Play, Settings, RefreshCw, Eye, Trophy, Maximize2, Minimize2, LogOut } from "lucide-react";
import { GameSettings } from "../ui/GameSettings";
import { clearSession } from "@/lib/websocket";
import { CardHand, CardEffectDisplay } from "../game/cards/CardSystem";
import { MultiplayerChallenge } from "../game/MultiplayerChallenge";

export function MobileMultiplayer() {
  const navigate = useNavigate();
  const location = useLocation();
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
  const { cardSettings, hasActiveEffect, removeExpiredEffects, revealedDigits, burnedNumbers, playerCards } = useCards();
  const [playerName, setPlayerName] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
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
    // Build input array combining revealed digits with entered digits
    const newInput: string[] = [];
    let enteredDigitIndex = 0;
    
    for (let i = 0; i < numDigits; i++) {
      const revealedDigit = getRevealedDigitAtPosition(i);
      if (revealedDigit !== null) {
        newInput.push(String(revealedDigit));
      } else {
        if (enteredDigitIndex < multiplayer.currentGuess.length) {
          newInput.push(String(multiplayer.currentGuess[enteredDigitIndex]));
          enteredDigitIndex++;
        } else {
          newInput.push("");
        }
      }
    }
    
    setInput(newInput);
    
    // Calculate the next unfilled, non-revealed slot for focus
    let nextFocusIndex = 0;
    let enteredCount = 0;
    for (let i = 0; i < numDigits; i++) {
      const revealedDigit = getRevealedDigitAtPosition(i);
      if (revealedDigit !== null) {
        continue;
      }
      if (enteredCount < multiplayer.currentGuess.length) {
        enteredCount++;
      } else {
        nextFocusIndex = i;
        break;
      }
      nextFocusIndex = i + 1;
    }
    
    // If all non-revealed slots are filled, set focus to end
    const totalNonRevealed = numDigits - revealedDigits.length;
    if (multiplayer.currentGuess.length >= totalNonRevealed) {
      nextFocusIndex = numDigits;
    }
    
    setFocusedIndex(nextFocusIndex);
  }, [multiplayer.currentGuess, numDigits, revealedDigits]);

  // Live timer update
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 100);
    return () => clearInterval(interval);
  }, []);

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

  const isPlayerFrozen = () => {
    removeExpiredEffects();
    return hasActiveEffect(multiplayer.playerId, "freeze");
  };

  const getRevealedDigitAtPosition = (position: number): number | null => {
    const revealed = revealedDigits.find(r => r.position === position);
    return revealed ? revealed.digit : null;
  };

  const isBurnedNumber = (num: number): boolean => {
    return burnedNumbers.includes(num);
  };
  
  const getParityAtPosition = (position: number): { isEven: boolean } | null => {
    const player = playerCards.find(p => p.playerId === multiplayer.playerId);
    if (!player) return null;
    
    const parityEffect = player.activeEffects.find(e => e.cardType === "revealParity" && e.expiresAt > Date.now());
    if (!parityEffect || !parityEffect.value) return null;
    
    const parityInfos = parityEffect.value as { position: number; isEven: boolean }[];
    const parityInfo = parityInfos.find(p => p.position === position);
    return parityInfo ? { isEven: parityInfo.isEven } : null;
  };

  const handleNumberInput = (num: string) => {
    if (multiplayer.gameStatus !== "playing" || multiplayer.phase !== "playing") return;
    if (focusedIndex >= numDigits) return;
    
    if (isPlayerFrozen()) {
      playError();
      return;
    }

    // لا يمكن إدخال رقم محروق
    if (isBurnedNumber(parseInt(num))) {
      playError();
      return;
    }

    // تخطي الخانات المكشوفة تلقائياً
    let targetIndex = focusedIndex;
    while (targetIndex < numDigits && getRevealedDigitAtPosition(targetIndex) !== null) {
      targetIndex++;
    }
    
    if (targetIndex >= numDigits) {
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
    
    if (isPlayerFrozen()) {
      playError();
      return;
    }

    // Build complete guess including revealed digits
    const completeGuess: number[] = [];
    let enteredDigitIndex = 0;
    
    for (let i = 0; i < numDigits; i++) {
      const revealedDigit = getRevealedDigitAtPosition(i);
      if (revealedDigit !== null) {
        completeGuess.push(revealedDigit);
      } else {
        if (enteredDigitIndex < multiplayer.currentGuess.length) {
          completeGuess.push(multiplayer.currentGuess[enteredDigitIndex]);
          enteredDigitIndex++;
        } else {
          playError();
          return;
        }
      }
    }

    if (completeGuess.length !== numDigits) {
      playError();
      return;
    }

    playConfirm();
    send({
      type: "submit_guess",
      guess: completeGuess,
    });
    submitMultiplayerGuess();
  };

  const handleLeaveRoom = () => {
    send({ type: "leave_room" });
    clearSession();
    disconnect();
    resetMultiplayer();
  };

  const handleHome = () => {
    if (multiplayer.roomId) {
      handleLeaveRoom();
    }
    navigate("/");
  };

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(multiplayer.roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = () => {
    const roomLink = `${window.location.origin}/room/${multiplayer.roomId}`;
    navigator.clipboard.writeText(roomLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
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

  const getRemainingTime = () => {
    if (multiplayer.gameStatus === "playing" && multiplayer.startTime > 0) {
      const elapsed = currentTime - multiplayer.startTime;
      const totalDuration = cardSettings.roundDuration * 60 * 1000;
      const remaining = totalDuration - elapsed;
      return Math.max(0, remaining);
    }
    return cardSettings.roundDuration * 60 * 1000;
  };

  const isTimeWarning = () => {
    const remaining = getRemainingTime();
    return remaining <= 30000; // Last 30 seconds
  };

  const playerDetails = selectedPlayer 
    ? [...multiplayer.winners, ...multiplayer.losers].find(p => p.playerId === selectedPlayer)
    : null;

  // Check if current player has finished
  const playerFinished = multiplayer.phase === "won" || multiplayer.phase === "lost";
  
  // Show results screen only if explicitly requested via showResults flag
  const shouldShowResults = multiplayer.showResults;

  // Initialize spectator mode when player finishes
  // Watching mode when player finishes
  useEffect(() => {
    if (playerFinished && !multiplayer.showResults) {
      // Player finished but results not shown yet - just wait
      console.log("Player finished, waiting for results...");
    }
  }, [playerFinished, multiplayer.showResults]);

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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 overflow-y-auto pb-safe">
        <div className="max-w-lg mx-auto w-full p-4 flex items-center justify-center min-h-screen">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 bg-blue-500 rounded-full animate-pulse"></div>
                <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                  <span className="text-3xl">⏳</span>
                </div>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-800">انتظر قليلاً</h2>
            <p className="text-gray-600">
              انتهيت من التحدي! اللعبة ستبدأ عندما ينتهي جميع اللاعبين من التحدياتهم.
            </p>
            <div className="space-y-2 mt-6">
              <p className="text-sm text-gray-500">اللاعبون المتصلون: {multiplayer.players.length}</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {multiplayer.players.map((player) => (
                  <div
                    key={player.id}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-sm font-semibold"
                  >
                    {player.name === multiplayer.playerName ? `${player.name} ✓` : player.name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (selectedPlayer && playerDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="flex items-center justify-between bg-white rounded-xl p-4 shadow-md">
            <button
              onClick={() => setSelectedPlayer(null)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-gray-700" />
            </button>
            <h2 className="text-xl font-bold text-gray-800">{playerDetails.playerName}</h2>
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 overflow-y-auto pb-safe">
        <div className="max-w-lg mx-auto w-full p-4 space-y-4">
          {/* Header */}
          <div className="flex flex-row-reverse items-center justify-between bg-white rounded-xl p-3 shadow-md gap-3 sticky top-0 z-10">
            <button
              onClick={() => {
                handleLeaveRoom();
                navigate("/");
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              title="الصفحة الرئيسية"
            >
              <Home className="w-5 h-5 text-gray-700" />
            </button>
            <div className="text-right flex-1">
              <p className="text-xs text-gray-600">المحاولات المتبقية</p>
              <p className="text-xl font-bold text-blue-600">{multiplayer.settings.maxAttempts - multiplayer.attempts.length}/{multiplayer.settings.maxAttempts}</p>
            </div>
            <div className="text-right flex-1 border-l-2 border-gray-300 pl-3">
              <p className="text-xs text-gray-600">الوقت المتبقي</p>
              <p className={`text-xl font-bold ${isTimeWarning() ? 'text-red-600 animate-pulse' : 'text-green-600'}`}>{formatDuration(getRemainingTime())}</p>
            </div>
          </div>

          {/* Number Input Section */}
          <div className="bg-white rounded-xl p-4 shadow-md">
            <h3 className="text-base font-bold text-gray-800 mb-3 text-center">أدخل {numDigits} أرقام</h3>
            
            <div className="flex gap-2 justify-center mb-4" dir="ltr">
              {input.map((digit, idx) => {
                const revealedDigit = getRevealedDigitAtPosition(idx);
                const isRevealed = revealedDigit !== null;
                const parityInfo = getParityAtPosition(idx);
                
                return (
                  <div
                    key={idx}
                    className={`relative w-12 h-14 border-2 rounded-xl flex items-center justify-center text-2xl font-bold transition-all ${
                      isRevealed
                        ? "border-purple-500 bg-purple-50"
                        : focusedIndex === idx
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-300 bg-white"
                    }`}
                    title={isRevealed ? "رقم مكشوف" : parityInfo ? (parityInfo.isEven ? "رقم زوجي" : "رقم فردي") : undefined}
                  >
                    {isRevealed && !digit && (
                      <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold opacity-40 text-purple-600">
                        {revealedDigit}
                      </span>
                    )}
                    {parityInfo && !isRevealed && !digit && (
                      <span className={`absolute inset-0 flex items-center justify-center text-sm font-medium opacity-40 ${
                        parityInfo.isEven ? "text-green-600" : "text-orange-600"
                      }`}>
                        {parityInfo.isEven ? "زوجي" : "فردي"}
                      </span>
                    )}
                    <span className="relative z-10">{digit}</span>
                    {isRevealed && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center">
                        <Eye className="w-2.5 h-2.5 text-white" />
                      </span>
                    )}
                    {parityInfo && !isRevealed && (
                      <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] text-white ${
                        parityInfo.isEven ? "bg-green-500" : "bg-orange-500"
                      }`}>
                        {parityInfo.isEven ? "ز" : "ف"}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* إظهار الأرقام المحروقة */}
            {burnedNumbers.length > 0 && (
              <div className="flex items-center justify-center gap-1 mb-3 text-xs text-red-600">
                <X className="w-3 h-3" />
                <span>أرقام محروقة: {burnedNumbers.join("، ")}</span>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 max-w-[280px] mx-auto" dir="ltr">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
                const isBurned = isBurnedNumber(num);
                return (
                  <button
                    key={num}
                    onClick={() => handleNumberInput(num.toString())}
                    disabled={isBurned}
                    className={`h-14 text-xl font-bold rounded-xl shadow-md active:scale-95 transition-all ${
                      isBurned
                        ? "bg-gradient-to-br from-red-300 to-red-400 text-red-100 cursor-not-allowed line-through"
                        : "bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
                    }`}
                  >
                    {num}
                  </button>
                );
              })}
              <button
                onClick={handleBackspace}
                className="h-14 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleNumberInput("0")}
                disabled={isBurnedNumber(0)}
                className={`h-14 text-xl font-bold rounded-xl shadow-md active:scale-95 transition-all ${
                  isBurnedNumber(0)
                    ? "bg-gradient-to-br from-red-300 to-red-400 text-red-100 cursor-not-allowed line-through"
                    : "bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
                }`}
              >
                0
              </button>
              <button
                onClick={handleSubmit}
                disabled={input.some((val, idx) => val === "" && getRevealedDigitAtPosition(idx) === null)}
                className="h-14 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center"
              >
                <Check className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Attempts Section - Always visible, scrollable */}
          <div className="bg-white rounded-xl p-4 shadow-md">
            <div className="flex items-center justify-between mb-3">
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
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {multiplayer.attempts.length === 0 ? (
                <p className="text-gray-500 text-center py-4">لا توجد محاولات بعد</p>
              ) : (
                [...multiplayer.attempts].reverse().map((attempt, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-green-50 rounded-xl border border-gray-200 flex-row-reverse"
                  >
                    <span className="font-mono text-lg font-bold text-gray-800">
                      {attempt.guess.join("")}
                    </span>
                    <div className="flex gap-2 text-xs">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-lg font-semibold">
                        {attempt.correctCount} صح
                      </span>
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-lg font-semibold">
                        {attempt.correctPositionCount} مكان
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Expanded Attempts Modal */}
          {expandedAttempts && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
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
                            <span className="text-xl font-bold text-blue-600">{attempt.correctCount}</span>
                            <span className="text-xs text-blue-600">صح</span>
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-xl font-bold text-green-600">{attempt.correctPositionCount}</span>
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
                const playerCardsData = cardsState.playerCards.find(p => p.playerId === multiplayer.playerId);
                const card = playerCardsData?.cards.find(c => c.id === cardId);
                
                if (!card) return;
                
                // حفظ عدد الأرقام المكشوفة قبل الاستخدام
                const prevRevealedCount = cardsState.revealedDigits.length;
                
                // استخدام البطاقة عبر المتجر - يتم حساب كل شيء هناك
                const success = cardsState.useCard(
                  multiplayer.playerId, 
                  cardId, 
                  targetPlayerId, 
                  multiplayer.sharedSecret,
                  multiplayer.settings.numDigits
                );
                
                if (success) {
                  // الحصول على التأثير من المتجر
                  const updatedCardsState = useCards.getState();
                  const updatedPlayerCards = updatedCardsState.playerCards.find(p => p.playerId === multiplayer.playerId);
                  const latestEffect = updatedPlayerCards?.activeEffects[updatedPlayerCards.activeEffects.length - 1];
                  
                  // للبطاقة revealNumber مع إظهار في الخانة، نحصل على القيمة من revealedDigits
                  let effectValue: any = latestEffect?.value;
                  if (card.type === "revealNumber" && updatedCardsState.cardSettings.revealNumberShowPosition) {
                    const newRevealed = updatedCardsState.revealedDigits[updatedCardsState.revealedDigits.length - 1];
                    if (newRevealed && updatedCardsState.revealedDigits.length > prevRevealedCount) {
                      effectValue = { position: newRevealed.position, digit: newRevealed.digit };
                    }
                  }
                  
                  // إرسال استخدام البطاقة عبر WebSocket
                  send({
                    type: "use_card",
                    cardId,
                    cardType: card.type,
                    targetPlayerId,
                    effectDuration: latestEffect ? latestEffect.expiresAt - Date.now() : 30000,
                    effectValue,
                  });
                  console.log("Card used successfully:", card.type, effectValue);
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
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={handleHome}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Home className="w-6 h-6 text-gray-700" />
              </button>
              {multiplayer.isHost && (
                <button
                  onClick={() => setShowSettings(true)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Settings className="w-6 h-6 text-gray-700" />
                </button>
              )}
            </div>

            {/* Room ID and Copy Link */}
            <div className="space-y-3">
              <div className="text-center">
                <h3 className="text-sm text-gray-600 mb-2">رمز الغرفة</h3>
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={handleCopyRoomId}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="نسخ رمز الغرفة"
                  >
                    {copied ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <Copy className="w-5 h-5 text-gray-600" />
                    )}
                  </button>
                  <p className="text-2xl font-mono font-bold text-blue-600">{multiplayer.roomId}</p>
                </div>
              </div>

              <button
                onClick={handleCopyLink}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2 text-sm"
                title="نسخ رابط الغرفة"
              >
                <Copy className="w-4 h-4" />
                {linkCopied ? "✓ تم نسخ الرابط" : "نسخ رابط الغرفة"}
              </button>
            </div>

            {/* Settings Display */}
            <div className="bg-gray-100 rounded-lg p-3 text-center text-sm text-gray-600 mt-3">
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
