window.ShowUi = (() => {
  const copy = {
    ru: { game: 'Покажи, не говори', description: 'Один показывает слово, остальные угадывают.', lobby: '3–20 игроков. Доброволец показывает слово без речи, остальные угадывают на телефонах.', volunteer: 'Ищем актёра', act: 'Покажи слово', result: 'Итог хода', volunteerLead: 'Хочешь показывать? Вызовись добровольцем.', volunteered: 'Ты вызвался. Ждём выбора ведущего.', waitActor: 'Ждём, пока найдётся актёр.', actorLead: 'Покажи слово без речи. Если трудно, открой рисунок и покажи телефон.', guessLead: 'Смотри на актёра и пиши догадки.', solved: 'Ты угадал! Жди конца хода.', audience: 'Ты присоединился после начала. Смотри этот ход.', noActor: 'Добровольцев не было. Начните новый ход.', noGuesses: 'Никто не угадал.', volunteerButton: 'Я покажу', guessLabel: 'Твоя догадка', guess: 'Проверить', finish: 'Завершить ход', illustration: 'Показать рисунок', correct: 'Верно!', wrong: 'Пока не угадал. Попробуй ещё.', advance: 'Выбрать актёра', end: 'Открыть слово', next: 'Следующее слово', back: 'В лобби', status: 'Догадок: {guesses}, угадали: {correct}', actor: 'Показывает {name}', word: 'Слово: {word}', seconds: 'Осталось {count} с', error: 'Не удалось отправить. Проверь связь и попробуй снова.' },
    en: { game: 'Show, Don’t Tell', description: 'One acts out a word; everyone else guesses.', lobby: '3–20 players. A volunteer acts silently; others guess on their phones.', volunteer: 'Looking for an actor', act: 'Act out the word', result: 'Turn result', volunteerLead: 'Want to act? Volunteer now.', volunteered: 'You volunteered. Waiting for the host.', waitActor: 'Waiting for an actor.', actorLead: 'Act without speaking. If needed, open the drawing and show your phone.', guessLead: 'Watch the actor and enter guesses.', solved: 'You got it! Wait for the turn to end.', audience: 'You joined after the start. Watch this turn.', noActor: 'No one volunteered. Start another turn.', noGuesses: 'Nobody guessed correctly.', volunteerButton: 'I will act', guessLabel: 'Your guess', guess: 'Check guess', finish: 'Finish turn', illustration: 'Show drawing', correct: 'Correct!', wrong: 'Not yet. Try again.', advance: 'Choose actor', end: 'Reveal word', next: 'Next word', back: 'Back to lobby', status: 'Guesses: {guesses}, solved: {correct}', actor: '{name} is acting', word: 'Word: {word}', seconds: '{count} s left', error: 'Could not send. Check your connection and try again.' },
    kk: { game: 'Көрсет, айтпа', description: 'Біреу сөзді көрсетеді, өзгелері табады.', lobby: '3–20 ойыншы. Ерікті сөйлемей көрсетеді, өзгелері телефоннан табады.', volunteer: 'Көрсетушіні іздейміз', act: 'Сөзді көрсет', result: 'Кезек нәтижесі', volunteerLead: 'Көрсеткің келе ме? Ерікті бол.', volunteered: 'Сен ерікті болдың. Жүргізушіні күт.', waitActor: 'Көрсетушіні күтеміз.', actorLead: 'Сөйлемей көрсет. Қиын болса, суретті ашып телефоныңды көрсет.', guessLead: 'Көрсетушіге қарап, болжам жаз.', solved: 'Таптың! Кезектің аяқталуын күт.', audience: 'Сен басталғаннан кейін қосылдың. Бұл кезекті бақыла.', noActor: 'Ерікті болмады. Жаңа кезек баста.', noGuesses: 'Ешкім таппады.', volunteerButton: 'Мен көрсетемін', guessLabel: 'Болжамың', guess: 'Тексеру', finish: 'Кезекті аяқтау', illustration: 'Суретті көрсету', correct: 'Дұрыс!', wrong: 'Әзірге жоқ. Қайта көр.', advance: 'Көрсетушіні таңдау', end: 'Сөзді ашу', next: 'Келесі сөз', back: 'Бөлмеге оралу', status: 'Болжам: {guesses}, тапты: {correct}', actor: '{name} көрсетеді', word: 'Сөз: {word}', seconds: '{count} с қалды', error: 'Жіберілмеді. Байланысты тексеріп, қайта көр.' },
  };
  const t = (locale, key, values = {}) => (copy[locale] ?? copy.ru)[key].replace(/\{(\w+)\}/g, (_, name) => values[name] ?? '');
  const pick = (value, locale) => value?.[locale] ?? value?.ru ?? '';
  const paths = {
    umbrella: '<path d="M15 53a45 45 0 0 1 90 0H15m45-45v67q0 13 12 13 10 0 10-10"/>',
    bicycle: '<circle cx="30" cy="65" r="18"/><circle cx="92" cy="65" r="18"/><path d="M30 65 49 34 70 65H30m40 0 10-33 12 33M46 32h10m23 0h14"/>',
    penguin: '<ellipse cx="60" cy="48" rx="30" ry="41"/><ellipse cx="60" cy="62" rx="20" ry="22"/><circle cx="50" cy="28" r="2"/><circle cx="70" cy="28" r="2"/><path d="m55 37 5 6 5-6M40 85l-10 9m50-9 10 9"/>',
    airplane: '<path d="m10 58 46-13 33-33 8 7-24 31 35 13-4 9-42-4-20 20-7-6 12-22-32 7Z"/>',
  };
  let host, phone;
  function initHost(options) {
    host = { ...options, deadline: 0 };
    const { $, api, state } = host;
    $('showAdvance').onclick = () => { const round = state().showGame; api('showAdvance', { round: round.id, v: round.version }); };
    $('showNext').onclick = () => { const round = state().showGame; api('showNext', { round: round.id, v: round.version }); };
    $('showLobby').onclick = () => api('lobby');
    requestAnimationFrame(tickHost);
  }
  function renderHost(state) {
    if (!host || !state.showGame) return;
    const { $, locale } = host, round = state.showGame;
    host.deadline = performance.now() + round.remainingMs;
    $('showTitle').textContent = t(locale, round.phase);
    $('showActor').textContent = round.phase === 'volunteer' ? `${t(locale, 'volunteer')}: ${round.volunteers}` : round.actorName ? t(locale, 'actor', { name: round.actorName }) : t(locale, 'noActor');
    $('showStatus').textContent = t(locale, 'status', round);
    $('showWord').hidden = round.phase !== 'result';
    $('showWord').textContent = round.word ? t(locale, 'word', { word: pick(round.word, locale) }) : t(locale, 'noActor');
    $('showSolvers').textContent = round.phase === 'result' && round.solvers?.length ? round.solvers.join(', ') : round.phase === 'result' && round.actorName ? t(locale, 'noGuesses') : '';
    $('showClock').hidden = round.phase === 'result';
    $('showAdvance').hidden = round.phase === 'result'; $('showAdvance').textContent = t(locale, round.phase === 'act' ? 'end' : 'advance');
    $('showNext').hidden = round.phase !== 'result'; $('showNext').textContent = t(locale, 'next'); $('showLobby').textContent = t(locale, 'back');
  }
  function tickHost() { if (host) host.$('showClock').textContent = t(host.locale, 'seconds', { count: Math.ceil(Math.max(0, host.deadline - performance.now()) / 1000) }); requestAnimationFrame(tickHost); }
  function initPhone(options) {
    phone = { ...options, state: null, connected: false, pending: false, deadline: 0, key: '' };
    const { $ } = phone;
    $('showVolunteer').onclick = () => send('showVolunteer');
    $('showGuessForm').onsubmit = event => { event.preventDefault(); send('showGuess', { text: $('showGuessText').value.trim() }); };
    $('showFinish').onclick = () => send('showFinish');
    $('showIllustration').onclick = () => { $('showDrawing').hidden = !$('showDrawing').hidden; };
    requestAnimationFrame(tickPhone);
  }
  async function send(action, payload = {}) {
    const { $, state, room, pid, locale } = phone;
    if (!state?.showGame || !phone.connected || phone.pending || state.selfActive === false) return;
    const round = state.showGame;
    phone.pending = true; $('showFeedback').textContent = '';
    try {
      const response = await fetch('./api/' + action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ room, pid, round: round.id, v: round.version, actionId: crypto.randomUUID(), ...payload }), signal: AbortSignal.timeout(8000) });
      const result = await response.json();
      $('showFeedback').textContent = response.ok ? action === 'showGuess' ? t(locale, result.correct ? 'correct' : 'wrong') : '' : result.error || t(locale, 'error');
      if (response.ok && action === 'showGuess') $('showGuessText').value = '';
    } catch { $('showFeedback').textContent = t(locale, 'error'); }
    phone.pending = false; renderPhone(phone.state, phone.connected);
  }
  function renderPhone(state, connected) {
    if (!phone || !state.showGame) return;
    const { $, locale } = phone, round = state.showGame, mine = state.showMine ?? { audience: true };
    phone.state = state; phone.connected = connected; phone.deadline = performance.now() + round.remainingMs;
    if (phone.key !== round.id) { phone.key = round.id; $('showGuessText').value = ''; $('showFeedback').textContent = ''; $('showDrawing').hidden = true; }
    $('showPhase').textContent = t(locale, round.phase);
    $('showLead').textContent = mine.audience ? t(locale, 'audience') : round.phase === 'volunteer' ? t(locale, mine.volunteered ? 'volunteered' : 'volunteerLead') : round.phase === 'act' ? t(locale, mine.actor ? 'actorLead' : mine.solved ? 'solved' : 'guessLead') : round.word ? t(locale, 'word', { word: pick(round.word, locale) }) : t(locale, 'noActor');
    $('showVolunteer').hidden = round.phase !== 'volunteer' || mine.audience || mine.volunteered; $('showVolunteer').textContent = t(locale, 'volunteerButton');
    $('showActorWord').hidden = round.phase !== 'act' || !mine.actor; $('showActorWord').textContent = mine.actor ? pick(mine.word, locale) : '';
    $('showIllustration').hidden = round.phase !== 'act' || !mine.actor; $('showIllustration').textContent = t(locale, 'illustration');
    $('showDrawing').innerHTML = mine.actor && paths[mine.illustration] ? `<svg viewBox="0 0 120 100" role="img" aria-label="${pick(mine.word, locale)}" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">${paths[mine.illustration]}</svg>` : '';
    $('showFinish').hidden = round.phase !== 'act' || !mine.actor; $('showFinish').textContent = t(locale, 'finish');
    $('showGuessForm').hidden = round.phase !== 'act' || mine.actor || mine.solved || mine.audience;
    $('showGuessLabel').textContent = t(locale, 'guessLabel'); $('showGuessButton').textContent = t(locale, 'guess');
    for (const id of ['showVolunteer','showFinish','showGuessButton']) $(id).disabled = !connected || phone.pending || state.selfActive === false;
    $('showClock').hidden = round.phase === 'result';
  }
  function tickPhone() { if (phone) phone.$('showClock').textContent = t(phone.locale, 'seconds', { count: Math.ceil(Math.max(0, phone.deadline - performance.now()) / 1000) }); requestAnimationFrame(tickPhone); }
  return { t, initHost, renderHost, initPhone, renderPhone };
})();
