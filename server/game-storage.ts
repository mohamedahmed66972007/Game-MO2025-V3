import { WebSocket } from "ws";
import { nanoid } from "nanoid";

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  isReady: boolean;
  score: number;
  sessionToken: string;
  ws: WebSocket | null;
  disconnectTime?: number;
  timeoutHandle?: NodeJS.Timeout;
}

export interface PlayerAttempt {
  guess: number[];
  correctCount: number;
  correctPositionCount: number;
  timestamp: number;
}

export interface PlayerGameData {
  playerId: string;
  playerName: string;
  attempts: PlayerAttempt[];
  startTime: number;
  endTime: number | null;
  won: boolean;
  finished: boolean;
}

export interface RematchVote {
  playerId: string;
  accepted: boolean;
}

export interface CardSettings {
  roundDuration: number;
  maxCards?: number;
  revealNumberShowPosition?: boolean;
  burnNumberCount?: number;
  revealParitySlots?: number;
  freezeDuration?: number;
  shieldDuration?: number;
}

export interface RoomSettings {
  numDigits: number;
  maxAttempts: number;
  cardsEnabled?: boolean;
  cardSettings?: CardSettings;
  selectedChallenge?: string;
  allowedCards?: string[];
}

export interface GameSession {
  sharedSecret: number[];
  status: "waiting" | "pre_game_challenge" | "playing" | "finished";
  players: Map<string, PlayerGameData>;
  startTime: number;
  endTime: number | null;
  gameTimerHandle?: NodeJS.Timeout;
  challengesCompleted: Set<string>;
  lastResults?: {
    winners: any[];
    losers: any[];
    stillPlaying: any[];
    reason: string;
  };
  rematchState: {
    requested: boolean;
    votes: Map<string, boolean>;
    countdown: number | null;
    countdownHandle?: NodeJS.Timeout;
  };
}

export interface Room {
  id: string;
  hostId: string;
  players: Player[];
  game: GameSession | null;
  settings: RoomSettings;
  phase: "lobby" | "playing" | "finished";
  createdAt: number;
  roomTimeoutHandle?: NodeJS.Timeout;
}

const rooms = new Map<string, Room>();
const clients = new Map<string, WebSocket>();
const playerConnections = new Map<WebSocket, string>();

export function generateRoomId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generatePlayerId(): string {
  return nanoid(16);
}

export function generateSessionToken(): string {
  return nanoid(32);
}

export function createRoom(playerName: string, gameMode?: string): { room: Room; playerId: string; sessionToken: string } {
  const roomId = generateRoomId();
  const playerId = generatePlayerId();
  const sessionToken = generateSessionToken();

  const player: Player = {
    id: playerId,
    name: playerName,
    isHost: true,
    isReady: false,
    score: 0,
    sessionToken,
    ws: null,
    disconnectTime: undefined,
    timeoutHandle: undefined,
  };

  const room: Room = {
    id: roomId,
    hostId: playerId,
    players: [player],
    game: null,
    settings: {
      numDigits: 4,
      maxAttempts: 20,
      cardsEnabled: false,
      selectedChallenge: "random",
      allowedCards: ["revealNumber", "burnNumber", "revealParity", "freeze", "shield"],
      cardSettings: {
        roundDuration: 5,
        maxCards: 3,
        revealNumberShowPosition: true,
        burnNumberCount: 1,
        revealParitySlots: 2,
        freezeDuration: 5000,
        shieldDuration: 5000,
      },
    },
    phase: "lobby",
    createdAt: Date.now(),
  };

  rooms.set(roomId, room);
  console.log(`[game-storage] Room created: ${roomId} by ${playerName} (${playerId})`);

  return { room, playerId, sessionToken };
}

export function joinRoom(playerName: string, roomCode: string): { room: Room; playerId: string; sessionToken: string } | { error: string } {
  const room = rooms.get(roomCode);

  if (!room) {
    return { error: "الغرفة غير موجودة" };
  }

  if (room.players.length >= 10) {
    return { error: "الغرفة ممتلئة" };
  }

  if (room.game && room.game.status === "playing") {
    return { error: "اللعبة جارية الآن - لا يمكن الانضمام" };
  }

  if (room.game && room.game.status === "finished") {
    return { error: "انتهت اللعبة - يرجى إنشاء غرفة جديدة" };
  }

  const playerId = generatePlayerId();
  const sessionToken = generateSessionToken();

  const player: Player = {
    id: playerId,
    name: playerName,
    isHost: false,
    isReady: false,
    score: 0,
    sessionToken,
    ws: null,
    disconnectTime: undefined,
    timeoutHandle: undefined,
  };

  room.players.push(player);
  console.log(`[game-storage] Player ${playerName} (${playerId}) joined room ${roomCode}`);

  return { room, playerId, sessionToken };
}

