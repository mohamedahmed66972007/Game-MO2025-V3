import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";

interface Player {
  id: string;
  name: string;
  ws: WebSocket;
  roomId: string;
}

interface Room {
  id: string;
  players: Player[];
  games: Map<string, GameSession>;
  settings: { numDigits: number; maxAttempts: number };
}

interface GameSession {
  player1: Player;
  player2: Player;
  secretCodes: Map<string, number[]>;
  attempts: Map<string, any[]>;
  currentTurn: string;
  turnStartTime: number;
  firstWinnerId: string | null;
  firstWinnerAttempts: number;
  turnTimeoutHandle?: NodeJS.Timeout;
}

const rooms = new Map<string, Room>();
const players = new Map<WebSocket, Player>();

function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function generatePlayerId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function checkGuess(secret: number[], guess: number[]): { correctCount: number; correctPositionCount: number } {
  let correctCount = 0;
  let correctPositionCount = 0;

  const secretCopy = [...secret];
  const guessCopy = [...guess];

  for (let i = 0; i < 4; i++) {
    if (guessCopy[i] === secretCopy[i]) {
      correctPositionCount++;
      secretCopy[i] = -1;
      guessCopy[i] = -2;
    }
  }

  for (let i = 0; i < 4; i++) {
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

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (request, socket, head) => {
    const pathname = new URL(request.url!, `http://${request.headers.host}`).pathname;
    
    if (pathname === "/game") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  });

  wss.on("connection", (ws: WebSocket) => {
    console.log("New game WebSocket connection");

    ws.on("message", (data: Buffer) => {
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
              players: room.players.map((p) => ({ id: p.id, name: p.name })),
            });
          }
        }
        players.delete(ws);
      }
    });
  });

  function setTurnTimeout(game: GameSession, turnPlayer: Player, opponentPlayer: Player) {
    // Clear existing timeout if any
    if (game.turnTimeoutHandle) {
      clearTimeout(game.turnTimeoutHandle);
    }

    // Set a new timeout for 60 seconds
    game.turnTimeoutHandle = setTimeout(() => {
      // Add empty attempt for current player (timeout counts as empty guess)
      if (!game.attempts.has(turnPlayer.id)) {
        game.attempts.set(turnPlayer.id, []);
      }
      
      const playerAttempts = game.attempts.get(turnPlayer.id)!;
      const emptyAttempt = {
        guess: [],
        correctCount: 0,
        correctPositionCount: 0,
      };
      playerAttempts.push(emptyAttempt);
      const totalPlayerAttempts = playerAttempts.length;

      // Send empty attempt to both players
      send(turnPlayer.ws, {
        type: "guess_result",
        playerId: turnPlayer.id,
        guess: [],
        correctCount: 0,
        correctPositionCount: 0,
        won: false,
        nextTurn: opponentPlayer.id,
      });

      send(opponentPlayer.ws, {
        type: "guess_result",
        playerId: turnPlayer.id,
        guess: [],
        correctCount: 0,
        correctPositionCount: 0,
        won: false,
        nextTurn: opponentPlayer.id,
      });

      // Clear timeout handle
      if (game.turnTimeoutHandle) {
        clearTimeout(game.turnTimeoutHandle);
        game.turnTimeoutHandle = undefined;
      }

      // Check if first winner scenario is active
      if (game.firstWinnerId) {
        const opponentAttempts = game.attempts.get(opponentPlayer.id)?.length ?? 0;
        
        // If this timeout was for the player who lost first, check if they've used all attempts
        if (turnPlayer.id !== game.firstWinnerId && totalPlayerAttempts >= game.firstWinnerAttempts) {
          // Opponent (loser) has used all attempts - finalize the game
          const firstWinnerPlayer = game.player1.id === game.firstWinnerId ? game.player1 : game.player2;
          const loserPlayer = game.player1.id === turnPlayer.id ? game.player1 : game.player2;
          
          send(firstWinnerPlayer.ws, {
            type: "game_result",
            result: "won",
            message: "لقد فزت",
            opponentSecret: game.secretCodes.get(turnPlayer.id),
            yourAttempts: game.firstWinnerAttempts,
            opponentAttempts: totalPlayerAttempts,
          });
          send(loserPlayer.ws, {
            type: "game_result",
            result: "lost",
            message: "لقد خسرت",
            opponentSecret: game.secretCodes.get(firstWinnerPlayer.id),
            yourAttempts: totalPlayerAttempts,
            opponentAttempts: game.firstWinnerAttempts,
          });
          return;
        } else if (turnPlayer.id === game.firstWinnerId && opponentAttempts >= game.firstWinnerAttempts) {
          // First winner's turn timed out but opponent already has enough attempts - finalize
          const firstWinnerPlayer = game.player1.id === game.firstWinnerId ? game.player1 : game.player2;
          const loserPlayer = game.player1.id === opponentPlayer.id ? game.player1 : game.player2;
          
          send(firstWinnerPlayer.ws, {
            type: "game_result",
            result: "won",
            message: "لقد فزت",
            opponentSecret: game.secretCodes.get(opponentPlayer.id),
            yourAttempts: game.firstWinnerAttempts,
            opponentAttempts: opponentAttempts,
          });
          send(loserPlayer.ws, {
            type: "game_result",
            result: "lost",
            message: "لقد خسرت",
            opponentSecret: game.secretCodes.get(firstWinnerPlayer.id),
            yourAttempts: opponentAttempts,
            opponentAttempts: game.firstWinnerAttempts,
          });
          return;
        }
        
        // Game still ongoing - continue turn
        if (totalPlayerAttempts < game.firstWinnerAttempts) {
          game.currentTurn = opponentPlayer.id;
          game.turnStartTime = Date.now();
          setTurnTimeout(game, opponentPlayer, turnPlayer);
        }
      } else {
        // No first winner yet - switch turn normally
        game.currentTurn = opponentPlayer.id;
        game.turnStartTime = Date.now();
        setTurnTimeout(game, opponentPlayer, turnPlayer);
      }
    }, 60000); // 60 seconds
  }

  function handleMessage(ws: WebSocket, message: any) {
    switch (message.type) {
      case "create_room": {
        const roomId = generateRoomId();
        const playerId = generatePlayerId();
        const player: Player = {
          id: playerId,
          name: message.playerName,
          ws,
          roomId,
        };

        const room: Room = {
          id: roomId,
          players: [player],
          games: new Map(),
          settings: { numDigits: 4, maxAttempts: 20 },
        };

        rooms.set(roomId, room);
        players.set(ws, player);

        send(ws, {
          type: "room_created",
          roomId,
          playerId,
        });
        break;
      }

      case "join_room": {
        const room = rooms.get(message.roomId);
        if (room && room.players.length < 4) {
          const playerId = generatePlayerId();
          const player: Player = {
            id: playerId,
            name: message.playerName,
            ws,
            roomId: room.id,
          };

          room.players.push(player);
          players.set(ws, player);

          send(ws, {
            type: "room_joined",
            roomId: room.id,
            playerId,
            players: room.players.map((p) => ({ id: p.id, name: p.name })),
          });

          send(ws, {
            type: "settings_updated",
            settings: room.settings,
          });

          broadcastToRoom(room, {
            type: "players_updated",
            players: room.players.map((p) => ({ id: p.id, name: p.name })),
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
            fromPlayerName: player.name,
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
          // Send to the challenge sender (opponent)
          send(opponent.ws, {
            type: "challenge_accepted",
            opponentId: player.id,
            opponentName: player.name,
          });
          // Send to the challenge receiver (current player)
          send(ws, {
            type: "challenge_accepted",
            opponentId: opponent.id,
            opponentName: opponent.name,
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

        broadcastToRoom(room, {
          type: "settings_updated",
          settings: message.settings,
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
            secretCodes: new Map(),
            attempts: new Map(),
            currentTurn: player.id,
            turnStartTime: Date.now(),
            firstWinnerId: null,
            firstWinnerAttempts: 0,
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
            firstPlayerId: firstPlayer,
          });

          send(opponent.ws, {
            type: "game_started",
            firstPlayerId: firstPlayer,
          });

          // Start turn timeout for first player
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

        game.attempts.get(player.id)!.push({
          guess: message.guess,
          correctCount,
          correctPositionCount,
        });

        const won = correctPositionCount === 4;
        const playerAttempts = game.attempts.get(player.id)!.length;
        const opponentAttempts = game.attempts.get(opponent.id)?.length ?? 0;

        // Clear current turn timeout before switching
        if (game.turnTimeoutHandle) {
          clearTimeout(game.turnTimeoutHandle);
          game.turnTimeoutHandle = undefined;
        }

        send(player.ws, {
          type: "guess_result",
          playerId: player.id,
          guess: message.guess,
          correctCount,
          correctPositionCount,
          won,
          nextTurn: opponent.id,
          opponentSecret: won ? opponentSecret : undefined,
        });

        send(opponent.ws, {
          type: "guess_result",
          playerId: player.id,
          guess: message.guess,
          correctCount,
          correctPositionCount,
          won,
          nextTurn: opponent.id,
          opponentSecret: won ? game.secretCodes.get(player.id) : undefined,
        });

        if (won) {
          // Player won - check if this is the first winner
          if (!game.firstWinnerId) {
            // This is the first winner - mark them but don't finalize yet
            game.firstWinnerId = player.id;
            game.firstWinnerAttempts = playerAttempts;
            
            // Send pending win message to winner
            send(player.ws, {
              type: "first_winner_pending",
              won: true,
              message: "لقد خمنت الرقم السري بشكل صحيح ولكن لن تفوز حتى يأخذ خصمك فرصته الأخيره",
              playerAttempts,
              opponentAttempts,
              opponentSecret: opponentSecret,
            });
            
            // Notify opponent that first player won - update their status
            send(opponent.ws, {
              type: "opponent_won_first",
              message: "الخصم فاز — وهذه آخر محاولة لك",
              opponentAttempts: playerAttempts,
              yourAttempts: opponentAttempts,
              turnsLeft: playerAttempts - opponentAttempts,
            });
            
            // Continue game - opponent gets their remaining turns
            const turnsLeft = game.firstWinnerAttempts - opponentAttempts;
            if (turnsLeft > 0) {
              game.currentTurn = opponent.id;
              game.turnStartTime = Date.now();
              setTurnTimeout(game, opponent, player);
            } else {
              // Opponent has no turns left - first winner wins
              if (game.turnTimeoutHandle) {
                clearTimeout(game.turnTimeoutHandle);
                game.turnTimeoutHandle = undefined;
              }
              const firstWinnerPlayer = game.player1.id === player.id ? game.player1 : game.player2;
              const loserPlayer = game.player1.id === player.id ? game.player2 : game.player1;
              
              send(firstWinnerPlayer.ws, {
                type: "game_result",
                result: "won",
                message: "لقد فزت",
                opponentSecret: game.secretCodes.get(opponent.id),
                yourAttempts: playerAttempts,
                opponentAttempts,
              });
              send(loserPlayer.ws, {
                type: "game_result",
                result: "lost",
                message: "لقد خسرت",
                opponentSecret: game.secretCodes.get(player.id),
                yourAttempts: opponentAttempts,
                opponentAttempts: playerAttempts,
              });
            }
          } else if (player.id !== game.firstWinnerId) {
            // Second player also won - it's a tie
            if (game.turnTimeoutHandle) {
              clearTimeout(game.turnTimeoutHandle);
              game.turnTimeoutHandle = undefined;
            }
            
            const firstWinnerPlayer = game.player1.id === game.firstWinnerId ? game.player1 : game.player2;
            const secondWinnerPlayer = game.player1.id === player.id ? game.player1 : game.player2;
            
            // Both won - send tie result to both
            send(firstWinnerPlayer.ws, {
              type: "game_result",
              result: "tie",
              message: "تعادل",
              opponentSecret: game.secretCodes.get(player.id),
              yourAttempts: game.firstWinnerAttempts,
              opponentAttempts: playerAttempts,
            });
            send(secondWinnerPlayer.ws, {
              type: "game_result", 
              result: "tie",
              message: "تعادل",
              opponentSecret: game.secretCodes.get(game.firstWinnerId),
              yourAttempts: playerAttempts,
              opponentAttempts: game.firstWinnerAttempts,
            });
          }
        } else {
          // Player did not win
          if (game.firstWinnerId && player.id !== game.firstWinnerId) {
            // This is second player - check if exceeded attempts
            if (playerAttempts >= game.firstWinnerAttempts) {
              // Opponent has used all attempts without winning - first winner wins
              if (game.turnTimeoutHandle) {
                clearTimeout(game.turnTimeoutHandle);
                game.turnTimeoutHandle = undefined;
              }
              const firstWinnerPlayer = game.player1.id === game.firstWinnerId ? game.player1 : game.player2;
              const loserPlayer = game.player1.id === player.id ? game.player1 : game.player2;
              
              send(firstWinnerPlayer.ws, {
                type: "game_result",
                result: "won",
                message: "لقد فزت",
                opponentSecret: game.secretCodes.get(player.id),
                yourAttempts: game.firstWinnerAttempts,
                opponentAttempts: playerAttempts,
              });
              send(loserPlayer.ws, {
                type: "game_result",
                result: "lost",
                message: "لقد خسرت",
                opponentSecret: game.secretCodes.get(firstWinnerPlayer.id),
                yourAttempts: playerAttempts,
                opponentAttempts: game.firstWinnerAttempts,
              });
            } else {
              // Still has attempts left
              game.currentTurn = opponent.id;
              game.turnStartTime = Date.now();
              setTurnTimeout(game, opponent, player);
            }
          } else {
            // Normal turn - no first winner yet
            game.currentTurn = opponent.id;
            game.turnStartTime = Date.now();
            setTurnTimeout(game, opponent, player);
            
            // Send status update to both players about opponent status
            send(player.ws, {
              type: "opponent_status_update",
              opponentWon: false,
              message: "الخصم لم ينته بعد من محاولاته",
            });
            send(opponent.ws, {
              type: "opponent_status_update",
              opponentWon: false,
              message: "الخصم لم ينته بعد من محاولاته",
            });
          }
        }
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
          fromPlayerName: player.name,
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
          type: "rematch_accepted",
        });

        send(opponent.ws, {
          type: "rematch_accepted",
        });

        const gameKey = [player.id, opponent.id].sort().join("-");
        room.games.delete(gameKey);

        break;
      }
    }
  }

  function send(ws: WebSocket, message: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  function broadcastToRoom(room: Room, message: any, exclude?: WebSocket) {
    room.players.forEach((player) => {
      if (player.ws !== exclude) {
        send(player.ws, message);
      }
    });
  }

  function finalizeGame(
    game: GameSession,
    firstWinner: Player,
    secondPlayer: Player,
    firstWinnerAttempts: number,
    secondPlayerAttempts: number
  ) {
    // Compare attempts to determine actual winner
    let result: "won" | "lost" | "tie";

    if (firstWinnerAttempts < secondPlayerAttempts) {
      // First winner has fewer attempts, they win
      result = "won";
    } else if (firstWinnerAttempts === secondPlayerAttempts) {
      // Same attempts: first winner still wins because they guessed correctly first
      // Only tie if second player never guessed correctly (abandoned game)
      result = "won";
    } else {
      // Second player has fewer attempts, first winner loses
      result = "lost";
    }

    send(firstWinner.ws, {
      type: "game_result",
      result,
      firstWinnerId: game.firstWinnerId,
      firstWinnerAttempts: firstWinnerAttempts,
      opponentAttempts: secondPlayerAttempts,
      opponentSecret: secondPlayer.id === game.player2.id ? game.secretCodes.get(game.player2.id) : game.secretCodes.get(game.player1.id),
    });

    send(secondPlayer.ws, {
      type: "game_result",
      result: result === "won" ? "lost" : (result === "lost" ? "won" : "tie"),
      firstWinnerId: game.firstWinnerId,
      firstWinnerAttempts: firstWinnerAttempts,
      opponentAttempts: firstWinnerAttempts,
      opponentSecret: firstWinner.id === game.player2.id ? game.secretCodes.get(game.player2.id) : game.secretCodes.get(game.player1.id),
    });
  }

  return httpServer;
}
