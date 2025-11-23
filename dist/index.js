// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
var rooms = /* @__PURE__ */ new Map();
var players = /* @__PURE__ */ new Map();
function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}
function generatePlayerId() {
  return Math.random().toString(36).substring(2, 15);
}
function checkGuess(secret, guess) {
  let correctCount = 0;
  let correctPositionCount = 0;
  const secretCopy = [...secret];
  const guessCopy = [...guess];
  const length = Math.min(secret.length, guess.length);
  for (let i = 0; i < length; i++) {
    if (guessCopy[i] === secretCopy[i]) {
      correctPositionCount++;
      secretCopy[i] = -1;
      guessCopy[i] = -2;
    }
  }
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
}
async function registerRoutes(app2) {
  const httpServer = createServer(app2);
  const wss = new WebSocketServer({ noServer: true });
  httpServer.on("upgrade", (request, socket, head) => {
    const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
    if (pathname === "/game") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  });
  wss.on("connection", (ws) => {
    console.log("New game WebSocket connection");
    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        handleMessage(ws, message);
      } catch (error) {
        console.error("Error parsing message:", error);
      }
    });
    ws.on("close", () => {
      const player = players.get(ws);
      if (player) {
        const room = rooms.get(player.roomId);
        if (room) {
          room.players = room.players.filter((p) => p.id !== player.id);
          if (room.players.length === 0) {
            rooms.delete(player.roomId);
          } else {
            broadcastToRoom(room, {
              type: "players_updated",
              players: room.players.map((p) => ({ id: p.id, name: p.name }))
            });
          }
        }
        players.delete(ws);
      }
    });
  });
  function setTurnTimeout(game, turnPlayer, opponentPlayer) {
    if (game.turnTimeoutHandle) {
      clearTimeout(game.turnTimeoutHandle);
    }
    game.turnTimeoutHandle = setTimeout(() => {
      if (!game.attempts.has(turnPlayer.id)) {
        game.attempts.set(turnPlayer.id, []);
      }
      const playerAttempts = game.attempts.get(turnPlayer.id);
      const emptyAttempt = {
        guess: [],
        correctCount: 0,
        correctPositionCount: 0
      };
      playerAttempts.push(emptyAttempt);
      const totalPlayerAttempts = playerAttempts.length;
      send(turnPlayer.ws, {
        type: "guess_result",
        playerId: turnPlayer.id,
        guess: [],
        correctCount: 0,
        correctPositionCount: 0,
        won: false,
        nextTurn: opponentPlayer.id
      });
      send(opponentPlayer.ws, {
        type: "guess_result",
        playerId: turnPlayer.id,
        guess: [],
        correctCount: 0,
        correctPositionCount: 0,
        won: false,
        nextTurn: opponentPlayer.id
      });
      if (game.turnTimeoutHandle) {
        clearTimeout(game.turnTimeoutHandle);
        game.turnTimeoutHandle = void 0;
      }
      if (game.firstWinnerId) {
        const opponentAttempts = game.attempts.get(opponentPlayer.id)?.length ?? 0;
        if (turnPlayer.id !== game.firstWinnerId && totalPlayerAttempts > game.firstWinnerAttempts) {
          const firstWinnerPlayer = game.player1.id === game.firstWinnerId ? game.player1 : game.player2;
          const loserPlayer = game.player1.id === turnPlayer.id ? game.player1 : game.player2;
          send(firstWinnerPlayer.ws, {
            type: "game_result",
            result: "won",
            message: "\u0644\u0642\u062F \u0641\u0632\u062A",
            opponentSecret: game.secretCodes.get(turnPlayer.id),
            yourAttempts: game.firstWinnerAttempts,
            opponentAttempts: totalPlayerAttempts
          });
          send(loserPlayer.ws, {
            type: "game_result",
            result: "lost",
            message: "\u0644\u0642\u062F \u062E\u0633\u0631\u062A",
            opponentSecret: game.secretCodes.get(firstWinnerPlayer.id),
            yourAttempts: totalPlayerAttempts,
            opponentAttempts: game.firstWinnerAttempts
          });
          return;
        } else if (turnPlayer.id === game.firstWinnerId && opponentAttempts > game.firstWinnerAttempts) {
          const firstWinnerPlayer = game.player1.id === game.firstWinnerId ? game.player1 : game.player2;
          const loserPlayer = game.player1.id === opponentPlayer.id ? game.player1 : game.player2;
          send(firstWinnerPlayer.ws, {
            type: "game_result",
            result: "won",
            message: "\u0644\u0642\u062F \u0641\u0632\u062A",
            opponentSecret: game.secretCodes.get(opponentPlayer.id),
            yourAttempts: game.firstWinnerAttempts,
            opponentAttempts
          });
          send(loserPlayer.ws, {
            type: "game_result",
            result: "lost",
            message: "\u0644\u0642\u062F \u062E\u0633\u0631\u062A",
            opponentSecret: game.secretCodes.get(firstWinnerPlayer.id),
            yourAttempts: opponentAttempts,
            opponentAttempts: game.firstWinnerAttempts
          });
          return;
        }
        if (totalPlayerAttempts < game.firstWinnerAttempts) {
          game.currentTurn = opponentPlayer.id;
          game.turnStartTime = Date.now();
          setTurnTimeout(game, opponentPlayer, turnPlayer);
        }
      } else {
        game.currentTurn = opponentPlayer.id;
        game.turnStartTime = Date.now();
        setTurnTimeout(game, opponentPlayer, turnPlayer);
      }
    }, 6e4);
  }
  function handleMessage(ws, message) {
    switch (message.type) {
      case "create_room": {
        const roomId = generateRoomId();
        const playerId = generatePlayerId();
        const player = {
          id: playerId,
          name: message.playerName,
          ws,
          roomId
        };
        const room = {
          id: roomId,
          players: [player],
          games: /* @__PURE__ */ new Map(),
          settings: { numDigits: 4, maxAttempts: 20 }
        };
        rooms.set(roomId, room);
        players.set(ws, player);
        send(ws, {
          type: "room_created",
          roomId,
          playerId
        });
        break;
      }
      case "join_room": {
        const room = rooms.get(message.roomId);
        if (room && room.players.length < 10) {
          const playerId = generatePlayerId();
          const player = {
            id: playerId,
            name: message.playerName,
            ws,
            roomId: room.id
          };
          room.players.push(player);
          players.set(ws, player);
          send(ws, {
            type: "room_joined",
            roomId: room.id,
            playerId,
            players: room.players.map((p) => ({ id: p.id, name: p.name }))
          });
          send(ws, {
            type: "settings_updated",
            settings: room.settings
          });
          broadcastToRoom(room, {
            type: "players_updated",
            players: room.players.map((p) => ({ id: p.id, name: p.name }))
          });
        } else {
          send(ws, { type: "error", message: "Room not found or full" });
        }
        break;
      }
      case "challenge_player": {
        const player = players.get(ws);
        if (!player) return;
        const room = rooms.get(player.roomId);
        if (!room) return;
        const opponent = room.players.find((p) => p.id === message.opponentId);
        if (opponent) {
          send(opponent.ws, {
            type: "challenge_received",
            fromPlayerId: player.id,
            fromPlayerName: player.name
          });
        }
        break;
      }
      case "accept_challenge": {
        const player = players.get(ws);
        if (!player) return;
        const room = rooms.get(player.roomId);
        if (!room) return;
        const opponent = room.players.find((p) => p.id === message.opponentId);
        if (opponent) {
          send(opponent.ws, {
            type: "challenge_accepted",
            opponentId: player.id,
            opponentName: player.name
          });
          send(ws, {
            type: "challenge_accepted",
            opponentId: opponent.id,
            opponentName: opponent.name
          });
        }
        break;
      }
      case "reject_challenge": {
        const player = players.get(ws);
        if (!player) return;
        const room = rooms.get(player.roomId);
        if (!room) return;
        const opponent = room.players.find((p) => p.id === message.opponentId);
        if (opponent) {
          send(opponent.ws, {
            type: "challenge_rejected",
            opponentId: player.id,
            opponentName: player.name,
            message: "\u0631\u0641\u0636 \u0627\u0644\u062E\u0635\u0645 \u0627\u0644\u062A\u062D\u062F\u064A"
          });
          send(ws, {
            type: "challenge_cleared"
          });
        }
        break;
      }
      case "update_settings": {
        const player = players.get(ws);
        if (!player) return;
        const room = rooms.get(player.roomId);
        if (!room) return;
        room.settings = message.settings;
        room.games.forEach((game) => {
          game.secretCodes.clear();
          game.attempts.clear();
          game.firstWinnerId = null;
          game.firstWinnerAttempts = 0;
        });
        broadcastToRoom(room, {
          type: "settings_updated",
          settings: message.settings
        });
        break;
      }
      case "set_secret_code": {
        const player = players.get(ws);
        if (!player) return;
        const room = rooms.get(player.roomId);
        if (!room) return;
        const opponent = room.players.find((p) => p.id === message.opponentId);
        if (!opponent) return;
        const gameKey = [player.id, opponent.id].sort().join("-");
        let game = room.games.get(gameKey);
        if (!game) {
          game = {
            player1: player,
            player2: opponent,
            secretCodes: /* @__PURE__ */ new Map(),
            attempts: /* @__PURE__ */ new Map(),
            currentTurn: player.id,
            turnStartTime: Date.now(),
            firstWinnerId: null,
            firstWinnerAttempts: 0
          };
          room.games.set(gameKey, game);
        }
        game.secretCodes.set(player.id, message.code);
        if (game.secretCodes.size === 2) {
          const firstPlayer = Math.random() < 0.5 ? player.id : opponent.id;
          game.currentTurn = firstPlayer;
          game.turnStartTime = Date.now();
          send(player.ws, {
            type: "game_started",
            firstPlayerId: firstPlayer
          });
          send(opponent.ws, {
            type: "game_started",
            firstPlayerId: firstPlayer
          });
          broadcastToRoom(room, {
            type: "players_gaming",
            player1Id: player.id,
            player1Name: player.name,
            player2Id: opponent.id,
            player2Name: opponent.name
          });
          const turnPlayer = game.player1.id === firstPlayer ? game.player1 : game.player2;
          const opponentPlayer = game.player1.id === firstPlayer ? game.player2 : game.player1;
          setTurnTimeout(game, turnPlayer, opponentPlayer);
        }
        break;
      }
      case "submit_guess": {
        const player = players.get(ws);
        if (!player) return;
        const room = rooms.get(player.roomId);
        if (!room) return;
        const opponent = room.players.find((p) => p.id === message.opponentId);
        if (!opponent) return;
        const gameKey = [player.id, opponent.id].sort().join("-");
        const game = room.games.get(gameKey);
        if (!game) return;
        if (game.currentTurn !== player.id) {
          send(ws, { type: "error", message: "Not your turn" });
          return;
        }
        const opponentSecret = game.secretCodes.get(opponent.id);
        if (!opponentSecret) return;
        const { correctCount, correctPositionCount } = checkGuess(opponentSecret, message.guess);
        if (!game.attempts.has(player.id)) {
          game.attempts.set(player.id, []);
        }
        game.attempts.get(player.id).push({
          guess: message.guess,
          correctCount,
          correctPositionCount
        });
        const won = correctPositionCount === room.settings.numDigits;
        const playerAttempts = game.attempts.get(player.id).length;
        const opponentAttempts = game.attempts.get(opponent.id)?.length ?? 0;
        if (game.turnTimeoutHandle) {
          clearTimeout(game.turnTimeoutHandle);
          game.turnTimeoutHandle = void 0;
        }
        send(player.ws, {
          type: "guess_result",
          playerId: player.id,
          guess: message.guess,
          correctCount,
          correctPositionCount,
          won,
          nextTurn: opponent.id,
          opponentSecret: won ? opponentSecret : void 0
        });
        send(opponent.ws, {
          type: "guess_result",
          playerId: player.id,
          guess: message.guess,
          correctCount,
          correctPositionCount,
          won,
          nextTurn: opponent.id,
          opponentSecret: won ? game.secretCodes.get(player.id) : void 0
        });
        if (won) {
          if (!game.firstWinnerId) {
            game.firstWinnerId = player.id;
            game.firstWinnerAttempts = playerAttempts;
            send(player.ws, {
              type: "first_winner_pending",
              won: true,
              message: "\u0644\u0642\u062F \u062E\u0645\u0646\u062A \u0627\u0644\u0631\u0642\u0645 \u0627\u0644\u0633\u0631\u064A \u0628\u0634\u0643\u0644 \u0635\u062D\u064A\u062D \u0648\u0644\u0643\u0646 \u0644\u0646 \u062A\u0641\u0648\u0632 \u062D\u062A\u0649 \u064A\u0623\u062E\u0630 \u062E\u0635\u0645\u0643 \u0641\u0631\u0635\u062A\u0647 \u0627\u0644\u0623\u062E\u064A\u0631\u0647",
              playerAttempts,
              opponentAttempts,
              opponentSecret
            });
            send(opponent.ws, {
              type: "opponent_won_first",
              message: "\u0627\u0644\u062E\u0635\u0645 \u0641\u0627\u0632 \u2014 \u0648\u0647\u0630\u0647 \u0622\u062E\u0631 \u0645\u062D\u0627\u0648\u0644\u0629 \u0644\u0643",
              opponentAttempts: playerAttempts,
              yourAttempts: opponentAttempts,
              turnsLeft: playerAttempts - opponentAttempts
            });
            const turnsLeft = game.firstWinnerAttempts - opponentAttempts;
            if (turnsLeft > 0) {
              game.currentTurn = opponent.id;
              game.turnStartTime = Date.now();
              setTurnTimeout(game, opponent, player);
            } else {
              if (game.turnTimeoutHandle) {
                clearTimeout(game.turnTimeoutHandle);
                game.turnTimeoutHandle = void 0;
              }
              const firstWinnerPlayer = game.player1.id === player.id ? game.player1 : game.player2;
              const loserPlayer = game.player1.id === player.id ? game.player2 : game.player1;
              send(firstWinnerPlayer.ws, {
                type: "game_result",
                result: "won",
                message: "\u0644\u0642\u062F \u0641\u0632\u062A",
                opponentSecret: game.secretCodes.get(opponent.id),
                yourAttempts: playerAttempts,
                opponentAttempts
              });
              send(loserPlayer.ws, {
                type: "game_result",
                result: "lost",
                message: "\u0644\u0642\u062F \u062E\u0633\u0631\u062A",
                opponentSecret: game.secretCodes.get(player.id),
                yourAttempts: opponentAttempts,
                opponentAttempts: playerAttempts
              });
            }
          } else if (player.id !== game.firstWinnerId) {
            if (game.turnTimeoutHandle) {
              clearTimeout(game.turnTimeoutHandle);
              game.turnTimeoutHandle = void 0;
            }
            const firstWinnerPlayer = game.player1.id === game.firstWinnerId ? game.player1 : game.player2;
            const secondWinnerPlayer = game.player1.id === player.id ? game.player1 : game.player2;
            send(firstWinnerPlayer.ws, {
              type: "game_result",
              result: "tie",
              message: "\u062A\u0639\u0627\u062F\u0644",
              opponentSecret: game.secretCodes.get(player.id),
              yourAttempts: game.firstWinnerAttempts,
              opponentAttempts: playerAttempts
            });
            send(secondWinnerPlayer.ws, {
              type: "game_result",
              result: "tie",
              message: "\u062A\u0639\u0627\u062F\u0644",
              opponentSecret: game.secretCodes.get(game.firstWinnerId),
              yourAttempts: playerAttempts,
              opponentAttempts: game.firstWinnerAttempts
            });
          }
        } else {
          if (game.firstWinnerId && player.id !== game.firstWinnerId) {
            if (playerAttempts >= game.firstWinnerAttempts) {
              if (game.turnTimeoutHandle) {
                clearTimeout(game.turnTimeoutHandle);
                game.turnTimeoutHandle = void 0;
              }
              const firstWinnerPlayer = game.player1.id === game.firstWinnerId ? game.player1 : game.player2;
              const loserPlayer = game.player1.id === player.id ? game.player1 : game.player2;
              send(firstWinnerPlayer.ws, {
                type: "game_result",
                result: "won",
                message: "\u0644\u0642\u062F \u0641\u0632\u062A",
                opponentSecret: game.secretCodes.get(player.id),
                yourAttempts: game.firstWinnerAttempts,
                opponentAttempts: playerAttempts
              });
              send(loserPlayer.ws, {
                type: "game_result",
                result: "lost",
                message: "\u0644\u0642\u062F \u062E\u0633\u0631\u062A",
                opponentSecret: game.secretCodes.get(firstWinnerPlayer.id),
                yourAttempts: playerAttempts,
                opponentAttempts: game.firstWinnerAttempts
              });
            } else {
              game.currentTurn = opponent.id;
              game.turnStartTime = Date.now();
              setTurnTimeout(game, opponent, player);
            }
          } else {
            game.currentTurn = opponent.id;
            game.turnStartTime = Date.now();
            setTurnTimeout(game, opponent, player);
            send(player.ws, {
              type: "opponent_status_update",
              opponentWon: false,
              message: "\u0627\u0644\u062E\u0635\u0645 \u0644\u0645 \u064A\u0646\u062A\u0647 \u0628\u0639\u062F \u0645\u0646 \u0645\u062D\u0627\u0648\u0644\u0627\u062A\u0647"
            });
            send(opponent.ws, {
              type: "opponent_status_update",
              opponentWon: false,
              message: "\u0627\u0644\u062E\u0635\u0645 \u0644\u0645 \u064A\u0646\u062A\u0647 \u0628\u0639\u062F \u0645\u0646 \u0645\u062D\u0627\u0648\u0644\u0627\u062A\u0647"
            });
          }
        }
        break;
      }
      case "leave_room": {
        const player = players.get(ws);
        if (!player) return;
        const room = rooms.get(player.roomId);
        if (!room) return;
        const gamesToDelete = [];
        room.games.forEach((game, gameKey) => {
          const isPlayer1 = game.player1.id === player.id;
          const isPlayer2 = game.player2.id === player.id;
          if (isPlayer1 || isPlayer2) {
            const opponent = isPlayer1 ? game.player2 : game.player1;
            send(opponent.ws, {
              type: "game_result",
              result: "won",
              reason: "opponent_quit",
              firstWinnerId: opponent.id,
              firstWinnerAttempts: game.attempts.get(opponent.id)?.length || 0,
              opponentAttempts: 999,
              // Mark as abandoned
              opponentSecret: isPlayer1 ? game.secretCodes.get(game.player2.id) : game.secretCodes.get(game.player1.id)
            });
            gamesToDelete.push(gameKey);
          }
        });
        gamesToDelete.forEach((gameKey) => room.games.delete(gameKey));
        room.players = room.players.filter((p) => p.id !== player.id);
        if (room.players.length === 0) {
          rooms.delete(player.roomId);
        } else {
          broadcastToRoom(room, {
            type: "players_updated",
            players: room.players.map((p) => ({ id: p.id, name: p.name }))
          });
        }
        players.delete(ws);
        break;
      }
      case "opponent_quit": {
        const player = players.get(ws);
        if (!player) return;
        const room = rooms.get(player.roomId);
        if (!room) return;
        const opponent = room.players.find((p) => p.id !== player.id);
        if (!opponent) return;
        send(opponent.ws, {
          type: "opponent_quit",
          message: "\u0627\u0646\u0633\u062D\u0628 \u0627\u0644\u062E\u0635\u0645 \u0645\u0646 \u0627\u0644\u0644\u0639\u0628\u0629"
        });
        break;
      }
      case "request_rematch": {
        const player = players.get(ws);
        if (!player) return;
        const room = rooms.get(player.roomId);
        if (!room) return;
        const opponent = room.players.find((p) => p.id !== player.id);
        if (!opponent) return;
        send(opponent.ws, {
          type: "rematch_requested",
          fromPlayerId: player.id,
          fromPlayerName: player.name
        });
        break;
      }
      case "accept_rematch": {
        const player = players.get(ws);
        if (!player) return;
        const room = rooms.get(player.roomId);
        if (!room) return;
        const opponent = room.players.find((p) => p.id !== player.id);
        if (!opponent) return;
        send(player.ws, {
          type: "rematch_accepted"
        });
        send(opponent.ws, {
          type: "rematch_accepted"
        });
        const gameKey = [player.id, opponent.id].sort().join("-");
        room.games.delete(gameKey);
        break;
      }
    }
  }
  function send(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }
  function broadcastToRoom(room, message, exclude) {
    room.players.forEach((player) => {
      if (player.ws !== exclude) {
        send(player.ws, message);
      }
    });
  }
  function finalizeGame(game, firstWinner, secondPlayer, firstWinnerAttempts, secondPlayerAttempts) {
    let result;
    if (firstWinnerAttempts < secondPlayerAttempts) {
      result = "won";
    } else if (firstWinnerAttempts === secondPlayerAttempts) {
      result = "won";
    } else {
      result = "lost";
    }
    send(firstWinner.ws, {
      type: "game_result",
      result,
      firstWinnerId: game.firstWinnerId,
      firstWinnerAttempts,
      opponentAttempts: secondPlayerAttempts,
      opponentSecret: secondPlayer.id === game.player2.id ? game.secretCodes.get(game.player2.id) : game.secretCodes.get(game.player1.id)
    });
    send(secondPlayer.ws, {
      type: "game_result",
      result: result === "won" ? "lost" : result === "lost" ? "won" : "tie",
      firstWinnerId: game.firstWinnerId,
      firstWinnerAttempts,
      opponentAttempts: firstWinnerAttempts,
      opponentSecret: firstWinner.id === game.player2.id ? game.secretCodes.get(game.player2.id) : game.secretCodes.get(game.player1.id)
    });
  }
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2, { dirname as dirname2 } from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path, { dirname } from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "url";
import glsl from "vite-plugin-glsl";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    glsl()
    // Add GLSL shader support
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared")
    }
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    host: "0.0.0.0",
    port: 5e3,
    strictPort: true,
    hmr: {
      clientPort: 443
    },
    allowedHosts: true
  },
  preview: {
    host: "0.0.0.0",
    port: 5e3
  },
  // Add support for large models and audio files
  assetsInclude: ["**/*.gltf", "**/*.glb", "**/*.mp3", "**/*.ogg", "**/*.wav"]
});

// server/vite.ts
import { nanoid } from "nanoid";
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = dirname2(__filename2);
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        __dirname2,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(__dirname2, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5e3;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
