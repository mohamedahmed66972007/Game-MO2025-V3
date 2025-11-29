import { useNumberGame } from "./stores/useNumberGame";
import { useCards } from "./stores/useCards";
import { useChallenges } from "./stores/useChallenges";
import { toast } from "sonner";

let socket: WebSocket | null = null;
let reconnectAttempts = 0;
let reconnectTimeout: NodeJS.Timeout | null = null;
let isManualDisconnect = false;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 2000;

const saveSessionToStorage = (playerName: string, playerId: string, roomId: string) => {
  const store = useNumberGame.getState();
  const isInGame = store.multiplayer.gameStatus === "playing";
  sessionStorage.setItem("multiplayerSession", JSON.stringify({
    playerName,
    playerId,
    roomId,
    timestamp: Date.now(),
    gameState: isInGame ? {
      gameStatus: store.multiplayer.gameStatus,
      sharedSecret: store.multiplayer.sharedSecret,
      attempts: store.multiplayer.attempts,
      startTime: store.multiplayer.startTime,
      settings: store.multiplayer.settings,
    } : null,
  }));
  localStorage.setItem("lastPlayerName", playerName);
  // Save room for persistent reconnection (for 24 hours)
  localStorage.setItem("lastRoomSession", JSON.stringify({
    playerName,
    playerId,
    roomId,
    timestamp: Date.now(),
    startTime: store.multiplayer.startTime,
  }));
};

export const getLastPlayerName = () => {
  return localStorage.getItem("lastPlayerName") || "";
};

const getSessionFromStorage = () => {
  const session = sessionStorage.getItem("multiplayerSession");
  if (session) {
    try {
      const parsed = JSON.parse(session);
      // Only consider sessions less than 30 seconds old as valid for reconnection
      if (Date.now() - parsed.timestamp < 30 * 1000) {
        return parsed;
      } else {
        sessionStorage.removeItem("multiplayerSession");
        return null;
      }
    } catch (e) {
      return null;
    }
  }
  return null;
};

const attemptReconnect = () => {
  const session = getSessionFromStorage();
  if (!session || isManualDisconnect) {
    console.log("No session to reconnect or manual disconnect");
    return;
  }

  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.log("Max reconnect attempts reached");
    toast.error("فشل الاتصال بالخادم. يرجى المحاولة مرة أخرى.", {
      duration: 5000,
    });
    useNumberGame.getState().setConnectionError("فشل إعادة الاتصال");
    clearSession();
    return;
  }

  reconnectAttempts++;
  console.log(`Reconnect attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
  
  toast.loading(`جاري إعادة الاتصال... (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`, {
    id: "reconnect-toast",
    duration: RECONNECT_DELAY,
  });

  reconnectWithRetry(session.playerName, session.playerId, session.roomId);
};

export const connectWebSocket = (playerName: string, roomId?: string) => {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/game`;

  isManualDisconnect = false;
  reconnectAttempts = 0;
  
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    console.log("WebSocket connected");
    reconnectAttempts = 0;
    toast.dismiss("reconnect-toast");
    
    if (roomId) {
      send({ type: "join_room", roomId, playerName });
    } else {
      send({ type: "create_room", playerName });
    }
  };

  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    handleMessage(message);
  };

  socket.onclose = (event) => {
    console.log("WebSocket disconnected", event.code, event.reason);
    
    if (!isManualDisconnect && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      const session = getSessionFromStorage();
      if (session) {
        console.log("Connection lost, attempting reconnect in", RECONNECT_DELAY, "ms");
        reconnectTimeout = setTimeout(attemptReconnect, RECONNECT_DELAY);
      }
    }
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
  };

  return socket;
};

export const send = (message: any) => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
};

export const clearSession = () => {
  sessionStorage.removeItem("multiplayerSession");
};

export const clearPersistentRoom = () => {
  localStorage.removeItem("lastRoomSession");
};

export const getLastRoomSession = () => {
  const session = localStorage.getItem("lastRoomSession");
  if (session) {
    try {
      const parsed = JSON.parse(session);
      // Valid for 24 hours
      if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
        return parsed;
      } else {
        localStorage.removeItem("lastRoomSession");
        return null;
      }
    } catch (e) {
      return null;
    }
  }
  return null;
};

export const disconnect = () => {
  isManualDisconnect = true;
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  if (socket) {
    socket.close();
    socket = null;
  }
  clearSession();
  toast.dismiss("reconnect-toast");
};

