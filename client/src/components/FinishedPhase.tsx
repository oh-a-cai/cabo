import { useEffect, useState } from "react";
import { socket } from "../clientSocket/socket";
import type { GameState } from "../../../shared/types";

interface FinishedPhaseProps {
  gameState: GameState;
}

const CARD_BACK = "/assets/Deck_of_cards/back.webp";

// Points down when collapsed (click to pull the panel open), up when expanded (click to push it back up)
function Triangle({ open }: { open: boolean }) {
  return (
    <div style={{
      width: 0, height: 0,
      borderLeft: '2.5rem solid transparent',
      borderRight: '2.5rem solid transparent',
      borderTop: '1.2rem solid black',
      transition: 'transform 400ms ease-in-out',
      transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
    }} />
  );
}

// Little indicator pinned to the top of the viewport — click the triangle to drop the results
// panel down, click again to push it back up and reveal the table underneath. Sized with rem
// units (not the canvas's JS `scale`) so it tracks the viewport the same way SetupPhase does,
// via the clamp(20px, 1.3vw, 40px) root font-size in index.css.
export default function FinishedPhase({ gameState }: FinishedPhaseProps) {
  // Mounts closed and flips open right after, so the drop-down transition actually plays instead of
  // the panel just appearing pre-expanded (a CSS transition only fires on a state change, not on
  // the very first render).
  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => { setIsOpen(true); }, []);

  const isLocalWinner = gameState.winner === socket.id;
  const winnerName = gameState.players.find(p => p.id === gameState.winner)?.name;
  const title = isLocalWinner ? "You won!!" : `${winnerName ?? "?"} won!!`;

  const outlinedText = { WebkitTextStroke: '0.24em #2A2840', paintOrder: 'stroke fill' , letterSpacing: '0.03em'} as const;

  return (
    <div
      className="fixed top-0 left-1/2 -translate-x-1/2 z-[100] select-none"
      style={{ width: 'min(34rem, 92vw)', fontFamily: "'Noto Sans Lao SemiCondensed', sans-serif" }}
    >
      <div style={{
        position: 'relative',
        border: '0.6rem solid white',
        borderTop: 'none',
        borderRadius: '0 0 1.75rem 1.75rem',
        overflow: 'hidden',
      }}>
        {/* Card-back texture, sized in rem (not %) off its true 13733x17190 aspect ratio so it scales with
            the root clamp() font-size the same way the rest of the UI does. The outer box is fixed at the
            card's true ON-SCREEN (post-rotation) size, so bottom-anchoring it to the panel is predictable —
            collapsed, only the card's bottom edge peeks out at the top of the screen; opening grows the
            panel downward, pulling the rest of the card down into view until the whole card shows.
            (Rotating the img itself around its own center would shift its bounding box off-screen whenever
            width != height, which is why the card disappeared when collapsed — centering the pre-rotated
            img inside a wrapper sized to the rotated result avoids that.) */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '40rem', height: '31.96rem', overflow: 'hidden', zIndex: 0 }}>
          <img
            src={CARD_BACK}
            alt=""
            style={{ position: 'absolute', top: '50%', left: '40%', width: '40rem', height: '40rem', transform: 'translate(-50%, -50%) rotate(-90deg)' }}
          />
        </div>

        {/* Fixed peek strip at the top of the card — always present so the collapsed card still has
            something to peek out from behind the arrow below it. */}
        <div style={{ height: '0.5rem' }} />

        {/* Content — grid-rows trick animates 0 -> content height without measuring, so it works for any player count */}
        <div className="relative z-10 transition-[grid-template-rows] duration-500 ease-in-out" style={{ display: 'grid', gridTemplateRows: isOpen ? '1fr' : '0fr' }}>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ padding: '0 1.2rem 1.2rem' }}>
              <h1 style={{ ...outlinedText, color: 'white', fontWeight: 900, fontSize: '3rem', textAlign: 'center', margin: '0 0 1rem' }}>
                {title}
              </h1>

              {/* Table as separate rectangles (header + one per row, each split into a Players and a
                  Score cell) with gaps between them for that individual-tile look — but corner radius
                  only applied at the 4 outer corners of the whole table, every other cell stays square */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <div style={{ flex: 1, borderRadius: '0.5rem 0 0 0', background: 'rgba(255, 230, 230, 0.72)', fontWeight: 900, color: '#3A1010', textDecoration: 'underline', padding: '0.5rem 0.75rem' }}>
                    Players
                  </div>
                  <div style={{ width: '3.5rem', borderRadius: '0 0.5rem 0 0', background: 'rgba(255, 230, 230, 0.72)', fontWeight: 900, color: '#3A1010', textDecoration: 'underline', textAlign: 'left', padding: '0.5rem 0.75rem' }}>
                    Score
                  </div>
                </div>
                {gameState.results.map((result, index) => {
                  const isLast = index === gameState.results.length - 1;
                  return (
                  <div key={result.player.id} style={{ display: 'flex', gap: '0.35rem' }}>
                    <div style={{
                      flex: 1, borderRadius: isLast ? '0 0 0 0.5rem' : 0,
                      background: 'rgba(196, 155, 155, 0.72)', color: 'black', fontWeight: 900, padding: '0.5rem 0.75rem',
                    }}>
                      {index + 1}. {result.player.name}
                      {result.caboPenalty && <span style={{ fontWeight: 400, fontSize: '0.75rem', opacity: 0.8 }}> (+10 penalty)</span>}
                    </div>
                    <div style={{
                      width: '3.5rem', borderRadius: isLast ? '0 0 0.5rem 0' : 0,
                      background: 'rgba(196, 155, 155, 0.72)', color: 'black', fontWeight: 900, textAlign: 'left', padding: '0.5rem 0.75rem',
                    }}>
                      {result.score}
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Single arrow, always in flow right after the animated content above — as that content's
            height transitions between 0 and full, this naturally reflows down/up with it, so the same
            element drops down with the card on open and rises back up on close (flip animation kept
            via Triangle's own rotate transition). */}
        <button
          onClick={() => setIsOpen(o => !o)}
          className="relative z-10 w-full flex flex-col items-center border-none cursor-pointer bg-transparent transition-transform hover:scale-[1.02] active:scale-[0.97]"
          style={{ paddingBottom: '0.5rem' }}
        >
          <Triangle open={isOpen} />
          {isOpen && <span style={{ color: 'black', fontWeight: 900, fontSize: '0.9rem' }}>show table</span>}
        </button>
      </div>
    </div>
  );
}
