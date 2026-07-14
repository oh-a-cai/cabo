import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { DragEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { socket } from "../clientSocket/socket";
import type { GameState, SocketResponse } from "../../../shared/types";
import CardImage from "../components/CardImage";
import SetupPhase from "../components/SetupPhase";
import FinishedPhase from "../components/FinishedPhase";
import CardPowerPanel from "../components/CardPowerPanel";
import MatchPanel from "../components/MatchPanel";
import tableExterior from "../assets/table_exterior.png";
import tableInterior from "../assets/table_interior.png";

const HEX_CLIP = 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)';

// 5 opponent slots, clockwise from top (me is always at bottom) — pulled in from the table edge for breathing room
const OPP_SLOTS = [
  { x: 800,    y: 263.89 }, // top
  { x: 951.59, y: 350.17 }, // top-right
  { x: 951.59, y: 549.83 }, // bottom-right
  { x: 648.41, y: 549.83 }, // bottom-left
  { x: 648.41, y: 350.17 }, // top-left
] as const;

// rotation (deg) making each hand perpendicular to its hexagon edge, matching OPP_SLOTS order.
// Each is the "perpendicular" angle plus 180°: this flips which side of the (unmirrored, same
// col*2+row indexing as "me") 2×2 grid ends up facing outward toward the player, so the owner-known
// cards (hand[1]/hand[3]) land on the correct side without needing any row/col index remapping.
const OPP_ROTATIONS = [-180, -120, -60, -300, -240] as const;

// name tag position for each seat (300×45 tags) — centered on the same seat-radial anchor, left/right mirrored with equal gap
const OPP_NAME_POS = [
  { left: 650,     top: 78.92  }, // top
  { left: 1129.97, top: 277.25 }, // top-right
  { left: 1129.97, top: 577.75 }, // bottom-right
  { left: 170.03,  top: 577.75 }, // bottom-left
  { left: 170.03,  top: 277.25 }, // top-left
] as const;

// OPP_SLOTS indices: 0=top, 1=top-right, 2=bottom-right, 3=bottom-left, 4=top-left
// per-opponent-count seat layout, ordered clockwise from my left seat to my right seat (turn order follows this too)
const SLOT_ORDER_BY_COUNT: Record<number, readonly number[]> = {
  1: [0],           // top
  2: [4, 1],        // top-left, top-right
  3: [4, 0, 1],     // top-left, top, top-right
  4: [3, 4, 1, 2],  // bottom-left, top-left, top-right, bottom-right
  5: [3, 4, 0, 1, 2], // bottom-left, top-left, top, top-right, bottom-right
};

