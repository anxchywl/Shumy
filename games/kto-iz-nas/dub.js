const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const MEDIA_TYPES = { '.svg': 'image/svg+xml', '.mp4': 'video/mp4' };
const LOCALES = ['ru', 'en'];
const SAMPLE_RATE = 16000;
const BYTES_PER_SECOND = SAMPLE_RATE * 2;
const TAKE_MAX_MS = 8000;
const TAKE_MIN_MS = 150;
const TAKE_TOLERANCE_MS = 150;
const TAKE_MAX_BYTES = 44 + Math.ceil(BYTES_PER_SECOND * (TAKE_MAX_MS + TAKE_TOLERANCE_MS) / 1000);
const TEXT_MAX = 80;
const ATTEMPTS_PER_ROUND = 6;
const UPLOAD_GAP_MS = 1000;
const ACTION_ID = /^[a-f0-9-]{32,36}$/;

function localized(value) {
  return Boolean(value) && LOCALES.every(locale => typeof value[locale] === 'string' && value[locale].trim());
}

function validateScene(scene, publicDir) {
  const problems = [];
  const fail = message => problems.push(message);
  if (!/^[a-z0-9-]{1,40}$/.test(scene.id ?? '')) fail('нет корректного id');
  if (!localized(scene.title)) fail('нет названия на всех языках');
  if (!localized(scene.tone)) fail('нет описания тона на всех языках');

  const asset = scene.asset ?? {};
  const duration = asset.durationMs;
  if (!Number.isInteger(duration) || duration < 5000 || duration > 30000) fail('длительность должна быть от 5 до 30 секунд');
  if (!asset.license) fail('не указана лицензия материала');
  let source = '';
  if (typeof asset.file !== 'string' || asset.file.includes('..') || !/^dub\/[a-z0-9-]+\.[a-z0-9]+$/.test(asset.file)) fail('некорректный путь материала');
  else if (MEDIA_TYPES[path.extname(asset.file)] !== asset.type) fail(`тип материала ${asset.type} не поддерживается`);
  else {
    try {
      if (asset.type === 'image/svg+xml') source = fs.readFileSync(path.join(publicDir, asset.file), 'utf8');
      else if (!fs.statSync(path.join(publicDir, asset.file)).isFile()) fail(`файл ${asset.file} не найден`);
    } catch { fail(`файл ${asset.file} не найден`); }
    if (source && !/^\s*<svg[\s>]/.test(source)) fail(`файл ${asset.file} не является SVG`);
  }

  const segments = Array.isArray(scene.segments) ? scene.segments : [];
  if (!segments.length) fail('нет визуальных сегментов');
  let cursor = 0;
  for (const [index, segment] of segments.entries()) {
    const label = `сегмент ${index + 1}`;
    if (!Number.isInteger(segment.startMs) || !Number.isInteger(segment.endMs) || segment.startMs >= segment.endMs) fail(`${label}: неверные границы`);
    else if (segment.startMs !== cursor) fail(`${label}: сегменты должны идти подряд без наложений`);
    cursor = segment.endMs;
    if (!localized(segment.alt)) fail(`${label}: нет текста раскадровки`);
    if (source && (!segment.frame || !source.includes(`id="${segment.frame}"`))) fail(`${label}: в материале нет кадра ${segment.frame}`);
  }
  if (segments.length && cursor !== duration) fail('сегменты не покрывают всю сцену');

  const slots = Array.isArray(scene.slots) ? scene.slots : [];
  if (slots.length < 1 || slots.length > 6) fail('в сцене должно быть от 1 до 6 реплик');
  if (!Number.isInteger(scene.gapMs) || scene.gapMs < 200) fail('пауза между репликами должна быть не короче 200 мс');
  const ids = new Set();
  let previousEnd = null;
  for (const [index, slot] of slots.entries()) {
    const label = `реплика ${index + 1}`;
    if (!/^[a-z0-9-]{1,40}$/.test(slot.id ?? '') || ids.has(slot.id)) fail(`${label}: нет уникального id`);
    ids.add(slot.id);
    const length = slot.endMs - slot.startMs;
    if (!Number.isInteger(slot.startMs) || !Number.isInteger(slot.endMs) || slot.startMs < 0 || slot.endMs > duration) fail(`${label}: выходит за пределы сцены`);
    else if (length < 1000 || length > TAKE_MAX_MS) fail(`${label}: длина должна быть от 1 до 8 секунд`);
    else if (previousEnd !== null && slot.startMs < previousEnd + scene.gapMs) fail(`${label}: накладывается на предыдущую или идёт без паузы`);
    previousEnd = slot.endMs;
    if (!localized(slot.role)) fail(`${label}: нет имени роли`);
    if (!localized(slot.cue)) fail(`${label}: нет подсказки`);
    if (!localized(slot.caption)) fail(`${label}: нет запасного титра`);
    if (slot.line !== undefined && !localized(slot.line)) fail(`${label}: готовая реплика не на всех языках`);
  }
  return problems;
}

