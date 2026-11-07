// Regression checks for room limits, mid-game disconnects and hidden-card leaks.
// Runs a real Socket.IO server in-process: npm run test:sockets [scenario]
import assert from 'node:assert/strict';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { Server } from 'socket.io';
import { io as connect, Socket } from 'socket.io-client';
import { initializeSockets } from '../src/sockets';
import type { GameState, SocketResponse } from '../../shared/types';

const games = new Map<string, GameState>();
const httpServer = http.createServer();
const io = new Server(httpServer);
initializeSockets(io, games);

let clients: Socket[] = [];

function wait<T>(socket: Socket, event: string, match: (value: T) => boolean = () => true) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out waiting for ${event}`)), 5000);
    const handler = (value: T) => {
      if (match(value)) {
        clearTimeout(timer);
        socket.off(event, handler);
        resolve(value);
      }
    };
    socket.on(event, handler);
  });
}

function call(socket: Socket, event: string, ...args: unknown[]) {
  return socket.timeout(5000).emitWithAck(event, ...args) as Promise<SocketResponse>;
}

// Starts a real game with `count` players, then skips the 3 second countdown.
async function startPlaying(count: number) {
  const port = (httpServer.address() as AddressInfo).port;
  const sockets = await Promise.all(Array.from({ length: count }, async () => {
    const socket = connect(`http://localhost:${port}`, { transports: ['websocket'] });
    clients.push(socket);
    await wait(socket, 'connect');
    return socket;
  }));

  const created = wait<GameState>(sockets[0], 'roomUpdate');
  sockets[0].emit('createRoom', 'p0');
  const { id: roomId } = await created;
  for (let i = 1; i < count; i++) {
    await call(sockets[i], 'joinRoom', roomId, `p${i}`);
  }

  const dealt = wait<GameState>(sockets[0], 'gameState', s => s.gamePhase === 'setup');
  sockets[0].emit('startGame', roomId);
  await dealt;

  const game = games.get(roomId)!;
  game.players.forEach(p => p.hand.forEach(card => card!.visibility = 'hidden'));
  game.gamePhase = 'playing';
  return { roomId, game, sockets };
}

function assertNoHiddenCardsLeak(state: GameState, viewerId: string) {
  assert.deepEqual(state.deck, []);
  assert.ok(state.deckCount! > 0);
  const hidden = [...state.deck, ...state.players.flatMap(p => p.hand)].filter(c => c && c.visibility === 'hidden');
  assert.ok(hidden.length > 0);
  for (const card of hidden) {
    assert.equal(card!.rank, 'hidden', `rank of ${card!.id} sent to ${viewerId}`);
    assert.match(card!.id, /^c\d+$/, 'card id must not encode rank or suit');
  }
}

