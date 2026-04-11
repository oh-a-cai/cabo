import { io } from "socket.io-client";

export const socket = io(process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5001'); // one instance of client side socket