function loadScenes(list, publicDir) {
  const seen = new Set();
  return list.map(scene => {
    const problems = validateScene(scene, publicDir);
    if (seen.has(scene.id)) problems.push('id сцены повторяется');
    seen.add(scene.id);
    return { ...scene, problems };
  });
}

// accepts only 16 kHz mono 16-bit pcm, so the format and the duration are checked from the bytes themselves
function parseWav(buffer, limitMs) {
  const bad = error => ({ error });
  if (buffer.length < 44 || buffer.toString('latin1', 0, 4) !== 'RIFF' || buffer.readUInt32LE(4) !== buffer.length - 8 || buffer.toString('latin1', 8, 12) !== 'WAVE') return bad('Запись повреждена');
  let offset = 12;
  let format = null;
  let dataBytes = null;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString('latin1', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const body = offset + 8;
    if (id === 'fmt ') {
      if (size < 16 || body + 16 > buffer.length) return bad('Запись повреждена');
      format = {
        code: buffer.readUInt16LE(body),
        channels: buffer.readUInt16LE(body + 2),
        rate: buffer.readUInt32LE(body + 4),
        byteRate: buffer.readUInt32LE(body + 8),
        blockAlign: buffer.readUInt16LE(body + 12),
        bits: buffer.readUInt16LE(body + 14),
      };
    } else if (id === 'data') {
      if (body + size !== buffer.length) return bad('Запись повреждена');
      dataBytes = size;
      break;
    }
    offset = body + size + (size % 2);
  }
  if (!format || dataBytes === null) return bad('Запись повреждена');
  if (format.code !== 1 || format.channels !== 1 || format.rate !== SAMPLE_RATE || format.byteRate !== BYTES_PER_SECOND || format.blockAlign !== 2 || format.bits !== 16 || dataBytes % 2) return bad('Формат записи не поддерживается');
  const durationMs = Math.round(dataBytes / BYTES_PER_SECOND * 1000);
  if (durationMs < TAKE_MIN_MS) return bad('Запись пустая');
  if (durationMs > limitMs + TAKE_TOLERANCE_MS) return bad('Запись длиннее реплики');
  return { durationMs };
}

