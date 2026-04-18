import type { Player } from "../../../shared/types";
import PlayerHand from "./PlayerHand";

interface MatchPanelProps {
  matchReceiverId: string;
  me: Player;
  matchGiveCard: string | null;
  onSelectCard: (cardId: string) => void;
  onConfirm: () => void;
}

export default function MatchPanel({
  matchReceiverId,
  me,
  matchGiveCard,
  onSelectCard,
  onConfirm,
}: MatchPanelProps) {
  return (
    <div className="mt-4 p-4 border rounded bg-gray-100">
      <h3>Select a card from your hand to give to {matchReceiverId}</h3>
      <PlayerHand player={me} onCardClick={onSelectCard} selectedCardId={matchGiveCard} />
      <button
        disabled={!matchGiveCard}
        onClick={onConfirm}
        className="mt-2 px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50"
      >
        Confirm
      </button>
    </div>
  );
}
