import logger from 'jet-logger';
import { Server, Socket } from "socket.io";
import { startGame, playerReady, drawCard, discardCard, confirmPowerSelection, finishPower, skipPower, swapCard, matchCard, giveCardToPlayer, callCabo } from "./gameEngine";
import type { GameState, Player, SocketResponse } from "./../../shared/types";

function filterGameStateForPlayer(game: GameState, playerId: string): GameState {
  return {
    ...game,
    deck: game.deck.map(card => ({ ...card, rank: "hidden" as any, suit: "hidden" as any, value: 0 })),
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

function emitGameState(io: Server, game: GameState) {
  game.players.forEach(player => {
    io.to(player.id).emit("gameState", filterGameStateForPlayer(game, player.id));
  });
}

export function initializeSockets(io: Server, games: Map<string, GameState>) {
  io.on("connection", (socket: Socket) => {
    logger.info(`User Connected: ${socket.id}`);
  
    socket.on("createRoom", (playerName: string) => {
      let roomId = Math.floor(Math.random() * 100).toString(); // generate random roomId between 0-99
      while (games.has(roomId)) { // room id taken
        roomId = Math.floor(Math.random() * 100).toString();
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

      io.to(roomId).emit("roomUpdate", game);
    });
  
    socket.on("joinRoom", (roomId: string, playerName: string, callback: (res: SocketResponse) => void) => {
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

      io.to(roomId).emit("roomUpdate", game);
      callback?.({ success: true });
    });
  
    socket.on("leaveRoom", (roomId: string, callback: (res: SocketResponse) => void) => {
      const game = games.get(roomId);
      if (!game) { // room doesn't exist
        return callback?.({ error: `Room Id ${roomId} does not exist.` });
      }
  
      game.players = game.players.filter(p => p.id !== socket.id);
      if (game.players.length === 0) { // delete rooms with 0 people
        games.delete(roomId);
      }
      else {
        game.players[0].isHost = true;
      }
      socket.leave(roomId);
  
      io.to(roomId).emit("roomUpdate", game);
      callback?.({ success: true });
    });

    socket.on("startGame", (roomId: string) => {
      const game = games.get(roomId);
      if (!game) {
        return;
      }
    
      startGame(game);
    
      emitGameState(io, game);
    });

    socket.on("playerReady", (roomId: string, callback: (res: SocketResponse) => void) => {
      const game = games.get(roomId);
      if (!game) {
        return callback?.({ error: "Room not found" });
      }
    
      const response = playerReady(game, socket.id);
      if ("error" in response) {
        return callback?.(response);
      }

      emitGameState(io, game);
    
      if (game.countdownStartedAt) {
        setTimeout(() => {
          game.players.forEach(p => p.hand.forEach(card => card!.visibility = "hidden"));
          game.gamePhase = "playing";
          game.countdownStartedAt = undefined;
          emitGameState(io, game);
        }, 3000);
      }

      callback?.({ success: true });
    });

    socket.on("drawCard", (roomId: string, source: string, callback: (res: SocketResponse) => void) => {
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

    socket.on("discardCard", (roomId: string, callback: (res: SocketResponse) => void) => {
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

    socket.on("confirmPower", (roomId: string, parameters: any, callback: (res: SocketResponse) => void) => {
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

    socket.on("finishPower", (roomId: string, callback: (res: SocketResponse) => void) => {
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

    socket.on("skipPower", (roomId: string, callback: (res: SocketResponse) => void) => {
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

    socket.on("swapCard", (roomId: string, cardId: string, callback: (res: SocketResponse) => void) => {
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

    socket.on("matchCard", (roomId: string, cardId: string, callback: (res: SocketResponse) => void) => {
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

    socket.on("giveCardToPlayer", (roomId: string, parameters: { myCardId: string }, callback: (res: SocketResponse) => void) => {
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

    socket.on("callCabo", (roomId: string, callback: (res: SocketResponse) => void) => {
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

    socket.on("getGameState", (roomId: string, callback) => { // listens for a ping
      const game = games.get(roomId);
      if (!game) {
        return callback?.({ error: `Room ${roomId} does not exist.` });
      }

      callback?.(filterGameStateForPlayer(game, socket.id)); // returns gameState as response
    });
    
    socket.on("disconnect", () => {
      for (const [roomId, game] of games.entries()) {
        const prev = game.players.length;
        game.players = game.players.filter(p => p.id !== socket.id);
        if (game.players.length !== prev) { // verify disconnect
          if (game.players.length === 0) {
            games.delete(roomId);
          }
          else { // if players still in room, then make new host
            game.players[0].isHost = true;
            io.to(roomId).emit("roomUpdate", game);
          }
        }
      }
      logger.info(`User Disconnected: ${socket.id}`);
    });
  });
}