import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { socket } from "../clientSocket/socket";
import type { GameState, Card, Player, SocketResponse } from "../../../shared/types";

export default function Game() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  const [pendingCardPower, setPendingCardPower] = useState<GameState["pendingCardPower"] | null>(null);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [selectedTargetCard, setSelectedTargetCard] = useState<string | null>(null);

  const [isMatching, setIsMatching] = useState(false);
  const [matchReceiverId, setMatchReceiverId] = useState<string | null>(null);
  const [matchGiveCard, setMatchGiveCard] = useState<string | null>(null);

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
      setPendingCardPower(game.pendingCardPower || null);
      if (!game.countdownStartedAt) {
        setCountdown(null);
      }
      if (game.matchReceiverId && game.matchReceiverId !== socket.id) {
        setIsMatching(true);
        setMatchReceiverId(game.matchReceiverId);
      } 
      else {
        setIsMatching(false);
        setMatchReceiverId(null);
        setMatchGiveCard(null);
      }
    };
    socket.on("gameState", handler);

    return () => {
      socket.off("gameState", handler);
    };
  }, [roomId, navigate]);

  useEffect(() => {
    if (!gameState?.countdownStartedAt) return;
  
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - gameState.countdownStartedAt!) / 1000);
      const remaining = Math.max(5 - elapsed, 0);
      setCountdown(remaining);
    }, 500);
  
    return () => clearInterval(interval);
  }, [gameState?.countdownStartedAt]);

  if (!gameState) {
    return <p>Loading game...</p>;
  }

  const me = gameState.players.find(player => player.id === socket.id);
  const others = gameState.players.filter(player => player.id !== socket.id);
  const isMyTurn = gameState.players[gameState.turnId].id === me?.id;

  const canDraw = isMyTurn && gameState.turnPhase === "drawing";
  const canAct = isMyTurn && gameState.turnPhase === "action";

  
  const isReady = me?.ready === true;
  const readyCount = gameState?.players.filter(p => p.ready).length;
  const totalPlayers = gameState?.players.length;

  const handleReady = () => {
    socket.emit("playerReady", roomId, (response: SocketResponse) => {
      if ("error" in response) {
        alert(response.error);
        return;
      }
    });
  };
  
  const handleDrawFromDeck = () => {
    if (!canDraw) {
      return;
    }
    socket.emit("drawCard", roomId, "deck", (response: SocketResponse) => {
      if ("error" in response) {
        alert(response.error);
        return;
      }
    });
  };

  const handleDrawFromDiscard = () => {
    if (!canDraw) {
      return;
    }
    socket.emit("drawCard", roomId, "discard", (response: SocketResponse) => {
      if ("error" in response) {
        alert(response.error);
        return;
      }
    });
  };

  const handleDiscard = () => {
    socket.emit("discardCard", roomId, (response: SocketResponse) => {
      if ("error" in response) {
        alert(response.error);
        return;
      }
    });
  };

  const confirmPower = (parameters: { myCardId?: string; targetCardId?: string }) => {
    socket.emit("confirmPower", roomId, parameters, (response: SocketResponse) => {
      if ("error" in response) {
        alert(response.error);
        return;
      }
    });
  };
  
  const finishPower = () => {
    socket.emit("finishPower", roomId, (response: SocketResponse) => {
      if ("error" in response) {
        alert(response.error);
        return;
      }
      
      setSelectedCard(null);
      setSelectedTargetCard(null);
    });
  };

  const confirmAndFinishPower = (parameters: { myCardId?: string; targetCardId?: string }) => {
    socket.emit("confirmPower", roomId, parameters, (response: SocketResponse) => {
      if ("error" in response) {
        alert(response.error);
        return;
      }

      socket.emit("finishPower", roomId, (res: SocketResponse) => {
        if ("error" in res) {
          alert(res.error);
          return;
        }

        setSelectedCard(null);
        setSelectedTargetCard(null);
      });
    });
  };

  const handleSwap = (cardId: string) => {
    socket.emit("swapCard", roomId, cardId, (response: SocketResponse) => {
      if ("error" in response) {
        alert(response.error);
        return;
      }
    });
  };

  const handleMatchCard = (cardId: string) => {
    socket.emit("matchCard", roomId, cardId, (response: SocketResponse) => {
      if ("error" in response) {
        alert(response.error);
        return;
      }
      const receiverId = gameState?.matchReceiverId;
      if (receiverId && receiverId !== socket.id) {
        setIsMatching(true);
        setMatchReceiverId(receiverId);
      }
    });
  };

  const giveCardToPlayer = (myCardId: string) => {
    socket.emit("giveCardToPlayer", roomId, { myCardId }, (res: SocketResponse) => {
      if ("error" in res) {
        alert(res.error);
      }
      setIsMatching(false);
      setMatchReceiverId(null);
      setMatchGiveCard(null);
    });
  };

  const handleCardClick = (cardId: string) => {
    if (!gameState || !me) return;

    // If player is in the middle of giving a card, block other actions
    if (isMatching) {
      alert("You must give a card to complete the previous match first.");
      return;
    }

    const canSwap = canAct && me.drawnCard;
    const canMatch = gameState.turnPhase === "drawing" || gameState.turnPhase === "power";

    if (canSwap) {
      handleSwap(cardId);
    } else if (canMatch) {
      handleMatchCard(cardId);
    } else {
      alert("You cannot act on this card right now.");
    }
  };

  const handleCallCabo = () => {
    socket.emit("callCabo", roomId, (response: SocketResponse) => {
      if ("error" in response) {
        alert(response.error);
        return;
      }
    });
  };

  const getCardImage = (card: Card, ownerId: string) => {
    const isMe = ownerId === socket.id;
    
    const isVisible = card.visibility === "all" || (card.visibility === "owner" && isMe) || card.peekerId === socket.id;
    
    if (!isVisible) {
      return "/assets/Deck_of_cards/back.png";
    }
  
    return `/assets/Deck_of_cards/${card.id}.png`;
  };

  const getCardAlt = (card: Card, ownerId: string) => {
    const isMe = ownerId === socket.id;
    const isVisible = card.visibility === "all" || (card.visibility === "owner" && isMe) || card.peekerId === socket.id;
    return isVisible ? card.id : "back of card";
  };

  const renderHand = (player: Player | undefined, clickHandler?: (cardId: string) => void, selectedCardId?: string | null) => {
    if (!player) {
      return null;
    }

    const cols = 4;
    const rows = 2;
    // render index mapping:
    // 0 2 4 6
    // 1 3 5 7
    return (
      <div className="flex gap-2">
        {Array.from({ length: cols }).map((_, col) => (
          <div key={col} className="flex flex-col gap-2">
            {Array.from({ length: rows }).map((_, row) => {
              const index = col * 2 + row;
              const card = player.hand[index] ?? null;

              if (!card) {
                return <div key={index} className="w-20 h-28" />;
              }

              return (
                <img
                  key={card.id}
                  src={getCardImage(card, player.id)}
                  alt={getCardAlt(card, player.id)}
                  onClick={() => clickHandler?.(card.id)}
                  className={`w-20 h-28 rounded-lg shadow-md transition-transform duration-200
                    ${clickHandler ? "cursor-pointer" : ""}
                    ${selectedCardId === card.id ? "ring-4 ring-blue-400" : "hover:scale-110 hover:shadow-xl"}`}
                />
              );
            })}
          </div>
        ))}
      </div>
    );
  };
  
  if (gameState.gamePhase === "setup") {
    return (
      <div>
        <h1>Pregame Phase</h1>
        <p>You can see your bottom 2 cards. Memorize them!</p>
        <p>Players Ready: {readyCount} / {totalPlayers}</p>
        {renderHand(me)}
        {countdown !== null ? (
          <div>
            <h2>All players Ready!</h2>
            <h3>Game starting in {countdown}...</h3>
          </div>
        ) : (
          <button onClick={handleReady} disabled={isReady}>{isReady ? "Ready" : "Ready up"}</button>
        )}
      </div>
    );
  }

  if (gameState.gamePhase === "finished") {
    return (
      <div>
        <h1>{gameState.winner === socket.id ? "You won!" : `${gameState.winner} won!`}</h1>
        <h2>Results</h2>
        {gameState.results.map((result, index) => (
          <div key={result.player.id}>
            <p>#{index + 1} — {result.player.id} {result.player.id === socket.id ? " (You)" : ""}</p>
            <p>Score: {result.score}</p>
            {renderHand(result.player)}
            {result.caboPenalty && <p>Cabo penalty applied (+10)</p>}
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
      {gameState.deck.at(-1) && (
        <div>
          <img
            src={getCardImage(gameState.deck.at(-1)!, "deck")}
            alt="top of deck"
            onClick={handleDrawFromDeck}
            className={`w-20 h-28 rounded-lg shadow-md hover:scale-110 hover:shadow-xl transition-transform duration-200 ${!canDraw ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          />
          <span>Click the deck to draw!</span>
        </div>
      )}
      <h3>Discard Pile: {gameState.discardPile.length} cards</h3>
      {gameState.discardPile.at(-1) && (
        <div>
          <img
            src={getCardImage(gameState.discardPile.at(-1)!, "discard")}
            alt="top of discard pile"
            onClick={handleDrawFromDiscard}
            className={`w-20 h-28 rounded-lg shadow-md hover:scale-110 hover:shadow-xl transition-transform duration-200 ${!canDraw ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          />
          <span>Click the discard pile to draw! (will be revealed to everyone)</span>
        </div>
      )}
      <h3>Current Turn: {gameState.players[gameState.turnId]?.id}</h3>
      <h4>Turn phase: {gameState.turnPhase}</h4>
      {gameState.isCaboCalled && (
        <div>
          <h2>{gameState.caboCaller!.id} has called Cabo!</h2>
            <p>Remaining turns: {gameState.remainingTurns!+1}</p>
        </div>
      )}
      <div>
        <button onClick={handleCallCabo} disabled={!canDraw || gameState.isCaboCalled}>Call Cabo</button>
      </div>

      <div>
        <h2>Your Hand</h2>
        {renderHand(me, handleCardClick)}
        {me?.drawnCard && (
          <div>
            <h3>Drawn Card:</h3>
            <img
              src={getCardImage(me.drawnCard, me!.id)}
              alt={me.drawnCard.id}
              onClick={handleDiscard}
              className="w-20 h-28 rounded-lg shadow-md cursor-pointer hover:scale-110 hover:shadow-xl transition-transform duration-200"
            />
            <span>Click the drawn card to discard, or click a card in your hand to swap</span>
          </div>
        )}

        {pendingCardPower && pendingCardPower.playerId === socket.id && (
          <div>
            {pendingCardPower.type === "peekSelf" && (
              <>
                <h3 className="mb-2">Peek one of your cards</h3>
                {renderHand(me, (cardId) => setSelectedCard(cardId), selectedCard)}
                {!pendingCardPower.myCardId ? (
                  <button
                    disabled={!selectedCard}
                    onClick={() => confirmPower({ myCardId: selectedCard! })}
                    className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50"
                  >
                    Confirm
                  </button>
                ) : (
                  <button
                    onClick={finishPower}
                    className="px-4 py-2 bg-blue-500 text-white rounded"
                  >
                    Finished
                  </button>
                )}
              </>
            )}

            {pendingCardPower.type === "peekOther" && (
              <>
                <h3 className="mb-2">Peek another player's card</h3>
                {others.map(player => (
                  <div key={player.id} className="mb-2">
                    <h4>{player.id}</h4>
                    {renderHand(player, (cardId) => setSelectedTargetCard(cardId), selectedTargetCard)}
                  </div>
                ))}
                {!pendingCardPower.targetCardId ? (
                  <button
                    disabled={!selectedTargetCard}
                    onClick={() => confirmPower({ targetCardId: selectedTargetCard! })}
                    className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50"
                  >
                    Confirm
                  </button>
                ) : (
                  <button 
                    onClick={finishPower}
                    className="px-4 py-2 bg-blue-500 text-white rounded"
                  >
                    Finished
                  </button>
                )}
              </>
            )}

            {pendingCardPower.type === "swap" && (
              <>
                <h3 className="mb-2">Swap a card with another player</h3>
                <div className="mb-2">
                  <h4>Your Hand</h4>
                  {renderHand(me, (cardId) => setSelectedCard(cardId), selectedCard)}
                </div>
                <div className="mb-2">
                  <h4>Other Players</h4>
                  {others.map(player => (
                    <div key={player.id} className="mb-2">
                      <h5>{player.id}</h5>
                      {renderHand(player, (cardId) => setSelectedTargetCard(cardId), selectedTargetCard)}
                    </div>
                  ))}
                </div>
                <button
                  disabled={!selectedCard || !selectedTargetCard}
                  onClick={() => confirmAndFinishPower({ myCardId: selectedCard!, targetCardId: selectedTargetCard! })}
                  className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50"
                >
                  Confirm Swap
                </button>
              </>
            )}
          </div>
        )}

        <div>
          <h2>Other Players</h2>
          {others.map(player => (
            <div>
              <p>{player.id}'s Hand</p>
              {renderHand(player, handleCardClick)}
            </div>
          ))}
        </div>

        {isMatching && matchReceiverId && (
          <div className="mt-4 p-4 border rounded bg-gray-100">
            <h3>Select a card from your hand to give to {matchReceiverId}</h3>
            {renderHand(me, (cardId) => setMatchGiveCard(cardId), matchGiveCard)}
            <button
              disabled={!matchGiveCard}
              onClick={() => giveCardToPlayer(matchGiveCard!)}
              className="mt-2 px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50"
            >
              Confirm
            </button>
          </div>
        )}
      </div>
    </div>
  );
}