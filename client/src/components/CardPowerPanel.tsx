import type { PendingCardPower, Player } from "../../../shared/types";
import PlayerHand from "./PlayerHand";

interface CardPowerPanelProps {
  pendingCardPower: PendingCardPower;
  me: Player;
  others: Player[];
  selectedCard: string | null;
  selectedTargetCard: string | null;
  onSelectCard: (cardId: string) => void;
  onSelectTargetCard: (cardId: string) => void;
  onConfirmPower: (params: { myCardId?: string; targetCardId?: string }) => void;
  onFinishPower: () => void;
  onConfirmAndFinishPower: (params: { myCardId?: string; targetCardId?: string }) => void;
  onSkipPower: () => void;
}

export default function CardPowerPanel({
  pendingCardPower,
  me,
  others,
  selectedCard,
  selectedTargetCard,
  onSelectCard,
  onSelectTargetCard,
  onConfirmPower,
  onFinishPower,
  onConfirmAndFinishPower,
  onSkipPower,
}: CardPowerPanelProps) {
  if (pendingCardPower.type === "peekSelf") {
    return (
      <>
        <h3 className="mb-2">Peek one of your cards</h3>
        <PlayerHand player={me} onCardClick={onSelectCard} selectedCardId={selectedCard} />
        {!pendingCardPower.myCardId ? (
          <div>
            <button
              disabled={!selectedCard}
              onClick={() => onConfirmPower({ myCardId: selectedCard! })}
              className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50"
            >
              Confirm
            </button>
            <button onClick={onSkipPower} className="px-4 py-2 bg-gray-400 text-white rounded ml-2">
              Skip
            </button>
          </div>
        ) : (
          <button onClick={onFinishPower} className="px-4 py-2 bg-blue-500 text-white rounded">
            Done
          </button>
        )}
      </>
    );
  }

  if (pendingCardPower.type === "peekOther") {
    return (
      <>
        <h3 className="mb-2">Peek another player's card</h3>
        {others.map(player => (
          <div key={player.id} className="mb-2">
            <h4>{player.name}</h4>
            <PlayerHand player={player} onCardClick={onSelectTargetCard} selectedCardId={selectedTargetCard} />
          </div>
        ))}
        {!pendingCardPower.targetCardId ? (
          <div>
            <button
              disabled={!selectedTargetCard}
              onClick={() => onConfirmPower({ targetCardId: selectedTargetCard! })}
              className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50"
            >
              Confirm
            </button>
            <button onClick={onSkipPower} className="px-4 py-2 bg-gray-400 text-white rounded ml-2">
              Skip
            </button>
          </div>
        ) : (
          <button onClick={onFinishPower} className="px-4 py-2 bg-blue-500 text-white rounded">
            Done
          </button>
        )}
      </>
    );
  }

  if (pendingCardPower.type === "swap") {
    return (
      <>
        <h3 className="mb-2">Swap a card with another player</h3>
        <div className="mb-2">
          <h4>Your Hand</h4>
          <PlayerHand player={me} onCardClick={onSelectCard} selectedCardId={selectedCard} />
        </div>
        <div className="mb-2">
          <h4>Other Players</h4>
          {others.map(player => (
            <div key={player.id} className="mb-2">
              <h5>{player.name}</h5>
              <PlayerHand player={player} onCardClick={onSelectTargetCard} selectedCardId={selectedTargetCard} />
            </div>
          ))}
        </div>
        <button
          disabled={!selectedCard || !selectedTargetCard}
          onClick={() => onConfirmAndFinishPower({ myCardId: selectedCard!, targetCardId: selectedTargetCard! })}
          className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50"
        >
          Confirm
        </button>
        <button onClick={onSkipPower} className="px-4 py-2 bg-gray-400 text-white rounded ml-2">
          Skip
        </button>
      </>
    );
  }

  return null;
}
