import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { socket } from "../clientSocket/socket";
import type { Player, GameState, SocketResponse } from "../../../shared/types";

export default function Lobby() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [players, setPlayers] = useState<Player[]>([]);
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    // fetch game state on page load
    socket.emit("getGameState", roomId, (game: GameState | { error: string }) => {
      if ("error" in game) {
        alert(game.error);
        navigate("/"); // invalid room
        return;
      }
      setPlayers(game.players);
      setIsHost(game.players[0]?.id === socket.id); // first player is host

      if (game.phase === "starting") { // check if game starts
        navigate(`/game/${roomId}`);
      }
    });
  
    // listen for any new updates
    const roomHandler = (game: GameState) => {
      setPlayers(game.players);
      setIsHost(game.players[0]?.id === socket.id);
    };

    const gameHandler = (game: GameState) => {
      if (game.phase === "starting") {
        navigate(`/game/${roomId}`);
      }
    };
    socket.on("roomUpdate", roomHandler);
    socket.on("gameState", gameHandler);

    return () => {
      socket.off("roomUpdate", roomHandler);
      socket.off("gameState", gameHandler);
    };
  }, [roomId, navigate]);

  const leaveRoom = () => {
    socket.emit("leaveRoom", roomId, (response: SocketResponse) => {
      if ("error" in response) {
        alert(response.error);
      }
      else {
        navigate("/");
      }
    });
  };

  const startGame = () => {
    socket.emit("startGame", roomId);
  };

  return (
    <div>
      <h1>Lobby: {roomId}</h1>
      <h2>Players</h2>
      <ul>
        {players.map((player) => (
          <li key={player.id}>{player.id}</li>
        ))}
      </ul>
      <button onClick={leaveRoom}>Leave Room</button>
      {isHost ? (
        <div>
          <button onClick={startGame}>Start Game</button>
        </div>
      ) : (
        <div></div>
      )}
    </div>
  );
}