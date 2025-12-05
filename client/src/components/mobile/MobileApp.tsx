import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useNumberGame } from "@/lib/stores/useNumberGame";
import { useAudio } from "@/lib/stores/useAudio";
import { reconnectToSession, connectWebSocket, reconnectWithRetry, clearSession, getLastRoomSession, clearPersistentRoom, disconnect } from "@/lib/websocket";
import { MobileMenu } from "./MobileMenu";
import { MobileSingleplayer } from "./MobileSingleplayer";
import { MobileMultiplayer } from "./MobileMultiplayer";
import { ChallengesHub } from "../game/ChallengesHub";
import { useChallenges } from "@/lib/stores/useChallenges";

const DEFAULT_TITLE = "لعبة التخمين";

export function MobileApp() {
  const location = useLocation();
  const navigate = useNavigate();
  const { mode, setMode, setPlayerName, setRoomId, setPlayerId, setIsConnecting, setConnectionError, connectionError, multiplayer, singleplayer, restartSingleplayer, resetMultiplayer } = useNumberGame();
  const { setSuccessSound } = useAudio();
  const [showChallengesHub, setShowChallengesHub] = useState(false);
  const challenges = useChallenges();
  const { hasWonAnyChallenge, resetChallengesHub, generateHint } = challenges;

  useEffect(() => {
    const successAudio = new Audio("/sounds/success.mp3");
    successAudio.load();
    setSuccessSound(successAudio);
  }, [setSuccessSound]);

  useEffect(() => {
    if (location.pathname === "/" || location.pathname === "") {
      document.title = DEFAULT_TITLE;

      // لا تحاول إعادة الاتصال إذا كان هناك خطأ في الاتصال
      if (connectionError) {
        console.log("Connection error exists, skipping auto-reconnect");
        return;
      }

      const lastRoom = getLastRoomSession();
      if (lastRoom && lastRoom.roomId && lastRoom.playerId) {
        console.log("Found saved session on app load, redirecting to room:", lastRoom.roomId);
        navigate(`/room/${lastRoom.roomId}`, { replace: true });
        return;
      }

      resetMultiplayer();
      setMode("menu");
      clearSession();
      clearPersistentRoom();
      disconnect();
    } else if (location.pathname === "/singleplayer") {
      document.title = `${DEFAULT_TITLE} - لعب فردي`;
    } else if (location.pathname.startsWith("/room/")) {
      const roomId = location.pathname.split("/room/")[1]?.split(/[?#]/)[0]?.replace(/\/$/, "")?.toUpperCase();
      document.title = roomId ? `غرفة ${roomId}` : DEFAULT_TITLE;
    }
  }, [location.pathname]);

  useEffect(() => {
    let timeoutHandle: NodeJS.Timeout | null = null;
    let isMounted = true;

    if (location.pathname === "/" || location.pathname === "") {
      return () => {
        isMounted = false;
        if (timeoutHandle) clearTimeout(timeoutHandle);
      };
    } else if (location.pathname === "/singleplayer") {
      setMode("singleplayer");
      if (!singleplayer.secretCode || singleplayer.secretCode.length === 0) {
        restartSingleplayer();
      }
    } else if (location.pathname === "/multiplayer") {
      setMode("multiplayer");
    } else if (location.pathname.startsWith("/room/")) {
      setMode("multiplayer");
      const roomId = location.pathname.split("/room/")[1];

      if (multiplayer.roomId === roomId && multiplayer.playerId) {
        return () => {
          isMounted = false;
          if (timeoutHandle) clearTimeout(timeoutHandle);
        };
      }

      // لا تحاول إعادة الاتصال إذا كان هناك خطأ في الاتصال
      if (connectionError) {
        console.log("Connection error exists, skipping reconnect");
        return () => {
          isMounted = false;
          if (timeoutHandle) clearTimeout(timeoutHandle);
        };
      }

      // تحقق من عدم وجود قطع اتصال يدوي قبل محاولة إعادة الاتصال
      const session = reconnectToSession();
      if (session && session.roomId === roomId && session.playerId) {
        console.log("Reconnecting to room from session:", roomId);
        setPlayerName(session.playerName);
        setIsConnecting(true);
        reconnectWithRetry(session.playerName, session.playerId, session.roomId);

        // زيادة وقت timeout إلى 10 ثواني للاتصالات البطيئة
        timeoutHandle = setTimeout(() => {
          if (isMounted && useNumberGame.getState().isConnecting) {
            console.error("Connection timeout");
            setIsConnecting(false);
            setConnectionError("فشل الاتصال. يرجى المحاولة مرة أخرى.");
          }
        }, 10000);
      } else {
        const lastRoom = getLastRoomSession();
        if (lastRoom && lastRoom.roomId === roomId && lastRoom.playerId) {
          console.log("Reconnecting to last room:", roomId);
          setPlayerName(lastRoom.playerName);
          setIsConnecting(true);
          reconnectWithRetry(lastRoom.playerName, lastRoom.playerId, lastRoom.roomId);

          // زيادة وقت timeout إلى 10 ثواني للاتصالات البطيئة
          timeoutHandle = setTimeout(() => {
            if (isMounted && useNumberGame.getState().isConnecting) {
              console.error("Connection timeout");
              setIsConnecting(false);
              setConnectionError("فشل الاتصال. يرجى المحاولة مرة أخرى.");
            }
          }, 10000);
        }
      }
    }

    return () => {
      isMounted = false;
      if (timeoutHandle) clearTimeout(timeoutHandle);
    };
  }, [location.pathname, connectionError]);

  useEffect(() => {
    if (multiplayer.roomId && location.pathname !== `/room/${multiplayer.roomId}`) {
      navigate(`/room/${multiplayer.roomId}`, { replace: true });
    }
  }, [multiplayer.roomId, navigate, location.pathname]);

  const handleExitChallengesHub = () => {
    if (hasWonAnyChallenge()) {
      generateHint(singleplayer.secretCode);
    }
    setShowChallengesHub(false);
    resetChallengesHub();
  };

  if (showChallengesHub) {
    return <ChallengesHub onExit={handleExitChallengesHub} />;
  }

  const isMenuPage = location.pathname === "/" || location.pathname === "";
  const isSingleplayerPage = location.pathname === "/singleplayer";
  const isMultiplayerPage = location.pathname === "/multiplayer" || location.pathname.startsWith("/room/");

  // Extract roomId from URL for join page - clean up any query/hash params
  const urlRoomId = location.pathname.startsWith("/room/") 
    ? location.pathname.split("/room/")[1]?.split(/[?#]/)[0]?.replace(/\/$/, "")?.toUpperCase() || undefined
    : undefined;

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {isMenuPage && <MobileMenu />}
      {isSingleplayerPage && (
        <MobileSingleplayer 
          onStartChallenge={() => {
            setShowChallengesHub(true);
          }}
        />
      )}
      {isMultiplayerPage && <MobileMultiplayer joinRoomIdFromUrl={urlRoomId} />}
      
      {/* Connection Error */}
      {connectionError && (
        <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-red-50 z-50 p-4">
          <div className="text-center relative max-w-md mx-4">
            <div className="inline-flex items-center justify-center mb-4">
              <div className="text-6xl">❌</div>
            </div>
            <p className="text-gray-800 text-xl font-semibold mb-4">{connectionError}</p>
            <button
              onClick={() => {
                // قطع الاتصال وإيقاف كل محاولات إعادة الاتصال
                disconnect();
                clearSession();
                clearPersistentRoom();

                // إعادة تعيين الحالة بالكامل
                setConnectionError(null);
                setIsConnecting(false);
                resetMultiplayer();
                setMode("menu");

                // التنقل للصفحة الرئيسية - استخدام window.location للتأكد من إعادة التحميل الكامل
                window.location.href = "/";
              }}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-semibold transition-colors"
            >
              العودة للقائمة الرئيسية
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
