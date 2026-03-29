import type { GameState, Player, Card, Suit, Rank, SocketResponse } from "./../../shared/types";

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
  game.gamePhase = "playing";
  game.turnId = 0;

  for (const player of game.players) { // deal cards
    player.hand = game.deck.splice(0, 4);
  }
}

export function drawCard(game: GameState, playerId: string): SocketResponse {
  if (game.gamePhase !== "playing") {
    return { error: "Game not in progress" };
  }
  if (game.turnPhase !== "drawing") {
    return { error: "Must be in drawing phase" };
  }

  const player = game.players.find(p => p.id === playerId);
  const currentPlayer = game.players[game.turnId];

  if (!player) {
    return { error: "Player not found" };
  }
  if (currentPlayer.id !== playerId) {
    return { error: "Not your turn" };
  }
  if (game.deck.length === 0) {
    return { error: "Deck is empty" };
  }
  
  player.drawnCard = game.deck.pop()!;
  game.turnPhase = "action";
    
  return { success: true };
}

export function discardCard(game: GameState, playerId: string): SocketResponse {
  if (game.gamePhase !== "playing") {
    return { error: "Game not in progress" };
  }
  if (game.turnPhase !== "action") {
    return { error: "Must be in action phase" };
  }

  const player = game.players.find(p => p.id === playerId);
  const currentPlayer = game.players[game.turnId];
  
  if (!player) {
    return { error: "Player not found" };
  }
  if (currentPlayer.id !== playerId) {
    return { error: "Not your turn" };
  }
  if (!player.drawnCard) {
    return { error: "No card to discard" };
  }
  
  game.discardPile.push(player.drawnCard);
  player.drawnCard = undefined;
  nextTurn(game);
  game.turnPhase = "drawing";
    
  return { success: true };
}

export function swapCard(game: GameState, playerId: string, cardId: string): SocketResponse {
  if (game.gamePhase !== "playing") {
    return { error: "Game not in progress" };
  }
  if (game.turnPhase !== "action") {
    return { error: "Must be in action phase" };
  }
    
  const player = game.players.find(p => p.id === playerId);
  const currentPlayer = game.players[game.turnId];
      
  if (!player) {
    return { error: "Player not found" };
  }
  if (currentPlayer.id !== playerId) {
    return { error: "Not your turn" };
  }
  if (!player.drawnCard) {
    return { error: "No card to swap" };
  }

  const index = player.hand.findIndex(c => c.id === cardId);
  if (index === -1) {
    return { error: "Card not in hand" };
  }
  const cardCopy = player.hand[index];
      
  player.hand[index] = player.drawnCard;
  game.discardPile.push(cardCopy);
  player.drawnCard = undefined
  nextTurn(game);
  game.turnPhase = "drawing";
        
  return { success: true };
}

export function matchCard(game: GameState, playerId: string, cardId: string): SocketResponse {
  if (game.gamePhase !== "playing") {
    return { error: "Game not in progress" };
  }
  if (game.turnPhase !== "drawing") {
    return { error: "Must be in drawing phase" };
  }
    
  const player = game.players.find(p => p.id === playerId);
  if (!player) {
    return { error: "Player not found" };
  }
  if (game.isCardMatched) {
    return { error: "Card already matched by another player" };
  }

  const index = player.hand.findIndex(c => c.id === cardId);
  if (index === -1) {
    return { error: "Card not in hand" };
  }
  const cardToMatch = player.hand[index];
  const topDiscardCard = game.discardPile[game.discardPile.length - 1];
  if (!topDiscardCard) {
    return { error: "Discard pile is empty" }
  }

  if (cardToMatch.rank === topDiscardCard.rank) {
    game.isCardMatched = true;
    const [discardedCard] = player.hand.splice(index, 1);
    game.discardPile.push(discardedCard);
  }
  else {
    if (game.deck.length > 0 && !player.hasBurned) {
      player.hand.push(game.deck.pop()!)
      player.hasBurned = true;
    }
  }
        
  return { success: true };
}

export function nextTurn(game: GameState) {
  game.turnId = (game.turnId + 1) % game.players.length;
  game.isCardMatched = false;
  game.players.forEach(player => player.hasBurned = false);
}