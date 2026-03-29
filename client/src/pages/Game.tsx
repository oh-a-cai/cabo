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

  const handleMatchCard = (cardId: string) => {
    socket.emit("matchCard", roomId, cardId, (response: SocketResponse) => {
      if ("error" in response) {
        alert(response.error);
      }
    });
  };

  const handleCardClick = (cardId: string) => {
    if (canAct && me.drawnCard) {
      handleSwap(cardId);
    } 
    else if (gameState.turnPhase === "drawing") {
      handleMatchCard(cardId);
    } 
    else {
      alert("You cannot act on this card right now");
    }
  };

  const handleCallCabo = () => {
    socket.emit("callCabo", roomId, (response: SocketResponse) => {
      if ("error" in response) {
        alert(response.error);
      }
    });
  };

  if (gameState.gamePhase === "finished") {
    return (
      <div>
        <h1>{gameState.winner === socket.id ? "You won!" : `${gameState.winner} won!`}</h1>
        <h2>Results</h2>
        {gameState.results.map((result, index) => (
          <div>
            <p>#{index+1} — {result.playerId} {result.playerId === socket.id ? " (You)" : ""}</p>

            <p>Score: {result.score}</p>
            <p>Hand:</p>
            <div>
              {result.playerHand.map(card => (
                <div>{card.id}</div>
              ))}
            </div>

            {result.caboPenalty && (
                <p>Cabo penalty applied (+10)</p>
            )}
          </div>
        ))}
  
        <button onClick={() => navigate(`/room/${roomId}`)}>Back to Lobby</button>
      </div>
    );
  }
  
  return (
    <div>
      <h1>Room: {roomId}</h1>
      <h2>Game Phase: {gameState.gamePhase}</h2>
      <h3>Deck: {gameState.deck.length} cards remaining</h3>
      <h4>Next Card: {gameState.deck.at(-1)?.id}</h4>
      <h3>Discard Pile: {gameState.discardPile.length} cards</h3>
      <h4>Top Card: {gameState.discardPile.at(-1)?.id}</h4>
      <h3>Current Turn: {gameState.players[gameState.turnId]?.id}</h3>
      <h4>Turn phase: {gameState.turnPhase}</h4>
      {gameState.isCaboCalled && (
        <div>
          <h2>{gameState.caboCaller!.id} has called Cabo!</h2>
            <p>Remaining turns: {gameState.remainingTurns!+1}</p>
        </div>
      )}

      <div>
        <h2>Your Hand</h2>
        <div>
          {me?.hand.map(card => (
            <div onClick={() => handleCardClick(card.id)}>{card.id}</div>
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
        <div>
          <button onClick={handleCallCabo} disabled={!canDraw || gameState.isCaboCalled}>Call Cabo</button>
        </div>
      </div>
    </div>
  );
}