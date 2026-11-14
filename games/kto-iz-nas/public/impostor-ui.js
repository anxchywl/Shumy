window.ImpostorUi = (() => {
  const copy = {
    ru: { game: 'Самозванец', description: 'Дай подсказку, найди игрока с другой темой.', lobby: '4–12 игроков. За столом все получают близкие темы; один получает другую. По очереди дайте подсказку, затем голосуйте.', clue: 'Подсказки по очереди', review: 'Проверка ведущего', vote: 'Ищем самозванца', reveal: 'Самозванец раскрыт', result: 'Итог стола', turn: 'Сейчас говорит {name}', wait: 'Жди своей очереди. Твоя тема остаётся на экране.', clueLead: 'Дай короткую подсказку о своей теме, не называя её.', reviewLead: 'Ведущий проверяет подсказки.', voteLead: 'Кто получил другую тему? Выбери игрока за своим столом.', revealLead: 'Самозванец может угадать общую тему.', audience: 'Ты присоединился после начала. Смотри этот раунд.', topic: 'Твоя тема: {word}', clueLabel: 'Подсказка до 70 знаков', submit: 'Отправить подсказку', skip: 'Пропустить', voteSkip: 'Не голосовать', guessLabel: 'Общая тема', guess: 'Отправить догадку', guessSent: 'Догадка принята', hide: 'Скрыть подсказку', restore: 'Вернуть подсказку', advanceClue: 'Пропустить текущие подсказки', advanceReview: 'Показать подсказки', advanceVote: 'Открыть самозванца', advanceReveal: 'Открыть общую тему', next: 'Следующий раунд', back: 'В лобби', table: 'Стол {number}', progress: 'Подсказок: {done} из {total}', votes: 'Голосов: {count}', impostor: 'Самозванец: {name}', suspects: 'Подозреваемые: {names}', noVotes: 'Никто не голосовал', group: 'Общая тема: {word}', other: 'Другая тема: {word}', correct: 'Догадка верна', wrong: 'Догадка неверна', seconds: 'Осталось {count} с', error: 'Не удалось отправить. Проверь связь и попробуй снова.' },
    en: { game: 'The Impostor', description: 'Give a clue and find the player with a different topic.', lobby: '4–12 players. Each table shares a topic; one player gets a related one. Give clues in turn, then vote.', clue: 'Taking turns with clues', review: 'Host review', vote: 'Find the impostor', reveal: 'Impostor revealed', result: 'Table result', turn: '{name} is up', wait: 'Wait for your turn. Your topic stays visible.', clueLead: 'Give a short clue about your topic without naming it.', reviewLead: 'The host checks clues.', voteLead: 'Who got a different topic? Pick someone at your table.', revealLead: 'The impostor may guess the shared topic.', audience: 'You joined after the start. Watch this round.', topic: 'Your topic: {word}', clueLabel: 'Clue, up to 70 characters', submit: 'Submit clue', skip: 'Skip', voteSkip: 'Do not vote', guessLabel: 'Shared topic', guess: 'Submit guess', guessSent: 'Guess received', hide: 'Hide clue', restore: 'Restore clue', advanceClue: 'Skip current clues', advanceReview: 'Show clues', advanceVote: 'Reveal impostor', advanceReveal: 'Reveal shared topic', next: 'Next round', back: 'Back to lobby', table: 'Table {number}', progress: 'Clues: {done} of {total}', votes: 'Votes: {count}', impostor: 'Impostor: {name}', suspects: 'Suspects: {names}', noVotes: 'Nobody voted', group: 'Shared topic: {word}', other: 'Other topic: {word}', correct: 'Correct guess', wrong: 'Wrong guess', seconds: '{count} s left', error: 'Could not send. Check your connection and try again.' },
    kk: { game: 'Жалған ойыншы', description: 'Ишара беріп, басқа тақырып алған ойыншыны тап.', lobby: '4–12 ойыншы. Үстелде ортақ тақырып беріледі, біреуіне ұқсас басқа тақырып түседі. Кезекпен ишара беріп, дауыс бер.', clue: 'Кезекпен ишара береміз', review: 'Жүргізуші тексереді', vote: 'Жалған ойыншыны іздейміз', reveal: 'Жалған ойыншы ашылды', result: 'Үстел нәтижесі', turn: '{name} кезегі', wait: 'Кезегіңді күт. Тақырыбың экранда қалады.', clueLead: 'Тақырыбыңды атамай, қысқа ишара бер.', reviewLead: 'Жүргізуші ишараларды тексереді.', voteLead: 'Кім басқа тақырып алды? Өз үстеліңнен таңда.', revealLead: 'Жалған ойыншы ортақ тақырыпты таба алады.', audience: 'Сен басталғаннан кейін қосылдың. Бұл раундты бақыла.', topic: 'Сенің тақырыбың: {word}', clueLabel: 'Ишара, 70 таңбаға дейін', submit: 'Ишараны жіберу', skip: 'Өткізу', voteSkip: 'Дауыс бермеу', guessLabel: 'Ортақ тақырып', guess: 'Болжамды жіберу', guessSent: 'Болжам қабылданды', hide: 'Ишараны жасыру', restore: 'Ишараны қайтару', advanceClue: 'Қазіргі ишараларды өткізу', advanceReview: 'Ишараларды көрсету', advanceVote: 'Жалған ойыншыны ашу', advanceReveal: 'Ортақ тақырыпты ашу', next: 'Келесі раунд', back: 'Бөлмеге оралу', table: 'Үстел {number}', progress: 'Ишара: {done}/{total}', votes: 'Дауыс: {count}', impostor: 'Жалған ойыншы: {name}', suspects: 'Күдіктілер: {names}', noVotes: 'Ешкім дауыс бермеді', group: 'Ортақ тақырып: {word}', other: 'Басқа тақырып: {word}', correct: 'Дұрыс таптың', wrong: 'Болжам қате', seconds: '{count} с қалды', error: 'Жіберілмеді. Байланысты тексеріп, қайта көр.' },
  };
  const t = (locale, key, values = {}) => ((copy[locale] ?? copy.ru)[key] ?? copy.ru[key] ?? '').replace(/\{(\w+)\}/g, (_, name) => values[name] ?? '');
  const pick = (value, locale) => typeof value === 'string' ? value : value?.[locale] ?? value?.ru ?? '';
  let host, phone;
  function el(tag, content) { const node = document.createElement(tag); node.textContent = content; return node; }
  function initHost(options) {
    host = { ...options, deadline: 0 };
    const { $, api, state } = host;
    $('impostorAdvance').onclick = () => { const round = state().impostor; api('impostorAdvance', { round: round.id, v: round.version }); };
    $('impostorNext').onclick = () => { const round = state().impostor; api('impostorNext', { round: round.id, v: round.version }); };
    $('impostorLobby').onclick = () => api('lobby');
    $('impostorTables').onclick = event => { const button = event.target.closest('[data-table][data-index]'); if (!button) return; const round = state().impostor;
      api('impostorHide', { round: round.id, v: round.version, table: button.dataset.table, index: Number(button.dataset.index), hidden: button.dataset.hidden === 'true' }); };
    requestAnimationFrame(tickHost);
  }
  function renderHost(state) {
    if (!host || !state.impostor) return;
    const { $, locale } = host, round = state.impostor;
    host.deadline = performance.now() + round.remainingMs;
    $('impostorTitle').textContent = t(locale, round.phase);
    $('impostorClock').hidden = ['clue','review','result'].includes(round.phase);
    $('impostorTables').replaceChildren(...round.tables.map(table => {
      const card = document.createElement('div'); card.className = 'duel-card';
      card.append(el('h2', t(locale, 'table', { number: table.index + 1 })));
      card.append(el('p', table.people.map(person => person.name).join(', ')));
      if (round.phase === 'clue') card.append(el('p', `${t(locale, 'progress', { done: table.step, total: table.total })} · ${table.turn ? t(locale, 'turn', { name: table.turn }) : ''}`));
      if (round.phase === 'review') {
        const reviewed = state.impostorHost?.find(item => item.id === table.id);
        for (const clue of reviewed?.clues ?? []) { const row = document.createElement('div'); row.append(el('p', `${clue.by}: ${pick(clue.text, locale)}`));
          if (!clue.fallback) { const button = el('button', t(locale, clue.hidden ? 'restore' : 'hide')); button.type = 'button'; button.dataset.table = table.id; button.dataset.index = clue.index; button.dataset.hidden = String(!clue.hidden); row.append(button); } card.append(row); }
      }
      if (table.clues) for (const clue of table.clues) card.append(el('p', `${clue.by}: ${pick(clue.text, locale)}`));
      if (round.phase === 'vote') card.append(el('p', t(locale, 'votes', { count: table.voters })));
      if (table.impostor) card.append(el('p', t(locale, 'impostor', { name: table.people.find(person => person.id === table.impostor)?.name ?? '' })));
      if (table.result) card.append(el('p', table.result.suspects.length ? t(locale, 'suspects', { names: table.result.suspects.map(id => table.people.find(person => person.id === id)?.name).join(', ') }) : t(locale, 'noVotes')));
      if (table.groupWord) card.append(el('p', t(locale, 'group', { word: pick(table.groupWord, locale) })));
      if (table.impostorWord) card.append(el('p', t(locale, 'other', { word: pick(table.impostorWord, locale) })));
      if (table.guessCorrect !== null && table.guessCorrect !== undefined) card.append(el('p', `${table.guess ?? ''} · ${t(locale, table.guessCorrect ? 'correct' : 'wrong')}`));
      return card;
    }));
    $('impostorAdvance').hidden = round.phase === 'result'; $('impostorAdvance').textContent = t(locale, { clue:'advanceClue', review:'advanceReview', vote:'advanceVote', reveal:'advanceReveal' }[round.phase] ?? 'next');
    $('impostorNext').hidden = round.phase !== 'result'; $('impostorNext').textContent = t(locale, 'next'); $('impostorLobby').textContent = t(locale, 'back');
  }
  function tickHost() { if (host) host.$('impostorClock').textContent = t(host.locale, 'seconds', { count: Math.ceil(Math.max(0, host.deadline - performance.now()) / 1000) }); requestAnimationFrame(tickHost); }
  function initPhone(options) {
    phone = { ...options, state: null, connected: false, pending: false, deadline: 0, key: '' };
    const { $ } = phone;
    $('impostorClueForm').onsubmit = event => { event.preventDefault(); send('impostorClue', { text: $('impostorClueText').value.trim() }); };
    $('impostorSkip').onclick = () => send('impostorClue', { skip: true });
    $('impostorChoices').onclick = event => { const button = event.target.closest('[data-target]'); if (button) send('impostorVote', { target: button.dataset.target || null }); };
    $('impostorGuessForm').onsubmit = event => { event.preventDefault(); send('impostorGuess', { text: $('impostorGuessText').value.trim() }); };
    requestAnimationFrame(tickPhone);
  }
  async function send(action, payload) {
    const { $, state, room, pid, locale } = phone;
    if (!state?.impostor || !phone.connected || phone.pending || state.selfActive === false) return;
    const round = state.impostor, mine = state.impostorMine;
    phone.pending = true; $('impostorFeedback').textContent = '';
    const body = { room, pid, round: round.id, v: round.version, actionId: crypto.randomUUID(), ...payload };
    if (action === 'impostorClue') { body.step = mine.step; body.tableVersion = mine.tableVersion; }
    try { const response = await fetch('./api/' + action, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body), signal:AbortSignal.timeout(8000) });
      const result = await response.json(); if (!response.ok) $('impostorFeedback').textContent = result.error || t(locale, 'error');
    } catch { $('impostorFeedback').textContent = t(locale, 'error'); }
    phone.pending = false; renderPhone(phone.state, phone.connected);
  }
  function renderPhone(state, connected) {
    if (!phone || !state.impostor) return;
    const { $, locale } = phone, round = state.impostor, mine = state.impostorMine ?? { audience:true };
    phone.state = state; phone.connected = connected; phone.deadline = performance.now() + round.remainingMs;
    if (phone.key !== round.id) { phone.key = round.id; $('impostorClueText').value = ''; $('impostorGuessText').value = ''; $('impostorFeedback').textContent = ''; }
    const table = round.tables.find(item => item.id === mine.table);
    $('impostorPhase').textContent = `${t(locale, round.phase)}${table ? ` · ${t(locale, 'table', { number:table.index+1 })}` : ''}`;
    $('impostorPrompt').hidden = !mine.prompt; $('impostorPrompt').textContent = mine.prompt ? t(locale, 'topic', { word:pick(mine.prompt, locale) }) : '';
    $('impostorLead').textContent = mine.audience ? t(locale, 'audience') : round.phase === 'clue' ? t(locale, mine.turn ? 'clueLead' : 'wait') : round.phase === 'result' ? t(locale, 'result') : t(locale, `${round.phase}Lead`);
    $('impostorClueForm').hidden = round.phase !== 'clue' || !mine.turn; $('impostorClueLabel').textContent = t(locale, 'clueLabel'); $('impostorClueButton').textContent = t(locale, 'submit'); $('impostorSkip').textContent = t(locale, 'skip');
    $('impostorChoices').hidden = round.phase !== 'vote' || mine.audience;
    if (round.phase === 'vote' && table) $('impostorChoices').replaceChildren(...[...table.people.filter(person => person.id !== state.selfId).map(person => ({ id:person.id, name:person.name })), { id:'', name:t(locale,'voteSkip') }].map(person => {
      const button = el('button', person.name); button.type='button'; button.dataset.target=person.id; button.setAttribute('aria-pressed', String(mine.voted && mine.vote === (person.id || null))); button.disabled = !connected || phone.pending || state.selfActive === false; return button; }));
    $('impostorGuessForm').hidden = round.phase !== 'reveal' || !mine.impostor || mine.guessed;
    $('impostorGuessLabel').textContent = t(locale, 'guessLabel'); $('impostorGuessButton').textContent = t(locale, 'guess');
    $('impostorResult').hidden = !['reveal','result'].includes(round.phase);
    $('impostorResult').replaceChildren(...(table && ['reveal','result'].includes(round.phase) ? [el('p', t(locale, 'impostor', { name:table.people.find(person => person.id === table.impostor)?.name ?? '' })), ...(table.groupWord ? [el('p', t(locale, 'group', { word:pick(table.groupWord, locale) }))] : [])] : []));
    for (const id of ['impostorClueButton','impostorSkip','impostorGuessButton']) $(id).disabled = !connected || phone.pending || state.selfActive === false;
    $('impostorClock').hidden = ['review','result'].includes(round.phase);
    if (round.phase === 'clue' && table) phone.deadline = performance.now() + table.clueRemainingMs;
  }
  function tickPhone() { if (phone) phone.$('impostorClock').textContent = t(phone.locale, 'seconds', { count: Math.ceil(Math.max(0, phone.deadline - performance.now()) / 1000) }); requestAnimationFrame(tickPhone); }
  return { t, initHost, renderHost, initPhone, renderPhone };
})();
