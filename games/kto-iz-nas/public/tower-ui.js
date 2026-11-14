window.TowerUi = (() => {
  const copy = {
    ru:{game:'Спаси башню',description:'Команды отвечают, чтобы достроить общую башню.',lobby:'4–12 игроков. Один назначенный игрок отвечает за команду. Верный ответ добавляет этаж, неверный или пропуск — трещину. Цель: 6 этажей до 3 трещин.',answer:'Строим башню',reveal:'Ответ открыт',result:'Итог башни',team:'Команда {number}',submitter:'Отвечает {name}',waiting:'Ответ команды уже принят. Жди раскрытия.',other:'Сейчас отвечает {name}.',canAnswer:'Ты отвечаешь за команду. Выбери один вариант.',audience:'Ты присоединился после начала. Смотри игру.',correct:'Верно: +1 этаж',wrong:'Неверно или пропуск: +1 трещина',saved:'Башня спасена!',fallen:'Башня рухнула',floors:'Этажи: {count} из {goal}',cracks:'Трещины: {count} из {limit}',advanceAnswer:'Открыть ответ',advanceReveal:'Следующий вопрос',advanceEnd:'Показать итог',next:'Новая башня',back:'В лобби',seconds:'Осталось {count} с',error:'Не удалось отправить. Проверь связь и попробуй снова.'},
    en:{game:'Save the Tower',description:'Teams answer to build a shared tower.',lobby:'4–12 players. One designated player answers for each team. Correct adds a floor; wrong or missing adds a crack. Reach 6 floors before 3 cracks.',answer:'Building the tower',reveal:'Answer revealed',result:'Tower result',team:'Team {number}',submitter:'{name} answers',waiting:'Team answer received. Wait for the reveal.',other:'{name} is answering.',canAnswer:'You answer for your team. Choose one option.',audience:'You joined after the start. Watch this game.',correct:'Correct: +1 floor',wrong:'Wrong or missing: +1 crack',saved:'Tower saved!',fallen:'Tower fell',floors:'Floors: {count} of {goal}',cracks:'Cracks: {count} of {limit}',advanceAnswer:'Reveal answer',advanceReveal:'Next question',advanceEnd:'Show result',next:'New tower',back:'Back to lobby',seconds:'{count} s left',error:'Could not send. Check your connection and try again.'},
    kk:{game:'Мұнараны құтқар',description:'Командалар жауап беріп, ортақ мұнара тұрғызады.',lobby:'4–12 ойыншы. Әр команданың тағайындалған ойыншысы жауап береді. Дұрыс жауап қабат қосады, қате не жауапсыз қалу сызат қосады. 3 сызатқа дейін 6 қабатқа жет.',answer:'Мұнараны тұрғызамыз',reveal:'Жауап ашылды',result:'Мұнара нәтижесі',team:'{number}-команда',submitter:'{name} жауап береді',waiting:'Команда жауабы қабылданды. Нәтижені күт.',other:'Қазір {name} жауап береді.',canAnswer:'Сен команда үшін жауап бересің. Бір нұсқаны таңда.',audience:'Сен басталғаннан кейін қосылдың. Ойынды бақыла.',correct:'Дұрыс: +1 қабат',wrong:'Қате не жауап жоқ: +1 сызат',saved:'Мұнара құтқарылды!',fallen:'Мұнара құлады',floors:'Қабат: {count}/{goal}',cracks:'Сызат: {count}/{limit}',advanceAnswer:'Жауапты ашу',advanceReveal:'Келесі сұрақ',advanceEnd:'Нәтижені көрсету',next:'Жаңа мұнара',back:'Бөлмеге оралу',seconds:'{count} с қалды',error:'Жіберілмеді. Байланысты тексеріп, қайта көр.'},
  };
  const t=(locale,key,values={})=>((copy[locale]??copy.ru)[key]??copy.ru[key]??'').replace(/\{(\w+)\}/g,(_,name)=>values[name]??'');
  const pick=(value,locale)=>value?.[locale]??value?.ru??'';
  let host,phone;
  function el(tag,text){const node=document.createElement(tag);node.textContent=text;return node;}
  function initHost(options){host={...options,deadline:0};const{$,api,state}=host;
    $('towerAdvance').onclick=()=>{const game=state().tower;api('towerAdvance',{game:game.id,v:game.version});};
    $('towerNext').onclick=()=>{const game=state().tower;api('towerNext',{game:game.id,v:game.version});};
    $('towerLobby').onclick=()=>api('lobby');requestAnimationFrame(tickHost);
  }
  function renderHost(state){if(!host||!state.tower)return;const{$,locale}=host,game=state.tower;
    host.deadline=performance.now()+game.remainingMs;
    $('towerPhase').textContent=`${t(locale,game.phase)} · ${game.questionNumber}`;
    $('towerQuestion').textContent=pick(game.question,locale);
    $('towerProgress').textContent=`${t(locale,'floors',{count:game.floors,goal:game.goal})} · ${t(locale,'cracks',{count:game.cracks,limit:game.limit})}`;
    $('towerFloors').replaceChildren(...Array.from({length:game.floors},(_,index)=>el('div',String(index+1))));
    $('towerTeams').replaceChildren(...game.teams.map(team=>{const card=document.createElement('div');card.className='duel-card';card.append(el('strong',t(locale,'team',{number:team.id+1})),el('p',team.people.map(person=>person.name).join(', ')));
      card.append(el('p',t(locale,'submitter',{name:team.people.find(person=>person.id===team.submitter)?.name??''})));
      if(game.reveal){const outcome=game.reveal.outcomes.find(item=>item.team===team.id);card.append(el('p',t(locale,outcome.correct?'correct':'wrong')));}else card.append(el('p',team.answered?'✓':'…'));return card;}));
    $('towerOptions').replaceChildren(...game.options.map((option,index)=>el('li',`${pick(option,locale)}${game.reveal?.correct===index?' ✓':''}`)));
    $('towerOutcome').textContent=game.reveal?.status?t(locale,game.reveal.status):'';
    $('towerClock').hidden=game.phase!=='answer';$('towerAdvance').hidden=game.phase==='result';
    $('towerAdvance').textContent=t(locale,game.phase==='answer'?'advanceAnswer':game.reveal?.status?'advanceEnd':'advanceReveal');
    $('towerNext').hidden=game.phase!=='result';$('towerNext').textContent=t(locale,'next');$('towerLobby').textContent=t(locale,'back');
  }
  function tickHost(){if(host)host.$('towerClock').textContent=t(host.locale,'seconds',{count:Math.ceil(Math.max(0,host.deadline-performance.now())/1000)});requestAnimationFrame(tickHost);}
  function initPhone(options){phone={...options,state:null,connected:false,pending:false,deadline:0,key:''};phone.$('towerChoices').onclick=event=>{const button=event.target.closest('[data-option]');if(button)send(Number(button.dataset.option));};requestAnimationFrame(tickPhone);}
  async function send(option){const{$,state,room,pid,locale}=phone;if(!state?.tower||!phone.connected||phone.pending||state.selfActive===false)return;const game=state.tower;
    phone.pending=true;$('towerFeedback').textContent='';
    try{const response=await fetch('./api/towerAnswer',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({room,pid,game:game.id,v:game.version,actionId:crypto.randomUUID(),option}),signal:AbortSignal.timeout(8000)});const result=await response.json();if(!response.ok)$('towerFeedback').textContent=result.error||t(locale,'error');}
    catch{$('towerFeedback').textContent=t(locale,'error');}phone.pending=false;renderPhone(phone.state,phone.connected);
  }
  function renderPhone(state,connected){if(!phone||!state.tower)return;const{$,locale}=phone,game=state.tower,mine=state.towerMine??{audience:true};phone.state=state;phone.connected=connected;phone.deadline=performance.now()+game.remainingMs;
    const team=game.teams.find(item=>item.id===mine.team),submitter=team?.people.find(person=>person.id===team.submitter)?.name??'';
    if(phone.key!==`${game.id}:${game.questionNumber}`){phone.key=`${game.id}:${game.questionNumber}`;$('towerFeedback').textContent='';}
    $('towerPhase').textContent=`${t(locale,game.phase)} · ${game.questionNumber}`;$('towerQuestion').textContent=pick(game.question,locale);
    $('towerProgress').textContent=`${t(locale,'floors',{count:game.floors,goal:game.goal})} · ${t(locale,'cracks',{count:game.cracks,limit:game.limit})}`;
    $('towerLead').textContent=mine.audience?t(locale,'audience'):game.phase==='result'?t(locale,game.reveal.status):game.phase==='reveal'?t(locale,game.reveal.outcomes.find(item=>item.team===mine.team).correct?'correct':'wrong'):mine.answered?t(locale,'waiting'):mine.canAnswer?t(locale,'canAnswer'):t(locale,'other',{name:submitter});
    $('towerChoices').hidden=game.phase!=='answer'||mine.audience||mine.answered||!mine.canAnswer;
    $('towerChoices').replaceChildren(...game.options.map((option,index)=>{const button=el('button',pick(option,locale));button.type='button';button.dataset.option=index;button.disabled=!connected||phone.pending||state.selfActive===false;return button;}));
    $('towerAnswer').hidden=game.phase==='answer';$('towerAnswer').textContent=game.reveal?`${pick(game.options[game.reveal.correct],locale)} · ${game.reveal.status?t(locale,game.reveal.status):''}`:'';
    $('towerClock').hidden=game.phase!=='answer';
  }
  function tickPhone(){if(phone)phone.$('towerClock').textContent=t(phone.locale,'seconds',{count:Math.ceil(Math.max(0,phone.deadline-performance.now())/1000)});requestAnimationFrame(tickPhone);}
  return{t,initHost,renderHost,initPhone,renderPhone};
})();
