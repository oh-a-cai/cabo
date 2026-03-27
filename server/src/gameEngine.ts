import type { GameState, Player, Card, Suit, Rank } from "./../../shared/types";

const SUITS: Suit[] = ["Hearts", "Diamonds", "Clubs", "Spades"];
const RANKS: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"];
const RANK_VALUES: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

export function createDeck(): Card[] {
  const deck: Card[] = []

  for (const suit of SUITS) {
    if (suit === "Hearts" || suit === "Spades") {
      deck.push({
        id: `Z${suit[0]}`,
        suit,
        rank: 'Z',
        value: 0
      });
    }

    let i = 1;
    for (const rank of RANKS) {
      deck.push({
        id: `${rank}${suit[0]}`,
        suit,
        rank,
        value: RANK_VALUES[i]
      });
      i++;
    }
  }

  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  for (let i = deck.length - 1; i > 0; i--) { // fisher yates shuffle algorithm
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}
  
export function startGame(game: GameState) {
  game.deck = shuffleDeck(createDeck());
  game.phase = 'starting';
  game.turnId = 0;

  for (const player of game.players) { // deal cards
    player.hand = game.deck.splice(0, 4);
  }
  
  return game;
}