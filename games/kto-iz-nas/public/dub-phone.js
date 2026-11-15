window.DubPhone = (() => {
  let $, room, pid, locale, t, stage, sound;
  const clock = Dub.playClock();
  let state = null;
  let connected = false;
  let local = fresh('');
  let deadlineAt = 0;
  let pending = '';
  let shownLayout = '';
  let votesKey = '';
  let phoneSound = false;

  function fresh(key) {
    return { key, mode: 'idle', problem: '', error: '', blob: null, url: '', actionId: '', stream: null, recorder: null, startedAt: 0, limitMs: 0, stopTimer: 0, textMode: false };
  }
  const uuid = () => crypto.randomUUID?.() ?? Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
  const draft = {
    get: () => { try { return sessionStorage.getItem('dub.draft'); } catch { return null; } },
    set: key => { try { key ? sessionStorage.setItem('dub.draft', key) : sessionStorage.removeItem('dub.draft'); } catch {} },
  };

  function release(session) {
    clearTimeout(session.stopTimer);
    if (session.recorder) {
      session.recorder.onstop = null;
      try { session.recorder.stop(); } catch {}
    }
    session.stream?.getTracks().forEach(track => track.stop());
    if (session.url) URL.revokeObjectURL(session.url);
    draft.set('');
  }

  async function act(action, body) {
    try {
      const response = await fetch('./api/' + action, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(8000),
        body: JSON.stringify({ room, pid, round: state.dub.id, v: state.dub.version, ...body }),
      });
      const result = await response.json();
      return response.ok ? result : { error: result.error || t('sendFailed'), stale: result.stale };
    } catch {
      return { error: t('sendFailed'), offline: true };
    }
  }

  function fail(session, problem) {
    if (local !== session) return;
    session.mode = 'problem';
    session.problem = problem;
    paint();
  }

  async function startRecording() {
    const session = local;
    const limitMs = state.dubMine.limitMs;
    session.error = '';
    if (!window.isSecureContext) return fail(session, 'insecure');
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) return fail(session, 'unsupported');
    session.mode = 'asking';
    paint();
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      const problem = ['NotAllowedError', 'SecurityError'].includes(error.name) ? 'denied'
        : ['NotFoundError', 'OverconstrainedError'].includes(error.name) ? 'nomic'
        : ['NotReadableError', 'AbortError'].includes(error.name) ? 'busy' : 'micFailed';
      return fail(session, problem);
    }
    if (local !== session || session.mode !== 'asking') return stream.getTracks().forEach(track => track.stop());
    let recorder;
    try {
      recorder = new MediaRecorder(stream);
    } catch {
      stream.getTracks().forEach(track => track.stop());
      return fail(session, 'unsupported');
    }
    const chunks = [];
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    recorder.onstop = () => finalize(session, chunks, recorder.mimeType);
    // a revoked permission ends the track, what was captured so far is still finalized
    stream.getAudioTracks()[0].onended = () => { if (recorder.state === 'recording') recorder.stop(); };
    Object.assign(session, { stream, recorder, limitMs, startedAt: performance.now(), mode: 'recording' });
    recorder.start();
    session.stopTimer = setTimeout(stopRecording, limitMs);
    paint();
  }

  function stopRecording() {
    if (local.recorder?.state !== 'recording') return;
    local.mode = 'processing';
    local.recorder.stop();
    paint();
  }

  async function finalize(session, chunks, type) {
    clearTimeout(session.stopTimer);
    session.stream?.getTracks().forEach(track => track.stop());
    session.stream = session.recorder = null;
    if (local !== session) return;
    session.mode = 'processing';
    paint();
    try {
      const recorded = new Blob(chunks, { type });
      if (!recorded.size) throw new Error('empty');
      const wav = Dub.encodeWav(await sound.decode(await recorded.arrayBuffer()), session.limitMs);
      if (wav.size < 44 + 16000 * 2 * .2) throw new Error('empty');
      if (local !== session) return;
      Object.assign(session, { blob: wav, url: URL.createObjectURL(wav), mode: 'preview', actionId: '' });
      draft.set(session.key);
    } catch {
      return fail(session, 'notSaved');
    }
    paint();
  }

  function discardTake() {
    if (local.url) URL.revokeObjectURL(local.url);
    Object.assign(local, { blob: null, url: '', mode: 'idle', error: '' });
    draft.set('');
    paint();
  }

  // the same actionId goes with every retry, so the server records the take once
  async function submitTake() {
    const session = local;
    if (session.mode !== 'preview' || !connected) return;
    session.mode = 'sending';
    session.error = '';
    session.actionId ||= uuid();
    paint();
    const query = new URLSearchParams({ room, slot: state.dubMine.slot, round: state.dub.id, v: state.dub.version, actionId: session.actionId });
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch('./api/dubTake?' + query, {
          method: 'POST', headers: { 'Content-Type': 'audio/wav', 'X-Shumy-Pid': pid }, body: session.blob, signal: AbortSignal.timeout(15000),
        });
        const result = await response.json();
        if (local !== session) return;
        if (response.ok) {
          session.mode = 'sent';
          draft.set('');
        } else {
          session.actionId = '';
          session.error = result.error || t('sendFailed');
          if (result.retry) return discardAfterReject(session);
          session.mode = 'preview';
        }
        return paint();
      } catch {
        if (local !== session) return;
        await new Promise(resolve => setTimeout(resolve, 800 * (attempt + 1)));
        if (local !== session) return;
      }
    }
    session.mode = 'preview';
    session.error = t('sendFailed');
    paint();
  }

  function discardAfterReject(session) {
    const { error } = session;
    discardTake();
    local.error = error;
    paint();
  }

  async function sendText(event) {
    event.preventDefault();
    const session = local;
    const value = $('dubTextInput').value.trim();
    if (!value || pending || !connected) return;
    session.actionId ||= uuid();
    pending = 'text';
    session.error = '';
    paint();
    const result = await act('dubText', { slot: state.dubMine.slot, text: value, actionId: session.actionId });
    pending = '';
    if (local !== session) return paint();
    if (result.ok) session.mode = 'sent';
    else {
      if (!result.offline) session.actionId = '';
      session.error = result.error;
    }
    paint();
  }

  async function skip() {
    const session = local;
    if (pending || !connected) return;
    release(session);
    Object.assign(session, { blob: null, url: '', stream: null, recorder: null, mode: 'idle' });
    session.actionId ||= uuid();
    pending = 'skip';
    paint();
    const result = await act('dubSkip', { slot: state.dubMine.slot, actionId: session.actionId });
    pending = '';
    if (local === session && !result.ok) {
      if (!result.offline) session.actionId = '';
      session.error = result.error;
    }
    paint();
  }

  async function retake() {
    if (pending || !connected) return;
    pending = 'retake';
    paint();
    const result = await act('dubRetake', {});
    pending = '';
    if (!result.ok) $('error').textContent = result.error;
    paint();
  }

  let voteAction = '';
  async function vote(target) {
    if (pending || !connected) return;
    pending = 'vote';
    voteAction = uuid();
    $('error').textContent = '';
    paint();
    const result = await act('dubVote', { target, actionId: voteAction });
    pending = '';
    if (!result.ok) $('error').textContent = result.error;
    paint();
  }

  function paint() {
    if (!state?.dub) return;
    const dub = state.dub;
    const mine = state.dubMine ?? { audience: true };
    const scene = dub.scene;
    const role = mine.slot ? Dub.pick(scene.slots[mine.index].role, locale) : '';
    const current = dub.slots[dub.active];
    const show = { clock: false, stage: false, sound: false, cue: false, panel: '', busy: '', done: null, votes: false, result: false };
    let heading = Dub.pick(scene.title, locale);
    let lead = '';

    if (state.selfActive === false) {
      heading = t('otherDevice');
      lead = t('otherDeviceLead');
    } else if (dub.phase === 'intro') {
      lead = mine.audience ? t('audienceIntro') : `${t('yourRole', { role })}. ${t('roleLead')}`;
      show.busy = t('waitingStart');
    } else if (dub.phase === 'record') {
      const done = dub.slots.filter(slot => slot.status === 'ready' || slot.status === 'skipped').length;
      const voiced = dub.slots.filter(slot => slot.status !== 'caption').length;
      const waiting = dub.handoff || !current ? t('queueSoon')
        : mine.ahead > 1 ? t('queueLead', { name: current.ownerName, ahead: mine.ahead })
        : t('queueNext', { name: current.ownerName });
      if (mine.audience) {
        heading = t('audienceTitle');
        lead = `${t('audienceLead')} ${current && !dub.handoff ? t('recordingNow', { name: current.ownerName }) + '. ' : ''}${t('recordProgress', { done, total: voiced })}`;
      } else if (mine.status === 'pending') {
        heading = t('waitingStart');
        lead = waiting;
      } else if (mine.status === 'open') {
        heading = t('yourTurn');
        show.cue = show.clock = true;
        if (local.mode === 'asking') show.busy = t('asking');
        else if (local.mode === 'processing') show.busy = t('processing');
        else if (local.mode === 'sending' || pending === 'skip' || pending === 'text') show.busy = t('sending');
        else if (local.mode === 'sent') show.done = mine.accepted === 'text' || local.textMode ? 'text' : 'voice';
        else show.panel = local.textMode && local.mode !== 'recording' && local.mode !== 'preview' ? 'text' : local.mode;
      } else {
        show.done = mine.status === 'skipped' ? 'skip' : mine.accepted;
        heading = role;
        lead = current && !dub.handoff && current.id !== mine.slot ? `${t('recordingNow', { name: current.ownerName })}. ${t('recordProgress', { done, total: voiced })}` : t('recordProgress', { done, total: voiced });
      }
    } else if (dub.phase === 'review') {
      heading = t('reviewPhone');
      lead = t('reviewPhoneLead');
    } else {
      show.stage = show.sound = true;
      if (dub.phase === 'play') {
        heading = t('watchPhone');
        lead = t('watchLead');
      } else if (dub.phase === 'vote') {
        heading = t('votePhone');
        lead = mine.vote === undefined ? t('votePhoneLead') : mine.vote === null ? t('abstainSent') : `${t('voteSent')}. ${t('votePhoneLead')}`;
        show.votes = show.clock = true;
      } else {
        heading = t('resultPhone');
        lead = t('resultLead');
        show.result = true;
      }
    }

    $('dubEyebrow').textContent = `${t('game')} · ${Dub.pick(scene.title, locale)}`;
    $('dubHeading').textContent = heading;
    $('dubLead').textContent = lead;
    $('dubLead').hidden = !lead;
    $('dubClock').hidden = !show.clock;
    $('dubStage').hidden = !show.stage;
    $('dubSound').hidden = !show.sound;
    const myLine = dub.lines?.find(line => line.slot === mine.slot);
    $('dubMuteMineRow').hidden = !phoneSound || myLine?.kind !== 'voice';

    $('dubCue').hidden = !show.cue;
    if (show.cue) {
      $('dubRole').textContent = role;
      $('dubCueText').textContent = Dub.pick(mine.cue, locale);
      $('dubSuggested').textContent = mine.line ? t('suggested', { line: Dub.pick(mine.line, locale) }) : '';
      $('dubLimit').textContent = t('limit', { seconds: (mine.limitMs / 1000).toFixed(1).replace('.0', '') });
    }

    const panels = { idle: 'dubIdle', recording: 'dubRecording', preview: 'dubPreview', text: 'dubTextForm', problem: 'dubProblem' };
    for (const [name, id] of Object.entries(panels)) $(id).hidden = show.panel !== name;
    const retaking = Boolean(mine.accepted);
    for (const button of document.querySelectorAll('.dub-do-skip')) button.textContent = retaking ? t('keepTake') : t('skip');
    for (const button of document.querySelectorAll('#dub button')) button.disabled = !connected || Boolean(pending);
    if (show.panel === 'idle') $('dubRecord').hidden = (mine.attemptsLeft ?? 1) <= 0;
    if (show.panel === 'preview' && $('dubAudio').dataset.url !== local.url) {
      $('dubAudio').dataset.url = local.url;
      $('dubAudio').src = local.url;
    }
    if (show.panel === 'problem') {
      $('dubProblemText').textContent = t(local.problem);
      $('dubRetryMic').hidden = !['busy', 'micFailed', 'notSaved', 'draftLost'].includes(local.problem);
    }
    $('dubLocalError').textContent = show.panel ? local.error : '';
    $('dubBusy').hidden = !show.busy;
    $('dubBusy').textContent = show.busy;

    $('dubDone').hidden = !show.done;
    if (show.done) {
      $('dubDoneTitle').textContent = t({ voice: 'acceptedVoice', text: 'acceptedText', skip: 'acceptedSkip' }[show.done]);
      $('dubDoneLead').textContent = show.done === 'skip' ? t('skippedLead') : mine.canRetake ? t('retakeNote') : t('acceptedLead');
      $('dubRetake').hidden = !mine.canRetake;
    }

    $('dubVotes').hidden = !show.votes;
    if (show.votes) paintVotes(dub, mine);
    $('dubResult').hidden = !show.result;
    if (show.result) paintResult(dub);

    // focus must not stay on a control that has just been hidden
    const layout = `${dub.id}:${dub.phase}:${show.panel}:${show.busy}:${show.done}`;
    if (layout !== shownLayout) {
      shownLayout = layout;
      const active = document.activeElement;
      if (active && active !== document.body && $('dub').contains(active) && active.offsetParent === null) {
        (show.panel === 'recording' ? $('dubStop') : show.panel === 'text' ? $('dubTextInput') : $('dubHeading')).focus();
      }
    }
  }

  function lineLabel(dub, line) {
    const role = Dub.pick(dub.scene.slots.find(slot => slot.id === line.slot).role, locale);
    return t('playerLine', { role, name: line.by });
  }

  function paintVotes(dub, mine) {
    const key = JSON.stringify([dub.id, dub.votable, dub.lines.map(line => [line.kind, line.text]), mine.vote ?? 'none', mine.slot]);
    if (key !== votesKey) {
      votesKey = key;
      const options = dub.lines.filter(line => dub.votable.includes(line.slot)).map(line => {
        const button = document.createElement('button');
        const own = line.slot === mine.slot;
        button.type = 'button';
        button.dataset.vote = line.slot;
        button.dataset.own = own;
        button.setAttribute('aria-pressed', String(mine.vote === line.slot));
        const label = document.createElement('span');
        label.textContent = lineLabel(dub, line) + (line.kind === 'text' ? `: «${line.text}»` : '');
        button.append(label);
        if (own) {
          const tag = document.createElement('small');
          tag.textContent = t('voteOwn');
          button.append(' ', tag);
        }
        return button;
      });
      const none = document.createElement('button');
      none.type = 'button';
      none.className = 'dub-quiet';
      none.dataset.vote = '';
      none.setAttribute('aria-pressed', String(mine.vote === null));
      none.textContent = t('noVote');
      $('dubVotes').replaceChildren(...options, none);
    }
    for (const button of $('dubVotes').children) button.disabled = !connected || Boolean(pending) || button.dataset.own === 'true';
  }

  function paintResult(dub) {
    const { result } = dub;
    const items = [];
    const add = (title, body) => {
      const item = document.createElement('li');
      const strong = document.createElement('strong');
      strong.textContent = title;
      item.append(strong, body ? ' ' + body : '');
      items.push(item);
    };
    if (!dub.votable.length || dub.votable.length < 2) add(t('resultNoVote'));
    else if (!result.winners.length) add(t('resultNone'));
    else {
      const names = result.winners.map(id => dub.lines.find(line => line.slot === id)).filter(Boolean).map(line => lineLabel(dub, line));
      add(`${t(result.winners.length > 1 ? 'resultTie' : 'resultWinner')}:`, `${names.join(', ')} (${t('votes', { count: result.counts[result.winners[0]] })})`);
    }
    $('dubResult').replaceChildren(...items);
  }

  async function syncSound(restart) {
    const dub = state?.dub;
    if (!phoneSound || !dub?.lines) return sound.stop();
    await Promise.all(dub.lines.filter(line => line.kind === 'voice').map(line => sound.load(line.take)));
    const position = clock.position();
    if (state?.dub !== dub || position === null || position > dub.scene.durationMs) return;
    if (restart) sound.schedule(dub.scene, dub.lines, position, $('dubMuteMine').checked ? state.dubMine?.slot : null);
  }

  function tick() {
    const dub = state?.dub;
    if (dub) {
      const left = Math.max(0, deadlineAt - performance.now());
      if (!$('dubClock').hidden) $('dubClock').textContent = t('timeLeft', { time: Dub.clockText(left) });
      if (local.mode === 'recording') {
        const elapsed = performance.now() - local.startedAt;
        $('dubRecordingLeft').textContent = t('recordingLeft', { seconds: Math.max(0, Math.ceil((local.limitMs - elapsed) / 1000)) });
        $('dubMeter').style.width = `${Math.min(100, elapsed / local.limitMs * 100)}%`;
      }
      if (dub.lines) {
        const position = clock.position();
        if (position !== null && position >= 0 && position <= dub.scene.durationMs) stage.play(position, dub.lines);
        else {
          stage.rest();
          stage.showAt(position !== null && position > dub.scene.durationMs ? dub.scene.durationMs : 0);
        }
      }
    }
    requestAnimationFrame(tick);
  }

  function render(nextState, isConnected) {
    state = nextState;
    connected = isConnected;
    const dub = state.dub;
    if (!dub) return;
    const mine = state.dubMine;
    deadlineAt = performance.now() + dub.deadlineInMs;
    const key = `${dub.id}:${mine?.slot ?? ''}`;
    const open = dub.phase === 'record' && mine?.status === 'open' && state.selfActive !== false;
    if (local.key !== key || !open) {
      const lostDraft = open && draft.get() === key;
      release(local);
      local = fresh(key);
      $('dubTextInput').value = '';
      if (lostDraft) Object.assign(local, { mode: 'problem', problem: 'draftLost' });
    }
    stage.setScene(dub.scene);
    if (clock.sync(dub.playback)) syncSound(true);
    paint();
  }

  function init(options) {
    ({ $, room, pid, locale } = options);
    t = Dub.strings(locale);
    stage = Dub.stage($('dubStage'), locale);
    sound = Dub.audio(room, pid);
    for (const element of document.querySelectorAll('[data-dub]')) element.textContent = t(element.dataset.dub);
    $('dubRecord').onclick = startRecording;
    $('dubRetryMic').onclick = () => { local.mode = 'idle'; local.textMode = false; startRecording(); };
    $('dubStop').onclick = stopRecording;
    $('dubAgain').onclick = discardTake;
    $('dubSubmit').onclick = submitTake;
    $('dubTextForm').onsubmit = sendText;
    $('dubBackToVoice').onclick = () => { local.textMode = false; local.mode = 'idle'; local.error = ''; paint(); $('dubRecord').focus(); };
    $('dubRetake').onclick = retake;
    $('dub').addEventListener('click', event => {
      if (event.target.closest('.dub-to-text')) {
        local.textMode = true;
        local.mode = 'idle';
        local.error = '';
        paint();
        $('dubTextInput').focus();
      } else if (event.target.closest('.dub-do-skip')) skip();
      const choice = event.target.closest('[data-vote]');
      if (choice) vote(choice.dataset.vote || null);
    });
    $('dubPhoneSound').onchange = async event => {
      phoneSound = event.target.checked;
      $('error').textContent = '';
      if (phoneSound && !await sound.unlock()) {
        phoneSound = event.target.checked = false;
        $('error').textContent = t('phoneSoundBlocked');
      }
      paint();
      syncSound(true);
    };
    $('dubMuteMine').onchange = () => syncSound(true);
    requestAnimationFrame(tick);
  }

  return { init, render, leave: () => { release(local); local = fresh(''); sound?.stop(); } };
})();
