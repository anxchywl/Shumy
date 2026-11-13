window.DuelUi = (() => {
  const copy = {
    ru: {
      game: 'Дуэль нелепых ответов', description: 'Два ответа, один выбор зала.', lobbyMode: 'Двое добровольцев отвечают на один вопрос. Остальные выбирают любимый ответ.',
      volunteer: 'Ищем добровольцев', compose: 'Пишем ответы', review: 'Проверка ведущего', vote: 'Выбор зала', result: 'Итог дуэли',
      volunteerLead: 'Хочешь ответить? Нажми кнопку. Нужны два добровольца.', volunteered: 'Ты вызвался. Ждём второго игрока.',
      composeLead: 'Ты участник дуэли. Напиши короткий ответ.', composeWait: 'Участники пишут ответы. Скоро голосование.',
      reviewLead: 'Ведущий проверяет ответы перед показом.', voteLead: 'Выбери ответ, который нравится больше. Авторы пока скрыты.',
      contestantVote: 'Ты участник дуэли и не голосуешь.', resultLead: 'Авторы ответов открыты.', noVolunteers: 'Никто не вызвался. Ведущий может начать новую дуэль.',
      volunteers: 'Добровольцев: {count} из 2', submitted: 'Ответов: {count} из {total}', voted: 'Проголосовали: {count}',
      volunteerButton: 'Я отвечу', textLabel: 'Твой ответ, до 90 знаков', submit: 'Отправить ответ', answerSent: 'Ответ принят. Ждём второго участника.',
      voteSent: 'Голос принят. Пока время не вышло, можно изменить выбор.', noVote: 'Не голосовать',
      inspect: 'Проверить ответы', show: 'Показать ответы и начать голосование', closeVote: 'Закрыть голосование',
      choose: 'Выбрать добровольцев', next: 'Следующая дуэль', lobby: 'В лобби',
      fallback: 'Готовый ответ', hidden: 'Ответ скрыт, показывается готовый', hide: 'Заменить готовым ответом', restore: 'Вернуть ответ',
      card: 'Ответ {number}', by: 'Автор: {name}', tie: 'Ничья', winner: 'Любимый ответ', noVotes: 'Никто не голосовал',
      time: 'Осталось {seconds} с', round: 'Дуэль {number}', sendFailed: 'Не удалось отправить. Проверь связь и попробуй снова.',
    },
    en: {
      game: 'Duel of Absurd Answers', description: 'Two answers, one crowd choice.', lobbyMode: 'Two volunteers answer the same prompt. Everyone else picks a favorite.',
      volunteer: 'Looking for volunteers', compose: 'Writing answers', review: 'Host review', vote: 'Crowd vote', result: 'Duel result',
      volunteerLead: 'Want to answer? Press the button. We need two volunteers.', volunteered: 'You volunteered. Waiting for another player.',
      composeLead: 'You are a contestant. Write a short answer.', composeWait: 'Contestants are writing. Voting comes next.',
      reviewLead: 'The host checks answers before showing them.', voteLead: 'Pick the answer you like more. Authors stay hidden for now.',
      contestantVote: 'You are a contestant and do not vote.', resultLead: 'The authors are now revealed.', noVolunteers: 'Nobody volunteered. The host can start another duel.',
      volunteers: 'Volunteers: {count} of 2', submitted: 'Answers: {count} of {total}', voted: 'Voted: {count}',
      volunteerButton: 'I will answer', textLabel: 'Your answer, up to 90 characters', submit: 'Submit answer', answerSent: 'Answer received. Waiting for the other contestant.',
      voteSent: 'Vote received. You can change it while time remains.', noVote: 'Do not vote',
      inspect: 'Review answers', show: 'Show answers and start voting', closeVote: 'Close vote',
      choose: 'Select volunteers', next: 'Next duel', lobby: 'Back to lobby',
      fallback: 'Ready answer', hidden: 'Answer hidden; a ready answer will show', hide: 'Use ready answer', restore: 'Restore answer',
      card: 'Answer {number}', by: 'Author: {name}', tie: 'Tie', winner: 'Favorite answer', noVotes: 'Nobody voted',
      time: '{seconds} s left', round: 'Duel {number}', sendFailed: 'Could not send. Check your connection and try again.',
    },
    kk: {
      game: 'Күлкілі жауаптар жекпе-жегі', description: 'Екі жауап, залдың бір таңдауы.', lobbyMode: 'Екі ерікті бір сұраққа жауап береді. Қалғандары ұнағанын таңдайды.',
      volunteer: 'Еріктілерді күтеміз', compose: 'Жауап жазылып жатыр', review: 'Жүргізуші тексереді', vote: 'Зал дауысы', result: 'Жекпе-жек нәтижесі',
      volunteerLead: 'Жауап бергің келе ме? Түймені бас. Екі ерікті керек.', volunteered: 'Сен ерікті болдың. Екінші ойыншыны күтеміз.',
      composeLead: 'Сен қатысушысың. Қысқа жауап жаз.', composeWait: 'Қатысушылар жауап жазып жатыр. Жақында дауыс береміз.',
      reviewLead: 'Жүргізуші жауаптарды көрсетпес бұрын тексереді.', voteLead: 'Ұнаған жауапты таңда. Авторлар әзірге жасырын.',
      contestantVote: 'Сен қатысушысың, дауыс бермейсің.', resultLead: 'Жауап авторлары ашылды.', noVolunteers: 'Ешкім шықпады. Жүргізуші жаңа жекпе-жек бастай алады.',
      volunteers: 'Еріктілер: {count}/2', submitted: 'Жауаптар: {count}/{total}', voted: 'Дауыс берді: {count}',
      volunteerButton: 'Мен жауап беремін', textLabel: 'Жауабың, 90 таңбаға дейін', submit: 'Жауапты жіберу', answerSent: 'Жауап қабылданды. Екінші қатысушыны күтеміз.',
      voteSent: 'Дауыс қабылданды. Уақыт біткенше өзгертуге болады.', noVote: 'Дауыс бермеу',
      inspect: 'Жауаптарды тексеру', show: 'Жауаптарды көрсетіп, дауыс беруді бастау', closeVote: 'Дауысты жабу',
      choose: 'Еріктілерді таңдау', next: 'Келесі жекпе-жек', lobby: 'Бөлмеге оралу',
      fallback: 'Дайын жауап', hidden: 'Жауап жасырылды, дайын жауап көрсетіледі', hide: 'Дайын жауапқа ауыстыру', restore: 'Жауапты қайтару',
      card: 'Жауап {number}', by: 'Автор: {name}', tie: 'Тең', winner: 'Сүйікті жауап', noVotes: 'Ешкім дауыс бермеді',
      time: '{seconds} с қалды', round: 'Жекпе-жек {number}', sendFailed: 'Жіберілмеді. Байланысты тексеріп, қайта көр.',
    },
  };
  const t = (locale, key, values = {}) => (copy[locale] ?? copy.ru)[key].replace(/\{(\w+)\}/g, (_, name) => values[name] ?? '');
  const pick = (value, locale) => typeof value === 'string' ? value : value?.[locale] ?? value?.ru ?? '';
  let host = null;
  let phone = null;

  function card(locale, entry, options = {}) {
    const panel = document.createElement('div');
    panel.className = 'duel-card';
    const title = document.createElement('strong');
    title.textContent = t(locale, 'card', { number: entry.index + 1 });
    const body = document.createElement('p');
    body.textContent = pick(entry.text, locale);
    panel.append(title, body);
    if (entry.author) {
      const by = document.createElement('small');
      by.textContent = t(locale, 'by', { name: entry.author });
      panel.append(by);
    } else if (entry.fallback) {
      const label = document.createElement('small');
      label.textContent = t(locale, 'fallback');
      panel.append(label);
    }
    if (options.hide) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.hide = String(entry.index);
      button.dataset.hidden = String(!options.hidden);
      button.textContent = t(locale, options.hidden ? 'restore' : 'hide');
      panel.append(button);
    }
    if (options.count !== undefined) {
      const count = document.createElement('small');
      count.textContent = String(options.count);
      panel.append(count);
    }
    return panel;
  }

  function initHost(options) {
    host = { ...options, deadline: 0 };
    const { $, api, state } = host;
    $('duelAdvance').onclick = () => { const round = state().duel; api('duelAdvance', { round: round.id, v: round.version }); };
    $('duelNext').onclick = () => { const round = state().duel; api('duelNext', { round: round.id, v: round.version }); };
    $('duelLobby').onclick = () => api('lobby');
    $('duelCards').onclick = event => {
      const button = event.target.closest('[data-hide]');
      if (!button) return;
      const round = state().duel;
      api('duelHide', { round: round.id, v: round.version, index: Number(button.dataset.hide), hidden: button.dataset.hidden === 'true' });
    };
    requestAnimationFrame(tickHost);
  }
  function renderHost(state) {
    if (!host || !state.duel) return;
    const { $, locale } = host;
    const round = state.duel;
    host.deadline = performance.now() + round.deadlineInMs;
    $('duelRound').textContent = t(locale, 'round', { number: round.number });
    $('duelPhase').textContent = t(locale, round.phase);
    $('duelPrompt').textContent = pick(round.prompt, locale);
    $('duelClock').hidden = ['review', 'result'].includes(round.phase);
    $('duelStatus').textContent = round.phase === 'volunteer' ? t(locale, 'volunteers', { count: round.volunteers })
      : round.phase === 'compose' ? t(locale, 'submitted', { count: round.submitted, total: round.slots })
      : round.phase === 'review' ? t(locale, 'reviewLead')
      : round.phase === 'vote' ? t(locale, 'voted', { count: round.voters })
      : round.result.noVolunteers ? t(locale, 'noVolunteers')
      : !round.result.winners.length ? t(locale, 'noVotes')
      : `${t(locale, round.result.winners.length > 1 ? 'tie' : 'winner')}: ${round.result.winners.map(index => t(locale, 'card', { number: index + 1 })).join(', ')}`;
    const entries = round.phase === 'review' ? state.duelHost?.entries : round.entries;
    $('duelCards').hidden = !entries;
    if (entries) $('duelCards').replaceChildren(...entries.map(entry => card(locale, entry, {
      hide: round.phase === 'review' && Boolean(state.duelHost?.original[entry.index]),
      hidden: state.duelHost?.hidden[entry.index], count: round.phase === 'result' ? round.result.counts[entry.index] : undefined,
    })));
    $('duelAdvance').hidden = round.phase === 'result';
    $('duelAdvance').textContent = t(locale, ({ volunteer: 'choose', compose: 'inspect', review: 'show', vote: 'closeVote' })[round.phase] ?? 'next');
    $('duelNext').hidden = round.phase !== 'result';
    $('duelNext').textContent = t(locale, 'next');
    $('duelLobby').textContent = t(locale, 'lobby');
  }
  function tickHost() {
    if (host) host.$('duelClock').textContent = t(host.locale, 'time', { seconds: Math.ceil(Math.max(0, host.deadline - performance.now()) / 1000) });
    requestAnimationFrame(tickHost);
  }

  function initPhone(options) {
    phone = { ...options, state: null, connected: false, pending: false, deadline: 0, key: '', votesKey: '' };
    const { $ } = phone;
    $('duelVolunteer').onclick = () => send('duelVolunteer', {});
    $('duelForm').onsubmit = event => { event.preventDefault(); send('duelSubmit', { text: $('duelText').value.trim() }); };
    $('duelChoices').onclick = event => {
      const button = event.target.closest('[data-choice]');
      if (button) send('duelVote', { choice: button.dataset.choice === '' ? null : Number(button.dataset.choice) });
    };
    requestAnimationFrame(tickPhone);
  }
  async function send(action, payload) {
    const { $, state, room, pid, locale } = phone;
    if (!state?.duel || !phone.connected || state.selfActive === false || phone.pending) return;
    const round = state.duel;
    phone.pending = true;
    $('duelFeedback').textContent = '';
    renderPhone(state, phone.connected);
    try {
      const response = await fetch('./api/' + action, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room, pid, round: round.id, v: round.version, actionId: crypto.randomUUID(), ...payload }),
        signal: AbortSignal.timeout(8000),
      });
      const result = await response.json();
      if (!response.ok) $('duelFeedback').textContent = result.error || t(locale, 'sendFailed');
    } catch { $('duelFeedback').textContent = t(locale, 'sendFailed'); }
    phone.pending = false;
    renderPhone(phone.state, phone.connected);
  }
  function renderPhone(state, connected) {
    if (!phone || !state.duel) return;
    const { $, locale } = phone;
    phone.state = state;
    phone.connected = connected;
    const round = state.duel;
    const mine = state.duelMine ?? { audience: true };
    phone.deadline = performance.now() + round.deadlineInMs;
    if (phone.key !== round.id) {
      phone.key = round.id;
      $('duelText').value = '';
      $('duelFeedback').textContent = '';
    }
    $('duelPhase').textContent = `${t(locale, 'round', { number: round.number })} · ${t(locale, round.phase)}`;
    $('duelPrompt').textContent = pick(round.prompt, locale);
    const phase = round.phase;
    $('duelLead').textContent = mine.audience ? t(locale, 'audience')
      : phase === 'volunteer' ? t(locale, mine.volunteered ? 'volunteered' : 'volunteerLead')
      : phase === 'compose' ? mine.contestant ? mine.submitted ? t(locale, 'answerSent') : t(locale, 'composeLead') : t(locale, 'composeWait')
      : phase === 'review' ? t(locale, 'reviewLead')
      : phase === 'vote' ? mine.contestant ? t(locale, 'contestantVote') : mine.vote === undefined ? t(locale, 'voteLead') : t(locale, 'voteSent')
      : round.result.noVolunteers ? t(locale, 'noVolunteers') : t(locale, 'resultLead');
    $('duelVolunteer').hidden = phase !== 'volunteer' || mine.audience || mine.volunteered;
    $('duelVolunteer').textContent = t(locale, 'volunteerButton');
    $('duelForm').hidden = phase !== 'compose' || !mine.contestant || mine.submitted;
    $('duelTextLabel').textContent = t(locale, 'textLabel');
    $('duelSubmit').textContent = t(locale, 'submit');
    $('duelChoices').hidden = phase !== 'vote' || mine.contestant || mine.audience;
    const key = `${round.id}:${phase}`;
    if (phase === 'vote' && phone.votesKey !== key) {
      phone.votesKey = key;
      $('duelChoices').replaceChildren(...[...round.entries.map(entry => ({ choice: String(entry.index), label: `${t(locale, 'card', { number: entry.index + 1 })}: ${pick(entry.text, locale)}` })), { choice: '', label: t(locale, 'noVote') }].map(item => {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.choice = item.choice;
        button.textContent = item.label;
        return button;
      }));
    }
    for (const button of $('duelChoices').children) {
      button.disabled = !connected || phone.pending || state.selfActive === false;
      button.setAttribute('aria-pressed', String(mine.vote === (button.dataset.choice === '' ? null : Number(button.dataset.choice))));
    }
    $('duelVolunteer').disabled = !connected || phone.pending || state.selfActive === false;
    $('duelSubmit').disabled = !connected || phone.pending || state.selfActive === false;
    $('duelClock').hidden = ['review', 'result'].includes(phase);
    $('duelResult').hidden = phase !== 'result';
    if (phase === 'result') {
      $('duelResult').replaceChildren(...round.entries.map(entry => card(locale, entry, { count: round.result.counts[entry.index] })));
    }
  }
  function tickPhone() {
    if (phone) phone.$('duelClock').textContent = t(phone.locale, 'time', { seconds: Math.ceil(Math.max(0, phone.deadline - performance.now()) / 1000) });
    requestAnimationFrame(tickPhone);
  }
  return { t, initHost, renderHost, initPhone, renderPhone };
})();
