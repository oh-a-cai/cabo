import type { PendingCardPower } from "../../../shared/types";

interface CardPowerPanelProps {
  pendingCardPower: PendingCardPower;
  selectedCard: string | null;
  selectedTargetCard: string | null;
  onConfirmPower: (params: { myCardId?: string; targetCardId?: string }) => void;
  onFinishPower: () => void;
  onConfirmAndFinishPower: (params: { myCardId?: string; targetCardId?: string }) => void;
  onSkipPower: () => void;
}

// Same visual treatment as the CALL CABO button (white-bordered pill, gradient fill, stroked text), recolored per action
const THEME = {
  green: { gradient: 'linear-gradient(270deg, #86D96C 25%, #70BE4C 75%, #479A6D 125%)', dark: '#3B872C' },
  yellow: { gradient: 'linear-gradient(270deg, #FFF6AF 25%, #FFE397 50%, #EEAE00 125%)', dark: '#BF8849' },
  gray: { gradient: 'linear-gradient(270deg,rgb(81, 85, 70) 0%,rgb(62, 59, 52) 100%)', dark: '#4A4A4A' },
} as const;

function PowerButton({ children, onClick, disabled, variant }: {
  children: string;
  onClick?: () => void;
  disabled?: boolean;
  variant: keyof typeof THEME;
}) {
  const { gradient, dark } = THEME[variant];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center justify-center border-none transition-transform hover:scale-[1.04] active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ borderRadius: 10, border: '4px solid white', width: 150, height: 35 }}
    >
      <div style={{
        width: '100%', height: '100%', boxSizing: 'border-box',
        borderRadius: 6, background: gradient,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{
          fontSize: 20, fontWeight: 900, color: 'white',
          WebkitTextStroke: `0.25rem ${dark}`, paintOrder: 'stroke fill',
          letterSpacing: '0.04em',
        }}>
          {children}
        </span>
      </div>
    </button>
  );
}

export default function CardPowerPanel({
  pendingCardPower,
  selectedCard,
  selectedTargetCard,
  onConfirmPower,
  onFinishPower,
  onConfirmAndFinishPower,
  onSkipPower,
}: CardPowerPanelProps) {
  if (pendingCardPower.type === "peekSelf") {
    return pendingCardPower.myCardId ? (
      <PowerButton variant="gray" onClick={onFinishPower}>DONE</PowerButton>
    ) : (
      <div className="flex gap-2">
        <PowerButton variant="green" disabled={!selectedCard} onClick={() => onConfirmPower({ myCardId: selectedCard! })}>
          CONFIRM
        </PowerButton>
        <PowerButton variant="yellow" onClick={onSkipPower}>SKIP</PowerButton>
      </div>
    );
  }

  if (pendingCardPower.type === "peekOther") {
    return pendingCardPower.targetCardId ? (
      <PowerButton variant="gray" onClick={onFinishPower}>DONE</PowerButton>
    ) : (
      <div className="flex gap-2">
        <PowerButton variant="green" disabled={!selectedTargetCard} onClick={() => onConfirmPower({ targetCardId: selectedTargetCard! })}>
          CONFIRM
        </PowerButton>
        <PowerButton variant="yellow" onClick={onSkipPower}>SKIP</PowerButton>
      </div>
    );
  }

  if (pendingCardPower.type === "swap") {
    return (
      <div className="flex gap-2">
        <PowerButton
          variant="green"
          disabled={!selectedCard || !selectedTargetCard}
          onClick={() => onConfirmAndFinishPower({ myCardId: selectedCard!, targetCardId: selectedTargetCard! })}
        >
          CONFIRM
        </PowerButton>
        <PowerButton variant="yellow" onClick={onSkipPower}>SKIP</PowerButton>
      </div>
    );
  }

  return null;
}
