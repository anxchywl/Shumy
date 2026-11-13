const { randomUUID } = require('crypto');

const STAKES = [50, 100, 200];
const QUESTIONS = [
  { id: 'octopus', text: { ru: 'Сколько сердец у осьминога?', en: 'How many hearts does an octopus have?', kk: 'Сегізаяқтың неше жүрегі бар?' }, options: [
    { ru: 'Одно', en: 'One', kk: 'Бір' }, { ru: 'Два', en: 'Two', kk: 'Екі' }, { ru: 'Три', en: 'Three', kk: 'Үш' }, { ru: 'Четыре', en: 'Four', kk: 'Төрт' },
  ], correct: 2 },
  { id: 'venus', text: { ru: 'Какая планета вращается вокруг оси дольше, чем вокруг Солнца?', en: 'Which planet takes longer to spin once than to orbit the Sun?', kk: 'Қай ғаламшар өз осінен Күнді айналғаннан баяу айналады?' }, options: [
    { ru: 'Марс', en: 'Mars', kk: 'Марс' }, { ru: 'Венера', en: 'Venus', kk: 'Шолпан' }, { ru: 'Юпитер', en: 'Jupiter', kk: 'Юпитер' }, { ru: 'Меркурий', en: 'Mercury', kk: 'Меркурий' },
  ], correct: 1 },
  { id: 'bones', text: { ru: 'У кого больше костей: у младенца или взрослого?', en: 'Who has more bones: a baby or an adult?', kk: 'Сүйек кімде көп: нәрестеде ме, ересекте ме?' }, options: [
    { ru: 'У младенца', en: 'A baby', kk: 'Нәрестеде' }, { ru: 'У взрослого', en: 'An adult', kk: 'Ересекте' }, { ru: 'Поровну', en: 'The same', kk: 'Бірдей' },
  ], correct: 0 },
];

function validateQuestions(questions) {
  const ids = new Set();
  for (const question of questions) {
    if (!/^[a-z0-9-]+$/.test(question.id) || ids.has(question.id)) throw new Error('Некорректный id квиза');
    ids.add(question.id);
    if (!Array.isArray(question.options) || question.options.length < 2 || question.options.length > 5 || !Number.isInteger(question.correct) || question.correct < 0 || question.correct >= question.options.length) throw new Error(`Вопрос ${question.id}: некорректный правильный ответ`);
    for (const item of [question.text, ...question.options]) {
      if (!['ru', 'en', 'kk'].every(locale => typeof item[locale] === 'string' && item[locale].trim())) throw new Error(`Вопрос ${question.id}: отсутствует перевод`);
    }
  }
}
validateQuestions(QUESTIONS);

function createQuiz({ players, changed, introMs = 12000, answerMs = 30000 }) {
  let round = null;
  let deck = [...QUESTIONS];
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
    if (present.length < 2) return error('Для квиза нужны два игрока на связи');
    stop();
    if (!deck.length) deck = [...QUESTIONS];
    const question = deck.splice(Math.floor(Math.random() * deck.length), 1)[0];
    round = {
      id: randomUUID(), number: ++number, version: 1, phase: 'intro', question,
      participants: new Set(present.map(player => player.id)), submissions: new Map(),
      actions: new Map(), result: null, timer: null, endsAt: 0,
    };
    arm(introMs, toAnswer);
    changed();
    return { ok: true };
  }
  function toAnswer() {
    if (!round || round.phase !== 'intro') return;
    round.phase = 'answer';
    round.version += 1;
    arm(answerMs, toResult);
    changed();
  }
  function toResult() {
    if (!round || round.phase !== 'answer') return;
    clearTimeout(round.timer);
    round.endsAt = 0;
    const counts = round.question.options.map(() => 0);
    const gained = {};
    for (const [id, submission] of round.submissions) {
      counts[submission.answer] += 1;
      const points = STAKES[submission.confidence] * (submission.answer === round.question.correct ? 1 : -1);
      gained[id] = points;
      const player = players.get(id);
      if (player) player.score += points;
    }
    round.result = { correct: round.question.correct, counts, gained, answered: round.submissions.size };
    round.phase = 'result';
    round.version += 1;
    changed();
  }
  function submit(playerId, body) {
    if (!round || body.round !== round.id) return error('Раунд изменился');
    if (!playerId || !round.participants.has(playerId)) return error('Ты зритель этого раунда', 403);
    if (typeof body.actionId !== 'string' || !/^[a-f0-9-]{32,36}$/.test(body.actionId)) return error('Некорректный запрос', 400);
    const key = `${playerId}:${body.actionId}`;
    if (round.actions.has(key)) return round.actions.get(key);
    if (body.v !== round.version || round.phase !== 'answer' || Date.now() >= round.endsAt) return error('Ответы уже закрыты');
    if (!Number.isInteger(body.answer) || body.answer < 0 || body.answer >= round.question.options.length || !Number.isInteger(body.confidence) || body.confidence < 0 || body.confidence >= STAKES.length) return error('Выбери ответ и уверенность', 400);
    round.submissions.set(playerId, { answer: body.answer, confidence: body.confidence });
    const result = { ok: true };
    round.actions.set(key, result);
    changed();
    return result;
  }
  const hostActions = {
    quizAdvance(body) {
      if (!round || body.round !== round.id || body.v !== round.version) return error('Экран устарел');
      if (round.phase === 'intro') toAnswer();
      else if (round.phase === 'answer') toResult();
      else return error('Сейчас переход недоступен');
      return { ok: true };
    },
    quizNext(body) {
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
      answered: round.submissions.size, eligible: round.participants.size,
      stakes: STAKES, result: round.result,
    };
  }
  function privateState(id) {
    if (!round || !id) return null;
    return { audience: !round.participants.has(id), submission: round.submissions.get(id) ?? null };
  }
  return { start, stop, playerActions: { quizSubmit: submit }, hostActions, publicState, privateState };
}

module.exports = { createQuiz, validateQuestions };
