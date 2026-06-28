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
          <div className="flex flex-col items-center" style={{ marginTop: '-48vh' }}>
            <div className="relative flex flex-col items-center">
              {/* Left Card 1 */}
              <div
                className="absolute"
                style={{
                  width: '3.5rem', height: '5rem',
                  borderRadius: '1rem',
                  backgroundColor: 'white',
                  border: '0.8rem solid #2F3252',
                  transform: 'rotate(-25deg)',
                  top: '3rem', left: '1rem',
                }}
              />
              {/* Left Card 2 */}
              <div
                className="absolute"
                style={{
                  width: '3.5rem', height: '5rem',
                  borderRadius: '1rem',
                  backgroundColor: 'white',
                  border: '0.8rem solid #2F3252',
                  transform: 'rotate(-25deg)',
                  top: '0rem', left: '2.5rem',
                }}
              />
              {/* Title */}
              <div
                className="relative z-10"
                style={{
                  fontSize: '9rem',
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
                  width: '3.5rem', height: '5rem',
                  borderRadius: '1rem',
                  backgroundColor: 'white',
                  border: '0.8rem solid #2F3252',
                  transform: 'rotate(25deg)',
                  top: '3rem', right: '1rem',
                }}
              />
              {/* Right Card 2 */}
              <div
                className="absolute"
                style={{
                  width: '3.5rem', height: '5rem',
                  borderRadius: '1rem',
                  backgroundColor: 'white',
                  border: '0.8rem solid #2F3252',
                  transform: 'rotate(25deg)',
                  top: '0rem', right: '2.5rem',
                }}
              />
              {/* Subtitle */}
              <div
                className="relative z-10"
                style={{
                  fontSize: '1.8rem',
                  fontWeight: 900,
                  color: 'white',
                  WebkitTextStroke: '0.5rem #4B4665',
                  paintOrder: 'stroke fill',
                  letterSpacing: '0.02em',
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
              width: '30rem',
              height: '5rem',
              borderRadius: '1.2rem',
              backgroundColor: '#623F5D',
              padding: '0.3rem'
            }}
          >
            <div
              className="flex items-center w-full h-full overflow-hidden"
              style={{
                borderRadius: '1rem',
                backgroundColor: '#D4C7D2',
                border: '0.35rem solid #FFFFFF',
                boxSizing: 'border-box',
                padding: '0.3rem',
              }}
            >
              <input
                className="flex-1 bg-transparent outline-none border-none font-black text-[#4B4665] placeholder-[#FFFFFF]/60"
                style={{
                  fontSize: '2.2rem',
                  marginLeft: '1.2rem',
                  minWidth: 0
                }}
                placeholder="enter nickname"
                value={name}
                onChange={(e) => { setName(e.target.value); setNameSet(false); }}
                onKeyDown={(e) => { if (e.key === 'Enter' && name) setNameSet(true); }}
              />
              <button
                onClick={() => setNameSet(true)}
                disabled={!name}
                className="flex items-center justify-center flex-shrink-0 transition-transform hover:scale-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  width: '3.5rem',
                  height: '3.5rem',
                  backgroundColor: '#F5ED96',
                  borderRadius: '0.5rem',
                  border: '0.2rem solid #4A4511',
                }}
              >
                <svg width="2.3rem" height="2.3rem" viewBox="0 0 70 87" fill="none">
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
        </div>

        {/* Create Room/Join Room */}
        <div className="relative w-[100vw] min-h-screen flex flex-col items-center select-none">

          {/* Back button */}
          <button
            onClick={goBack}
            className="absolute top-2 left-3 z-20 flex items-center gap-2 bg-transparent border-none transition-transform hover:scale-105 active:scale-95"
          >
            {/* Arrow triangle */}
            <svg width="1.5rem" height="1.5rem" viewBox="0 0 80 87" fill="none" style={{ transform: 'scaleX(-1)' }}>
              <path d="M68.1328 34.4821C74.7401 38.3423 74.7401 47.8914 68.1328 51.7516L20.0449 79.8453C13.3784 83.7401 5 78.9314 5 71.2106V15.0231C5 7.30222 13.3784 2.49355 20.0449 6.38831L68.1328 34.4821Z"
               stroke="#DD6969" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" fill='white'/>
            </svg>
            
            <span
              style={{
                fontSize: '1.9rem',
                fontWeight: 900,
                color: 'white',
                WebkitTextStroke: '0.25em #DD6969',
                paintOrder: 'stroke fill',
                letterSpacing: '0.05em',
              }}
            >
              BACK
            </span>
          </button>

          {/* Settings gear */}
          <button className="absolute top-2 right-3 z-20 bg-transparent border-none transition-transform hover:scale-110 hover:rotate-45 active:scale-95" style={{ transition: 'transform 0.3s ease' }}>
          <svg width="2.5rem" height="2.5rem" viewBox="0 0 24 24" fill="none">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
              fill="white"
              stroke="#FF9F9F"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          </button>

          {/* Compact title format */}
          <div className="flex flex-col items-center pt-8 pb-2">
            <div
              style={{
                fontSize: '3.5rem',
                fontWeight: 900,
                color: 'white',
                WebkitTextStroke: '0.22em #2F3252',
                paintOrder: 'stroke fill',
                letterSpacing: '0.05em',
                lineHeight: 1,
              }}
            >
              {/* Mini card decorations flanking the title */}
              <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                <span style={{
                  display: 'inline-block',
                  width: '1.2rem', height: '1.8rem',
                  borderRadius: '0.25rem',
                  backgroundColor: 'white',
                  border: '0.3rem solid #2F3252',
                  transform: 'rotate(-25deg)',
                  verticalAlign: 'middle',
                  marginBottom: '0.1em',
                  position: 'relative',
                  top: '-0.6rem', 
                  left: '2.7rem',
                  zIndex: -10,
                }} />
                <span style={{
                  display: 'inline-block',
                  width: '1.2rem', height: '1.8rem',
                  borderRadius: '0.25rem',
                  backgroundColor: 'white',
                  border: '0.3rem solid #2F3252',
                  transform: 'rotate(-25deg)',
                  verticalAlign: 'middle',
                  marginBottom: '0.1em',
                  position: 'relative',
                  top: '0.6rem', 
                  left: '0.4rem',
                  zIndex: -15,
                }} />
                CABO
                <span style={{
                  display: 'inline-block',
                  width: '1.2rem', height: '1.8rem',
                  borderRadius: '0.25rem',
                  backgroundColor: 'white',
                  border: '0.3rem solid #2F3252',
                  transform: 'rotate(25deg)',
                  verticalAlign: 'middle',
                  marginBottom: '0.1em',
                  position: 'relative',
                  top: '-0.6rem', 
                  right: '1.0rem',
                  zIndex: -10,
                }} />
                <span style={{
                  display: 'inline-block',
                  width: '1.2rem', height: '1.8rem',
                  borderRadius: '0.25rem',
                  backgroundColor: 'white',
                  border: '0.3rem solid #2F3252',
                  transform: 'rotate(25deg)',
                  verticalAlign: 'middle',
                  marginBottom: '0.1em',
                  position: 'relative',
                  top: '0.6rem', 
                  right: '2.3rem',
                  zIndex: -15,
                }} />
              </span>
            </div>
            <div
              style={{
                fontSize: '0.85rem',
                fontWeight: 900,
                color: 'white',
                WebkitTextStroke: '0.22rem #4B4665',
                paintOrder: 'stroke fill',
                letterSpacing: '0.01em',
              }}
            >
              The memory-based strategy card game
            </div>
          </div>

          {/* ── Room controls ── */}
          <div className="relative flex flex-col items-center gap-[1.5vh]" style={{ marginTop: '1.5rem' }}>
            {/* ENTER ROOM input */}
            <div
              className="flex items-center justify-center"
              style={{
                width: '26.13rem',
                height: '5.26rem',
                borderRadius: '1.41rem',
                backgroundColor: '#CDD8FF',
                padding: '0.25rem',
                marginTop: '9vh',
              }}
            >
              <div
                className="flex items-center justify-center w-full h-full"
                style={{
                  borderRadius: '1.21rem',
                  backgroundColor: '#D1D5E5',
                  border: '0.28rem solid #4F5055',
                  boxSizing: 'border-box',
                }}
              >
                <input
                  className="w-full bg-transparent outline-none border-none font-black text-center tracking-widest placeholder-[#B4B6BC]/60"
                  style={{ fontSize: '2.47rem', color: '#ADB0B3', letterSpacing: '0.04em' }}
                  placeholder="ENTER ROOM #"
                  value={room}
                  onChange={(e) => setRoom(e.target.value.toUpperCase())}
                  onKeyDown={(e) => { if (e.key === 'Enter' && room) joinRoom(); }}
                />
              </div>
            </div>

            {/* JOIN ROOM button */}
            <button
              onClick={joinRoom}
              disabled={!room}
              className="flex items-center justify-center border-none transition-transform hover:scale-[1.03] active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                width: '14.28rem',
                height: '3.78rem',
                borderRadius: '0.8rem',
                backgroundColor: '#284D2F',
                padding: '0.2rem',
                marginTop: '1rem',
              }}
            >
              <div
                className="flex items-center justify-center w-full h-full"
                style={{
                  borderRadius: '0.6rem',
                  background: 'linear-gradient(90deg, #95C060 0%, #4A9743 100%)',
                  border: '0.25rem solid white',
                  boxSizing: 'border-box',
                }}
              >
                <span
                  style={{
                    fontSize: '1.88rem',
                    fontWeight: 900,
                    color: 'white',
                    WebkitTextStroke: '0.45rem #4D7729',
                    paintOrder: 'stroke fill',
                    letterSpacing: '0.04em',
                  }}
                >
                  JOIN ROOM
                </span>
              </div>
            </button>

            {/* CREATE ROOM button */}
            <button
              onClick={createRoom}
              className="flex items-center justify-center border-none transition-transform hover:scale-[1.03] active:scale-[0.97]"
              style={{
                width: '16.5rem',
                height: '3.94rem',
                borderRadius: '0.8rem',
                backgroundColor: '#2C3E60',
                padding: '0.2rem',
                marginTop: '6vh',
              }}
            >
              <div
                className="flex items-center justify-center w-full h-full"
                style={{
                  borderRadius: '0.60rem',
                  background: 'linear-gradient(90deg, #FFF93F 0%, #DFC149 100%)',
                  border: '0.31rem solid white',
                  boxSizing: 'border-box',
                }}
              >
                <span
                  style={{
                    fontSize: '1.75rem',
                    fontWeight: 900,
                    color: 'white',
                    WebkitTextStroke: '0.40rem #9C8A25',
                    paintOrder: 'stroke fill',
                    letterSpacing: '0.04em',
                  }}
                >
                  CREATE ROOM
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
