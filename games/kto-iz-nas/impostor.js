const { randomUUID } = require('crypto');

const PAIRS = [
  { group: { ru: 'пляж', en: 'beach', kk: 'жағажай' }, impostor: { ru: 'бассейн', en: 'pool', kk: 'бассейн' } },
  { group: { ru: 'поезд', en: 'train', kk: 'пойыз' }, impostor: { ru: 'автобус', en: 'bus', kk: 'автобус' } },
  { group: { ru: 'кошка', en: 'cat', kk: 'мысық' }, impostor: { ru: 'собака', en: 'dog', kk: 'ит' } },
  { group: { ru: 'гора', en: 'mountain', kk: 'тау' }, impostor: { ru: 'холм', en: 'hill', kk: 'төбе' } },
];
const FALLBACK = { ru: 'Подсказка пропущена', en: 'Clue skipped', kk: 'Ишара өткізілді' };
const normalize = value => value.normalize('NFKC').toLocaleLowerCase('ru').replace(/ё/g, 'е').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
function clean(text) {
  if (typeof text !== 'string') return null;
  const value = text.replace(/[\u0000-\u001f\u007f\u2028\u2029]/g, ' ').replace(/\s+/g, ' ').trim();
  return value && value.length <= 70 && !/[<>]/.test(value) ? value : null;
}
function createImpostor({ players, changed, clueMs = 12000, voteMs = 25000, guessMs = 15000 }) {
  let round = null, number = 0, pairIndex = 0;
  const error = (message, status = 409) => ({ error: message, status });
  function stop() { if (round) { clearTimeout(round.timer); for (const table of round.tables) clearTimeout(table.timer); } round = null; }
  function armTable(table) {
    clearTimeout(table.timer);
    table.endsAt = Date.now() + clueMs;
    const id = round.id, step = table.step;
    table.timer = setTimeout(() => { if (round?.id === id && round.phase === 'clue' && table.step === step) nextClue(table, null); }, clueMs);
  }
  function arm(ms, callback) {
    clearTimeout(round.timer);
    const id = round.id, phase = round.phase;
    round.endsAt = Date.now() + ms;
    round.timer = setTimeout(() => { if (round?.id === id && round.phase === phase) callback(); }, ms);
  }
  function start() {
    const online = [...players.values()].filter(player => player.online);
    if (online.length < 4 || online.length > 12) return error('Для «Самозванца» нужно 4–12 игроков на связи');
    stop();
    const shuffled = [...online];
    for (let index = shuffled.length - 1; index > 0; index--) { const other = Math.floor(Math.random() * (index + 1)); [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]]; }
    const groups = shuffled.length >= 8 ? [shuffled.slice(0, Math.ceil(shuffled.length / 2)), shuffled.slice(Math.ceil(shuffled.length / 2))] : [shuffled];
    const tables = groups.map((group, index) => {
      const pair = PAIRS[(pairIndex + index) % PAIRS.length];
      return { id: randomUUID(), people: group.map(person => ({ id: person.id, name: person.name })), pair,
        impostor: group[Math.floor(Math.random() * group.length)].id, step: 0, version: 1, clues: [], hidden: new Set(),
        votes: new Map(), guess: null, guessCorrect: null, endsAt: 0, timer: null, result: null };
    });
    pairIndex = (pairIndex + groups.length) % PAIRS.length;
    round = { id: randomUUID(), number: ++number, phase: 'clue', version: 1, tables, actions: new Map(), endsAt: 0, timer: null };
    for (const table of tables) armTable(table);
    changed();
    return { ok: true };
  }
  function nextClue(table, text) {
    if (!round || round.phase !== 'clue' || table.step >= table.people.length) return;
    clearTimeout(table.timer);
    table.clues.push({ by: table.people[table.step].name, author: table.people[table.step].id, text: text ?? FALLBACK, fallback: !text });
    table.step += 1; table.version += 1;
    if (table.step < table.people.length) armTable(table); else table.endsAt = 0;
    if (round.tables.every(item => item.step >= item.people.length)) { round.phase = 'review'; round.version += 1; }
    changed();
  }
  function toVote() {
    if (!round || round.phase !== 'review') return;
    round.phase = 'vote'; round.version += 1; arm(voteMs, toReveal); changed();
  }
  function toReveal() {
    if (!round || round.phase !== 'vote') return;
    clearTimeout(round.timer);
    round.phase = 'reveal'; round.version += 1;
    for (const table of round.tables) {
      const counts = Object.fromEntries(table.people.map(person => [person.id, 0]));
      for (const choice of table.votes.values()) if (choice) counts[choice] += 1;
      const high = Math.max(0, ...Object.values(counts));
      table.result = { counts, suspects: high ? table.people.filter(person => counts[person.id] === high).map(person => person.id) : [], votes: table.votes.size };
      for (const [voter, choice] of table.votes) if (choice === table.impostor && players.get(voter)) players.get(voter).score += 100;
      if (high && !table.result.suspects.includes(table.impostor) && players.get(table.impostor)) players.get(table.impostor).score += 100;
    }
    arm(guessMs, toResult); changed();
  }
  function toResult() {
    if (!round || round.phase !== 'reveal') return;
    clearTimeout(round.timer); round.endsAt = 0; round.phase = 'result'; round.version += 1; changed();
  }
  function check(id, body, phase) {
    if (!round || body.round !== round.id) return error('Раунд изменился');
    if (!/^[a-f0-9-]{32,36}$/.test(body.actionId ?? '')) return error('Некорректный запрос', 400);
    const previous = round.actions.get(`${id}:${body.actionId}`);
    if (previous) return previous;
    if (round.phase !== phase || body.v !== round.version) return error('Этот шаг уже закончился');
    const table = round.tables.find(item => item.people.some(person => person.id === id));
    if (!table) return error('Ты зритель этого раунда', 403);
    return table;
  }
  function remember(id, body, result) { round.actions.set(`${id}:${body.actionId}`, result); return result; }
  const playerActions = {
    impostorClue(id, body) {
      const table = check(id, body, 'clue'); if (!table || table.error || table.ok) return table;
      if (table.people[table.step]?.id !== id) return error('Сейчас очередь другого игрока', 403);
      if (body.step !== table.step || body.tableVersion !== table.version || Date.now() >= table.endsAt) return error('Время подсказки вышло');
      const text = body.skip === true ? null : clean(body.text);
      if (body.skip !== true && !text) return error('Напиши подсказку до 70 знаков', 400);
      const result = remember(id, body, { ok: true }); nextClue(table, text); return result;
    },
    impostorVote(id, body) {
      const table = check(id, body, 'vote'); if (!table || table.error || table.ok) return table;
      if (Date.now() >= round.endsAt) return error('Голосование закрыто');
      if (body.target !== null && (!table.people.some(person => person.id === body.target) || body.target === id)) return error('Выбери другого игрока за своим столом', 400);
      table.votes.set(id, body.target);
      const result = remember(id, body, { ok: true }); changed(); return result;
    },
    impostorGuess(id, body) {
      const table = check(id, body, 'reveal'); if (!table || table.error || table.ok) return table;
      if (id !== table.impostor) return error('Только самозванец угадывает тему', 403);
      if (Date.now() >= round.endsAt || table.guess !== null) return error('Время догадки вышло');
      const guess = clean(body.text);
      if (!guess) return error('Введи короткую догадку', 400);
      table.guess = guess;
      table.guessCorrect = ['ru', 'en', 'kk'].some(locale => normalize(guess) === normalize(table.pair.group[locale]));
      if (table.guessCorrect && players.get(id)) players.get(id).score += 100;
      const result = remember(id, body, { ok: true, correct: table.guessCorrect }); changed(); return result;
    },
  };
  const hostActions = {
    impostorAdvance(body) {
      if (!round || round.id !== body.round || round.version !== body.v) return error('Экран устарел');
      if (round.phase === 'clue') { for (const table of round.tables) if (table.step < table.people.length) nextClue(table, null); }
      else if (round.phase === 'review') toVote(); else if (round.phase === 'vote') toReveal(); else if (round.phase === 'reveal') toResult(); else return error('Сейчас переход недоступен');
      return { ok: true };
    },
    impostorHide(body) {
      if (!round || round.id !== body.round || round.version !== body.v || round.phase !== 'review') return error('Подсказки уже показаны');
      const table = round.tables.find(item => item.id === body.table);
      if (!table || !Number.isInteger(body.index) || !table.clues[body.index] || typeof body.hidden !== 'boolean') return error('Нет такой подсказки', 400);
      if (body.hidden) table.hidden.add(body.index); else table.hidden.delete(body.index);
      changed(); return { ok: true };
    },
    impostorNext(body) {
      if (!round || round.id !== body.round || round.version !== body.v || round.phase !== 'result') return error('Сначала закончи раунд');
      return start();
    },
  };
  function publicState() {
    if (!round) return null;
    return { id: round.id, number: round.number, phase: round.phase, version: round.version, remainingMs: Math.max(0, round.endsAt - Date.now()),
      tables: round.tables.map((table, index) => ({ id: table.id, index, people: table.people, turn: round.phase === 'clue' ? table.people[table.step]?.name ?? null : null,
        step: table.step, total: table.people.length, clueRemainingMs: Math.max(0, table.endsAt - Date.now()),
        clues: ['vote', 'reveal', 'result'].includes(round.phase) ? table.clues.map((clue, clueIndex) => ({ by: clue.by, text: table.hidden.has(clueIndex) ? FALLBACK : clue.text })) : null,
        voters: round.phase === 'vote' ? table.votes.size : null,
        impostor: ['reveal', 'result'].includes(round.phase) ? table.impostor : null,
        result: ['reveal', 'result'].includes(round.phase) ? table.result : null,
        groupWord: round.phase === 'result' ? table.pair.group : null,
        impostorWord: round.phase === 'result' ? table.pair.impostor : null,
        guess: round.phase === 'result' ? table.guess : null,
        guessCorrect: round.phase === 'result' ? table.guessCorrect : null })) };
  }
  function privateState(id) {
    if (!round || !id) return null;
    const table = round.tables.find(item => item.people.some(person => person.id === id));
    if (!table) return { audience: true };
    return { audience: false, table: table.id, impostor: ['reveal', 'result'].includes(round.phase) && table.impostor === id,
      prompt: round.phase !== 'result' ? (table.impostor === id ? table.pair.impostor : table.pair.group) : null,
      turn: round.phase === 'clue' && table.people[table.step]?.id === id, step: table.step, tableVersion: table.version,
      voted: table.votes.has(id), vote: table.votes.get(id), guessed: table.guess !== null };
  }
  function hostState() {
    if (round?.phase !== 'review') return null;
    return round.tables.map(table => ({ id: table.id, clues: table.clues.map((clue, index) => ({ index, by: clue.by, text: clue.text, hidden: table.hidden.has(index), fallback: clue.fallback })) }));
  }
  return { start, stop, playerActions, hostActions, publicState, privateState, hostState };
}
module.exports = { createImpostor, clean };
