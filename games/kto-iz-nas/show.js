const { randomUUID } = require('crypto');

const WORDS = [
  { id: 'umbrella', text: { ru: 'зонт', en: 'umbrella', kk: 'қолшатыр' }, answers: ['зонт', 'зонтик', 'umbrella', 'қолшатыр'] },
  { id: 'bicycle', text: { ru: 'велосипед', en: 'bicycle', kk: 'велосипед' }, answers: ['велосипед', 'велик', 'bicycle', 'bike'] },
  { id: 'penguin', text: { ru: 'пингвин', en: 'penguin', kk: 'пингвин' }, answers: ['пингвин', 'penguin'] },
  { id: 'airplane', text: { ru: 'самолёт', en: 'airplane', kk: 'ұшақ' }, answers: ['самолёт', 'самолет', 'самолётик', 'airplane', 'plane', 'ұшақ'] },
];
const normalize = value => value.normalize('NFKC').toLocaleLowerCase('ru').replace(/ё/g, 'е').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
function createShow({ players, changed, volunteerMs = 15000, actMs = 45000 }) {
  let round = null;
  let number = 0;
  let lastActor = null;
  let deck = [...WORDS];
  const error = (message, status = 409) => ({ error: message, status });
  function stop() { clearTimeout(round?.timer); round = null; }
  function arm(ms, callback) {
    clearTimeout(round.timer);
    const id = round.id, phase = round.phase;
    round.endsAt = Date.now() + ms;
    round.timer = setTimeout(() => { if (round?.id === id && round.phase === phase) callback(); }, ms);
  }
  function start() {
    const online = [...players.values()].filter(player => player.online);
    if (online.length < 3 || online.length > 20) return error('Для «Покажи, не говори» нужно 3–20 игроков на связи');
    stop();
    if (!deck.length) deck = [...WORDS];
    const word = deck.splice(Math.floor(Math.random() * deck.length), 1)[0];
    round = { id: randomUUID(), number: ++number, version: 1, phase: 'volunteer', word,
      participants: new Set(online.map(player => player.id)), volunteers: [], actor: null, actorName: '',
      guesses: 0, solved: new Set(), actions: new Map(), lastGuess: new Map(), endsAt: 0, timer: null };
    arm(volunteerMs, chooseActor);
    changed();
    return { ok: true };
  }
  function chooseActor() {
    if (!round || round.phase !== 'volunteer') return;
    clearTimeout(round.timer);
    const eligible = round.volunteers.filter(id => players.get(id)?.online);
    const selected = eligible.find(id => id !== lastActor) ?? eligible[0];
    if (!selected) { round.phase = 'result'; round.version += 1; round.endsAt = 0; changed(); return; }
    round.actor = selected; round.actorName = players.get(selected)?.name ?? '';
    lastActor = selected;
    round.phase = 'act'; round.version += 1;
    arm(actMs, finish);
    changed();
  }
  function finish() {
    if (!round || round.phase !== 'act') return;
    clearTimeout(round.timer); round.endsAt = 0; round.phase = 'result'; round.version += 1; changed();
  }
  function check(id, body, phase) {
    if (!round || body.round !== round.id) return error('Раунд изменился');
    if (!id || !round.participants.has(id)) return error('Ты зритель этого раунда', 403);
    if (!/^[a-f0-9-]{32,36}$/.test(body.actionId ?? '')) return error('Некорректный запрос', 400);
    const previous = round.actions.get(`${id}:${body.actionId}`);
    if (previous) return previous;
    if (round.phase !== phase || body.v !== round.version || Date.now() >= round.endsAt) return error('Время этого шага вышло');
    return null;
  }
  function remember(id, body, result) { round.actions.set(`${id}:${body.actionId}`, result); return result; }
  const playerActions = {
    showVolunteer(id, body) {
      const refusal = check(id, body, 'volunteer'); if (refusal) return refusal;
      if (!round.volunteers.includes(id)) round.volunteers.push(id);
      const result = remember(id, body, { ok: true }); changed(); return result;
    },
    showGuess(id, body) {
      const refusal = check(id, body, 'act'); if (refusal) return refusal;
      if (id === round.actor) return error('Актёр не угадывает', 403);
      if (round.solved.has(id)) return error('Ты уже угадал');
      if (typeof body.text !== 'string' || body.text.length > 60 || /[<>\u0000-\u001f]/.test(body.text)) return error('Введи короткую догадку', 400);
      if (Date.now() - (round.lastGuess.get(id) ?? 0) < 600) return error('Подожди секунду');
      round.lastGuess.set(id, Date.now());
      const answer = normalize(body.text);
      if (!answer) return error('Введи догадку', 400);
      const correct = round.word.answers.some(value => normalize(value) === answer);
      round.guesses += 1;
      if (correct) {
        round.solved.add(id);
        const player = players.get(id); if (player) player.score += 100;
        const actor = players.get(round.actor); if (actor) actor.score += 20;
      }
      const result = remember(id, body, { ok: true, correct }); changed(); return result;
    },
    showFinish(id, body) {
      const refusal = check(id, body, 'act'); if (refusal) return refusal;
      if (id !== round.actor) return error('Только актёр завершает ход', 403);
      const result = remember(id, body, { ok: true }); finish(); return result;
    },
  };
  const hostActions = {
    showAdvance(body) {
      if (!round || round.id !== body.round || round.version !== body.v) return error('Экран устарел');
      if (round.phase === 'volunteer') chooseActor(); else if (round.phase === 'act') finish(); else return error('Сейчас переход недоступен');
      return { ok: true };
    },
    showNext(body) {
      if (!round || round.id !== body.round || round.version !== body.v || round.phase !== 'result') return error('Сначала закончи раунд');
      return start();
    },
  };
  function publicState() {
    if (!round) return null;
    return { id: round.id, number: round.number, phase: round.phase, version: round.version,
      volunteers: round.volunteers.length, actorName: round.actorName, guesses: round.guesses, correct: round.solved.size,
      word: round.phase === 'result' && round.actor ? round.word.text : null,
      solvers: round.phase === 'result' ? [...round.solved].map(id => players.get(id)?.name ?? '') : null,
      remainingMs: Math.max(0, round.endsAt - Date.now()) };
  }
  function privateState(id) {
    if (!round || !id) return null;
    return { audience: !round.participants.has(id), volunteered: round.volunteers.includes(id), actor: round.actor === id,
      solved: round.solved.has(id), word: round.actor === id && round.phase === 'act' ? round.word.text : null,
      illustration: round.actor === id && round.phase === 'act' ? round.word.id : null };
  }
  return { start, stop, playerActions, hostActions, publicState, privateState };
}
module.exports = { createShow };
