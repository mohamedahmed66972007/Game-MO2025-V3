import { useState, useEffect } from "react";
import { useNumberGame } from "@/lib/stores/useNumberGame";
import { useChallenges } from "@/lib/stores/useChallenges";
import { send, clearSession, clearPersistentRoom, disconnect } from "@/lib/websocket";
import { Trophy, Medal, XCircle, RefreshCw, Home, Eye, Crown, LogOut } from "lucide-react";
import { Button } from "./button";
import Confetti from "react-confetti";

export function MultiplayerResults() {
  const { multiplayer, setMode, resetMultiplayer, setShowResults, setGameStatus } = useNumberGame();
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(true);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update time every 100ms for live duration display
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const isWinner = multiplayer.winners.some(w => w.playerId === multiplayer.playerId);
  const isLoser = multiplayer.losers.some(l => l.playerId === multiplayer.playerId);
  const myResult = [...multiplayer.winners, ...multiplayer.losers].find(r => r.playerId === multiplayer.playerId);
  const hasNoWinners = multiplayer.winners.length === 0;

  const handleRequestRematch = () => {
    send({ type: "request_rematch" });
  };

  const handleBackToLobby = () => {
    // Return to lobby without leaving the room
    console.log("🔙 Back to lobby clicked - showResults:", multiplayer.showResults, "gameStatus:", multiplayer.gameStatus);
    
    // Request current rematch state when returning to lobby
    send({ type: "request_rematch_state" });
    
    setShowResults(false);
    setGameStatus("waiting");
    console.log("✅ State updated - showResults: false, gameStatus: waiting");
  };

  const handleBackToMenu = () => {
    send({ type: "leave_room" });
    clearSession();
    clearPersistentRoom();
    disconnect();
    resetMultiplayer();
    setMode("menu");
    setTimeout(() => {
      window.location.reload();
    }, 300);
  };

  const handleLeaveRoom = () => {
    handleBackToMenu();
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-6 h-6 text-yellow-500 fill-yellow-500" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-400 fill-gray-400" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-orange-500 fill-orange-500" />;
    return <span className="text-lg font-bold text-gray-600">#{rank}</span>;
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

  // Get player details (including those still playing)
  const playerDetails = selectedPlayer 
    ? [...multiplayer.winners, ...multiplayer.losers, ...(multiplayer.stillPlaying || [])].find(p => p.playerId === selectedPlayer)
    : null;

  // Calculate live duration for players still playing
  const getLiveDuration = (player: typeof multiplayer.winners[0]) => {
    if (multiplayer.stillPlaying.some(p => p.playerId === player.playerId)) {
      // Player is still playing - calculate live duration
      return currentTime - multiplayer.startTime;
    }
    // Player finished - use recorded duration
    return player.duration;
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 z-50 p-4 overflow-y-auto">
      {showConfetti && isWinner && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={500}
          onConfettiComplete={() => setShowConfetti(false)}
        />
      )}

      <div className="w-full max-w-4xl bg-white rounded-2xl md:rounded-3xl shadow-2xl border-2 border-gray-200 my-4 md:my-8">
        {/* Header */}
        <div className={`p-6 md:p-8 text-center border-b-2 ${isWinner ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300' : isLoser ? 'bg-gradient-to-br from-orange-50 to-red-50 border-orange-300' : 'bg-gradient-to-br from-blue-50 to-purple-50 border-blue-300'}`}>
          <div className="flex justify-center mb-4">
            {isWinner ? (
              <div className="w-16 md:w-20 h-16 md:h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                <Trophy className="w-8 md:w-10 h-8 md:h-10 text-white fill-white" />
              </div>
            ) : (
              <div className="w-16 md:w-20 h-16 md:h-20 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                <XCircle className="w-8 md:w-10 h-8 md:h-10 text-white" />
              </div>
            )}
          </div>
          <h1 className={`text-2xl md:text-4xl font-bold mb-2 ${isWinner ? 'text-green-800' : isLoser ? 'text-red-800' : 'text-blue-800'}`}>
            {isWinner ? '🎉 مبروك! لقد فزت!' : isLoser ? '😢 للأسف، لقد خسرت' : '⏳ المباراة جارية...'}
          </h1>
          {myResult && (
            <div className="flex flex-wrap justify-center gap-3 md:gap-6 mt-4">
              <div className="bg-white bg-opacity-70 px-3 md:px-4 py-2 rounded-lg">
                <p className="text-xs md:text-sm text-gray-600">محاولاتك</p>
                <p className="text-xl md:text-2xl font-bold text-blue-600">{myResult.attempts}</p>
              </div>
              <div className="bg-white bg-opacity-70 px-3 md:px-4 py-2 rounded-lg">
                <p className="text-xs md:text-sm text-gray-600">الوقت</p>
                <p className="text-xl md:text-2xl font-bold text-purple-600">{formatDuration(myResult.duration)}</p>
              </div>
              {myResult.rank && (
                <div className="bg-white bg-opacity-70 px-3 md:px-4 py-2 rounded-lg">
                  <p className="text-xs md:text-sm text-gray-600">الترتيب</p>
                  <p className="text-xl md:text-2xl font-bold text-yellow-600">#{myResult.rank}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Secret Code */}
        <div className="p-4 md:p-6 border-b border-gray-200 bg-gradient-to-br from-purple-50 to-pink-50" dir="ltr">
          <h3 className="text-center text-sm md:text-base text-gray-700 font-semibold mb-3">🔐 الرقم السري هو:</h3>
          <div className="flex justify-center gap-2">
            {multiplayer.sharedSecret.map((digit, idx) => (
              <div
                key={idx}
                className="w-10 md:w-14 h-12 md:h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg md:rounded-xl flex items-center justify-center text-lg md:text-2xl font-bold text-white shadow-lg"
              >
                {digit}
              </div>
            ))}
          </div>
        </div>

        {/* No Winners Yet Message */}
        {hasNoWinners && !isWinner && (
          <div className="p-6 border-b border-gray-200 bg-gradient-to-br from-blue-50 to-purple-50">
            <h3 className="text-center text-xl font-bold text-blue-700">
              🔄 لم يفوز أحد بعد
            </h3>
            <p className="text-center text-gray-600 mt-2">اللاعبون يلعبون الآن...</p>
          </div>
        )}

        {/* Winners List */}
        {multiplayer.winners.length > 0 && (
          <div className="p-4 md:p-6 border-b border-gray-200 bg-gradient-to-br from-green-50 via-white to-emerald-50">
            <h3 className="text-lg md:text-xl font-bold text-green-700 mb-4 flex items-center">
              <Trophy className="w-5 md:w-6 h-5 md:h-6 ml-2 text-yellow-500 fill-yellow-500" />
              الفائزون ({multiplayer.winners.length})
            </h3>
            <div className="space-y-3">
              {multiplayer.winners.map((winner) => (
                <div
                  key={winner.playerId}
                  className="bg-white border-2 border-green-200 hover:border-green-400 hover:shadow-md transition-all rounded-xl p-3 md:p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-lg font-bold text-lg">
                      #{winner.rank || 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-800 text-sm md:text-base flex items-center gap-2">
                        {winner.playerName}
                        {winner.playerId === multiplayer.playerId && (
                          <span className="text-xs bg-blue-200 text-blue-700 px-2 py-0.5 rounded-lg">(أنت)</span>
                        )}
                        {winner.playerId === multiplayer.hostId && (
                          <Crown className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        )}
                      </p>
                      <p className="text-xs md:text-sm text-gray-500">
                        {winner.attempts} محاولات • {formatDuration(winner.duration)}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setSelectedPlayer(winner.playerId)}
                    className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center gap-1 text-xs md:text-sm"
                  >
                    <Eye className="w-3 md:w-4 h-3 md:h-4" />
                    تفاصيل
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Losers List */}
        {multiplayer.losers.length > 0 && (
          <div className="p-4 md:p-6 border-b border-gray-200 bg-gradient-to-br from-red-50 via-white to-orange-50">
            <h3 className="text-lg md:text-xl font-bold text-red-700 mb-4 flex items-center">
              <XCircle className="w-5 md:w-6 h-5 md:h-6 ml-2" />
              الخاسرون ({multiplayer.losers.length})
            </h3>
            <div className="space-y-3">
              {multiplayer.losers.map((loser) => (
                <div
                  key={loser.playerId}
                  className="bg-white border-2 border-red-200 hover:border-red-400 hover:shadow-md transition-all rounded-xl p-3 md:p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-red-100 to-red-200 rounded-lg">
                      <XCircle className="w-6 h-6 text-red-500" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-800 text-sm md:text-base flex items-center gap-2">
                        {loser.playerName}
                        {loser.playerId === multiplayer.playerId && (
                          <span className="text-xs bg-blue-200 text-blue-700 px-2 py-0.5 rounded-lg">(أنت)</span>
                        )}
                        {loser.playerId === multiplayer.hostId && (
                          <Crown className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        )}
                      </p>
                      <p className="text-xs md:text-sm text-gray-500">
                        {loser.attempts} محاولات • {formatDuration(loser.duration)}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setSelectedPlayer(loser.playerId)}
                    className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center gap-1 text-xs md:text-sm"
                  >
                    <Eye className="w-3 md:w-4 h-3 md:h-4" />
                    تفاصيل
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Still Playing List */}
        {multiplayer.stillPlaying.length > 0 && (
          <div className="p-4 md:p-6 border-b border-gray-200 bg-gradient-to-br from-blue-50 via-white to-cyan-50">
            <h3 className="text-lg md:text-xl font-bold text-blue-700 mb-4 flex items-center">
              <span className="text-2xl ml-2">🎮</span>
              اللاعبون المتبقيون ({multiplayer.stillPlaying.length})
            </h3>
            <div className="space-y-3">
              {multiplayer.stillPlaying.map((player) => (
                <div
                  key={player.playerId}
                  className="bg-white border-2 border-blue-300 hover:border-blue-500 hover:shadow-md transition-all rounded-xl p-3 md:p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-2xl animate-pulse">⏳</span>
                    <div className="flex-1">
                      <p className="font-bold text-gray-800 text-sm md:text-base flex items-center gap-2">
                        {player.playerName}
                        {player.playerId === multiplayer.playerId && (
                          <span className="text-xs bg-blue-200 text-blue-700 px-2 py-0.5 rounded-lg">(أنت)</span>
                        )}
                        {player.playerId === multiplayer.hostId && (
                          <Crown className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        )}
                      </p>
                      <p className="text-xs md:text-sm text-gray-600">
                        {player.attempts} محاولات • {formatDuration(getLiveDuration(player))}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setSelectedPlayer(player.playerId)}
                    className="bg-purple-500 hover:bg-purple-600 text-white rounded-lg flex items-center gap-1 text-xs md:text-sm ml-3"
                  >
                    <Eye className="w-3 md:w-4 h-3 md:h-4" />
                    مشاهدة 👀
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="p-4 md:p-6 space-y-3">
          {(isWinner || isLoser) && !multiplayer.rematchState.requested && multiplayer.stillPlaying.length === 0 && (
            <Button
              onClick={handleRequestRematch}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-3 md:py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 text-sm md:text-base"
            >
              <RefreshCw className="w-4 md:w-5 h-4 md:h-5" />
              طلب إعادة مباراة
            </Button>
          )}

          {multiplayer.roomId && multiplayer.stillPlaying.length === 0 && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log("🔙 Button clicked (onClick)");
                handleBackToLobby();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log("🔙 Button clicked (onTouchEnd)");
                handleBackToLobby();
              }}
              onPointerDown={(e) => {
                if (e.pointerType === "touch") {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log("🔙 Button clicked (onPointerDown - touch)");
                  handleBackToLobby();
                }
              }}
              type="button"
              style={{ userSelect: "none", WebkitUserSelect: "none" }}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 active:from-purple-800 active:to-purple-900 text-white font-bold py-3 md:py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 text-sm md:text-base transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 md:w-5 h-4 md:h-5" />
              العودة إلى الغرفة
            </button>
          )}

          <Button
            onClick={handleLeaveRoom}
            className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-3 md:py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 text-sm md:text-base"
          >
            <LogOut className="w-4 md:w-5 h-4 md:h-5" />
            الخروج من الغرفة
          </Button>
        </div>
      </div>

      {/* Rematch Dialog */}
      {multiplayer.rematchState.requested && multiplayer.rematchState.countdown !== null && (
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

            {/* Voting Buttons */}
            {!multiplayer.rematchState.votes.some(v => v.playerId === multiplayer.playerId) && (
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
                        ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-400'
                        : vote?.accepted === false
                        ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-400'
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
      )}

      {/* Player Details Modal */}
      {playerDetails && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedPlayer(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-800">{playerDetails.playerName}</h2>
              <button 
                onClick={() => setSelectedPlayer(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-xl">
                <p className="text-sm text-gray-600 mb-1">النتيجة</p>
                <p className="text-xl font-bold text-blue-600">
                  {multiplayer.stillPlaying.some(p => p.playerId === playerDetails.playerId) 
                    ? '--' 
                    : playerDetails.rank ? `#${playerDetails.rank} - فائز` : 'خاسر'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-purple-50 p-4 rounded-xl">
                  <p className="text-sm text-gray-600 mb-1">المحاولات</p>
                  <p className="text-2xl font-bold text-purple-600">{playerDetails.attempts}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-xl">
                  <p className="text-sm text-gray-600 mb-1">الوقت</p>
                  <p className="text-2xl font-bold text-green-600">{formatDuration(getLiveDuration(playerDetails))}</p>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl" dir="rtl">
                <h3 className="font-bold text-gray-800 mb-3">سجل المحاولات</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {playerDetails.attemptsDetails && playerDetails.attemptsDetails.length > 0 ? (
                    playerDetails.attemptsDetails.map((attempt, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-gray-700">المحاولة {idx + 1}</span>
                          {attempt.correctPositionCount === multiplayer.settings.numDigits && (
                            <span className="text-green-600 font-bold">✓ فوز</span>
                          )}
                        </div>
                        <div className="flex gap-2 mb-2" dir="ltr">
                          {attempt.guess.map((digit, digitIdx) => (
                            <div
                              key={digitIdx}
                              className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-sm font-bold text-blue-700"
                            >
                              {digit}
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-4 text-xs text-gray-600">
                          <span>✓ صحيح: {attempt.correctCount}</span>
                          <span>📍 موقع صحيح: {attempt.correctPositionCount}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-sm">لا توجد محاولات بعد</p>
                      <p className="text-xs mt-1">اللاعب لسا بيلعب 🎮</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
