import { socket } from "../clientSocket/socket";
import type { Player } from "../../../shared/types";

interface PlayerListProps {
  players: Player[];
}

export default function PlayerList({ players }: PlayerListProps) {
  return (
    <ul>
      {players.map(player => (
        <li key={player.id}>
          {player.name}
          {player.isHost ? " [Host]" : ""}
          {player.id === socket.id ? " (You)" : ""}
        </li>
      ))}
    </ul>
  );
}
