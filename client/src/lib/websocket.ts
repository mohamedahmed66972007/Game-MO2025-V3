import { useNumberGame } from "./stores/useNumberGame";

let socket: WebSocket | null = null;

const saveSessionToStorage = (playerName: string, playerId: string, roomId: string) => {
  const store = useNumberGame.getState();
  const isInGame = store.multiplayer.opponentId && store.multiplayer.challengeStatus === "accepted";
  sessionStorage.setItem("multiplayerSession", JSON.stringify({
    playerName,
    playerId,
    roomId,
    timestamp: Date.now(),
    gameState: isInGame ? {
      opponentId: store.multiplayer.opponentId,
      opponentName: store.multiplayer.opponentName,
      mySecretCode: store.multiplayer.mySecretCode,
      challengeStatus: store.multiplayer.challengeStatus,
      playersGaming: store.multiplayer.playersGaming,
      isMyTurn: store.multiplayer.isMyTurn,
      attempts: store.multiplayer.attempts,
      opponentAttempts: store.multiplayer.opponentAttempts,
      turnTimeLeft: store.multiplayer.turnTimeLeft,
    } : null,
  }));
  localStorage.setItem("lastPlayerName", playerName);
};

export const getLastPlayerName = () => {
  return localStorage.getItem("lastPlayerName") || "";
};

const getSessionFromStorage = () => {
  const session = sessionStorage.getItem("multiplayerSession");
  if (session) {
    try {
      const parsed = JSON.parse(session);
      // Only consider sessions less than 30 minutes old as valid (longer for active games)
      if (Date.now() - parsed.timestamp < 30 * 60 * 1000) {
        return parsed;
      } else {
        // Session is too old, clear it
        sessionStorage.removeItem("multiplayerSession");
        return null;
      }
    } catch (e) {
      return null;
    }
  }
  return null;
};

