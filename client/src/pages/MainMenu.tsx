import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GameState, SocketResponse } from '../../../shared/types';
import { socket } from '../clientSocket/socket';

export default function MainMenu() {
  const navigate = useNavigate();
  const [room, setRoom] = useState('');
  const [name, setName] = useState('');
  const [nameSet, setNameSet] = useState(false);

  const createRoom = () => {
    socket.emit('createRoom', name, () => {
      console.log('Room Created:', room);
    });
    socket.once('roomUpdate', (game: GameState) => {
      navigate(`/room/${game.id}`);
    });
  };

  const joinRoom = () => {
    socket.emit('joinRoom', room, name, (response: SocketResponse) => {
      if ('error' in response) {
        alert(response.error);
        return;
      }
      navigate(`/room/${room}`);
    });
  };

  const goBack = () => {
    setNameSet(false);
    setRoom('');
  };

  return (
    <div
      className="relative min-w-screen min-h-screen overflow-hidden"
      style={{ fontFamily: "'Noto Sans Lao SemiCondensed', sans-serif" }}
    >
      {/* Shared background */}
      <div className="bg-[url('./assets/main_menu_bg.png')] bg-cover bg-center absolute inset-0" />

      {/* Transition between both panels */}
      <div
        className="relative flex w-[200vw] min-h-screen"
        style={{
          transform: nameSet ? 'translateX(-50%)' : 'translateX(0)',
          transition: 'transform 0.55s cubic-bezier(0.77, 0, 0.18, 1)',
        }}
      >
        {/* Main Menu */}
        <div className="relative w-[100vw] min-h-screen flex flex-col items-center justify-center select-none">
          {/* Title Format */}
          <div className="flex flex-col items-center" style={{ marginTop: '-24rem' }}>
            <div className="relative flex flex-col items-center">
              {/* Left Card 1 */}
              <div
                className="absolute"
                style={{
                  width: '3.5rem', height: '5.5rem',
                  borderRadius: '1rem',
                  backgroundColor: 'white',
                  border: '12.5px solid #2F3252',
                  transform: 'rotate(-25deg)',
                  top: '3rem', left: '3.5rem',
                }}
              />
              {/* Left Card 2 */}
              <div
                className="absolute"
                style={{
                  width: '3.5rem', height: '5.5rem',
                  borderRadius: '1rem',
                  backgroundColor: 'white',
                  border: '12.5px solid #2F3252',
                  transform: 'rotate(-25deg)',
                  top: '0rem', left: '5rem',
                }}
              />
              {/* Title */}
              <div
                className="relative z-10"
                style={{
                  fontSize: 'clamp(5.5rem, 11vw, 9rem)',
                  fontWeight: 900,
                  color: 'white',
                  WebkitTextStroke: '0.22em #2F3252',
                  paintOrder: 'stroke fill',
                  letterSpacing: '0.03em',
                  lineHeight: 1.25,
                }}
              >
                CABO
              </div>
              {/* Right Card 1 */}
              <div
                className="absolute"
                style={{
                  width: '3.5rem', height: '5.5rem',
                  borderRadius: '1rem',
                  backgroundColor: 'white',
                  border: '12.5px solid #2F3252',
                  transform: 'rotate(25deg)',
                  top: '3rem', right: '3.5rem',
                }}
              />
              {/* Right Card 2 */}
              <div
                className="absolute"
                style={{
                  width: '3.5rem', height: '5.5rem',
                  borderRadius: '1rem',
                  backgroundColor: 'white',
                  border: '12.5px solid #2F3252',
                  transform: 'rotate(25deg)',
                  top: '0rem', right: '5rem',
                }}
              />
              {/* Subtitle */}
              <div
                className="relative z-10"
                style={{
                  fontSize: 'clamp(1rem, 2vw, 2.5rem)',
                  fontWeight: 900,
                  color: 'white',
                  WebkitTextStroke: '10px #4B4665',
                  paintOrder: 'stroke fill',
                  letterSpacing: '0.01em',
                }}
              >
                The memory-based strategy card game
              </div>
            </div>
          </div>

          {/* Name input box */}
          <div
            className="absolute top-1/2 flex items-center justify-center"
            style={{
              width: 'clamp(22rem, 34vw, 34rem)',
              height: '6rem',
              borderRadius: '1rem',
              border: '5px solid #623F5D',
              backgroundColor: '#FFFFFF',
            }}
          >
            <div
              className="absolute inset-[6px]"
              style={{ backgroundColor: '#D4C7D2', borderRadius: '0.5rem' }}
            />
            <input
              className="relative z-10 flex-1 bg-transparent outline-none font-black text-[#4B4665] placeholder-[#FFFFFF]/60"
              style={{
                fontSize: 'clamp(1.3rem, 2.5vw, 2.5rem)',
                border: 'none',
                marginLeft: '2rem',
              }}
              placeholder="enter nickname"
              value={name}
              onChange={(e) => { setName(e.target.value); setNameSet(false); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && name) setNameSet(true); }}
            />
            {/* Triangle enter button */}
            <button
              onClick={() => setNameSet(true)}
              disabled={!name}
              className="relative flex items-center justify-center right-6 transition-transform hover:scale-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
              style={{
                width: '4.5rem',
                height: '4.5rem',
                backgroundColor: '#F5ED96',
                borderRadius: '0.5rem',
                border: '3px solid #4A4511',
              }}
            >
              <svg className="relative z-10" width="48" height="40" viewBox="0 0 70 87" fill="none">
                <path
                  d="M68.1328 34.4821C74.7401 38.3423 74.7401 47.8914 68.1328 51.7516L20.0449 79.8453C13.3784 83.7401 5 78.9314 5 71.2106V15.0231C5 7.30222 13.3784 2.49355 20.0449 6.38831L68.1328 34.4821Z"
                  fill="#FFFDEA"
                  stroke="#6D5C24"
                  strokeWidth={10}
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Create Room/Join Room */}
        <div className="relative w-[100vw] min-h-screen flex flex-col items-center select-none">

          {/* Back button */}
          <button
            onClick={goBack}
            className="absolute top-6 left-6 z-20 flex items-center gap-2 transition-transform hover:scale-105 active:scale-95"
          >
            {/* Arrow triangle */}
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M18 4L8 14L18 24" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span
              style={{
                fontSize: '1.6rem',
                fontWeight: 900,
                color: 'white',
                WebkitTextStroke: '6px #C0392B',
                paintOrder: 'stroke fill',
                letterSpacing: '0.05em',
              }}
            >
              BACK
            </span>
          </button>

          {/* Settings gear */}
          <button className="absolute top-6 right-6 z-20 transition-transform hover:scale-110 hover:rotate-45 active:scale-95" style={{ transition: 'transform 0.3s ease' }}>
            <svg width="42" height="42" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 15a3 3 0 100-6 3 3 0 000 6z"
                stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              />
              <path
                d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
                stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              />
            </svg>
          </button>

          {/* Compact title format */}
          <div className="flex flex-col items-center pt-8 pb-2">
            <div
              style={{
                fontSize: 'clamp(2.8rem, 5vw, 4rem)',
                fontWeight: 900,
                color: 'white',
                WebkitTextStroke: '0.12em #2F3252',
                paintOrder: 'stroke fill',
                letterSpacing: '0.05em',
                lineHeight: 1,
              }}
            >
              {/* Mini card decorations flanking the title */}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4em' }}>
                <span style={{
                  display: 'inline-block',
                  width: '1.1rem', height: '1.7rem',
                  borderRadius: '0.25rem',
                  backgroundColor: 'white',
                  border: '4px solid #2F3252',
                  transform: 'rotate(-20deg)',
                  verticalAlign: 'middle',
                  marginBottom: '0.1em',
                }} />
                CABO
                <span style={{
                  display: 'inline-block',
                  width: '1.1rem', height: '1.7rem',
                  borderRadius: '0.25rem',
                  backgroundColor: 'white',
                  border: '4px solid #2F3252',
                  transform: 'rotate(20deg)',
                  verticalAlign: 'middle',
                  marginBottom: '0.1em',
                }} />
              </span>
            </div>
            <div
              style={{
                fontSize: 'clamp(0.7rem, 1.2vw, 1rem)',
                fontWeight: 700,
                color: 'white',
                WebkitTextStroke: '4px #4B4665',
                paintOrder: 'stroke fill',
                letterSpacing: '0.01em',
              }}
            >
              The memory-based strategy card game
            </div>
          </div>

          {/* ── Control Panel ── */}
          <div
            className="relative flex flex-col items-center justify-around"
            style={{
              width: 'clamp(22rem, 48vw, 46rem)',
              minHeight: 'clamp(22rem, 42vh, 34rem)',
              borderRadius: '2rem',
              background: 'linear-gradient(160deg, #9BAABF 0%, #7A8FA8 40%, #6B7E96 100%)',
              border: '5px solid #B8C8D8',
              boxShadow: '0 8px 40px rgba(0,0,0,0.45), inset 0 2px 4px rgba(255,255,255,0.15)',
              padding: '1.8rem 2.2rem',
              marginTop: '0.5rem',
            }}
          >
            {/* Corner bolts */}
            {[
              { top: '1rem', left: '1rem' },
              { top: '1rem', right: '1rem' },
              { bottom: '1rem', left: '1rem' },
              { bottom: '1rem', right: '1rem' },
            ].map((pos, i) => (
              <div
                key={i}
                className="absolute"
                style={{
                  ...pos,
                  width: '2rem', height: '2rem',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle at 35% 35%, #D0D8E0, #8A9BB0)',
                  border: '2px solid #6A7A8E',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)',
                }}
              />
            ))}

            {/* Vertical side rails */}
            {['left', 'right'].map((side) => (
              <div
                key={side}
                className="absolute top-1/2 -translate-y-1/2"
                style={{
                  [side]: '0.55rem',
                  width: '0.55rem',
                  height: '55%',
                  borderRadius: '0.3rem',
                  background: 'linear-gradient(180deg, #7A8FA8, #5A6E84)',
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)',
                }}
              />
            ))}

            {/* Top recessed panel — Join Room */}
            <div
              style={{
                width: '100%',
                borderRadius: '1.2rem',
                background: 'linear-gradient(180deg, #58697C 0%, #4A5D70 100%)',
                boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.4), inset 0 1px 3px rgba(0,0,0,0.3)',
                padding: '1.2rem 1.4rem 1.4rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.9rem',
              }}
            >
              {/* ENTER ROOM input */}
              <div
                style={{
                  borderRadius: '0.75rem',
                  background: 'linear-gradient(180deg, #BCC8D4 0%, #C8D4DF 100%)',
                  boxShadow: 'inset 0 3px 8px rgba(0,0,0,0.25)',
                  padding: '0.7rem 1.2rem',
                }}
              >
                <input
                  className="w-full bg-transparent outline-none font-black text-center tracking-widest"
                  style={{
                    fontSize: 'clamp(1.2rem, 2.2vw, 1.8rem)',
                    color: '#8A9BB0',
                    letterSpacing: '0.12em',
                  }}
                  placeholder="ENTER ROOM"
                  value={room}
                  onChange={(e) => setRoom(e.target.value.toUpperCase())}
                  onKeyDown={(e) => { if (e.key === 'Enter' && room) joinRoom(); }}
                />
              </div>

              {/* JOIN ROOM button */}
              <button
                onClick={joinRoom}
                disabled={!room}
                className="relative w-full transition-transform hover:scale-[1.03] active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ borderRadius: '3rem' }}
              >
                <div
                  style={{
                    borderRadius: '3rem',
                    background: 'linear-gradient(180deg, #5BC85B 0%, #3EA83E 50%, #2E8A2E 100%)',
                    border: '3.5px solid #1F6B1F',
                    boxShadow: '0 6px 0 #1A5A1A, 0 8px 16px rgba(0,0,0,0.3)',
                    padding: '0.75rem 2rem',
                    transform: 'translateY(0)',
                    transition: 'transform 0.1s, box-shadow 0.1s',
                  }}
                >
                  <span
                    style={{
                      fontSize: 'clamp(1.3rem, 2.5vw, 2rem)',
                      fontWeight: 900,
                      color: 'white',
                      WebkitTextStroke: '5px #1A5A1A',
                      paintOrder: 'stroke fill',
                      letterSpacing: '0.08em',
                    }}
                  >
                    JOIN ROOM
                  </span>
                </div>
              </button>
            </div>

            {/* Bottom recessed panel — Create Room */}
            <div
              style={{
                width: '100%',
                borderRadius: '1.2rem',
                background: 'linear-gradient(180deg, #6B7A8D 0%, #5C6C80 100%)',
                boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.3)',
                padding: '1rem 1.4rem',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              {/* CREATE ROOM button */}
              <button
                onClick={createRoom}
                className="relative w-full transition-transform hover:scale-[1.03] active:scale-[0.97]"
                style={{ borderRadius: '2rem' }}
              >
                <div
                  style={{
                    borderRadius: '2rem',
                    background: 'linear-gradient(180deg, #FFE566 0%, #F5C800 50%, #D4A800 100%)',
                    border: '3.5px solid #9A7A00',
                    boxShadow: '0 6px 0 #8A6A00, 0 8px 16px rgba(0,0,0,0.3)',
                    padding: '0.75rem 2rem',
                  }}
                >
                  <span
                    style={{
                      fontSize: 'clamp(1.3rem, 2.5vw, 2rem)',
                      fontWeight: 900,
                      color: 'white',
                      WebkitTextStroke: '5px #7A5500',
                      paintOrder: 'stroke fill',
                      letterSpacing: '0.08em',
                      display: 'block',
                      lineHeight: 1.15,
                    }}
                  >
                    CREATE<br />ROOM
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}