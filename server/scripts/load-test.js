// Plays full games with bot players and measures p50/p95/p99 time from a player's action to
// every player in the room receiving the resulting state.
//   node scripts/load-test.js --url http://localhost:3000 --rooms 100 --players 4 --rate 1 --duration 30 --pid <server pid>
const { fork, execSync } = require('node:child_process');
const { monitorEventLoopDelay } = require('node:perf_hooks');
const { io } = require('socket.io-client');

const args = { url: 'http://localhost:3000', rooms: 10, players: 4, rate: 1, duration: 30, workers: 4, pid: '', ramp: 20 };
process.argv.slice(2).forEach((arg, i, all) => {
  if (arg.startsWith('--')) args[arg.slice(2)] = all[i + 1];
});
['rooms', 'players', 'rate', 'duration', 'workers', 'ramp'].forEach(key => args[key] = Number(args[key]));

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// ---- Worker: owns a share of the rooms, so the bots aren't the bottleneck being measured ----

async function runWorker(roomCount) {
  const stats = { latencies: [], errors: 0, timeouts: 0, gamesFinished: 0, stateBytes: 0, stateSamples: 0 };
  const loopDelay = monitorEventLoopDelay();
  let measuring = false;
  let stopped = false;
  let roomsPlaying = 0;

  async function connectBot() {
    const socket = io(args.url, { transports: ['websocket'], reconnection: false, timeout: 60000 });
    await new Promise((resolve, reject) => {
      socket.once('connect', resolve);
      socket.once('connect_error', reject);
    });
    return socket;
  }

  async function playRoom() {
    const bots = [];
    for (let i = 0; i < args.players; i++) bots.push(await connectBot());
    let state = null;
    let awaiting = 0;
    let delivered = () => {};

    bots.forEach(socket => socket.on('gameState', next => {
      state = next;
      if (awaiting > 0 && --awaiting === 0) delivered();
      if (stats.stateSamples < 200) {
        stats.stateBytes += JSON.stringify(next).length;
        stats.stateSamples++;
      }
    }));

    const nextRoomState = new Promise((resolve, reject) => {
      bots[0].once('roomUpdate', resolve);
      setTimeout(() => reject(new Error('createRoom timed out: server unresponsive')), 15000);
    });
    bots[0].emit('createRoom', 'bot0');
    const roomId = (await nextRoomState).id;
    for (let i = 1; i < args.players; i++) {
      await bots[i].timeout(30000).emitWithAck('joinRoom', roomId, `bot${i}`);
    }

    // Sends one action and resolves once every player has received the new state.
    function act(socket, event, ...params) {
      const started = performance.now();
      return new Promise(resolve => {
        const finish = () => {
          clearTimeout(timer);
          awaiting = 0;
          resolve();
        };
        const timer = setTimeout(() => {
          if (measuring) stats.timeouts++;
          finish();
        }, 10000);
        awaiting = bots.length;
        delivered = () => {
          if (measuring) stats.latencies.push(performance.now() - started);
          finish();
        };
        socket.emit(event, roomId, ...params, res => {
          if (res?.error) {
            if (measuring) stats.errors++;
            finish();
          }
        });
      });
    }

    async function startNewGame() {
      const playing = new Promise(resolve => {
        const check = next => {
          if (next.gamePhase === 'playing') {
            bots[0].off('gameState', check);
            resolve();
          }
        };
        bots[0].on('gameState', check);
      });
      const dealt = new Promise(resolve => bots[0].once('gameState', resolve));
      bots[0].emit('startGame', roomId);
      await dealt;
      bots.forEach(socket => socket.emit('playerReady', roomId));
      await playing;
    }

    await sleep(Math.random() * 1000 / args.rate); // don't move every room in lockstep
    await startNewGame();
    if (++roomsPlaying === roomCount) process.send({ type: 'ready' });

    while (!stopped) {
      const tickStart = performance.now();
      if (state.gamePhase === 'finished') {
        if (measuring) stats.gamesFinished++;
        await startNewGame();
        continue;
      }

      const current = state.players[state.turnId];
      const socket = bots.find(bot => bot.id === current.id);
      if (state.turnPhase === 'drawing') {
        if (!state.isCaboCalled && Math.random() < 0.05) await act(socket, 'callCabo');
        else await act(socket, 'drawCard', 'deck');
      }
      else if (state.turnPhase === 'action') {
        const hand = current.hand.filter(Boolean);
        if (Math.random() < 0.5 && hand.length) await act(socket, 'swapCard', hand[Math.floor(Math.random() * hand.length)].id);
        else await act(socket, 'discardCard');
      }
      else {
        await act(socket, 'skipPower');
      }
      await sleep(Math.max(0, 1000 / args.rate - (performance.now() - tickStart)));
    }
    bots.forEach(socket => socket.disconnect());
  }

  process.on('message', async message => {
    if (message === 'measure') {
      measuring = true;
      loopDelay.enable();
    }
    if (message === 'stop') {
      measuring = false;
      stopped = true;
      loopDelay.disable();
      process.send({ type: 'stats', stats, botLoopP99: loopDelay.percentile(99) / 1e6 }, () => process.exit(0)); // exit only once it's flushed
    }
  });

  const rooms = [];
  for (let i = 0; i < roomCount; i++) {
    rooms.push(playRoom().catch(err => process.send({ type: 'fatal', message: `${err.message} ${err.description?.message ?? err.description ?? ''}`, roomIndex: i })));
    await sleep(args.ramp); // connect gradually: a burst overflows the OS accept queue
  }
  await Promise.all(rooms);
}

