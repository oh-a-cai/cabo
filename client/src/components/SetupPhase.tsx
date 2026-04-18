import { socket } from "../clientSocket/socket";
import type { Player } from "../../../shared/types";
import PlayerHand from "./PlayerHand";

interface SetupPhaseProps {
  me: Player;
  players: Player[];
  countdown: number | null;
  readyCount: number;
  totalPlayers: number;
  isReady: boolean;
  onReady: () => void;
}

export default function SetupPhase({
  me,
  players,
  countdown,
  readyCount,
  totalPlayers,
  isReady,
  onReady,
}: SetupPhaseProps) {
  const waitingOn = players.filter(p => !p.ready);

  return (
    <div>
      <h1>Pregame Phase</h1>
      <p>You can see your bottom 2 cards. Memorize them!</p>
      <p>Players Ready: {readyCount} / {totalPlayers}</p>

      {waitingOn.length > 0 && (
        <div>
          <p>Waiting for:</p>
          <ul>
            {waitingOn.map(p => (
              <li key={p.id}>
                {p.name}{p.id === socket.id ? " (You)" : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      <PlayerHand player={me} />

      {countdown !== null ? (
        <div>
          <h2>All players Ready!</h2>
          <h3>Game starting in {countdown}...</h3>
        </div>
      ) : (
        <div>
          <p />
          <button onClick={onReady} disabled={isReady}>
            {isReady ? "Ready" : "Ready up"}
          </button>
        </div>
      )}
    </div>
  );
}
