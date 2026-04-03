import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { socket } from "../clientSocket/socket";
import type { GameState, Card, SocketResponse } from "../../../shared/types";
import { resolve } from "path";

export default function Game() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [gameState, setGameState] = useState<GameState | null>(null);

  const [pendingCardPower, setPendingCardPower] = useState<GameState["pendingCardPower"] | null>(null);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [selectedTargetCard, setSelectedTargetCard] = useState<string | null>(null);

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

  const readyCount = gameState.players.filter(p => p.ready).length;
  const totalPlayers = gameState.players.length;
  const isReady = me?.ready === true;

  const handleReady = () => {
    socket.emit("playerReady", roomId, (response: SocketResponse) => {
      if ("error" in response) {
        alert(response.error);
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

  const confirmPower = (parameters: { myCardId?: string; targetCardId?: string }) => {
    socket.emit("confirmPower", roomId, parameters, (response: SocketResponse) => {
      if ("error" in response) {
        alert(response.error);
      }
    });
  };
  
  const finishPower = () => {
    socket.emit("finishPower", roomId, (response: SocketResponse) => {
      if ("error" in response) {
        alert(response.error);
      }
      
      setSelectedCard(null);
      setSelectedTargetCard(null);
    });
  };

  const confirmAndFinishPower = (parameters: { myCardId?: string; targetCardId?: string }) => {
    socket.emit("confirmPower", roomId, parameters, (response: SocketResponse) => {
      if ("error" in response) {
        alert(response.error);
      }

      socket.emit("finishPower", roomId, (res: SocketResponse) => {
        if ("error" in res) {
          alert(res.error);
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
    else if (gameState.turnPhase === "drawing" || gameState.turnPhase === "power") {
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

  const getCardImage = (card: Card, ownerId: string) => {
    const isMe = ownerId === socket.id;
    
    const isVisible = card.visibility === "all" || (card.visibility === "owner" && isMe) || card.peekerId === socket.id;
    
    if (!isVisible) {
      return "/Deck_of_cards/back.png";
    }
  
    return `/Deck_of_cards/${card.id}.png`;
  };
  
  if (gameState.gamePhase === "setup") {
    return (
      <div>
        <h1>Peek Phase</h1>
        <p>You can see your bottom 2 cards. Memorize them!</p>
        <p>Players Ready: {readyCount} / {totalPlayers}</p>
        <div>
          {me?.hand.map(card => (
            <img
              src={getCardImage(card, me.id)}
              className="w-20 h-28 rounded-lg shadow-md cursor-pointer hover:scale-110 hover:shadow-xl transition-transform duration-200"
            />
          ))}
        </div>
  
        <button onClick={handleReady} disabled={isReady}>{isReady ? "Ready" : "Ready up"}</button>
      </div>
    );
  }

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
                <img
                  src={getCardImage(card, result.playerId)}
                  alt={card.id}
                  className="w-20 h-28 rounded-lg shadow-md cursor-pointer hover:scale-110 hover:shadow-xl transition-transform duration-200"
                />
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
        <div>
          {me?.hand.map(card => (
            <img
              src={getCardImage(card, me!.id)}
              alt={card.id}
              onClick={() => handleCardClick(card.id)}
              className="w-20 h-28 rounded-lg shadow-md cursor-pointer hover:scale-110 hover:shadow-xl transition-transform duration-200"
            />
          ))}
        </div>

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
                <div className="mb-2 flex gap-2 flex-wrap">
                  {me?.hand.map(card => (
                    <img
                      src={getCardImage(card, me.id)}
                      alt={card.id}
                      onClick={() => setSelectedCard(card.id)}
                      className={`w-20 h-28 rounded-lg shadow-md cursor-pointer transition-transform duration-200 
                        ${selectedCard === card.id ? "ring-4 ring-blue-400" : "hover:scale-110 hover:shadow-xl"}`}
                    />
                  ))}
                </div>
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
                    <div className="flex gap-2 flex-wrap">
                      {player.hand.map(card => (
                        <img
                          src={getCardImage(card, player.id)}
                          alt={card.id}
                          onClick={() => {setSelectedTargetCard(card.id)}}
                          className={`w-20 h-28 rounded-lg shadow-md cursor-pointer transition-transform duration-200
                            ${selectedTargetCard === card.id ? "ring-4 ring-blue-400" : "hover:scale-110 hover:shadow-xl"}`}
                        />
                      ))}
                    </div>
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
                  <div className="flex gap-2 flex-wrap">
                    {me?.hand.map(card => (
                      <img
                        src={getCardImage(card, me.id)}
                        alt={card.id}
                        onClick={() => setSelectedCard(card.id)}
                        className={`w-20 h-28 rounded-lg shadow-md cursor-pointer transition-transform duration-200
                          ${selectedCard === card.id ? "ring-4 ring-blue-400" : "hover:scale-110 hover:shadow-xl"}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="mb-2">
                  <h4>Other Players</h4>
                  {others.map(player => (
                    <div key={player.id} className="mb-2">
                      <h5>{player.id}</h5>
                      <div className="flex gap-2 flex-wrap">
                        {player.hand.map(card => (
                          <img
                            src={getCardImage(card, player.id)}
                            alt={card.id}
                            onClick={() => {setSelectedTargetCard(card.id)}}
                            className={`w-20 h-28 rounded-lg shadow-md cursor-pointer transition-transform duration-200
                              ${selectedTargetCard === card.id ? "ring-4 ring-blue-400" : "hover:scale-110 hover:shadow-xl"}`}
                          />
                        ))}
                      </div>
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
              <div>
                {player.hand.map(card => (
                  <img
                    src={getCardImage(card, player.id)}
                    alt={card.id}
                    className="w-20 h-28 rounded-lg shadow-md cursor-pointer hover:scale-110 hover:shadow-xl transition-transform duration-200"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}