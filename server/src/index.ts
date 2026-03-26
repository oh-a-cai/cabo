import logger from 'jet-logger';
import http from 'http';
import ENV from '@src/common/constants/ENV';
import app from './server';
import { Server } from "socket.io";
import type {Card, Player, GameState, SocketResponse} from '../../shared/types'

/******************************************************************************
                                Constants
******************************************************************************/

const SERVER_START_MSG = (
  `Express server started on port: ${ENV.Port}`
);


/******************************************************************************
                                  Run
******************************************************************************/

// Start the server
const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  }
});

const games = new Map<string, GameState>();

io.on("connection", (socket) => {
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
      deck: [], // TEMP
      discardPile: [],
      turnId: 0,
      phase: "waiting"
    };
    games.set(roomId, game);

    const player: Player = {
      id: socket.id,
      name: "", // TEMP
      hand: [],
      isHost: true,
      ready: false
    };
    game.players.push(player);

    io.to(roomId).emit("roomUpdate", game);
  })

  socket.on("joinRoom", (roomId, callback) => {
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
        isHost: false,
        ready: false
      };
      game.players.push(player);
    }

    io.to(roomId).emit("roomUpdate", game)
    callback?.({ success: true });
  })

  socket.on("leaveRoom", (roomId, callback) => {
    const game = games.get(roomId);
    if (!game) { // room doesn't exist
      return callback?.({ error: `Room Id ${roomId} does not exist.` });
    }

    game.players = game.players.filter(p => p.id !== socket.id);
    if (game.players.length === 0) { // delete rooms with 0 people
      games.delete(roomId);
    }
    socket.leave(roomId);

    io.to(roomId).emit("roomUpdate", game);
    callback?.({ success: true });
  });
  
  socket.on("startGame", (roomId) => {
    // create initial GameState, shuffle deck
    const game = games.get(roomId);
    io.to(roomId).emit("gameState", game)
  })

  socket.on("disconnect", () => {
    for (const [roomId, game] of games.entries()) {
      const prev = game.players.length;
      game.players = game.players.filter(p => p.id !== socket.id);
      if (game.players.length !== prev) { // verify disconnect
        if (game.players.length === 0) {
          games.delete(roomId);
        } else {
          io.to(roomId).emit("roomUpdate", game);
        }
      }
    }
    logger.info(`User Disconnected: ${socket.id}`);
  });
});

server.listen(ENV.Port, () => {
  logger.info(SERVER_START_MSG);
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    logger.err(`Port ${ENV.Port} is already in use.`);
  } else {
    logger.err(err.message);
  }
});
