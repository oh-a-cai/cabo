import type { Player } from "../../../shared/types";
import CardImage from "./CardImage";

interface PlayerHandProps {
  player: Player;
  onCardClick?: (cardId: string) => void;
  selectedCardId?: string | null;
}

// Cards are laid out in a 4-column × 2-row grid:
//   index mapping: col * 2 + row
//   0 2 4 6
//   1 3 5 7
const COLS = 4;
const ROWS = 2;

export default function PlayerHand({ player, onCardClick, selectedCardId }: PlayerHandProps) {
  return (
    <div className="flex gap-2">
      {Array.from({ length: COLS }).map((_, col) => (
        <div key={col} className="flex flex-col gap-2">
          {Array.from({ length: ROWS }).map((_, row) => {
            const index = col * 2 + row;
            const card = player.hand[index] ?? null;

            if (!card) return <div key={index} className="w-20 h-28" />;

            return (
              <CardImage
                key={card.id}
                card={card}
                ownerId={player.id}
                onClick={() => onCardClick?.(card.id)}
                className={`w-20 h-28 rounded-lg shadow-md transition-transform duration-200
                  ${onCardClick ? "cursor-pointer" : ""}
                  ${selectedCardId === card.id ? "ring-4 ring-blue-400" : "hover:scale-110 hover:shadow-xl"}`}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