export function reconnectPlayer(sessionToken: string, roomCode: string): { room: Room; player: Player } | { error: string } {
  const room = rooms.get(roomCode);

  if (!room) {
    return { error: "الغرفة غير موجودة" };
  }

  const player = room.players.find((p) => p.sessionToken === sessionToken);

  if (!player) {
    return { error: "جلسة غير صالحة أو انتهت صلاحيتها" };
  }

  if (player.timeoutHandle) {
    clearTimeout(player.timeoutHandle);
    player.timeoutHandle = undefined;
  }
  player.disconnectTime = undefined;

  console.log(`[game-storage] Player ${player.name} (${player.id}) reconnected to room ${roomCode}`);

  return { room, player };
}

export function getRoom(roomId: string): Room | undefined {
  return rooms.get(roomId);
}

export function getPlayerByWs(ws: WebSocket): { room: Room; player: Player } | undefined {
  const playerId = playerConnections.get(ws);
  if (!playerId) return undefined;

  const roomsArray = Array.from(rooms.values());
  for (const room of roomsArray) {
    const player = room.players.find((p: Player) => p.id === playerId);
    if (player) {
      return { room, player };
    }
  }
  return undefined;
}

export function getPlayerById(playerId: string): { room: Room; player: Player } | undefined {
  const roomsArray = Array.from(rooms.values());
  for (const room of roomsArray) {
    const player = room.players.find((p: Player) => p.id === playerId);
    if (player) {
      return { room, player };
    }
  }
  return undefined;
}

export function setPlayerConnection(playerId: string, ws: WebSocket): void {
  clients.set(playerId, ws);
  playerConnections.set(ws, playerId);
}

export function getPlayerConnection(playerId: string): WebSocket | undefined {
  return clients.get(playerId);
}

export function removePlayerConnection(ws: WebSocket): string | undefined {
  const playerId = playerConnections.get(ws);
  if (playerId) {
    playerConnections.delete(ws);
    clients.delete(playerId);
  }
  return playerId;
}

export function markPlayerDisconnected(playerId: string, onTimeout: () => void): void {
  const result = getPlayerById(playerId);
  if (!result) return;

  const { room, player } = result;
  player.disconnectTime = Date.now();
  player.ws = null;

  player.timeoutHandle = setTimeout(() => {
    onTimeout();
  }, 5 * 60 * 1000);

  console.log(`[game-storage] Player ${player.name} marked as disconnected in room ${room.id}`);
}

export function removePlayer(playerId: string): { room: Room; removedPlayer: Player } | undefined {
  const roomsArray = Array.from(rooms.values());
  for (const room of roomsArray) {
    const playerIndex = room.players.findIndex((p: Player) => p.id === playerId);
    if (playerIndex !== -1) {
      const [removedPlayer] = room.players.splice(playerIndex, 1);

      if (removedPlayer.timeoutHandle) {
        clearTimeout(removedPlayer.timeoutHandle);
      }

      if (removedPlayer.isHost && room.players.length > 0) {
        room.players[0].isHost = true;
        room.hostId = room.players[0].id;
      }

      if (room.players.length === 0) {
        rooms.delete(room.id);
        console.log(`[game-storage] Room ${room.id} deleted (no players)`);
      }

      console.log(`[game-storage] Player ${removedPlayer.name} removed from room ${room.id}`);
      return { room, removedPlayer };
    }
  }
  return undefined;
}

export function transferHost(roomId: string, currentHostId: string, newHostId: string): { success: boolean; error?: string } {
  const room = rooms.get(roomId);
  if (!room) {
    return { success: false, error: "الغرفة غير موجودة" };
  }

  if (room.hostId !== currentHostId) {
    return { success: false, error: "فقط المضيف يمكنه نقل القيادة" };
  }

  const currentHost = room.players.find((p) => p.id === currentHostId);
  const newHost = room.players.find((p) => p.id === newHostId);

  if (!newHost) {
    return { success: false, error: "اللاعب غير موجود" };
  }

  if (currentHost) {
    currentHost.isHost = false;
  }
  newHost.isHost = true;
  room.hostId = newHostId;

  console.log(`[game-storage] Host transferred from ${currentHostId} to ${newHostId} in room ${roomId}`);
  return { success: true };
}

