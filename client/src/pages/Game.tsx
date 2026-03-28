import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { socket } from "../clientSocket/socket";
import type { GameState, SocketResponse } from "../../../shared/types";

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
  const isMyTurn = gameState.players[gameState.turnId].id === me?.id;
  const canDraw = isMyTurn && gameState.turnPhase === "drawing";
  const canAct = isMyTurn && gameState.turnPhase === "action";

  const handleDrawCard = () => {
    socket.emit("drawCard", roomId, (response: SocketResponse) => {
      if ("error" in response) {
        alert(response.error);
      }
    });
  };

  const handleDiscard = () => {
    socket.emit("discardCard", roomId, (response: SocketResponse) => {
      if ("error" in response) {
        alert(response.error);
      }
    });
  };

  const handleSwap = (cardId: string) => {
    socket.emit("swapCard", roomId, cardId, (response: SocketResponse) => {
      if ("error" in response) {
        alert(response.error);
      }
    });
  };
  
  return (
    <div>
      <h1>Room: {roomId}</h1>
      <h2>Game Phase: {gameState.gamePhase}</h2>
      <h3>Deck: {gameState.deck.length} cards remaining</h3>
      <h4>Next Card: {gameState.deck.at(-1)?.id}</h4>
      <h3>Discard Pile: {gameState.discardPile.length} cards</h3>
      <h3>Turn: {gameState.turnId}</h3>
      <h4>Turn phase: {gameState.turnPhase}</h4>
      <div>
        <h2>Your Hand</h2>
        <div>
          {me?.hand.map(card => (
            <div onClick={() => canAct && me.drawnCard && handleSwap(card.id)}>{card.id}</div>
          ))}
        </div>

        {me?.drawnCard && (
          <div>
            <h3>Drawn Card:</h3>
            {me.drawnCard.id}
            <div>
              <button onClick={handleDiscard} disabled={!canAct}>Discard</button>
              <span> (Click a card in your hand to swap)</span>
            </div>
          </div>
        )}

        <div>
          <h2>Other Players</h2>
          {others.map(player => (
            <div>
              <p>{player.id}'s Hand</p>
              <div>
                {player.hand.map(card => (
                  <div>{card.id}</div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div>
          <button onClick={handleDrawCard} disabled={!canDraw}>Draw Card</button>
        </div>
      </div>
    </div>
  );
}