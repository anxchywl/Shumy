const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { randomBytes, randomUUID, timingSafeEqual } = require('crypto');
const { renderQrSvg } = require('./qr');
const QUESTIONS = require('./questions');
const { CARDS, normalize, maskWord, validSegment } = require('./drawing');
const { loadScenes, createDub, TAKE_MAX_BYTES } = require('./dub');
const { createCrowd } = require('./crowd');
const { createQuiz } = require('./quiz');
const { createDuel } = require('./duel');
const { createFakeDefinition } = require('./fake-definition');
const { createTelephone } = require('./telephone');
const { createShow } = require('./show');
const { createImpostor } = require('./impostor');
const { createTower } = require('./tower');
const { createMonster } = require('./monster');
const { createDictation } = require('./dictation');
const { generateAvatar, AVATARS } = require('./avatar');

const PORT = Number(process.env.PORT) || 5181;
const VOTE_SECONDS = Number(process.env.VOTE_SECONDS) || 20;
const DRAW_SECONDS = Number(process.env.DRAW_SECONDS) || 65;
const seconds = (name, fallback) => (Number(process.env[name]) || fallback) * 1000;
// starting playtest values, not a tuned balance
const DUB_CONFIG = {
  introMs: seconds('DUB_INTRO_SECONDS', 8),
  slotMs: seconds('DUB_SLOT_SECONDS', 30),
  voteMs: seconds('DUB_VOTE_SECONDS', 20),
  handoffMs: seconds('DUB_HANDOFF_SECONDS', 4),
  extendMs: 10000,
  reopenMs: 15000,
  retakeMinMs: 5000,
  playLeadMs: 1500,
  roomBytes: 2 * 1024 * 1024,
};
const DUB_SCENES = loadScenes(require('./dub-scenes'), path.join(__dirname, 'public'));
for (const scene of DUB_SCENES) {
  if (scene.problems.length) console.error(`\n  Сцена «${scene.id}» не пройдёт в игру:\n   - ${scene.problems.join('\n   - ')}`);
}

function lanIp() {
  if (process.env.HOST_IP) return process.env.HOST_IP;
  for (const list of Object.values(os.networkInterfaces())) {
    for (const a of list || []) if (a.family === 'IPv4' && !a.internal) return a.address;
  }
  return 'localhost';
}
const publicUrl = process.env.PUBLIC_URL ? new URL(process.env.PUBLIC_URL) : null;
if (publicUrl && (publicUrl.protocol !== 'https:' || !publicUrl.pathname.endsWith('/'))) {
  throw new Error('PUBLIC_URL must be an HTTPS URL ending in /');
}
const JOIN_URL = publicUrl?.href ?? `http://${lanIp()}:${PORT}/`;
const COOKIE_PATH = publicUrl?.pathname ?? '/';
const hostActions = new Set(['next', 'lobby', 'settings', 'kick', 'dubAdvance', 'dubExtend', 'dubFinish', 'dubReopen', 'dubCancel', 'dubPlay', 'dubHide', 'dubNext', 'crowdAdvance', 'crowdNext', 'quizAdvance', 'quizNext', 'duelAdvance', 'duelHide', 'duelNext', 'fakeAdvance', 'fakeHide', 'fakeNext', 'telephoneAdvance', 'telephoneNext', 'showAdvance', 'showNext', 'impostorAdvance', 'impostorHide', 'impostorNext', 'towerAdvance', 'towerNext', 'monsterAdvance', 'monsterHide', 'monsterPage', 'monsterNext', 'dictationCancel', 'dictationNext', 'dictationRetry']);

function matches(input, expected) {
  const value = Buffer.from(input);
  const secret = Buffer.from(expected);
  return value.length === secret.length && timingSafeEqual(value, secret);
}

function cookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').map(part => part.trim().split('=')).filter(([key, value]) => key && value));
}

function isHost(req, room) {
  const key = cookies(req)[`kto_host_${room.code}`];
  return Boolean(key) && matches(key, room.hostKey);
}

