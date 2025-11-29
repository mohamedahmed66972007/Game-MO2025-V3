import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useNumberGame } from "@/lib/stores/useNumberGame";
import { send, clearSession, clearPersistentRoom, disconnect } from "@/lib/websocket";
import { Trophy, Medal, XCircle, RefreshCw, Home, Eye, Crown, LogOut, Clock, Target, X, Check, History, ChevronLeft, ChevronRight } from "lucide-react";
import Confetti from "react-confetti";

export function MultiplayerResults() {
  const navigate = useNavigate();
  const { multiplayer, setMode, resetMultiplayer, setShowResults, setGameStatus } = useNumberGame();
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(true);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [showHistory, setShowHistory] = useState(false);
  const [historyIndex, setHistoryIndex] = useState(0);

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
    console.log("Back to lobby clicked");
    send({ type: "request_rematch_state" });
    setShowResults(false);
    setGameStatus("waiting");
  };

  const handleBackToMenu = () => {
    send({ type: "leave_room" });
    clearSession();
    clearPersistentRoom();
    disconnect();
    resetMultiplayer();
    setMode("menu");
    navigate("/");
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

  const playerDetails = selectedPlayer 
    ? [...multiplayer.winners, ...multiplayer.losers, ...(multiplayer.stillPlaying || [])].find(p => p.playerId === selectedPlayer)
    : null;

  const getLiveDuration = (player: typeof multiplayer.winners[0]) => {
    if (multiplayer.stillPlaying.some(p => p.playerId === player.playerId)) {
      return currentTime - multiplayer.startTime;
    }
    return player.duration;
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 z-50 p-4 overflow-y-auto">
      {showConfetti && isWinner && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={500}
          onConfettiComplete={() => setShowConfetti(false)}
        />
      )}

      <div className="w-full max-w-2xl my-4">
        <div className="bg-slate-800/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-700 overflow-hidden">
          <div className={`p-6 text-center ${
            isWinner 
              ? 'bg-gradient-to-r from-emerald-600/30 to-green-600/30' 
              : isLoser 
              ? 'bg-gradient-to-r from-red-600/30 to-orange-600/30'
              : 'bg-gradient-to-r from-blue-600/30 to-purple-600/30'
          }`}>
            <div className="flex justify-center mb-4">
              {isWinner ? (
                <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center shadow-lg shadow-yellow-500/30 animate-pulse">
                  <Trophy className="w-12 h-12 text-white" />
                </div>
              ) : isLoser ? (
                <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-rose-600 rounded-full flex items-center justify-center shadow-lg">
                  <XCircle className="w-12 h-12 text-white" />
                </div>
              ) : (
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                  <Clock className="w-12 h-12 text-white animate-spin" style={{ animationDuration: '3s' }} />
                </div>
              )}
            </div>
            
            <h1 className={`text-3xl md:text-4xl font-bold mb-2 ${
              isWinner ? 'text-emerald-400' : isLoser ? 'text-red-400' : 'text-blue-400'
            }`}>
              {isWinner ? 'مبروك! فزت بالمباراة!' : isLoser ? 'للأسف خسرت هذه المرة' : 'المباراة جارية...'}
            </h1>

            {myResult && (
              <div className="flex flex-wrap justify-center gap-3 mt-4">
                <div className="bg-slate-800/60 px-4 py-2 rounded-xl flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-400" />
                  <span className="text-white font-bold">{myResult.attempts} محاولات</span>
                </div>
                <div className="bg-slate-800/60 px-4 py-2 rounded-xl flex items-center gap-2">
                  <Clock className="w-5 h-5 text-purple-400" />
                  <span className="text-white font-bold">{formatDuration(myResult.duration)}</span>
                </div>
                {myResult.rank && (
                  <div className="bg-slate-800/60 px-4 py-2 rounded-xl flex items-center gap-2">
                    <Medal className="w-5 h-5 text-yellow-400" />
                    <span className="text-white font-bold">#{myResult.rank}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-6 border-b border-slate-700/50 bg-gradient-to-b from-slate-800/60 to-slate-900/60">
            <p className="text-center text-gray-400 text-sm mb-4">الرقم السري كان:</p>
            <div className="flex justify-center gap-3" dir="ltr">
              {multiplayer.sharedSecret.map((digit, idx) => (
                <div
                  key={idx}
                  className="relative group"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl blur-md opacity-50 group-hover:opacity-70 transition-opacity"></div>
                  <div className="relative w-14 h-16 md:w-16 md:h-20 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-2xl md:text-3xl font-bold text-white shadow-xl transform group-hover:scale-105 transition-transform">
                    {digit}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {multiplayer.winners.length > 0 && (
            <div className="p-4 border-b border-slate-700/50">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <h3 className="text-lg font-bold text-yellow-400">الفائزون</h3>
                <span className="text-slate-400 text-sm">({multiplayer.winners.length})</span>
              </div>
              <div className="space-y-2">
                {multiplayer.winners.map((winner) => (
                  <div
                    key={winner.playerId}
                    className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                      winner.playerId === multiplayer.playerId 
                        ? 'bg-emerald-600/20 border border-emerald-500/50' 
                        : 'bg-slate-700/30 hover:bg-slate-700/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-lg ${
                        winner.rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-black' :
                        winner.rank === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-black' :
                        'bg-gradient-to-br from-orange-400 to-orange-500 text-white'
                      }`}>
                        #{winner.rank || 1}
                      </div>
                      <div>
                        <p className="text-white font-semibold flex items-center gap-2">
                          {winner.playerName}
                          {winner.playerId === multiplayer.playerId && (
                            <span className="text-xs bg-blue-500/30 text-blue-300 px-2 py-0.5 rounded">أنت</span>
                          )}
                          {winner.playerId === multiplayer.hostId && (
                            <Crown className="w-4 h-4 text-yellow-400" />
                          )}
                        </p>
                        <p className="text-gray-400 text-sm">
                          {winner.attempts} محاولات • {formatDuration(winner.duration)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedPlayer(winner.playerId)}
                      className="p-2.5 bg-slate-600/50 hover:bg-purple-600 rounded-xl transition-all hover:scale-105"
                    >
                      <Eye className="w-5 h-5 text-gray-300" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {multiplayer.losers.length > 0 && (
            <div className="p-4 border-b border-slate-700/50">
              <div className="flex items-center gap-2 mb-3">
                <XCircle className="w-5 h-5 text-red-500" />
                <h3 className="text-lg font-bold text-red-400">الخاسرون</h3>
                <span className="text-slate-400 text-sm">({multiplayer.losers.length})</span>
              </div>
              <div className="space-y-2">
                {multiplayer.losers.map((loser) => (
                  <div
                    key={loser.playerId}
                    className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                      loser.playerId === multiplayer.playerId 
                        ? 'bg-red-600/20 border border-red-500/50' 
                        : 'bg-slate-700/30 hover:bg-slate-700/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-600/30 flex items-center justify-center">
                        <XCircle className="w-5 h-5 text-red-400" />
                      </div>
                      <div>
                        <p className="text-white font-semibold flex items-center gap-2">
                          {loser.playerName}
                          {loser.playerId === multiplayer.playerId && (
                            <span className="text-xs bg-blue-500/30 text-blue-300 px-2 py-0.5 rounded">أنت</span>
                          )}
                          {loser.playerId === multiplayer.hostId && (
                            <Crown className="w-4 h-4 text-yellow-400" />
                          )}
                        </p>
                        <p className="text-gray-400 text-sm">
                          {loser.attempts} محاولات • {formatDuration(loser.duration)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedPlayer(loser.playerId)}
                      className="p-2.5 bg-slate-600/50 hover:bg-purple-600 rounded-xl transition-all hover:scale-105"
                    >
                      <Eye className="w-5 h-5 text-gray-300" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {multiplayer.stillPlaying.length > 0 && (
            <div className="p-4 border-b border-slate-700/50">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">🎮</span>
                <h3 className="text-lg font-bold text-blue-400">لا يزالون يلعبون</h3>
                <span className="text-slate-400 text-sm">({multiplayer.stillPlaying.length})</span>
              </div>
              <div className="space-y-2">
                {multiplayer.stillPlaying.map((player) => (
                  <div
                    key={player.playerId}
                    className="flex items-center justify-between p-3 rounded-xl bg-blue-600/10 border border-blue-500/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-600/30 flex items-center justify-center animate-pulse">
                        <span className="text-xl">⏳</span>
                      </div>
                      <div>
                        <p className="text-white font-semibold flex items-center gap-2">
                          {player.playerName}
                          {player.playerId === multiplayer.playerId && (
                            <span className="text-xs bg-blue-500/30 text-blue-300 px-2 py-0.5 rounded">أنت</span>
                          )}
                          {player.playerId === multiplayer.hostId && (
                            <Crown className="w-4 h-4 text-yellow-400" />
                          )}
                        </p>
                        <p className="text-gray-400 text-sm">
                          {player.attempts} محاولات • {formatDuration(getLiveDuration(player))}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedPlayer(player.playerId)}
                      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 rounded-xl transition-all flex items-center gap-2 shadow-lg hover:scale-105"
                    >
                      <Eye className="w-4 h-4 text-white" />
                      <span className="text-white text-sm font-medium">مشاهدة</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {hasNoWinners && !isWinner && multiplayer.stillPlaying.length === 0 && (
            <div className="p-6 text-center">
              <p className="text-xl text-gray-300">لم يفز أحد في هذه الجولة</p>
            </div>
          )}

          <div className="p-5 space-y-3 bg-slate-900/50">
            {(isWinner || isLoser) && !multiplayer.rematchState.requested && multiplayer.stillPlaying.length === 0 && (
              <button
                onClick={handleRequestRematch}
                className="w-full bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 hover:from-emerald-600 hover:via-green-600 hover:to-teal-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-green-500/25 flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <RefreshCw className="w-6 h-6" />
                <span className="text-lg">طلب إعادة المباراة</span>
              </button>
            )}

            {multiplayer.roundHistory.length > 0 && (
              <button
                onClick={() => {
                  setHistoryIndex(multiplayer.roundHistory.length - 1);
                  setShowHistory(true);
                }}
                className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:via-orange-600 hover:to-amber-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-orange-500/25 flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <History className="w-6 h-6" />
                <span className="text-lg">سجل الجولات ({multiplayer.roundHistory.length})</span>
              </button>
            )}

            {multiplayer.roomId && multiplayer.stillPlaying.length === 0 && (
              <button
                onClick={handleBackToLobby}
                className="w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-purple-500/25 flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <Home className="w-6 h-6" />
                <span className="text-lg">العودة إلى الغرفة</span>
              </button>
            )}

            <button
              onClick={handleBackToMenu}
              className="w-full bg-slate-700/80 hover:bg-slate-600 text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] active:scale-[0.98] border border-slate-600"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-lg">الخروج من الغرفة</span>
            </button>
          </div>
        </div>
      </div>

      {multiplayer.rematchState.requested && multiplayer.rematchState.countdown !== null && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-[60] p-4">
          <div className="w-full max-w-lg bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 p-6 text-center space-y-5">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto">
              <RefreshCw className="w-8 h-8 text-white" />
            </div>
            
            <h2 className="text-2xl font-bold text-white">هل تريد إعادة المباراة؟</h2>
            <p className="text-gray-400">
              متبقي <span className="font-bold text-blue-400">{multiplayer.rematchState.countdown}s</span>
            </p>

            {!multiplayer.rematchState.votes.some(v => v.playerId === multiplayer.playerId) && (
              <div className="flex gap-3">
                <button
                  onClick={() => send({ type: "rematch_vote", accepted: true })}
                  className="flex-1 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 rounded-xl transition-all"
                >
                  ✓ موافق
                </button>
                <button
                  onClick={() => send({ type: "rematch_vote", accepted: false })}
                  className="flex-1 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold py-3 rounded-xl transition-all"
                >
                  ✗ رافض
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {multiplayer.players.map(player => {
                const vote = multiplayer.rematchState.votes.find(v => v.playerId === player.id);
                return (
                  <div
                    key={player.id}
                    className={`p-3 rounded-xl border-2 ${
                      vote?.accepted
                        ? 'bg-green-600/20 border-green-500'
                        : vote?.accepted === false
                        ? 'bg-red-600/20 border-red-500'
                        : 'bg-slate-700/50 border-slate-600'
                    }`}
                  >
                    <p className="text-white font-semibold text-sm flex items-center justify-center gap-2">
                      {player.name}
                      {player.id === multiplayer.playerId && (
                        <span className="text-xs text-blue-300">(أنت)</span>
                      )}
                    </p>
                    <p className={`text-xs mt-1 ${
                      vote?.accepted ? 'text-green-400' : vote?.accepted === false ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      {vote?.accepted ? '✓ موافق' : vote?.accepted === false ? '✗ رافض' : '⏳ في الانتظار'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {playerDetails && (
        <div 
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4"
          onClick={() => setSelectedPlayer(null)}
        >
          <div 
            className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 max-w-md w-full p-6 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {playerDetails.playerName}
                {playerDetails.playerId === multiplayer.hostId && (
                  <Crown className="w-5 h-5 text-yellow-400" />
                )}
              </h2>
              <button 
                onClick={() => setSelectedPlayer(null)}
                className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div className={`p-4 rounded-xl ${
                multiplayer.stillPlaying.some(p => p.playerId === playerDetails.playerId)
                  ? 'bg-blue-600/20 border border-blue-500/50'
                  : playerDetails.rank 
                  ? 'bg-emerald-600/20 border border-emerald-500/50'
                  : 'bg-red-600/20 border border-red-500/50'
              }`}>
                <p className="text-gray-400 text-sm mb-1">النتيجة</p>
                <p className="text-xl font-bold text-white flex items-center gap-2">
                  {multiplayer.stillPlaying.some(p => p.playerId === playerDetails.playerId) 
                    ? (
                      <>
                        <Clock className="w-5 h-5 text-blue-400 animate-pulse" />
                        لا يزال يلعب...
                      </>
                    )
                    : playerDetails.rank ? (
                      <>
                        <Trophy className="w-5 h-5 text-yellow-400" />
                        #{playerDetails.rank} - فائز
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 text-red-400" />
                        خاسر
                      </>
                    )}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-700/50 p-4 rounded-xl">
                  <p className="text-gray-400 text-sm mb-1">المحاولات</p>
                  <p className="text-2xl font-bold text-blue-400">{playerDetails.attempts}</p>
                </div>
                <div className="bg-slate-700/50 p-4 rounded-xl">
                  <p className="text-gray-400 text-sm mb-1">الوقت</p>
                  <p className="text-2xl font-bold text-purple-400">{formatDuration(getLiveDuration(playerDetails))}</p>
                </div>
              </div>

              <div>
                <p className="text-gray-400 text-sm mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  سجل المحاولات:
                </p>
                {playerDetails.attemptsDetails && playerDetails.attemptsDetails.length > 0 ? (
                  <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                    {playerDetails.attemptsDetails.map((attempt: any, idx: number) => (
                      <div key={idx} className="bg-slate-700/30 p-3 rounded-xl flex items-center justify-between" dir="ltr">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 text-sm w-6">#{idx + 1}</span>
                          <div className="flex gap-1">
                            {attempt.guess.map((digit: number, i: number) => (
                              <span key={i} className="w-9 h-9 bg-slate-600 rounded-lg flex items-center justify-center text-white font-bold">
                                {digit}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2 items-center">
                          <div className="flex items-center gap-1 bg-green-600/20 px-2 py-1 rounded-lg">
                            <Check className="w-3.5 h-3.5 text-green-400" />
                            <span className="text-green-400 font-bold text-sm">{attempt.correctPositionCount}</span>
                          </div>
                          <div className="flex items-center gap-1 bg-blue-600/20 px-2 py-1 rounded-lg">
                            <span className="text-blue-400 font-bold text-sm">{attempt.correctCount}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-700/30 p-6 rounded-xl text-center">
                    <p className="text-gray-500">لا توجد محاولات مسجلة</p>
                    <p className="text-gray-600 text-sm mt-1">قد تكون البيانات غير متوفرة</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showHistory && multiplayer.roundHistory.length > 0 && (
        <div 
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4"
          onClick={() => setShowHistory(false)}
        >
          <div 
            className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 max-w-lg w-full p-6 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-amber-400" />
                سجل الجولات
              </h2>
              <button 
                onClick={() => setShowHistory(false)}
                className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setHistoryIndex(Math.max(0, historyIndex - 1))}
                disabled={historyIndex === 0}
                className="p-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-white" />
              </button>
              <span className="text-white font-bold">
                جولة {multiplayer.roundHistory[historyIndex]?.roundNumber} من {multiplayer.roundHistory.length}
              </span>
              <button
                onClick={() => setHistoryIndex(Math.min(multiplayer.roundHistory.length - 1, historyIndex + 1))}
                disabled={historyIndex === multiplayer.roundHistory.length - 1}
                className="p-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
            </div>

            {multiplayer.roundHistory[historyIndex] && (
              <div className="space-y-4">
                <div className="bg-slate-700/50 p-4 rounded-xl">
                  <p className="text-gray-400 text-sm mb-2 text-center">الرقم السري</p>
                  <div className="flex justify-center gap-2" dir="ltr">
                    {multiplayer.roundHistory[historyIndex].sharedSecret.map((digit, idx) => (
                      <div
                        key={idx}
                        className="w-12 h-14 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-xl font-bold text-white shadow-lg"
                      >
                        {digit}
                      </div>
                    ))}
                  </div>
                </div>

                {multiplayer.roundHistory[historyIndex].winners.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-yellow-500" />
                      <span className="text-yellow-400 font-bold text-sm">الفائزون</span>
                    </div>
                    {multiplayer.roundHistory[historyIndex].winners.map((winner) => (
                      <div key={winner.playerId} className="bg-emerald-600/20 border border-emerald-500/50 p-3 rounded-xl">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                              winner.rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-black' :
                              winner.rank === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-black' :
                              'bg-gradient-to-br from-orange-400 to-orange-500 text-white'
                            }`}>
                              #{winner.rank || 1}
                            </div>
                            <span className="text-white font-semibold">{winner.playerName}</span>
                          </div>
                          <span className="text-emerald-400 text-sm">{winner.attempts} محاولات</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {multiplayer.roundHistory[historyIndex].losers.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-500" />
                      <span className="text-red-400 font-bold text-sm">الخاسرون</span>
                    </div>
                    {multiplayer.roundHistory[historyIndex].losers.map((loser) => (
                      <div key={loser.playerId} className="bg-red-600/20 border border-red-500/50 p-3 rounded-xl">
                        <div className="flex items-center justify-between">
                          <span className="text-white font-semibold">{loser.playerName}</span>
                          <span className="text-red-400 text-sm">{loser.attempts} محاولات</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="text-center text-gray-500 text-xs mt-4">
                  {new Date(multiplayer.roundHistory[historyIndex].timestamp).toLocaleString('ar-EG')}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
