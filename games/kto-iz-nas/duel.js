const { randomUUID } = require('crypto');

const PROMPTS = [
  { id: 'elevator', text: { ru: 'Лифт застрял на один час. Что ты объявишь пассажирам?', en: 'The elevator is stuck for an hour. What do you announce?', kk: 'Лифт бір сағатқа тоқтады. Жолаушыларға не айтасың?' }, fallback: [
    { ru: 'Объявляю внеплановый клуб по интересам.', en: 'Welcome to our surprise social club.', kk: 'Күтпеген танысу клубына қош келдіңіздер.' },
    { ru: 'Это теперь самый маленький кинотеатр города.', en: 'This is now the city’s smallest cinema.', kk: 'Бұл енді қаланың ең кішкентай кинотеатры.' },
  ] },
  { id: 'fridge', text: { ru: 'Холодильник просит выходной. Чем его уговорить?', en: 'Your fridge asks for a day off. How do you persuade it?', kk: 'Тоңазытқыш демалыс сұрады. Оны қалай көндіресің?' }, fallback: [
    { ru: 'Обещаю месяц без открытой дверцы.', en: 'I promise a month without leaving the door open.', kk: 'Есігін ашық қалдырмаймын деп уәде беремін.' },
    { ru: 'Покажу фотографии других холодильников на море.', en: 'I will show it photos of fridges at the beach.', kk: 'Оған теңіздегі тоңазытқыштардың суретін көрсетемін.' },
  ] },
  { id: 'moon', text: { ru: 'Ты стал экскурсоводом на Луне. Какая первая остановка?', en: 'You guide a tour on the Moon. What is the first stop?', kk: 'Айда экскурсовод болдың. Алғашқы аялдама қайда?' }, fallback: [
    { ru: 'Площадка для очень длинных прыжков.', en: 'The very long jump practice area.', kk: 'Ұзын секіруге арналған алаң.' },
    { ru: 'Место, где потеряли первый носок.', en: 'The place where the first sock was lost.', kk: 'Алғашқы шұлық жоғалған жер.' },
  ] },
];

function validatePrompts(prompts) {
  const ids = new Set();
  for (const prompt of prompts) {
    if (!/^[a-z0-9-]+$/.test(prompt.id) || ids.has(prompt.id)) throw new Error('Некорректный id дуэли');
    ids.add(prompt.id);
    if (prompt.fallback?.length !== 2 || ![prompt.text, ...prompt.fallback].every(value => ['ru', 'en', 'kk'].every(locale => typeof value?.[locale] === 'string' && value[locale].trim()))) throw new Error(`Дуэль ${prompt.id}: нужен текст и два запасных ответа`);
  }
}
validatePrompts(PROMPTS);

function cleanAnswer(value) {
  if (typeof value !== 'string') return null;
  const answer = value.replace(/[\u0000-\u001f\u007f\u2028\u2029]/g, ' ').replace(/\s+/g, ' ').trim();
  return answer && answer.length <= 90 && !/[<>]/.test(answer) ? answer : null;
}

