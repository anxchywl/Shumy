window.CrowdUi = (() => {
  const copy = {
    ru: {
      game: 'Угадай зал', description: 'Ответь и угадай, что выберет зал.', lobbyMode: 'Угадай зал. Сначала ответь, потом предскажи самый популярный вариант.',
      answer: 'Твой ответ', predict: 'Прогноз зала', result: 'Выбор зала', answerLead: 'Выбери один вариант. Ответ станет окончательным после отправки.',
      predictLead: 'Какой вариант выбрало больше всего игроков? Ответы пока скрыты.', answerSent: 'Ответ принят. Ждём прогнозы.', predictSent: 'Прогноз принят. Ждём результат.',
      audience: 'Ты зритель этого раунда. Смотри общий экран.', answered: 'Ответили: {count} из {total}', predicted: 'Предсказали: {count} из {total}',
      reveal: 'Перейти к прогнозам', showResult: 'Показать результат', next: 'Следующий вопрос', lobby: 'В лобби',
      noLeader: 'Для сравнения нужно хотя бы два ответа.', noAnswers: 'Никто не ответил.', tied: 'Поровну голосов', leader: 'Самый популярный ответ',
      points: 'За верный прогноз: +{points}', noPoints: 'На этот раз без очков', yourAnswer: 'Твой ответ принят', yourPrediction: 'Твой прогноз принят',
      sendFailed: 'Не удалось отправить. Проверь связь и нажми тот же вариант ещё раз.', stale: 'Шаг уже завершился. Смотри актуальный экран.',
      round: 'Вопрос {number}', time: 'Осталось {seconds} с',
    },
    en: {
      game: 'Guess the Crowd', description: 'Answer, then predict the crowd.', lobbyMode: 'Guess the Crowd. Answer first, then predict the most popular choice.',
      answer: 'Your answer', predict: 'Crowd prediction', result: 'The crowd chose', answerLead: 'Choose one option. Your answer locks when you send it.',
      predictLead: 'Which option did most players choose? Answers are still hidden.', answerSent: 'Answer received. Waiting for predictions.', predictSent: 'Prediction received. Waiting for the result.',
      audience: 'You are watching this round. Follow the shared screen.', answered: 'Answered: {count} of {total}', predicted: 'Predicted: {count} of {total}',
      reveal: 'Start predictions', showResult: 'Show result', next: 'Next question', lobby: 'Back to lobby',
      noLeader: 'At least two answers are needed to compare the crowd.', noAnswers: 'Nobody answered.', tied: 'Tied choices', leader: 'Most popular choice',
      points: 'Correct prediction: +{points}', noPoints: 'No points this time', yourAnswer: 'Your answer was received', yourPrediction: 'Your prediction was received',
      sendFailed: 'Could not send. Check your connection and press the same choice again.', stale: 'This step has ended. Follow the current screen.',
      round: 'Question {number}', time: '{seconds} s left',
    },
    kk: {
      game: 'Залды тап', description: 'Жауап беріп, залдың таңдауын болжа.', lobbyMode: 'Алдымен жауап бер, кейін ең танымал нұсқаны болжа.',
      answer: 'Жауабың', predict: 'Залдың болжамы', result: 'Зал таңдауы', answerLead: 'Бір нұсқаны таңда. Жіберген соң жауап бекітіледі.',
      predictLead: 'Көпшілік қай нұсқаны таңдады? Жауаптар әзірге жасырын.', answerSent: 'Жауап қабылданды. Болжамдарды күтеміз.', predictSent: 'Болжам қабылданды. Нәтижені күтеміз.',
      audience: 'Сен бұл раундта көрерменсің. Ортақ экранға қара.', answered: 'Жауап берді: {count}/{total}', predicted: 'Болжады: {count}/{total}',
      reveal: 'Болжамға көшу', showResult: 'Нәтижені көрсету', next: 'Келесі сұрақ', lobby: 'Бөлмеге оралу',
      noLeader: 'Салыстыру үшін кемінде екі жауап керек.', noAnswers: 'Ешкім жауап бермеді.', tied: 'Дауыстар тең', leader: 'Ең танымал жауап',
      points: 'Дұрыс болжам: +{points}', noPoints: 'Бұл жолы ұпай жоқ', yourAnswer: 'Жауабың қабылданды', yourPrediction: 'Болжамың қабылданды',
      sendFailed: 'Жіберілмеді. Байланысты тексеріп, сол нұсқаны қайта бас.', stale: 'Бұл кезең аяқталды. Ағымдағы экранға қара.',
      round: 'Сұрақ {number}', time: '{seconds} с қалды',
    },
  };
  const t = (locale, key, values = {}) => (copy[locale] ?? copy.ru)[key].replace(/\{(\w+)\}/g, (_, name) => values[name] ?? '');
  const pick = (value, locale) => value?.[locale] ?? value?.ru ?? '';
  let host = null;
  let phone = null;

  function choiceRow(label, count, maximum) {
    const item = document.createElement('li');
    const title = document.createElement('strong');
    title.textContent = label;
    item.append(title);
    if (count !== null) {
      const bar = document.createElement('span');
      bar.className = 'crowd-bar';
      bar.style.width = `${Math.round(count / Math.max(1, maximum) * 100)}%`;
      const number = document.createElement('span');
      number.textContent = String(count);
      item.append(bar, number);
    }
    return item;
  }

  function initHost(options) {
    host = { ...options, deadline: 0 };
    const { $ , api, state } = host;
    $('crowdAdvance').onclick = () => { const round = state().crowd; api('crowdAdvance', { round: round.id, v: round.version }); };
    $('crowdNext').onclick = () => { const round = state().crowd; api('crowdNext', { round: round.id, v: round.version }); };
    $('crowdLobby').onclick = () => api('lobby');
    requestAnimationFrame(tickHost);
  }

  function renderHost(state) {
    if (!host) return;
    const { $, locale } = host;
    const round = state.crowd;
    if (!round) return;
    host.deadline = performance.now() + round.deadlineInMs;
    $('crowdRound').textContent = t(locale, 'round', { number: round.number });
    $('crowdPhase').textContent = t(locale, round.phase);
    $('crowdQuestion').textContent = pick(round.question, locale);
    const counts = round.result?.counts ?? null;
    const maximum = counts ? Math.max(...counts) : 0;
    $('crowdOptions').replaceChildren(...round.options.map((option, index) => choiceRow(pick(option, locale), counts ? counts[index] : null, maximum)));
    $('crowdStatus').textContent = round.phase === 'answer' ? t(locale, 'answered', { count: round.answered, total: round.eligible })
      : round.phase === 'predict' ? t(locale, 'predicted', { count: round.predicted, total: round.eligible })
      : round.result.answers < 2 ? t(locale, round.result.answers ? 'noLeader' : 'noAnswers')
      : `${t(locale, round.result.leaders.length > 1 ? 'tied' : 'leader')}: ${round.result.leaders.map(index => pick(round.options[index], locale)).join(', ')}`;
    $('crowdClock').hidden = round.phase === 'result';
    $('crowdAdvance').hidden = round.phase === 'result';
    $('crowdAdvance').textContent = t(locale, round.phase === 'answer' ? 'reveal' : 'showResult');
    $('crowdNext').hidden = round.phase !== 'result';
    $('crowdNext').textContent = t(locale, 'next');
    $('crowdLobby').textContent = t(locale, 'lobby');
  }

  function tickHost() {
    if (host) host.$('crowdClock').textContent = t(host.locale, 'time', { seconds: Math.ceil(Math.max(0, host.deadline - performance.now()) / 1000) });
    requestAnimationFrame(tickHost);
  }

  function initPhone(options) {
    phone = { ...options, state: null, connected: false, pending: null, actionIds: new Map(), deadline: 0, choicesKey: '' };
    const { $ } = phone;
    $('crowdOptions').onclick = event => {
      const button = event.target.closest('[data-option]');
      if (button) submit(Number(button.dataset.option));
    };
    requestAnimationFrame(tickPhone);
  }

  async function submit(option) {
    const { $, state, room, pid, locale } = phone;
    const round = state.crowd;
    if (!phone.connected || phone.pending || state.selfActive === false || state.crowdMine?.audience) return;
    const phase = round.phase;
    const mine = state.crowdMine;
    if (!['answer', 'predict'].includes(phase) || (phase === 'answer' ? mine.answer : mine.prediction) !== undefined) return;
    const key = `${round.id}:${phase}`;
    const previous = phone.actionIds.get(key);
    if (previous && previous.option !== option) return;
    const actionId = previous?.actionId ?? crypto.randomUUID();
    phone.actionIds.set(key, { option, actionId });
    phone.pending = key;
    $('crowdFeedback').textContent = '';
    renderPhone(state, phone.connected);
    try {
      const response = await fetch(`./api/${phase === 'answer' ? 'crowdAnswer' : 'crowdPredict'}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room, pid, round: round.id, v: round.version, option, actionId }),
        signal: AbortSignal.timeout(8000),
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 409) phone.actionIds.delete(key);
        $('crowdFeedback').textContent = result.error || t(locale, 'stale');
      }
    } catch { $('crowdFeedback').textContent = t(locale, 'sendFailed'); }
    phone.pending = null;
    renderPhone(phone.state, phone.connected);
  }

  function renderPhone(state, connected) {
    if (!phone) return;
    const { $, locale } = phone;
    phone.state = state;
    phone.connected = connected;
    const round = state.crowd;
    if (!round) return;
    phone.deadline = performance.now() + round.deadlineInMs;
    const mine = state.crowdMine ?? { audience: true };
    const phase = round.phase;
    const choice = phase === 'answer' ? mine.answer : mine.prediction;
    const key = `${round.id}:${phase}`;
    $('crowdPhase').textContent = `${t(locale, 'round', { number: round.number })} · ${t(locale, phase)}`;
    $('crowdQuestion').textContent = pick(round.question, locale);
    $('crowdLead').textContent = mine.audience ? t(locale, 'audience') : phase === 'answer' ? choice === undefined ? t(locale, 'answerLead') : t(locale, 'answerSent')
      : phase === 'predict' ? choice === undefined ? t(locale, 'predictLead') : t(locale, 'predictSent')
      : round.result.answers < 2 ? t(locale, round.result.answers ? 'noLeader' : 'noAnswers')
      : `${t(locale, round.result.leaders.length > 1 ? 'tied' : 'leader')}: ${round.result.leaders.map(index => pick(round.options[index], locale)).join(', ')}`;
    const choicesKey = `${round.id}:${phase}`;
    if (choicesKey !== phone.choicesKey) {
      phone.choicesKey = choicesKey;
      $('crowdOptions').replaceChildren(...round.options.map((option, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.option = String(index);
        button.textContent = pick(option, locale);
        return button;
      }));
    }
    $('crowdOptions').hidden = mine.audience || phase === 'result' || choice !== undefined;
    for (const button of $('crowdOptions').children) {
      const attempted = phone.actionIds.get(key);
      button.disabled = !connected || Boolean(phone.pending) || state.selfActive === false || Boolean(attempted && attempted.option !== Number(button.dataset.option));
    }
    $('crowdClock').hidden = phase === 'result';
    $('crowdResult').hidden = phase !== 'result';
    if (phase === 'result') $('crowdResult').textContent = round.result.gained[state.selfId] ? t(locale, 'points', { points: round.result.gained[state.selfId] }) : t(locale, 'noPoints');
  }

  function tickPhone() {
    if (phone) phone.$('crowdClock').textContent = t(phone.locale, 'time', { seconds: Math.ceil(Math.max(0, phone.deadline - performance.now()) / 1000) });
    requestAnimationFrame(tickPhone);
  }

  return { t, initHost, renderHost, initPhone, renderPhone };
})();
