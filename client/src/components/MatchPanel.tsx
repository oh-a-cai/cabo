interface MatchPanelProps {
  matchGiveCard: string | null;
  onConfirm: () => void;
}

// Same visual treatment as the CALL CABO / CardPowerPanel buttons (white-bordered pill, green gradient, stroked text)
export default function MatchPanel({ matchGiveCard, onConfirm }: MatchPanelProps) {
  return (
    <button
      disabled={!matchGiveCard}
      onClick={onConfirm}
      className="flex items-center justify-center border-none transition-transform hover:scale-[1.04] active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ borderRadius: 10, border: '3px solid white', width: 150, height: 40 }}
    >
      <div style={{
        width: '100%', height: '100%', boxSizing: 'border-box',
        borderRadius: 8,
        background: 'linear-gradient(90deg, #8FE39C 0%, #3DC95A 50%, #2FA347 100%)',
        border: '3.5px solid #0F8930',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{
          fontSize: 20, fontWeight: 900, color: 'white',
          WebkitTextStroke: '0.25rem #0F8930', paintOrder: 'stroke fill',
          letterSpacing: '0.04em',
        }}>
          CONFIRM
        </span>
      </div>
    </button>
  );
}
