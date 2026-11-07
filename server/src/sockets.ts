import logger from 'jet-logger';
import { Server, Socket } from "socket.io";
import { startGame, playerReady, drawCard, discardCard, confirmPowerSelection, finishPower, skipPower, swapCard, matchCard, giveCardToPlayer, callCabo, removePlayer } from "./gameEngine";
import type { GameState, Player, SocketResponse } from "./../../shared/types";

const MAX_NAME_LENGTH = 30;

function filterGameStateForPlayer(game: GameState, playerId: string): GameState {
  return {
    ...game,
    deck: [], // hide deck from players
    deckCount: game.deck.length,
    players: game.players.map(player => ({
      ...player,
      hand: player.hand.map(card => {
        if (card === null) {
          return null;
        }
        const isVisible =
          card.visibility === "all" ||
          (card.visibility === "owner" && player.id === playerId) ||
          card.peekerId === playerId;
        return isVisible ? card : { ...card, rank: "hidden" as any, suit: "hidden" as any, value: 0 };
      }),
      drawnCard: (() => {
        const card = player.drawnCard;
        if (!card) return undefined;
        const isVisible =
          card.visibility === "all" ||
          (card.visibility === "owner" && player.id === playerId) ||
          card.peekerId === playerId;
        return isVisible ? card : { ...card, rank: "hidden" as any, suit: "hidden" as any, value: 0 };
      })(),
    })),
  };
}

function emitGameState(io: Server, game: GameState, event: "gameState" | "roomUpdate" = "gameState") {
  game.players.forEach(player => {
    io.to(player.id).emit(event, filterGameStateForPlayer(game, player.id));
  });
}

function startCountdownIfAllReady(io: Server, game: GameState) {
  if (game.gamePhase !== "setup" || game.countdownStartedAt || !game.players.every(p => p.ready)) {
    return;
  }

  game.countdownStartedAt = Date.now();
  setTimeout(() => {
    if (game.gamePhase !== "setup") { // ended early because players left
      return;
    }
    game.players.forEach(p => p.hand.forEach(card => card!.visibility = "hidden"));
    game.gamePhase = "playing";
    game.countdownStartedAt = undefined;
    emitGameState(io, game);
  }, 3000);
}

function removeFromRoom(io: Server, games: Map<string, GameState>, game: GameState, playerId: string) {
  removePlayer(game, playerId);
  if (game.players.length === 0) { // delete rooms with 0 people
    games.delete(game.id);
    return;
  }

  startCountdownIfAllReady(io, game);
  emitGameState(io, game, "roomUpdate");
  if (game.gamePhase !== "waiting") { // the game page only listens to gameState
    emitGameState(io, game);
  }
}

function isValidName(name: unknown) {
  return typeof name === "string" && name.length <= MAX_NAME_LENGTH;
}

function generateRoomId(games: Map<string, GameState>): string | null {
  for (let attempt = 0; attempt < 100; attempt++) {
    const roomId = (1000 + Math.floor(Math.random() * 9000)).toString();
    if (!games.has(roomId)) {
      return roomId;
    }
  }
  return null;
}

