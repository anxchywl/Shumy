const { randomUUID } = require('crypto');

const WORDS = [
  { id: 'isobar', word: { ru: 'Изобара', en: 'Isobar', kk: 'Изобара' }, real: {
    ru: 'Линия, соединяющая точки с одинаковым давлением.', en: 'A line joining points of equal pressure.', kk: 'Қысымы бірдей нүктелерді қосатын сызық.',
  }, fallback: { ru: 'Прибор для измерения высоты облаков.', en: 'A device for measuring cloud height.', kk: 'Бұлт биіктігін өлшейтін құрал.' }, source: 'https://forecast.weather.gov/glossary.php?word=isobar' },
  { id: 'anemometer', word: { ru: 'Анемометр', en: 'Anemometer', kk: 'Анемометр' }, real: {
    ru: 'Прибор для измерения скорости ветра.', en: 'An instrument for measuring wind speed.', kk: 'Жел жылдамдығын өлшейтін құрал.',
  }, fallback: { ru: 'Прибор, который считает дождевые капли.', en: 'A device that counts raindrops.', kk: 'Жаңбыр тамшыларын санайтын құрал.' }, source: 'https://forecast.weather.gov/glossary.php?word=anemometer' },
  { id: 'palimpsest', word: { ru: 'Палимпсест', en: 'Palimpsest', kk: 'Палимпсест' }, real: {
    ru: 'Рукопись на материале, с которого стёрли прежний текст.', en: 'A manuscript written over an erased earlier text.', kk: 'Бұрынғы мәтіні өшіріліп, үстіне жаңасы жазылған қолжазба.',
  }, fallback: { ru: 'Письмо, которое читают только при свечах.', en: 'A letter read only by candlelight.', kk: 'Тек шам жарығында оқылатын хат.' }, source: 'https://tile.loc.gov/storage-services/master/gdc/gdcebookspublic/20/19/46/77/93/2019467793/2019467793.pdf' },
];

function validateWords(words) {
  const ids = new Set();
  for (const entry of words) {
    if (!/^[a-z0-9-]+$/.test(entry.id) || ids.has(entry.id)) throw new Error('Некорректный id слова');
    ids.add(entry.id);
    if (!entry.source?.startsWith('https://') || ![entry.word, entry.real, entry.fallback].every(value => ['ru', 'en', 'kk'].every(locale => typeof value?.[locale] === 'string' && value[locale].trim()))) throw new Error(`Слово ${entry.id}: нет определения, замены или источника`);
  }
}
validateWords(WORDS);

function clean(value) {
  if (typeof value !== 'string') return null;
  const text = value.replace(/[\u0000-\u001f\u007f\u2028\u2029]/g, ' ').replace(/\s+/g, ' ').trim();
  return text && text.length <= 110 && !/[<>]/.test(text) ? text : null;
}
function shuffle(items) {
  for (let index = items.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [items[index], items[other]] = [items[other], items[index]];
  }
  return items;
}