// each room is an independent game with its own players, timers and live connections
function createRoom(code) {
  // ---------- state ----------
  const players = new Map();
  const sessions = new Map();
  let game = freshGame();
  let sequence = 0;
  const dub = createDub({ players, scenes: DUB_SCENES, config: DUB_CONFIG, changed: () => broadcast() });
  const crowd = createCrowd({ players, changed: () => broadcast() });
  const quiz = createQuiz({ players, changed: () => broadcast() });
  const duel = createDuel({ players, changed: () => broadcast() });
  const fake = createFakeDefinition({ players, changed: () => broadcast() });
  const telephone = createTelephone({ players, changed: () => broadcast() });
  const show = createShow({ players, changed: () => broadcast() });
  const impostor = createImpostor({ players, changed: () => broadcast() });
  const tower = createTower({ players, changed: () => broadcast() });
  const monster = createMonster({ players, changed: () => broadcast() });
  const dictation = createDictation({ players, changed: () => broadcast() });
  function freshGame() {
    return {
      phase: 'lobby', // lobby | question | reveal | final | draw | draw-result | dub
      round: 0,
      totalRounds: 10,
      otherRounds: null,
      mode: null,
      dubScene: null,
      anonymous: false,
      deck: shuffle([...QUESTIONS]),
      question: null,
      startedAt: 0,
      endsAt: 0,
      votes: new Map(), // voterId -> targetId
      voteTimes: new Map(),
      results: null,
      timer: null,
      route: [],
      skipped: [],
      drawDeck: [],
      drawing: null,
    };
  }
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  function publicState() {
    const list = [...players.values()].map(p => ({
      id: p.id, name: p.name, color: p.color, avatar: p.avatar, score: p.score, online: p.online,
      voted: game.votes.has(p.id), timesPicked: p.timesPicked,
    }));
    return {
      // clients drop a snapshot that arrives after a newer one
      seq: ++sequence,
      mode: game.mode,
      phase: game.phase,
      round: game.round,
      totalRounds: game.totalRounds,
      anonymous: game.anonymous,
      question: game.question,
      remainingMs: ['question', 'draw'].includes(game.phase) ? Math.max(0, game.endsAt - Date.now()) : 0,
      durationMs: (game.mode === 'draw' ? DRAW_SECONDS : VOTE_SECONDS) * 1000,
      players: list,
      results: game.results,
      joinUrl: `${JOIN_URL}?room=${code}`,
      drawRoute: game.route,
      drawing: publicDrawing(),
      dub: dub.publicState(),
      crowd: crowd.publicState(),
      quiz: quiz.publicState(),
      duel: duel.publicState(),
      fake: fake.publicState(),
      telephone: telephone.publicState(),
      showGame: show.publicState(),
      impostor: impostor.publicState(),
      tower: tower.publicState(),
      monster: monster.publicState(),
      dictation: dictation.publicState(),
      dubScene: game.dubScene,
      dubScenes: game.mode === 'dub' && game.phase === 'lobby' ? DUB_SCENES.map(scene => ({
        id: scene.id, title: scene.title, tone: scene.tone, durationMs: scene.asset?.durationMs ?? 0,
        slots: scene.slots?.length ?? 0, problem: scene.problems[0] ?? null,
      })) : undefined,
    };
  }

  function publicDrawing() {
    const turn = game.drawing;
    if (!turn) return null;
    const revealed = game.phase === 'draw-result';
    return {
      id: turn.id,
      artist: turn.artist,
      category: turn.card.category,
      mask: maskWord(turn.card.word, turn.hint),
      skipped: game.skipped,
      solved: [...turn.solved],
      gained: turn.gained,
      word: revealed ? turn.card.word : null,
    };
  }

  // ---------- SSE ----------
  const clients = new Set(); // {res, pid}
  function broadcast() {
    const state = publicState();
    for (const c of clients) sendState(c, state);
  }
  function sendState(client, state = publicState()) {
    const selfId = sessions.get(client.pid) ?? null;
    const turn = game.drawing;
    const secretWord = game.phase === 'draw' && selfId === turn.artist ? turn.card.word : undefined;
    // with one identity on two devices the latest connection is the active one
    const selfActive = !client.pid || [...clients].findLast(other => other.pid === client.pid) === client;
    const dubMine = dub.privateState(selfId) ?? undefined;
    const dubHost = client.host ? dub.hostState() ?? undefined : undefined;
    const crowdMine = crowd.privateState(selfId) ?? undefined;
    const quizMine = quiz.privateState(selfId) ?? undefined;
    const duelMine = duel.privateState(selfId) ?? undefined;
    const duelHost = client.host ? duel.hostState() ?? undefined : undefined;
    const fakeMine = fake.privateState(selfId) ?? undefined;
    const fakeHost = client.host ? fake.hostState() ?? undefined : undefined;
    const telephoneMine = telephone.privateState(selfId) ?? undefined;
    const showMine = show.privateState(selfId) ?? undefined;
    const impostorMine = impostor.privateState(selfId) ?? undefined;
    const impostorHost = client.host ? impostor.hostState() ?? undefined : undefined;
    const towerMine = tower.privateState(selfId) ?? undefined;
    const monsterMine = monster.privateState(selfId) ?? undefined;
    const monsterHost = client.host ? monster.hostState() ?? undefined : undefined;
    const dictationMine = dictation.privateState(selfId) ?? undefined;
    writeEvent(client, `data: ${JSON.stringify({ ...state, selfId, selfActive, secretWord, dubMine, dubHost, crowdMine, quizMine, duelMine, duelHost, fakeMine, fakeHost, telephoneMine, showMine, impostorMine, impostorHost, towerMine, monsterMine, monsterHost, dictationMine })}\n\n`);
  }
  function writeEvent(client, event) {
    if (client.res.writableLength > 512 * 1024) client.res.destroy();
    else client.res.write(event);
  }
  function inkEvent(turn, segments, reset = false) {
    return `event: ink\ndata: ${JSON.stringify({ id: turn.id, segments, reset })}\n\n`;
  }

  function setOnline(pid) {
    const p = players.get(sessions.get(pid));
    if (!p) return;
    const on = [...clients].some(c => c.pid === pid);
    if (p.online !== on) {
      p.online = on;
      broadcast();
      maybeAllVoted();
      maybeAllGuessed();
      dub.presenceChanged();
      dictation.presenceChanged();
    }
  }

  // ---------- game logic ----------
  function startQuestion() {
    game.round += 1;
    if (game.deck.length === 0) game.deck = shuffle([...QUESTIONS]);
    game.question = game.deck.pop();
    game.votes = new Map();
    game.voteTimes = new Map();
    game.results = null;
    game.phase = 'question';
    game.startedAt = Date.now();
    game.endsAt = game.startedAt + VOTE_SECONDS * 1000;
    clearTimeout(game.timer);
    game.timer = setTimeout(reveal, VOTE_SECONDS * 1000 + 300);
    broadcast();
  }

  function reveal() {
    if (game.phase !== 'question') return;
    clearTimeout(game.timer);
    const tally = new Map();
    for (const [voter, target] of game.votes) {
      if (!tally.has(target)) tally.set(target, []);
      tally.get(target).push(voter);
    }
    const max = Math.max(0, ...[...tally.values()].map(v => v.length));
    const winners = max > 0 ? [...tally].filter(([, v]) => v.length === max).map(([t]) => t) : [];
    const gained = {};
    for (const [voter, target] of game.votes) {
      if (winners.includes(target)) {
        const t = game.voteTimes.get(voter) ?? game.endsAt;
        const speed = Math.max(0, (game.endsAt - t) / (VOTE_SECONDS * 1000));
        gained[voter] = 500 + Math.round(500 * speed);
        const p = players.get(voter);
        if (p) p.score += gained[voter];
      }
    }
    for (const w of winners) { const p = players.get(w); if (p) p.timesPicked += 1; }
    const bars = [...tally]
      .map(([id, voters]) => ({ id, count: voters.length, voters: game.anonymous ? [] : voters }))
      .sort((a, b) => b.count - a.count);
    game.results = { bars, winners, gained, totalVotes: game.votes.size };
    game.phase = 'reveal';
    broadcast();
  }

  function next() {
    if (game.phase === 'lobby') {
      if (!game.mode) return { error: 'Сначала выбери игру' };
      const online = [...players.values()].filter(p => p.online);
      if ((game.mode === 'vote' ? players.size : online.length) < 2) return;
      if (game.mode === 'dub') {
        const started = dub.start(game.dubScene);
        if (started.error) return started;
        game.phase = 'dub';
        broadcast();
        return;
      }
      if (game.mode === 'crowd') {
        for (const p of players.values()) p.score = 0;
        const started = crowd.start();
        if (started.error) return started;
        game.phase = 'crowd';
        broadcast();
        return;
      }
      if (game.mode === 'quiz') {
        for (const p of players.values()) p.score = 0;
        const started = quiz.start();
        if (started.error) return started;
        game.phase = 'quiz';
        broadcast();
        return;
      }
      if (game.mode === 'duel') {
        const started = duel.start();
        if (started.error) return started;
        game.phase = 'duel';
        broadcast();
        return;
      }
      if (game.mode === 'fake') {
        const started = fake.start();
        if (started.error) return started;
        game.phase = 'fake';
        broadcast();
        return;
      }
      if (game.mode === 'telephone') {
        const started = telephone.start();
        if (started.error) return started;
        game.phase = 'telephone';
        broadcast();
        return;
      }
      if (game.mode === 'show') {
        const started = show.start();
        if (started.error) return started;
        game.phase = 'show';
        broadcast();
        return;
      }
      if (game.mode === 'impostor') {
        const started = impostor.start();
        if (started.error) return started;
        game.phase = 'impostor';
        broadcast();
        return;
      }
      if (game.mode === 'tower') {
        const started = tower.start();
        if (started.error) return started;
        game.phase = 'tower';
        broadcast();
        return;
      }
      if (game.mode === 'monster') {
        const started = monster.start();
        if (started.error) return started;
        game.phase = 'monster';
        broadcast();
        return;
      }
      if (game.mode === 'dictation') {
        const started = dictation.start(game.totalRounds);
        if (started.error) return started;
        game.phase = 'dictation';
        broadcast();
        return;
      }
      for (const p of players.values()) { p.score = 0; p.timesPicked = 0; }
      if (game.mode === 'draw') {
        game.route = shuffle(online.map(({ id, name, color }) => ({ id, name, color })));
        game.drawDeck = shuffle([...CARDS]);
        game.voteRounds = game.totalRounds;
        game.totalRounds = game.route.length;
        nextDrawing();
      } else startQuestion();
    } else if (game.phase === 'question') reveal();
    else if (game.phase === 'reveal') {
      if (game.round >= game.totalRounds) { game.phase = 'final'; broadcast(); }
      else startQuestion();
    } else if (game.phase === 'draw') revealDrawing();
    else if (game.phase === 'draw-result') nextDrawing();
    else if (game.phase === 'final') toLobby();
  }

  function toLobby() {
    clearTimeout(game.timer);
    clearTimeout(game.drawing?.hintTimer);
    dub.stop();
    crowd.stop();
    quiz.stop();
    duel.stop();
    fake.stop();
    telephone.stop();
    show.stop();
    impostor.stop();
    tower.stop();
    monster.stop();
    dictation.stop();
    const { totalRounds, voteRounds, anonymous, mode, dubScene, otherRounds } = game;
    game = freshGame();
    game.dubScene = dubScene;
    game.otherRounds = otherRounds;
    game.totalRounds = voteRounds ?? totalRounds;
    game.anonymous = anonymous;
    game.mode = mode;
    for (const p of players.values()) { p.score = 0; p.timesPicked = 0; }
    // drop players that left while in lobby
    for (const [pid, id] of sessions) {
      if (!players.get(id).online) {
        players.delete(id);
        sessions.delete(pid);
      }
    }
    broadcast();
  }

  function nextDrawing() {
    while (game.round < game.route.length) {
      const { id: artist } = game.route[game.round++];
      if (players.get(artist)?.online) {
        startDrawing(artist);
        return;
      }
      game.skipped.push(artist);
    }
    game.phase = 'final';
    game.drawing = null;
    broadcast();
  }

  function startDrawing(artist) {
    const turn = {
      id: randomUUID(),
      artist,
      card: game.drawDeck.pop(),
      hint: false,
      segments: [],
      inkBudget: 256,
      lastInk: Date.now(),
      solved: new Set(),
      guessedAt: new Map(),
      gained: {},
    };
    game.drawing = turn;
    game.phase = 'draw';
    game.endsAt = Date.now() + DRAW_SECONDS * 1000;
    game.timer = setTimeout(revealDrawing, DRAW_SECONDS * 1000);
    turn.hintTimer = setTimeout(() => {
      turn.hint = true;
      broadcast();
    }, DRAW_SECONDS * 600);
    broadcast();
  }

  function revealDrawing() {
    if (game.phase !== 'draw') return;
    clearTimeout(game.timer);
    clearTimeout(game.drawing.hintTimer);
    game.phase = 'draw-result';
    broadcast();
  }

  function maybeAllGuessed() {
    if (game.phase !== 'draw') return false;
    const { artist, solved } = game.drawing;
    const guessers = game.route.filter(p => p.id !== artist && players.get(p.id)?.online);
    if (guessers.length === 0 || !guessers.every(p => solved.has(p.id))) return false;
    revealDrawing();
    return true;
  }

  function activeDrawing(turnId) {
    return game.phase === 'draw' && game.drawing.id === turnId && Date.now() < game.endsAt ? game.drawing : null;
  }

  function allOnlinePlayersVoted() {
    const online = [...players.values()].filter(p => p.online);
    return online.length > 0 && online.every(p => game.votes.has(p.id));
  }

  function maybeAllVoted() {
    if (game.phase !== 'question' || !allOnlinePlayersVoted()) return;
    const roundVotes = game.votes;
    setTimeout(() => {
      if (game.votes === roundVotes && allOnlinePlayersVoted()) reveal();
    }, 600);
  }

  function uniqueName(name, id) {
    let n = name, i = 2;
    const taken = () => [...players.values()].some(p => p.id !== id && p.name.toLowerCase() === n.toLowerCase());
    while (taken()) n = `${name} ${i++}`;
    return n;
  }

  // ---------- actions ----------
  const actions = {
    join({ pid, name }) {
      name = typeof name === 'string' ? name.trim().slice(0, 16) : '';
      if (!name) return { error: 'Введи имя' };
      if (typeof pid !== 'string' || !/^[a-f0-9-]{32,36}$/.test(pid)) return { error: 'Обнови страницу и войди снова' };
      let p = players.get(sessions.get(pid));
      if (!p) {
        if (players.size >= 50) return { error: 'Комната заполнена' };
        // the avatar body colour becomes the player colour used by dots and bars
        const avatar = generateAvatar({ taken: [...players.values()].map(x => x.avatar) });
        const color = AVATARS.palette[avatar.color];
        p = { id: randomUUID(), name: '', color, avatar, score: 0, online: [...clients].some(c => c.pid === pid), timesPicked: 0 };
        players.set(p.id, p);
        sessions.set(pid, p.id);
      }
      p.name = uniqueName(name, p.id);
      broadcast();
      return { ok: true, name: p.name };
    },
    leave({ pid }) {
      const id = sessions.get(pid);
      sessions.delete(pid);
      players.delete(id);
      game.votes.delete(id);
      dub.playerLeft(id);
      dictation.presenceChanged();
      broadcast();
      maybeAllVoted();
      if (game.phase === 'draw' && id === game.drawing.artist) revealDrawing();
      else maybeAllGuessed();
      return { ok: true };
    },
    vote({ pid, target, round }) {
      if (game.phase !== 'question' || (round !== undefined && round !== game.round) || Date.now() >= game.endsAt) {
        return { error: 'Этот раунд уже закрыт для голосования' };
      }
      const voter = sessions.get(pid);
      if (!voter || !players.has(target)) return { error: 'Нет такого игрока' };
      if (game.votes.has(voter)) return { error: 'Ты уже проголосовал' };
      game.votes.set(voter, target);
      game.voteTimes.set(voter, Date.now());
      broadcast();
      maybeAllVoted();
      return { ok: true };
    },
    ink({ pid, turnId, segments, clear }) {
      const turn = activeDrawing(turnId);
      if (!turn || sessions.get(pid) !== turn.artist) return { error: 'Сейчас рисует другой игрок' };
      const now = Date.now();
      turn.inkBudget = Math.min(256, turn.inkBudget + (now - turn.lastInk) * .18);
      turn.lastInk = now;
      if (clear === true) {
        if (turn.inkBudget < 12) return { error: 'Подожди перед очисткой' };
        turn.inkBudget -= 12;
        turn.segments.length = 0;
        const message = inkEvent(turn, [], true);
        for (const client of clients) writeEvent(client, message);
        return { ok: true };
      }
      if (!Array.isArray(segments) || segments.length < 1 || segments.length > 96 || !segments.every(validSegment)) {
        return { error: 'Некорректный штрих' };
      }
      if (segments.length > turn.inkBudget || turn.segments.length + segments.length > 12000) return { error: 'Слишком много штрихов' };
      turn.inkBudget -= segments.length;
      turn.segments.push(...segments);
      const message = inkEvent(turn, segments);
      for (const client of clients) writeEvent(client, message);
      return { ok: true };
    },
    guess({ pid, turnId, text }) {
      const turn = activeDrawing(turnId);
      if (!turn) return { error: 'Этот раунд уже закончился' };
      const id = sessions.get(pid);
      if (!id || id === turn.artist || !game.route.some(p => p.id === id)) return { error: 'Сейчас ты не угадываешь' };
      if (turn.solved.has(id)) return { correct: true };
      const guess = typeof text === 'string' && text.length <= 80 ? normalize(text) : '';
      if (!guess) return { error: 'Напиши свою догадку' };
      const now = Date.now();
      if (now - (turn.guessedAt.get(id) ?? 0) < 450) return { error: 'Слишком быстро. Попробуй через секунду' };
      turn.guessedAt.set(id, now);
      if (!turn.card.answers.includes(guess)) return { correct: false };
      turn.solved.add(id);
      const gain = 100 + Math.round(200 * (game.endsAt - now) / (DRAW_SECONDS * 1000));
      turn.gained[id] = gain;
      players.get(id).score += gain;
      const artist = players.get(turn.artist);
      artist.score += 30;
      turn.gained[artist.id] = (turn.gained[artist.id] ?? 0) + 30;
      if (!maybeAllGuessed()) broadcast();
      return { correct: true, gain };
    },
    // host (TV) actions
    next({ phase, round }) {
      if (phase === undefined || (phase === game.phase && round === game.round)) return next() ?? { ok: true };
      return { ok: true };
    },
    lobby() { toLobby(); return { ok: true }; },
    settings({ totalRounds, anonymous, mode, dubScene }) {
      if (game.phase !== 'lobby') return { error: 'Только в лобби' };
      if (totalRounds !== undefined && (!Number.isInteger(totalRounds) || totalRounds < 1 || totalRounds > 50)) return { error: 'Неверное число раундов' };
      if (mode !== undefined && !['vote', 'draw', 'dub', 'crowd', 'quiz', 'duel', 'fake', 'telephone', 'show', 'impostor', 'tower', 'monster', 'dictation'].includes(mode)) return { error: 'Нет такой игры' };
      if (totalRounds !== undefined && (mode ?? game.mode) === 'dictation' && ![1, 3, 5].includes(totalRounds)) return { error: 'Неверное число раундов' };
      if (dubScene !== undefined && dubScene !== null && !DUB_SCENES.some(scene => scene.id === dubScene)) return { error: 'Нет такой сцены' };
      if (mode !== undefined && mode !== game.mode) {
        if (mode === 'dictation') { game.otherRounds = game.totalRounds; game.totalRounds = 3; }
        else if (game.mode === 'dictation') game.totalRounds = game.otherRounds ?? 10;
        game.mode = mode;
      }
      if (dubScene !== undefined) game.dubScene = dubScene;
      if (totalRounds !== undefined) game.totalRounds = totalRounds;
      if (typeof anonymous === 'boolean') game.anonymous = anonymous;
      broadcast();
      return { ok: true };
    },
    kick({ target }) {
      const session = [...sessions].find(([, id]) => id === target);
      return session ? actions.leave({ pid: session[0] }) : { error: 'Нет такого игрока' };
    },
  };

  for (const [name, action] of Object.entries(dub.playerActions)) actions[name] = body => action(sessions.get(body.pid), body);
  for (const [name, action] of Object.entries(crowd.playerActions)) actions[name] = body => action(sessions.get(body.pid), body);
  for (const [name, action] of Object.entries(quiz.playerActions)) actions[name] = body => action(sessions.get(body.pid), body);
  for (const [name, action] of Object.entries(duel.playerActions)) actions[name] = body => action(sessions.get(body.pid), body);
  for (const [name, action] of Object.entries(fake.playerActions)) actions[name] = body => action(sessions.get(body.pid), body);
  for (const [name, action] of Object.entries(telephone.playerActions)) actions[name] = body => action(sessions.get(body.pid), body);
  for (const [name, action] of Object.entries(show.playerActions)) actions[name] = body => action(sessions.get(body.pid), body);
  for (const [name, action] of Object.entries(impostor.playerActions)) actions[name] = body => action(sessions.get(body.pid), body);
  for (const [name, action] of Object.entries(tower.playerActions)) actions[name] = body => action(sessions.get(body.pid), body);
  for (const [name, action] of Object.entries(monster.playerActions)) actions[name] = body => action(sessions.get(body.pid), body);
  for (const [name, action] of Object.entries(dictation.playerActions)) actions[name] = body => action(sessions.get(body.pid), body);
  Object.assign(actions, dub.hostActions);
  Object.assign(actions, crowd.hostActions);
  Object.assign(actions, quiz.hostActions);
  Object.assign(actions, duel.hostActions);
  Object.assign(actions, fake.hostActions);
  Object.assign(actions, telephone.hostActions);
  Object.assign(actions, show.hostActions);
  Object.assign(actions, impostor.hostActions);
  Object.assign(actions, tower.hostActions);
  Object.assign(actions, monster.hostActions);
  Object.assign(actions, dictation.hostActions);
  actions.dubCancel = body => {
    const out = dub.hostActions.dubCancel(body);
    if (out.ok) toLobby();
    return out;
  };

  function submitTake(pid, meta, data) {
    const out = dub.submitTake(sessions.get(pid), meta, data);
    room.lastActive = Date.now();
    return out;
  }

  function take(takeId, req, pid) {
    return dub.takeFor(takeId, { host: isHost(req, room), playerId: sessions.get(pid) });
  }

  const room = { code, hostKey: randomBytes(24).toString('hex'), createdAt: Date.now(), lastActive: Date.now(), clients, actions, connect, setOnline, destroy, submitTake, take };

  function connect(req, res, pid) {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    const c = { res, pid, host: isHost(req, room) };
    clients.add(c);
    room.lastActive = Date.now();
    res.write('retry: 1500\n');
    sendState(c);
    if (game.drawing) writeEvent(c, inkEvent(game.drawing, game.drawing.segments, true));
    if (pid) setOnline(pid);
    req.on('close', () => {
      clients.delete(c);
      room.lastActive = Date.now();
      if (pid) setOnline(pid);
    });
  }

  function destroy() {
    dub.stop();
    crowd.stop();
    quiz.stop();
    duel.stop();
    fake.stop();
    telephone.stop();
    show.stop();
    impostor.stop();
    tower.stop();
    monster.stop();
    dictation.stop();
    clearTimeout(game.timer);
    clearTimeout(game.drawing?.hintTimer);
    for (const c of clients) c.res.end();
    clients.clear();
  }

  return room;
}

