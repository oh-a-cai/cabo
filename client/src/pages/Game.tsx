import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { socket } from "../clientSocket/socket";
import type { GameState } from "../../../shared/types";

export default function Game() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [gameState, setGameState] = useState<GameState | null>(null);

  useEffect(() => {
    // fetch game state on page load
    socket.emit("getGameState", roomId, (game: GameState | { error: string }) => {
      if ("error" in game) {
        alert(game.error);
        navigate("/"); // invalid room
        return;
      }
      setGameState(game);
    });

    // listen for any new updates
    const handler = (game: GameState) => {
      setGameState(game);
    };
    socket.on("gameState", handler);

    return () => {
      socket.off("gameState", handler);
    };
  }, [roomId, navigate]);

  if (!gameState) {
    return <p>Loading game...</p>;
  }
  
  return (
    <div>
      <h1>Room: {roomId}</h1>
      <h2>Phase: {gameState.phase}</h2>
      <h3>Players:</h3>
      <ul>
        {gameState.players.map((player) => (
          <li key={player.id}>
            {player.id}
            {player.id === socket.id ? " (You)" : ""}
          </li>
        ))}
      </ul>
      <h3>Deck: {gameState.deck.length} cards remaining</h3>
      <h3>Discard Pile: {gameState.discardPile.length} cards</h3>
    </div>
  );
}