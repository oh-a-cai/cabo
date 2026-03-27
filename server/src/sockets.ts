import logger from 'jet-logger';
import { Server, Socket } from "socket.io";
import { startGame } from "./gameEngine";
import type { GameState, Player, SocketResponse } from "./../../shared/types";

export function initializeSockets(io: Server, games: Map<string, GameState>) {
  io.on("connection", (socket: Socket) => {
    logger.info(`User Connected: ${socket.id}`);
  
    socket.on("createRoom", () => {
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
        phase: "waiting"
      };
      games.set(roomId, game);
  
      const player: Player = {
        id: socket.id,
        name: "", // TEMP
        hand: [],
        isHost: true
      };
      game.players.push(player);

      io.to(roomId).emit("roomUpdate", game);
    });
  
    socket.on("joinRoom", (roomId: string, callback: (res: SocketResponse) => void) => {
      const game = games.get(roomId);
      if(!game){ // room doesn't exist
        return callback?.({ error: `Room Id ${roomId} does not exist.` });
      }
      socket.join(roomId);
      
      if (!game.players.find(p => p.id === socket.id)) { // handles duplicate players
        const player: Player = {
          id: socket.id,
          name: "", // TEMP
          hand: [],
          isHost: false
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
    
      io.to(roomId).emit("gameState", game);
    });

    socket.on("getGameState", (roomId: string, callback) => { // listens for a ping
      const game = games.get(roomId);
      if (!game) {
        return callback?.({ error: `Room ${roomId} does not exist.` });
      }

      callback?.(game); // returns gameState as response
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