import { useState } from "react";
import { Button } from "./button";
import { useNumberGame } from "@/lib/stores/useNumberGame";
import { send, clearSession, clearPersistentRoom, disconnect, kickPlayer, transferHost } from "@/lib/websocket";
import { Users, Copy, LogOut, Settings, Crown, Play, Link, Check, UserPlus, CheckCircle2, Circle, Bell, AlertTriangle, X, UserX, ArrowRightLeft, MoreVertical } from "lucide-react";
import { GameSettings } from "./GameSettings";
import { toast } from "sonner";
import { FriendsDialog } from "./FriendsDialog";
import { useAccount } from "@/lib/stores/useAccount";

export function MultiplayerLobby() {
  const { multiplayer, setMode, resetMultiplayer } = useNumberGame();
  const { account } = useAccount();
  const [showSettings, setShowSettings] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [showNoPlayersDialog, setShowNoPlayersDialog] = useState(false);
  const [playerMenuId, setPlayerMenuId] = useState<string | null>(null);
  const [showKickConfirm, setShowKickConfirm] = useState<string | null>(null);
  const [showTransferConfirm, setShowTransferConfirm] = useState<string | null>(null);

  const roomLink = `${window.location.origin}/room/${multiplayer.roomId}`;
  
  const otherPlayers = multiplayer.players.filter(p => p.id !== multiplayer.hostId);
  const readyOtherPlayers = otherPlayers.filter(p => multiplayer.readyPlayers.includes(p.id));
  const notReadyOtherPlayers = otherPlayers.filter(p => !multiplayer.readyPlayers.includes(p.id));
  const hasReadyPlayers = readyOtherPlayers.length > 0;
  const allOthersReady = notReadyOtherPlayers.length === 0 && otherPlayers.length > 0;
  
  const readyCount = readyOtherPlayers.length + 1;
  const isPlayerReady = multiplayer.readyPlayers.includes(multiplayer.playerId);
  const canStartGame = multiplayer.isHost && multiplayer.players.length >= 2;

  const handleLeaveRoom = () => {
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

  const handleStartGame = () => {
    if (!canStartGame) return;
    
    if (!hasReadyPlayers) {
      setShowNoPlayersDialog(true);
      return;
    }
    
    if (!allOthersReady) {
      setShowStartDialog(true);
      return;
    }
    
    send({ type: "start_game" });
  };

  const handleStartAnyway = () => {
    setShowStartDialog(false);
    send({ type: "start_game", forceStart: true });
  };

  const handleNotifyPlayers = () => {
    setShowStartDialog(false);
    setShowNoPlayersDialog(false);
    send({ type: "notify_ready" });
  };

  const handleToggleReady = () => {
    send({ type: "toggle_ready", isReady: !isPlayerReady });
  };

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(multiplayer.roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(roomLink);
    setLinkCopied(true);
    toast.success("تم نسخ الرابط! شاركه مع أصدقائك 🎮");
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleKickPlayer = (playerId: string) => {
    const player = multiplayer.players.find(p => p.id === playerId);
    kickPlayer(playerId);
    toast.success(`تم طرد اللاعب ${player?.name || ""}`, { duration: 3000 });
    setShowKickConfirm(null);
    setPlayerMenuId(null);
  };

  const handleTransferHost = (playerId: string) => {
    const player = multiplayer.players.find(p => p.id === playerId);
    transferHost(playerId);
    toast.success(`تم نقل القيادة إلى ${player?.name || ""}`, { duration: 3000 });
    setShowTransferConfirm(null);
    setPlayerMenuId(null);
  };

  // Render GameSettings if showSettings is true
  // Note: GameSettings handles sending update_settings with full cardSettings
  if (showSettings && multiplayer.isHost) {
    return (
      <GameSettings
        onConfirm={() => {
          setShowSettings(false);
        }}
        isMultiplayer={true}
      />
    );
  }

  // Main lobby view
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 z-50 p-4">
      <div className="w-full max-w-4xl bg-white border-2 border-gray-200 shadow-2xl rounded-3xl max-h-[90vh] flex flex-col">
        {/* Compact Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          {/* Right side - Logo and Title */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-md">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">غرفة اللعب الجماعي</h1>
              <p className="text-xs text-gray-600">اللاعبون: {multiplayer.players.length}/10</p>
            </div>
          </div>

          {/* Left side - Room ID and Settings */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-gradient-to-br from-blue-50 to-purple-50 px-3 py-2 rounded-lg border border-blue-200">
              <input
                type="text"
                readOnly
                value={multiplayer.roomId}
                className="w-24 bg-transparent text-gray-800 font-mono font-bold text-sm text-center focus:outline-none"
              />
              <Button
                onClick={handleCopyRoomId}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded-md flex items-center gap-1 h-7"
              >
                <Copy className="w-3 h-3" />
                {copied ? '✓' : 'نسخ'}
              </Button>
            </div>
            {multiplayer.isHost && (
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                title="الإعدادات"
              >
                <Settings className="w-5 h-5 text-blue-600" />
              </button>
            )}
          </div>
        </div>

        {/* Room Link */}
        <div className="px-4 py-3 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200 flex-shrink-0">
          <div className="flex items-center justify-center gap-2">
            <Link className="w-4 h-4 text-green-600" />
            <span className="text-green-700 font-medium text-sm">رابط الغرفة:</span>
          </div>
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className="flex-1 max-w-md bg-white border border-green-300 rounded-lg px-3 py-2 text-sm text-gray-600 font-mono truncate" dir="ltr">
              {roomLink}
            </div>
            <Button
              onClick={handleCopyLink}
              size="sm"
              className={`${
                linkCopied 
                  ? "bg-green-600 hover:bg-green-700" 
                  : "bg-emerald-600 hover:bg-emerald-700"
              } text-white px-3 py-2 rounded-lg flex items-center gap-2 transition-all`}
            >
              {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {linkCopied ? 'تم النسخ!' : 'نسخ الرابط'}
            </Button>
            {account && (
              <Button
                onClick={() => setShowFriends(true)}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 transition-all"
              >
                <UserPlus className="w-4 h-4" />
                دعوة صديق
              </Button>
            )}
          </div>
        </div>

        {/* Settings Info */}
        <div className="px-4 py-2 bg-gradient-to-r from-amber-50 to-yellow-50 border-b border-amber-200 flex items-center justify-center gap-4 flex-wrap flex-shrink-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600">عدد الأرقام:</span>
            <span className="bg-white px-2 py-0.5 rounded font-bold text-blue-600 border border-blue-300">
              {multiplayer.settings.numDigits}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600">المحاولات:</span>
            <span className="bg-white px-2 py-0.5 rounded font-bold text-blue-600 border border-blue-300">
              {multiplayer.settings.maxAttempts}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600">البطاقات:</span>
            <span className={`px-2 py-0.5 rounded font-bold border ${
              multiplayer.settings.cardsEnabled 
                ? "bg-green-100 text-green-700 border-green-300" 
                : "bg-gray-100 text-gray-600 border-gray-300"
            }`}>
              {multiplayer.settings.cardsEnabled ? "مفعّلة ✨" : "معطّلة"}
            </span>
          </div>
        </div>
        
        {/* Players List - Main content area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-4 rounded-2xl border-2 border-gray-200 h-full">
            <h3 className="text-gray-800 font-bold text-base flex items-center mb-3">
              <Users className="w-4 h-4 ml-2" />
              قائمة اللاعبين ({multiplayer.players.length})
            </h3>

            <div className="space-y-2">
              {multiplayer.players.map((player) => {
                const isHost = player.id === multiplayer.hostId;
                const isYou = player.id === multiplayer.playerId;
                const isReady = isHost || multiplayer.readyPlayers.includes(player.id);
                const showMenu = playerMenuId === player.id;
                const canManage = multiplayer.isHost && !isYou && !isHost;
                
                return (
                  <div
                    key={player.id}
                    className={`p-3 rounded-xl flex items-center justify-between transition-all duration-200 relative ${
                      isYou
                        ? "bg-gradient-to-r from-blue-100 to-purple-100 border-2 border-blue-300 shadow-md"
                        : "bg-white border border-gray-300"
                    }`}
                  >
                    <span className="text-gray-800 font-medium flex items-center">
                      {isHost && (
                        <Crown className="w-4 h-4 ml-2 text-yellow-500 fill-yellow-500" />
                      )}
                      {!isHost && (
                        <span className="w-4 h-4 ml-2 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs">
                          👤
                        </span>
                      )}
                      <span className="font-bold text-sm">{player.name}</span>
                      {isYou && (
                        <span className="mr-2 text-blue-700 text-xs bg-blue-200 px-2 py-0.5 rounded-lg font-semibold">
                          (أنت)
                        </span>
                      )}
                      {isHost && (
                        <span className="mr-2 text-yellow-700 text-xs bg-yellow-200 px-2 py-0.5 rounded-lg font-semibold">
                          (القائد)
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      {isReady ? (
                        <span className="flex items-center gap-1 text-green-600 font-bold text-xs bg-green-100 px-2 py-1 rounded-lg">
                          <CheckCircle2 className="w-4 h-4" />
                          جاهز
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-gray-400 font-medium text-xs bg-gray-100 px-2 py-1 rounded-lg">
                          <Circle className="w-4 h-4" />
                          غير جاهز
                        </span>
                      )}
                      
                      {canManage && (
                        <div className="relative">
                          <button
                            onClick={() => setPlayerMenuId(showMenu ? null : player.id)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <MoreVertical className="w-4 h-4 text-gray-500" />
                          </button>
                          
                          {showMenu && (
                            <div className="absolute left-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-gray-200 z-20 min-w-[140px]">
                              <button
                                onClick={() => setShowTransferConfirm(player.id)}
                                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-blue-50 text-blue-700 text-sm font-medium rounded-t-xl transition-colors"
                              >
                                <ArrowRightLeft className="w-4 h-4" />
                                نقل القيادة
                              </button>
                              <button
                                onClick={() => setShowKickConfirm(player.id)}
                                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-50 text-red-600 text-sm font-medium rounded-b-xl transition-colors"
                              >
                                <UserX className="w-4 h-4" />
                                طرد اللاعب
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {multiplayer.players.length < 2 && (
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-3 rounded-xl border-2 border-blue-300 mt-3">
                <p className="text-blue-800 text-center font-medium text-sm">
                  🕒 في انتظار انضمام لاعبين آخرين... (يتطلب لاعبين على الأقل)
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-gray-200 space-y-2 flex-shrink-0">
          {!multiplayer.isHost && (
            <Button
              onClick={handleToggleReady}
              className={`w-full font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all ${
                isPlayerReady
                  ? "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                  : "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
              }`}
            >
              {isPlayerReady ? (
                <>
                  <Circle className="w-5 h-5" />
                  إلغاء الاستعداد
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  مستعد للعب
                </>
              )}
            </Button>
          )}

          {multiplayer.isHost && (
            <Button
              onClick={handleStartGame}
              disabled={!canStartGame}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all"
            >
              <Play className="w-5 h-5" />
              ابدأ اللعبة ({readyCount}/{multiplayer.players.length} جاهز)
            </Button>
          )}

          {!multiplayer.isHost && (
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-3 rounded-xl border-2 border-purple-300">
              <p className="text-purple-800 text-center font-semibold text-sm">
                ⏳ {readyCount >= 2 
                  ? "في انتظار قائد الغرفة لبدء اللعبة..." 
                  : `يجب أن يكون لاعبان جاهزان على الأقل (${readyCount}/2)`}
              </p>
            </div>
          )}

          <Button
            onClick={handleLeaveRoom}
            className="w-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-semibold py-3 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            مغادرة الغرفة
          </Button>
        </div>
      </div>

      <FriendsDialog
        isOpen={showFriends}
        onClose={() => setShowFriends(false)}
        roomId={multiplayer.roomId}
      />

      {showStartDialog && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4"
          onClick={() => setShowStartDialog(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                ليس جميع اللاعبين مستعدين
              </h2>
              <button 
                onClick={() => setShowStartDialog(false)}
                className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              {readyOtherPlayers.length > 0 && (
                <div>
                  <p className="text-green-600 text-sm mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    مستعدون ({readyOtherPlayers.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {readyOtherPlayers.map((player) => (
                      <span key={player.id} className="bg-green-100 text-green-700 px-2 py-1 rounded-lg text-sm border border-green-300">
                        {player.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {notReadyOtherPlayers.length > 0 && (
                <div>
                  <p className="text-orange-600 text-sm mb-2 flex items-center gap-2">
                    <Circle className="w-4 h-4" />
                    غير مستعدين ({notReadyOtherPlayers.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {notReadyOtherPlayers.map((player) => (
                      <span key={player.id} className="bg-orange-100 text-orange-700 px-2 py-1 rounded-lg text-sm border border-orange-300">
                        {player.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Button
                onClick={handleStartAnyway}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5" />
                البدء على أي حال
              </Button>
              <Button
                onClick={handleNotifyPlayers}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Bell className="w-5 h-5" />
                إعلامهم بالاستعداد
              </Button>
            </div>
          </div>
        </div>
      )}

      {showNoPlayersDialog && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4"
          onClick={() => setShowNoPlayersDialog(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                لا يوجد لاعب مستعد
              </h2>
              <button 
                onClick={() => setShowNoPlayersDialog(false)}
                className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <p className="text-gray-600 mb-6 text-center">
              لا يوجد أي لاعب مستعد في الغرفة. يجب أن يستعد لاعب واحد على الأقل قبل بدء اللعبة.
            </p>

            <div className="space-y-2">
              <Button
                onClick={handleNotifyPlayers}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Bell className="w-5 h-5" />
                إعلامهم بالاستعداد
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
