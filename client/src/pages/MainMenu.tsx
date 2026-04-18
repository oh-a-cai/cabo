import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type {GameState, SocketResponse} from '../../../shared/types';
import { socket } from '../clientSocket/socket';

export default function MainMenu() {
  const navigate = useNavigate();
  const [room, setRoom] = useState("");
  const [name, setName] = useState("");
  const [nameSet, setNameSet] = useState(false);

  const createRoom = () => {
    socket.emit("createRoom", name, () => {
      console.log("Room Created:", room);
    });

    socket.once("roomUpdate", (game: GameState) => {
      navigate(`/room/${game.id}`);
    });
  };

  const joinRoom = () => {
    socket.emit("joinRoom", room, name, (response: SocketResponse) => {
      if ("error" in response) {
        alert(response.error);
        return;
      }
      else {
        navigate(`/room/${room}`);
      }
    });
  }

  return (
    <div>
      <h1>Main Menu</h1>
      <input placeholder="Your name..." value={name} onChange={(e) => {setName(e.target.value); setNameSet(false)}}/>
      <button onClick={() => setNameSet(true)} disabled={!name}>Set Name</button>

      {nameSet && (
        <div>
          <p />
          <button onClick={createRoom}>Create Room</button>
          <p />
          <input placeholder="Room ID..." value={room} onChange={(e) => setRoom(e.target.value)} />
          <button onClick={joinRoom} disabled={!room}>Join Room</button>
        </div>
      )}
    </div>
  );
};
