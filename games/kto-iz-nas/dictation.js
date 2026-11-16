const { randomUUID } = require('crypto');
const { normalize, validSegment } = require('./drawing');

const CARDS = [
  ['кот', 'cat', 'мысық', 'кошка'], ['снеговик', 'snowman', 'аққала'],
  ['робот', 'robot', 'робот'], ['жираф', 'giraffe', 'керік'],
  ['осьминог', 'octopus', 'сегізаяқ'], ['ракета', 'rocket', 'зымыран'],
  ['велосипед', 'bicycle', 'велосипед', 'bike'], ['зонт', 'umbrella', 'қолшатыр', 'зонтик'],
  ['пингвин', 'penguin', 'пингвин'], ['кактус', 'cactus', 'кактус'],
  ['пират', 'pirate', 'теңіз қарақшысы', 'қарақшы'], ['пчела', 'bee', 'ара'],
  ['дракон', 'dragon', 'айдаһар'], ['космонавт', 'astronaut', 'ғарышкер'],
].map(([ru, en, kk, ...aliases]) => ({ word: { ru, en, kk }, answers: [ru, en, kk, ...aliases].map(normalize) }));

function shuffle(items) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function createDictation({ players, changed }) {
  let game = null;
  let directorQueue = [];
  let deck = [];
  let lastWord = null;
  const error = (message, status = 409) => ({ error: message, status });
  function clearTimers() {
    if (!game) return;
    clearTimeout(game.timer);
    clearTimeout(game.reconnectTimer);
    game.timer = null;
    game.reconnectTimer = null;
  }
  function stop() { clearTimers(); game = null; directorQueue = []; deck = []; lastWord = null; }
  function arm(ms, callback) {
    clearTimeout(game.timer);
    game.endsAt = Date.now() + ms;
    const id = game.id;
    game.timer = setTimeout(() => { if (game?.id === id) callback(); }, ms);
  }
  function nextCard() {
    if (!deck.length) {
      deck = shuffle(CARDS);
      if (deck.at(-1).word.ru === lastWord) [deck[0], deck[deck.length - 1]] = [deck.at(-1), deck[0]];
    }
    const card = deck.pop();
    lastWord = card.word.ru;
    return card;
  }
  function nextDirector(online) {
    const eligible = new Set(online.map(player => player.id));
    directorQueue = directorQueue.filter(id => eligible.has(id));
    if (!directorQueue.length) directorQueue = shuffle(online.map(player => player.id));
    return directorQueue.shift();
  }
  function prepareRound() {
    const online = [...players.values()].filter(player => player.online);
    if (online.length < 3) {
      game.phase = 'waiting';
      game.endsAt = 0;
      game.result = null;
      changed();
      return;
    }
    clearTimers();
    const director = nextDirector(online);
    game.id = randomUUID();
    game.phase = 'ready';
    game.director = director;
    game.card = nextCard();
    game.drawers = online.filter(player => player.id !== director).map(player => player.id);
    game.sketches = new Map(game.drawers.map(id => [id, { segments: [], budget: 240, lastInk: Date.now(), lastRequest: 0, actions: new Set() }]));
    game.totalSegments = 0;
    game.guesses = new Map();
    game.result = null;
    arm(12000, () => cancelRound());
    changed();
  }
  function start(rounds = 3) {
    if (![1, 3, 5].includes(rounds)) return error('Неверное число раундов', 400);
    if ([...players.values()].filter(player => player.online).length < 3) return error('Нужно хотя бы три игрока на связи');
    stop();
    for (const player of players.values()) player.score = 0;
    game = { id: '', number: 1, total: rounds, phase: 'waiting', timer: null, reconnectTimer: null, endsAt: 0, cancelled: 0 };
    prepareRound();
    return { ok: true };
  }
  function begin() {
    if (game.phase !== 'ready' || Date.now() >= game.endsAt) return;
    game.phase = 'draw';
    arm(60000, beginGuess);
    changed();
  }
  function beginGuess() {
    if (game.phase !== 'draw') return;
    game.phase = 'guess';
    arm(20000, reveal);
    changed();
  }
  function reveal() {
    if (game.phase !== 'guess') return;
    if (!players.get(game.director)?.online) return;
    clearTimeout(game.timer);
    const eligible = game.drawers.filter(id => players.get(id)?.online);
    const correct = game.drawers.filter(id => game.card.answers.includes(normalize(game.guesses.get(id) || '')));
    const eligibleCorrect = correct.filter(id => eligible.includes(id));
    for (const id of correct) if (players.has(id)) players.get(id).score += 1;
    const directorPoint = eligible.length > 0 && eligibleCorrect.length * 2 >= eligible.length ? 1 : 0;
    if (directorPoint && players.has(game.director)) players.get(game.director).score += 1;
    game.result = { word: game.card.word, eligible: eligible.length, correct: eligibleCorrect.length, directorPoint,
      gallery: game.drawers.map(id => ({ id, name: players.get(id)?.name ?? '', segments: game.sketches.get(id).segments,
        guess: game.guesses.get(id) ?? null, correct: correct.includes(id), counted: eligible.includes(id) })) };
    game.phase = 'result';
    game.cancelled = 0;
    game.endsAt = 0;
    changed();
  }
  function cancelRound() {
    if (!game || !['ready', 'draw', 'guess'].includes(game.phase)) return;
    clearTimers();
    game.phase = 'cancelled';
    game.endsAt = 0;
    game.cancelled += 1;
    game.result = null;
    changed();
    const id = game.id;
    game.timer = setTimeout(() => {
      if (game?.id !== id || game.phase !== 'cancelled') return;
      if (game.cancelled >= 5) { game.phase = 'waiting'; changed(); }
      else prepareRound();
    }, 2000);
  }
  function presenceChanged() {
    if (!game) return;
    if (game.phase === 'waiting') { if ([...players.values()].filter(p => p.online).length >= 3) prepareRound(); return; }
    if (!['ready', 'draw', 'guess'].includes(game.phase)) return;
    if (players.get(game.director)?.online) {
      clearTimeout(game.reconnectTimer);
      game.reconnectTimer = null;
      if (game.phase === 'guess' && Date.now() >= game.endsAt) { reveal(); return; }
    }
    else if (!game.reconnectTimer) {
      const id = game.id;
      game.reconnectTimer = setTimeout(() => { if (game?.id === id && !players.get(game.director)?.online) cancelRound(); }, 8000);
    }
    changed();
  }
  function current(body, phase) {
    return game && game.id === body.round && game.phase === phase && Date.now() < game.endsAt;
  }
  const playerActions = {
    dictationBegin(id, body) {
      if (!current(body, 'ready') || id !== game.director) return error('Начало раунда недоступно');
      begin();
      return { ok: true };
    },
    dictationInk(id, body) {
      if (!current(body, 'draw') || !game.sketches.has(id) || !players.get(id)?.online) return error('Рисование закрыто');
      const sketch = game.sketches.get(id);
      if (typeof body.actionId !== 'string' || !/^[a-f0-9-]{36}$/.test(body.actionId)) return error('Некорректный запрос', 400);
      if (sketch.actions.has(body.actionId)) return { ok: true };
      const now = Date.now();
      if (now - sketch.lastRequest < 40) return error('Слишком часто');
      sketch.budget = Math.min(240, sketch.budget + (now - sketch.lastInk) * .15);
      sketch.lastInk = now;
      if (body.clear === true) {
        if (sketch.budget < 12) return error('Подожди перед очисткой');
        sketch.budget -= 12;
        game.totalSegments -= sketch.segments.length;
        sketch.segments = [];
      } else {
        if (!Array.isArray(body.segments) || !body.segments.length || body.segments.length > 64 ||
          !body.segments.every(validSegment)) return error('Некорректный штрих', 400);
        if (sketch.budget < body.segments.length || sketch.segments.length + body.segments.length > 1200 ||
          game.totalSegments + body.segments.length > 16000) return error('Слишком много штрихов');
        sketch.budget -= body.segments.length;
        sketch.segments.push(...body.segments);
        game.totalSegments += body.segments.length;
      }
      sketch.lastRequest = now;
      sketch.actions.add(body.actionId);
      if (sketch.actions.size > 3100) sketch.actions.delete(sketch.actions.values().next().value);
      changed();
      return { ok: true };
    },
    dictationGuess(id, body) {
      if (!current(body, 'guess') || !game.drawers.includes(id) || !players.get(id)?.online) return error('Догадки закрыты');
      if (game.guesses.has(id)) return error('Догадка уже отправлена');
      if (typeof body.text !== 'string' || body.text.length > 60 || !normalize(body.text)) return error('Напиши короткую догадку', 400);
      game.guesses.set(id, body.text.trim());
      changed();
      return { ok: true };
    },
  };
  const hostActions = {
    dictationCancel(body) {
      if (!game || game.id !== body.round || !['ready', 'draw', 'guess'].includes(game.phase)) return error('Раунд уже изменился');
      cancelRound();
      return { ok: true };
    },
    dictationNext(body) {
      if (!game || game.id !== body.round || game.phase !== 'result') return error('Сначала открой результат');
      if (game.number >= game.total) { game.phase = 'final'; changed(); }
      else { game.number += 1; prepareRound(); }
      return { ok: true };
    },
    dictationRetry() {
      if (!game || game.phase !== 'waiting') return error('Повтор сейчас недоступен');
      game.cancelled = 0;
      prepareRound();
      return { ok: true };
    },
  };
  function publicState() {
    if (!game) return null;
    return { id: game.id, number: game.number, total: game.total, phase: game.phase, director: game.director,
      directorOnline: Boolean(players.get(game.director)?.online),
      drawers: game.drawers?.length ?? 0, submitted: game.guesses?.size ?? 0,
      remainingMs: Math.max(0, game.endsAt - Date.now()), result: game.result,
      scores: game.phase === 'final' ? [...players.values()].map(p => ({ id: p.id, name: p.name, score: p.score })).sort((a, b) => b.score - a.score) : null };
  }
  function privateState(id) {
    if (!game || !id) return null;
    const sketch = game.sketches?.get(id);
    return { role: id === game.director ? 'director' : sketch ? 'drawer' : 'audience',
      word: id === game.director && ['ready', 'draw', 'guess'].includes(game.phase) ? game.card.word : null,
      segments: sketch && ['draw', 'guess'].includes(game.phase) ? sketch.segments : null,
      guess: game.guesses?.has(id) ?? false };
  }
  return { start, stop, presenceChanged, playerActions, hostActions, publicState, privateState };
}

module.exports = { createDictation };
