window.DictationUi = (() => {
  const copy = {
    ru: { game:'Рисуй по словам', description:'Один объясняет рисунок голосом, остальные рисуют и угадывают.', lobby:'От 3 игроков. Нужен общий голос: рядом или в отдельном звонке. Режиссёр говорит, остальные рисуют. 60 секунд на рисунок и 20 на догадку.', ready:'Режиссёр готовится', draw:'Рисуем по инструкции', guess:'Угадываем слово', result:'Рисунки и ответы', final:'Итог игры', waiting:'Ждём трёх игроков на связи', cancelled:'Раунд отменён. Готовим новое слово.', director:'Режиссёр: {name}', directorRule:'Назови только видимые формы, расположение и детали. Не произноси, не переводи и не подсказывай слово синонимом. Говори вслух, когда начнёшь.', drawRule:'Слушай режиссёра и рисуй на своём телефоне. Чужие рисунки откроются в конце.', guessRule:'Что получилось на твоём рисунке? Отправь одну догадку.', readyRule:'Жди, пока режиссёр начнёт. Слово видно только ему.', audience:'Ты присоединился после начала. Смотри общий экран и жди следующей игры.', sent:'Догадка принята. Жди раскрытия.', begin:'Начать объяснение', clear:'Очистить рисунок', submit:'Отправить догадку', cancel:'Отменить раунд: слово раскрыто', next:'Следующий раунд', finish:'Показать итог', back:'В лобби', empty:'Рисунок не отправлен', noGuess:'Нет догадки', guessLabel:'Твоя догадка', answer:'Ответ: {word}', points:'Угадали {correct} из {eligible}; режиссёр +{point}', counted:'Очко засчитано', excluded:'Не входит в счёт режиссёра', seconds:'Осталось {count} с', round:'Раунд {number} из {total}', error:'Не удалось отправить. Проверь связь и попробуй ещё раз.', reconnect:'Связь потеряна. Восстанавливаем…', nameGuess:'{name}: {guess}', score:'{name}: {score}' },
    en: { game:'Draw by directions', description:'One player gives spoken directions; everyone else draws and guesses.', lobby:'3+ players. Everyone needs to hear each other, in person or on a separate call. The director speaks; others draw. 60 seconds to draw, 20 to guess.', ready:'Director is preparing', draw:'Draw from directions', guess:'Guess the word', result:'Drawings and guesses', final:'Game results', waiting:'Waiting for three connected players', cancelled:'Round cancelled. Preparing a new word.', director:'Director: {name}', directorRule:'Describe visible shapes, placement and details only. Do not say, spell, translate or give a synonym for the word. Speak aloud after starting.', drawRule:'Listen to the director and draw on your phone. Other drawings appear at the end.', guessRule:'What did your drawing show? Send one guess.', readyRule:'Wait for the director to start. Only they can see the word.', audience:'You joined after the start. Watch the shared screen and wait for the next game.', sent:'Guess received. Wait for the reveal.', begin:'Start directions', clear:'Clear drawing', submit:'Submit guess', cancel:'Cancel round: answer leaked', next:'Next round', finish:'Show results', back:'Back to lobby', empty:'No drawing submitted', noGuess:'No guess', guessLabel:'Your guess', answer:'Answer: {word}', points:'{correct} of {eligible} guessed; director +{point}', counted:'Point counted', excluded:'Excluded from the director threshold', seconds:'{count} s left', round:'Round {number} of {total}', error:'Could not send. Check your connection and try again.', reconnect:'Connection lost. Reconnecting…', nameGuess:'{name}: {guess}', score:'{name}: {score}' },
    kk: { game:'Айтқандай сал', description:'Бір ойыншы ауызша түсіндіреді, қалғандары сурет салып, сөзді табады.', lobby:'Кемінде 3 ойыншы. Бір-біріңді есту керек: бірге немесе бөлек қоңырауда. Жетекші айтады, қалғандары салады. Суретке 60, жауапқа 20 секунд.', ready:'Жетекші дайындалып жатыр', draw:'Нұсқаумен сурет сал', guess:'Сөзді тап', result:'Суреттер мен жауаптар', final:'Ойын қорытындысы', waiting:'Желіде үш ойыншыны күтеміз', cancelled:'Раунд тоқтатылды. Жаңа сөз дайындалып жатыр.', director:'Жетекші: {name}', directorRule:'Тек көрінетін пішіндерді, орналасуын және бөлшектерін сипатта. Сөзді айтпа, әріптеп берме, аударма және синонимін қолданба. Бастаған соң дауыстап түсіндір.', drawRule:'Жетекшіні тыңдап, телефоныңда сурет сал. Басқа суреттер соңында ашылады.', guessRule:'Өз суретіңде не шықты? Бір жауап жібер.', readyRule:'Жетекші бастағанша күт. Сөз тек оған көрінеді.', audience:'Сен ойын басталған соң қосылдың. Ортақ экранды қарап, келесі ойынды күт.', sent:'Жауап қабылданды. Ашылуын күт.', begin:'Түсіндіруді бастау', clear:'Суретті тазалау', submit:'Жауап жіберу', cancel:'Раундты тоқтату: сөз айтылды', next:'Келесі раунд', finish:'Қорытындыны көрсету', back:'Лоббиге', empty:'Сурет жіберілмеді', noGuess:'Жауап жоқ', guessLabel:'Сенің жауабың', answer:'Жауап: {word}', points:'{eligible} ойыншының {correct}-і тапты; жетекші +{point}', counted:'Ұпай есептелді', excluded:'Жетекші есебіне кірмейді', seconds:'{count} с қалды', round:'{total} раундтың {number}-і', error:'Жіберілмеді. Байланысты тексеріп, қайталап көр.', reconnect:'Байланыс үзілді. Қайта қосылып жатыр…', nameGuess:'{name}: {guess}', score:'{name}: {score}' },
  };
  const t = (locale, key, values = {}) => (copy[locale] ?? copy.ru)[key].replace(/\{(\w+)\}/g, (_, name) => values[name] ?? '');
  const word = (value, locale) => value?.[locale] ?? value?.ru ?? '';
  const retryLabel = locale => ({ ru:'Повторить раунд', en:'Retry round', kk:'Раундты қайталау' })[locale] ?? 'Повторить раунд';
  const resultRule = locale => ({ ru:'Все рисунки и догадки открыты одновременно.', en:'All drawings and guesses are now visible.', kk:'Барлық суреттер мен жауаптар бірге ашылды.' })[locale] ?? 'Все рисунки и догадки открыты одновременно.';
  const directorAway = locale => ({ ru:'Режиссёр не на связи. Ждём возврата до 8 с.', en:'Director disconnected. Waiting up to 8 s for reconnection.', kk:'Жетекші желіде жоқ. Қайта қосылуын 8 с дейін күтеміз.' })[locale] ?? 'Режиссёр не на связи. Ждём возврата до 8 с.';
  const phaseName = phase => ['ready', 'draw', 'guess', 'result', 'final', 'waiting', 'cancelled'].includes(phase) ? phase : 'waiting';
  function paint(canvas, segments) {
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    for (const [color, width, x1, y1, x2, y2] of segments ?? []) {
      context.strokeStyle = context.fillStyle = window.Sketch.colors[color];
      context.lineWidth = width; context.lineCap = 'round'; context.beginPath();
      if (x1 === x2 && y1 === y2) { context.arc(x1, y1, width / 2, 0, Math.PI * 2); context.fill(); }
      else { context.moveTo(x1, y1); context.lineTo(x2, y2); context.stroke(); }
    }
  }
  function gallery(container, items, locale) {
    container.replaceChildren(...(items ?? []).map(item => {
      const card = document.createElement('article'); card.className = 'dictation-card';
      const title = document.createElement('strong'); title.textContent = item.name;
      const canvas = document.createElement('canvas'); canvas.width = 960; canvas.height = 600;
      canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', item.name);
      const guess = document.createElement('p'); guess.textContent = t(locale, 'nameGuess', { name: item.name, guess: item.guess || t(locale, 'noGuess') });
      const status = document.createElement('p');
      status.textContent = [item.correct ? t(locale, 'counted') : '', !item.counted ? t(locale, 'excluded') : ''].filter(Boolean).join(' · ');
      card.append(title, canvas, guess);
      if (status.textContent) card.append(status);
      if (!item.segments.length) { const empty = document.createElement('p'); empty.textContent = t(locale, 'empty'); card.append(empty); }
      requestAnimationFrame(() => paint(canvas, item.segments));
      return card;
    }));
  }
  let host, phone;
  function initHost(options) {
    host = options;
    const { $, api, state } = options;
    $('dictationCancel').onclick = () => api('dictationCancel', { round: state().dictation.id });
    $('dictationNext').onclick = () => api('dictationNext', { round: state().dictation.id });
    $('dictationRetry').onclick = () => api('dictationRetry');
    $('dictationLobby').onclick = () => api('lobby');
    setInterval(() => { if (host?.deadline) $('dictationTime').textContent = t(host.locale, 'seconds', { count: Math.ceil(Math.max(0, host.deadline - performance.now()) / 1000) }); }, 250);
  }
  function renderHost(state) {
    if (!host || !state.dictation) return;
    const { $, locale } = host, round = state.dictation;
    const name = state.players.find(player => player.id === round.director)?.name || '';
    $('dictationTitle').textContent = t(locale, phaseName(round.phase));
    $('dictationRound').textContent = t(locale, 'round', round);
    $('dictationStatus').textContent = round.phase === 'waiting' ? t(locale, 'waiting') : !round.directorOnline && ['ready', 'draw', 'guess'].includes(round.phase) ? directorAway(locale) : t(locale, 'director', { name });
    $('dictationRule').textContent = round.phase === 'result' ? resultRule(locale) : t(locale, round.phase === 'ready' ? 'readyRule' : round.phase === 'draw' ? 'drawRule' : round.phase === 'guess' ? 'guessRule' : round.phase === 'cancelled' ? 'cancelled' : 'lobby');
    $('dictationTime').textContent = round.remainingMs ? t(locale, 'seconds', { count: Math.ceil(round.remainingMs / 1000) }) : '';
    host.deadline = round.remainingMs ? performance.now() + round.remainingMs : 0;
    $('dictationAnswer').textContent = round.result ? `${t(locale, 'answer', { word: word(round.result.word, locale) })} · ${t(locale, 'points', { ...round.result, point: round.result.directorPoint })}` : '';
    gallery($('dictationGallery'), round.result?.gallery, locale);
    $('dictationScores').replaceChildren(...(round.scores ?? []).map(item => { const p = document.createElement('p'); p.textContent = t(locale, 'score', item); return p; }));
    $('dictationCancel').hidden = !['ready', 'draw', 'guess'].includes(round.phase);
    $('dictationCancel').textContent = t(locale, 'cancel');
    $('dictationNext').hidden = round.phase !== 'result';
    $('dictationNext').textContent = t(locale, round.number === round.total ? 'finish' : 'next');
    $('dictationRetry').hidden = round.phase !== 'waiting' || state.players.filter(player => player.online).length < 3;
    $('dictationRetry').textContent = retryLabel(locale);
    $('dictationLobby').textContent = t(locale, 'back');
  }
  function initPhone(options) {
    phone = { ...options, state:null, connected:false, pending:false, drawing:false, stroke:[], segments:[], round:'', deadline:0 };
    const { $ } = phone, canvas = $('dictationCanvas');
    const point = event => { const rect = canvas.getBoundingClientRect(); return [Math.round(Math.max(0, Math.min(960, (event.clientX - rect.left) * 960 / rect.width))), Math.round(Math.max(0, Math.min(600, (event.clientY - rect.top) * 600 / rect.height)))]; };
    canvas.onpointerdown = event => {
      if (!phone.connected || phone.state?.dictation?.phase !== 'draw' || phone.state?.dictationMine?.role !== 'drawer' || phone.state.selfActive === false) return;
      phone.drawing = true; phone.stroke = []; canvas.setPointerCapture(event.pointerId);
      const [x, y] = point(event); phone.last = [x, y]; phone.stroke.push([0, 11, x, y, x, y]); paint(canvas, [...phone.segments, ...phone.stroke]);
    };
    canvas.onpointermove = event => {
      if (!phone.drawing || phone.stroke.length >= 64) return;
      const [x, y] = point(event); const [px, py] = phone.last;
      if (Math.abs(x-px) + Math.abs(y-py) < 4) return;
      phone.stroke.push([0, 11, px, py, x, y]); phone.last = [x, y]; paint(canvas, [...phone.segments, ...phone.stroke]);
    };
    const finish = () => { if (!phone.drawing) return; phone.drawing = false; const segments = phone.stroke; phone.stroke = []; send('dictationInk', { segments }); };
    canvas.onpointerup = finish; canvas.onpointercancel = finish; canvas.onlostpointercapture = finish;
    $('dictationClear').onclick = () => send('dictationInk', { clear:true });
    $('dictationBegin').onclick = () => send('dictationBegin', {});
    $('dictationForm').onsubmit = event => { event.preventDefault(); send('dictationGuess', { text: $('dictationInput').value.trim() }); };
    setInterval(() => { if (phone?.state?.dictation) $('dictationClock').textContent = phone.deadline ? t(phone.locale, 'seconds', { count: Math.ceil(Math.max(0, phone.deadline - performance.now()) / 1000) }) : ''; }, 250);
  }
  async function send(action, data) {
    const { state, $, room, pid, locale } = phone;
    if (!phone.connected || phone.pending || state.selfActive === false || !state.dictation) return;
    const round = state.dictation.id;
    phone.pending = true; $('dictationFeedback').textContent = '';
    try {
      const response = await fetch(`./api/${action}`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ room, pid, round, actionId: crypto.randomUUID(), ...data }), signal:AbortSignal.timeout(8000) });
      if (!response.ok) $('dictationFeedback').textContent = (await response.json()).error || t(locale, 'error');
    } catch { $('dictationFeedback').textContent = t(locale, 'error'); }
    phone.pending = false;
    renderPhone(phone.state, phone.connected);
  }
  function renderPhone(state, connected) {
    if (!phone || !state.dictation) return;
    const { $, locale } = phone, round = state.dictation, mine = state.dictationMine ?? { role:'audience' };
    phone.state = state; phone.connected = connected;
    if (phone.round !== round.id) { phone.round = round.id; $('dictationInput').value = ''; $('dictationFeedback').textContent = ''; phone.segments = []; }
    $('dictationPhase').textContent = t(locale, 'round', round);
    $('dictationTitlePhone').textContent = t(locale, phaseName(round.phase));
    $('dictationWord').textContent = word(mine.word, locale);
    $('dictationWord').hidden = !mine.word;
    $('dictationInstruction').textContent = !connected ? t(locale, 'reconnect') : round.phase === 'result' ? resultRule(locale) : ['waiting', 'cancelled', 'final'].includes(round.phase) ? t(locale, round.phase) : !round.directorOnline ? directorAway(locale) : mine.role === 'audience' ? t(locale, 'audience') : mine.role === 'director' ? t(locale, 'directorRule') : round.phase === 'ready' ? t(locale, 'readyRule') : round.phase === 'draw' ? t(locale, 'drawRule') : round.phase === 'guess' ? mine.guess ? t(locale, 'sent') : t(locale, 'guessRule') : t(locale, phaseName(round.phase));
    $('dictationBegin').hidden = round.phase !== 'ready' || mine.role !== 'director';
    $('dictationBegin').textContent = t(locale, 'begin'); $('dictationBegin').disabled = !connected || phone.pending || state.selfActive === false;
    $('dictationCanvas').hidden = !['draw', 'guess'].includes(round.phase) || mine.role !== 'drawer';
    $('dictationClear').hidden = round.phase !== 'draw' || mine.role !== 'drawer';
    $('dictationClear').textContent = t(locale, 'clear'); $('dictationClear').disabled = !connected || phone.pending || state.selfActive === false;
    phone.segments = mine.segments ?? [];
    if (!phone.drawing) paint($('dictationCanvas'), phone.segments);
    $('dictationForm').hidden = round.phase !== 'guess' || mine.role !== 'drawer' || mine.guess;
    $('dictationSubmit').textContent = t(locale, 'submit'); $('dictationSubmit').disabled = !connected || phone.pending || state.selfActive === false;
    $('dictationGuessLabel').textContent = t(locale, 'guessLabel');
    $('dictationClock').textContent = round.remainingMs ? t(locale, 'seconds', { count: Math.ceil(round.remainingMs / 1000) }) : '';
    phone.deadline = round.remainingMs ? performance.now() + round.remainingMs : 0;
    $('dictationResult').textContent = round.result ? `${t(locale, 'answer', { word: word(round.result.word, locale) })} · ${t(locale, 'points', { ...round.result, point: round.result.directorPoint })}` : '';
    gallery($('dictationPhoneGallery'), round.result?.gallery, locale);
    $('dictationPhoneScores').replaceChildren(...(round.scores ?? []).map(item => { const p = document.createElement('p'); p.textContent = t(locale, 'score', item); return p; }));
  }
  return { t, initHost, renderHost, initPhone, renderPhone };
})();
