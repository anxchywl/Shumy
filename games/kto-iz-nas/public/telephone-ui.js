window.TelephoneUi = (() => {
  const copy = {
    ru: { game: 'Телефон без слов', description: 'Рисунок становится фразой, фраза — новым рисунком.', lobby: '4–8 игроков. Две цепочки идут одновременно: рисуй или опиши только предыдущий шаг.', play: 'Цепочки в работе', reveal: 'Открываем цепочки', result: 'Цепочки завершены', progress: 'Цепочка {number}: {done} из {total}', prompt: 'Начальная фраза', draw: 'Нарисуй то, что видишь', text: 'Опиши рисунок одной фразой', wait: 'Подожди: другие участники продолжают цепочки.', done: 'Твой шаг принят. Жди раскрытия.', audience: 'Ты присоединился после начала. Смотри за цепочками.', missing: 'Шаг пропущен', clear: 'Очистить рисунок', submit: 'Отправить', skip: 'Пропустить', advance: 'Пропустить текущие шаги', nextCard: 'Показать следующий шаг', next: 'Новые цепочки', back: 'В лобби', by: 'Автор: {name}', seconds: 'Осталось {count} с', error: 'Не удалось отправить. Проверь связь и попробуй снова.' },
    en: { game: 'Telephone Without Words', description: 'A drawing becomes a phrase, then a drawing again.', lobby: '4–8 players. Two chains run at once: draw or describe only the previous step.', play: 'Chains in progress', reveal: 'Revealing chains', result: 'Chains complete', progress: 'Chain {number}: {done} of {total}', prompt: 'Starting phrase', draw: 'Draw what you see', text: 'Describe the drawing in one sentence', wait: 'Wait while others continue the chains.', done: 'Your step was accepted. Wait for the reveal.', audience: 'You joined after the start. Watch the chains.', missing: 'Step skipped', clear: 'Clear drawing', submit: 'Submit', skip: 'Skip', advance: 'Skip current steps', nextCard: 'Show next step', next: 'New chains', back: 'Back to lobby', by: 'By {name}', seconds: '{count} s left', error: 'Could not send. Check your connection and try again.' },
    kk: { game: 'Сөзсіз телефон', description: 'Сурет сөзге, сөз қайта суретке айналады.', lobby: '4–8 ойыншы. Екі тізбек қатар жүреді: тек алдыңғы қадамды сал не сипатта.', play: 'Тізбектер жалғасып жатыр', reveal: 'Тізбектер ашылып жатыр', result: 'Тізбектер аяқталды', progress: 'Тізбек {number}: {done}/{total}', prompt: 'Бастапқы сөйлем', draw: 'Көргеніңді сал', text: 'Суретті бір сөйлеммен сипатта', wait: 'Басқалар тізбекті жалғастырғанша күт.', done: 'Қадамың қабылданды. Ашылуын күт.', audience: 'Сен басталғаннан кейін қосылдың. Тізбектерді бақыла.', missing: 'Қадам өткізіліп жіберілді', clear: 'Суретті тазалау', submit: 'Жіберу', skip: 'Өткізу', advance: 'Қазіргі қадамдарды өткізу', nextCard: 'Келесі қадамды көрсету', next: 'Жаңа тізбектер', back: 'Бөлмеге оралу', by: 'Автор: {name}', seconds: '{count} с қалды', error: 'Жіберілмеді. Байланысты тексеріп, қайта көр.' },
  };
  const t = (locale, key, values = {}) => (copy[locale] ?? copy.ru)[key].replace(/\{(\w+)\}/g, (_, name) => values[name] ?? '');
  const pick = (value, locale) => typeof value === 'string' ? value : value?.[locale] ?? value?.ru ?? '';
  let host, phone;
  function paint(canvas, paths) {
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = '#30342f'; context.lineWidth = 5; context.lineCap = 'round'; context.lineJoin = 'round';
    for (const path of paths ?? []) {
      context.beginPath();
      path.forEach(([x, y], index) => index ? context.lineTo(x * canvas.width, y * canvas.height) : context.moveTo(x * canvas.width, y * canvas.height));
      context.stroke();
    }
  }
  function contribution(item, locale, label) {
    const card = document.createElement('div'); card.className = 'duel-card';
    const title = document.createElement('strong'); title.textContent = label; card.append(title);
    if (item?.kind === 'draw' && item.content) {
      const canvas = document.createElement('canvas'); canvas.width = 600; canvas.height = 400; canvas.className = 'telephone-canvas'; canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', label); card.append(canvas); requestAnimationFrame(() => paint(canvas, item.content));
    } else { const p = document.createElement('p'); p.textContent = item?.content ? pick(item.content, locale) : t(locale, 'missing'); card.append(p); }
    return card;
  }
  function initHost(options) {
    host = options;
    const { $, api, state } = host;
    $('telephoneAdvance').onclick = () => { const round = state().telephone; api('telephoneAdvance', { round: round.id, v: round.version }); };
    $('telephoneNext').onclick = () => { const round = state().telephone; api('telephoneNext', { round: round.id, v: round.version }); };
    $('telephoneLobby').onclick = () => api('lobby');
  }
  function renderHost(state) {
    if (!host || !state.telephone) return;
    const { $, locale } = host, round = state.telephone;
    $('telephoneTitle').textContent = t(locale, round.phase);
    $('telephoneStatus').textContent = round.chains.map(chain => t(locale, 'progress', { number: chain.index + 1, done: chain.done, total: chain.total })).join(' · ');
    $('telephoneCards').replaceChildren(...round.chains.flatMap(chain => {
      if (!chain.reveal) return [];
      const header = document.createElement('h2'); header.textContent = t(locale, 'progress', { number: chain.index + 1, done: chain.done, total: chain.total });
      return [header, contribution({ kind: 'text', content: chain.reveal.prompt }, locale, t(locale, 'prompt')),
        ...chain.reveal.steps.map(step => contribution(step, locale, t(locale, 'by', { name: step.by })))];
    }));
    $('telephoneAdvance').hidden = round.phase === 'result'; $('telephoneAdvance').textContent = t(locale, round.phase === 'play' ? 'advance' : 'nextCard');
    $('telephoneNext').hidden = round.phase !== 'result'; $('telephoneNext').textContent = t(locale, 'next'); $('telephoneLobby').textContent = t(locale, 'back');
  }
  function initPhone(options) {
    phone = { ...options, state: null, connected: false, pending: false, paths: [], activePath: null, key: '', deadline: 0 };
    const { $ } = phone, canvas = $('telephoneCanvas');
    canvas.onpointerdown = event => {
      if (!phone.state?.telephoneMine?.turn || phone.pending || phone.paths.length >= 24) return;
      canvas.setPointerCapture(event.pointerId);
      phone.activePath = [];
      phone.paths.push(phone.activePath);
      point(event);
    };
    canvas.onpointermove = event => { if (phone.activePath) point(event); };
    canvas.onpointerup = () => { if (phone.activePath?.length === 1) phone.activePath.push([...phone.activePath[0]]); phone.activePath = null; paint(canvas, phone.paths); };
    canvas.onpointercancel = () => { phone.activePath = null; };
    $('telephoneClear').onclick = () => { phone.paths = []; paint(canvas, phone.paths); };
    $('telephoneForm').onsubmit = event => { event.preventDefault(); send(false); };
    $('telephoneSkip').onclick = () => send(true);
    requestAnimationFrame(tickPhone);
  }
  function tickPhone() {
    if (phone) {
      const count = Math.ceil(Math.max(0, phone.deadline - performance.now()) / 1000);
      phone.$('telephoneClock').textContent = phone.state?.telephoneMine?.turn ? t(phone.locale, 'seconds', { count }) : '';
    }
    requestAnimationFrame(tickPhone);
  }
  function point(event) {
    const canvas = phone.$('telephoneCanvas'), rect = canvas.getBoundingClientRect();
    if (phone.activePath.length >= 90 || phone.paths.reduce((n, path) => n + path.length, 0) >= 800) return;
    phone.activePath.push([Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)), Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height))]);
    paint(canvas, phone.paths);
  }
  async function send(skip) {
    const { $, state, room, pid, locale } = phone;
    const mine = state?.telephoneMine, round = state?.telephone;
    if (!mine?.turn || !phone.connected || phone.pending || state.selfActive === false) return;
    const body = { room, pid, round: round.id, chain: mine.chain, v: mine.v, actionId: crypto.randomUUID(), skip,
      ...(mine.kind === 'draw' ? { paths: phone.paths } : { text: $('telephoneText').value.trim() }) };
    phone.pending = true; $('telephoneFeedback').textContent = '';
    try { const response = await fetch('./api/telephoneSubmit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(8000) });
      const result = await response.json(); if (!response.ok) $('telephoneFeedback').textContent = result.error || t(locale, 'error');
    } catch { $('telephoneFeedback').textContent = t(locale, 'error'); }
    phone.pending = false; renderPhone(phone.state, phone.connected);
  }
  function renderPhone(state, connected) {
    if (!phone || !state.telephone) return;
    const { $, locale } = phone, round = state.telephone, mine = state.telephoneMine ?? { audience: true };
    phone.state = state; phone.connected = connected;
    const key = `${round.id}:${mine.chain}:${mine.step}`;
    if (phone.key !== key) { phone.key = key; phone.paths = []; $('telephoneText').value = ''; $('telephoneFeedback').textContent = ''; paint($('telephoneCanvas'), []); }
    $('telephonePhase').textContent = t(locale, round.phase);
    $('telephoneLead').textContent = mine.audience ? t(locale, 'audience') : round.phase !== 'play' ? t(locale, round.phase) : mine.turn ? t(locale, mine.kind) : t(locale, mine.done ? 'done' : 'wait');
    $('telephonePrevious').hidden = !mine.turn;
    if (mine.turn) $('telephonePrevious').replaceChildren(contribution(mine.previous, locale, t(locale, 'prompt')));
    $('telephoneForm').hidden = !mine.turn; $('telephoneCanvas').hidden = mine.kind !== 'draw'; $('telephoneClear').hidden = mine.kind !== 'draw';
    $('telephoneTextRow').hidden = mine.kind !== 'text'; $('telephoneTextLabel').textContent = t(locale, 'text');
    $('telephoneClear').textContent = t(locale, 'clear'); $('telephoneSubmit').textContent = t(locale, 'submit'); $('telephoneSkip').textContent = t(locale, 'skip');
    $('telephoneSubmit').disabled = !connected || phone.pending || state.selfActive === false; $('telephoneSkip').disabled = $('telephoneSubmit').disabled;
    phone.deadline = performance.now() + (round.chains.find(chain => chain.id === mine.chain)?.remainingMs ?? 0);
    $('telephoneClock').textContent = mine.turn ? t(locale, 'seconds', { count: Math.ceil(Math.max(0, phone.deadline - performance.now()) / 1000) }) : '';
    $('telephoneReveal').hidden = round.phase === 'play';
    if (round.phase !== 'play') $('telephoneReveal').replaceChildren(...round.chains.flatMap(chain => !chain.reveal ? [] : [contribution({ kind: 'text', content: chain.reveal.prompt }, locale, t(locale, 'prompt')), ...chain.reveal.steps.map(step => contribution(step, locale, t(locale, 'by', { name: step.by })))]));
  }
  return { t, initHost, renderHost, initPhone, renderPhone };
})();
