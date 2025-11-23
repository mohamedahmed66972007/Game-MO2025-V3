import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { useChallenge } from "./useChallenge";

export type GameMode = "menu" | "singleplayer" | "multiplayer";
export type GamePhase = "playing" | "won" | "lost";

interface Attempt {
  guess: number[];
  correctCount: number;
  correctPositionCount: number;
}

interface GameSettings {
  numDigits: number;
  maxAttempts: number;
}

interface SingleplayerState {
  secretCode: number[];
  currentGuess: number[];
  attempts: Attempt[];
  phase: GamePhase;
  startTime: number;
  endTime: number | null;
  settings: GameSettings;
}

interface MultiplayerState {
  roomId: string;
  playerId: string;
  playerName: string;
  players: { id: string; name: string }[];
  opponentId: string | null;
  opponentName: string;
  playersGaming: { player1Id: string; player1Name: string; player2Id: string; player2Name: string }[];
  mySecretCode: number[];
  opponentSecretCode: number[];
  currentGuess: number[];
  attempts: Attempt[];
  opponentAttempts: Attempt[];
  phase: GamePhase;
  isMyTurn: boolean;
  turnTimeLeft: number;
  challengeStatus: "none" | "sent" | "received" | "accepted";
  isChallengeSender: boolean;
  startTime: number;
  endTime: number | null;
  firstWinnerId: string | null;
  firstWinnerAttempts: number;
  gameResult: "pending" | "won" | "lost" | "tie";
  rematchRequested: boolean;
  pendingWin: boolean;
  pendingWinMessage: string;
  opponentStatus: string;
  opponentWonFirst: boolean;
  showResults: boolean;
  turnTimerActive: boolean;
  showOpponentAttempts: boolean;
  settings: GameSettings;
}

interface NumberGameState {
  mode: GameMode;
  isConnecting: boolean;
  singleplayer: SingleplayerState;
  multiplayer: MultiplayerState;

  // Mode actions
  setMode: (mode: GameMode) => void;
  setIsConnecting: (isConnecting: boolean) => void;

  // Singleplayer actions
  startSingleplayer: (settings: GameSettings) => void;
  addDigitToGuess: (digit: number) => void;
  deleteLastDigit: () => void;
  submitGuess: () => void;
  restartSingleplayer: () => void;
  setSingleplayerSettings: (settings: GameSettings) => void;

  // Multiplayer actions
  setRoomId: (roomId: string) => void;
  setPlayerId: (playerId: string) => void;
  setPlayerName: (name: string) => void;
  setPlayers: (players: { id: string; name: string }[]) => void;
  setOpponentId: (opponentId: string | null) => void;
  setOpponentName: (name: string) => void;
  setPlayersGaming: (playersGaming: { player1Id: string; player1Name: string; player2Id: string; player2Name: string }[]) => void;
  setMySecretCode: (code: number[]) => void;
  setOpponentSecretCode: (code: number[]) => void;
  addMultiplayerDigit: (digit: number) => void;
  deleteMultiplayerDigit: () => void;
  submitMultiplayerGuess: () => void;
  setChallengeStatus: (status: "none" | "sent" | "received" | "accepted") => void;
  setIsChallengeSender: (isChallengeSender: boolean) => void;
  setIsMyTurn: (isMyTurn: boolean) => void;
  setTurnTimeLeft: (time: number) => void;
  addOpponentAttempt: (attempt: Attempt) => void;
  setMultiplayerPhase: (phase: GamePhase) => void;
  setMultiplayerStartTime: () => void;
  setMultiplayerEndTime: () => void;
  setFirstWinner: (firstWinnerId: string, attempts: number) => void;
  setGameResult: (result: "pending" | "won" | "lost" | "tie") => void;
  setRematchRequested: (requested: boolean) => void;
  setPendingWin: (pending: boolean, message: string) => void;
  setOpponentStatus: (status: string, opponentWonFirst: boolean) => void;
  setShowResults: (show: boolean) => void;
  setTurnTimerActive: (active: boolean) => void;
  setShowOpponentAttempts: (show: boolean) => void;
  resetMultiplayer: () => void;
  setMultiplayerSettings: (settings: GameSettings) => void;
}

const generateSecretCode = (numDigits: number = 4): number[] => {
  return Array.from({ length: numDigits }, () => Math.floor(Math.random() * 10));
};

const checkGuess = (secret: number[], guess: number[]): { correctCount: number; correctPositionCount: number } => {
  let correctCount = 0;
  let correctPositionCount = 0;

  const secretCopy = [...secret];
  const guessCopy = [...guess];
  const length = Math.min(secret.length, guess.length);

  // First pass: check correct positions
  for (let i = 0; i < length; i++) {
    if (guessCopy[i] === secretCopy[i]) {
      correctPositionCount++;
      secretCopy[i] = -1;
      guessCopy[i] = -2;
    }
  }

  // Second pass: check correct digits in wrong positions
  for (let i = 0; i < length; i++) {
    if (guessCopy[i] !== -2) {
      const index = secretCopy.indexOf(guessCopy[i]);
      if (index !== -1) {
        correctCount++;
        secretCopy[index] = -1;
      }
    }
  }

  correctCount += correctPositionCount;

  return { correctCount, correctPositionCount };
};