export function initializeSockets(io: Server, games: Map<string, GameState>) {
  io.on("connection", (socket: Socket) => {
    logger.info(`User Connected: ${socket.id}`);

    const on = (event: string, handler: (...args: any[]) => void) => {
      socket.on(event, (...args: any[]) => {
        try {
          handler(...args);
        }
        catch (err) {
          logger.err(err);
          const callback = args[args.length - 1];
          if (typeof callback === "function") {
            callback({ error: "Invalid request" });
          }
        }
      });
    };
  
    on("createRoom", (playerName: string, callback: (res: SocketResponse) => void) => {
      if (!isValidName(playerName)) {
        return callback?.({ error: "Invalid player name" });
      }
      const roomId = generateRoomId(games);
      if (!roomId) {
        return callback?.({ error: "All rooms are in use. Please try again later." });
      }
      socket.join(roomId);
      
      const game: GameState = {
        id: roomId,
        players: [],
        deck: [],
        discardPile: [],
        turnId: 0,
        gamePhase: "waiting",
        turnPhase: "drawing",
        pendingCardPower: undefined,
        isCardMatched: false,
        isCaboCalled: false,
        caboCaller: undefined,
        remainingTurns: undefined,
        results: [],
        winner: ""
      };
      games.set(roomId, game);
  
      const player: Player = {
        id: socket.id,
        name: playerName,
        hand: [],
        drawnCard: undefined,
        isHost: true,
        hasBurned: false,
        ready: false,
      };
      game.players.push(player);

      emitGameState(io, game, "roomUpdate");
      callback?.({ success: true });
    });
  
    on("joinRoom", (roomId: string, playerName: string, callback: (res: SocketResponse) => void) => {
      if (!isValidName(playerName)) {
        return callback?.({ error: "Invalid player name" });
      }
      const game = games.get(roomId);
      if(!game){ // room doesn't exist
        return callback?.({ error: `Room Id ${roomId} does not exist.` });
      }

      const isExistingPlayer = game.players.find(p => p.id === socket.id);
      if (!isExistingPlayer) {
        if (game.gamePhase !== "waiting" && game.gamePhase !== "finished") {
          return callback?.({ error: `Room Id ${roomId} already has a game in progress.` });
        }
        if (game.players.length >= 6) {
          return callback?.({ error: `Room Id ${roomId} is full.` });
        }
      }

      socket.join(roomId);

      if (!isExistingPlayer) { // handles duplicate players
        const player: Player = {
          id: socket.id,
          name: playerName,
          hand: [],
          drawnCard: undefined,
          isHost: false,
          hasBurned: false,
          ready: false
        };
        game.players.push(player);
      }

      emitGameState(io, game, "roomUpdate");
      callback?.({ success: true });
    });
  
    on("leaveRoom", (roomId: string, callback: (res: SocketResponse) => void) => {
      const game = games.get(roomId);
      if (!game) { // room doesn't exist
        return callback?.({ error: `Room Id ${roomId} does not exist.` });
      }
  
      socket.leave(roomId);
      removeFromRoom(io, games, game, socket.id);
      callback?.({ success: true });
    });

    on("startGame", (roomId: string, callback: (res: SocketResponse) => void) => {
      const game = games.get(roomId);
      if (!game) {
        return callback?.({ error: "Room not found" });
      }
    
      const response = startGame(game, socket.id);
      if ("error" in response) {
        return callback?.(response);
      }
    
      emitGameState(io, game);
      callback?.({ success: true });
    });

    on("playerReady", (roomId: string, callback: (res: SocketResponse) => void) => {
      const game = games.get(roomId);
      if (!game) {
        return callback?.({ error: "Room not found" });
      }
    
      const response = playerReady(game, socket.id);
      if ("error" in response) {
        return callback?.(response);
      }

      startCountdownIfAllReady(io, game);
      emitGameState(io, game);

      callback?.({ success: true });
    });

    on("drawCard", (roomId: string, source: string, callback: (res: SocketResponse) => void) => {
      const game = games.get(roomId);
      if (!game) {
        return callback?.({ error: "Room not found" });
      }
      
      const response = drawCard(game, socket.id, source);
      if ("error" in response) {
        return callback?.(response);
      }
      
      emitGameState(io, game);
      callback?.({ success: true });
    });

    on("discardCard", (roomId: string, callback: (res: SocketResponse) => void) => {
      const game = games.get(roomId);
      if (!game) {
        return callback?.({ error: "Room not found" });
      }
      
      const response = discardCard(game, socket.id);
      if ("error" in response) {
        return callback?.(response);
      }
      
      emitGameState(io, game);
      callback?.({ success: true });
    });

    on("confirmPower", (roomId: string, parameters: any, callback: (res: SocketResponse) => void) => {
      const game = games.get(roomId);
      if (!game) {
        return callback?.({ error: "Room not found" });
      }
    
      const response = confirmPowerSelection(game, socket.id, parameters);
      if ("error" in response) {
        return callback?.(response);
      }

      emitGameState(io, game);
      callback?.({ success: true });
    });

    on("finishPower", (roomId: string, callback: (res: SocketResponse) => void) => {
      const game = games.get(roomId);
      if (!game) {
        return callback?.({ error: "Room not found" });
      }
      
      const response = finishPower(game, socket.id);
      if ("error" in response) {
        return callback?.(response);
      }

      emitGameState(io, game);
      callback?.({ success: true });
    });

    on("skipPower", (roomId: string, callback: (res: SocketResponse) => void) => {
      const game = games.get(roomId);
      if (!game) {
        return callback?.({ error: "Room not found" });
      }
    
      const response = skipPower(game, socket.id);
      if ("error" in response) {
        return callback?.(response);
      }
    
      emitGameState(io, game);
      callback?.({ success: true });
    });

    on("swapCard", (roomId: string, cardId: string, callback: (res: SocketResponse) => void) => {
      const game = games.get(roomId);
      if (!game) {
        return callback?.({ error: "Room not found" });
      }
      
      const response = swapCard(game, socket.id, cardId);
      if ("error" in response) {
        return callback?.(response);
      }
      
      emitGameState(io, game);
      callback?.({ success: true });
    });

    on("matchCard", (roomId: string, cardId: string, callback: (res: SocketResponse) => void) => {
      const game = games.get(roomId);
      if (!game) {
        return callback?.({ error: "Room not found" });
      }
      
      const response = matchCard(game, socket.id, cardId);
      if ("error" in response) {
        return callback?.(response);
      }
      
      emitGameState(io, game);
      callback?.({ success: true });
    });

    on("giveCardToPlayer", (roomId: string, parameters: { myCardId: string }, callback: (res: SocketResponse) => void) => {
      const game = games.get(roomId);
      if (!game) {
        return callback?.({ error: "Room not found" });
      }

      const response = giveCardToPlayer(game, socket.id, parameters.myCardId);
      if ("error" in response) {
        return callback?.(response);
      }

      emitGameState(io, game);
      callback?.({ success: true });
    });

    on("callCabo", (roomId: string, callback: (res: SocketResponse) => void) => {
      const game = games.get(roomId);
      if (!game) {
        return callback?.({ error: "Room not found" });
      }
      
      const response = callCabo(game, socket.id);
      if ("error" in response) {
        return callback?.(response);
      }
      
      emitGameState(io, game);
      callback?.({ success: true });
    });

    on("getGameState", (roomId: string, callback) => { // listens for a ping
      const game = games.get(roomId);
      if (!game) {
        return callback?.({ error: `Room ${roomId} does not exist.` });
      }

      callback?.(filterGameStateForPlayer(game, socket.id)); // returns gameState as response
    });
    
    on("disconnect", () => {
      for (const game of games.values()) {
        if (game.players.some(p => p.id === socket.id)) {
          removeFromRoom(io, games, game, socket.id);
        }
      }
      logger.info(`User Disconnected: ${socket.id}`);
    });
  });
}