export type Suit = "hearts" | "diamonds" | "clubs" | "spades";
export type Rank = "Jo" | "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";
export type Action = "discard" | "switch";
export type SocketResponse = { success: true } | { error: string };

export interface Card{
    id: string;
    suit: Suit;
    rank: Rank;
}

export interface Player{
    id: string;
    name: string;
    hand: Card[];
    isHost: boolean;
    ready?: boolean;
}

export interface GameState{
    id: string;
    players: Player[];
    deck: Card[];
    discardPile: Card[];
    turnId: number;
    phase: "waiting" | "started"| "drawing" | Action;
}
