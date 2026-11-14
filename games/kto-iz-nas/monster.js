const { randomUUID } = require('crypto');

const PARTS = { body: ['round','tall','wide'], eyes: ['two','one','three'], top: ['horns','antenna','crown'], accessory: ['none','bow','scarf'], color: ['coral','mint','gold','blue'] };
const CATEGORIES = [
  { ru:'Лучшая маскировка',en:'Best disguise',kk:'Ең жақсы бүркеніш' },
  { ru:'Самый дружелюбный монстр',en:'Friendliest monster',kk:'Ең мейірімді құбыжық' },
  { ru:'Гость из другой планеты',en:'Visitor from another planet',kk:'Басқа ғаламшардан келген қонақ' },
];
function cleanCaption(value) {
  if (value === '' || value === null || value === undefined) return '';
  if (typeof value !== 'string') return null;
  const text=value.replace(/[\u0000-\u001f\u007f\u2028\u2029]/g,' ').replace(/\s+/g,' ').trim();
  return text.length<=60 && !/[<>]/.test(text)?text:null;
}
function validParts(parts) { return parts && typeof parts==='object' && Object.keys(PARTS).every(key=>PARTS[key].includes(parts[key])) && Object.keys(parts).length===Object.keys(PARTS).length; }
function createMonster({players,changed,createMs=40000,voteMs=25000}) {
  let round=null,number=0,categoryIndex=0;
  const error=(message,status=409)=>({error:message,status});
  function stop(){clearTimeout(round?.timer);round=null;}
  function arm(ms,callback){clearTimeout(round.timer);const id=round.id,phase=round.phase;round.endsAt=Date.now()+ms;round.timer=setTimeout(()=>{if(round?.id===id&&round.phase===phase)callback()},ms);}
  function start(){const online=[...players.values()].filter(player=>player.online);
    if(online.length<2||online.length>20)return error('Для «Монстра на подиуме» нужно 2–20 игроков на связи');
    stop();round={id:randomUUID(),number:++number,version:1,phase:'create',category:CATEGORIES[categoryIndex++%CATEGORIES.length],
      people:new Map(online.map(player=>[player.id,player.name])),entries:new Map(),hidden:new Set(),votes:new Map(),actions:new Map(),result:null,page:0,endsAt:0,timer:null};
    arm(createMs,toReview);changed();return{ok:true};
  }
  function toReview(){if(!round||round.phase!=='create')return;clearTimeout(round.timer);round.endsAt=0;round.phase='review';round.version+=1;changed();}
  function toGallery(){if(!round||round.phase!=='review')return;if(!round.entries.size){round.phase='result';round.result={counts:{},winners:[],votes:0};round.version+=1;changed();return;}
    round.phase='gallery';round.version+=1;changed();}
  function toVote(){if(!round||round.phase!=='gallery')return;round.phase='vote';round.version+=1;arm(voteMs,toResult);changed();}
  function toResult(){if(!round||round.phase!=='vote')return;clearTimeout(round.timer);round.endsAt=0;
    const counts=Object.fromEntries([...round.entries.keys()].map(id=>[id,0]));
    for(const target of round.votes.values())if(target)counts[target]+=1;
    const high=Math.max(0,...Object.values(counts));const winners=high?[...round.entries.keys()].filter(id=>counts[id]===high):[];
    for(const id of winners){const player=players.get(id);if(player)player.score+=100;}
    round.result={counts,winners,votes:round.votes.size};round.phase='result';round.version+=1;changed();
  }
  function check(id,body,phase){if(!round||body.round!==round.id)return error('Раунд изменился');
    if(!id||!round.people.has(id))return error('Ты зритель этого раунда',403);
    if(!/^[a-f0-9-]{32,36}$/.test(body.actionId??''))return error('Некорректный запрос',400);
    const previous=round.actions.get(`${id}:${body.actionId}`);if(previous)return previous;
    if(round.phase!==phase||body.v!==round.version||Date.now()>=round.endsAt)return error('Время этого шага вышло');return null;}
  function remember(id,body){const result={ok:true};round.actions.set(`${id}:${body.actionId}`,result);return result;}
  const playerActions={
    monsterSubmit(id,body){const refusal=check(id,body,'create');if(refusal)return refusal;
      if(round.entries.has(id))return error('Монстр уже отправлен');
      if(!validParts(body.parts))return error('Выбери детали из списка',400);
      const caption=cleanCaption(body.caption);if(caption===null)return error('Подпись должна быть до 60 знаков без разметки',400);
      round.entries.set(id,{id,name:round.people.get(id),parts:body.parts,caption});const result=remember(id,body);changed();return result;
    },
    monsterVote(id,body){const refusal=check(id,body,'vote');if(refusal)return refusal;
      if(body.target!==null&&(!round.entries.has(body.target)||body.target===id))return error('Выбери другого монстра',400);
      round.votes.set(id,body.target);const result=remember(id,body);changed();return result;
    },
  };
  const hostActions={
    monsterAdvance(body){if(!round||body.round!==round.id||body.v!==round.version)return error('Экран устарел');
      if(round.phase==='create')toReview();else if(round.phase==='review')toGallery();else if(round.phase==='gallery')toVote();else if(round.phase==='vote')toResult();else return error('Сейчас переход недоступен');return{ok:true};},
    monsterHide(body){if(!round||body.round!==round.id||body.v!==round.version||round.phase!=='review')return error('Работы уже показаны');
      if(!round.entries.has(body.author)||typeof body.hidden!=='boolean')return error('Нет такой работы',400);
      if(body.hidden)round.hidden.add(body.author);else round.hidden.delete(body.author);changed();return{ok:true};},
    monsterPage(body){if(!round||body.round!==round.id||body.v!==round.version||!['gallery','vote','result'].includes(round.phase))return error('Экран устарел');
      const pages=Math.max(1,Math.ceil(round.entries.size/4));if(!Number.isInteger(body.page)||body.page<0||body.page>=pages)return error('Нет такой страницы',400);
      round.page=body.page;changed();return{ok:true};},
    monsterNext(body){if(!round||body.round!==round.id||body.v!==round.version||round.phase!=='result')return error('Сначала закончи раунд');return start();},
  };
  function publicState(){if(!round)return null;
    return{id:round.id,number:round.number,version:round.version,phase:round.phase,category:round.category,submitted:round.entries.size,eligible:round.people.size,
      entries:['gallery','vote','result'].includes(round.phase)?[...round.entries.values()].map(entry=>({...entry,caption:round.hidden.has(entry.id)?'':entry.caption})):null,
      page:round.page,pageCount:Math.max(1,Math.ceil(round.entries.size/4)),voters:round.phase==='vote'?round.votes.size:null,result:round.result,remainingMs:Math.max(0,round.endsAt-Date.now())};
  }
  function privateState(id){if(!round||!id)return null;return{audience:!round.people.has(id),submitted:round.entries.has(id),vote:round.votes.get(id)};}
  function hostState(){if(round?.phase!=='review')return null;return[...round.entries.values()].map(entry=>({...entry,hidden:round.hidden.has(entry.id)}));}
  return{start,stop,playerActions,hostActions,publicState,privateState,hostState};
}
module.exports={createMonster,PARTS,validParts,cleanCaption};
