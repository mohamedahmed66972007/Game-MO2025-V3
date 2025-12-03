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
  const { mode, setMode, setPlayerName, setRoomId, setPlayerId, setIsConnecting, multiplayer, singleplayer, restartSingleplayer, resetMultiplayer } = useNumberGame();
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

      const session = reconnectToSession();
      if (session && session.roomId === roomId && session.playerId) {
        console.log("Reconnecting to room from session:", roomId);
        setPlayerName(session.playerName);
        setIsConnecting(true);
        reconnectWithRetry(session.playerName, session.playerId, session.roomId);
        
        timeoutHandle = setTimeout(() => {
          if (isMounted && useNumberGame.getState().isConnecting) {
            console.error("Connection timeout");
            setIsConnecting(false);
          }
        }, 5000);
      } else {
        const lastRoom = getLastRoomSession();
        if (lastRoom && lastRoom.roomId === roomId && lastRoom.playerId) {
          console.log("Reconnecting to last room:", roomId);
          setPlayerName(lastRoom.playerName);
          setIsConnecting(true);
          reconnectWithRetry(lastRoom.playerName, lastRoom.playerId, lastRoom.roomId);
          
          timeoutHandle = setTimeout(() => {
            if (isMounted && useNumberGame.getState().isConnecting) {
              console.error("Connection timeout");
              setIsConnecting(false);
            }
          }, 5000);
        }
      }
    }

    return () => {
      isMounted = false;
      if (timeoutHandle) clearTimeout(timeoutHandle);
    };
  }, [location.pathname]);

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
    </div>
  );
}
