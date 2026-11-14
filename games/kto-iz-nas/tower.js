const { randomUUID } = require('crypto');

const QUESTIONS = [
  { text: { ru: 'Сколько сторон у треугольника?', en: 'How many sides does a triangle have?', kk: 'Үшбұрыштың неше қабырғасы бар?' }, options: [{ ru:'2',en:'2',kk:'2' },{ ru:'3',en:'3',kk:'3' },{ ru:'4',en:'4',kk:'4' }], correct:1 },
  { text: { ru: 'Сколько будет 2 + 3?', en: 'What is 2 + 3?', kk: '2 + 3 қанша?' }, options: [{ ru:'4',en:'4',kk:'4' },{ ru:'5',en:'5',kk:'5' },{ ru:'6',en:'6',kk:'6' }], correct:1 },
  { text: { ru: 'Какая фигура не имеет углов?', en: 'Which shape has no corners?', kk: 'Қай пішінде бұрыш жоқ?' }, options: [{ ru:'круг',en:'circle',kk:'шеңбер' },{ ru:'квадрат',en:'square',kk:'шаршы' },{ ru:'треугольник',en:'triangle',kk:'үшбұрыш' }], correct:0 },
  { text: { ru: 'Сколько минут в одном часе?', en: 'How many minutes are in one hour?', kk: 'Бір сағатта неше минут бар?' }, options: [{ ru:'30',en:'30',kk:'30' },{ ru:'60',en:'60',kk:'60' },{ ru:'90',en:'90',kk:'90' }], correct:1 },
  { text: { ru: 'Какое число идёт после 19?', en: 'Which number comes after 19?', kk: '19-дан кейін қандай сан келеді?' }, options: [{ ru:'18',en:'18',kk:'18' },{ ru:'20',en:'20',kk:'20' },{ ru:'21',en:'21',kk:'21' }], correct:1 },
  { text: { ru: 'Сколько дней в обычной неделе?', en: 'How many days are in a standard week?', kk: 'Бір аптада неше күн бар?' }, options: [{ ru:'5',en:'5',kk:'5' },{ ru:'7',en:'7',kk:'7' },{ ru:'8',en:'8',kk:'8' }], correct:1 },
];
function validateQuestions(questions) {
  for (const question of questions) if (!Number.isInteger(question.correct) || question.correct < 0 || question.correct >= question.options?.length || question.options.length !== 3 || ![question.text, ...question.options].every(value => ['ru','en','kk'].every(locale => typeof value?.[locale] === 'string' && value[locale].trim()))) throw new Error('Неверный вопрос для башни');
}
validateQuestions(QUESTIONS);
function createTower({ players, changed, answerMs = 22000 }) {
  let game = null, number = 0, deck = [...QUESTIONS];
  const error = (message, status = 409) => ({ error: message, status });
  function stop() { clearTimeout(game?.timer); game = null; }
  function arm() {
    clearTimeout(game.timer);
    const id = game.id, questionNumber = game.questionNumber;
    game.endsAt = Date.now() + answerMs;
    game.timer = setTimeout(() => { if (game?.id === id && game.phase === 'answer' && game.questionNumber === questionNumber) reveal(); }, answerMs);
  }
  function nextQuestion() {
    if (!game || game.phase === 'result') return;
    if (!deck.length) deck = [...QUESTIONS];
    game.question = deck.splice(Math.floor(Math.random() * deck.length), 1)[0];
    game.questionNumber += 1; game.version += 1; game.phase = 'answer'; game.answers = new Map(); game.reveal = null;
    for (const team of game.teams) {
      const online = team.people.filter(person => players.get(person.id)?.online);
      const candidate = online[game.questionNumber % online.length] ?? team.people[game.questionNumber % team.people.length];
      team.submitter = candidate?.id ?? null;
    }
    arm(); changed();
  }
  function start() {
    const online = [...players.values()].filter(player => player.online);
    if (online.length < 4 || online.length > 12) return error('Для «Спаси башню» нужно 4–12 игроков на связи');
    stop();
    const shuffled = [...online]; for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]]; }
    const groups = [shuffled.filter((_,index) => index%2 === 0), shuffled.filter((_,index) => index%2 === 1)];
    game = { id: randomUUID(), number: ++number, phase: 'answer', version: 0, questionNumber: 0,
      teams: groups.map((group,index) => ({ id:index, people:group.map(player => ({id:player.id,name:player.name})), submitter:null })),
      floors: 0, cracks: 0, goal: 6, limit: 3, answers:new Map(), actions:new Map(), reveal:null, endsAt:0, timer:null };
    nextQuestion(); return { ok:true };
  }
  function reveal() {
    if (!game || game.phase !== 'answer') return;
    clearTimeout(game.timer); game.endsAt=0;
    const outcomes = game.teams.map(team => {
      const answer = game.answers.get(team.id);
      const correct = answer?.option === game.question.correct;
      if (correct) game.floors += 1; else game.cracks += 1;
      if (correct) for (const person of team.people) { const player=players.get(person.id); if (player) player.score += 50; }
      return { team:team.id, option:answer?.option ?? null, correct, by:answer?.by ?? null };
    });
    game.reveal = { correct:game.question.correct, outcomes, status:game.floors>=game.goal ? 'saved' : game.cracks>=game.limit ? 'fallen' : null };
    game.phase='reveal'; game.version+=1; changed();
  }
  const playerActions = {
    towerAnswer(id, body) {
      if (!game || body.game !== game.id) return error('Игра изменилась');
      if (!/^[a-f0-9-]{32,36}$/.test(body.actionId ?? '')) return error('Некорректный запрос',400);
      const key=`${id}:${body.actionId}`;
      if (game.actions.has(key)) return game.actions.get(key);
      if (game.phase!=='answer' || body.v!==game.version || Date.now()>=game.endsAt) return error('Время ответа вышло');
      const team=game.teams.find(item=>item.people.some(person=>person.id===id));
      if (!team) return error('Ты зритель этого раунда',403);
      if (id!==team.submitter && players.get(team.submitter)?.online) return error('Отвечает назначенный игрок',403);
      if (game.answers.has(team.id)) return error('Ответ команды уже принят');
      if (!Number.isInteger(body.option) || body.option<0 || body.option>=game.question.options.length) return error('Нет такого ответа',400);
      game.answers.set(team.id,{option:body.option,by:id});
      const result={ok:true}; game.actions.set(key,result); changed();
      if (game.answers.size===game.teams.length) setTimeout(()=>{if(game?.phase==='answer'&&game.answers.size===game.teams.length)reveal()},500);
      return result;
    },
  };
  const hostActions = {
    towerAdvance(body) {
      if (!game || body.game!==game.id || body.v!==game.version) return error('Экран устарел');
      if (game.phase==='answer') reveal();
      else if (game.phase==='reveal') { if(game.reveal.status){game.phase='result';game.version+=1;changed();} else nextQuestion(); }
      else return error('Сейчас переход недоступен');
      return {ok:true};
    },
    towerNext(body) {
      if (!game || body.game!==game.id || body.v!==game.version || game.phase!=='result') return error('Сначала закончи игру');
      return start();
    },
  };
  function publicState() {
    if (!game) return null;
    return { id:game.id,number:game.number,phase:game.phase,version:game.version,questionNumber:game.questionNumber,
      question:game.question.text,options:game.question.options,teams:game.teams.map(team=>({id:team.id,people:team.people,submitter:team.submitter,answered:game.answers.has(team.id)})),
      floors:game.floors,cracks:game.cracks,goal:game.goal,limit:game.limit,reveal:game.reveal,remainingMs:Math.max(0,game.endsAt-Date.now()) };
  }
  function privateState(id) {
    if (!game || !id) return null;
    const team=game.teams.find(item=>item.people.some(person=>person.id===id));
    if (!team) return {audience:true};
    return {audience:false,team:team.id,canAnswer:id===team.submitter || !players.get(team.submitter)?.online,answered:game.answers.has(team.id),myAnswer:game.answers.get(team.id)?.option ?? null};
  }
  return {start,stop,playerActions,hostActions,publicState,privateState};
}
module.exports={createTower,validateQuestions};