export const useNumberGame = create<NumberGameState>()(
  subscribeWithSelector((set, get) => ({
    mode: "menu",
    isConnecting: false,
    singleplayer: {
      secretCode: [],
      currentGuess: [],
      attempts: [],
      phase: "playing",
      startTime: 0,
      endTime: null,
      settings: { numDigits: 4, maxAttempts: 20 },
    },
    multiplayer: {
      roomId: "",
      playerId: "",
      playerName: "",
      players: [],
      opponentId: null,
      opponentName: "",
      playersGaming: [],
      mySecretCode: [],
      opponentSecretCode: [],
      currentGuess: [],
      attempts: [],
      opponentAttempts: [],
      phase: "playing",
      isMyTurn: false,
      turnTimeLeft: 60,
      challengeStatus: "none",
      isChallengeSender: false,
      startTime: 0,
      endTime: null,
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
      settings: { numDigits: 4, maxAttempts: 20 },
    },

    setMode: (mode) => set({ mode }),
    setIsConnecting: (isConnecting) => set({ isConnecting }),

    startSingleplayer: (settings: GameSettings = { numDigits: 4, maxAttempts: 20 }) => {
      const secretCode = generateSecretCode(settings.numDigits);
      console.log("Secret code generated:", secretCode);
      set({
        mode: "singleplayer",
        singleplayer: {
          secretCode,
          currentGuess: [],
          attempts: [],
          phase: "playing",
          startTime: Date.now(),
          endTime: null,
          settings,
        },
      });
    },

    addDigitToGuess: (digit) => {
      const { singleplayer } = get();
      if (singleplayer.currentGuess.length < singleplayer.settings.numDigits && singleplayer.phase === "playing" && singleplayer.attempts.length < singleplayer.settings.maxAttempts) {
        set({
          singleplayer: {
            ...singleplayer,
            currentGuess: [...singleplayer.currentGuess, digit],
          },
        });
      }
    },

    deleteLastDigit: () => {
      const { singleplayer } = get();
      if (singleplayer.currentGuess.length > 0 && singleplayer.phase === "playing") {
        set({
          singleplayer: {
            ...singleplayer,
            currentGuess: singleplayer.currentGuess.slice(0, -1),
          },
        });
      }
    },

    submitGuess: () => {
      const { singleplayer } = get();
      if (singleplayer.currentGuess.length === singleplayer.settings.numDigits && singleplayer.phase === "playing") {
        const { correctCount, correctPositionCount } = checkGuess(
          singleplayer.secretCode,
          singleplayer.currentGuess
        );

        const newAttempt: Attempt = {
          guess: singleplayer.currentGuess,
          correctCount,
          correctPositionCount,
        };

        const won = correctPositionCount === singleplayer.settings.numDigits;
        const newAttempts = [...singleplayer.attempts, newAttempt];
        const lost = newAttempts.length >= singleplayer.settings.maxAttempts && !won;

        set({
          singleplayer: {
            ...singleplayer,
            attempts: newAttempts,
            currentGuess: [],
            phase: won ? "won" : (lost ? "lost" : "playing"),
            endTime: (won || lost) ? Date.now() : null,
          },
        });
      }
    },

    restartSingleplayer: () => {
      const { singleplayer } = get();
      useChallenge.getState().resetChallenge();
      const newSecretCode = generateSecretCode(singleplayer.settings.numDigits);
      console.log("Secret code generated:", newSecretCode);
      set({
        singleplayer: {
          secretCode: newSecretCode,
          currentGuess: [],
          attempts: [],
          phase: "playing",
          startTime: Date.now(),
          endTime: null,
          settings: singleplayer.settings,
        },
      });
    },

    setSingleplayerSettings: (settings) => set((state) => ({ singleplayer: { ...state.singleplayer, settings } })),

    setRoomId: (roomId) => set((state) => ({ multiplayer: { ...state.multiplayer, roomId } })),
    setPlayerId: (playerId) => set((state) => ({ multiplayer: { ...state.multiplayer, playerId } })),
    setPlayerName: (playerName) => set((state) => ({ multiplayer: { ...state.multiplayer, playerName } })),
    setPlayers: (players) => set((state) => ({ multiplayer: { ...state.multiplayer, players } })),
    setOpponentId: (opponentId) => set((state) => ({ multiplayer: { ...state.multiplayer, opponentId } })),
    setOpponentName: (opponentName) => set((state) => ({ multiplayer: { ...state.multiplayer, opponentName } })),
    setPlayersGaming: (playersGaming) => set((state) => ({ multiplayer: { ...state.multiplayer, playersGaming } })),
    setMySecretCode: (mySecretCode) => set((state) => ({ multiplayer: { ...state.multiplayer, mySecretCode } })),
    setOpponentSecretCode: (opponentSecretCode) => set((state) => ({ multiplayer: { ...state.multiplayer, opponentSecretCode } })),
    setIsChallengeSender: (isChallengeSender) => set((state) => ({ multiplayer: { ...state.multiplayer, isChallengeSender } })),

    addMultiplayerDigit: (digit) => {
      const { multiplayer } = get();
      if (multiplayer.currentGuess.length < multiplayer.settings.numDigits && multiplayer.attempts.length < multiplayer.settings.maxAttempts) {
        set({
          multiplayer: {
            ...multiplayer,
            currentGuess: [...multiplayer.currentGuess, digit],
          },
        });
      }
    },

    deleteMultiplayerDigit: () => {
      const { multiplayer } = get();
      if (multiplayer.currentGuess.length > 0) {
        set({
          multiplayer: {
            ...multiplayer,
            currentGuess: multiplayer.currentGuess.slice(0, -1),
          },
        });
      }
    },

    submitMultiplayerGuess: () => {
      const { multiplayer } = get();
      if (multiplayer.currentGuess.length === multiplayer.settings.numDigits) {
        set({
          multiplayer: {
            ...multiplayer,
            currentGuess: [],
          },
        });
      }
    },

    setChallengeStatus: (challengeStatus) =>
      set((state) => ({ multiplayer: { ...state.multiplayer, challengeStatus } })),
    setIsMyTurn: (isMyTurn) => set((state) => ({ multiplayer: { ...state.multiplayer, isMyTurn } })),
    setTurnTimeLeft: (turnTimeLeft) => set((state) => ({ multiplayer: { ...state.multiplayer, turnTimeLeft } })),
    addOpponentAttempt: (attempt) =>
      set((state) => ({
        multiplayer: { ...state.multiplayer, opponentAttempts: [...state.multiplayer.opponentAttempts, attempt] },
      })),
    setMultiplayerPhase: (phase) => set((state) => ({ multiplayer: { ...state.multiplayer, phase } })),
    setMultiplayerStartTime: () => set((state) => ({ multiplayer: { ...state.multiplayer, startTime: Date.now() } })),
    setMultiplayerEndTime: () => set((state) => ({ multiplayer: { ...state.multiplayer, endTime: Date.now() } })),
    setFirstWinner: (firstWinnerId, attempts) => set((state) => ({ multiplayer: { ...state.multiplayer, firstWinnerId, firstWinnerAttempts: attempts } })),
    setGameResult: (gameResult) => set((state) => ({ multiplayer: { ...state.multiplayer, gameResult } })),
    setRematchRequested: (rematchRequested) => set((state) => ({ multiplayer: { ...state.multiplayer, rematchRequested } })),
    setPendingWin: (pendingWin, pendingWinMessage) => set((state) => ({ multiplayer: { ...state.multiplayer, pendingWin, pendingWinMessage } })),
    setOpponentStatus: (opponentStatus, opponentWonFirst) => set((state) => ({ multiplayer: { ...state.multiplayer, opponentStatus, opponentWonFirst } })),
    setShowResults: (showResults) => set((state) => ({ multiplayer: { ...state.multiplayer, showResults } })),
    setTurnTimerActive: (turnTimerActive) => set((state) => ({ multiplayer: { ...state.multiplayer, turnTimerActive } })),
    setShowOpponentAttempts: (showOpponentAttempts) => set((state) => ({ multiplayer: { ...state.multiplayer, showOpponentAttempts } })),

    resetMultiplayer: () =>
      set((state) => ({
        multiplayer: {
          ...state.multiplayer,
          roomId: "",
          playerId: "",
          currentGuess: [],
          attempts: [],
          opponentAttempts: [],
          phase: "playing",
          isMyTurn: false,
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
          playersGaming: [],
          startTime: 0,
          endTime: null,
          opponentSecretCode: [],
          opponentId: null,
          challengeStatus: "none",
          mySecretCode: [],
        },
      })),
    
    resetMultiplayerGameOnly: () =>
      set((state) => ({
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
          rematchRequested: false,
          pendingWin: false,
          pendingWinMessage: "",
          opponentStatus: "لم يفز الخصم بعد",
          opponentWonFirst: false,
          showResults: false,
          turnTimerActive: true,
          showOpponentAttempts: false,
          playersGaming: [],
          startTime: 0,
          endTime: null,
          opponentSecretCode: [],
        },
      })),

    setMultiplayerSettings: (settings) => set((state) => ({ multiplayer: { ...state.multiplayer, settings } })),
  }))
);