export default function Game() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [scale, setScale] = useState(1);

  const [pendingCardPower, setPendingCardPower] = useState<GameState["pendingCardPower"] | null>(null);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [selectedTargetCard, setSelectedTargetCard] = useState<string | null>(null);

  const [isMatching, setIsMatching] = useState(false);
  const [matchReceiverId, setMatchReceiverId] = useState<string | null>(null);
  const [matchGiveCard, setMatchGiveCard] = useState<string | null>(null);
  const [isDragOverDiscard, setIsDragOverDiscard] = useState(false);
  const discardDragCounter = useRef(0); // dragenter/dragleave bubble from child elements, so count nesting depth instead of using a plain boolean

  useLayoutEffect(() => {
    const upd = () => setScale(Math.min(window.innerWidth / 1600, window.innerHeight / 900));
    upd();
    window.addEventListener('resize', upd);
    return () => window.removeEventListener('resize', upd);
  }, []);

  useEffect(() => {
    socket.emit("getGameState", roomId, (game: GameState | { error: string }) => {
      if ("error" in game) { alert(game.error); navigate("/"); return; }
      setGameState(game);
    });

    const handler = (game: GameState) => {
      setGameState(game);
      setPendingCardPower(game.pendingCardPower || null);
      if (!game.countdownStartedAt) setCountdown(null);
      if (game.matchReceiverId && game.matcherId === socket.id) {
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
    const calc = () => Math.max(3 - Math.max(0, Math.floor((Date.now() - gameState.countdownStartedAt!) / 1000)), 0);
    setCountdown(calc());
    const interval = setInterval(() => setCountdown(calc()), 500);
    return () => clearInterval(interval);
  }, [gameState?.countdownStartedAt]);

  if (!gameState) return <p>Loading game...</p>;

  const me = gameState.players.find(p => p.id === socket.id);
  // ordered by turn sequence relative to me: index 0 = player right after me (my left), last = player right before me (my right)
  const myIndex = gameState.players.findIndex(p => p.id === socket.id);
  const others = myIndex === -1
    ? gameState.players.filter(p => p.id !== socket.id)
    : Array.from({ length: gameState.players.length - 1 }, (_, k) => gameState.players[(myIndex + 1 + k) % gameState.players.length]);
  const isMyTurn = gameState.players[gameState.turnId]?.id === me?.id;
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
      if ("error" in res) alert(res.error);
      // isMatching/matchReceiverId are set from the "gameState" broadcast that follows
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
    } else {
      alert("You cannot act on this card right now.");
    }
  };

  // Matching is drag-and-drop only (drop a card onto the discard pile), allowed at any time — even
  // mid-power-selection or while holding a drawn card — so it's no longer gated by turn phase
  const canMatch = true;
  const handleCardDragStart = (e: DragEvent<HTMLImageElement>, cardId: string) => {
    e.dataTransfer.setData("text/plain", cardId);
  };
  const handleDiscardDragEnter = () => {
    discardDragCounter.current++;
    setIsDragOverDiscard(true);
  };
  const handleDiscardDragLeave = () => {
    discardDragCounter.current--;
    if (discardDragCounter.current <= 0) {
      discardDragCounter.current = 0;
      setIsDragOverDiscard(false);
    }
  };
  const handleDiscardDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    discardDragCounter.current = 0;
    setIsDragOverDiscard(false);
    const cardId = e.dataTransfer.getData("text/plain");
    if (!cardId) return;
    if (isMatching) {
      alert("You must give a card to complete the previous match first.");
      return;
    }
    handleMatchCard(cardId);
  };

  const handleCallCabo = () => {
    socket.emit("callCabo", roomId, (res: SocketResponse) => {
      if ("error" in res) alert(res.error);
    });
  };

  if (gameState.gamePhase === "finished") {
    return <FinishedPhase gameState={gameState} onBackToLobby={() => navigate(`/room/${roomId}`)} />;
  }

  // --- Derived values ---
  const topDeckCard = gameState.deck.at(-1);
  const topDiscardCard = gameState.discardPile.at(-1);
  const currentPlayer = gameState.players[gameState.turnId];
  const POWER_TEXT = {
    peekSelf: 'Peeking at your own card...',
    peekOther: "Peeking at an opponent's card...",
    swap: 'Swapping two cards...',
  } as const;
  const matchReceiver = gameState.players.find(p => p.id === matchReceiverId);
  const turnText = isMatching && matchReceiverId && me
    ? `Give a card to ${matchReceiver?.name ?? '?'}`
    : isMyTurn
    ? (canDraw ? 'Your turn — draw a card'
      : canAct ? 'Your turn — swap or discard'
      : gameState.pendingCardPower ? POWER_TEXT[gameState.pendingCardPower.type]
      : 'Using card power...')
    : `${currentPlayer?.name ?? '?'}'s turn`;

  // My card grid constants (33.73×47.20 cards, scaled gap → grid)
  const MY_CW = 33.73, MY_CH = 47.20, MY_GAP = 3.85;
  const MY_GW = MY_CW * 2 + MY_GAP;
  const MY_GH = MY_CH * 2 + MY_GAP;
  const MY_GX = 800 - MY_GW / 2;
  const MY_GY = 638.37 - MY_GH / 2;   // fits between deck/discard row and the table's bottom edge

  // Hex table layer helper: flat-top hex centered at (800, 450) on 1600×900 canvas
  // (center sits at the canvas's vertical midpoint so top/bottom margins match, outer height 609.17)
  const hexLayer = (w: number, h: number, bg: string, glow?: string) => (
    <div style={{
      position: 'absolute',
      left: 800 - w / 2, top: 450 - h / 2,
      width: w, height: h,
      filter: glow,
    }}>
      <div style={{ width: '100%', height: '100%', clipPath: HEX_CLIP, background: bg }} />
    </div>
  );

  // Table image layer — same centering as hexLayer, no clip-path (the PNG is already hex-shaped)
  // optional glow is a filter on the image itself, so it can only render on top of it, never underneath
  const imageLayer = (w: number, h: number, src: string, glow?: string) => (
    <img src={src} alt="" style={{ position: 'absolute', left: 800 - w / 2, top: 450 - h / 2, width: w, height: h, filter: glow }} />
  );

  return (
    <div
      className="w-screen h-screen overflow-hidden relative"
      style={{ fontFamily: "'Noto Sans Lao SemiCondensed', sans-serif" }}
    >
      <div className="bg-[url('./assets/game_bg.png')] bg-cover bg-center absolute inset-0" />

      {/* Setup overlay — rendered at viewport level so position:fixed works correctly */}
      {gameState.gamePhase === 'setup' && me && (
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

      {/* 1600×900 scaled canvas — scale clamped to fit viewport */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        transform: `translate(-50%, -50%) scale(${scale})`,
        transformOrigin: 'center center',
        width: 1600, height: 900,
      }}>

        {/* Hex table: concentric layers (glow → exterior image → border → ring → interior image), same center */}
        {hexLayer(702.82, 609.17, '#22162D',
          'drop-shadow(0 0 18px rgba(152,128,224,0.9)) drop-shadow(0 0 55px rgba(100,80,200,0.5))')}
        {imageLayer(700, 610, tableExterior)}
        {hexLayer(620, 540, '#9462D2')}
        {hexLayer(595, 525, '#8048C5')}
        {imageLayer(570, 505, tableInterior)}
        {/* Inner glow — blurred SVG stroke, hard-clipped to tableInterior's exact hex boundary so the
            blur can't bleed past the true edge onto the layers behind it, and the clip snaps any
            blur-rounded corners back to the sharp hex vertices */}
        <div style={{
          position: 'absolute',
          left: 800 - 570 / 2, top: 450 - 505 / 2,
          width: 570, height: 505,
          clipPath: HEX_CLIP,
          overflow: 'hidden',
          pointerEvents: 'none',
        }}>
          <svg style={{ position: 'absolute', width: 570, height: 505 }} viewBox="0 0 570 505">
            <defs>
              <filter id="hexGlowBlur" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="12" />
              </filter>
            </defs>
            <polygon points="142.5,0 427.5,0 570,252.5 427.5,505 142.5,505 0,252.5"
              fill="none" stroke="#D2C1E8" strokeWidth="24" filter="url(#hexGlowBlur)" />
          </svg>
        </div>

        {/* Deck (left of hex center) */}
        <div style={{ position: 'absolute', top: 395.10, left: 800 - 92.71 }}>
          {topDeckCard ? (
            <CardImage
              card={topDeckCard}
              ownerId="deck"
              onClick={canDraw ? handleDrawFromDeck : undefined}
              className={`w-[78.45px] h-[109.80px] shadow-md transition-transform duration-150 ${canDraw ? 'cursor-pointer hover:scale-110' : ''}`}
            />
          ) : (
            <div className="w-[78.45px] h-[109.80px]"
              style={{ background: '#0A0918', border: '1px solid #3A3550' }} />
          )}
          <div style={{ color: '#22162D', fontWeight: 900, fontSize: 10, textAlign: 'center', marginTop: 3 }}>
            DECK ({gameState.deck.length})
          </div>
        </div>

        {/* Discard pile (right of hex center) — drop zone for matching */}
        <div
          style={{
            position: 'absolute', top: 395.10, left: 800 + 14.26,
            borderRadius: 8,
            filter: isDragOverDiscard ? 'drop-shadow(0 0 10px rgba(245,210,80,0.95)) drop-shadow(0 0 4px rgba(245,210,80,0.95))' : undefined,
            transition: 'filter 0.15s ease',
          }}
          onDragOver={canMatch ? (e) => e.preventDefault() : undefined}
          onDragEnter={canMatch ? handleDiscardDragEnter : undefined}
          onDragLeave={canMatch ? handleDiscardDragLeave : undefined}
          onDrop={canMatch ? handleDiscardDrop : undefined}
        >
          {topDiscardCard ? (
            <CardImage
              card={topDiscardCard}
              ownerId="discard"
              onClick={canDraw ? handleDrawFromDiscard : undefined}
              className={`w-[78.45px] h-[109.80px] shadow-md transition-transform duration-150 ${canDraw ? 'cursor-pointer hover:scale-110' : ''}`}
            />
          ) : (
            <div className="w-[78.45px] h-[109.80px]"
              style={{ background: 'transparent', border: '1px dashed #3A3550' }} />
          )}
          <div style={{ color: '#22162D', fontWeight: 900, fontSize: 10, textAlign: 'center', marginTop: 3 }}>
            DISCARD
          </div>
        </div>

        {/* Opponent zones — seat layout depends on opponent count, clockwise from my left to my right */}
        {(() => { const slotOrder = SLOT_ORDER_BY_COUNT[others.length] ?? []; return others.map((player, i) => {
          const slotIdx = slotOrder[i];
          const slot = slotIdx !== undefined ? OPP_SLOTS[slotIdx] : undefined;
          if (!slot) return null;
          const rotation = slotIdx !== undefined ? OPP_ROTATIONS[slotIdx] ?? 0 : 0;
          const isCurrent = gameState.players[gameState.turnId]?.id === player.id;
          const namePos = slotIdx !== undefined ? OPP_NAME_POS[slotIdx] : undefined;
          const CW = MY_CW, CH = MY_CH, GAP = MY_GAP;
          const gW = CW * 2 + GAP;
          const gH = CH * 2 + GAP;
          return (
            <Fragment key={player.id}>
              {/* Drawn card indicator — rendered first so it sits behind this opponent's hand and name tag,
                  shifted to the tag's edge nearest the table and tilted inward for rotated seats */}
              {namePos && player.drawnCard && (() => {
                const isTopSeat = slotIdx === 0;
                const shiftX = isTopSeat ? 0 : (slot.x < 800 ? 100 : -100);
                const tilt = isTopSeat ? 0 : rotation / 36;
                return (
                  <div style={{
                    position: 'absolute',
                    left: namePos.left + 150 - 66.39 / 2 + shiftX,
                    top: namePos.top - 65.2,
                    transform: `rotate(${tilt}deg)`,
                  }}>
                    <CardImage card={player.drawnCard} ownerId={player.id} className="w-[66.39px] h-[92.93px] shadow-md" />
                  </div>
                );
              })()}
              {/* transformOrigin is pinned to the original 2×2 box center (not the default 50% 50%, which
                  would recompute against the wider box once burn-overflow columns 2-3 render, swinging the
                  original 4 cards around a shifted pivot) so the base hand position never moves. */}
              <div style={{ position: 'absolute', left: slot.x - gW / 2, top: slot.y - gH / 2, transform: `rotate(${rotation}deg)`, transformOrigin: `${gW / 2}px ${gH / 2}px` }}>
                <div style={{ display: 'flex', gap: GAP }}>
                  {[0, 1, 2, 3].map(col => (
                    <div key={col} style={{ display: 'flex', flexDirection: 'column', gap: GAP }}>
                      {[0, 1].map(row => {
                        // Same col*2+row order as "me" — OPP_ROTATIONS already accounts for which side of the
                        // grid faces the player, so no row/col remapping is needed here.
                        // Cols 2-3 are burn-card overflow (indexes 4-7, capped at 8 total): same order,
                        // offset by 4, but with no empty-slot placeholder since those slots don't always exist.
                        const idx = col < 2 ? col * 2 + row : 4 + (col - 2) * 2 + row;
                        const card = player.hand[idx];
                        if (!card) {
                          return col < 2 ? <div key={row} style={{ width: CW, height: CH }} /> : null;
                        }
                        return (
                          <CardImage
                            key={card.id}
                            card={card}
                            ownerId={player.id}
                            onClick={() => {
                              if (pendingCardPower && pendingCardPower.playerId === socket.id) {
                                if (pendingCardPower.type !== "peekSelf" && !pendingCardPower.targetCardId) setSelectedTargetCard(card.id);
                              } else {
                                handleCardClick(card.id);
                              }
                            }}
                            draggable={canMatch}
                            onDragStart={(e) => handleCardDragStart(e, card.id)}
                            className={`w-[33.73px] h-[47.20px] transition-transform duration-150 cursor-pointer hover:scale-110 ${selectedTargetCard === card.id ? 'ring-2 ring-purple-400' : ''}`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
              {/* Player name bar — unrotated, sits just outside the table edge */}
              {namePos && (
                <div style={{
                  position: 'absolute',
                  left: namePos.left,
                  top: namePos.top,
                  width: 300,
                  height: 45,
                  background: 'linear-gradient(174deg, #3D414A 50%, #2D313B 50%)',
                  border: `4px solid ${isCurrent ? '#ECB718' : '#FFFFFF'}`,
                  filter: `${isCurrent ? 'drop-shadow(0 0 6px rgba(245,210,80,0.9))' : ''}`,
                  borderRadius: 12,
                  padding: '2px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 900,
                  fontSize: 24,
                  WebkitTextStroke: '0.25em #2D2E41', 
                  paintOrder: 'stroke fill',
                  textAlign: 'center',
                  boxSizing: 'border-box',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {player.name}
                </div>
              )}
            </Fragment>
          );
        }); })()}

        {/* My zone */}
        {me && (
          <>
            {/* 2×2 card grid */}
            <div style={{ position: 'absolute', left: MY_GX, top: MY_GY, display: 'flex', gap: MY_GAP }}>
              {[0, 1, 2, 3].map(col => (
                <div key={col} style={{ display: 'flex', flexDirection: 'column', gap: MY_GAP }}>
                  {[0, 1].map(row => {
                    // Cols 2-3 are burn-card overflow (indexes 4-7, capped at 8 total): same order as
                    // cols 0-1, offset by 4, with no empty-slot placeholder since those slots don't always exist.
                    const idx = col < 2 ? col * 2 + row : 4 + (col - 2) * 2 + row;
                    const card = me.hand[idx];
                    if (!card) {
                      return col < 2 ? <div key={row} style={{ width: MY_CW, height: MY_CH }} /> : null;
                    }
                    return (
                      <CardImage
                        key={card.id}
                        card={card}
                        ownerId={me.id}
                        onClick={() => {
                          if (isMatching) {
                            setMatchGiveCard(card.id);
                          } else if (pendingCardPower && pendingCardPower.playerId === socket.id) {
                            if (pendingCardPower.type !== "peekOther" && !pendingCardPower.myCardId) setSelectedCard(card.id);
                          } else {
                            handleCardClick(card.id);
                          }
                        }}
                        draggable={canMatch && !isMatching}
                        onDragStart={(e) => handleCardDragStart(e, card.id)}
                        className={`w-[33.73px] h-[47.20px] shadow-md transition-transform duration-150 cursor-pointer hover:scale-110 hover:shadow-xl ${selectedCard === card.id ? 'ring-2 ring-yellow-400' : ''} ${matchGiveCard === card.id ? 'ring-2 ring-green-400' : ''}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Drawn card — click to discard*/}
            {me.drawnCard && (
              <div style={{ position: 'absolute', left: 1100.07, top: 726.52 }}>
                <div style={{ filter: 'drop-shadow(0 0 20px  #5FA2FF' }}>
                  <CardImage
                    card={me.drawnCard}
                    ownerId={me.id}
                    onClick={handleDiscard}
                    draggable={false}
                    className="w-[105.64px] h-[148.04px] cursor-pointer hover:scale-110 transition-transform duration-150"
                  />
                </div>
              </div>
            )}

            {/* My name bar */}
            <div style={{
              position: 'absolute',
              left: 800 - 239.065,
              top: 768.585,   // just past the table's bottom edge (754.585)
              width: 478.13,
              height: 63.90,
              background: 'linear-gradient( #222745 50%, #536898 150%)',
              border: `4px solid ${isMyTurn ? '#ECB718' : '#FFFFFF'}`,
              filter: `${isMyTurn ? 'drop-shadow(0 0 6px rgba(245,210,80,0.9))' : ''}`,
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 900,
              fontSize: 36,
              WebkitTextStroke: '0.3em #565883', 
              paintOrder: 'stroke fill',
              overflow: 'hidden',
              boxSizing: 'border-box',
              padding: '0 10px',
            }}>
              {me.name}
            </div>
          </>
        )}

        {/* Room label — top left. Kept flush with the canvas edge (not bled past it) since at exact-16:9
            viewports (1920×1080, 2560×1440) the scaled canvas fills the screen with zero letterboxing
            margin, so anything positioned outside 0-1600 gets clipped by the outer overflow-hidden wrapper. */}
        <div style={{ position: 'absolute', top: 30, left: 30 }}>
          <div style={{
            color: 'white', fontWeight: 900, fontSize: 35,
            WebkitTextStroke: '0.25em #2A2840', paintOrder: 'stroke fill',
            letterSpacing: '0.06em',
          }}>
            LOBBY #{roomId}
          </div>
          <div style={{ width: 200, height: 6, marginLeft: -5, marginTop: -6, background: 'white', border: '0.15em solid #2A2840', borderRadius: 4 }} />
        </div>

        {/* Turn status — inside the hex table, above the deck/discard pile. pointerEvents:none since this
            spans the full table width and would otherwise block clicks on opponent hand cards behind it */}
        <div style={{
          position: 'absolute', top: 340, left: 0, right: 0, textAlign: 'center',
          color: isMyTurn ? '#F5D060' : '#B0A0E8',
          fontWeight: 900, fontSize: 16,
          letterSpacing: '0.03em',
          textShadow: isMyTurn
            ? '0 0 14px rgba(245,200,50,0.7)'
            : '0 0 12px rgba(152,128,224,0.6)',
          pointerEvents: 'none',
        }}>
          {turnText}
        </div>

        {/* Cabo called banner — below turn status */}
        {gameState.isCaboCalled && (
          <div style={{
            position: 'absolute', top: 365, left: 0, right: 0, textAlign: 'center',
            color: 'rgb(242, 120, 82)', fontWeight: 900, fontSize: 14,
            letterSpacing: '0.04em',
            textShadow: '0 0 10px rgba(232, 116, 80, 0.6)',
            pointerEvents: 'none',
          }}>
            {gameState.caboCaller?.name} called CABO!
          </div>
        )}

        {/* Call Cabo button — bottom center */}
        <button
          onClick={handleCallCabo}
          disabled={!canDraw || gameState.isCaboCalled}
          className="flex items-center justify-center border-none transition-transform hover:scale-[1.04] active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ position: 'absolute', borderRadius: 10, border: '3px solid white', left: 30, top: 830, width: 150, height: 40 }}
        >
          <div style={{
            width: '100%', 
            height: '100%',
            boxSizing: 'border-box',
            borderRadius: 8, 
            background: 'linear-gradient(90deg, #92E3F2 0%, #3DC9E2 50%, #47BCD0 100%)',
            border: '3.5px solid #0F6989',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{
              fontSize: 20, fontWeight: 900, color: 'white',
              WebkitTextStroke: '0.25rem #388592', paintOrder: 'stroke fill',
              letterSpacing: '0.04em',
            }}>
              CALL CABO
            </span>
          </div>
        </button>

        {/* Leave table button — bottom right*/}
        <button
          onClick={() => navigate('/')}
          className="flex items-center justify-center border-none transition-all duration-200 hover:scale-[1.04] active:scale-[0.97]"
          style={{ position: 'absolute', borderRadius: 10, border: '3px solid white', right: 30, top: 830, width: 170, height: 40 }}
        >
          <div style={{
            width: '100%', 
            height: '100%',
            boxSizing: 'border-box',
            borderRadius: 8,
            background: 'linear-gradient( #CD1F1F 25%, #670F0F 125%)',
            border: '2.5px solid #4D0A0A',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{
              fontSize: 20, fontWeight: 900, color: 'white',
              WebkitTextStroke: '0.25rem #8F0C0C', paintOrder: 'stroke fill',
              letterSpacing: '0.04em',
            }}>
              LEAVE TABLE
            </span>
          </div>
        </button>

        {/* Card power controls — below my name tag (768.585 + 63.90 height), no overlay */}
        {pendingCardPower && pendingCardPower.playerId === socket.id && me && (
          <div style={{
            position: 'absolute',
            left: 0, right: 0, top: 846,
            display: 'flex', justifyContent: 'center',
            zIndex: 50,
          }}>
            <CardPowerPanel
              pendingCardPower={pendingCardPower}
              selectedCard={selectedCard}
              selectedTargetCard={selectedTargetCard}
              onConfirmPower={confirmPower}
              onFinishPower={finishPower}
              onConfirmAndFinishPower={confirmAndFinishPower}
              onSkipPower={handleSkipPower}
            />
          </div>
        )}

        {/* Give-a-card controls — below my name tag, no overlay. Card selection happens by clicking my
            own hand cards directly (see matchGiveCard highlight above); only the matcher sees this. */}
        {isMatching && matchReceiverId && me && (
          <div style={{
            position: 'absolute',
            left: 0, right: 0, top: 846,
            display: 'flex', justifyContent: 'center',
            zIndex: 50,
          }}>
            <MatchPanel
              matchGiveCard={matchGiveCard}
              onConfirm={() => giveCardToPlayer(matchGiveCard!)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
