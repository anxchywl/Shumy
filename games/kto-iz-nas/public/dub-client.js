window.Dub = (() => {
  const SAMPLE_RATE = 16000;
  const text = {
    ru: {
      game: 'Не тот дубляж', description: 'Озвучьте немую сцену по одной реплике.',
      sceneLabel: 'Сцена', chooseScene: 'Сцена для первого раунда', anyScene: 'По порядку колоды', sceneBroken: 'Не запускается: {problem}',
      sceneFacts: '{seconds} с · {lines}', lobbyFacts: 'Сцена «{title}»: {seconds} секунд, {lines}. Игроки с репликой записывают её на своих телефонах.',
      lobbyOrder: 'Сцены пойдут по порядку колоды. Игроки с репликой записывают её на своих телефонах.',
      lobbyAudience: 'Реплик меньше, чем игроков: остальные будут зрителями и выберут любимую реплику.',
      lobbyCaptions: 'Игроков меньше, чем реплик: остальные реплики пройдут готовыми титрами.',
      lobbyMode: 'Не тот дубляж. Тебе может достаться одна реплика.',
      round: 'Сцена {number}', introStatus: '{seconds} секунд, {lines}. Реплики придут на телефоны.',
      soundCheck: 'Проверить звук', soundPlayed: 'Сигнал прозвучал. Если его не слышно, прибавь громкость экрана.',
      startNow: 'Начать запись', cancel: 'Отменить раунд', cancelHint: 'Отмена удалит записи и вернёт всех в лобби.',
      recordingNow: 'Записывает {name}', lineOf: 'Реплика {index} из {total}', nextUp: 'Дальше — {name}', lastDone: 'Собираем сцену…',
      slotAccepted: 'Реплика принята', slotSkipped: 'Реплика пропущена',
      extend: 'Добавить 10 секунд', extendUsed: 'Время уже добавлено', finish: 'Завершить с пропусками',
      finishHint: 'Незаписанные реплики заменятся титрами.', reopen: 'Вернуть реплику', reopenHint: 'Вернуть пропущенную реплику можно один раз за раунд.',
      statusPending: 'Ждёт', statusOpen: 'Записывает', statusReady: 'Готово', statusSkipped: 'Пропуск', statusCaption: 'Титр',
      reviewStatus: 'Сцена собрана', reviewLead: 'Проверь звук и запусти просмотр.',
      showTexts: 'Показать реплики игроков', hideTexts: 'Убрать реплики с экрана', voiceLine: 'Голос', hideLine: 'Скрыть', showLine: 'Вернуть',
      hiddenLine: 'Скрыта, пойдёт титр', takeBroken: 'Запись не читается', takeRetry: 'Загрузить ещё раз', useCaption: 'Заменить титром',
      watch: 'Смотреть дубляж', skipScene: 'Пропустить сцену', toLobby: 'В лобби',
      replay: 'С начала', continue: 'Дальше', enableSound: 'Включить звук', soundBlocked: 'Браузер не включил звук сам. Нажми «Включить звук».',
      playStatus: 'Звук идёт с этого экрана, титры видны всегда.', sceneEnded: 'Сцена закончилась.',
      voteStatus: 'Любимая реплика', voteLead: 'Выберите на телефонах. Голосовать необязательно.', voteCount: 'Ответили: {count} из {total}', closeVote: 'Закрыть голосование',
      resultWinner: 'Любимая реплика', resultTie: 'Поровну голосов', resultNone: 'Никто не голосовал', resultNoVote: 'Голосования не было: в сцене меньше двух реплик игроков.',
      votes: '{count} гол.', nextScene: 'Следующая сцена',
      voiceBy: 'говорит {name}', storyboard: 'Кадр {index} из {total}', assetFailed: 'Сцена не загрузилась, показываем раскадровку.', assetArchive: 'Архив', assetRights: 'Статус прав', timeline: 'Реплики сцены',
      interrupted: 'Сервер перезапустился, раунд прерван. Записи не сохранились. Позови игроков в новую комнату и начни заново.',
      waitingStart: 'Ждём начала', yourRole: 'Твоя роль: {role}', audienceIntro: 'В этой сцене ты зритель. После просмотра выберешь любимую реплику.',
      roleLead: 'Реплика придёт на этот экран, когда начнётся запись.', audienceTitle: 'Ты зритель этого дубляжа',
      audienceLead: 'Смотри общий экран. После сцены выберешь любимую реплику.', recordProgress: 'Готово реплик: {done} из {total}',
      yourCue: 'Твоя реплика', queueLead: 'Сейчас записывает {name}. Перед тобой: {ahead}.', queueNext: 'Сейчас записывает {name}. Ты следующий.', queueSoon: 'Запись скоро дойдёт до тебя.',
      suggested: 'Можно сказать: «{line}»', limit: 'Запись до {seconds} с', yourTurn: 'Твоя очередь', timeLeft: 'Осталось {time}',
      micNote: 'Микрофон нужен только для этой реплики и включится после нажатия «Записать». Отправленный дубль услышат участники комнаты. Он удаляется, когда сцена сменяется или комната закрывается.',
      record: 'Записать', useText: 'Написать текстом', skip: 'Пропустить', asking: 'Ждём разрешение на микрофон…',
      recording: 'Идёт запись', recordingLeft: 'Осталось {seconds} с', stop: 'Остановить', processing: 'Готовим запись…',
      previewTitle: 'Послушай дубль', previewNote: 'Его пока слышишь только ты.', again: 'Записать заново', submit: 'Отправить', sending: 'Отправляем…',
      textLabel: 'Твоя реплика текстом', textNote: 'До 80 знаков. Текст появится титром в сцене.', sendText: 'Отправить текст', backToVoice: 'Назад к записи',
      keepTake: 'Оставить прежний дубль',
      denied: 'Доступ к микрофону запрещён. Его можно включить в настройках сайта в браузере. Сейчас реплику можно написать текстом или пропустить.',
      nomic: 'Микрофон не найден. Напиши реплику текстом или пропусти.', busy: 'Микрофон занят другим приложением. Закрой его и попробуй снова или напиши текстом.',
      insecure: 'Запись голоса работает только по защищённому адресу (HTTPS). Напиши реплику текстом или пропусти.',
      unsupported: 'Этот браузер не умеет записывать голос. Напиши реплику текстом или пропусти.',
      notSaved: 'Запись не сохранилась. Попробуй ещё раз, напиши текстом или пропусти.',
      draftLost: 'Неотправленная запись потерялась при перезагрузке страницы. Запиши ещё раз, напиши текстом или пропусти.',
      micFailed: 'Не получилось включить микрофон. Попробуй ещё раз или напиши текстом.', tryAgain: 'Попробовать ещё раз',
      sendFailed: 'Не удалось отправить. Проверь связь и попробуй ещё раз.',
      acceptedVoice: 'Дубль принят', acceptedText: 'Текст принят', acceptedSkip: 'Реплика пропущена', acceptedLead: 'Сервер подтвердил. Ждём остальных.',
      skippedLead: 'Вместо неё пойдёт готовый титр. Это не штраф.', retake: 'Перезаписать', retakeNote: 'Перезаписать можно, пока не началась следующая реплика.',
      reviewPhone: 'Сцена собрана', reviewPhoneLead: 'Ведущий запускает просмотр на общем экране.',
      watchPhone: 'Смотрим дубляж', watchLead: 'Звук идёт с общего экрана.', phoneSound: 'Звук на этом телефоне', muteMine: 'Без моей реплики',
      phoneSoundBlocked: 'Телефон не включил звук. Сними и поставь галочку ещё раз.',
      votePhone: 'Какая реплика лучшая?', votePhoneLead: 'Один голос. Его можно изменить, пока идёт голосование.', noVote: 'Не голосовать',
      voteSent: 'Голос принят', abstainSent: 'Ты не голосуешь в этой сцене', voteOwn: 'твоя',
      resultPhone: 'Итог сцены', resultLead: 'Ведущий выберет, что дальше.', otherDevice: 'Игра открыта на другом устройстве или вкладке', otherDeviceLead: 'Активно то, что открыто позже. Продолжай там или обнови эту страницу.',
      playerLine: '{role} — {name}', captionLine: '{role} — титр',
    },
    en: {
      game: 'Wrong Dub', description: 'Dub a silent scene, one line at a time.',
      sceneLabel: 'Scene', chooseScene: 'Scene for the first round', anyScene: 'Deck order', sceneBroken: 'Cannot start: {problem}',
      sceneFacts: '{seconds} s · {lines}', lobbyFacts: 'Scene “{title}”: {seconds} seconds, {lines}. Players with a line record it on their phones.',
      lobbyOrder: 'Scenes follow the deck order. Players with a line record it on their phones.',
      lobbyAudience: 'Fewer lines than players: the rest watch and vote for a favorite line.',
      lobbyCaptions: 'Fewer players than lines: the other lines play as ready captions.',
      lobbyMode: 'Wrong Dub. You may get one line.',
      round: 'Scene {number}', introStatus: '{seconds} seconds, {lines}. Lines arrive on phones.',
      soundCheck: 'Check sound', soundPlayed: 'The tone played. If you did not hear it, turn the screen volume up.',
      startNow: 'Start recording', cancel: 'Cancel round', cancelHint: 'Cancelling deletes the takes and returns everyone to the lobby.',
      recordingNow: '{name} is recording', lineOf: 'Line {index} of {total}', nextUp: 'Next: {name}', lastDone: 'Assembling the scene…',
      slotAccepted: 'Line accepted', slotSkipped: 'Line skipped',
      extend: 'Add 10 seconds', extendUsed: 'Time already added', finish: 'Finish with skips',
      finishHint: 'Unrecorded lines become captions.', reopen: 'Reopen line', reopenHint: 'A skipped line can be reopened once per round.',
      statusPending: 'Waiting', statusOpen: 'Recording', statusReady: 'Ready', statusSkipped: 'Skipped', statusCaption: 'Caption',
      reviewStatus: 'The scene is assembled', reviewLead: 'Check the sound and start the viewing.',
      showTexts: 'Show player lines', hideTexts: 'Take lines off the screen', voiceLine: 'Voice', hideLine: 'Hide', showLine: 'Restore',
      hiddenLine: 'Hidden, a caption plays', takeBroken: 'The take cannot be read', takeRetry: 'Load again', useCaption: 'Use the caption',
      watch: 'Watch the dub', skipScene: 'Skip scene', toLobby: 'To lobby',
      replay: 'Replay from start', continue: 'Continue', enableSound: 'Turn sound on', soundBlocked: 'The browser did not start the sound. Press “Turn sound on”.',
      playStatus: 'Sound comes from this screen, captions always show.', sceneEnded: 'The scene has ended.',
      voteStatus: 'Favorite line', voteLead: 'Pick on your phones. Voting is optional.', voteCount: 'Answered: {count} of {total}', closeVote: 'Close voting',
      resultWinner: 'Favorite line', resultTie: 'Tied votes', resultNone: 'Nobody voted', resultNoVote: 'No vote: the scene has fewer than two player lines.',
      votes: '{count} votes', nextScene: 'Next scene',
      voiceBy: 'voiced by {name}', storyboard: 'Frame {index} of {total}', assetFailed: 'The scene did not load, showing the storyboard.', assetArchive: 'Archive', assetRights: 'Rights status', timeline: 'Scene lines',
      interrupted: 'The server restarted and the round was interrupted. The takes were not kept. Invite players to the new room and start again.',
      waitingStart: 'Waiting to start', yourRole: 'Your role: {role}', audienceIntro: 'You watch this scene. Afterwards you pick a favorite line.',
      roleLead: 'Your line appears here when recording starts.', audienceTitle: 'You are the audience for this dub',
      audienceLead: 'Watch the shared screen. After the scene you pick a favorite line.', recordProgress: 'Lines ready: {done} of {total}',
      yourCue: 'Your line', queueLead: '{name} is recording. Ahead of you: {ahead}.', queueNext: '{name} is recording. You are next.', queueSoon: 'Recording reaches you soon.',
      suggested: 'You can say: “{line}”', limit: 'Up to {seconds} s', yourTurn: 'Your turn', timeLeft: '{time} left',
      micNote: 'The microphone is needed for this one line and turns on after you press “Record”. Everyone in the room hears a submitted take. It is deleted when the scene changes or the room closes.',
      record: 'Record', useText: 'Use text', skip: 'Skip', asking: 'Waiting for microphone permission…',
      recording: 'Recording', recordingLeft: '{seconds} s left', stop: 'Stop', processing: 'Preparing the take…',
      previewTitle: 'Listen to your take', previewNote: 'Only you can hear it for now.', again: 'Record again', submit: 'Submit', sending: 'Sending…',
      textLabel: 'Your line as text', textNote: 'Up to 80 characters. The text appears as a caption in the scene.', sendText: 'Submit text', backToVoice: 'Back to recording',
      keepTake: 'Keep the previous take',
      denied: 'Microphone access is blocked. You can allow it in the site settings of your browser. For now, write the line as text or skip.',
      nomic: 'No microphone found. Write the line as text or skip.', busy: 'Another app is using the microphone. Close it and try again, or use text.',
      insecure: 'Voice recording only works on a secure address (HTTPS). Write the line as text or skip.',
      unsupported: 'This browser cannot record voice. Write the line as text or skip.',
      notSaved: 'The recording was not saved. Try again, use text or skip.',
      draftLost: 'The unsent recording was lost when the page reloaded. Record again, use text or skip.',
      micFailed: 'Could not start the microphone. Try again or use text.', tryAgain: 'Try again',
      sendFailed: 'Could not send. Check the connection and try again.',
      acceptedVoice: 'Take submitted', acceptedText: 'Text submitted', acceptedSkip: 'Line skipped', acceptedLead: 'The server confirmed it. Waiting for the others.',
      skippedLead: 'A ready caption plays instead. There is no penalty.', retake: 'Record again', retakeNote: 'You can re-record until the next line starts.',
      reviewPhone: 'The scene is assembled', reviewPhoneLead: 'The host starts the viewing on the shared screen.',
      watchPhone: 'Watching the dub', watchLead: 'Sound comes from the shared screen.', phoneSound: 'Sound on this phone', muteMine: 'Without my line',
      phoneSoundBlocked: 'The phone did not start the sound. Untick and tick the box again.',
      votePhone: 'Which line was the best?', votePhoneLead: 'One vote. You can change it while voting is open.', noVote: 'Do not vote',
      voteSent: 'Vote received', abstainSent: 'You are not voting in this scene', voteOwn: 'yours',
      resultPhone: 'Scene result', resultLead: 'The host chooses what comes next.', otherDevice: 'The game is open on another device or tab', otherDeviceLead: 'The one opened later is active. Continue there or reload this page.',
      playerLine: '{role} — {name}', captionLine: '{role} — caption',
    },
  };

  function strings(locale) {
    const table = text[locale] ?? text.ru;
    return (key, values = {}) => Object.entries(values)
      .reduce((value, [name, replacement]) => value.replaceAll(`{${name}}`, () => String(replacement)), table[key] ?? text.ru[key] ?? key);
  }
  const pick = (value, locale) => typeof value === 'string' ? value : value?.[locale] ?? value?.ru ?? '';
  function lineCount(locale, count) {
    if (locale === 'en') return `${count} ${count === 1 ? 'line' : 'lines'}`;
    const lastTwo = count % 100;
    const word = lastTwo >= 11 && lastTwo <= 14 ? 'реплик' : count % 10 === 1 ? 'реплика' : count % 10 >= 2 && count % 10 <= 4 ? 'реплики' : 'реплик';
    return `${count} ${word}`;
  }
  const clockText = ms => {
    const left = Math.max(0, Math.ceil(ms / 1000));
    return Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0');
  };

  function stage(root, locale) {
    const t = strings(locale);
    root.classList.add('dub-stage');
    root.innerHTML = `<div class="dub-picture">
        <svg class="dub-art" viewBox="0 0 320 180" role="img"><use></use></svg>
        <div class="dub-board" hidden><span class="dub-board-count"></span><p class="dub-board-text"></p></div>
        <p class="dub-caption" hidden><span class="dub-caption-role"></span> <span class="dub-caption-text"></span></p>
      </div>
      <p class="dub-credit" hidden><span></span> <a class="dub-credit-source" target="_blank" rel="noopener noreferrer"></a> <a class="dub-credit-rights" target="_blank" rel="noopener noreferrer"></a></p>
      <div class="dub-timeline"><ol aria-label="${t('timeline')}"></ol><span class="dub-progress" hidden></span></div>
      <p class="dub-asset-note" role="status"></p>`;
    const art = root.querySelector('.dub-art');
    const picture = root.querySelector('.dub-picture');
    const board = root.querySelector('.dub-board');
    const credit = root.querySelector('.dub-credit');
    const caption = root.querySelector('.dub-caption');
    const markers = root.querySelector('ol');
    const progress = root.querySelector('.dub-progress');
    const sprite = document.createElement('div');
    sprite.className = 'dub-sprite';
    sprite.setAttribute('aria-hidden', 'true');
    root.append(sprite);
    let scene = null;
    let artReady = false;
    let film = null;
    let shownSegment = -1;
    let shownCaption = '';
    let lastPosition = 0;

    async function loadAsset(target) {
      try {
        if (target.assetType === 'video/mp4') {
          film = document.createElement('video');
          film.className = 'dub-film';
          film.muted = true;
          film.playsInline = true;
          film.preload = 'auto';
          film.setAttribute('aria-label', pick(target.segments[0].alt, locale));
          film.addEventListener('loadeddata', () => {
            if (scene !== target) return;
            artReady = true;
            shownSegment = -1;
            showAt(lastPosition);
          }, { once: true });
          film.addEventListener('error', () => {
            if (scene === target) root.querySelector('.dub-asset-note').textContent = t('assetFailed');
          }, { once: true });
          picture.insertBefore(film, board);
          film.src = target.asset;
          film.load();
        } else {
          const response = await fetch(target.asset, { cache: 'no-store' });
          if (!response.ok) throw new Error('missing');
          const image = new DOMParser().parseFromString(await response.text(), 'image/svg+xml').documentElement;
          if (image.nodeName !== 'svg' || target.segments.some(segment => !image.querySelector(`symbol[id="${segment.frame}"]`))) throw new Error('frames');
          if (scene !== target) return;
          sprite.replaceChildren(document.importNode(image, true));
          artReady = true;
        }
      } catch {
        if (scene !== target) return;
        root.querySelector('.dub-asset-note').textContent = t('assetFailed');
      }
      if (!film) {
        shownSegment = -1;
        showAt(lastPosition);
      }
    }

    function setScene(next) {
      if (scene?.id === next.id) return;
      scene = next;
      artReady = false;
      shownSegment = -1;
      shownMark = '';
      lastPosition = 0;
      film?.pause();
      film?.remove();
      film = null;
      sprite.replaceChildren();
      root.querySelector('.dub-asset-note').textContent = '';
      const creditText = next.credit?.[locale];
      credit.hidden = !creditText;
      credit.querySelector('span').textContent = creditText ?? '';
      const sourceLink = credit.querySelector('.dub-credit-source');
      sourceLink.hidden = !next.sourceUrl;
      sourceLink.href = next.sourceUrl ?? '';
      sourceLink.textContent = next.sourceUrl ? t('assetArchive') : '';
      const rightsLink = credit.querySelector('.dub-credit-rights');
      rightsLink.hidden = !next.licenseUrl;
      rightsLink.href = next.licenseUrl ?? '';
      rightsLink.textContent = next.licenseUrl ? t('assetRights') : '';
      markers.innerHTML = next.slots.map((slot, index) => {
        const from = slot.startMs / next.durationMs * 100;
        const width = (slot.endMs - slot.startMs) / next.durationMs * 100;
        return `<li style="left:${from}%;width:${width}%"><span>${index + 1}</span></li>`;
      }).join('');
      showAt(0);
      loadAsset(next);
    }

    function showAt(positionMs, playing = false) {
      if (!scene) return;
      lastPosition = positionMs;
      const clamped = Math.max(0, Math.min(scene.durationMs - 1, positionMs));
      const index = scene.segments.findIndex(segment => clamped >= segment.startMs && clamped < segment.endMs);
      if (film) {
        const targetTime = clamped / 1000;
        if (Math.abs(film.currentTime - targetTime) > (playing ? 1 : 0.15)) film.currentTime = targetTime;
        if (playing && film.paused) film.play().catch(() => {});
        if (!playing && !film.paused) film.pause();
      }
      if (index === shownSegment) return;
      shownSegment = index;
      const segment = scene.segments[index];
      const alt = pick(segment.alt, locale);
      if (film) {
        film.toggleAttribute('hidden', !artReady);
        art.hidden = true;
        board.hidden = artReady;
        film.setAttribute('aria-label', alt);
      } else {
        art.toggleAttribute('hidden', !artReady);
        board.hidden = artReady;
      }
      if (artReady && !film) {
        art.querySelector('use').setAttribute('href', `#${segment.frame}`);
        art.setAttribute('aria-label', alt);
      } else if (!artReady) {
        board.querySelector('.dub-board-count').textContent = t('storyboard', { index: index + 1, total: scene.segments.length });
        board.querySelector('.dub-board-text').textContent = alt;
      }
    }

    function showSlot(index) {
      if (scene?.slots[index]) showAt(scene.slots[index].startMs);
    }

    let shownMark = '';
    function mark(index, statuses = []) {
      const key = `${index}:${statuses}`;
      if (key === shownMark) return;
      shownMark = key;
      for (const [i, marker] of [...markers.children].entries()) {
        if (i === index) marker.setAttribute('aria-current', 'step');
        else marker.removeAttribute('aria-current');
        marker.dataset.status = statuses[i] ?? '';
      }
    }

    function setCaption(role, body) {
      const key = role ? `${role}\n${body}` : '';
      if (key === shownCaption) return;
      shownCaption = key;
      caption.hidden = !role;
      caption.querySelector('.dub-caption-role').textContent = role ? `${role}:` : '';
      caption.querySelector('.dub-caption-text').textContent = body ?? '';
    }

    function setProgress(positionMs) {
      progress.hidden = positionMs === null;
      if (positionMs !== null) progress.style.width = `${Math.max(0, Math.min(1, positionMs / scene.durationMs)) * 100}%`;
    }

    // draws the scene at a playback position with the caption of the line that is being spoken
    function play(positionMs, lines) {
      showAt(positionMs, true);
      setProgress(positionMs);
      const index = scene.slots.findIndex(slot => positionMs >= slot.startMs && positionMs < slot.endMs);
      mark(index);
      if (index < 0) return setCaption(null);
      const line = lines[index];
      const role = pick(scene.slots[index].role, locale);
      setCaption(role, line.kind === 'voice' ? `(${t('voiceBy', { name: line.by })})` : pick(line.text, locale));
    }

    function rest() {
      film?.pause();
      setCaption(null);
      setProgress(null);
    }

    return { setScene, showAt, showSlot, mark, play, rest };
  }

  // the server sends elapsed time, small differences between snapshots are network jitter and are ignored
  function playClock() {
    let count = 0;
    let origin = 0;
    return {
      sync(playback) {
        if (!playback) { count = 0; return false; }
        const estimate = performance.now() - playback.elapsedMs;
        if (playback.count === count && Math.abs(estimate - origin) < 300) return false;
        count = playback.count;
        origin = estimate;
        return true;
      },
      position: () => count ? performance.now() - origin : null,
    };
  }

  function audio(room, pid) {
    let context = null;
    let sources = [];
    const takes = new Map();
    const ensure = () => context ??= new (window.AudioContext || window.webkitAudioContext)();

    // older safari only takes callbacks here
    const decode = data => new Promise((resolve, reject) => ensure().decodeAudioData(data, resolve, reject)?.catch(reject));

    async function load(takeId) {
      if (takes.has(takeId)) return takes.get(takeId);
      const pending = (async () => {
        try {
          const response = await fetch(`./media/dub/${takeId}?room=${room}`, { headers: pid ? { 'X-Shumy-Pid': pid } : {}, cache: 'no-store' });
          if (!response.ok) return null;
          return await decode(await response.arrayBuffer());
        } catch {
          return null;
        }
      })();
      takes.set(takeId, pending);
      const buffer = await pending;
      takes.set(takeId, buffer);
      return buffer;
    }

    function stop() {
      for (const source of sources) {
        try { source.stop(); } catch {}
      }
      sources = [];
    }

    // every line is cut at the end of its slot with a short fade, so takes never overlap
    function schedule(scene, lines, positionMs, mutedSlot = null) {
      stop();
      if (!context || context.state !== 'running') return;
      for (const [index, line] of lines.entries()) {
        const buffer = line.kind === 'voice' ? takes.get(line.take) : null;
        const slot = scene.slots[index];
        if (!(buffer instanceof AudioBuffer) || line.slot === mutedSlot || positionMs >= slot.endMs) continue;
        const delay = Math.max(0, slot.startMs - positionMs) / 1000;
        const offset = Math.max(0, positionMs - slot.startMs) / 1000;
        const length = (slot.endMs - slot.startMs) / 1000 - offset;
        if (offset >= buffer.duration) continue;
        const source = context.createBufferSource();
        const gain = context.createGain();
        const start = context.currentTime + delay;
        gain.gain.setValueAtTime(1, start + Math.max(0, length - .08));
        gain.gain.linearRampToValueAtTime(0, start + length);
        source.buffer = buffer;
        source.connect(gain).connect(context.destination);
        source.start(start, offset, length);
        sources.push(source);
      }
    }

    async function unlock() {
      try { await ensure().resume(); } catch {}
      return context.state === 'running';
    }

    function beep() {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = 660;
      gain.gain.setValueAtTime(.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(.2, context.currentTime + .03);
      gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + .5);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + .55);
    }

    return {
      load, schedule, stop, unlock, beep,
      forget: takeId => takes.delete(takeId),
      state: takeId => takes.get(takeId),
      running: () => context?.state === 'running',
      decode,
    };
  }

  // mixes to mono, resamples to 16 kHz by averaging and writes 16-bit pcm, the only format the server accepts
  function encodeWav(buffer, limitMs) {
    const ratio = buffer.sampleRate / SAMPLE_RATE;
    const length = Math.min(Math.floor(buffer.length / ratio), Math.floor(SAMPLE_RATE * limitMs / 1000));
    const channels = Array.from({ length: buffer.numberOfChannels }, (_, index) => buffer.getChannelData(index));
    const bytes = new DataView(new ArrayBuffer(44 + length * 2));
    const ascii = (offset, value) => [...value].forEach((character, index) => bytes.setUint8(offset + index, character.charCodeAt(0)));
    ascii(0, 'RIFF'); bytes.setUint32(4, 36 + length * 2, true); ascii(8, 'WAVEfmt ');
    bytes.setUint32(16, 16, true); bytes.setUint16(20, 1, true); bytes.setUint16(22, 1, true);
    bytes.setUint32(24, SAMPLE_RATE, true); bytes.setUint32(28, SAMPLE_RATE * 2, true); bytes.setUint16(32, 2, true); bytes.setUint16(34, 16, true);
    ascii(36, 'data'); bytes.setUint32(40, length * 2, true);
    for (let i = 0; i < length; i++) {
      const from = Math.floor(i * ratio);
      const to = Math.max(from + 1, Math.min(buffer.length, Math.floor((i + 1) * ratio)));
      let sum = 0;
      for (let j = from; j < to; j++) for (const channel of channels) sum += channel[j];
      const sample = Math.max(-1, Math.min(1, sum / ((to - from) * channels.length)));
      bytes.setInt16(44 + i * 2, Math.round(sample * 32767), true);
    }
    return new Blob([bytes], { type: 'audio/wav' });
  }

  return { strings, pick, lineCount, clockText, stage, playClock, audio, encodeWav };
})();