// ---------- rooms ----------
// use 8 characters from a 32-symbol alphabet for 40 bits of room-code entropy
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_IDLE_MS = 10 * 60 * 1000;
const ROOM_MAX_MS = 6 * 60 * 60 * 1000;
const rooms = new Map();

function newRoom() {
  let code;
  do code = Array.from(randomBytes(8), byte => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join('');
  while (rooms.has(code));
  const room = createRoom(code);
  rooms.set(code, room);
  return room;
}

function roomFrom(value) {
  return rooms.get(String(value || '').toUpperCase()) ?? null;
}

setInterval(() => {
  for (const room of rooms.values()) for (const c of room.clients) c.res.write(': ping\n\n');
}, 15000);

setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    const idle = room.clients.size === 0 && now - room.lastActive > ROOM_IDLE_MS;
    if (idle || now - room.createdAt > ROOM_MAX_MS) {
      room.destroy();
      rooms.delete(room.code);
    }
  }
  for (const [key, list] of hits) if (!list.some(time => now - time < DAY_MS)) hits.delete(key);
}, 60 * 1000);

// ---------- rate limits ----------
// ip is only used for room creation and code guessing, game actions are never limited by ip
const DAY_MS = 24 * 60 * 60 * 1000;
const hits = new Map();

function recent(key, windowMs) {
  const now = Date.now();
  return (hits.get(key) ?? []).filter(time => now - time < windowMs).length;
}

