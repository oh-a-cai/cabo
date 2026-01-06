import logger from 'jet-logger';
import http from 'http';
import ENV from '@src/common/constants/ENV';
import app from './server';
import { Server } from "socket.io";
import type {Card, Player, GameState} from '../../shared/types'

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

  socket.on("joinRoom", (roomId) => {
    socket.join(roomId);
    if(!games.has(roomId)){
      games.set(roomId, {
        id: roomId,
        players: [],
        deck: [],
        discardPile: [],
        turnId: 0,
        phase: "started"
      });
    }
    const game = games.get(roomId)!;
    const isHost = game.players.length == 0;
    const player: Player = {
      id: socket.id,
      name: "",
      hand: [],
      isHost: isHost,
      ready: true
    };
    game.players.push(player);
    // add socket to room player list, emit roomUpdate
    io.to(roomId).emit("playerJoined", game.players)
  })
  
  socket.on("startGame", (roomId) => {
    // create initial GameState, shuffle deck
    const game = games.get(roomId);
    io.to(roomId).emit("gameState", game)
  })

  socket.on("send_message", (data) => {
    socket.broadcast.emit("receive_message", data);
  })

  socket.on("disconnect", () => {
    logger.info(`User Disconnected: ${socket.id}`);
  })
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
