const { randomUUID } = require('crypto');

const QUESTIONS = [
  { id: 'late', text: { ru: 'Что чаще всего задерживает тебя перед выходом?', en: 'What most often delays you before leaving?', kk: 'Шығар алдында сені көбіне не кідіртеді?' }, options: [
    { ru: 'Ищу ключи', en: 'Looking for keys', kk: 'Кілт іздеймін' },
    { ru: 'Выбираю одежду', en: 'Choosing clothes', kk: 'Киім таңдаймын' },
    { ru: 'Допиваю чай', en: 'Finishing my tea', kk: 'Шайымды ішіп бітіремін' },
    { ru: 'Ничего, я уже у двери', en: 'Nothing, I am at the door', kk: 'Ештеңе, есік алдындамын' },
  ] },
  { id: 'superpower', text: { ru: 'Какую бытовую суперсилу ты бы выбрал?', en: 'Which everyday superpower would you choose?', kk: 'Қандай тұрмыстық суперқабілетті таңдар едің?' }, options: [
    { ru: 'Посуда моется сама', en: 'Dishes wash themselves', kk: 'Ыдыс өзі жуылады' },
    { ru: 'Вещи не теряются', en: 'Nothing gets lost', kk: 'Заттар жоғалмайды' },
    { ru: 'Еда не остывает', en: 'Food stays warm', kk: 'Тамақ суымайды' },
    { ru: 'Батарея всегда полная', en: 'Battery always full', kk: 'Қуат әрқашан толық' },
  ] },
  { id: 'party', text: { ru: 'Что важнее для хорошей вечеринки?', en: 'What matters most for a good party?', kk: 'Жақсы кеш үшін ең маңыздысы не?' }, options: [
    { ru: 'Музыка', en: 'Music', kk: 'Музыка' },
    { ru: 'Еда', en: 'Food', kk: 'Тамақ' },
    { ru: 'Игры', en: 'Games', kk: 'Ойындар' },
    { ru: 'Разговоры', en: 'Conversation', kk: 'Әңгіме' },
  ] },
];

function validateQuestions(questions) {
  const ids = new Set();
  for (const question of questions) {
    if (!/^[a-z0-9-]+$/.test(question.id) || ids.has(question.id)) throw new Error('Некорректный id вопроса «Угадай зал»');
    ids.add(question.id);
    if (!question.options || question.options.length < 2 || question.options.length > 5) throw new Error(`Вопрос ${question.id}: нужно 2–5 вариантов`);
    for (const value of [question.text, ...question.options]) {
      if (!['ru', 'en', 'kk'].every(locale => typeof value[locale] === 'string' && value[locale].trim())) throw new Error(`Вопрос ${question.id}: отсутствует перевод`);
    }
  }
}
validateQuestions(QUESTIONS);

