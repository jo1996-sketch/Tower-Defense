import {Game,FACTIONS,UNITS,ENEMY_TYPES,SLOTS,PATH,WORLD,seeded,waveSpec} from './engine.js?v=0.2';
import {BattleRenderer} from './renderer.js?v=0.2';

const $=id=>document.getElementById(id),icon=(name,cls='')=>`<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const roman=['','I','II','III','IV','V'],saveKey='bastion.checkpoint.v1',recordKey='bastion.record.v1';
const readStore=(key,fallback=null)=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
const writeStore=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}};
const deleteStore=key=>{try{localStorage.removeItem(key);}catch{}};
let faction=FACTIONS[0],game=null,selectedType=null,selectedSlot=null,hoverSlot=null,paused=false,speed=1,inMenu=true,tutorialStep=0,tutorialHidden=false,toastUntil=0,autoClock=7,lastFrame=0,hudClock=0,storageOK=true,dialogPause=false;
let audioContext=null,sound=false,lastShotSound=0,spellArmed=false,aim=null,focusMode=false,visualTime=0;
const canvas=$('map'),renderer=new BattleRenderer(canvas);
function unitArt(type){return `<span class="mini-sprite race-${faction.id} col-${Object.keys(UNITS).indexOf(type)}" aria-hidden="true"></span>`;}

function portrait(f){
 const index=FACTIONS.findIndex(x=>x.id===f.id);
 return `<div class="painted-portrait" style="background-position-x:${index*25}%" role="img" aria-label="${f.name}"></div>`;
}
function chooseFaction(id){
 faction=FACTIONS.find(f=>f.id===id)||FACTIONS[0];
 $('faction-grid').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.faction===id)));
 $('faction-lore').textContent=faction.description;$('faction-bonus').textContent=faction.bonus;
}
$('faction-grid').innerHTML=FACTIONS.map(f=>`<button class="faction-card" data-faction="${f.id}" style="--f:${f.color};--fd:${f.dark}" aria-pressed="${f.id===faction.id}"><span class="faction-checked">✓</span><div class="faction-art">${portrait(f)}</div><div class="faction-card-body"><span class="race">${f.race}</span><h2>${f.name}</h2><span class="faction-tagline">${f.title}</span></div></button>`).join('');
$('faction-grid').addEventListener('click',e=>{const b=e.target.closest('[data-faction]');if(b){chooseFaction(b.dataset.faction);sfx('click');}});chooseFaction(faction.id);

function updateMenu(){
 let data=readStore(saveKey);try{if(data)Game.restore(data);}catch{data=null;deleteStore(saveKey);}
 $('continue').hidden=!data;$('start').firstChild.textContent=data?'Neuen Lauf beginnen ':'Bastion verteidigen ';
 const record=readStore(recordKey,0);$('menu-record').textContent=Number.isInteger(record)&&record>0?`Dein Rekord: ${record} Wellen abgewehrt.`:'Deine Geschichte beginnt mit Welle 1.';
}
function checkpoint(){if(game&&game.phase==='build'){storageOK=writeStore(saveKey,game.serialize());}}
function startRun(restore=false){
 try{game=restore?Game.restore(readStore(saveKey),onEvent):new Game(faction.id,onEvent);}catch{toast('Spielstand nicht lesbar','Beginne einen neuen Lauf.');updateMenu();return;}
 faction=game.faction;inMenu=false;paused=false;speed=1;selectedType=null;selectedSlot=null;hoverSlot=null;spellArmed=false;aim=null;renderer.reset();autoClock=7;tutorialStep=game.wave>0?4:0;tutorialHidden=false;
 $('menu').hidden=true;$('game').hidden=false;$('auto-wave').checked=false;$('pause').setAttribute('aria-pressed','false');$('pause').textContent='Ⅱ';$('pause').setAttribute('aria-label','Spiel pausieren');$('speed').textContent='1×';$('paused-banner').hidden=true;$('result-dialog').close();
 $('faction-label').innerHTML=icon(faction.mark)+faction.name;$('faction-passive').textContent=`${faction.name} · ${faction.bonus}`;
 $('slot-layer').innerHTML=SLOTS.map((s,i)=>`<button class="slot" data-slot="${i}" style="left:${s.x/12.8}%;top:${s.y/7}%" aria-label="Bauplatz ${i+1}, frei"><span class="slot-label">+</span></button>`).join('');
 $('unit-cards').innerHTML=Object.entries(UNITS).map(([type,u],i)=>`<button class="unit-card" data-type="${type}" aria-pressed="false"><span class="unit-key">${i+1}</span><div class="unit-icon" style="--u:${u.color}">${unitArt(type)}</div><div><b>${u.name}</b><small>${u.role}</small><span class="unit-price">${icon('coin')}${game.cost(type)}</span></div></button>`).join('');
 renderer.resize();$('focus-toggle').hidden=false;updateWavePreview();refresh();checkpoint();window.scrollTo({top:0,behavior:'instant'});sfx('start');
}
function onEvent(event){
 renderer.event(event,game);
 if(event.type==='shot'){if(sound&&performance.now()-lastShotSound>180){lastShotSound=performance.now();sfx(event.unit.type==='mage'?'magic':'shot');}return;}
 if(event.type==='hit'||event.type==='kill')return;
 if(event.type==='leak')sfx('leak');
 if(event.type==='spell'){sfx('meteor');spellArmed=false;toast('Bastionsfeuer!','Der Einschlag trifft Gegner im Zielbereich.');}
 if(event.type==='place'){tutorialStep=Math.max(1,tutorialStep);sfx('build');}
 if(event.type==='upgrade'){tutorialStep=4;sfx('upgrade');toast('Truppe verbessert',`Stufe ${roman[event.unit.level]} · Bereit für die nächste Welle`);}
 if(event.type==='sell')sfx('coin');
 if(event.type==='wave'){tutorialStep=Math.max(2,tutorialStep);sfx('wave');toast(event.boss?'Der Torbrecher kommt.':`Welle ${event.wave}`,event.boss?'Schwere Rüstung · 5 Festungsleben bei Durchbruch':'Deine Truppen halten den Pass.');}
 if(event.type==='clear'){
  tutorialStep=Math.max(3,tutorialStep);autoClock=7;spellArmed=false;checkpoint();
  const record=readStore(recordKey,0);if(game.wave>(Number.isInteger(record)?record:0))writeStore(recordKey,game.wave);
  toast(`Welle ${event.wave} abgewehrt`,`+${event.bonus} Gold · Verstärke deine Verteidigung`);sfx('clear');updateWavePreview();
 }
 if(event.type==='over'){deleteStore(saveKey);paused=true;spellArmed=false;$('result-wave').textContent=game.wave-1;$('result-kills').textContent=game.kills;$('result-gold').textContent=game.earned;$('record-label').textContent=`Dein Rekord: ${readStore(recordKey,0)} abgeschlossene Wellen`;$('result-dialog').showModal();sfx('over');}
 refresh();if(game.phase==='build')checkpoint();
}
function selectType(type){
 if(!game||game.phase==='over')return;
 spellArmed=false;selectedType=selectedType===type?null:type;if(selectedSlot!==null&&game.units.some(u=>u.slot===selectedSlot))selectedSlot=null;
 refresh();sfx('click');
}
$('unit-cards').addEventListener('click',e=>{const b=e.target.closest('[data-type]');if(b)selectType(b.dataset.type);});
$('slot-layer').addEventListener('click',e=>{
 const b=e.target.closest('[data-slot]');if(!b||!game||game.phase==='over')return;
 selectedSlot=Number(b.dataset.slot);
 const unit=game.units.find(u=>u.slot===selectedSlot);
 if(!unit&&selectedType){if(!game.place(selectedSlot,selectedType))toast('Noch zu wenig Gold.',`Diese Truppe kostet ${game.cost(selectedType)} Gold.`);}
 refresh();
});
$('slot-layer').addEventListener('pointerover',e=>{const b=e.target.closest('[data-slot]');hoverSlot=b?Number(b.dataset.slot):null;});
$('slot-layer').addEventListener('pointerleave',()=>{hoverSlot=null;});
$('selection-content').addEventListener('click',e=>{
 const button=e.target.closest('button');if(!button||!game)return;
 const unit=game.units.find(u=>u.slot===selectedSlot);
 if(button.id==='upgrade-unit'&&unit)game.upgrade(unit.id);
 if(button.id==='sell-unit'&&unit)game.sell(unit.id);
 if(button.id==='buy-unit'&&selectedType&&selectedSlot!==null)game.place(selectedSlot,selectedType);
 refresh();
});
function refresh(){
 if(!game)return;
 $('slot-layer').querySelectorAll('[data-slot]').forEach(button=>{
  const i=Number(button.dataset.slot),unit=game.units.find(u=>u.slot===i);
  button.classList.toggle('occupied',!!unit);button.classList.toggle('selected',i===selectedSlot);
  button.setAttribute('aria-label',`Bauplatz ${i+1}, ${unit?`${unitName(unit.type)}, Stufe ${unit.level}`:'frei'}`);button.setAttribute('aria-pressed',String(i===selectedSlot));
 });
 $('unit-cards').querySelectorAll('[data-type]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.type===selectedType)));
 $('selected-slot').textContent=selectedSlot===null?'—':String(selectedSlot+1).padStart(2,'0');
 const unit=game.units.find(u=>u.slot===selectedSlot),type=unit?.type||selectedType;
 $('selection').classList.toggle('empty',!type);
 if(type){
  const u=UNITS[type],stats=game.stats(unit||{type,level:1});
  $('selection-content').innerHTML=`<div class="selection-head"><div class="unit-icon" style="--u:${u.color}">${unitArt(type)}</div><div><h2>${unitName(type)}</h2><span>${unit?'STUFE '+roman[unit.level]+' / V':u.name.toUpperCase()}</span></div></div><p class="selection-desc">${u.description}</p><div class="unit-metrics"><div><small>SCHADEN</small><b>${stats.damage}${stats.splash?' / Fläche':''}</b></div><div><small>REICHWEITE</small><b>${Math.round(stats.range)}</b></div></div>${unit?`<button class="primary upgrade-button" id="upgrade-unit" ${unit.level>=5?'disabled':''}>${unit.level>=5?'Maximale Stufe erreicht':`Verbessern · ${game.upgradeCost(unit)} Gold ↑`}</button><p class="upgrade-preview">${unit.level>=5?'Die Elite deines Reiches.':`Nächste Stufe: ${game.stats({...unit,level:unit.level+1}).damage} Schaden · +9 Reichweite`}</p><button class="subtle sell-button" id="sell-unit">Verkaufen · ${Math.floor(unit.spent*.7)} Gold</button>`:selectedSlot!==null?`<button class="primary upgrade-button" id="buy-unit">Stationieren · ${game.cost(type)} Gold</button>`:`<p class="upgrade-preview">Tippe jetzt auf einen freien Bauplatz.</p>`}`;
 }else $('selection-content').innerHTML=`<div class="empty-selection">${icon('helm')}<h2>${selectedSlot===null?'Ein guter Standort<br>entscheidet die Schlacht.':'Ein Platz für<br>deine Verteidiger.'}</h2><p>${selectedSlot===null?'Wähle einen Bauplatz auf der Karte, um Truppen zu stationieren.':'Wähle unten einen Truppentyp und stationiere ihn auf diesem Bauplatz.'}</p></div>`;
 updateTutorial();syncHUD();
}
function unitName(type){return faction.names[Object.keys(UNITS).indexOf(type)];}
function updateWavePreview(){
 if(!game)return;const next=waveSpec(game.wave+1),counts={};next.types.forEach(t=>counts[t]=(counts[t]||0)+1);
 $('next-wave-label').textContent=String(game.wave+1).padStart(2,'0');
 $('wave-preview').innerHTML=Object.entries(counts).map(([t,n])=>`<span class="enemy-chip ${t==='boss'?'boss':''}" title="${ENEMY_TYPES[t].name}" style="--e:${ENEMY_TYPES[t].color}"><i></i>${n} ${ENEMY_TYPES[t].name}</span>`).join('');
}
function syncHUD(){
 if(!game)return;
 $('gold').textContent=game.gold;$('lives').innerHTML=`${game.lives}<span>/${game.maxLives}</span>`;$('wave').innerHTML=`${game.phase==='build'?game.wave+1:game.wave} <span>/ ∞</span>`;
 $('mini-gold').textContent=game.gold;$('mini-lives').textContent=game.lives+'/'+game.maxLives;$('mini-wave').textContent=game.phase==='build'?game.wave+1:game.wave;
 $('map-status').textContent=game.phase==='wave'?`Welle ${game.wave} · ${game.enemies.length+game.queue.length} Gegner verbleiben`:game.phase==='over'?'Bastion gefallen':game.wave?`Welle ${game.wave} abgewehrt`:'Vorbereitung';
 $('status-dot').classList.toggle('active',game.phase==='wave');
 $('attack-preview-title').textContent=game.phase==='wave'?'AKTUELLER ANGRIFF':'NÄCHSTER ANGRIFF';
 $('send-wave').disabled=game.phase!=='build'||paused||!game.units.length;
 $('send-wave').innerHTML=game.phase==='wave'?'Angriff läuft …':`Welle ${game.wave+1} starten ${icon('arrow')}`;
 const unit=game.units.find(u=>u.slot===selectedSlot);
 if($('upgrade-unit'))$('upgrade-unit').disabled=unit.level>=5||game.gold<game.upgradeCost(unit)||game.phase==='over';
 if($('buy-unit'))$('buy-unit').disabled=game.gold<game.cost(selectedType)||game.phase==='over';
 $('spell').disabled=game.phase!=='wave'||game.spellCooldown>0||paused;
 $('spell').classList.toggle('armed',spellArmed);$('spell').setAttribute('aria-pressed',String(spellArmed));
 $('spell-status').textContent=spellArmed?'Ziel wählen':game.spellCooldown>0?Math.ceil(game.spellCooldown)+' s':game.phase==='wave'?'Bereit · Q':game.wave===0?'Ab Welle 1':'Im Kampf';
 $('spell').style.setProperty('--charge',String(1-game.spellCooldown/40));
 $('map-wrap').classList.toggle('targeting',spellArmed);
 $('checkpoint').textContent=!storageOK?'Speichern ist in diesem Browser nicht verfügbar.':$('auto-wave').checked&&game.phase==='build'&&game.units.length?`Nächster Angriff in ${Math.ceil(autoClock)} s${paused?' · pausiert':''}`:'Spielstand wird zwischen Wellen gespeichert.';
}
const tutorial=[['Besetze den Pass.','Wähle unten die Fernkämpfer und tippe auf einen leuchtenden Bauplatz neben dem Weg.'],['Deine Armee steht.','Ergänze deine Verteidigung mit Nahkämpfern. Mit „Welle 1 starten“ beginnt der erste Angriff.'],['Sie kommen.','Deine Truppen greifen selbst an. Besiegte Gegner bringen Gold. Du kannst auch während des Angriffs bauen.'],['Stärker zurückschlagen.','Tippe auf eine stationierte Truppe und verbessere sie. Jede Stufe erhöht Schaden und Reichweite.'],['Du führst das Kommando.','Kombiniere alle vier Truppentypen. Alle fünf Wellen kommt ein Torbrecher. Wie lange hält deine Bastion?']];
function updateTutorial(){
 document.querySelector('.advisor').hidden=tutorialHidden;
 $('tutorial-title').textContent=tutorial[tutorialStep][0];$('tutorial-copy').textContent=tutorial[tutorialStep][1];$('tutorial-count').textContent=`0${tutorialStep+1} / 05`;
 document.querySelectorAll('.tutorial-track i').forEach((e,i)=>e.classList.toggle('done',i<=tutorialStep));
}
function toast(title,detail=''){
 $('map-toast').innerHTML=`${title}${detail?`<small>${detail}</small>`:''}`;$('map-toast').classList.add('show');toastUntil=performance.now()+2700;$('announcer').textContent=title+(detail?'. '+detail:'');
}
function setPause(value){paused=value;$('paused-banner').hidden=!paused;$('pause').textContent=paused?'▶':'Ⅱ';$('pause').setAttribute('aria-pressed',String(paused));$('pause').setAttribute('aria-label',paused?'Spiel fortsetzen':'Spiel pausieren');syncHUD();}
function beginWave(){if(!game||game.phase!=='build'||!game.units.length||paused)return;checkpoint();game.startWave();}
$('start').addEventListener('click',()=>startRun());$('continue').addEventListener('click',()=>startRun(true));$('send-wave').addEventListener('click',beginWave);
$('pause').addEventListener('click',()=>setPause(!paused));$('speed').addEventListener('click',()=>{speed=speed===1?2:1;$('speed').textContent=`${speed}×`;$('speed').setAttribute('aria-label',speed===2?'Einfache Spielgeschwindigkeit':'Doppelte Spielgeschwindigkeit');});
$('auto-wave').addEventListener('change',()=>{autoClock=7;syncHUD();});$('tutorial-dismiss').addEventListener('click',()=>{tutorialHidden=true;updateTutorial();});
$('retry').addEventListener('click',()=>startRun());$('choose-again').addEventListener('click',()=>{$('result-dialog').close();showMenu();});
function showMenu(){inMenu=true;paused=true;$('menu').hidden=false;$('game').hidden=true;setFocus(false);$('focus-toggle').hidden=true;chooseFaction(faction.id);updateMenu();window.scrollTo({top:0,behavior:'instant'});}
function askLeave(){if(inMenu)return;dialogPause=paused;setPause(true);$('leave-dialog').showModal();}
$('menu-button').addEventListener('click',askLeave);$('brand').addEventListener('click',e=>{e.preventDefault();if(!inMenu)askLeave();else window.scrollTo({top:0,behavior:'smooth'});});
$('leave-confirm').addEventListener('click',()=>{$('leave-dialog').close();showMenu();});$('leave-cancel').addEventListener('click',()=>{$('leave-dialog').close();setPause(dialogPause);});
$('leave-dialog').addEventListener('cancel',()=>setPause(dialogPause));
$('result-dialog').addEventListener('cancel',e=>e.preventDefault());
$('guide').addEventListener('click',()=>{dialogPause=paused;if(!inMenu)setPause(true);$('guide-dialog').showModal();});
document.querySelectorAll('.close-dialog,.close-guide').forEach(b=>b.addEventListener('click',()=>$('guide-dialog').close()));$('guide-dialog').addEventListener('close',()=>{if(!inMenu)setPause(dialogPause);});
document.addEventListener('keydown',e=>{
 if(inMenu||document.querySelector('dialog[open]')||['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;
 if(e.code==='Space'){e.preventDefault();setPause(!paused);}
 if(['1','2','3','4'].includes(e.key))selectType(Object.keys(UNITS)[Number(e.key)-1]);
 if(e.key.toLowerCase()==='q'){e.preventDefault();armSpell();}
 if(e.key==='Escape'){if(spellArmed)spellArmed=false;else if(focusMode)setFocus(false);else{selectedType=null;selectedSlot=null;}refresh();}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&!inMenu&&game?.phase!=='over')setPause(true);lastFrame=0;});
window.addEventListener('pagehide',checkpoint);

// Sound effects are synthesized locally; no recordings, music, or downloads.
function sfx(kind){
 if(!sound)return;
 try{
  audioContext??=new (window.AudioContext||window.webkitAudioContext)();
  if(audioContext.state==='suspended')audioContext.resume();
  const notes={click:[420],build:[240,360],upgrade:[350,520,700],coin:[900],start:[180,270,360],wave:[160,130],clear:[330,440,660],over:[220,160,110],leak:[100],shot:[260],magic:[700,500],meteor:[95,70,42]}[kind]||[300];
  notes.forEach((freq,i)=>{const o=audioContext.createOscillator(),gain=audioContext.createGain(),start=audioContext.currentTime+i*.075;o.type=['shot','leak'].includes(kind)?'triangle':'sine';o.frequency.setValueAtTime(freq,start);o.frequency.exponentialRampToValueAtTime(freq*.75,start+.14);gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(kind==='shot'?.012:.035,start+.01);gain.gain.exponentialRampToValueAtTime(.0001,start+.18);o.connect(gain);gain.connect(audioContext.destination);o.start(start);o.stop(start+.2);});
 }catch{sound=false;}
}
$('sound').addEventListener('click',()=>{sound=!sound;$('sound').querySelector('.sound-off').hidden=sound;$('sound').setAttribute('aria-label',sound?'Ton ausschalten':'Ton einschalten');$('sound').title=sound?'Ton ausschalten':'Ton einschalten';sfx('click');});

// Responsive high-resolution 2.5D renderer.
function setFocus(value){focusMode=value;document.body.classList.toggle('focused',value);$('focus-toggle').setAttribute('aria-pressed',String(value));requestAnimationFrame(()=>renderer.resize());}
$('focus-toggle').addEventListener('click',()=>setFocus(!focusMode));
$('exit-focus').addEventListener('click',()=>setFocus(false));
function armSpell(){
 if(!game||game.phase!=='wave'||game.spellCooldown>0||paused)return;
 spellArmed=!spellArmed;selectedType=null;selectedSlot=null;
 if(spellArmed)toast('Bastionsfeuer bereit','Tippe auf den Weg, um den Einschlag zu platzieren.');
 refresh();
}
$('spell').addEventListener('click',armSpell);
$('map-wrap').addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect();aim={x:(e.clientX-r.left)/r.width*WORLD.width,y:(e.clientY-r.top)/r.height*WORLD.height};});
$('map-wrap').addEventListener('pointerleave',()=>{aim=null;});
$('map-wrap').addEventListener('click',e=>{
 if(!spellArmed||!game||paused)return;e.preventDefault();e.stopImmediatePropagation();
 const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*WORLD.width,y=(e.clientY-r.top)/r.height*WORLD.height;
 game.cast(x,y);refresh();
},true);
$('effects-toggle').checked=readStore('bastion.effects.v1',true)!==false;renderer.enhanced=$('effects-toggle').checked;
$('effects-toggle').addEventListener('change',()=>{renderer.enhanced=$('effects-toggle').checked;writeStore('bastion.effects.v1',renderer.enhanced);});
function frame(now){
 const dt=lastFrame?Math.min(.1,(now-lastFrame)/1000):0;lastFrame=now;
 if(!inMenu&&game){
  if(!paused&&!document.querySelector('dialog[open]')){
   game.update(dt*speed);renderer.update(dt*speed);visualTime+=dt*speed;
   if(game.phase==='build'&&$('auto-wave').checked&&game.units.length){autoClock-=dt;if(autoClock<=0)beginWave();}
  }
  hudClock+=dt;if(hudClock>.12){syncHUD();hudClock=0;}
  renderer.paint(game,{selectedSlot,hoverSlot,selectedType,spellArmed,aim});
  if(now>toastUntil)$('map-toast').classList.remove('show');
 }
 requestAnimationFrame(frame);
}
$('start').disabled=true;$('continue').disabled=true;
renderer.loading.then(()=>{$('start').disabled=false;$('continue').disabled=false;}).catch(error=>{document.querySelector('.menu-note').textContent='Grafiken konnten nicht geladen werden. Bitte Seite neu laden.';console.error(error);});
updateMenu();requestAnimationFrame(frame);