export const reconnectToSession = () => {
  const session = getSessionFromStorage();
  if (session && session.playerId && session.roomId) {
    return session;
  }
  return null;
};

export const reconnectWithRetry = (playerName: string, playerId: string, roomId: string) => {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/game`;

  socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    console.log("WebSocket connected - attempting reconnect");
    reconnectAttempts = 0;
    toast.dismiss("reconnect-toast");
    toast.success("تم إعادة الاتصال بنجاح!", {
      duration: 3000,
    });
    
    send({ 
      type: "reconnect", 
      playerId, 
      playerName,
      roomId 
    });
  };

  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    handleMessage(message);
  };

  socket.onclose = (event) => {
    console.log("WebSocket disconnected during reconnect", event.code, event.reason);
    
    if (!isManualDisconnect && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      const session = getSessionFromStorage();
      if (session) {
        console.log("Connection lost during reconnect, retrying in", RECONNECT_DELAY, "ms");
        reconnectTimeout = setTimeout(attemptReconnect, RECONNECT_DELAY);
      }
    }
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
  };

  return socket;
};

const handleMessage = (message: any) => {
  const store = useNumberGame.getState();

  console.log("Received message:", message);

  switch (message.type) {
    case "room_created":
      store.setRoomId(message.roomId);
      store.setPlayerId(message.playerId);
      if (message.hostId) {
        store.setHostId(message.hostId);
      }
      if (message.players) {
        store.setPlayers(message.players);
      }
      store.setIsConnecting(false);
      saveSessionToStorage(store.multiplayer.playerName, message.playerId, message.roomId);
      console.log("Room created:", message.roomId, "Host:", message.hostId);
      break;

    case "room_joined":
      store.setRoomId(message.roomId);
      store.setPlayerId(message.playerId);
      if (message.hostId) {
        store.setHostId(message.hostId);
      }
      store.setPlayers(message.players);
      store.setIsConnecting(false);
      saveSessionToStorage(store.multiplayer.playerName, message.playerId, message.roomId);
      console.log("Room joined:", message.roomId, "Host:", message.hostId);
      break;

    case "players_updated":
      store.setPlayers(message.players);
      if (message.hostId) {
        store.setHostId(message.hostId);
      }
      break;

    case "host_changed":
      store.setHostId(message.newHostId);
      break;

    case "settings_updated":
      store.setMultiplayerSettings(message.settings);
      // Update card settings for all players when host changes settings
      if (message.settings.cardSettings) {
        const cardsStore = useCards.getState();
        cardsStore.setCardSettings(message.settings.cardSettings);
      }
      break;

    case "game_started":
      // Clear previous game data and start fresh
      const cardsEnabled = message.settings?.cardsEnabled ?? store.multiplayer.settings.cardsEnabled;
      const selectedChallenge = message.settings?.selectedChallenge ?? store.multiplayer.settings.selectedChallenge;
      
      useNumberGame.setState((state) => ({
        multiplayer: {
          ...state.multiplayer,
          gameStatus: "playing",
          sharedSecret: message.sharedSecret,
          phase: "playing",
          startTime: cardsEnabled ? 0 : Date.now(),
          endTime: null,
          attempts: [],
          currentGuess: [],
          showResults: false,
          showPreGameChallenge: cardsEnabled,
          challengeWinner: null,
          winners: [],
          losers: [],
          stillPlaying: [],
          rematchState: {
            requested: false,
            countdown: null,
            votes: [],
          },
          settings: message.settings ? {
            ...state.multiplayer.settings,
            ...message.settings,
            cardsEnabled: cardsEnabled,
            selectedChallenge: selectedChallenge
          } : state.multiplayer.settings,
        },
      }));
      
      // Clear card award flag for new game
      const cardAwardKeyToClear = `card_awarded_${store.multiplayer.roomId}_${store.multiplayer.playerId}`;
      sessionStorage.removeItem(cardAwardKeyToClear);
      
      // Reset challenges state to prevent incorrect card awards from previous game
      const challengesStore = useChallenges.getState();
      challengesStore.resetChallengesHub();
      console.log("Challenges state reset for new game");
      
      // Initialize cards system if enabled
      const cardsStore = useCards.getState();
      
      // Always clear revealed/burned and player cards for new game
      cardsStore.clearRevealedAndBurned();
      cardsStore.clearAllActiveEffects();
      
      // Clear existing player cards to prevent duplication
      useCards.setState({ playerCards: [] });
      
      // Sync card settings from server for all players
      if (message.settings?.cardSettings) {
        cardsStore.setCardSettings(message.settings.cardSettings);
      }
      
      if (cardsEnabled) {
        cardsStore.enableCards();
        cardsStore.initializePlayerCards(store.multiplayer.playerId);
        console.log("Cards system initialized for player:", store.multiplayer.playerId, "Challenge:", selectedChallenge);
      } else {
        cardsStore.resetCards();
      }
      
      saveSessionToStorage(store.multiplayer.playerName, store.multiplayer.playerId, store.multiplayer.roomId);
      console.log("Game started with shared secret, cardsEnabled:", cardsEnabled, "showPreGameChallenge:", cardsEnabled);
      break;

    case "game_starting":
      // All players completed challenges - use server timestamp for sync if provided
      const gameStartTime = message.serverStartTime || Date.now();
      useNumberGame.setState((state) => ({
        multiplayer: {
          ...state.multiplayer,
          startTime: gameStartTime,
        },
      }));
      console.log("All players completed challenges - game timer started, serverStartTime:", gameStartTime);
      toast.success(message.message || "بدأت اللعبة!", {
        duration: 3000,
      });
      break;

    case "room_rejoined":
      store.setRoomId(message.roomId);
      store.setPlayerId(message.playerId);
      store.setHostId(message.hostId);
      store.setPlayers(message.players);
      store.setIsConnecting(false);
      console.log("Successfully reconnected to room", message.roomId);
      break;

    case "game_state":
      store.setGameStatus(message.status);
      store.setSharedSecret(message.sharedSecret);
      // Restore settings
      if (message.settings) {
        store.setMultiplayerSettings(message.settings);
      }
      // Restore startTime from server if provided
      if (message.gameStartTime && message.gameStartTime > 0) {
        store.setMultiplayerStartTimeFromServer(message.gameStartTime);
        console.log("Restored game startTime from server:", message.gameStartTime, "Date:", new Date(message.gameStartTime).toLocaleTimeString());
      }
      console.log("Received game state after reconnect");
      break;

    case "player_game_state":
      // Restore player's game data after reconnect
      message.attempts.forEach((attempt: any) => {
        store.addMultiplayerAttempt(attempt);
      });
      if (message.finished) {
        if (message.won) {
          store.setMultiplayerPhase("won");
        } else {
          store.setMultiplayerPhase("lost");
        }
      }
      console.log("Restored player game state");
      break;

    case "player_disconnected":
      toast.info(`اللاعب ${message.playerName} انقطع اتصاله`, {
        duration: 5000,
        icon: "📡",
      });
      break;

    case "player_reconnected":
      toast.success(`اللاعب ${message.playerName} عاد للعبة ✅`, {
        duration: 5000,
      });
      break;

    case "player_timeout":
      toast.warning(`اللاعب ${message.playerName} انقطع اتصاله نهائياً (انتهت مهلة 5 دقائق)`, {
        duration: 7000,
        icon: "⏱️",
      });
      break;

    case "guess_result":
      const attempt = {
        guess: message.guess,
        correctCount: message.correctCount,
        correctPositionCount: message.correctPositionCount,
      };
      store.addMultiplayerAttempt(attempt);
      
      if (message.won) {
        const wasAlreadyWon = store.multiplayer.phase === "won";
        store.setMultiplayerPhase("won");
        store.setMultiplayerEndTime();
        
        // Award ONE card to the winner - only if not already won and card not already awarded in this game
        const cardAwardKey = `card_awarded_${store.multiplayer.roomId}_${store.multiplayer.playerId}`;
        const alreadyAwarded = sessionStorage.getItem(cardAwardKey) === "true";
        
        if (!wasAlreadyWon && !alreadyAwarded && store.multiplayer.settings.cardsEnabled) {
          const cardsStore = useCards.getState();
          const allowedCards = store.multiplayer.settings.allowedCards;
          const awardedCard = cardsStore.awardWinnerCard(store.multiplayer.playerId, allowedCards);
          if (awardedCard) {
            sessionStorage.setItem(cardAwardKey, "true");
            toast.success(`🎴 حصلت على بطاقة ${awardedCard.nameAr}!`, {
              duration: 5000,
            });
          }
        }
      }
      break;

    case "max_attempts_reached":
      store.setMultiplayerPhase("lost");
      store.setMultiplayerEndTime();
      console.log("Max attempts reached - game lost, waiting for final results...");
      break;

    case "player_attempt":
      // Another player made an attempt - update spectators
      console.log(`Player ${message.playerName} made attempt #${message.attemptNumber}${message.won ? ' and won!' : ''}`);
      // Update the still playing player's attempts
      if (message.guess && message.correctCount !== undefined && message.correctPositionCount !== undefined) {
        const attempt = {
          guess: message.guess,
          correctCount: message.correctCount,
          correctPositionCount: message.correctPositionCount,
        };
        store.updateStillPlayingAttempt(message.playerId, attempt);
      }
      break;

    case "player_quit":
      console.log(`Player ${message.playerName} quit the game`);
      toast.info(`اللاعب ${message.playerName} انسحب من المباراة`, {
        duration: 5000,
        icon: "🚪",
      });
      break;

    case "game_results":
      // Show results to finished players only
      const currentState = useNumberGame.getState();
      store.setGameResults(message.winners, message.losers, message.sharedSecret);
      // Update still playing list
      useNumberGame.setState({
        multiplayer: {
          ...currentState.multiplayer,
          winners: message.winners,
          losers: message.losers,
          stillPlaying: message.stillPlaying || [],
          sharedSecret: message.sharedSecret,
          showResults: true,
          gameStatus: "finished",
        },
      });
      console.log("Game finished - results received", { winners: message.winners.length, losers: message.losers.length, stillPlaying: message.stillPlaying?.length });
      
      // Clear session when results are shown to prevent reconnecting to finished game
      clearSession();
      
      if (message.reason === "time_expired") {
        toast.info("انتهى الوقت! انتهت اللعبة 🕐", {
          duration: 7000,
        });
      } else if (message.reason === "all_finished") {
        toast.success("انتهت المباراة! أنهى جميع اللاعبين محاولاتهم ✅", {
          duration: 7000,
        });
      } else if (message.reason === "player_finished") {
        // Check if current player won or lost
        const playerId = useNumberGame.getState().multiplayer.playerId;
        const isWinner = message.winners.some((w: any) => w.playerId === playerId);
        
        if (isWinner) {
          toast.success("تهانينا! 🎉 لقد فزت! جاري عرض النتائج...", {
            duration: 5000,
          });
        } else {
          toast.info("انتهت محاولاتك. جاري عرض النتائج الحالية...", {
            duration: 5000,
          });
        }
      }
      
      // Save round to history when game is fully finished (all players finished or time expired)
      if (message.reason === "time_expired" || message.reason === "all_finished") {
        store.saveRoundToHistory();
        console.log("Round saved to history");
      }
      break;

    case "player_details":
      // Could store this in a temporary state for showing details modal
      console.log("Player details received:", message);
      break;

    case "rematch_requested":
      store.setRematchRequested(true, message.countdown);
      if (message.votes) {
        store.setRematchVotes(message.votes);
      }
      if (message.requestedBy) {
        toast.info(`${message.requestedBy} طلب إعادة المباراة! 🔄`, {
          duration: 5000,
        });
      }
      break;

    case "rematch_countdown":
      store.setRematchCountdown(message.countdown);
      store.setRematchVotes(message.votes);
      break;

    case "rematch_vote_update":
      store.setRematchVotes(message.votes);
      break;

    case "rematch_starting":
      // Round history is saved in game_results handler when game fully finishes
      store.resetMultiplayerGame();
      store.setPlayers(message.players);
      
      // Clear card award flag for new game
      const cardAwardKeyForRematch = `card_awarded_${store.multiplayer.roomId}_${store.multiplayer.playerId}`;
      sessionStorage.removeItem(cardAwardKeyForRematch);
      
      // Reset cards system for rematch - ALWAYS clear ALL state regardless of cardsEnabled
      const cardsStoreRematch = useCards.getState();
      const preservedCardSettings = { ...cardsStoreRematch.cardSettings };
      
      // Clear all player effects first
      cardsStoreRematch.playerCards.forEach(player => {
        cardsStoreRematch.clearAllActiveEffects(player.playerId);
      });
      
      // Full reset of all card state - always reset revealedDigits, burnedNumbers, and playerCards
      useCards.setState({
        cardsEnabled: false,
        playerCards: [],
        revealedDigits: [],
        burnedNumbers: [],
        cardSettings: preservedCardSettings,
      });
      
      // Also call explicit clear methods for any additional cleanup
      cardsStoreRematch.clearRevealedAndBurned();
      
      // Reset challenges state to prevent incorrect card awards
      const challengesStoreRematch = useChallenges.getState();
      challengesStoreRematch.resetChallengesHub();
      
      console.log("Rematch starting - game, cards, challenges fully reset (settings preserved)");
      break;

    case "card_used": {
      const cardsStore = useCards.getState();
      const currentPlayerId = store.multiplayer.playerId;
      const currentCardSettings = cardsStore.cardSettings;
      
      console.log(`[Cards WS] Card used: ${message.cardType} from ${message.fromPlayerName} to ${message.targetPlayerName || "self"}`);
      
      // Handle revealNumber card - permanent effect, not expiring
      if (message.cardType === "revealNumber" && message.fromPlayerId === currentPlayerId) {
        // Only add to revealedDigits if this is my own card and effectValue has position/digit
        if (message.effectValue && typeof message.effectValue === "object") {
          const { position, digit } = message.effectValue as { position: number; digit: number };
          if (position !== undefined && digit !== undefined) {
            cardsStore.addRevealedDigit(position, digit);
            toast.success(`تم كشف الرقم ${digit} في الخانة ${position + 1}! 👁️`, { duration: 3000 });
          }
        }
        break;
      }
      
      // Determine who receives the effect
      const isAttackCard = ["freeze"].includes(message.cardType);
      const effectRecipientId = isAttackCard && message.targetPlayerId
        ? message.targetPlayerId
        : message.fromPlayerId;
      
      // Initialize the recipient if not exists
      cardsStore.initializePlayerCards(effectRecipientId);
      
      // Apply the effect (for cards that have duration like freeze, shield)
      // Use the correct duration from card settings
      if (["freeze", "shield"].includes(message.cardType)) {
        let effectDuration = message.effectDuration || 30000;
        
        // Use card settings for freeze duration
        if (message.cardType === "freeze") {
          effectDuration = (currentCardSettings.freezeDuration || 30) * 1000;
        } else if (message.cardType === "shield") {
          effectDuration = (currentCardSettings.shieldDuration || 120) * 1000;
        }
        
        const effect = {
          cardType: message.cardType,
          targetPlayerId: message.targetPlayerId,
          expiresAt: Date.now() + effectDuration,
          value: message.effectValue,
        };
        
        cardsStore.addActiveEffect(effectRecipientId, effect);
      }
      
      // Show notification based on who used the card
      if (message.fromPlayerId === currentPlayerId) {
        // I used the card
        if (message.targetPlayerId && message.targetPlayerName) {
          toast.success(`استخدمت البطاقة ضد ${message.targetPlayerName}! 🎴`, { duration: 3000 });
        }
      } else if (message.targetPlayerId === currentPlayerId) {
        // Card was used against me
        if (message.cardType === "freeze") {
          const freezeSecs = currentCardSettings.freezeDuration || 30;
          toast.error(`${message.fromPlayerName} جمّدك لمدة ${freezeSecs} ثانية! ❄️`, { duration: 5000 });
        }
      }
      break;
    }

    case "rematch_cancelled":
      store.setRematchRequested(false, null);
      console.log("Rematch cancelled:", message.message);
      break;

    case "kicked_from_room":
      console.log("Kicked from room:", message.message);
      store.resetMultiplayer();
      store.setMode("menu");
      break;

    case "room_deleted":
      console.log("Room deleted:", message.message);
      toast.warning(message.message, { duration: 5000 });
      clearSession();
      store.resetMultiplayer();
      store.setMode("menu");
      break;

    case "error":
      console.error("Server error:", message.message);
      
      // Map server errors to user-friendly Arabic messages
      let errorMessage = message.message;
      if (message.message.includes("Room not found")) {
        errorMessage = "❌ الغرفة غير موجودة - جميع اللاعبين غادروا اللعبة";
      } else if (message.message.includes("full")) {
        errorMessage = "❌ الغرفة ممتلئة - لا يمكن الانضمام";
      } else if (message.message.includes("session not found")) {
        errorMessage = "❌ الجلسة انتهت - يرجى محاولة مرة أخرى";
      }
      
      store.setConnectionError(errorMessage);
      store.setIsConnecting(false);
      store.setRoomId("");
      store.setPlayerId("");
      clearSession();
      break;

    default:
      console.log("Unknown message type:", message.type);
  }
};