function createCrowd({ players, changed, answerMs = 25000, predictMs = 20000 }) {
  let round = null;
  let deck = [...QUESTIONS];
  let number = 0;

  const error = (message, status = 409) => ({ error: message, status, phase: round?.phase ?? 'lobby', version: round?.version ?? 0 });
  const expire = (ms, next) => {
    clearTimeout(round.timer);
    const current = round;
    round.endsAt = Date.now() + ms;
    round.timer = setTimeout(() => { if (round === current) next(); }, ms);
  };
  const stop = () => { clearTimeout(round?.timer); round = null; };
  const currentPlayers = () => [...round.participants].filter(id => players.get(id)?.online);

  function start() {
    const present = [...players.values()].filter(player => player.online);
    if (present.length < 2) return error('Для «Угадай зал» нужны два игрока на связи');
    stop();
    if (!deck.length) deck = [...QUESTIONS];
    const index = Math.floor(Math.random() * deck.length);
    const question = deck.splice(index, 1)[0];
    round = {
      id: randomUUID(), number: ++number, version: 1, phase: 'answer', question,
      participants: new Set(present.map(player => player.id)), answers: new Map(), predictions: new Map(),
      actions: new Map(), result: null, timer: null, endsAt: 0,
    };
    expire(answerMs, toPrediction);
    changed();
    return { ok: true };
  }

  function toPrediction() {
    if (!round || round.phase !== 'answer') return;
    round.phase = 'predict';
    round.version += 1;
    expire(predictMs, toResult);
    changed();
  }

  function toResult() {
    if (!round || round.phase !== 'predict') return;
    clearTimeout(round.timer);
    round.endsAt = 0;
    const counts = round.question.options.map(() => 0);
    for (const answer of round.answers.values()) counts[answer] += 1;
    const maximum = Math.max(...counts);
    const leaders = round.answers.size >= 2 && maximum > 0 ? counts.flatMap((count, index) => count === maximum ? [index] : []) : [];
    const gained = {};
    for (const [id, prediction] of round.predictions) {
      if (leaders.includes(prediction)) {
        gained[id] = 100;
        const player = players.get(id);
        if (player) player.score += 100;
      }
    }
    round.result = { counts, leaders, gained, answers: round.answers.size, predictions: round.predictions.size };
    round.phase = 'result';
    round.version += 1;
    changed();
  }

  function check(playerId, body, phase) {
    if (!round || body.round !== round.id) return error('Раунд изменился');
    if (!playerId || !round.participants.has(playerId)) return error('Ты зритель этого раунда', 403);
    if (typeof body.actionId !== 'string' || !/^[a-f0-9-]{32,36}$/.test(body.actionId)) return error('Некорректный запрос', 400);
    const previous = round.actions.get(`${playerId}:${body.actionId}`);
    if (previous) return previous;
    if (body.v !== round.version || round.phase !== phase || Date.now() >= round.endsAt) return error('Время этого шага вышло');
    return null;
  }

  function submit(map, playerId, body, phase) {
    const refusal = check(playerId, body, phase);
    if (refusal) return refusal;
    if (map.has(playerId)) return error('Выбор уже принят');
    if (!Number.isInteger(body.option) || body.option < 0 || body.option >= round.question.options.length) return error('Нет такого варианта', 400);
    map.set(playerId, body.option);
    const result = { ok: true };
    round.actions.set(`${playerId}:${body.actionId}`, result);
    changed();
    if (currentPlayers().every(id => map.has(id))) {
      const current = round;
      setTimeout(() => { if (round === current && current.phase === phase && currentPlayers().every(id => map.has(id))) (phase === 'answer' ? toPrediction : toResult)(); }, 600);
    }
    return result;
  }

  const playerActions = {
    crowdAnswer: (id, body) => submit(round?.answers, id, body, 'answer'),
    crowdPredict: (id, body) => submit(round?.predictions, id, body, 'predict'),
  };
  const hostActions = {
    crowdAdvance(body) {
      if (!round || body.round !== round.id || body.v !== round.version) return error('Экран устарел');
      if (round.phase === 'answer') toPrediction();
      else if (round.phase === 'predict') toResult();
      else return error('Сейчас переход недоступен');
      return { ok: true };
    },
    crowdNext(body) {
      if (!round || body.round !== round.id || body.v !== round.version || round.phase !== 'result') return error('Сначала закончи раунд');
      return start();
    },
  };

  function publicState() {
    if (!round) return null;
    return {
      id: round.id, number: round.number, version: round.version, phase: round.phase,
      question: round.question.text, options: round.question.options,
      deadlineInMs: Math.max(0, round.endsAt - Date.now()),
      answered: round.answers.size, predicted: round.predictions.size,
      eligible: round.participants.size,
      result: round.result,
    };
  }
  function privateState(id) {
    if (!round || !id) return null;
    return { audience: !round.participants.has(id), answer: round.answers.get(id), prediction: round.predictions.get(id) };
  }
  return { start, stop, playerActions, hostActions, publicState, privateState };
}

module.exports = { createCrowd };
