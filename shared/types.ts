export type Suit = "Hearts" | "Diamonds" | "Clubs" | "Spades";
export type Rank = "Z" | "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "T" | "J" | "Q" | "K";
export type GamePhase = "waiting" | "setup" | "playing" | "finished";
export type TurnPhase = "drawing" | "action" | "power";
export type SocketResponse = { success: true } | { error: string };
export type PlayerResult = {
    player: Player
    score: number;
    caboPenalty: boolean;
};
export type Visibility = "hidden" | "owner" | "all";

export interface PendingCardPower {
    playerId: string;
    type: "peekSelf" | "peekOther" | "swap";
    myCardId?: string;
    targetCardId?: string;
}

export interface Card{
    id: string;
    suit: Suit;
    rank: Rank;
    value: number;
    visibility: Visibility;
    peekerId?: string
    source: "deck" | "discard";
};

export interface Player{
    id: string;
    name: string;
    hand: (Card | null)[];
    drawnCard?: Card;
    isHost: boolean;
    hasBurned: boolean;
    ready: boolean;
};

export interface GameState{
    id: string;
    players: Player[];
    deck: Card[];
    discardPile: Card[];
    turnId: number;
    gamePhase: GamePhase;
    turnPhase: TurnPhase;
    countdownStartedAt?: number;
    pendingCardPower?: PendingCardPower;
    matchReceiverId?: string;
    matchReceiverIndex?: number;
    isCardMatched: boolean;
    isCaboCalled: boolean;
    caboCaller?: Player;
    remainingTurns?: number;
    results: PlayerResult[];
    winner: string;
};