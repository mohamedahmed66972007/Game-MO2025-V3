import { useState, useEffect } from "react";
import { Button } from "./button";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { useNumberGame } from "@/lib/stores/useNumberGame";
import { send, clearSession, disconnect } from "@/lib/websocket";
import { Check, X, Users, Copy, Loader, LogOut, Zap, Settings } from "lucide-react";
import { GameSettings } from "./GameSettings";

export function MultiplayerLobby() {
  const { multiplayer, setMode, setChallengeStatus, setOpponentId, setOpponentName, setMySecretCode, resetMultiplayer } = useNumberGame();
  const [selectedOpponent, setSelectedOpponent] = useState<string | null>(null);
  const numDigits = multiplayer.settings.numDigits;
  const [secretCodeInput, setSecretCodeInput] = useState<string[]>(Array(numDigits).fill(""));
  const [secretFocusedIndex, setSecretFocusedIndex] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  // Call all hooks at the top, before any conditional rendering
  useEffect(() => {
    if (secretCodeInput.length !== numDigits) {
      setSecretCodeInput(Array(numDigits).fill(""));
    }
    setSecretFocusedIndex(0);
  }, [numDigits]);

  const handleLeaveRoom = () => {
    send({ type: "leave_room" });
    clearSession();
    disconnect();
    resetMultiplayer();
    setMode("menu");
    setTimeout(() => {
      window.location.reload();
    }, 300);
  };

  const handleRejectChallenge = () => {
    if (multiplayer.opponentId) {
      send({ type: "reject_challenge", opponentId: multiplayer.opponentId });
      setChallengeStatus("none");
      setOpponentId(null);
      setOpponentName("");
    }
  };

  const handleChallengePlayer = (opponentId: string) => {
    setSelectedOpponent(opponentId);
    setOpponentId(opponentId);
    setChallengeStatus("sent");
    send({ type: "challenge_player", opponentId });
  };

  const handleAcceptChallenge = () => {
    if (multiplayer.opponentId) {
      setSecretCodeInput(Array(numDigits).fill(""));
      setSecretFocusedIndex(0);
      setChallengeStatus("accepted");
      send({ type: "accept_challenge", opponentId: multiplayer.opponentId });
    }
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
      setSecretCodeInput(newInput);
    } else if (secretCodeInput[0] !== "") {
      const newInput = [...secretCodeInput];
      newInput[0] = "";
      setSecretCodeInput(newInput);
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

  const otherPlayers = multiplayer.players.filter((p) => p.id !== multiplayer.playerId);

  // Render GameSettings if showSettings is true and no challenge
  if (showSettings && multiplayer.challengeStatus === "none") {
    return (
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
    );
  }

  // Render secret code input if challenge accepted and no secret code submitted yet
  if (multiplayer.challengeStatus === "accepted" && multiplayer.mySecretCode.length === 0) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 z-50 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 space-y-6 border border-gray-200">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-3xl flex items-center justify-center shadow-lg">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center">
                <span className="text-2xl">🔒</span>
              </div>
            </div>
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">اختر رقمك السري</h2>
            <p className="text-sm text-gray-600">اختر {numDigits} أرقام لتخمينها خصمك</p>
          </div>
          
          <div className="flex gap-3 justify-center mb-6">
            {Array.from({ length: numDigits }, (_, idx) => (
              <div
                key={idx}
                className={`w-16 h-20 border-2 rounded-xl flex items-center justify-center text-3xl font-bold transition-all ${
                  secretFocusedIndex === idx
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300 bg-white"
                }`}
              >
                {secretCodeInput[idx] || ""}
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
              disabled={secretCodeInput.length !== numDigits || secretCodeInput.some(val => val === "")}
              className="h-16 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center"
            >
              <Check className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render loading if challenge being sent
  if (multiplayer.challengeStatus === "sent") {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 z-50">
        <div className="text-center">
          <div className="inline-flex items-center justify-center mb-4">
            <Loader className="w-12 h-12 text-blue-500 animate-spin" />
          </div>
          <p className="text-gray-800 text-lg font-semibold">جاري قبول التحدي...</p>
          <p className="text-gray-600 text-sm mt-2">يرجى الانتظار</p>
        </div>
      </div>
    );
  }

  // Don't show lobby if secret code already submitted
  if (multiplayer.challengeStatus === "accepted" && multiplayer.mySecretCode.length > 0) {
    return null;
  }

  // Main lobby view
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 z-50 p-4">
      <Card className="w-full max-w-3xl bg-white border-2 border-gray-200 shadow-2xl rounded-3xl max-h-[90vh] flex flex-col relative">
        <button
          onClick={() => setShowSettings(true)}
          className="absolute top-4 right-4 p-2 hover:bg-blue-100 rounded-lg transition-colors z-10"
        >
          <Settings className="w-6 h-6 text-blue-600" />
        </button>
        
        <CardHeader className="text-center pb-2 pt-8 border-b border-gray-200 flex-shrink-0">
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-3xl flex items-center justify-center shadow-lg">
                <Users className="w-10 h-10 text-white" />
              </div>
            </div>
          </div>
          <CardTitle className="text-center text-gray-800 text-4xl font-bold mb-3">
            غرفة اللعب
          </CardTitle>
        </CardHeader>

        <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-4 mx-6 mt-6 rounded-xl border-2 border-blue-200 flex-shrink-0">
          <p className="text-center text-gray-700 text-sm mb-2">رقم الغرفة</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={multiplayer.roomId}
              className="flex-1 px-4 py-3 bg-white border-2 border-blue-300 rounded-lg text-gray-800 font-mono font-bold text-center focus:outline-none"
            />
            <Button
              onClick={() => {
                navigator.clipboard.writeText(multiplayer.roomId);
              }}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-4 py-3 rounded-lg shadow-md flex items-center gap-2 flex-shrink-0"
            >
              <Copy className="w-4 h-4" />
              نسخ
            </Button>
          </div>
        </div>
        
        <CardContent className="space-y-4 p-6 overflow-y-auto flex-1">
          {multiplayer.challengeStatus === "received" && (
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-5 rounded-2xl border-2 border-yellow-300 shadow-lg animate-pulse flex-shrink-0">
              <div className="flex items-center justify-center mb-3">
                <Zap className="w-8 h-8 text-yellow-600" />
              </div>
              <p className="text-yellow-800 text-center mb-4 font-semibold text-lg">
                {multiplayer.opponentName} طلب تحديك! هل تقبل؟
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={handleAcceptChallenge}
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  قبول
                </Button>
                <Button
                  onClick={handleRejectChallenge}
                  className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold py-4 rounded-xl shadow-lg flex items-center justify-center gap-2"
                >
                  <X className="w-5 h-5" />
                  رفض
                </Button>
              </div>
            </div>
          )}

          {multiplayer.challengeStatus === "none" && (
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-5 rounded-2xl border-2 border-gray-200">
              <h3 className="text-gray-800 font-bold text-lg flex items-center mb-4">
                <Users className="w-5 h-5 ml-2" />
                اللاعبون ({multiplayer.players.length})
              </h3>

              {multiplayer.playersGaming.length > 0 && (
                <div className="mb-4 space-y-2">
                  {multiplayer.playersGaming.map((game, idx) => (
                    <div key={idx} className="bg-gradient-to-r from-red-100 to-orange-100 p-3 rounded-lg border-2 border-red-300 flex items-center justify-center gap-3">
                      <span className="text-gray-800 font-bold text-sm">{game.player1Name}</span>
                      <span className="bg-red-500 text-white px-3 py-1 rounded-lg font-bold text-sm">VS</span>
                      <span className="text-gray-800 font-bold text-sm">{game.player2Name}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                {multiplayer.players.map((player) => {
                  const isInGame = multiplayer.playersGaming.some(
                    (game) => game.player1Id === player.id || game.player2Id === player.id
                  );
                  return (
                    <div
                      key={player.id}
                      className={`p-4 rounded-xl flex items-center justify-between transition-all duration-200 ${
                        player.id === multiplayer.playerId
                          ? "bg-gradient-to-r from-blue-100 to-purple-100 border-2 border-blue-300 shadow-md"
                          : isInGame
                          ? "bg-gradient-to-r from-red-100 to-orange-100 border-2 border-red-300"
                          : "bg-gray-50 border border-gray-300 hover:bg-gray-100"
                      }`}
                    >
                      <span className="text-gray-800 font-medium flex items-center">
                        {player.id === multiplayer.playerId ? (
                          <span className="w-5 h-5 ml-2 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">👤</span>
                        ) : isInGame ? (
                          <span className="w-5 h-5 ml-2 bg-red-600 text-white rounded-full flex items-center justify-center text-xs">🎮</span>
                        ) : (
                          <span className="w-5 h-5 ml-2 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs">👾</span>
                        )}
                        {player.name}
                        {player.id === multiplayer.playerId && (
                          <span className="mr-2 text-blue-700 text-sm bg-blue-200 px-2 py-0.5 rounded-lg">(أنت)</span>
                        )}
                        {isInGame && (
                          <span className="mr-2 text-orange-700 text-sm bg-orange-200 px-2 py-0.5 rounded-lg">في مباراة</span>
                        )}
                      </span>
                      {player.id !== multiplayer.playerId && !isInGame && (
                        <Button
                          onClick={() => handleChallengePlayer(player.id)}
                          disabled={selectedOpponent !== null}
                          size="sm"
                          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-4 py-2 rounded-lg shadow-md transform hover:scale-105 transition-all duration-200 flex items-center gap-1 flex-shrink-0"
                        >
                          <Zap className="w-4 h-4" />
                          تحدي
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {otherPlayers.length === 0 && (
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-5 rounded-2xl border-2 border-blue-300 flex-shrink-0">
              <div className="flex items-center justify-center mb-2">
                <Loader className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
              <p className="text-blue-800 text-center font-medium">
                في انتظار انضمام لاعبين آخرين...
              </p>
            </div>
          )}
        </CardContent>

        <div className="p-6 border-t border-gray-200 flex-shrink-0">
          <Button
            onClick={handleLeaveRoom}
            className="w-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-semibold py-6 rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2"
            size="lg"
          >
            <LogOut className="w-5 h-5" />
            مغادرة الغرفة
          </Button>
        </div>
      </Card>
    </div>
  );
}