const scenarios: Record<string, () => Promise<void>> = {
  async roomsFullReturnsAnError() {
    const port = (httpServer.address() as AddressInfo).port;
    const socket = connect(`http://localhost:${port}`, { transports: ['websocket'] });
    clients.push(socket);
    const taken = { players: [] } as unknown as GameState;
    for (let id = 1000; id < 10000; id++) games.set(String(id), taken);
    try {
      const res = await call(socket, 'createRoom', 'p0');
      assert.ok('error' in res);
    }
    finally {
      games.clear();
    }
  },

  async lastSeatDisconnectsOnTheirTurn() {
    const { roomId, game, sockets } = await startPlaying(3);
    game.turnId = 2;
    const update = wait<GameState>(sockets[0], 'gameState', s => s.players.length === 2);
    sockets[2].disconnect();
    assert.equal((await update).turnId, 0);
    assert.deepEqual(await call(sockets[0], 'drawCard', roomId, 'deck'), { success: true });
    assert.deepEqual(await call(sockets[1], 'swapCard', roomId, 'c0'), { error: 'Not your turn' });
  },

  async earlierSeatLeavingKeepsTheCurrentPlayer() {
    const { roomId, game, sockets } = await startPlaying(3);
    game.turnId = 2;
    const update = wait<GameState>(sockets[2], 'gameState', s => s.players.length === 2);
    assert.deepEqual(await call(sockets[0], 'leaveRoom', roomId), { success: true });
    assert.equal((await update).turnId, 1);
    assert.deepEqual(await call(sockets[2], 'drawCard', roomId, 'deck'), { success: true });
  },

  async currentPlayerLeavingClearsTheirPower() {
    const { roomId, game, sockets } = await startPlaying(3);
    game.turnPhase = 'power';
    game.pendingCardPower = { type: 'peekSelf', playerId: sockets[0].id! };
    const update = wait<GameState>(sockets[1], 'gameState', s => s.players.length === 2);
    sockets[0].disconnect();
    const state = await update;
    assert.equal(state.turnPhase, 'drawing');
    assert.equal(state.pendingCardPower, undefined);
    assert.deepEqual(await call(sockets[1], 'drawCard', roomId, 'deck'), { success: true });
  },

  async peekTargetOwnerLeaves() {
    const { roomId, game, sockets } = await startPlaying(3);
    game.turnPhase = 'power';
    game.pendingCardPower = { type: 'peekOther', playerId: sockets[0].id! };
    const targetCardId = game.players[1].hand[0]!.id;
    assert.deepEqual(await call(sockets[0], 'confirmPower', roomId, { targetCardId }), { success: true });
    const update = wait<GameState>(sockets[0], 'gameState', s => s.players.length === 2);
    sockets[1].disconnect();
    await update;
    assert.equal(game.pendingCardPower?.targetCardId, undefined);
    assert.deepEqual(await call(sockets[0], 'skipPower', roomId), { success: true });
  },

  async cardMatchedAwayMidPeek() {
    const { roomId, game, sockets } = await startPlaying(3);
    const target = game.players[1].hand[0]!;
    game.discardPile.push({ ...target, id: 'top', visibility: 'all' });
    game.turnPhase = 'power';
    game.pendingCardPower = { type: 'peekOther', playerId: sockets[0].id! };
    await call(sockets[0], 'confirmPower', roomId, { targetCardId: target.id });
    assert.deepEqual(await call(sockets[2], 'matchCard', roomId, target.id), { success: true });
    assert.deepEqual(await call(sockets[0], 'finishPower', roomId), { success: true });
  },

  async lastRemainingPlayerWins() {
    const { game, sockets } = await startPlaying(2);
    const finished = wait<GameState>(sockets[1], 'gameState', s => s.gamePhase === 'finished');
    sockets[0].disconnect();
    assert.equal((await finished).winner, sockets[1].id);
    assert.equal(game.results.length, 1);
  },

  async caboCallerLeavesThenGameEnds() {
    const { roomId, game, sockets } = await startPlaying(3);
    assert.deepEqual(await call(sockets[0], 'callCabo', roomId), { success: true });
    assert.equal(game.remainingTurns, 1); // players 1 and 2 still to play
    const update = wait<GameState>(sockets[1], 'gameState', s => s.players.length === 2);
    sockets[0].disconnect();
    await update;
    assert.equal(game.remainingTurns, 1); // the caller's departure uses up nobody's turn
    for (const socket of [sockets[1], sockets[2]]) {
      await call(socket, 'drawCard', roomId, 'deck');
      game.players.find(p => p.id === socket.id)!.drawnCard!.value = 0; // no power, the turn just ends
      assert.deepEqual(await call(socket, 'discardCard', roomId), { success: true });
    }
    assert.equal(game.gamePhase, 'finished');
    assert.equal(game.results.length, 2);
  },

  async finalTurnPlayerLeaves() {
    const { roomId, game, sockets } = await startPlaying(3);
    await call(sockets[0], 'callCabo', roomId);
    const update = wait<GameState>(sockets[0], 'gameState', s => s.players.length === 2);
    sockets[1].disconnect(); // was next to play, so player 2 is now the last turn
    await update;
    assert.equal(game.remainingTurns, 0);
    assert.equal(game.players[game.turnId].id, sockets[2].id);
    const finished = wait<GameState>(sockets[0], 'gameState', s => s.gamePhase === 'finished');
    sockets[2].disconnect();
    await finished;
  },

  async matchReceiverLeavingUnblocksMatching() {
    const { roomId, game, sockets } = await startPlaying(3);
    const target = game.players[1].hand[0]!;
    game.discardPile.push({ ...target, id: 'top', visibility: 'all' });
    assert.deepEqual(await call(sockets[0], 'matchCard', roomId, target.id), { success: true });
    assert.equal(game.matcherId, sockets[0].id);
    const update = wait<GameState>(sockets[0], 'gameState', s => s.players.length === 2);
    sockets[1].disconnect();
    await update;
    assert.equal(game.matcherId, undefined);
  },

  async setupLeaverNoLongerBlocksCountdown() {
    const { roomId, game, sockets } = await startPlaying(3);
    game.gamePhase = 'setup';
    await call(sockets[0], 'playerReady', roomId);
    await call(sockets[1], 'playerReady', roomId);
    const countdown = wait<GameState>(sockets[0], 'gameState', s => !!s.countdownStartedAt);
    const playing = wait<GameState>(sockets[0], 'gameState', s => s.gamePhase === 'playing');
    sockets[2].disconnect();
    await countdown;
    await playing;
  },

  async onlyHostCanStartAndNotMidGame() {
    const { roomId, game, sockets } = await startPlaying(3);
    game.gamePhase = 'waiting';
    assert.ok('error' in await call(sockets[1], 'startGame', roomId));
    assert.equal(game.gamePhase, 'waiting');
    game.gamePhase = 'playing';
    game.turnId = 1;
    assert.ok('error' in await call(sockets[0], 'startGame', roomId));
    assert.equal(game.turnId, 1);
  },

  async cannotCallCaboOutOfTurn() {
    const { roomId, game, sockets } = await startPlaying(3);
    assert.ok('error' in await call(sockets[1], 'callCabo', roomId));
    assert.equal(game.isCaboCalled, false);
    assert.equal(game.turnId, 0);
  },

  async cannotPeekTwice() {
    const { roomId, game, sockets } = await startPlaying(3);
    game.turnPhase = 'power';
    game.pendingCardPower = { type: 'peekOther', playerId: sockets[0].id! };
    const [first, second] = game.players[1].hand;
    assert.deepEqual(await call(sockets[0], 'confirmPower', roomId, { targetCardId: first!.id }), { success: true });
    assert.ok('error' in await call(sockets[0], 'confirmPower', roomId, { targetCardId: second!.id }));
    assert.equal(second!.peekerId, undefined);
  },

  async powersMustTargetAnotherPlayer() {
    const { roomId, game, sockets } = await startPlaying(3);
    const mine = game.players[0].hand[0]!.id;
    game.turnPhase = 'power';
    game.pendingCardPower = { type: 'peekOther', playerId: sockets[0].id! };
    assert.ok('error' in await call(sockets[0], 'confirmPower', roomId, { targetCardId: mine }));
    game.pendingCardPower = { type: 'swap', playerId: sockets[0].id! };
    assert.ok('error' in await call(sockets[0], 'confirmPower', roomId, { myCardId: mine, targetCardId: game.players[0].hand[1]!.id }));
  },

  async invalidDrawSourceIsRejected() {
    const { roomId, game, sockets } = await startPlaying(3);
    assert.ok('error' in await call(sockets[0], 'drawCard', roomId, 'nonsense'));
    assert.equal(game.turnPhase, 'drawing');
  },

  async cannotGiveCardAfterGameEnds() {
    const { roomId, game, sockets } = await startPlaying(3);
    game.gamePhase = 'finished';
    game.matchReceiverId = sockets[1].id;
    game.matchReceiverIndex = 0;
    game.matcherId = sockets[0].id;
    const before = game.players[0].hand[0];
    assert.ok('error' in await call(sockets[0], 'giveCardToPlayer', roomId, { myCardId: before!.id }));
    assert.equal(game.players[0].hand[0], before);
  },

  async malformedPayloadsDontCrashTheServer() {
    const { roomId, game, sockets } = await startPlaying(3);
    game.turnPhase = 'power';
    game.pendingCardPower = { type: 'peekSelf', playerId: sockets[0].id! };
    assert.ok('error' in await call(sockets[0], 'confirmPower', roomId, null));
    game.matchReceiverId = sockets[1].id;
    game.matcherId = sockets[0].id;
    assert.ok('error' in await call(sockets[0], 'giveCardToPlayer', roomId, null));
  },

  async nonFunctionCallbackDoesntCrashTheServer() {
    const { roomId, sockets } = await startPlaying(3);
    sockets[0].emit('drawCard', roomId, 'deck', 5);
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.ok('error' in await call(sockets[1], 'drawCard', roomId, 'deck'));
  },

  async invalidNamesAreRejected() {
    const port = (httpServer.address() as AddressInfo).port;
    const socket = connect(`http://localhost:${port}`, { transports: ['websocket'] });
    clients.push(socket);
    await wait(socket, 'connect');
    assert.ok('error' in await call(socket, 'createRoom', 'x'.repeat(100_000)));
    assert.ok('error' in await call(socket, 'createRoom', { not: 'a string' }));
    assert.equal(games.size, 0);
    const { roomId, game } = await startPlaying(2);
    game.gamePhase = 'waiting';
    assert.ok('error' in await call(socket, 'joinRoom', roomId, 'x'.repeat(100_000)));
    assert.equal(game.players.length, 2);
  },

  async hiddenCardsNeverLeak() {
    const { roomId, game, sockets } = await startPlaying(3);
    await call(sockets[0], 'callCabo', roomId);

    const state = wait<GameState>(sockets[1], 'gameState', () => true);
    await call(sockets[1], 'drawCard', roomId, 'deck');
    assertNoHiddenCardsLeak(await state, sockets[1].id!);

    const caller = (await call(sockets[2], 'getGameState', roomId) as unknown as GameState).caboCaller!;
    assert.deepEqual(Object.keys(caller).sort(), ['id', 'name']);

    const room = wait<GameState>(sockets[1], 'roomUpdate', s => s.players.length === 2);
    sockets[2].disconnect(); // used to broadcast the raw game state
    assertNoHiddenCardsLeak(await room, sockets[1].id!);
    assert.equal(game.players.length, 2);
  },
};

httpServer.listen(0, async () => {
  const only = process.argv[2];
  let failed = 0;
  for (const [name, run] of Object.entries(scenarios)) {
    if (only && only !== name) continue;
    try {
      await run();
      console.log(`pass  ${name}`);
    }
    catch (err) {
      failed++;
      console.log(`FAIL  ${name}: ${(err as Error).message}`);
    }
    clients.forEach(socket => socket.disconnect());
    clients = [];
    await new Promise(resolve => setTimeout(resolve, 20));
    games.clear();
  }
  process.exit(failed ? 1 : 0);
});
