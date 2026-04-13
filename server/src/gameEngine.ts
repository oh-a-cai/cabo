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
        visibility: "hidden",
        source: "deck"
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
    visibility: "hidden",
    source: "deck"
  });
  deck.push({
    id: 'ZS',
    suit: 'Spades',
    rank: 'Z',
    value: 0,
    visibility: "hidden",
    source: "deck"
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
  game.countdownStartedAt = undefined;
  game.pendingCardPower = undefined;
  game.matchReceiverId = undefined;
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
    game.countdownStartedAt = Date.now();
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
  
  game.isCardMatched = false;

  if (source === "deck") {
    if (game.deck.length === 0) {
      return { error: "Deck is empty" };
    }
    player.drawnCard = game.deck.pop()!;
    player.drawnCard.visibility = "owner";
    player.drawnCard.source = source;
  }
  else if (source === "discard") {
    if (game.discardPile.length === 0) {
      return { error: "Discard pile is empty" };
    }
    player.drawnCard = game.discardPile.pop()!;
    player.drawnCard.visibility = "all";
    player.drawnCard.source = source;
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
  
  const discardedCard = player.drawnCard;
  discardedCard.visibility = "all";
  game.discardPile.push(discardedCard);
  player.drawnCard = undefined;

  if (discardedCard.source === "deck") {
    if (discardedCard.value === 7 || discardedCard.value === 8) {
      // player chooses one card in their hand and reveals it to themselves, then once finished peeking the card becomes hidden again
      game.pendingCardPower = {
        type: "peekSelf",
        playerId: playerId,
        myCardId: undefined,
      };

      game.turnPhase = "power";
      return { success: true };
    }
    else if (discardedCard.value === 9 || discardedCard.value === 10) {
      // player first chooses a different player, then chooses one card in their hand and reveals it to themselves, then once finished peeking the card becomes hidden again
      game.pendingCardPower = {
        type: "peekOther",
        playerId: playerId,
        targetCardId: undefined,
      };

      game.turnPhase = "power";
      return { success: true };
    }
    else if (discardedCard.value === 11 || discardedCard.value === 12) {
      // player first chooses a different player, then chooses one card in their hand, and one card in the other player's hand, then swaps the positions of those two cards without revealing the cards
      game.pendingCardPower = {
        type: "swap",
        playerId: playerId,
        myCardId: undefined,
        targetCardId: undefined,
      };

      game.turnPhase = "power";
      return { success: true };
    }
  }
  
  nextTurn(game);
  game.turnPhase = "drawing";

  if (game.deck.length === 0) {
    endGame(game);
    return { success: true };
  }
    
  return { success: true };
}

export function confirmPowerSelection(game: GameState, playerId: string, parameters: { myCardId?: string; targetCardId?: string }): SocketResponse {
  if (game.gamePhase !== "playing") {
    return { error: "Game not in progress" };
  }
  if (game.turnPhase !== "power") {
    return { error: "Must be in power phase" };
  }
  if (!game.pendingCardPower || game.pendingCardPower.playerId !== playerId) {
    return { error: "No pending effect for this player" };
  }

  const power = game.pendingCardPower;

  if (power.type === "peekSelf") {
    const player = game.players.find(p => p.id === playerId);
    if (!player) {
      return { error: "Player not found" };
    }
    const myCard = player.hand.find(c => c.id === parameters.myCardId);
    if (!myCard) {
      return { error: "Card not found" }
    }

    power.myCardId = myCard.id;
    myCard.peekerId = playerId;
  }
  else if (power.type === "peekOther") {
    const targetCard = game.players.flatMap(p => p.hand).find(c => c.id === parameters.targetCardId);
    if (!targetCard) {
      return { error: "Target card not found" };
    }
    
    power.targetCardId = targetCard.id;
    targetCard.peekerId = playerId;
  }
  else {
    const player = game.players.find(p => p.id === playerId);
    if (!player ) {
      return { error: "Player not found" };
    }
    const myCard = player.hand.find(c => c.id === parameters.myCardId);
    const targetCard = game.players.flatMap(p => p.hand).find(c => c.id === parameters.targetCardId);
    if (!myCard || !targetCard) {
      return { error: "Cards not found" };
    }

    power.myCardId = myCard.id;
    power.targetCardId = targetCard.id
  }
    
  return { success: true };
}

export function finishPower(game: GameState, playerId: string): SocketResponse {
  if (game.gamePhase !== "playing") {
    return { error: "Game not in progress" };
  }
  if (game.turnPhase !== "power") {
    return { error: "Must be in power phase" };
  }
  if (!game.pendingCardPower || game.pendingCardPower.playerId !== playerId) {
    return { error: "No pending effect for this player" };
  }

  const power = game.pendingCardPower;

  if (power.type === "peekSelf") {
    game.players.flatMap(p => p.hand).find(c => c.id === power.myCardId)!.peekerId = undefined;
  }
  else if (power.type === "peekOther") {
    game.players.flatMap(p => p.hand).find(c => c.id === power.targetCardId)!.peekerId = undefined;
  }
  else {
    const player = game.players.find(p => p.hand.some(c => c.id === power.myCardId));
    const targetPlayer = game.players.find(p => p.hand.some(c => c.id === power.targetCardId));
    if (!player || !targetPlayer) {
      return { error: "Players not found" };
    }
    const myCardIndex = player.hand.findIndex(c => c.id === power.myCardId);
    const targetCardIndex = targetPlayer.hand.findIndex(c => c.id === power.targetCardId);
    if (myCardIndex === -1 || targetCardIndex === -1) {
      return { error: "Cards not found" };
    }

    [player.hand[myCardIndex], targetPlayer.hand[targetCardIndex]] = [targetPlayer.hand[targetCardIndex], player.hand[myCardIndex]];
  }
    
  game.pendingCardPower = undefined;
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
  if (game.turnPhase !== "drawing" && game.turnPhase !== "power") {
    return { error: "Must be in drawing or power phase" };
  }
  if (game.matchReceiverId) {
    return { error: "Finish giving card first" };
  }
  if (game.isCardMatched) {
    return { error: "Card already matched by another player" };
  }

  const player = game.players.find(p => p.id === playerId);
  if (!player) {
    return { error: "Player not found" };
  }

  const targetPlayer = game.players.find(p => p.hand.some(c => c.id === cardId));
  if (!targetPlayer) {
    return { error: "Target player not found" };
  }

  const index = targetPlayer.hand.findIndex(c => c.id === cardId);
  const cardToMatch = targetPlayer.hand[index];

  const topDiscardCard = game.discardPile[game.discardPile.length - 1];
  if (!topDiscardCard) {
    return { error: "Discard pile is empty" };
  }

  const isMatch = cardToMatch.rank === topDiscardCard.rank;
  const isSelfMatch = targetPlayer.id === playerId;

  if (!isMatch) {
    if (game.deck.length > 0 && !player.hasBurned) {
      const drawnCard = game.deck.pop()!;
      drawnCard.visibility = "hidden";
      player.hand.push(drawnCard);
      player.hasBurned = true;
    }
    return { success: true };
  }

  game.isCardMatched = true;

  const [discardedCard] = targetPlayer.hand.splice(index, 1);
  discardedCard.visibility = "all";
  game.discardPile.push(discardedCard);

  if (isSelfMatch) {
    if (player.hand.length === 0) {
      endGame(game);
    }
  }
  else {
    game.matchReceiverId = targetPlayer.id;
  }

  return { success: true };
}

export function giveCardToPlayer(game: GameState, playerId: string, myCardId: string): SocketResponse {
  if (!game.matchReceiverId) {
    return { error: "No active match to give a card" };
  }

  const player = game.players.find(p => p.id === playerId);
  const targetPlayer = game.players.find(p => p.id === game.matchReceiverId);
  if (!player || !targetPlayer) {
    return { error: "Players not found" };
  }

  const cardIndex = player.hand.findIndex(c => c.id === myCardId);
  if (cardIndex === -1) {
    return { error: "Card not found in your hand" };
  }

  const [givenCard] = player.hand.splice(cardIndex, 1);
  targetPlayer.hand.push(givenCard);
  game.matchReceiverId = undefined;

  if (player.hand.length === 0 || targetPlayer.hand.length === 0) {
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