import { socket } from "../clientSocket/socket";
import type { Player } from "../../../shared/types";
import CardImage from "./CardImage";

interface SetupPhaseProps {
  me: Player;
  players: Player[];
  countdown: number | null;
  readyCount: number;
  totalPlayers: number;
  isReady: boolean;
  onReady: () => void;
}

const MAX_PLAYERS = 6;

export default function SetupPhase({
  me,
  players,
  countdown,
  readyCount,
  totalPlayers,
  isReady,
  onReady,
}: SetupPhaseProps) {

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center select-none"
      style={{
        zIndex: 50,
        backgroundColor: 'rgba(15, 21, 27, 0.65)',
        fontFamily: "'Noto Sans Lao SemiCondensed', sans-serif",
      }}
    >
      {/* Countdown overlay */}
      {countdown !== null && (
        <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 60, backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div
            key={countdown}
            style={{
              fontSize: '22rem', fontWeight: 900, color: 'white',
              WebkitTextStroke: '0.14em #A83636', paintOrder: 'stroke fill',
              letterSpacing: '0.08em', lineHeight: 1,
              animation: 'countdown-tick 1s ease-in-out forwards',
            }}
          >
            {countdown}
          </div>
        </div>
      )}

      {/* Main panel */}
      <div style={{
        display: 'flex', flexDirection: 'row',
        gap: '2rem', width: 'min(72rem, 90vw)', alignItems: 'center',
      }}>

        {/* Left — players panel */}
        <div style={{
          flex: '0 0 26%', minWidth: 0,
          borderRadius: '1.5rem',
          border: '0.2rem solid #FFFFFF',
          backgroundColor: '#7986BF',
          minHeight: 'min(36rem, 78vh)',
          display: 'flex', flexDirection: 'column',
        }}>
        <div style={{
          borderRadius: '1.5rem', backgroundColor: '#7986BF',
          display: 'flex', flexDirection: 'column', gap: '0.6rem',
          padding: '1rem 1.2rem', flex: 1,
        }}>
          {/* PLAYERS header */}
          <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'stretch' }}>
            <span style={{
              fontSize: '2.3rem', fontWeight: 900, color: 'white',
              WebkitTextStroke: '0.25em #505889', paintOrder: 'stroke fill',
              letterSpacing: '0.05em', lineHeight: 1.1,
            }}>
              PLAYERS
            </span>
            <div style={{
              height: '0.25rem', backgroundColor: 'white',
              border: '0.25rem solid #505889', borderRadius: '0.5rem',
              margin: '0 5rem 0 -0.5rem',
            }} />
          </div>

          {/* Player list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1, justifyContent: 'space-evenly' }}>
            {Array.from({ length: MAX_PLAYERS }, (_, i) => {
              const player = players[i];
              const isMe = player?.id === socket.id;
              const ready = player?.ready;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {player ? (
                    player.isHost ? (
                      <svg width="1.1rem" height="0.55rem" viewBox="0 0 76 38" fill="none" style={{ flexShrink: 0 }}>
                        <path d="M75.5767 2.12266C75.7862 2.01592 76.0297 2.18819 75.997 2.42003L71.0181 37.7511C70.998 37.8938 70.8752 38 70.7303 38H6.36174C6.05658 38 5.95763 37.5921 6.22923 37.4537L75.5767 2.12266Z" fill="#E5CB60"/>
                        <path d="M0.42332 2.12266C0.213813 2.01592 -0.029705 2.18819 0.00296617 2.42003L4.98189 37.7511C5.00201 37.8938 5.12479 38 5.26972 38H69.6383C69.9434 38 70.0424 37.5921 69.7708 37.4537L0.42332 2.12266Z" fill="#E5CB60"/>
                        <path d="M37.7796 0.100645C37.8956 -0.0335487 38.1045 -0.033548 38.2204 0.100645L70.561 37.5225C70.723 37.71 70.5891 38 70.3406 38H5.6594C5.4109 38 5.277 37.71 5.43897 37.5225L37.7796 0.100645Z" fill="#E5CB60"/>
                      </svg>
                    ) : (
                      <span style={{
                        width: '0.45rem', height: '0.45rem', borderRadius: '50%',
                        backgroundColor: isMe ? '#12205E' : '#5060A0',
                        display: 'inline-block', flexShrink: 0,
                      }} />
                    )
                  ) : (
                    <span style={{
                      width: '0.45rem', height: '0.45rem', borderRadius: '50%',
                      backgroundColor: '#5060A0', display: 'inline-block',
                      flexShrink: 0, opacity: 0,
                    }} />
                  )}
                  <span style={{
                    fontSize: '1.5rem', fontWeight: 900,
                    color: player ? (isMe ? '#12205E' : '#3E4D93') : '#5060A0',
                    opacity: player ? 1 : 0, flex: 1,
                  }}>
                    {player ? `${player.name}` : 'empty'}
                  </span>
                  <span style={{
                    fontSize: '0.9rem', fontWeight: 900,
                    color: ready ? '#6DDE44' : '#262F5D',
                    opacity: player ? 1 : 0,
                    width: '4rem', flexShrink: 0, textAlign: 'left',
                  }}>
                    {player ? (ready ? 'READY' : 'waiting...') : ''}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Ready count */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0', alignItems: 'center', marginTop: 'auto' }}>
            <div style={{ fontSize: '3rem', fontWeight: 900, color: '#30375D', textAlign: 'center', lineHeight: 1 }}>
              {readyCount}/{totalPlayers}
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 900, color: '#3D4470', textAlign: 'center' }}>
              PLAYERS READY
            </div>
          </div>

          {/* Ready up button */}
          <button
              onClick={onReady}
              disabled={isReady}
              className="flex items-center justify-center border-none transition-transform hover:scale-[1.03] active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ width: '80%', height: '3rem', alignSelf: 'center', marginBottom: '1rem', marginTop: '1rem' }}
            >
              <div
                className="flex items-center justify-center w-full h-full"
                style={{
                  borderRadius: '0.75rem',
                  background: '#F5ED96',
                  border: '0.25rem solid #4D4813',
                }}
              >
                <span style={{
                  fontSize: '1.75rem', fontWeight: 900, color: 'white',
                  WebkitTextStroke: '0.45rem #6D5C24', paintOrder: 'stroke fill',
                  letterSpacing: '0.04em',
                }}>
                  {isReady ? 'READY!' : 'READY UP'}
                </span>
              </div>
            </button>
        </div>
        </div>

        {/* Middle — 2×2 grid matching PlayerHand layout */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="flex gap-7">
            {[0, 1].map(col => (
              <div key={col} className="flex flex-col gap-7">
                {[0, 1].map(row => {
                  const card = me.hand[col * 2 + row];
                  return card ? (
                    <CardImage
                      key={card.id}
                      card={card}
                      ownerId={me.id}
                      className="w-28 h-40 rounded-lg shadow-md"
                    />
                  ) : (
                    <div key={`${col}-${row}`} className="w-28 h-40" />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Right — temp column */}
        <div style={{ flex: '0 0 18rem', display: 'flex', alignItems: 'center' }}></div>
      </div>
    </div>
  );
}
