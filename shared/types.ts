export type Suit = "Hearts" | "Diamonds" | "Clubs" | "Spades";
export type Rank = "Z" | "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
export type GamePhase = "waiting" | "playing" | "finished";
export type TurnPhase = "drawing" | "action";
export type SocketResponse = { success: true } | { error: string };
export type PlayerResult = {
    playerId: string; 
    score: number;
    playerHand: Card[];
    caboPenalty: boolean;
};

export interface Card{
    id: string;
    suit: Suit;
    rank: Rank;
    value: number;
};

export interface Player{
    id: string;
    name: string;
    hand: Card[];
    drawnCard?: Card;
    isHost: boolean;
    hasBurned: boolean;
};

export interface GameState{
    id: string;
    players: Player[];
    deck: Card[];
    discardPile: Card[];
    turnId: number;
    gamePhase: GamePhase;
    turnPhase: TurnPhase;
    isCardMatched: boolean;
    isCaboCalled: boolean;
    caboCaller?: Player;
    remainingTurns?: number;
    results: PlayerResult[];
    winner: string;
};