function createDuel({ players, changed, volunteerMs = 20000, composeMs = 30000, voteMs = 20000 }) {
  let round = null;
  let deck = [...PROMPTS];
  let number = 0;
  const error = (message, status = 409) => ({ error: message, status, phase: round?.phase ?? 'lobby', version: round?.version ?? 0 });
  const stop = () => { clearTimeout(round?.timer); round = null; };
  function arm(ms, callback) {
    clearTimeout(round.timer);
    const current = round;
    round.endsAt = Date.now() + ms;
    round.timer = setTimeout(() => { if (round === current) callback(); }, ms);
  }
  function start() {
    const present = [...players.values()].filter(player => player.online);
    if (present.length < 3) return error('Для дуэли нужны три игрока на связи');
    stop();
    if (!deck.length) deck = [...PROMPTS];
    const prompt = deck.splice(Math.floor(Math.random() * deck.length), 1)[0];
    round = {
      id: randomUUID(), number: ++number, version: 1, phase: 'volunteer', prompt,
      participants: new Set(present.map(player => player.id)), volunteers: [], contestants: [], contestantNames: [], answers: [null, null],
      hidden: [false, false], votes: new Map(), actions: new Map(), result: null, timer: null, endsAt: 0,
    };
    arm(volunteerMs, toCompose);
    changed();
    return { ok: true };
  }
  function toCompose() {
    if (!round || round.phase !== 'volunteer') return;
    const eligible = round.volunteers.filter(id => players.get(id)?.online);
    round.contestants = eligible.slice(0, 2);
    round.contestantNames = round.contestants.map(id => players.get(id)?.name ?? '');
    if (!round.contestants.length) return toResult();
    round.phase = 'compose';
    round.version += 1;
    arm(composeMs, toReview);
    changed();
  }
  function toReview() {
    if (!round || round.phase !== 'compose') return;
    clearTimeout(round.timer);
    round.endsAt = 0;
    round.phase = 'review';
    round.version += 1;
    changed();
  }
  function toVote() {
    if (!round || round.phase !== 'review') return;
    round.phase = 'vote';
    round.version += 1;
    arm(voteMs, toResult);
    changed();
  }
  function toResult() {
    if (!round || round.phase === 'result') return;
    clearTimeout(round.timer);
    round.endsAt = 0;
    const counts = [0, 0];
    for (const index of round.votes.values()) if (index !== null) counts[index] += 1;
    const maximum = Math.max(...counts);
    round.result = { counts, winners: maximum ? counts.flatMap((count, index) => count === maximum ? [index] : []) : [], noVolunteers: !round.contestants.length };
    round.phase = 'result';
    round.version += 1;
    changed();
  }
  function check(id, body, phase) {
    if (!round || body.round !== round.id) return error('Раунд изменился');
    if (!id || !round.participants.has(id)) return error('Ты зритель этого раунда', 403);
    if (typeof body.actionId !== 'string' || !/^[a-f0-9-]{32,36}$/.test(body.actionId)) return error('Некорректный запрос', 400);
    const previous = round.actions.get(`${id}:${body.actionId}`);
    if (previous) return previous;
    if (round.phase !== phase || body.v !== round.version || Date.now() >= round.endsAt) return error('Время этого шага вышло');
    return null;
  }
  function remember(id, body) {
    const result = { ok: true };
    round.actions.set(`${id}:${body.actionId}`, result);
    return result;
  }
  const playerActions = {
    duelVolunteer(id, body) {
      const refusal = check(id, body, 'volunteer');
      if (refusal) return refusal;
      if (!round.volunteers.includes(id)) round.volunteers.push(id);
      const result = remember(id, body);
      changed();
      if (round.volunteers.filter(playerId => players.get(playerId)?.online).length >= 2) {
        const current = round;
        setTimeout(() => { if (round === current && round.phase === 'volunteer') toCompose(); }, 600);
      }
      return result;
    },
    duelSubmit(id, body) {
      const refusal = check(id, body, 'compose');
      if (refusal) return refusal;
      const index = round.contestants.indexOf(id);
      if (index < 0) return error('Ответить могут только участники дуэли', 403);
      if (round.answers[index]) return error('Ответ уже принят');
      const answer = cleanAnswer(body.text);
      if (!answer) return error('Напиши ответ до 90 знаков без разметки', 400);
      round.answers[index] = answer;
      const result = remember(id, body);
      changed();
      if (round.contestants.every((_, position) => round.answers[position])) {
        const current = round;
        setTimeout(() => { if (round === current && round.phase === 'compose') toReview(); }, 600);
      }
      return result;
    },
    duelVote(id, body) {
      const refusal = check(id, body, 'vote');
      if (refusal) return refusal;
      if (round.contestants.includes(id)) return error('Участники дуэли не голосуют', 403);
      if (body.choice !== null && body.choice !== 0 && body.choice !== 1) return error('Нет такого ответа', 400);
      round.votes.set(id, body.choice);
      const result = remember(id, body);
      changed();
      return result;
    },
  };
  const hostActions = {
    duelAdvance(body) {
      if (!round || body.round !== round.id || body.v !== round.version) return error('Экран устарел');
      if (round.phase === 'volunteer') toCompose();
      else if (round.phase === 'compose') toReview();
      else if (round.phase === 'review') toVote();
      else if (round.phase === 'vote') toResult();
      else return error('Сейчас переход недоступен');
      return { ok: true };
    },
    duelHide(body) {
      if (!round || body.round !== round.id || body.v !== round.version || !['review', 'vote', 'result'].includes(round.phase)) return error('Сейчас нельзя скрыть ответ');
      if (body.index !== 0 && body.index !== 1 || typeof body.hidden !== 'boolean') return error('Нет такого ответа', 400);
      round.hidden[body.index] = body.hidden;
      changed();
      return { ok: true };
    },
    duelNext(body) {
      if (!round || body.round !== round.id || body.v !== round.version || round.phase !== 'result') return error('Сначала закончи раунд');
      return start();
    },
  };
  function entries(includeAuthors) {
    return [0, 1].map(index => ({
      index, text: round.hidden[index] || !round.answers[index] ? round.prompt.fallback[index] : round.answers[index],
      fallback: round.hidden[index] || !round.answers[index],
      author: includeAuthors && !round.hidden[index] && round.answers[index] && round.contestants[index] ? round.contestantNames[index] : null,
    }));
  }
  function publicState() {
    if (!round) return null;
    return {
      id: round.id, number: round.number, version: round.version, phase: round.phase,
      prompt: round.prompt.text, volunteers: round.volunteers.length, submitted: round.answers.filter(Boolean).length,
      slots: round.contestants.length, deadlineInMs: Math.max(0, round.endsAt - Date.now()),
      entries: ['vote', 'result'].includes(round.phase) ? entries(round.phase === 'result') : null,
      voters: round.phase === 'vote' ? round.votes.size : null, result: round.result,
    };
  }
  function privateState(id) {
    if (!round || !id) return null;
    const index = round.contestants.indexOf(id);
    return { audience: !round.participants.has(id), volunteered: round.volunteers.includes(id), contestant: index >= 0, slot: index, submitted: index >= 0 && Boolean(round.answers[index]), vote: round.votes.get(id) };
  }
  function hostState() {
    return round?.phase === 'review' ? { entries: entries(false), original: [...round.answers], hidden: [...round.hidden] } : null;
  }
  return { start, stop, playerActions, hostActions, publicState, privateState, hostState };
}

module.exports = { createDuel, validatePrompts, cleanAnswer };