export function kickPlayer(roomId: string, hostId: string, targetPlayerId: string): { success: boolean; error?: string; kickedPlayer?: Player } {
  const room = rooms.get(roomId);
  if (!room) {
    return { success: false, error: "الغرفة غير موجودة" };
  }

  if (room.hostId !== hostId) {
    return { success: false, error: "فقط المضيف يمكنه طرد اللاعبين" };
  }

  if (hostId === targetPlayerId) {
    return { success: false, error: "لا يمكن للمضيف طرد نفسه" };
  }

  const playerIndex = room.players.findIndex((p) => p.id === targetPlayerId);
  if (playerIndex === -1) {
    return { success: false, error: "اللاعب غير موجود" };
  }

  const [kickedPlayer] = room.players.splice(playerIndex, 1);

  if (kickedPlayer.timeoutHandle) {
    clearTimeout(kickedPlayer.timeoutHandle);
  }

  const ws = clients.get(targetPlayerId);
  if (ws) {
    clients.delete(targetPlayerId);
    playerConnections.delete(ws);
  }

  console.log(`[game-storage] Player ${kickedPlayer.name} kicked from room ${roomId}`);
  return { success: true, kickedPlayer };
}

export function updateRoomSettings(roomId: string, hostId: string, settings: Partial<RoomSettings>): { success: boolean; error?: string } {
  const room = rooms.get(roomId);
  if (!room) {
    return { success: false, error: "الغرفة غير موجودة" };
  }

  if (room.hostId !== hostId) {
    return { success: false, error: "فقط المضيف يمكنه تعديل الإعدادات" };
  }

  if (room.game && room.game.status === "playing") {
    return { success: false, error: "لا يمكن تعديل الإعدادات أثناء اللعب" };
  }

  room.settings = {
    ...room.settings,
    ...settings,
    cardSettings: settings.cardSettings
      ? { ...room.settings.cardSettings, ...settings.cardSettings }
      : room.settings.cardSettings,
  };

  console.log(`[game-storage] Settings updated for room ${roomId}`);
  return { success: true };
}

export function togglePlayerReady(roomId: string, playerId: string): boolean {
  const room = rooms.get(roomId);
  if (!room) return false;

  const player = room.players.find((p) => p.id === playerId);
  if (!player) return false;

  player.isReady = !player.isReady;
  return player.isReady;
}

export function getReadyPlayers(roomId: string): string[] {
  const room = rooms.get(roomId);
  if (!room) return [];
  return room.players.filter((p) => p.isReady).map((p) => p.id);
}

export function clearAllReadyStates(roomId: string): void {
  const room = rooms.get(roomId);
  if (!room) return;
  room.players.forEach((p) => {
    p.isReady = false;
  });
}

export function sendToPlayer(playerId: string, message: object): boolean {
  const ws = clients.get(playerId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
    return true;
  }
  return false;
}

export function broadcastToRoom(roomId: string, message: object, excludePlayerId?: string): void {
  const room = rooms.get(roomId);
  if (!room) return;

  room.players.forEach((player) => {
    if (excludePlayerId && player.id === excludePlayerId) return;
    const client = clients.get(player.id);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

export function getRoomPlayers(roomId: string): { id: string; name: string; isHost: boolean; isReady: boolean }[] {
  const room = rooms.get(roomId);
  if (!room) return [];
  return room.players.map((p) => ({
    id: p.id,
    name: p.name,
    isHost: p.isHost,
    isReady: p.isReady,
  }));
}

export function deleteRoom(roomId: string): void {
  const room = rooms.get(roomId);
  if (!room) return;

  room.players.forEach((p) => {
    if (p.timeoutHandle) {
      clearTimeout(p.timeoutHandle);
    }
  });

  if (room.game?.gameTimerHandle) {
    clearTimeout(room.game.gameTimerHandle);
  }
  if (room.game?.rematchState?.countdownHandle) {
    clearTimeout(room.game.rematchState.countdownHandle);
  }
  if (room.roomTimeoutHandle) {
    clearTimeout(room.roomTimeoutHandle);
  }

  rooms.delete(roomId);
  console.log(`[game-storage] Room ${roomId} deleted`);
}

export { rooms, clients, playerConnections };