// ---- Parent: starts the workers, then merges and reports their numbers ----

function serverUsage() {
  if (!args.pid) return null;
  const [time, rss] = execSync(`ps -o time=,rss= -p ${args.pid}`).toString().trim().split(/\s+/);
  const seconds = time.split(':').reduce((total, part) => total * 60 + Number(part), 0);
  return { cpuSeconds: seconds, rssMb: Math.round(Number(rss) / 1024) };
}

async function runParent() {
  const workers = Array.from({ length: args.workers }, (_, i) => {
    const share = Math.floor(args.rooms / args.workers) + (i < args.rooms % args.workers ? 1 : 0);
    return fork(__filename, process.argv.slice(2), { env: { ...process.env, LOAD_TEST_ROOMS: String(share) } });
  });

  const fail = (message, roomIndex) => {
    console.log(JSON.stringify({ rooms: args.rooms, players: args.rooms * args.players, failed: message, workerRoomIndex: roomIndex, serverAfter: serverUsage() }));
    workers.forEach(worker => worker.kill());
    process.exit(1);
  };

  const results = [];
  const stats = [];
  let ready = 0;
  workers.forEach(worker => worker.on('disconnect', () => { // fires after all of the worker's messages are delivered
    if (!results.includes(worker)) fail('worker exited without reporting');
  }));
  setTimeout(() => fail('run exceeded its time limit'), (args.duration + 180) * 1000);
  await new Promise(resolve => workers.forEach(worker => worker.on('message', message => {
    if (message.type === 'fatal') fail(message.message, message.roomIndex);
    if (message.type === 'stats') {
      stats.push(message);
      results.push(worker);
    }
    if (message.type === 'ready' && ++ready === workers.length) resolve();
  })));

  await sleep(2000); // let the connection burst settle
  workers.forEach(worker => worker.send('measure'));
  const usageStart = serverUsage();
  const started = Date.now();
  await sleep(args.duration * 1000);
  const usageEnd = serverUsage();
  const elapsed = (Date.now() - started) / 1000;
  workers.forEach(worker => worker.send('stop'));
  while (results.length < workers.length) await sleep(50);

  const latencies = stats.flatMap(r => r.stats.latencies).sort((a, b) => a - b);
  const percentile = p => Math.round((latencies[Math.floor(latencies.length * p)] ?? NaN) * 10) / 10;
  const sum = key => stats.reduce((total, r) => total + r.stats[key], 0);
  console.log(JSON.stringify({
    rooms: args.rooms,
    players: args.rooms * args.players,
    actionsPerSec: Math.round(latencies.length / elapsed),
    actions: latencies.length,
    p50: percentile(0.5),
    p95: percentile(0.95),
    p99: percentile(0.99),
    max: Math.round(latencies.at(-1) ?? NaN),
    errors: sum('errors'),
    timeouts: sum('timeouts'),
    gamesFinished: sum('gamesFinished'),
    kbPerState: Math.round(sum('stateBytes') / sum('stateSamples') / 102.4) / 10,
    botLoopP99: Math.round(Math.max(...stats.map(r => r.botLoopP99))),
    serverCpuPct: usageStart ? Math.round((usageEnd.cpuSeconds - usageStart.cpuSeconds) / elapsed * 100) : undefined,
    serverRssMb: usageEnd?.rssMb,
  }));
  process.exit(0);
}

if (process.env.LOAD_TEST_ROOMS) runWorker(Number(process.env.LOAD_TEST_ROOMS));
else runParent();
