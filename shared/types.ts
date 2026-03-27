export type Suit = "Hearts" | "Diamonds" | "Clubs" | "Spades";
export type Rank = "Z" | "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
export type Phase = "waiting" | "starting" | "drawing" | "discarding" | "swapping" | "finished";
export type SocketResponse = { success: true } | { error: string };

export interface Card{
    id: string;
    suit: Suit;
    rank: Rank;
    value: number;
}

export interface Player{
    id: string;
    name: string;
    hand: Card[];
    isHost: boolean;
}

export interface GameState{
    id: string;
    players: Player[];
    deck: Card[];
    discardPile: Card[];
    turnId: number;
    phase: Phase;
}
