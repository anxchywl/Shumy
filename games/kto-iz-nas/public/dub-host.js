window.DubHost = (() => {
  let $, api, locale, t, stage, sound, section;
  const clock = Dub.playClock();
  const retried = new Set();
  let S = null;
  let deadlineAt = 0;
  let showTexts = false;
  let note = '';
  let noteRound = '';

  const esc = value => String(value).replace(/[&<>"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[character]));
  const send = (action, body = {}) => api(action, { round: S.dub.id, v: S.dub.version, ...body });
  const roleOf = (dub, slotId) => Dub.pick(dub.scene.slots.find(slot => slot.id === slotId).role, locale);
  const visibleLines = () => S.dub.lines ?? S.dubHost?.lines ?? null;

  function slotRows(dub) {
    return dub.slots.map((slot, index) => {
      const label = slot.status === 'caption' ? t('captionLine', { role: roleOf(dub, slot.id) }) : t('playerLine', { role: roleOf(dub, slot.id), name: slot.ownerName });
      const status = t({ pending: 'statusPending', open: 'statusOpen', ready: 'statusReady', skipped: 'statusSkipped', caption: 'statusCaption' }[slot.status]);
      const current = dub.phase === 'record' && index === dub.active;
      return `<li ${current ? 'aria-current="step"' : ''}><b>${index + 1}</b><span>${esc(label)}</span><span class="dub-slot-state" data-status="${slot.status}">${status}</span></li>`;
    }).join('');
  }

  // after recording the list shows what will play, with the host's controls for each player line
  function lineRows(dub, lines) {
    return lines.map((line, index) => {
      const role = roleOf(dub, line.slot);
      const label = line.fromPlayer ? t('playerLine', { role, name: line.by }) : t('captionLine', { role });
      let detail = '';
      let controls = '';
      if (line.fromPlayer) {
        const broken = line.kind === 'voice' && sound.state(line.take) === null;
        if (line.hidden) detail = t('hiddenLine');
        else if (broken) detail = t('takeBroken');
        else if (line.kind === 'voice') detail = t('voiceLine');
        else if (dub.phase !== 'review' || showTexts) detail = `«${line.text}»`;
        if (broken && !retried.has(line.take)) controls += `<button type="button" class="dub-mini" data-retry="${esc(line.take)}">${t('takeRetry')}</button>`;
        controls += `<button type="button" class="dub-mini" data-hide="${esc(line.slot)}" data-hidden="${!line.hidden}">${t(line.hidden ? 'showLine' : broken ? 'useCaption' : 'hideLine')}</button>`;
      }
      const count = dub.phase === 'result' && dub.result.counts[line.slot] ? ` · ${t('votes', { count: dub.result.counts[line.slot] })}` : '';
      return `<li><b>${index + 1}</b><span>${esc(label)}${count}${detail ? `<small>${esc(detail)}</small>` : ''}</span><span class="dub-line-tools">${controls}</span></li>`;
    }).join('');
  }

  function resultText(dub) {
    const { result } = dub;
    if (dub.votable.length < 2 && !result.totalVotes) return [t('resultNoVote'), ''];
    if (!result.winners.length) return [t('resultNone'), ''];
    const names = result.winners.map(id => dub.lines.find(line => line.slot === id)).filter(Boolean)
      .map(line => t('playerLine', { role: roleOf(dub, line.slot), name: line.by }));
    return [t(result.winners.length > 1 ? 'resultTie' : 'resultWinner'), `${names.join(', ')} (${t('votes', { count: result.counts[result.winners[0]] })})`];
  }

  async function preload(dub) {
    const lines = visibleLines();
    if (!lines) return;
    const voices = lines.filter(line => line.kind === 'voice' && sound.state(line.take) === undefined);
    if (!voices.length) return;
    await Promise.all(voices.map(line => sound.load(line.take)));
    if (S?.dub?.id === dub.id) render(S);
  }

  async function restart() {
    const dub = S.dub;
    await Promise.all(dub.lines.filter(line => line.kind === 'voice').map(line => sound.load(line.take)));
    const position = clock.position();
    if (S?.dub !== dub || position === null) return;
    sound.schedule(dub.scene, dub.lines, position);
  }

  function render(state) {
    S = state;
    const dub = S.dub;
    if (!dub) return;
    if (noteRound !== `${dub.id}:${dub.phase}`) {
      noteRound = `${dub.id}:${dub.phase}`;
      note = '';
      if (dub.phase === 'intro') showTexts = false;
    }
    const scene = dub.scene;
    const seconds = Math.round(scene.durationMs / 1000);
    const lines = visibleLines();
    section.dataset.phase = dub.phase;
    stage.setScene(scene);
    deadlineAt = performance.now() + dub.deadlineInMs;
    $('dubKicker').textContent = `${t('game')} · ${t('round', { number: dub.number })}`;
    $('dubTitle').textContent = Dub.pick(scene.title, locale);
    $('dubClock').hidden = !(dub.phase === 'intro' || dub.phase === 'vote' || (dub.phase === 'record' && !dub.handoff));

    let status = '';
    let sub = '';
    const current = dub.slots[dub.active];
    if (dub.phase === 'intro') {
      status = Dub.pick(scene.tone, locale);
      sub = t('introStatus', { seconds, lines: Dub.lineCount(locale, scene.slots.length) });
    } else if (dub.phase === 'record') {
      const upcoming = dub.slots.find(slot => slot.status === 'pending');
      status = dub.handoff ? t(current?.status === 'skipped' ? 'slotSkipped' : 'slotAccepted') : t('recordingNow', { name: current?.ownerName ?? '' });
      sub = `${t('lineOf', { index: dub.active + 1, total: scene.slots.length })}. ${dub.handoff ? upcoming ? t('nextUp', { name: upcoming.ownerName }) : t('lastDone') : ''}`;
    } else if (dub.phase === 'review') {
      status = t('reviewStatus');
      sub = t('reviewLead');
    } else if (dub.phase === 'vote') {
      status = t('voteStatus');
      sub = `${t('voteLead')} ${t('voteCount', { count: dub.voted.length, total: S.players.filter(player => player.online).length })}`;
    } else if (dub.phase === 'result') {
      [status, sub] = resultText(dub);
    }
    $('dubStatus').textContent = status;
    $('dubSub').textContent = sub;
    $('dubSlots').innerHTML = lines && dub.phase !== 'play' ? lineRows(dub, lines) : slotRows(dub);

    const position = clock.position();
    const ended = position !== null && position > scene.durationMs;
    const silent = dub.phase === 'play' && !sound.running() && dub.lines.some(line => line.kind === 'voice');
    const buttons = {
      dubStartNow: dub.phase === 'intro',
      dubSoundCheck: dub.phase === 'intro' || dub.phase === 'review',
      dubExtend: dub.phase === 'record',
      dubReopen: dub.canReopen,
      dubFinish: dub.phase === 'record',
      dubWatch: dub.phase === 'review',
      dubTexts: dub.phase === 'review' && lines.some(line => line.kind === 'text' || (line.hidden && line.fromPlayer)),
      dubContinue: dub.phase === 'play',
      dubUnmute: silent,
      dubCloseVote: dub.phase === 'vote',
      dubNextScene: dub.phase === 'result',
      dubReplay: ['play', 'vote', 'result'].includes(dub.phase),
      dubSkipScene: dub.phase === 'review',
      dubCancel: dub.phase === 'intro' || dub.phase === 'record',
      dubToLobby: dub.phase === 'review' || dub.phase === 'result',
    };
    for (const [id, shown] of Object.entries(buttons)) $(id).hidden = !shown;
    $('dubExtend').disabled = dub.extended || dub.handoff;
    $('dubExtendLabel').textContent = t(dub.extended ? 'extendUsed' : 'extend');
    $('dubTexts').textContent = t(showTexts ? 'hideTexts' : 'showTexts');
    $('dubTexts').setAttribute('aria-pressed', String(showTexts));
    $('dubContinue').classList.toggle('quiet', !ended);
    $('dubHint').textContent = note || (
      dub.phase === 'intro' ? t('cancelHint')
      : dub.phase === 'record' ? `${t('finishHint')} ${dub.canReopen ? t('reopenHint') + ' ' : ''}${t('cancelHint')}`
      : dub.phase === 'play' ? silent ? t('soundBlocked') : ended ? t('sceneEnded') : t('playStatus')
      : '');

    if (clock.sync(dub.playback) && dub.lines) restart();
    preload(dub);
  }

  function tick() {
    const dub = S?.dub;
    if (dub) {
      const left = Math.max(0, deadlineAt - performance.now());
      $('dubClock').textContent = Dub.clockText(left);
      $('dubClock').classList.toggle('urgent', left > 0 && left <= 10000 && dub.phase === 'record');
      const position = clock.position();
      const duration = dub.scene.durationMs;
      if (dub.lines && position !== null && position >= 0 && position <= duration) stage.play(position, dub.lines);
      else {
        stage.rest();
        if (dub.phase === 'record' && dub.active >= 0) stage.showSlot(dub.active);
        else stage.showAt(dub.lines && position !== null && position > duration ? duration : 0);
        stage.mark(dub.phase === 'record' ? dub.active : -1, dub.slots.map(slot => slot.status));
        // the buttons change once when the scene runs out
        if (dub.phase === 'play' && position !== null && position > duration && $('dubContinue').classList.contains('quiet')) render(S);
      }
    }
    requestAnimationFrame(tick);
  }

  function init(options) {
    ({ $, api, locale } = options);
    t = Dub.strings(locale);
    section = $('s-dub');
    stage = Dub.stage($('dubStage'), locale);
    sound = Dub.audio(options.room, null);
    for (const element of section.querySelectorAll('[data-dub]')) element.textContent = t(element.dataset.dub);

    $('dubStartNow').onclick = () => send('dubAdvance');
    $('dubContinue').onclick = $('dubCloseVote').onclick = () => { sound.stop(); send('dubAdvance'); };
    $('dubExtend').onclick = () => send('dubExtend');
    $('dubReopen').onclick = () => send('dubReopen');
    $('dubFinish').onclick = () => send('dubFinish');
    $('dubCancel').onclick = () => send('dubCancel');
    $('dubToLobby').onclick = () => { sound.stop(); api('lobby'); };
    $('dubNextScene').onclick = $('dubSkipScene').onclick = () => { sound.stop(); send('dubNext'); };
    // the click is what lets the browser play sound later, so the context is unlocked right here
    $('dubWatch').onclick = $('dubReplay').onclick = async () => {
      await sound.unlock();
      send('dubPlay', { count: S.dub.playback?.count ?? 0 });
    };
    $('dubUnmute').onclick = async () => {
      if (await sound.unlock()) await restart();
      render(S);
    };
    $('dubSoundCheck').onclick = async () => {
      if (await sound.unlock()) sound.beep();
      note = t('soundPlayed');
      render(S);
    };
    $('dubTexts').onclick = () => { showTexts = !showTexts; render(S); };
    $('dubSlots').onclick = async event => {
      const hide = event.target.closest('[data-hide]');
      const retry = event.target.closest('[data-retry]');
      if (hide) send('dubHide', { slot: hide.dataset.hide, hidden: hide.dataset.hidden === 'true' });
      if (retry) {
        retried.add(retry.dataset.retry);
        sound.forget(retry.dataset.retry);
        render(S);
      }
    };
    requestAnimationFrame(tick);
  }

  function primary() {
    [...section.querySelectorAll('.dub-bar .btn:not(.quiet)')].find(button => !button.hidden && !button.disabled)?.click();
  }

  return { init, render, primary, stop: () => sound?.stop() };
})();
