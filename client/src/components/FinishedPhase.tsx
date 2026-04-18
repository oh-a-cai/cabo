import { socket } from "../clientSocket/socket";
import type { GameState } from "../../../shared/types";
import PlayerHand from "./PlayerHand";

interface FinishedPhaseProps {
  gameState: GameState;
  onBackToLobby: () => void;
}

export default function FinishedPhase({ gameState, onBackToLobby }: FinishedPhaseProps) {
  const isLocalWinner = gameState.winner === socket.id;
  const winnerName = gameState.players.find(p => p.id === gameState.winner)?.name;

  return (
    <div>
      <h1>{isLocalWinner ? "You won!" : `${winnerName} won!`}</h1>
      <h2>Results</h2>

      {gameState.results.map((result, index) => (
        <div key={result.player.id}>
          <p>
            #{index + 1} — {result.player.name}
            {result.player.id === socket.id ? " (You)" : ""}
          </p>
          <p>Score: {result.score}</p>
          <PlayerHand player={result.player} />
          {result.caboPenalty && <p>Cabo penalty applied (+10)</p>}
        </div>
      ))}

      <button onClick={onBackToLobby}>Back to Lobby</button>
    </div>
  );
}