function cleanText(value) {
  if (typeof value !== 'string') return { error: 'Напиши реплику' };
  const text = value.replace(/[\u0000-\u001f\u007f\u2028\u2029]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return { error: 'Напиши реплику' };
  if (text.length > TEXT_MAX) return { error: `Реплика длиннее ${TEXT_MAX} знаков` };
  if (/[<>]/.test(text)) return { error: 'Убери угловые скобки из реплики' };
  return { text };
}

function shuffle(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function createDub({ players, scenes, config, changed }) {
  let round = null;
  let roundNumber = 0;
  let played = [];

  const slotLimit = slot => Math.min(TAKE_MAX_MS, slot.spec.endMs - slot.spec.startMs);
  const hasContent = slot => Boolean(slot.take || slot.text);
  const finished = slot => !['pending', 'open'].includes(slot.status);
  const usage = () => round ? round.slots.reduce((sum, slot) => sum + (slot.take?.data.length ?? 0), 0) : 0;
  const bump = () => { round.version += 1; };

  function refuse(error, status = 400) {
    return { error, status, phase: round?.phase ?? 'lobby', version: round?.version ?? 0 };
  }
  const stale = () => ({ ...refuse('Экран устарел. Показываем актуальный ход игры', 409), stale: true });

  function arm(at, callback) {
    clearTimeout(round.timer);
    const current = round;
    round.endsAt = at;
    round.totalMs = Math.max(0, at - Date.now());
    round.timer = setTimeout(() => { if (round === current) callback(); }, round.totalMs);
  }

  function disarm() {
    clearTimeout(round.timer);
    round.endsAt = 0;
    round.totalMs = 0;
  }

  function assign(slot, player) {
    slot.owner = player.id;
    slot.ownerName = player.name;
  }

  // only people who were present at the start and have no line yet can take over a line
  function substitute() {
    return [...round.participants].map(id => players.get(id))
      .find(player => player?.online && !round.slots.some(slot => slot.owner === player.id));
  }

  function nextScene() {
    const playable = scenes.filter(scene => !scene.problems.length);
    if (playable.every(scene => played.includes(scene.id))) played = [];
    return playable.find(scene => !played.includes(scene.id)) ?? null;
  }

  function start(sceneId) {
    const scene = sceneId ? scenes.find(candidate => candidate.id === sceneId) : nextScene();
    if (!scene) return refuse('Нет сцены, которую можно запустить');
    if (scene.problems.length) return refuse(`Сцена не запускается: ${scene.problems[0]}`);
    const present = shuffle([...players.values()].filter(player => player.online));
    if (present.length < 2) return refuse('Нужно 2+ игрока на связи');
    stop();
    const slots = scene.slots.map((spec, index) => ({
      spec, index, owner: null, ownerName: '', status: 'caption', take: null, text: null, hidden: false, deadline: 0,
    }));
    const voiced = shuffle(slots.map(slot => slot.index)).slice(0, present.length);
    voiced.forEach((index, order) => {
      assign(slots[index], present[order]);
      slots[index].status = 'pending';
    });
    round = {
      id: randomUUID(), number: ++roundNumber, version: 1, phase: 'intro', scene, slots,
      participants: new Set(present.map(player => player.id)),
      active: -1, handoff: false, extended: false, reopened: false,
      attempts: new Map(), lastUpload: new Map(), actions: new Map(), votes: new Map(),
      playback: null, result: null, endsAt: 0, totalMs: 0, timer: null,
    };
    played.push(scene.id);
    arm(Date.now() + config.introMs, openNext);
    changed();
    return { ok: true };
  }

  function stop() {
    if (!round) return;
    clearTimeout(round.timer);
    round = null;
  }

  function openNext() {
    round.handoff = false;
    const slot = round.slots.find(candidate => candidate.status === 'pending');
    if (!slot) return toReview();
    const owner = players.get(slot.owner);
    if (!owner?.online) {
      const player = substitute();
      if (player) assign(slot, player);
      else if (!owner) {
        slot.status = 'caption';
        slot.owner = null;
        return openNext();
      }
    }
    slot.status = 'open';
    slot.deadline = Date.now() + config.slotMs;
    round.phase = 'record';
    round.active = slot.index;
    arm(slot.deadline, () => settle(slot));
    bump();
    changed();
  }

  // content replaces what the slot held in one step, without content the slot keeps what was accepted before
  function settle(slot, content) {
    if (content) Object.assign(slot, content);
    else slot.status = slot.take ? 'voice' : slot.text ? 'text' : 'skipped';
    round.handoff = true;
    arm(Date.now() + config.handoffMs, openNext);
    bump();
    changed();
  }

  function toReview() {
    disarm();
    round.phase = 'review';
    round.active = -1;
    round.handoff = false;
    bump();
    changed();
  }

  const votable = () => round.slots.filter(slot => hasContent(slot) && !slot.hidden);

  function toVote() {
    if (votable().length < 2 || players.size < 2) return toResult();
    round.phase = 'vote';
    arm(Date.now() + config.voteMs, toResult);
    bump();
    changed();
  }

  function toResult() {
    disarm();
    const open = new Set(votable().map(slot => slot.spec.id));
    const counts = {};
    let abstained = 0;
    for (const target of round.votes.values()) {
      if (open.has(target)) counts[target] = (counts[target] ?? 0) + 1;
      else abstained += 1;
    }
    const top = Math.max(0, ...Object.values(counts));
    round.result = {
      counts,
      winners: top ? Object.keys(counts).filter(id => counts[id] === top) : [],
      totalVotes: Object.values(counts).reduce((sum, count) => sum + count, 0),
      abstained,
    };
    round.phase = 'result';
    bump();
    changed();
  }

  function everyoneVoted() {
    const online = [...players.values()].filter(player => player.online);
    return online.length > 0 && online.every(player => round.votes.has(player.id));
  }

  function maybeAllVoted() {
    if (round?.phase !== 'vote' || !everyoneVoted()) return;
    const current = round;
    setTimeout(() => {
      if (round === current && round.phase === 'vote' && everyoneVoted()) toResult();
    }, 600);
  }

  function remember(playerId, actionId, result) {
    round.actions.set(`${playerId}:${actionId}`, result);
    if (round.actions.size > 300) round.actions.delete(round.actions.keys().next().value);
    return result;
  }

  // a repeated action returns its first result before any freshness check, so a retry is always safe
  function check(body, needsActionId, playerId = '') {
    if (!round) return stale();
    if (needsActionId) {
      if (typeof body.actionId !== 'string' || !ACTION_ID.test(body.actionId)) return refuse('Некорректный запрос');
      if (round.actions.has(`${playerId}:${body.actionId}`)) return round.actions.get(`${playerId}:${body.actionId}`);
    }
    if (body.round !== round.id || body.v !== round.version) return stale();
    return null;
  }

  function ownOpenSlot(playerId, slotId) {
    const slot = round.slots.find(candidate => candidate.spec.id === slotId);
    if (!playerId || !players.has(playerId) || !slot || slot.owner !== playerId) return { failure: refuse('Эта реплика назначена другому игроку', 403) };
    if (round.phase !== 'record' || slot.status !== 'open' || Date.now() >= slot.deadline) return { failure: refuse('Время этой реплики вышло', 409) };
    return { slot };
  }

  function submitTake(playerId, body, data) {
    const early = check(body, true, playerId);
    if (early) return early;
    const { slot, failure } = ownOpenSlot(playerId, body.slot);
    if (failure) return failure;
    const now = Date.now();
    const attempts = round.attempts.get(playerId) ?? 0;
    if (attempts >= ATTEMPTS_PER_ROUND) return refuse('Слишком много попыток записи. Отправь реплику текстом или пропусти', 429);
    if (now - (round.lastUpload.get(playerId) ?? 0) < UPLOAD_GAP_MS) return refuse('Слишком быстро. Попробуй через секунду', 429);
    round.attempts.set(playerId, attempts + 1);
    round.lastUpload.set(playerId, now);
    const wav = parseWav(data, slotLimit(slot));
    if (wav.error) return { ...refuse(`${wav.error}. Запиши ещё раз или отправь текст`), retry: true };
    if (usage() - (slot.take?.data.length ?? 0) + data.length > config.roomBytes) return refuse('В комнате закончилось место для записей. Отправь реплику текстом', 413);
    const result = remember(playerId, body.actionId, { ok: true, durationMs: wav.durationMs });
    settle(slot, { status: 'voice', take: { id: randomUUID(), data, durationMs: wav.durationMs }, text: null });
    return result;
  }

  const playerActions = {
    dubText(playerId, body) {
      const early = check(body, true, playerId);
      if (early) return early;
      const { slot, failure } = ownOpenSlot(playerId, body.slot);
      if (failure) return failure;
      const clean = cleanText(body.text);
      if (clean.error) return refuse(clean.error);
      const result = remember(playerId, body.actionId, { ok: true });
      settle(slot, { status: 'text', text: clean.text, take: null });
      return result;
    },
    dubSkip(playerId, body) {
      const early = check(body, true, playerId);
      if (early) return early;
      const { slot, failure } = ownOpenSlot(playerId, body.slot);
      if (failure) return failure;
      const result = remember(playerId, body.actionId, { ok: true });
      settle(slot, hasContent(slot) ? undefined : { status: 'skipped' });
      return result;
    },
    // reopens the player's own accepted line during the handoff, the original deadline stays
    dubRetake(playerId, body) {
      const early = check(body, false);
      if (early) return early;
      const slot = round.slots[round.active];
      if (!round.handoff || !slot || slot.owner !== playerId || !hasContent(slot)) return refuse('Эту реплику уже нельзя перезаписать', 409);
      if (slot.deadline - Date.now() < config.retakeMinMs) return refuse('На перезапись не осталось времени', 409);
      slot.status = 'open';
      round.handoff = false;
      arm(slot.deadline, () => settle(slot));
      bump();
      changed();
      return { ok: true };
    },
    dubVote(playerId, body) {
      const early = check(body, true, playerId);
      if (early) return early;
      if (!playerId || !players.has(playerId)) return refuse('Сначала войди в игру', 403);
      if (round.phase !== 'vote' || Date.now() >= round.endsAt) return refuse('Голосование уже закрыто', 409);
      const target = body.target ?? null;
      if (target !== null) {
        const slot = votable().find(candidate => candidate.spec.id === target);
        if (!slot) return refuse('Нет такой реплики');
        if (slot.owner === playerId) return refuse('За свою реплику голосовать нельзя');
      }
      round.votes.set(playerId, target);
      const result = remember(playerId, body.actionId, { ok: true });
      changed();
      maybeAllVoted();
      return result;
    },
  };

  const hostActions = {
    dubAdvance(body) {
      const early = check(body, false);
      if (early) return early;
      if (round.phase === 'intro') openNext();
      else if (round.phase === 'play') toVote();
      else if (round.phase === 'vote') toResult();
      else return refuse('Сейчас это действие недоступно', 409);
      return { ok: true };
    },
    dubExtend(body) {
      const early = check(body, false);
      if (early) return early;
      const slot = round.slots[round.active];
      if (round.phase !== 'record' || round.handoff || slot?.status !== 'open') return refuse('Сейчас никто не записывает', 409);
      if (round.extended) return refuse('Время в этом раунде уже добавляли', 409);
      round.extended = true;
      slot.deadline += config.extendMs;
      arm(slot.deadline, () => settle(slot));
      changed();
      return { ok: true };
    },
    dubFinish(body) {
      const early = check(body, false);
      if (early) return early;
      if (round.phase !== 'record') return refuse('Запись уже закончилась', 409);
      for (const slot of round.slots) {
        if (!finished(slot)) slot.status = slot.take ? 'voice' : slot.text ? 'text' : 'skipped';
      }
      toReview();
      return { ok: true };
    },
    dubReopen(body) {
      const early = check(body, false);
      if (early) return early;
      const slot = round.slots[round.active];
      if (round.phase !== 'record' || !round.handoff || slot?.status !== 'skipped' || !players.has(slot.owner)) return refuse('Эту реплику уже нельзя вернуть', 409);
      if (round.reopened) return refuse('Реплику в этом раунде уже возвращали', 409);
      round.reopened = true;
      round.handoff = false;
      slot.status = 'open';
      slot.deadline = Math.max(slot.deadline, Date.now() + config.reopenMs);
      arm(slot.deadline, () => settle(slot));
      bump();
      changed();
      return { ok: true };
    },
    dubCancel(body) {
      const early = check(body, false);
      if (early) return early;
      stop();
      return { ok: true };
    },
    // count names the playback the host saw, a second click on the same button does not restart the scene twice
    dubPlay(body) {
      const early = check(body, false);
      if (early) return early;
      if (!['review', 'play', 'vote', 'result'].includes(round.phase)) return refuse('Сцена ещё не собрана', 409);
      const count = round.playback?.count ?? 0;
      if (body.count !== count) return stale();
      round.playback = { startedAt: Date.now() + config.playLeadMs, count: count + 1 };
      if (round.phase === 'review') {
        round.phase = 'play';
        bump();
      }
      changed();
      return { ok: true };
    },
    dubHide(body) {
      const early = check(body, false);
      if (early) return early;
      const slot = round.slots.find(candidate => candidate.spec.id === body.slot);
      if (!slot || !hasContent(slot) || round.phase === 'intro' || round.phase === 'record') return refuse('Эту реплику нельзя скрыть', 409);
      slot.hidden = body.hidden === true;
      changed();
      return { ok: true };
    },
    dubNext(body) {
      const early = check(body, false);
      if (early) return early;
      if (!['review', 'play', 'vote', 'result'].includes(round.phase)) return refuse('Сначала закончи запись', 409);
      return start(null);
    },
  };

  function playerLeft(playerId) {
    if (!round) return;
    round.votes.delete(playerId);
    const slot = round.slots.find(candidate => candidate.owner === playerId && !finished(candidate));
    if (!slot) return maybeAllVoted();
    if (hasContent(slot)) return settle(slot);
    const player = substitute();
    if (player) {
      assign(slot, player);
      if (slot.status === 'open') {
        slot.deadline = Date.now() + config.slotMs;
        arm(slot.deadline, () => settle(slot));
        bump();
      }
    } else if (slot.status === 'open') {
      slot.status = 'caption';
      slot.owner = null;
      slot.ownerName = '';
      return openNext();
    } else {
      slot.status = 'caption';
      slot.owner = null;
      slot.ownerName = '';
    }
    changed();
  }

  const publicStatus = slot => slot.status === 'voice' || slot.status === 'text' ? 'ready' : slot.status;

  function lines() {
    return round.slots.map(slot => {
      const line = { slot: slot.spec.id, by: slot.ownerName, fromPlayer: hasContent(slot), hidden: slot.hidden };
      if (slot.status === 'voice' && !slot.hidden) return { ...line, kind: 'voice', take: slot.take.id };
      if (slot.status === 'text' && !slot.hidden) return { ...line, kind: 'text', text: slot.text };
      return { ...line, kind: 'caption', text: slot.spec.caption };
    });
  }

  function publicState() {
    if (!round) return null;
    const { scene } = round;
    const shown = ['play', 'vote', 'result'].includes(round.phase);
    const now = Date.now();
    return {
      id: round.id,
      number: round.number,
      version: round.version,
      phase: round.phase,
      handoff: round.handoff,
      active: round.active,
      extended: round.extended,
      canReopen: round.phase === 'record' && round.handoff && !round.reopened
        && round.slots[round.active]?.status === 'skipped' && players.has(round.slots[round.active].owner),
      deadlineInMs: round.endsAt ? Math.max(0, round.endsAt - now) : 0,
      deadlineTotalMs: round.totalMs,
      scene: {
        id: scene.id, title: scene.title, tone: scene.tone, durationMs: scene.asset.durationMs,
        asset: `./${scene.asset.file}`, assetType: scene.asset.type,
        credit: scene.asset.credit, sourceUrl: scene.asset.sourceUrl, licenseUrl: scene.asset.licenseUrl,
        segments: scene.segments,
        slots: scene.slots.map(({ id, startMs, endMs, role }) => ({ id, startMs, endMs, role })),
      },
      slots: round.slots.map(slot => ({ id: slot.spec.id, owner: slot.owner, ownerName: slot.ownerName, status: publicStatus(slot) })),
      lines: shown ? lines() : null,
      playback: round.playback && { count: round.playback.count, elapsedMs: now - round.playback.startedAt },
      votable: round.phase === 'vote' || round.phase === 'result' ? votable().map(slot => slot.spec.id) : [],
      voted: round.phase === 'vote' ? [...round.votes.keys()] : [],
      result: round.result,
      hasNext: scenes.some(scene => !scene.problems.length),
    };
  }

  function privateState(playerId) {
    if (!round || !playerId) return null;
    const mine = { vote: round.votes.has(playerId) ? round.votes.get(playerId) : undefined };
    const slot = round.slots.find(candidate => candidate.owner === playerId);
    if (!slot) return { ...mine, audience: true };
    const ahead = round.slots.filter(candidate => candidate.index < slot.index && !finished(candidate)).length;
    return {
      ...mine,
      slot: slot.spec.id,
      index: slot.index,
      status: slot.status,
      cue: slot.status === 'open' ? slot.spec.cue : null,
      line: slot.status === 'open' ? slot.spec.line ?? null : null,
      limitMs: slotLimit(slot),
      ahead,
      accepted: slot.take ? 'voice' : slot.text ? 'text' : null,
      canRetake: round.handoff && round.active === slot.index && hasContent(slot) && slot.deadline - Date.now() >= config.retakeMinMs,
      attemptsLeft: ATTEMPTS_PER_ROUND - (round.attempts.get(playerId) ?? 0),
    };
  }

  // the host sees player text before the room does, to hide a line that should not be shown
  function hostState() {
    return round?.phase === 'review' ? { lines: lines() } : null;
  }

  function takeFor(takeId, { host, playerId }) {
    if (!round) return null;
    const slot = round.slots.find(candidate => candidate.take?.id === takeId);
    if (!slot) return null;
    if (host && round.phase !== 'intro' && round.phase !== 'record') return slot.take.data;
    if (playerId && players.has(playerId) && !slot.hidden && ['play', 'vote', 'result'].includes(round.phase)) return slot.take.data;
    return null;
  }

  return {
    start, stop, submitTake, playerActions, hostActions, playerLeft, presenceChanged: maybeAllVoted,
    publicState, privateState, hostState, takeFor, usage,
    active: () => Boolean(round),
  };
}

module.exports = { loadScenes, validateScene, parseWav, cleanText, createDub, TAKE_MAX_BYTES };
