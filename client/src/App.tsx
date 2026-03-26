import React from 'react';
import './App.css';
import io from 'socket.io-client'
import { useEffect, useState } from 'react';
import type {Card, Player, GameState, SocketResponse} from '../../shared/types'

const socket = io("http://localhost:5001");

function App() {
  const [room, setRoom] = useState("");
  const [playerList, setPlayerList] = useState<Player[]>([]);

  const createRoom = () => {
    socket.emit("createRoom", () => {
      console.log("Room Created:", room);
    });
  }

  const joinRoom = () => {
    socket.emit("joinRoom", room, (response: SocketResponse) => {
      if ("error" in response) {
        console.error(response.error);
        alert(response.error);
      } else {
        console.log("Room joined:", room);
      }
    });
  }

  const leaveRoom = () => {
    socket.emit("leaveRoom", room, (response: SocketResponse) => {
      if ("error" in response) {
        alert(response.error);
      } else {
        setPlayerList([]);
        setRoom("");
        console.log("Left room:", room);
      }
    });
  }

  useEffect(() => {
    const handler = (game: GameState) => {
      setRoom(game.id);
      setPlayerList(game.players);
    };
  
    socket.on("roomUpdate", handler);
  
    return () => {
      socket.off("roomUpdate", handler);
    };
  }, []);

  return (
    <div className="App">
      <button onClick={createRoom}>Create Room</button>
      <h1></h1>
      <input placeholder='Room Id...' onChange={(e) => {setRoom(e.target.value)}}/>
      <button onClick={joinRoom}>Join Room</button>
      <h1></h1>
      <button onClick={leaveRoom}>Leave Room</button>
      <h1>Room Id: {room}</h1>
      <h2>Players:</h2>
        <ul>
          {playerList.map((player) => (
            <li key={player.id}>
              {player.id}
            </li>
          ))}
        </ul>
    </div>
  );
}

export default App;
