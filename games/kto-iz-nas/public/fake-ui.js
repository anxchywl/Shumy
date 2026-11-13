window.FakeUi = (() => {
  const copy = {
    ru: { game: 'Фальшивое определение', description: 'Придумай значение слова и найди настоящее.', lobby: '3–8 игроков. Напиши ложное определение, затем найди настоящее.', write: 'Придумываем определения', review: 'Проверка ведущего', vote: 'Ищем настоящее', result: 'Настоящее определение', writeLead: 'Напиши правдоподобное определение. До 110 знаков.', sent: 'Определение принято. Жди остальных.', reviewLead: 'Ведущий проверяет определения.', voteLead: 'Выбери настоящее определение. Авторы пока скрыты.', voted: 'Выбор принят. До конца времени его можно изменить.', audience: 'Ты присоединился после начала раунда. Смотри за игрой.', text: 'Твоё определение', submit: 'Отправить', advanceWrite: 'Проверить определения', advanceReview: 'Показать определения', advanceVote: 'Открыть ответ', next: 'Следующее слово', back: 'В лобби', hide: 'Скрыть', restore: 'Вернуть', correct: 'Верно', fake: 'Выдумано', by: 'Авторы', source: 'Источник определения', count: 'Ответов: {count} из {total}', votes: 'Выборов: {count}', seconds: 'Осталось {count} с', error: 'Не удалось отправить. Проверь связь и попробуй снова.' },
    en: { game: 'Fake Definition', description: 'Invent a meaning, then find the real one.', lobby: '3–8 players. Write a fake definition, then find the real one.', write: 'Writing definitions', review: 'Host review', vote: 'Find the real meaning', result: 'The real definition', writeLead: 'Write a plausible definition, up to 110 characters.', sent: 'Definition received. Waiting for others.', reviewLead: 'The host is checking definitions.', voteLead: 'Pick the real definition. Authors are hidden for now.', voted: 'Choice received. You can change it before time runs out.', audience: 'You joined after the round started. Watch this round.', text: 'Your definition', submit: 'Submit', advanceWrite: 'Review definitions', advanceReview: 'Show definitions', advanceVote: 'Reveal answer', next: 'Next word', back: 'Back to lobby', hide: 'Hide', restore: 'Restore', correct: 'Real', fake: 'Invented', by: 'Authors', source: 'Definition source', count: 'Definitions: {count} of {total}', votes: 'Choices: {count}', seconds: '{count} s left', error: 'Could not send. Check your connection and try again.' },
    kk: { game: 'Жалған анықтама', description: 'Мағына ойлап тап та, шын анықтаманы тап.', lobby: '3–8 ойыншы. Жалған анықтама жазып, шындықты тап.', write: 'Анықтама жазылып жатыр', review: 'Жүргізуші тексереді', vote: 'Шын мағынаны іздейміз', result: 'Шын анықтама', writeLead: 'Шындыққа ұқсас анықтама жаз. 110 таңбаға дейін.', sent: 'Анықтама қабылданды. Басқаларды күт.', reviewLead: 'Жүргізуші анықтамаларды тексереді.', voteLead: 'Шын анықтаманы таңда. Авторлар әзірге жасырын.', voted: 'Таңдау қабылданды. Уақыт біткенше өзгерте аласың.', audience: 'Сен раунд басталғаннан кейін қосылдың. Бұл раундты бақыла.', text: 'Сенің анықтамаң', submit: 'Жіберу', advanceWrite: 'Анықтамаларды тексеру', advanceReview: 'Анықтамаларды көрсету', advanceVote: 'Жауапты ашу', next: 'Келесі сөз', back: 'Бөлмеге оралу', hide: 'Жасыру', restore: 'Қайтару', correct: 'Шын', fake: 'Ойдан шығарылған', by: 'Авторлар', source: 'Анықтама көзі', count: 'Анықтамалар: {count}/{total}', votes: 'Таңдаулар: {count}', seconds: '{count} с қалды', error: 'Жіберілмеді. Байланысты тексеріп, қайта көр.' },
  };
  const t = (locale, key, values = {}) => (copy[locale] ?? copy.ru)[key].replace(/\{(\w+)\}/g, (_, name) => values[name] ?? '');
  const pick = (value, locale) => typeof value === 'string' ? value : value?.[locale] ?? value?.ru ?? '';
  let host;
  let phone;
  function paragraph(value) { const p = document.createElement('p'); p.textContent = value; return p; }
  function choiceCard(choice, locale, result) {
    const card = document.createElement('div');
    card.className = 'duel-card';
    card.append(paragraph(pick(choice.text, locale)));
    if (result) card.append(paragraph(`${t(locale, choice.real ? 'correct' : 'fake')} · ${result.counts[choice.id]}${choice.authors?.length ? ` · ${t(locale, 'by')}: ${choice.authors.join(', ')}` : ''}`));
    return card;
  }
  function initHost(options) {
    host = { ...options, deadline: 0 };
    const { $, api, state } = host;
    $('fakeAdvance').onclick = () => { const round = state().fake; api('fakeAdvance', { round: round.id, v: round.version }); };
    $('fakeNext').onclick = () => { const round = state().fake; api('fakeNext', { round: round.id, v: round.version }); };
    $('fakeLobby').onclick = () => api('lobby');
    $('fakeCards').onclick = event => {
      const button = event.target.closest('[data-author]');
      if (!button) return;
      const round = state().fake;
      api('fakeHide', { round: round.id, v: round.version, author: button.dataset.author, hidden: button.dataset.hidden === 'true' });
    };
    requestAnimationFrame(tickHost);
  }
  function renderHost(state) {
    if (!host || !state.fake) return;
    const { $, locale } = host;
    const round = state.fake;
    host.deadline = performance.now() + round.deadlineInMs;
    $('fakeRound').textContent = `${round.number}`;
    $('fakePhase').textContent = t(locale, round.phase);
    $('fakeWord').textContent = pick(round.word, locale);
    $('fakeClock').hidden = ['review', 'result'].includes(round.phase);
    $('fakeStatus').textContent = round.phase === 'write' ? t(locale, 'count', { count: round.submitted, total: round.eligible }) : round.phase === 'vote' ? t(locale, 'votes', { count: round.voters }) : '';
    const cards = round.phase === 'review' ? (state.fakeHost?.submissions ?? []).map(item => {
      const card = choiceCard({ text: item.text }, locale);
      card.prepend(paragraph(item.name));
      const button = document.createElement('button');
      button.type = 'button'; button.dataset.author = item.id; button.dataset.hidden = String(!item.hidden); button.textContent = t(locale, item.hidden ? 'restore' : 'hide');
      card.append(button);
      return card;
    }) : (round.choices ?? []).map(choice => choiceCard(choice, locale, round.result));
    $('fakeCards').replaceChildren(...cards);
    $('fakeAdvance').hidden = round.phase === 'result';
    $('fakeAdvance').textContent = t(locale, { write: 'advanceWrite', review: 'advanceReview', vote: 'advanceVote' }[round.phase] ?? 'next');
    $('fakeNext').hidden = round.phase !== 'result'; $('fakeNext').textContent = t(locale, 'next'); $('fakeLobby').textContent = t(locale, 'back');
    $('fakeSource').hidden = round.phase !== 'result';
    if (round.phase === 'result') { $('fakeSource').href = round.result.source; $('fakeSource').textContent = t(locale, 'source'); }
  }
  function tickHost() {
    if (host) host.$('fakeClock').textContent = t(host.locale, 'seconds', { count: Math.ceil(Math.max(0, host.deadline - performance.now()) / 1000) });
    requestAnimationFrame(tickHost);
  }
  function initPhone(options) {
    phone = { ...options, state: null, connected: false, pending: false, deadline: 0, round: '' };
    const { $ } = phone;
    $('fakeForm').onsubmit = event => { event.preventDefault(); send('fakeWrite', { text: $('fakeText').value.trim() }); };
    $('fakeChoices').onclick = event => { const button = event.target.closest('[data-choice]'); if (button) send('fakeVote', { choice: button.dataset.choice }); };
    requestAnimationFrame(tickPhone);
  }
  async function send(action, payload) {
    const { $, state, room, pid, locale } = phone;
    if (!state?.fake || !phone.connected || state.selfActive === false || phone.pending) return;
    const round = state.fake;
    const body = { room, pid, round: round.id, v: round.version, actionId: crypto.randomUUID(), ...payload };
    phone.pending = true;
    $('fakeFeedback').textContent = '';
    renderPhone(state, phone.connected);
    try {
      const response = await fetch('./api/' + action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(8000) });
      const result = await response.json();
      if (!response.ok) $('fakeFeedback').textContent = result.error || t(locale, 'error');
    } catch { $('fakeFeedback').textContent = t(locale, 'error'); }
    phone.pending = false;
    renderPhone(phone.state, phone.connected);
  }
  function renderPhone(state, connected) {
    if (!phone || !state.fake) return;
    const { $, locale } = phone;
    phone.state = state; phone.connected = connected;
    const round = state.fake, mine = state.fakeMine ?? { audience: true };
    phone.deadline = performance.now() + round.deadlineInMs;
    if (phone.round !== round.id) { phone.round = round.id; $('fakeText').value = ''; $('fakeFeedback').textContent = ''; }
    $('fakePhase').textContent = t(locale, round.phase);
    $('fakeWord').textContent = pick(round.word, locale);
    $('fakeLead').textContent = mine.audience ? t(locale, 'audience') : round.phase === 'write' ? t(locale, mine.submitted ? 'sent' : 'writeLead') : round.phase === 'review' ? t(locale, 'reviewLead') : round.phase === 'vote' ? t(locale, mine.vote === undefined ? 'voteLead' : 'voted') : t(locale, 'result');
    $('fakeForm').hidden = round.phase !== 'write' || mine.audience || mine.submitted;
    $('fakeTextLabel').textContent = t(locale, 'text'); $('fakeSubmit').textContent = t(locale, 'submit');
    $('fakeSubmit').disabled = !connected || phone.pending || state.selfActive === false;
    $('fakeChoices').hidden = round.phase !== 'vote' || mine.audience;
    if (round.phase === 'vote') $('fakeChoices').replaceChildren(...round.choices.filter(choice => !mine.ownChoices.includes(choice.id)).map(choice => {
      const button = document.createElement('button'); button.type = 'button'; button.dataset.choice = choice.id; button.textContent = pick(choice.text, locale);
      button.setAttribute('aria-pressed', String(mine.vote === choice.id)); button.disabled = !connected || phone.pending || state.selfActive === false; return button;
    }));
    $('fakeResult').hidden = round.phase !== 'result';
    if (round.phase === 'result') $('fakeResult').replaceChildren(...round.choices.map(choice => choiceCard(choice, locale, round.result)));
    $('fakeClock').hidden = ['review', 'result'].includes(round.phase);
  }
  function tickPhone() {
    if (phone) phone.$('fakeClock').textContent = t(phone.locale, 'seconds', { count: Math.ceil(Math.max(0, phone.deadline - performance.now()) / 1000) });
    requestAnimationFrame(tickPhone);
  }
  return { t, initHost, renderHost, initPhone, renderPhone };
})();