export const connectWebSocket = (playerName: string, roomId?: string) => {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/game`;

  socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    console.log("WebSocket connected");
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

  socket.onclose = () => {
    console.log("WebSocket disconnected");
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

export const disconnect = () => {
  if (socket) {
    socket.close();
    socket = null;
  }
  clearSession();
};

export const reconnectToSession = () => {
  const session = getSessionFromStorage();
  if (session && session.playerId && session.roomId) {
    return session;
  }
  return null;
};

const handleMessage = (message: any) => {
  const store = useNumberGame.getState();

  console.log("Received message:", message);

  switch (message.type) {
    case "room_created":
      store.setRoomId(message.roomId);
      store.setPlayerId(message.playerId);
      store.setIsConnecting(false);
      saveSessionToStorage(store.multiplayer.playerName, message.playerId, message.roomId);
      console.log("Room created:", message.roomId);
      break;

    case "room_joined":
      store.setRoomId(message.roomId);
      store.setPlayerId(message.playerId);
      store.setPlayers(message.players);
      store.setIsConnecting(false);
      saveSessionToStorage(store.multiplayer.playerName, message.playerId, message.roomId);
      console.log("Room joined:", message.roomId);
      break;

    case "players_updated":
      store.setPlayers(message.players);
      break;

    case "challenge_received":
      store.setOpponentId(message.fromPlayerId);
      store.setOpponentName(message.fromPlayerName);
      store.setChallengeStatus("received");
      useNumberGame.setState((state) => ({
        multiplayer: {
          ...state.multiplayer,
          isChallengeSender: false,
        },
      }));
      break;

    case "challenge_sent":
      store.setChallengeStatus("sent");
      useNumberGame.setState((state) => ({
        multiplayer: {
          ...state.multiplayer,
          isChallengeSender: true,
        },
      }));
      break;

    case "challenge_accepted":
      if (!store.multiplayer.opponentId) {
        store.setOpponentId(message.opponentId);
        store.setOpponentName(message.opponentName);
      }
      store.setChallengeStatus("accepted");
      // Save game state when challenge is accepted
      saveSessionToStorage(store.multiplayer.playerName, store.multiplayer.playerId, store.multiplayer.roomId);
      break;

    case "challenge_rejected":
      console.log("Challenge rejected by opponent");
      store.setChallengeStatus("none");
      store.setOpponentId(null);
      store.setOpponentName("");
      store.setMySecretCode([]);
      break;

    case "challenge_cleared":
      store.setChallengeStatus("none");
      store.setOpponentId(null);
      store.setOpponentName("");
      break;

    case "players_gaming":
      const currentPlayersGaming = store.multiplayer.playersGaming || [];
      const newGamingPair = {
        player1Id: message.player1Id,
        player1Name: message.player1Name,
        player2Id: message.player2Id,
        player2Name: message.player2Name,
      };
      // Check if this gaming pair already exists to avoid duplicates
      const pairExists = currentPlayersGaming.some(
        (pair) =>
          (pair.player1Id === message.player1Id && pair.player2Id === message.player2Id) ||
          (pair.player1Id === message.player2Id && pair.player2Id === message.player1Id)
      );
      if (!pairExists) {
        store.setPlayersGaming([...currentPlayersGaming, newGamingPair]);
      }
      break;

    case "game_started": {
      // Reset game state but keep opponent and secret code info
      const playerIdAtStart = store.multiplayer.playerId;
      useNumberGame.setState((state) => ({
        multiplayer: {
          ...state.multiplayer,
          currentGuess: [],
          attempts: [],
          opponentAttempts: [],
          phase: "playing",
          isMyTurn: message.firstPlayerId === playerIdAtStart,
          turnTimeLeft: 60,
          firstWinnerId: null,
          firstWinnerAttempts: 0,
          gameResult: "pending",
          rematchRequested: false,
          pendingWin: false,
          pendingWinMessage: "",
          opponentStatus: "لم يفز الخصم بعد",
          opponentWonFirst: false,
          showResults: false,
          turnTimerActive: true,
          showOpponentAttempts: false,
          startTime: Date.now(),
          endTime: null,
          opponentSecretCode: [],
        },
      }));
      console.log("Game started. First player:", message.firstPlayerId, "My ID:", playerIdAtStart, "My turn?", message.firstPlayerId === playerIdAtStart);
      break;
    }

    case "guess_result": {
      const attempt = {
        guess: message.guess,
        correctCount: message.correctCount,
        correctPositionCount: message.correctPositionCount,
      };
      
      const stateForGuess = useNumberGame.getState();
      if (message.playerId === stateForGuess.multiplayer.playerId) {
        useNumberGame.setState({
          multiplayer: {
            ...stateForGuess.multiplayer,
            attempts: [...stateForGuess.multiplayer.attempts, attempt],
          },
        });
      } else {
        store.addOpponentAttempt(attempt);
      }

      store.setIsMyTurn(message.nextTurn === store.multiplayer.playerId);
      store.setTurnTimeLeft(60);

      if (message.won) {
        store.setMultiplayerEndTime();
        if (message.playerId === store.multiplayer.playerId) {
          store.setMultiplayerPhase("won");
          if (message.opponentSecret) {
            store.setOpponentSecretCode(message.opponentSecret);
          }
        } else {
          store.setMultiplayerPhase("lost");
          if (message.opponentSecret) {
            store.setOpponentSecretCode(message.opponentSecret);
          }
        }
      }
      break;
    }

    case "first_winner_pending":
      // I won first - show pending win message and wait for opponent
      store.setFirstWinner(store.multiplayer.playerId, message.playerAttempts);
      store.setPendingWin(true, message.message);
      if (message.opponentSecret) {
        store.setOpponentSecretCode(message.opponentSecret);
      }
      console.log("First winner pending - waiting for opponent to finish");
      break;

    case "opponent_won_first":
      // Opponent won first - update status to show they won
      store.setFirstWinner(message.firstWinnerId || "", message.opponentAttempts);
      store.setOpponentStatus(message.message, true);
      console.log("Opponent won first - limited turns left");
      break;

    case "opponent_status_update":
      // Update opponent status on back wall
      store.setOpponentStatus(message.message, message.opponentWon);
      break;

    case "game_result":
      // Final game result - stop timer and show results page
      store.setMultiplayerEndTime();
      store.setTurnTimerActive(false);
      if (message.opponentSecret) {
        store.setOpponentSecretCode(message.opponentSecret);
      }
      store.setGameResult(message.result);
      store.setShowResults(true);
      
      if (message.result === "won") {
        store.setMultiplayerPhase("won");
      } else if (message.result === "lost") {
        store.setMultiplayerPhase("lost");
      } else if (message.result === "tie") {
        store.setMultiplayerPhase("won");
      }
      
      // Don't reset state when opponent quits - keep showing results
      // User will click "العودة للغرفة" button to return to lobby
      
      console.log("Game ended with result:", message.result);
      break;

    case "opponent_quit":
      store.setMultiplayerEndTime();
      store.setMultiplayerPhase("won");
      store.setGameResult("won");
      store.setShowResults(true);
      break;

    case "turn_timeout":
      store.setIsMyTurn(message.currentTurn === store.multiplayer.playerId);
      store.setTurnTimeLeft(60);
      break;

    case "opponent_disconnected":
      console.log("Opponent disconnected");
      store.setMultiplayerPhase("won");
      break;

    case "rematch_requested":
      store.setShowResults(true);
      store.setRematchRequested(true);
      break;

    case "rematch_accepted":
      store.setMySecretCode([]);
      store.setOpponentSecretCode([]);
      store.setRematchRequested(false);
      store.setShowResults(false);
      useNumberGame.setState((state) => ({
        multiplayer: {
          ...state.multiplayer,
          currentGuess: [],
          attempts: [],
          opponentAttempts: [],
          phase: "playing",
          isMyTurn: false,
          turnTimeLeft: 60,
          firstWinnerId: null,
          firstWinnerAttempts: 0,
          gameResult: "pending",
          pendingWin: false,
          pendingWinMessage: "",
          opponentStatus: "لم يفز الخصم بعد",
          opponentWonFirst: false,
          turnTimerActive: true,
          showOpponentAttempts: false,
          playersGaming: [],
          startTime: 0,
          endTime: null,
          challengeStatus: "accepted",
        },
      }));
      break;

    case "settings_updated":
      store.setMultiplayerSettings(message.settings);
      break;

    case "error":
      console.error("Server error:", message.message);
      // If we get an error (like room not found), clear the bad session and reset all multiplayer state
      clearSession();
      store.setIsConnecting(false);
      store.resetMultiplayer();
      store.setOpponentId(null);
      store.setOpponentName("");
      store.setChallengeStatus("none");
      store.setMySecretCode([]);
      store.setMode("menu");
      break;

    default:
      console.log("Unknown message type:", message.type);
  }
};
