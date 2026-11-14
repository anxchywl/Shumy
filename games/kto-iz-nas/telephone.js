const { randomUUID } = require('crypto');

const PROMPTS = [
  { ru: 'Кот чинит космический корабль', en: 'A cat repairs a spaceship', kk: 'Мысық ғарыш кемесін жөндеп жатыр' },
  { ru: 'Повар ловит летающий арбуз', en: 'A chef catches a flying watermelon', kk: 'Аспаз ұшатын қарбызды ұстап жатыр' },
  { ru: 'Робот танцует под дождём', en: 'A robot dances in the rain', kk: 'Робот жаңбырда билеп жүр' },
  { ru: 'Слон читает карту метро', en: 'An elephant reads a metro map', kk: 'Піл метро картасын оқып тұр' },
];
function clean(text) {
  if (typeof text !== 'string') return null;
  const value = text.replace(/[\u0000-\u001f\u007f\u2028\u2029]/g, ' ').replace(/\s+/g, ' ').trim();
  return value && value.length <= 90 && !/[<>]/.test(value) ? value : null;
}
function validDrawing(paths) {
  return Array.isArray(paths) && paths.length > 0 && paths.length <= 24 && paths.every(path =>
    Array.isArray(path) && path.length >= 2 && path.length <= 90 && path.every(point =>
      Array.isArray(point) && point.length === 2 && point.every(value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1))) &&
    paths.reduce((sum, path) => sum + path.length, 0) <= 800;
}
function createTelephone({ players, changed, stepMs = 40000 }) {
  let round = null;
  let number = 0;
  let promptIndex = 0;
  const error = (message, status = 409) => ({ error: message, status });
  function stop() { if (round) for (const chain of round.chains) clearTimeout(chain.timer); round = null; }
  function arm(chain) {
    clearTimeout(chain.timer);
    chain.endsAt = Date.now() + stepMs;
    const id = round.id, step = chain.step;
    chain.timer = setTimeout(() => { if (round?.id === id && chain.step === step && round.phase === 'play') advance(chain, null); }, stepMs);
  }
  function start() {
    const present = [...players.values()].filter(player => player.online);
    if (present.length < 4 || present.length > 8) return error('Для «Телефона без слов» нужно 4–8 игроков на связи');
    stop();
    const shuffled = [...present];
    for (let index = shuffled.length - 1; index > 0; index--) {
      const other = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
    }
    const split = Math.ceil(shuffled.length / 2);
    const groups = [shuffled.slice(0, split), shuffled.slice(split)];
    const chains = groups.map((group, index) => ({ id: randomUUID(), prompt: PROMPTS[(promptIndex + index) % PROMPTS.length],
      people: group.map(player => ({ id: player.id, name: player.name })), steps: [], step: 0, version: 1, endsAt: 0, timer: null }));
    promptIndex = (promptIndex + 2) % PROMPTS.length;
    round = { id: randomUUID(), number: ++number, phase: 'play', version: 1, chains, actions: new Map(), reveal: { chain: 0, card: 0 } };
    for (const chain of chains) arm(chain);
    changed();
    return { ok: true };
  }
  function advance(chain, contribution) {
    if (!round || round.phase !== 'play' || chain.step >= chain.people.length) return;
    clearTimeout(chain.timer);
    const person = chain.people[chain.step];
    chain.steps.push({ kind: chain.step % 2 ? 'text' : 'draw', by: person.name, content: contribution });
    chain.step += 1;
    chain.version += 1;
    if (chain.step < chain.people.length) arm(chain);
    else chain.endsAt = 0;
    if (round.chains.every(item => item.step >= item.people.length)) { round.phase = 'reveal'; round.version += 1; }
    changed();
  }
  const playerActions = {
    telephoneSubmit(id, body) {
      if (!round || round.id !== body.round) return error('Раунд изменился');
      const chain = round.chains.find(item => item.id === body.chain);
      if (!chain) return error('Нет такой цепочки', 400);
      if (!/^[a-f0-9-]{32,36}$/.test(body.actionId ?? '')) return error('Некорректный запрос', 400);
      const key = `${id}:${body.actionId}`;
      if (round.actions.has(key)) return round.actions.get(key);
      if (round.phase !== 'play') return error('Раунд изменился');
      if (chain.people[chain.step]?.id !== id) return error('Сейчас ход другого игрока', 403);
      if (body.v !== chain.version || Date.now() >= chain.endsAt) return error('Время хода вышло');
      const content = body.skip === true ? null : chain.step % 2 ? clean(body.text) : validDrawing(body.paths) ? body.paths : null;
      if (body.skip !== true && !content) return error('Добавь рисунок или короткое описание', 400);
      const result = { ok: true };
      round.actions.set(key, result);
      advance(chain, content);
      return result;
    },
  };
  const hostActions = {
    telephoneAdvance(body) {
      if (!round || round.id !== body.round || round.version !== body.v) return error('Экран устарел');
      if (round.phase === 'play') {
        for (const chain of round.chains) if (chain.step < chain.people.length) advance(chain, null);
      } else if (round.phase === 'reveal') {
        const chain = round.chains[round.reveal.chain];
        if (round.reveal.card < chain.steps.length) round.reveal.card += 1;
        else if (round.reveal.chain < round.chains.length - 1) { round.reveal.chain += 1; round.reveal.card = 0; }
        else round.phase = 'result';
        round.version += 1;
        changed();
      } else return error('Сейчас переход недоступен');
      return { ok: true };
    },
    telephoneNext(body) {
      if (!round || round.id !== body.round || round.version !== body.v || round.phase !== 'result') return error('Сначала закончи раунд');
      return start();
    },
  };
  function publicState() {
    if (!round) return null;
    return { id: round.id, number: round.number, phase: round.phase, version: round.version,
      chains: round.chains.map((chain, index) => ({ id: chain.id, index, done: chain.step, total: chain.people.length,
        remainingMs: Math.max(0, chain.endsAt - Date.now()),
        reveal: ['reveal', 'result'].includes(round.phase) && (round.phase === 'result' || index <= round.reveal.chain) ?
          { prompt: chain.prompt, steps: chain.steps.slice(0, round.phase === 'result' || index < round.reveal.chain ? undefined : round.reveal.card) } : null })) };
  }
  function privateState(id) {
    if (!round || !id) return null;
    const chain = round.chains.find(item => item.people.some(person => person.id === id));
    if (!chain) return { audience: true };
    const current = round.phase === 'play' && chain.people[chain.step]?.id === id;
    const previous = current ? chain.steps.at(-1) : null;
    return { audience: false, chain: chain.id, turn: current, done: chain.people.findIndex(person => person.id === id) < chain.step,
      step: chain.step, v: chain.version, kind: current ? chain.step % 2 ? 'text' : 'draw' : null,
      previous: current ? previous ? { kind: previous.kind, content: previous.content } : { kind: 'text', content: chain.prompt } : null };
  }
  return { start, stop, playerActions, hostActions, publicState, privateState };
}
module.exports = { createTelephone, clean, validDrawing };
