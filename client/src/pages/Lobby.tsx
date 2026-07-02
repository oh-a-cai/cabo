import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { socket } from "../clientSocket/socket";
import type { Player, GameState, SocketResponse } from "../../../shared/types";

const MAX_PLAYERS = 6;

export default function Lobby() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [players, setPlayers] = useState<Player[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [skinTab, setSkinTab] = useState<'color' | 'card'>('color');
  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedCard, setSelectedCard] = useState(0);

  useEffect(() => {
    socket.emit("getGameState", roomId, (game: GameState | { error: string }) => {
      if ("error" in game) {
        alert(game.error);
        navigate("/");
        return;
      }
      setPlayers(game.players);
      setIsHost(game.players.find(p => p.id === socket.id)?.isHost ?? false);
      if (game.gamePhase === "setup") navigate(`/game/${roomId}`);
    });

    const roomHandler = (game: GameState) => {
      setPlayers(game.players);
      setIsHost(game.players.find(p => p.id === socket.id)?.isHost ?? false);
    };
    const gameHandler = (game: GameState) => {
      if (game.gamePhase === "setup") navigate(`/game/${roomId}`);
    };

    socket.on("roomUpdate", roomHandler);
    socket.on("gameState", gameHandler);
    return () => {
      socket.off("roomUpdate", roomHandler);
      socket.off("gameState", gameHandler);
    };
  }, [roomId, navigate]);

  const leaveRoom = () => {
    socket.emit("leaveRoom", roomId, (res: SocketResponse) => {
      if ("error" in res) { alert(res.error); return; }
      navigate("/");
    });
  };

  const startGame = () => socket.emit("startGame", roomId);

  return (
    <div
      className="relative min-w-screen min-h-screen overflow-hidden"
      style={{ fontFamily: "'Noto Sans Lao SemiCondensed', sans-serif" }}
    >
      {/* Shared background */}
      <div className="bg-[url('./assets/main_menu_bg.png')] bg-cover bg-center absolute inset-0" />

      {/* BACK button — same as room select panel */}
      <button
        onClick={leaveRoom}
        className="absolute top-2 left-3 z-20 flex items-center gap-2 bg-transparent border-none transition-transform hover:scale-105 active:scale-95"
      >
        <svg width="1.5rem" height="1.5rem" viewBox="0 0 80 87" fill="none" style={{ transform: 'scaleX(-1)' }}>
          <path d="M68.1328 34.4821C74.7401 38.3423 74.7401 47.8914 68.1328 51.7516L20.0449 79.8453C13.3784 83.7401 5 78.9314 5 71.2106V15.0231C5 7.30222 13.3784 2.49355 20.0449 6.38831L68.1328 34.4821Z"
            stroke="#DD6969" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" fill="white" />
        </svg>
        <span style={{
          fontSize: '1.9rem', fontWeight: 900, color: 'white',
          WebkitTextStroke: '0.25em #DD6969', paintOrder: 'stroke fill', letterSpacing: '0.05em',
        }}>BACK</span>
      </button>

      {/* Settings gear — same as room select panel */}
      <button
        className="absolute top-2 right-3 z-20 bg-transparent border-none transition-transform hover:scale-110 hover:rotate-45 active:scale-95"
        style={{ transition: 'transform 0.3s ease' }}
      >
        <svg width="2.5rem" height="2.5rem" viewBox="0 0 24 24" fill="none">
          <path fillRule="evenodd" clipRule="evenodd"
            d="M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
            fill="white" stroke="#FF9F9F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Page layout */}
      <div
        className="relative flex flex-col items-center h-screen select-none"
        style={{ padding: '3rem 15rem 2rem', boxSizing: 'border-box' }}
      >
        {/* LOBBY # title */}
        <div style={{
          fontSize: '6rem', fontWeight: 900, color: 'white',
          WebkitTextStroke: '0.20em #8573B1', paintOrder: 'stroke fill',
          letterSpacing: '0.04em', lineHeight: 1.1,
          marginBottom: '1.5rem',
        }}>
          LOBBY #{roomId}
        </div>

        {/* Main panel */}
        <div
          className="flex"
          style={{
            width: '100%', maxWidth: '72rem', flex: 1, maxHeight: '24rem',
            borderRadius: '2rem',
            backgroundColor: '#96A0CF',
            border: '0.25rem solid #FFFFFF',
            boxShadow: '0 0 0 0.4rem #2D3251',
            padding: '1rem 1rem', gap: '4rem',
          }}
        >
          {/* Left column — player list */}
          <div style={{ flex: '0 0 36%', minWidth: 0, borderRadius: '2rem', backgroundColor: '#7986BF', display: 'flex', flexDirection: 'column', gap: '0.8rem', padding: '1.2rem 1.5rem' }}>
            {/* PLAYERS header + count */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '2rem' }}>
              <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'stretch' }}>
                <span style={{
                  fontSize: '2.5em', fontWeight: 900, color: 'white',
                  WebkitTextStroke: '0.3em #505889', paintOrder: 'stroke fill',
                  letterSpacing: '0.05em', lineHeight: 1.1,
                }}>
                  PLAYERS
                </span>
                <div style={{
                  height: '0.3rem',
                  backgroundColor: 'white',
                  border: '0.3rem solid #505889',
                  borderRadius: '0.5rem',
                  margin: '0 -0.7rem',
                }} />
              </div>
              <span style={{ fontSize: '2.8rem', fontWeight: 900, color: '#1E254D', marginTop: '-1rem' }}>
                {players.length}/{MAX_PLAYERS}
              </span>
            </div>

            {/* Player entries */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.1rem', flex: 1, justifyContent: 'space-evenly' }}>
              {Array.from({ length: MAX_PLAYERS }, (_, i) => {
                const player = players[i];
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                    {player ? (
                      player.isHost ? (
                        <svg width="1.3rem" height="0.65rem" viewBox="0 0 76 38" fill="none" style={{ flexShrink: 0 }}>
                          <path d="M75.5767 2.12266C75.7862 2.01592 76.0297 2.18819 75.997 2.42003L71.0181 37.7511C70.998 37.8938 70.8752 38 70.7303 38H6.36174C6.05658 38 5.95763 37.5921 6.22923 37.4537L75.5767 2.12266Z" fill="#E5CB60"/>
                          <path d="M0.42332 2.12266C0.213813 2.01592 -0.029705 2.18819 0.00296617 2.42003L4.98189 37.7511C5.00201 37.8938 5.12479 38 5.26972 38H69.6383C69.9434 38 70.0424 37.5921 69.7708 37.4537L0.42332 2.12266Z" fill="#E5CB60"/>
                          <path d="M37.7796 0.100645C37.8956 -0.0335487 38.1045 -0.033548 38.2204 0.100645L70.561 37.5225C70.723 37.71 70.5891 38 70.3406 38H5.6594C5.4109 38 5.277 37.71 5.43897 37.5225L37.7796 0.100645Z" fill="#E5CB60"/>
                        </svg>
                      ) : (
                        <span style={{
                          width: '0.5rem', height: '0.5rem',
                          borderRadius: '50%', backgroundColor: '#1E2B68',
                          display: 'inline-block', flexShrink: 0, marginLeft: '0.1rem',
                        }} />
                      )
                    ) : (
                      <span style={{
                        width: '0.5rem', height: '0.5rem',
                        borderRadius: '50%', backgroundColor: '#5060A0',
                        display: 'inline-block', flexShrink: 0, marginLeft: '0.1rem',
                        opacity: 0.4,
                      }} />
                    )}
                    <span style={{
                      fontSize: '1.5rem', fontWeight: 900,
                      color: player ? '#1E2B68' : '#5060A0',
                      opacity: player ? 1 : 0.6,
                    }}>
                      {player ? player.name : '...empty...'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right column — skin area + controls */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Skin/etc panel */}
            <div style={{
              flex: 1, borderRadius: '1.2rem',
              backgroundColor: '#5765A7', minHeight: '12rem',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}>
              {/* Tabs */}
              <div style={{ display: 'flex' }}>
                {(['color', 'card'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setSkinTab(tab)}
                    className="border-none transition-colors"
                    style={{
                      flex: 1, padding: '0.55rem 0',
                      fontSize: '1rem', fontWeight: 900,
                      color: skinTab === tab ? '#1E254D' : 'rgba(255,255,255,0.55)',
                      backgroundColor: skinTab === tab ? '#7986BF' : 'transparent',
                      borderRadius: tab === 'color' ? '1.2rem 0 0 0' : '0 1.2rem 0 0',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {tab === 'color' ? 'COLOR SCHEME' : 'CARD SKINS'}
                  </button>
                ))}
              </div>
              <div style={{ height: '0.18rem', backgroundColor: '#2F3252' }} />

              {/* 2×3 grid */}
              {(() => {
                const colorItems = ['Default', 'Coming Soon...', 'Coming Soon...', 'Coming Soon...', 'Coming Soon...', 'Coming Soon...'];
                const cardItems = ['Default', 'Coming Soon...', 'Coming Soon...', 'Coming Soon...', 'Coming Soon...', 'Coming Soon...'];
                const items = skinTab === 'color' ? colorItems : cardItems;
                const selected = skinTab === 'color' ? selectedColor : selectedCard;
                const setSelected = skinTab === 'color' ? setSelectedColor : setSelectedCard;
                return (
                  <div style={{
                    flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr',
                    gap: '0.6rem', padding: '0.75rem',
                  }}>
                    {items.map((label, i) => {
                      const locked = label === 'Coming Soon...';
                      return (
                      <button
                        key={i}
                        onClick={() => !locked && setSelected(i)}
                        disabled={locked}
                        className={`border-none${!locked ? ' hover:scale-[1.03] active:scale-[0.97]' : ''}`}
                        style={{
                          borderRadius: '0.6rem',
                          backgroundColor: selected === i ? '#CDD6FF' : '#7080C0',
                          border: selected === i ? '0.15rem solid white' : '0.15rem solid transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          opacity: locked ? 0.35 : 1,
                          cursor: locked ? 'not-allowed' : 'pointer',
                          transition: locked ? 'none' : 'transform 0.1s',
                        }}
                      >
                        <span style={{
                          fontSize: '0.85rem', fontWeight: 900,
                          color: selected === i ? '#1E254D' : 'rgba(255,255,255,0.6)',
                          letterSpacing: '0.03em',
                        }}>
                          {label}
                        </span>
                      </button>
                    );})}
                  </div>
                );
              })()}
            </div>

            {isHost ? (
              <button
                onClick={startGame}
                className="flex items-center justify-center border-none transition-transform hover:scale-[1.03] active:scale-[0.97]"
                style={{ width: '60%', height: '3.94rem', alignSelf: 'center', marginBottom: '1rem' }}
              >
                <div
                  className="flex items-center justify-center w-full h-full"
                  style={{
                    borderRadius: '0.80rem',
                    background: 'linear-gradient(90deg, #FFF93F 0%, #DFC149 100%)',
                    border: '0.31rem solid white',
                  }}
                >
                  <span style={{
                    fontSize: '1.75rem', fontWeight: 900, color: 'white',
                    WebkitTextStroke: '0.45rem #9C8A25', paintOrder: 'stroke fill',
                    letterSpacing: '0.04em',
                  }}>
                    START GAME
                  </span>
                </div>
              </button>
            ) : (
              <div style={{
                width: '60%', height: '3.94rem', alignSelf: 'center', marginBottom: '1rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                textAlign: 'center', fontSize: '1.5rem', fontWeight: 900,
                color: '#BE2B2B', letterSpacing: '0.02em', whiteSpace: 'nowrap',
              }}>
                Waiting for host to start...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
