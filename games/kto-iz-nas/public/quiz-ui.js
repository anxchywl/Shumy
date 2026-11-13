window.QuizUi = (() => {
  const copy = {
    ru: {
      game: 'Квиз с уверенностью', lobbyMode: 'Выбери ответ и степень уверенности. Верный ответ даёт очки, неверный снимает ставку.',
      intro: 'Правила раунда', answer: 'Ответ и уверенность', result: 'Верный ответ',
      rule: 'Уверенность: 50, 100 или 200 очков. Верно: плюс ставка. Неверно: минус ставка. Пропуск: 0.',
      introLead: 'Сначала прочитай правило. Ведущий откроет вопрос.', answerLead: 'Выбери ответ и уверенность. Можно изменить до закрытия времени.',
      audience: 'Ты зритель этого раунда. Смотри общий экран.', confidence: 'Насколько уверен?',
      stake: '{points} очков', submit: 'Зафиксировать ответ', update: 'Изменить ответ', sent: 'Ответ принят. Можно изменить до закрытия времени.',
      noAnswer: 'Ты пропустил вопрос: 0 очков.', gained: 'Изменение счёта: {points}', correct: 'Правильный ответ: {answer}',
      answered: 'Ответили: {count} из {total}', start: 'Открыть вопрос', reveal: 'Показать ответ', next: 'Следующий вопрос', lobby: 'В лобби',
      round: 'Вопрос {number}', time: 'Осталось {seconds} с', sendFailed: 'Не удалось отправить. Проверь связь и нажми ещё раз.',
    },
    en: {
      game: 'Confident Quiz', lobbyMode: 'Choose an answer and confidence. A correct answer gains points; a wrong one loses the stake.',
      intro: 'Round rules', answer: 'Answer and confidence', result: 'Correct answer',
      rule: 'Confidence stakes 50, 100 or 200 points. Correct: gain the stake. Wrong: lose it. No answer: 0.',
      introLead: 'Read the rule first. The host opens the question.', answerLead: 'Choose an answer and confidence. You can change both until time closes.',
      audience: 'You are watching this round. Follow the shared screen.', confidence: 'How confident are you?',
      stake: '{points} points', submit: 'Lock answer', update: 'Change answer', sent: 'Answer received. You can change it until time closes.',
      noAnswer: 'You skipped this question: 0 points.', gained: 'Score change: {points}', correct: 'Correct answer: {answer}',
      answered: 'Answered: {count} of {total}', start: 'Open question', reveal: 'Show answer', next: 'Next question', lobby: 'Back to lobby',
      round: 'Question {number}', time: '{seconds} s left', sendFailed: 'Could not send. Check your connection and try again.',
    },
    kk: {
      game: 'Сенімді квиз', lobbyMode: 'Жауап пен сенімділікті таңда. Дұрыс жауап ұпай қосады, қате жауап ұпай шегереді.',
      intro: 'Раунд ережесі', answer: 'Жауап және сенімділік', result: 'Дұрыс жауап',
      rule: 'Ставка: 50, 100 немесе 200 ұпай. Дұрыс: қосылады. Қате: шегеріледі. Жауапсыз: 0.',
      introLead: 'Ережені оқы. Жүргізуші сұрақты ашады.', answerLead: 'Жауап пен сенімділікті таңда. Уақыт біткенше өзгертуге болады.',
      audience: 'Сен бұл раундта көрерменсің. Ортақ экранға қара.', confidence: 'Қаншалықты сенімдісің?',
      stake: '{points} ұпай', submit: 'Жауапты бекіту', update: 'Жауапты өзгерту', sent: 'Жауап қабылданды. Уақыт біткенше өзгертуге болады.',
      noAnswer: 'Сұрақты өткіздің: 0 ұпай.', gained: 'Ұпай өзгерісі: {points}', correct: 'Дұрыс жауап: {answer}',
      answered: 'Жауап берді: {count}/{total}', start: 'Сұрақты ашу', reveal: 'Жауапты көрсету', next: 'Келесі сұрақ', lobby: 'Бөлмеге оралу',
      round: 'Сұрақ {number}', time: '{seconds} с қалды', sendFailed: 'Жіберілмеді. Байланысты тексеріп, қайта бас.',
    },
  };
  const t = (locale, key, values = {}) => (copy[locale] ?? copy.ru)[key].replace(/\{(\w+)\}/g, (_, name) => values[name] ?? '');
  const pick = (value, locale) => value?.[locale] ?? value?.ru ?? '';
  let host = null;
  let phone = null;

  function initHost(options) {
    host = { ...options, deadline: 0 };
    const { $, api, state } = host;
    $('quizAdvance').onclick = () => { const round = state().quiz; api('quizAdvance', { round: round.id, v: round.version }); };
    $('quizNext').onclick = () => { const round = state().quiz; api('quizNext', { round: round.id, v: round.version }); };
    $('quizLobby').onclick = () => api('lobby');
    requestAnimationFrame(tickHost);
  }
  function renderHost(state) {
    if (!host || !state.quiz) return;
    const { $, locale } = host;
    const round = state.quiz;
    host.deadline = performance.now() + round.deadlineInMs;
    $('quizRound').textContent = t(locale, 'round', { number: round.number });
    $('quizPhase').textContent = t(locale, round.phase);
    $('quizQuestion').textContent = round.phase === 'intro' ? t(locale, 'game') : pick(round.question, locale);
    $('quizRule').textContent = t(locale, 'rule');
    const showOptions = round.phase !== 'intro';
    $('quizOptions').hidden = !showOptions;
    if (showOptions) $('quizOptions').replaceChildren(...round.options.map((option, index) => {
      const item = document.createElement('li');
      if (round.result?.correct === index) item.className = 'correct';
      const label = document.createElement('strong');
      label.textContent = pick(option, locale);
      item.append(label);
      if (round.result) {
        const count = document.createElement('span');
        count.textContent = String(round.result.counts[index]);
        item.append(count);
      }
      return item;
    }));
    $('quizStatus').textContent = round.phase === 'intro' ? t(locale, 'introLead') : round.phase === 'answer' ? t(locale, 'answered', { count: round.answered, total: round.eligible }) : t(locale, 'correct', { answer: pick(round.options[round.result.correct], locale) });
    $('quizClock').hidden = round.phase === 'result';
    $('quizAdvance').hidden = round.phase === 'result';
    $('quizAdvance').textContent = t(locale, round.phase === 'intro' ? 'start' : 'reveal');
    $('quizNext').hidden = round.phase !== 'result';
    $('quizNext').textContent = t(locale, 'next');
    $('quizLobby').textContent = t(locale, 'lobby');
  }
  function tickHost() {
    if (host) host.$('quizClock').textContent = t(host.locale, 'time', { seconds: Math.ceil(Math.max(0, host.deadline - performance.now()) / 1000) });
    requestAnimationFrame(tickHost);
  }

  function initPhone(options) {
    phone = { ...options, state: null, connected: false, key: '', choicesKey: '', answer: null, confidence: null, pending: false, retry: null, deadline: 0 };
    const { $ } = phone;
    $('quizOptions').onclick = event => {
      const button = event.target.closest('[data-answer]');
      if (!button) return;
      phone.answer = Number(button.dataset.answer);
      phone.retry = null;
      renderPhone(phone.state, phone.connected);
    };
    $('quizConfidenceOptions').onclick = event => {
      const button = event.target.closest('[data-confidence]');
      if (!button) return;
      phone.confidence = Number(button.dataset.confidence);
      phone.retry = null;
      renderPhone(phone.state, phone.connected);
    };
    $('quizSubmit').onclick = submit;
    requestAnimationFrame(tickPhone);
  }
  async function submit() {
    const { $, state, room, pid, locale } = phone;
    const round = state.quiz;
    if (phone.pending || !phone.connected || state.selfActive === false || round.phase !== 'answer' || state.quizMine?.audience || phone.answer === null || phone.confidence === null) return;
    const payload = { answer: phone.answer, confidence: phone.confidence };
    const same = phone.retry?.answer === payload.answer && phone.retry?.confidence === payload.confidence;
    const actionId = same ? phone.retry.actionId : crypto.randomUUID();
    phone.retry = { ...payload, actionId };
    phone.pending = true;
    $('quizFeedback').textContent = '';
    renderPhone(state, phone.connected);
    try {
      const response = await fetch('./api/quizSubmit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room, pid, round: round.id, v: round.version, ...payload, actionId }),
        signal: AbortSignal.timeout(8000),
      });
      const result = await response.json();
      if (!response.ok) {
        phone.retry = null;
        $('quizFeedback').textContent = result.error || t(locale, 'sendFailed');
      } else phone.retry = null;
    } catch { $('quizFeedback').textContent = t(locale, 'sendFailed'); }
    phone.pending = false;
    renderPhone(phone.state, phone.connected);
  }
  function renderPhone(state, connected) {
    if (!phone || !state.quiz) return;
    const { $, locale } = phone;
    phone.state = state;
    phone.connected = connected;
    const round = state.quiz;
    const mine = state.quizMine ?? { audience: true };
    phone.deadline = performance.now() + round.deadlineInMs;
    if (phone.key !== round.id) {
      phone.key = round.id;
      phone.answer = mine.submission?.answer ?? null;
      phone.confidence = mine.submission?.confidence ?? null;
      phone.retry = null;
      $('quizFeedback').textContent = '';
    }
    const phase = round.phase;
    $('quizPhase').textContent = `${t(locale, 'round', { number: round.number })} · ${t(locale, phase)}`;
    $('quizQuestion').textContent = phase === 'intro' ? t(locale, 'game') : pick(round.question, locale);
    $('quizRule').textContent = t(locale, 'rule');
    $('quizLead').textContent = mine.audience ? t(locale, 'audience') : phase === 'intro' ? t(locale, 'introLead') : phase === 'answer' ? mine.submission ? t(locale, 'sent') : t(locale, 'answerLead')
      : t(locale, 'correct', { answer: pick(round.options[round.result.correct], locale) });
    const editing = phase === 'answer' && !mine.audience;
    $('quizOptions').hidden = !editing;
    $('quizConfidence').hidden = !editing;
    $('quizSubmit').hidden = !editing;
    $('quizConfidenceLabel').textContent = t(locale, 'confidence');
    if (editing) {
      if (phone.choicesKey !== round.id) {
        phone.choicesKey = round.id;
        $('quizOptions').replaceChildren(...round.options.map((option, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.answer = String(index);
        button.setAttribute('aria-pressed', String(phone.answer === index));
        button.textContent = pick(option, locale);
        return button;
        }));
      }
      if (!$('quizConfidenceOptions').children.length) $('quizConfidenceOptions').replaceChildren(...round.stakes.map((stake, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.confidence = String(index);
        button.setAttribute('aria-pressed', String(phone.confidence === index));
        button.textContent = t(locale, 'stake', { points: stake });
        return button;
      }));
      for (const button of $('quizOptions').children) button.setAttribute('aria-pressed', String(phone.answer === Number(button.dataset.answer)));
      for (const button of $('quizConfidenceOptions').children) button.setAttribute('aria-pressed', String(phone.confidence === Number(button.dataset.confidence)));
      $('quizSubmit').textContent = t(locale, mine.submission ? 'update' : 'submit');
      $('quizSubmit').disabled = !connected || state.selfActive === false || phone.pending || phone.answer === null || phone.confidence === null;
    }
    $('quizClock').hidden = phase === 'result';
    $('quizResult').hidden = phase !== 'result';
    if (phase === 'result') {
      const points = round.result.gained[state.selfId];
      $('quizResult').textContent = points === undefined ? t(locale, 'noAnswer') : t(locale, 'gained', { points: points > 0 ? `+${points}` : points });
    }
  }
  function tickPhone() {
    if (phone) phone.$('quizClock').textContent = t(phone.locale, 'time', { seconds: Math.ceil(Math.max(0, phone.deadline - performance.now()) / 1000) });
    requestAnimationFrame(tickPhone);
  }
  return { t, initHost, renderHost, initPhone, renderPhone };
})();
