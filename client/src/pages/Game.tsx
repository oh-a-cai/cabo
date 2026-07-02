import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { socket } from "../clientSocket/socket";
import type { GameState, SocketResponse } from "../../../shared/types";
import CardImage from "../components/CardImage";
import PlayerHand from "../components/PlayerHand";
import SetupPhase from "../components/SetupPhase";
import FinishedPhase from "../components/FinishedPhase";
import CardPowerPanel from "../components/CardPowerPanel";
import MatchPanel from "../components/MatchPanel";

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
    socket.emit("getGameState", roomId, (game: GameState | { error: string }) => {
      if ("error" in game) {
        alert(game.error);
        navigate("/");
        return;
      }
      setGameState(game);
    });

    const handler = (game: GameState) => {
      setGameState(game);
      setPendingCardPower(game.pendingCardPower || null);
      if (!game.countdownStartedAt) setCountdown(null);
      if (game.matchReceiverId && game.matchReceiverId !== socket.id) {
        setIsMatching(true);
        setMatchReceiverId(game.matchReceiverId);
      } else {
        setIsMatching(false);
        setMatchReceiverId(null);
        setMatchGiveCard(null);
      }
    };
    socket.on("gameState", handler);
    return () => { socket.off("gameState", handler); };
  }, [roomId, navigate]);

  useEffect(() => {
    if (!gameState?.countdownStartedAt) return;
    const calc = () => Math.max(5 - Math.floor((Date.now() - gameState.countdownStartedAt!) / 1000), 0);
    setCountdown(calc());
    const interval = setInterval(() => setCountdown(calc()), 500);
    return () => clearInterval(interval);
  }, [gameState?.countdownStartedAt]);

  if (!gameState) return <p>Loading game...</p>;

  const me = gameState.players.find(p => p.id === socket.id);
  const others = gameState.players.filter(p => p.id !== socket.id);
  const isMyTurn = gameState.players[gameState.turnId].id === me?.id;
  const canDraw = isMyTurn && gameState.turnPhase === "drawing";
  const canAct = isMyTurn && gameState.turnPhase === "action";

  // --- Socket handlers ---

  const handleReady = () => {
    socket.emit("playerReady", roomId, (res: SocketResponse) => {
      if ("error" in res) alert(res.error);
    });
  };

  const handleDrawFromDeck = () => {
    if (!canDraw) return;
    socket.emit("drawCard", roomId, "deck", (res: SocketResponse) => {
      if ("error" in res) alert(res.error);
    });
  };

  const handleDrawFromDiscard = () => {
    if (!canDraw) return;
    socket.emit("drawCard", roomId, "discard", (res: SocketResponse) => {
      if ("error" in res) alert(res.error);
    });
  };

  const handleDiscard = () => {
    socket.emit("discardCard", roomId, (res: SocketResponse) => {
      if ("error" in res) alert(res.error);
    });
  };

  const confirmPower = (params: { myCardId?: string; targetCardId?: string }) => {
    socket.emit("confirmPower", roomId, params, (res: SocketResponse) => {
      if ("error" in res) alert(res.error);
    });
  };

  const finishPower = () => {
    socket.emit("finishPower", roomId, (res: SocketResponse) => {
      if ("error" in res) { alert(res.error); return; }
      setSelectedCard(null);
      setSelectedTargetCard(null);
    });
  };

  const confirmAndFinishPower = (params: { myCardId?: string; targetCardId?: string }) => {
    socket.emit("confirmPower", roomId, params, (res: SocketResponse) => {
      if ("error" in res) { alert(res.error); return; }
      socket.emit("finishPower", roomId, (res2: SocketResponse) => {
        if ("error" in res2) { alert(res2.error); return; }
        setSelectedCard(null);
        setSelectedTargetCard(null);
      });
    });
  };

  const handleSkipPower = () => {
    socket.emit("skipPower", roomId, (res: SocketResponse) => {
      if ("error" in res) { alert(res.error); return; }
      setSelectedCard(null);
      setSelectedTargetCard(null);
    });
  };

  const handleSwap = (cardId: string) => {
    socket.emit("swapCard", roomId, cardId, (res: SocketResponse) => {
      if ("error" in res) alert(res.error);
    });
  };

  const handleMatchCard = (cardId: string) => {
    socket.emit("matchCard", roomId, cardId, (res: SocketResponse) => {
      if ("error" in res) { alert(res.error); return; }
      const receiverId = gameState?.matchReceiverId;
      if (receiverId && receiverId !== socket.id) {
        setIsMatching(true);
        setMatchReceiverId(receiverId);
      }
    });
  };

  const giveCardToPlayer = (myCardId: string) => {
    socket.emit("giveCardToPlayer", roomId, { myCardId }, (res: SocketResponse) => {
      if ("error" in res) alert(res.error);
      setIsMatching(false);
      setMatchReceiverId(null);
      setMatchGiveCard(null);
    });
  };

  const handleCardClick = (cardId: string) => {
    if (!gameState || !me) return;
    if (isMatching) {
      alert("You must give a card to complete the previous match first.");
      return;
    }
    if (canAct && me.drawnCard) {
      handleSwap(cardId);
    } else if (gameState.turnPhase === "drawing" || gameState.turnPhase === "power") {
      handleMatchCard(cardId);
    } else {
      alert("You cannot act on this card right now.");
    }
  };

  const handleCallCabo = () => {
    socket.emit("callCabo", roomId, (res: SocketResponse) => {
      if ("error" in res) alert(res.error);
    });
  };

  // --- Phase renders ---

  if (gameState.gamePhase === "finished") {
    return (
      <FinishedPhase
        gameState={gameState}
        onBackToLobby={() => navigate(`/room/${roomId}`)}
      />
    );
  }

  const topDeckCard = gameState.deck.at(-1);
  const topDiscardCard = gameState.discardPile.at(-1);

  return (
    <div 
      className="relative min-w-screen min-h-screen overflow-hidden" 
      style={{ fontFamily: "'Noto Sans Lao SemiCondensed', sans-serif" }}
    >
      <div className="bg-[url('./assets/game_bg.png')] bg-cover bg-center absolute inset-0" />

      {gameState.gamePhase === "setup" && me && (
        <SetupPhase
          me={me}
          players={gameState.players}
          countdown={countdown}
          readyCount={gameState.players.filter(p => p.ready).length}
          totalPlayers={gameState.players.length}
          isReady={me.ready === true}
          onReady={handleReady}
        />
      )}

      <div className="relative">
      <h1>Room: {roomId}</h1>
      <h2>Game Phase: {gameState.gamePhase}</h2>

      <h3>Deck: {gameState.deck.length} cards remaining</h3>
      {topDeckCard && (
        <div>
          <CardImage
            card={topDeckCard}
            ownerId="deck"
            onClick={handleDrawFromDeck}
            className={`w-20 h-28 rounded-lg shadow-md hover:scale-110 hover:shadow-xl transition-transform duration-200
              ${!canDraw ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          />
          <span>Click the deck to draw!</span>
        </div>
      )}

      <h3>Discard Pile: {gameState.discardPile.length} cards</h3>
      {topDiscardCard && (
        <div>
          <CardImage
            card={topDiscardCard}
            ownerId="discard"
            onClick={handleDrawFromDiscard}
            className={`w-20 h-28 rounded-lg shadow-md hover:scale-110 hover:shadow-xl transition-transform duration-200
              ${!canDraw ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          />
          <span>Click the discard pile to draw! (will be revealed to everyone)</span>
        </div>
      )}

      <h3>Current Turn: {gameState.players[gameState.turnId]?.name}</h3>
      <h4>Turn phase: {gameState.turnPhase}</h4>

      {gameState.isCaboCalled && (
        <div>
          <h2>{gameState.caboCaller!.name} has called Cabo!</h2>
          <p>Remaining turns: {gameState.remainingTurns! + 1}</p>
        </div>
      )}

      <div>
        <button onClick={handleCallCabo} disabled={!canDraw || gameState.isCaboCalled}>
          Call Cabo
        </button>
      </div>

      <div>
        <h2>Your Hand</h2>
        {me && <PlayerHand player={me} onCardClick={handleCardClick} />}

        {me?.drawnCard && (
          <div>
            <h3>Drawn Card:</h3>
            <CardImage
              card={me.drawnCard}
              ownerId={me.id}
              onClick={handleDiscard}
              className="w-20 h-28 rounded-lg shadow-md cursor-pointer hover:scale-110 hover:shadow-xl transition-transform duration-200"
            />
            <span>Click the drawn card to discard, or click a card in your hand to swap</span>
          </div>
        )}

        {pendingCardPower && pendingCardPower.playerId === socket.id && me && (
          <CardPowerPanel
            pendingCardPower={pendingCardPower}
            me={me}
            others={others}
            selectedCard={selectedCard}
            selectedTargetCard={selectedTargetCard}
            onSelectCard={setSelectedCard}
            onSelectTargetCard={setSelectedTargetCard}
            onConfirmPower={confirmPower}
            onFinishPower={finishPower}
            onConfirmAndFinishPower={confirmAndFinishPower}
            onSkipPower={handleSkipPower}
          />
        )}

        <div>
          <h2>Other Players</h2>
          {others.map(player => (
            <div key={player.id}>
              <p>{player.name}'s Hand</p>
              <PlayerHand player={player} onCardClick={handleCardClick} />
            </div>
          ))}
        </div>

        {isMatching && matchReceiverId && me && (
          <MatchPanel
            matchReceiverId={matchReceiverId}
            me={me}
            matchGiveCard={matchGiveCard}
            onSelectCard={setMatchGiveCard}
            onConfirm={() => giveCardToPlayer(matchGiveCard!)}
          />
        )}
      </div>
      </div>
    </div>
  );
}
