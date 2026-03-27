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

  const me = gameState.players.find(player => player.id === socket.id);
  const others = gameState.players.filter(player => player.id !== socket.id);  
  
  return (
    <div>
      <h1>Room: {roomId}</h1>
      <h2>Phase: {gameState.phase}</h2>
      <h3>Deck: {gameState.deck.length} cards remaining</h3>
      <h4>Next Card: {gameState.deck[0].id}</h4>
      <h3>Discard Pile: {gameState.discardPile.length} cards</h3>
      <h3>Turn: {gameState.turnId}</h3>
      <div>
        <h2>Your Hand</h2>
        {me?.hand.map((card) => (
          <div>
            {card.id}
          </div>
        ))}
        <h2>Other Players</h2>
        {others.map(player => (
          <div>
            <p>{player.id}'s Hand</p>
            {player.hand.map((card) => (
            <div>
              {card.id}
            </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}