function record(key) {
  const list = hits.get(key) ?? [];
  list.push(Date.now());
  hits.set(key, list.slice(-40));
}

function clientIp(req) {
  const forwarded = publicUrl ? req.headers['x-forwarded-for']?.split(',')[0].trim() : '';
  return forwarded || req.socket.remoteAddress || 'unknown';
}

function tooManyCreations(ip) {
  return recent(`create:${ip}`, 60 * 1000) >= 5 || recent(`create:${ip}`, DAY_MS) >= 30;
}

function tooManyMisses(ip) {
  return recent(`miss:${ip}`, 60 * 1000) >= 30;
}

function limitReached(res, message) {
  res.setHeader('Retry-After', '60');
  return send(res, 429, { error: message });
}

// ---------- http ----------
function send(res, code, body, type = 'application/json; charset=utf-8') {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}
const files = new Map([
  ['/', ['play.html', 'text/html']],
  ['/theme.js', ['theme.js', 'text/javascript']],
  ['/theme.css', ['theme.css', 'text/css']],
  ['/icons.svg', ['icons.svg', 'image/svg+xml']],
  ['/objects.svg', ['objects.svg', 'image/svg+xml']],
  ['/drawing.css', ['drawing.css', 'text/css']],
  ['/drawing-client.js', ['drawing-client.js', 'text/javascript']],
  ['/dub.css', ['dub.css', 'text/css']],
  ['/dub-client.js', ['dub-client.js', 'text/javascript']],
  ['/dub-host.js', ['dub-host.js', 'text/javascript']],
  ['/dub-phone.js', ['dub-phone.js', 'text/javascript']],
  ['/crowd.css', ['crowd.css', 'text/css']],
  ['/crowd-ui.js', ['crowd-ui.js', 'text/javascript']],
  ['/quiz.css', ['quiz.css', 'text/css']],
  ['/quiz-ui.js', ['quiz-ui.js', 'text/javascript']],
  ['/duel.css', ['duel.css', 'text/css']],
  ['/duel-ui.js', ['duel-ui.js', 'text/javascript']],
  ['/fake-ui.js', ['fake-ui.js', 'text/javascript']],
  ['/telephone-ui.js', ['telephone-ui.js', 'text/javascript']],
  ['/telephone.css', ['telephone.css', 'text/css']],
  ['/show-ui.js', ['show-ui.js', 'text/javascript']],
  ['/impostor-ui.js', ['impostor-ui.js', 'text/javascript']],
  ['/tower-ui.js', ['tower-ui.js', 'text/javascript']],
  ['/tower.css', ['tower.css', 'text/css']],
  ['/monster-ui.js', ['monster-ui.js', 'text/javascript']],
  ['/avatar-types.js', ['avatar-types.js', 'text/javascript']],
  ['/avatar-art.js', ['avatar-art.js', 'text/javascript']],
  ['/monster.css', ['monster.css', 'text/css']],
  ['/dictation-ui.js', ['dictation-ui.js', 'text/javascript']],
  ['/dictation.css', ['dictation.css', 'text/css']],
  ...DUB_SCENES.filter(scene => !scene.problems.length).map(scene => [`/${scene.asset.file}`, [scene.asset.file, scene.asset.type]]),
]);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const ip = clientIp(req);

  if (url.pathname === '/events') {
    const room = roomFrom(url.searchParams.get('room'));
    if (!room) {
      if (tooManyMisses(ip)) return limitReached(res, 'Слишком много попыток. Подожди минуту');
      record(`miss:${ip}`);
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
      return res.end('event: missing\ndata: {}\n\n');
    }
    return room.connect(req, res, url.searchParams.get('pid'));
  }

  // a voice take arrives as raw wav bytes, its identity travels in a header so it never lands in a url
  if (url.pathname === '/api/dubTake' && req.method === 'POST') {
    if (req.headers['content-type']?.split(';')[0] !== 'audio/wav') return send(res, 415, { error: 'Ожидается запись в формате WAV' });
    const room = roomFrom(url.searchParams.get('room'));
    if (!room) {
      if (tooManyMisses(ip)) return limitReached(res, 'Слишком много попыток. Подожди минуту');
      record(`miss:${ip}`);
      return send(res, 404, { error: 'Нет такой комнаты', missing: true });
    }
    const pid = String(req.headers['x-shumy-pid'] || '');
    const chunks = [];
    let size = 0;
    let tooLarge = false;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > TAKE_MAX_BYTES) tooLarge = true;
      else chunks.push(chunk);
    });
    req.on('end', () => {
      if (tooLarge) return send(res, 413, { error: 'Запись слишком большая. Запиши ещё раз или отправь текст', retry: true });
      const meta = {
        slot: url.searchParams.get('slot'),
        round: url.searchParams.get('round'),
        v: Number(url.searchParams.get('v')),
        actionId: url.searchParams.get('actionId'),
      };
      const out = room.submitTake(pid, meta, Buffer.concat(chunks));
      send(res, out.status ?? (out.error ? 400 : 200), out);
      room.setOnline(pid);
    });
    return;
  }

  if (url.pathname.startsWith('/media/dub/') && req.method === 'GET') {
    const room = roomFrom(url.searchParams.get('room'));
    const data = room?.take(url.pathname.slice(11), req, String(req.headers['x-shumy-pid'] || ''));
    if (!data) return send(res, 404, 'not found', 'text/plain');
    res.writeHead(200, { 'Content-Type': 'audio/wav', 'Content-Length': data.length, 'Cache-Control': 'private, no-store' });
    return res.end(data);
  }

  if (url.pathname.startsWith('/api/') && req.method === 'POST') {
    const action = url.pathname.slice(5);
    if (req.headers['content-type']?.split(';')[0] !== 'application/json') return send(res, 415, { error: 'Ожидается JSON' });
    let raw = '';
    req.on('data', d => { raw += d; if (raw.length > 1e4) req.destroy(); });
    req.on('end', () => {
      let body = {};
      try { body = JSON.parse(raw || '{}'); } catch { return send(res, 400, { error: 'bad json' }); }
      if (!body || typeof body !== 'object' || Array.isArray(body)) return send(res, 400, { error: 'bad json' });
      const room = roomFrom(body.room);
      if (!room) {
        if (tooManyMisses(ip)) return limitReached(res, 'Слишком много попыток. Подожди минуту');
        record(`miss:${ip}`);
        return send(res, 404, { error: 'Нет такой комнаты', missing: true });
      }
      if (!Object.hasOwn(room.actions, action)) return send(res, 404, { error: 'unknown action' });
      if (hostActions.has(action) && !isHost(req, room)) return send(res, 401, { error: 'Это действие доступно только ведущему комнаты' });
      const out = room.actions[action](body);
      room.lastActive = Date.now();
      send(res, out.status ?? (out.error ? 400 : 200), out);
      if (body.pid) room.setOnline(body.pid);
    });
    return;
  }

  if (url.pathname === '/qr.svg') {
    const room = roomFrom(url.searchParams.get('room'));
    if (!room) return send(res, 404, 'not found', 'text/plain');
    const joinUrl = new URL(JOIN_URL);
    joinUrl.searchParams.set('room', room.code);
    const language = url.searchParams.get('lang');
    if (['ru', 'en', 'kk'].includes(language)) joinUrl.searchParams.set('lang', language);
    const svg = renderQrSvg(joinUrl.href);
    return send(res, 200, svg, 'image/svg+xml');
  }

  // the tv page always belongs to a room: reuse the host's live room or open a new one
  if (url.pathname === '/tv') {
    const asked = roomFrom(url.searchParams.get('room'));
    if (asked && isHost(req, asked)) return send(res, 200, fs.readFileSync(path.join(__dirname, 'public', 'tv.html')), 'text/html; charset=utf-8');
    const own = [...rooms.values()].reverse().find(room => isHost(req, room));
    let room = own;
    if (!room) {
      if (tooManyCreations(ip)) {
        res.setHeader('Retry-After', '60');
        return send(res, 429, 'Слишком много новых комнат. Подожди минуту и обнови страницу.', 'text/plain; charset=utf-8');
      }
      record(`create:${ip}`);
      room = newRoom();
      res.setHeader('Set-Cookie', `kto_host_${room.code}=${room.hostKey}; Path=${COOKIE_PATH}; Max-Age=${ROOM_MAX_MS / 1000}; HttpOnly; SameSite=Lax${publicUrl ? '; Secure' : ''}`);
    }
    url.searchParams.set('room', room.code);
    res.writeHead(303, { Location: `tv?${url.searchParams}`, 'Cache-Control': 'no-store' });
    return res.end();
  }

  const file = files.get(url.pathname);
  if (file) {
    const type = file[1].startsWith('text/') || file[1].includes('javascript') || file[1].includes('svg+xml')
      ? `${file[1]}; charset=utf-8`
      : file[1];
    return send(res, 200, fs.readFileSync(path.join(__dirname, 'public', file[0])), type);
  }
  send(res, 404, 'not found', 'text/plain');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n  Кто из нас — сервер запущен\n');
  console.log(`  ТВ (открой на ноутбуке у телевизора):  http://localhost:${PORT}/tv`);
  console.log('  Каждое открытие экрана ведущего создаёт свою комнату с кодом');
  console.log(`  Телефоны входят по коду или QR:        ${JOIN_URL}\n`);
});
