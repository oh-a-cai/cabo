import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { socket } from "../clientSocket/socket";
import type { Player, GameState, SocketResponse } from "../../../shared/types";
import PlayerList from "../components/PlayerList";

export default function Lobby() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [players, setPlayers] = useState<Player[]>([]);
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    socket.emit("getGameState", roomId, (game: GameState | { error: string }) => {
      if ("error" in game) {
        alert(game.error);
        navigate("/");
        return;
      }
      setPlayers(game.players);
      setIsHost(game.players[0]?.id === socket.id);
      if (game.gamePhase === "setup") {
        navigate(`/game/${roomId}`);
      }
    });

    const roomHandler = (game: GameState) => {
      setPlayers(game.players);
      setIsHost(game.players[0]?.id === socket.id);
    };
    const gameHandler = (game: GameState) => {
      if (game.gamePhase === "setup") navigate(`/game/${roomId}`);
    };

    socket.on("roomUpdate", roomHandler);
    socket.on("gameState", gameHandler);
    return () => {
      socket.off("roomUpdate", roomHandler);
      socket.off("gameState", gameHandler);
    };
  }, [roomId, navigate]);

  const leaveRoom = () => {
    socket.emit("leaveRoom", roomId, (res: SocketResponse) => {
      if ("error" in res) { alert(res.error); return; }
      navigate("/");
    });
  };

  const startGame = () => {
    socket.emit("startGame", roomId);
  };

  return (
    <div>
      <h1>Lobby: {roomId}</h1>
      <h2>Players</h2>
      <PlayerList players={players} />
      <button onClick={leaveRoom}>Leave Room</button>
      {isHost && (
        <div>
          <button onClick={startGame}>Start Game</button>
        </div>
      )}
    </div>
  );
}
