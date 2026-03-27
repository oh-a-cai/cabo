import io from 'socket.io-client';
import { Navbar } from '../components/Navbar';
import { useEffect, useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import type {Card, Player, GameState, SocketResponse} from '../../../shared/types';
import { socket } from '../clientSocket/socket';

export default function MainMenu() {
  const navigate = useNavigate();
  const [room, setRoom] = useState("");

  const createRoom = () => {
    socket.emit("createRoom", () => {
      console.log("Room Created:", room);
    });

    socket.once("roomUpdate", (game: GameState) => {
      navigate(`/room/${game.id}`);
    });
  };

  const joinRoom = () => {
    socket.emit("joinRoom", room, (response: SocketResponse) => {
      if ("error" in response) {
        alert(response.error);
      }
      else {
        navigate(`/room/${room}`);
      }
    });
  }

  return (
    <div>
      <h1>Main Menu</h1>
      <button onClick={createRoom}>Create Room</button>
      <p></p>
      <button onClick={joinRoom}>Join Room</button>
      <input placeholder="Room ID..." value={room} onChange={(e) => setRoom(e.target.value)}/>
    </div>
  );
};
