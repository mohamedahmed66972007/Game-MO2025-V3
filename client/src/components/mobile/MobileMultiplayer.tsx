import { useState, useEffect } from "react";
import { useNumberGame } from "@/lib/stores/useNumberGame";
import { useAudio } from "@/lib/stores/useAudio";
import { send, connectWebSocket, disconnect } from "@/lib/websocket";
import { Home, Check, X, Users, Copy, Maximize2, Minimize2 } from "lucide-react";
import { GameSettings } from "../ui/GameSettings";

export function MobileMultiplayer() {
  const {
    multiplayer,
    setMode,
    resetMultiplayer,
    setMySecretCode,
    setChallengeStatus,
    setOpponentId,
    setShowOpponentAttempts,
  } = useNumberGame();

  const { playDigit, playDelete, playError, successSound } = useAudio();
  const [playerName, setPlayerName] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [showJoinForm, setShowJoinForm] = useState(false);
  const numDigits = multiplayer.settings.numDigits;
  const [input, setInput] = useState<string[]>(Array(numDigits).fill(""));
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [secretCodeInput, setSecretCodeInput] = useState<string[]>(Array(numDigits).fill(""));
  const [secretFocusedIndex, setSecretFocusedIndex] = useState(0);
  const [expandedAttempts, setExpandedAttempts] = useState(false);
  const [showOpponentWonAlert, setShowOpponentWonAlert] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (secretCodeInput.length !== numDigits) {
      setSecretCodeInput(Array(numDigits).fill(""));
    }
    setSecretFocusedIndex(0);
  }, [numDigits]);

  useEffect(() => {
    if (multiplayer.roomId && !multiplayer.playerId) {
      connectWebSocket(playerName);
    }
  }, [multiplayer.roomId, multiplayer.playerId, playerName]);

  useEffect(() => {
    if (!multiplayer.isMyTurn || multiplayer.turnTimeLeft <= 0) return;
    
    const timer = setInterval(() => {
      const { setTurnTimeLeft, turnTimeLeft } = useNumberGame.getState().multiplayer;
      if (turnTimeLeft > 0) {
        useNumberGame.setState({
          multiplayer: {
            ...useNumberGame.getState().multiplayer,
            turnTimeLeft: turnTimeLeft - 1,
          },
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [multiplayer.isMyTurn, multiplayer.turnTimeLeft]);

  useEffect(() => {
    if (multiplayer.opponentWonFirst) {
      setShowOpponentWonAlert(true);
    }
  }, [multiplayer.opponentWonFirst]);

  const handleCreateRoom = () => {
    if (!playerName.trim()) return;
    connectWebSocket(playerName.trim());
  };

  const handleJoinRoom = () => {
    if (!playerName.trim() || !joinRoomId.trim()) return;
    connectWebSocket(playerName.trim(), joinRoomId.trim().toUpperCase());
  };

  const handleChallenge = (opponentId: string) => {
    send({
      type: "challenge_player",
      opponentId,
    });
  };

  const handleAcceptChallenge = () => {
    setSecretCodeInput(Array(numDigits).fill(""));
    setSecretFocusedIndex(0);
    send({
      type: "accept_challenge",
      opponentId: multiplayer.opponentId,
    });
    setChallengeStatus("accepted");
  };

  const handleRematch = () => {
    send({
      type: "request_rematch",
      opponentId: multiplayer.opponentId,
    });
  };

  const handleSecretNumberInput = (num: string) => {
    if (secretFocusedIndex >= numDigits) return;
    
    const newInput = [...secretCodeInput];
    newInput[secretFocusedIndex] = num;
    setSecretCodeInput(newInput);
    
    if (secretFocusedIndex < numDigits - 1) {
      setSecretFocusedIndex(secretFocusedIndex + 1);
    }
  };

  const handleSecretBackspace = () => {
    if (secretFocusedIndex > 0) {
      const newInput = [...secretCodeInput];
      if (secretCodeInput[secretFocusedIndex] === "") {
        newInput[secretFocusedIndex - 1] = "";
        setSecretFocusedIndex(secretFocusedIndex - 1);
      } else {
        newInput[secretFocusedIndex] = "";
      }
      setSecretCodeInput(newInput.slice(0, numDigits));
    } else if (secretCodeInput[0] !== "") {
      const newInput = [...secretCodeInput];
      newInput[0] = "";
      setSecretCodeInput(newInput.slice(0, numDigits));
    }
  };

  const handleSubmitSecretCode = () => {
    if (secretCodeInput.length !== numDigits || secretCodeInput.some(val => val === "")) return;
    
    const code = secretCodeInput.map(Number);
    setMySecretCode(code);
    send({
      type: "set_secret_code",
      code,
      opponentId: multiplayer.opponentId,
    });
  };

  const handleNumberInput = (num: string) => {
    if (focusedIndex >= numDigits) return;
    
    playDigit(parseInt(num));
    const newInput = [...input];
    newInput[focusedIndex] = num;
    setInput(newInput);
    
    if (focusedIndex < numDigits - 1) {
      setFocusedIndex(focusedIndex + 1);
    }
  };

  const handleBackspace = () => {
    playDelete();
    if (focusedIndex > 0) {
      const newInput = [...input];
      if (input[focusedIndex] === "") {
        newInput[focusedIndex - 1] = "";
        setFocusedIndex(focusedIndex - 1);
      } else {
        newInput[focusedIndex] = "";
      }
      setInput(newInput);
    } else if (input[0] !== "") {
      const newInput = [...input];
      newInput[0] = "";
      setInput(newInput);
    }
  };

  const handleSubmitGuess = () => {
    if (input.some(val => val === "")) return;
    if (!multiplayer.isMyTurn) return;

    const guess = input.map(Number);
    send({
      type: "submit_guess",
      guess,
      opponentId: multiplayer.opponentId,
    });

    setInput(Array(numDigits).fill(""));
    setFocusedIndex(0);
  };

  const handleHome = () => {
    disconnect();
    resetMultiplayer();
    setMode("menu");
  };

  const copyRoomId = () => {
    if (multiplayer.roomId) {
      navigator.clipboard.writeText(multiplayer.roomId);
    }
  };

  if (!multiplayer.roomId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          <button
            onClick={handleHome}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
          >
            <Home className="w-5 h-5" />
            <span>العودة</span>
          </button>

          <div className="bg-white rounded-2xl shadow-xl p-6 space-y-4">
            <h2 className="text-2xl font-bold text-gray-800 text-center">اللعب الجماعي</h2>
            
            <input
              type="text"
              placeholder="أدخل اسمك"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none text-lg"
            />

            {!showJoinForm ? (
              <div className="space-y-3">
                <button
                  onClick={handleCreateRoom}
                  disabled={!playerName.trim()}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl transition-all"
                >
                  إنشاء غرفة جديدة
                </button>
                <button
                  onClick={() => setShowJoinForm(true)}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold py-3 px-6 rounded-xl transition-all"
                >
                  الانضمام لغرفة
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="رمز الغرفة"
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none text-lg"
                  maxLength={6}
                />
                <button
                  onClick={handleJoinRoom}
                  disabled={!playerName.trim() || !joinRoomId.trim()}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl transition-all"
                >
                  انضم
                </button>
                <button
                  onClick={() => setShowJoinForm(false)}
                  className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-6 rounded-xl transition-all"
                >
                  إلغاء
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show waiting screen when challenge is sent
  if (multiplayer.challengeStatus === "sent") {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center space-y-6">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="inline-flex items-center justify-center mb-6">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500"></div>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">تم إرسال التحدي</h2>
            <p className="text-gray-600">في انتظار قبول الخصم...</p>
          </div>
          <button
            onClick={handleHome}
            className="flex items-center justify-center gap-2 text-gray-700 hover:text-gray-900 mx-auto"
          >
            <Home className="w-5 h-5" />
            <span>إلغاء والعودة</span>
          </button>
        </div>
      </div>
    );
  }

  // Show game settings if requested
  if (showSettings && multiplayer.challengeStatus === "none") {
    return (
      <GameSettings
        onConfirm={() => setShowSettings(false)}
        isMultiplayer={true}
      />
    );
  }

  // Show lobby screen when in room (either waiting for opponent or showing challenge UI)
  if (multiplayer.roomId && (!multiplayer.opponentId || multiplayer.challengeStatus === "received")) {
    return (
      <div className="min-h-screen p-6 bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <button
          onClick={handleHome}
          className="mb-4 flex items-center gap-2 text-gray-700 hover:text-gray-900"
        >
          <Home className="w-5 h-5" />
          <span>العودة</span>
        </button>

        <div className="max-w-md mx-auto space-y-6">
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-800">غرفة اللعب</h2>
              <button
                onClick={() => setShowSettings(true)}
                className="px-3 py-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-semibold rounded-lg shadow-md"
              >
                ⚙️
              </button>
            </div>
            
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-4">
              <p className="text-sm text-gray-600 text-center mb-2">رمز الغرفة</p>
              <div className="flex items-center justify-center gap-2">
                <p className="text-3xl font-mono font-bold text-blue-600">{multiplayer.roomId}</p>
                <button
                  onClick={copyRoomId}
                  className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  <Copy className="w-5 h-5 text-blue-600" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Users className="w-5 h-5" />
                اللاعبون ({multiplayer.players.length}/4)
              </h3>
              {multiplayer.players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <span className="font-semibold text-gray-800">{player.name}</span>
                  {player.id !== multiplayer.playerId && (
                    <button
                      onClick={() => handleChallenge(player.id)}
                      className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors"
                      disabled={multiplayer.challengeStatus !== "none"}
                    >
                      تحدي
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {multiplayer.challengeStatus === "received" && (
            <div className="bg-white rounded-2xl shadow-xl p-6 text-center space-y-4 animate-pulse">
              <div className="text-5xl mb-2">⚔️</div>
              <p className="text-xl font-bold text-gray-800">
                لاعب يريد تحديك!
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleAcceptChallenge}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  قبول
                </button>
                <button
                  onClick={() => {
                    setChallengeStatus("none");
                    setOpponentId("");
                  }}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <X className="w-5 h-5" />
                  رفض
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (multiplayer.opponentId && multiplayer.mySecretCode.length === 0) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50" dir="ltr">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 space-y-6 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 text-center">اختر رقمك السري</h2>
          
          <div className="flex gap-3 justify-center mb-6">
            {secretCodeInput.map((digit, idx) => (
              <div
                key={idx}
                className={`w-16 h-20 border-2 rounded-xl flex items-center justify-center text-3xl font-bold transition-all ${
                  secretFocusedIndex === idx
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300 bg-white"
                }`}
              >
                {digit}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            {[1, 2, 3].map((num) => (
              <button
                key={num}
                onClick={() => handleSecretNumberInput(num.toString())}
                className="h-16 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-2xl font-bold rounded-xl shadow-md active:scale-95 transition-all"
              >
                {num}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            {[4, 5, 6].map((num) => (
              <button
                key={num}
                onClick={() => handleSecretNumberInput(num.toString())}
                className="h-16 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-2xl font-bold rounded-xl shadow-md active:scale-95 transition-all"
              >
                {num}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            {[7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handleSecretNumberInput(num.toString())}
                className="h-16 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-2xl font-bold rounded-xl shadow-md active:scale-95 transition-all"
              >
                {num}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={handleSecretBackspace}
              className="h-16 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center"
            >
              <X className="w-6 h-6" />
            </button>
            <button
              onClick={() => handleSecretNumberInput("0")}
              className="h-16 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-2xl font-bold rounded-xl shadow-md active:scale-95 transition-all"
            >
              0
            </button>
            <button
              onClick={handleSubmitSecretCode}
              disabled={secretCodeInput.some(val => val === "")}
              className="h-16 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center"
            >
              <Check className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show pending win screen (won but opponent hasn't finished)
  if (multiplayer.pendingWin && !multiplayer.showResults) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-center space-y-6 border border-gray-200">
          <div className="text-6xl animate-bounce">🎉</div>
          <h2 className="text-3xl font-bold text-gray-800">مبروك! فزت</h2>
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl border-2 border-blue-200">
            <p className="text-gray-600 mb-3">ولكن انتظر...</p>
            <p className="text-gray-800 font-semibold mb-4">{multiplayer.pendingWinMessage}</p>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          </div>
          <div className="space-y-2 text-gray-700">
            <p>محاولاتك: <span className="font-bold text-blue-600">{multiplayer.attempts.length}</span></p>
            <p>محاولات الخصم: <span className="font-bold text-purple-600">{multiplayer.opponentAttempts.length}</span></p>
          </div>
        </div>
      </div>
    );
  }

  // Show rematch request when received
  if (multiplayer.showResults && multiplayer.rematchRequested) {
    const handleAcceptRematch = () => {
      send({
        type: "accept_rematch",
        opponentId: multiplayer.opponentId,
      });
    };

    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-center space-y-6 border border-gray-200">
          <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl mx-auto">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-800">طلب إعادة مبارة</h2>
          <p className="text-gray-600 text-lg">الخصم يريد لعب مبارة أخرى</p>
          <div className="space-y-3">
            <button
              onClick={handleAcceptRematch}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
            >
              قبول
            </button>
            <button
              onClick={handleHome}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
            >
              رفض والعودة للقائمة
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (multiplayer.showResults) {
    const showOpponentAttempts = multiplayer.showOpponentAttempts;
    
    if (showOpponentAttempts) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-800">محاولات الخصم</h2>
              <button
                onClick={() => setShowOpponentAttempts(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {multiplayer.opponentAttempts.length > 0 ? (
                [...multiplayer.opponentAttempts].reverse().map((attempt, idx) => {
                  const positionText = 
                    attempt.correctPositionCount === 0 ? '0 مكانو صح' :
                    attempt.correctPositionCount === 1 ? '1 مكانو صح' :
                    `${attempt.correctPositionCount} مكانهم صح`;

                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg flex-row-reverse"
                    >
                      <span className="font-mono text-lg font-bold text-gray-800">
                        {attempt.guess.join("")}
                      </span>
                      <div className="flex gap-2 text-sm">
                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-lg font-semibold">
                          {attempt.correctCount} صح
                        </span>
                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-lg font-semibold">
                          {positionText}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-center text-gray-500">لا توجد محاولات</p>
              )}
            </div>
            
            <button
              onClick={() => setShowOpponentAttempts(false)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
            >
              العودة
            </button>
          </div>
        </div>
      );
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-center space-y-6">
          <div className="text-6xl">
            {multiplayer.gameResult === "won" && "🎉"}
            {multiplayer.gameResult === "lost" && "😢"}
            {multiplayer.gameResult === "tie" && "🤝"}
          </div>
          <h2 className="text-3xl font-bold text-gray-800">
            {multiplayer.gameResult === "won" && "مبروك! فزت"}
            {multiplayer.gameResult === "lost" && "خسرت"}
            {multiplayer.gameResult === "tie" && "تعادل"}
          </h2>
          <div className="space-y-2 text-gray-700">
            <p>محاولاتك: <span className="font-bold text-blue-600">{multiplayer.attempts.length}</span></p>
            <p>محاولات الخصم: <span className="font-bold text-purple-600">{multiplayer.opponentAttempts.length}</span></p>
            {multiplayer.opponentSecretCode.length > 0 && (
              <p>رقم الخصم السري: <span className="font-mono font-bold text-pink-600">{multiplayer.opponentSecretCode.join("")}</span></p>
            )}
          </div>
          <div className="space-y-3">
            <button
              onClick={() => setShowOpponentAttempts(true)}
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
            >
              عرض محاولات الخصم
            </button>
            <button
              onClick={handleRematch}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-xl transition-colors"
            >
              طلب إعادة المبارة
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

  const isMyTurn = multiplayer.isMyTurn;
  const opponentName = multiplayer.players.find(p => p.id === multiplayer.opponentId)?.name || "الخصم";

  return (
    <div className="min-h-screen overflow-y-auto p-2 pb-safe flex flex-col">
      <div className="flex-shrink-0 bg-white rounded-xl p-3 shadow-md mb-2">
        <div className="flex flex-row-reverse items-center justify-between mb-2">
          <button
            onClick={handleHome}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Home className="w-5 h-5 text-gray-700" />
          </button>
          <div className="text-right">
            <p className="text-xs text-gray-600">{isMyTurn ? "دورك" : "دور الخصم"}</p>
            <p className="text-base font-bold text-blue-600">{opponentName}</p>
          </div>
        </div>
        
        <div className="space-y-1 text-xs">
          {isMyTurn && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-1.5 rounded-lg border border-blue-200">
              <p className="text-gray-600 text-xs">المتبقي من الوقت</p>
              <p className="text-base font-bold text-blue-600">{multiplayer.turnTimeLeft}s</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-1">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-1 rounded-lg border border-blue-200">
              <p className="text-gray-600 text-xs">محاولاتك</p>
              <p className="text-base font-bold text-blue-600">{multiplayer.attempts.length}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-1 rounded-lg border border-purple-200">
              <p className="text-gray-600 text-xs">محاولات الخصم</p>
              <p className="text-base font-bold text-purple-600">{multiplayer.opponentAttempts.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto space-y-2">
        {isMyTurn && (
          <div className="bg-white rounded-xl p-4 shadow-md flex-shrink-0" dir="ltr">
            <h3 className="text-base font-bold text-gray-800 mb-3 text-center">أدخل تخمينك</h3>
            
            <div className="flex gap-2 justify-center mb-4">
              {input.map((digit, idx) => (
                <div
                  key={idx}
                  className={`w-12 h-16 border-2 rounded-lg flex items-center justify-center text-2xl font-bold transition-all ${
                    focusedIndex === idx
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-300 bg-white"
                  }`}
                >
                  {digit}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2 mb-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  onClick={() => handleNumberInput(num.toString())}
                  className="h-12 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-lg font-bold rounded-lg shadow-md active:scale-95 transition-all"
                >
                  {num}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={handleBackspace}
                className="h-12 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold rounded-lg shadow-md active:scale-95 transition-all flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleNumberInput("0")}
                className="h-12 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-lg font-bold rounded-lg shadow-md active:scale-95 transition-all"
              >
                0
              </button>
              <button
                onClick={handleSubmitGuess}
                disabled={input.some(val => val === "")}
                className="h-12 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-bold rounded-lg shadow-md active:scale-95 transition-all flex items-center justify-center"
              >
                <Check className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {multiplayer.opponentWonFirst && !multiplayer.showResults && showOpponentWonAlert && (
          <div className="fixed top-4 right-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-6 shadow-2xl border-2 border-orange-300 max-w-sm animate-pulse z-50">
            <div className="flex items-start justify-between mb-3">
              <div className="text-4xl">⚠️</div>
              <button
                onClick={() => setShowOpponentWonAlert(false)}
                className="p-1 hover:bg-red-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-red-600" />
              </button>
            </div>
            <h3 className="text-xl font-bold text-red-700 mb-2">تحذير!</h3>
            <p className="text-gray-800 font-semibold mb-2 text-sm">لقد خمن الخصم الرقم السري الصحيح</p>
            <p className="text-sm text-red-600 font-bold">متبق لديك فرصة واحدة لتفوز</p>
          </div>
        )}

        {!isMyTurn && !multiplayer.opponentWonFirst && (
          <div className="bg-white rounded-xl p-6 shadow-md text-center space-y-3 flex-shrink-0">
            <div className="text-3xl mb-2">⏳</div>
            <p className="text-lg font-bold text-gray-800">انتظر دور الخصم...</p>
          </div>
        )}

        {multiplayer.attempts.length > 0 && !expandedAttempts && (
          <div className="bg-white rounded-xl p-3 shadow-md flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-gray-800">آخر محاولة</h3>
              <button
                onClick={() => setExpandedAttempts(true)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Maximize2 className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            {multiplayer.attempts.length > 0 && (
              <div className="flex items-center justify-between p-2 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg flex-row-reverse border border-gray-200">
                <span className="font-mono text-lg font-bold text-gray-800">
                  {[...multiplayer.attempts].reverse()[0].guess.join("")}
                </span>
                <div className="flex gap-1">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-semibold">
                    {[...multiplayer.attempts].reverse()[0].correctCount} صح
                  </span>
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold">
                    {[...multiplayer.attempts].reverse()[0].correctPositionCount === 0 && '0 مكانو'}
                    {[...multiplayer.attempts].reverse()[0].correctPositionCount === 1 && '1 مكانو'}
                    {[...multiplayer.attempts].reverse()[0].correctPositionCount > 1 && `${[...multiplayer.attempts].reverse()[0].correctPositionCount} مكانهم`}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {expandedAttempts && (
          <div className="fixed inset-0 bg-black/50 flex items-end z-50 p-4">
            <div className="w-full bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
                <h3 className="text-2xl font-bold text-gray-800">محاولاتك</h3>
                <button
                  onClick={() => setExpandedAttempts(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Minimize2 className="w-6 h-6 text-gray-600" />
                </button>
              </div>
              <div className="overflow-y-scroll flex-1 p-4">
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
                          <span className="text-xs text-green-600">مكانهم</span>
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
    </div>
  );
}