function createFakeDefinition({ players, changed, writeMs = 35000, voteMs = 25000 }) {
  let round = null;
  let deck = [...WORDS];
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
    if (present.length < 3 || present.length > 8) return error('Для «Фальшивого определения» нужно 3–8 игроков на связи');
    stop();
    if (!deck.length) deck = [...WORDS];
    const entry = deck.splice(Math.floor(Math.random() * deck.length), 1)[0];
    round = {
      id: randomUUID(), number: ++number, version: 1, phase: 'write', entry,
      participants: new Set(present.map(player => player.id)), submissions: new Map(), hidden: new Set(),
      choices: null, votes: new Map(), actions: new Map(), result: null, timer: null, endsAt: 0,
    };
    arm(writeMs, toReview);
    changed();
    return { ok: true };
  }
  function toReview() {
    if (!round || round.phase !== 'write') return;
    clearTimeout(round.timer);
    round.endsAt = 0;
    round.phase = 'review';
    round.version += 1;
    changed();
  }
  function toVote() {
    if (!round || round.phase !== 'review') return;
    const choices = [{ id: randomUUID(), text: round.entry.real, real: true, contributors: [] }];
    const grouped = new Map();
    const realTexts = new Set(Object.values(round.entry.real).map(text => text.toLocaleLowerCase('ru')));
    for (const [id, text] of round.submissions) {
      if (round.hidden.has(id) || realTexts.has(text.toLocaleLowerCase('ru'))) continue;
      const key = text.toLocaleLowerCase('ru');
      if (!grouped.has(key)) grouped.set(key, { id: randomUUID(), text, real: false, contributors: [] });
      grouped.get(key).contributors.push(id);
    }
    choices.push(...grouped.values());
    if (choices.length === 1) choices.push({ id: randomUUID(), text: round.entry.fallback, real: false, contributors: [] });
    round.choices = shuffle(choices);
    round.phase = 'vote';
    round.version += 1;
    arm(voteMs, toResult);
    changed();
  }
  function toResult() {
    if (!round || round.phase !== 'vote') return;
    clearTimeout(round.timer);
    round.endsAt = 0;
    const counts = Object.fromEntries(round.choices.map(choice => [choice.id, 0]));
    const gained = {};
    for (const [voter, id] of round.votes) {
      if (id === null) continue;
      counts[id] += 1;
      const choice = round.choices.find(item => item.id === id);
      if (choice.real) gained[voter] = (gained[voter] ?? 0) + 100;
      else for (const author of choice.contributors) gained[author] = (gained[author] ?? 0) + 50;
    }
    for (const [id, points] of Object.entries(gained)) {
      const player = players.get(id);
      if (player) player.score += points;
    }
    round.result = { correct: round.choices.find(choice => choice.real).id, counts, gained, votes: round.votes.size, source: round.entry.source };
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
    fakeWrite(id, body) {
      const refusal = check(id, body, 'write');
      if (refusal) return refusal;
      if (round.submissions.has(id)) return error('Определение уже принято');
      const text = clean(body.text);
      if (!text) return error('Напиши определение до 110 знаков без разметки', 400);
      round.submissions.set(id, text);
      const result = remember(id, body);
      changed();
      return result;
    },
    fakeVote(id, body) {
      const refusal = check(id, body, 'vote');
      if (refusal) return refusal;
      const choice = body.choice === null ? null : round.choices.find(item => item.id === body.choice);
      if (body.choice !== null && !choice) return error('Нет такого определения', 400);
      if (choice?.contributors.includes(id)) return error('За своё определение голосовать нельзя', 403);
      round.votes.set(id, body.choice);
      const result = remember(id, body);
      changed();
      return result;
    },
  };
  const hostActions = {
    fakeAdvance(body) {
      if (!round || body.round !== round.id || body.v !== round.version) return error('Экран устарел');
      if (round.phase === 'write') toReview();
      else if (round.phase === 'review') toVote();
      else if (round.phase === 'vote') toResult();
      else return error('Сейчас переход недоступен');
      return { ok: true };
    },
    fakeHide(body) {
      if (!round || body.round !== round.id || body.v !== round.version || round.phase !== 'review') return error('Ответы уже открыты');
      if (!round.submissions.has(body.author) || typeof body.hidden !== 'boolean') return error('Нет такого определения', 400);
      if (body.hidden) round.hidden.add(body.author);
      else round.hidden.delete(body.author);
      changed();
      return { ok: true };
    },
    fakeNext(body) {
      if (!round || body.round !== round.id || body.v !== round.version || round.phase !== 'result') return error('Сначала закончи раунд');
      return start();
    },
  };
  function publicState() {
    if (!round) return null;
    return {
      id: round.id, number: round.number, version: round.version, phase: round.phase,
      word: round.entry.word, submitted: round.submissions.size, eligible: round.participants.size,
      deadlineInMs: Math.max(0, round.endsAt - Date.now()),
      choices: round.choices ? round.choices.map(choice => ({ id: choice.id, text: choice.text,
        authors: round.phase === 'result' ? choice.contributors.map(id => players.get(id)?.name ?? '') : undefined,
        real: round.phase === 'result' ? choice.real : undefined,
      })) : null,
      voters: round.phase === 'vote' ? round.votes.size : null, result: round.result,
    };
  }
  function privateState(id) {
    if (!round || !id) return null;
    return {
      audience: !round.participants.has(id), submitted: round.submissions.has(id), vote: round.votes.get(id),
      ownChoices: round.choices ? round.choices.filter(choice => choice.contributors.includes(id)).map(choice => choice.id) : [],
    };
  }
  function hostState() {
    if (round?.phase !== 'review') return null;
    return { submissions: [...round.submissions].map(([id, text]) => ({ id, text, name: players.get(id)?.name ?? '', hidden: round.hidden.has(id) })) };
  }
  return { start, stop, playerActions, hostActions, publicState, privateState, hostState };
}

module.exports = { createFakeDefinition, validateWords, clean };
