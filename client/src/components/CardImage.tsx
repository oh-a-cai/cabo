import { socket } from "../clientSocket/socket";
import type { Card } from "../../../shared/types";

interface CardImageProps {
  card: Card;
  ownerId: string;
  onClick?: () => void;
  className?: string;
}

export default function CardImage({ card, ownerId, onClick, className = "" }: CardImageProps) {
  const isMe = ownerId === socket.id;
  const isVisible =
    card.visibility === "all" ||
    (card.visibility === "owner" && isMe) ||
    card.peekerId === socket.id;

  const src = isVisible ? `/assets/Deck_of_cards/${card.id}.png` : "/assets/Deck_of_cards/back.png";
  const alt = isVisible ? card.id : "back of card";

  return <img src={src} alt={alt} onClick={onClick} className={className} />;
}
