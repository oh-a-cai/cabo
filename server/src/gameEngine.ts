import type { GameState, Player, Card, Suit, Rank, SocketResponse } from "./../../shared/types";

const SUITS: Suit[] = ["Hearts", "Diamonds", "Clubs", "Spades"];
const RANKS: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"];
const RANK_VALUES: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

export function createDeck(): Card[] {
  const deck: Card[] = []

  for (const suit of SUITS) {
    let i = 1;
    for (const rank of RANKS) {
      deck.push({
        id: `${rank}${suit[0]}`,
        suit,
        rank,
        value: RANK_VALUES[i],
        visibility: "hidden"
      });
      i++;
    }
  }

  // jokers
  deck.push({
    id: 'ZH',
    suit: 'Hearts',
    rank: 'Z',
    value: 0,
    visibility: "hidden"
  });
  deck.push({
    id: 'ZS',
    suit: 'Spades',
    rank: 'Z',
    value: 0,
    visibility: "hidden"
  });

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
  game.discardPile = [];
  game.turnId = 0;
  game.gamePhase = "setup";
  game.turnPhase = "drawing";
  game.isCardMatched = false;
  game.isCaboCalled = false;
  game.caboCaller = undefined;
  game.remainingTurns = undefined;
  game.results = [];
  game.winner = "";

  for (const player of game.players) { // deal cards
    player.hand = game.deck.splice(0, 4);
    player.hand.map(card => card.visibility = "hidden");
    player.drawnCard = undefined;
    player.hasBurned = false;
    player.ready = false;

    player.hand.slice(-2).forEach(card => card.visibility = "owner");
  }
}

export function playerReady(game: GameState, playerId: string): SocketResponse {
  const player = game.players.find(p => p.id === playerId);
  if (!player) {
    return { error: "Player not found" };
  }

  player.ready = true;

  if (game.players.every(p => p.ready)) {
    game.players.forEach(p => p.hand.forEach(card => card.visibility = "hidden"));
    game.gamePhase = "playing";
  }

  return { success: true };
}

export function drawCard(game: GameState, playerId: string, source: string): SocketResponse {
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
  
  
  if (source == "deck") {
    if (game.deck.length === 0) {
      return { error: "Deck is empty" };
    }
    player.drawnCard = game.deck.pop()!;
    player.drawnCard.visibility = "owner";
  }
  else {
    if (game.discardPile.length === 0) {
      return { error: "Discard pile is empty" };
    }
    player.drawnCard = game.discardPile.pop()!;
    player.drawnCard.visibility = "all";
  }
  
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
  
  player.drawnCard.visibility = "all";
  game.discardPile.push(player.drawnCard);
  player.drawnCard = undefined;
  nextTurn(game);
  game.turnPhase = "drawing";

  if (game.deck.length === 0) {
    endGame(game);
    return { success: true };
  }
    
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
  cardCopy.visibility = "all";
      
  if (player.drawnCard.visibility === "owner") {
    player.drawnCard.visibility = "hidden";
  }
  player.hand[index] = player.drawnCard;
  
  game.discardPile.push(cardCopy);
  player.drawnCard = undefined
  nextTurn(game);
  game.turnPhase = "drawing";

  if (player.hand.length === 0) {
    endGame(game);
  }
        
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
    discardedCard.visibility = "all";
    game.discardPile.push(discardedCard);
  }
  else {
    if (game.deck.length > 0 && !player.hasBurned) {
      const drawnCard = game.deck.pop()!;
      drawnCard.visibility = "hidden";
      player.hand.push(drawnCard);
      player.hasBurned = true;
    }
  }

  if (player.hand.length === 0) {
    endGame(game);
  }
        
  return { success: true };
}

export function nextTurn(game: GameState) {
  game.turnId = (game.turnId + 1) % game.players.length;
  game.isCardMatched = false;
  game.players.forEach(player => player.hasBurned = false);

  if (game.isCaboCalled && game.remainingTurns !== undefined) {
    if (game.remainingTurns > 0) {
      game.remainingTurns--;
    }
    else {
      endGame(game);
    }
  }
}

export function callCabo(game: GameState, playerId: string): SocketResponse {
  if (game.gamePhase !== "playing") {
    return { error: "Game not in progress" };
  }
  if (game.turnPhase !== "drawing") {
    return { error: "Must be in drawing phase" };
  }
  if (game.isCaboCalled) {
    return { error: "Cabo already called" };
  }

  const player = game.players.find(p => p.id === playerId);
  if (!player) {
    return { error: "Player not found" };
  }

  game.isCaboCalled = true;
  game.caboCaller = player;
  game.remainingTurns = game.players.length - 1;
  nextTurn(game);

  return { success: true };
}

export function endGame(game: GameState) {
  game.gamePhase = "finished";
  
  game.players.forEach(player => {
    player.hand.forEach(card => {
      card.visibility = "all";
    });
  });

  const scores = game.players.map(player => ({
    playerId: player.id,
    score: player.hand.reduce((sum, card) => sum + card.value, 0),
    playerHand: player.hand,
    caboPenalty: false
  }));

  if (game.caboCaller) {
    const caller = scores.find(p => p.playerId === game.caboCaller!.id);
    const minScore = Math.min(...scores.map(p => p.score));

    if (caller!.score !== minScore) {
      caller!.score += 10;
      caller!.caboPenalty = true
    }
  }

  scores.sort((a, b) => a.score - b.score);
  game.winner = scores[0].playerId;
  game.results = scores;
}