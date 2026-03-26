import logger from 'jet-logger';
import http from 'http';
import ENV from '@src/common/constants/ENV';
import app from './server';
import { Server } from "socket.io";
import { initializeSockets } from "./sockets";
import type { GameState } from "./../../shared/types";

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
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  }
});
const games = new Map<string, GameState>();

initializeSockets(io, games);

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
