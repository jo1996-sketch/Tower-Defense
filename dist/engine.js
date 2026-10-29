// Deterministic simulation. Artwork and rendering live separately.
export const VERSION = '0.2.0';
export const WORLD = { width: 1280, height: 700 };
export const FACTIONS = [
  { id:'crown', name:'Kronwacht', race:'Menschen', title:'Für das letzte Königreich.', color:'#d4b66d', dark:'#4b4330', mark:'crown', bonus:'+25 % Gold zum Wellenabschluss', description:'Disziplinierte Verteidiger. Ein verlässlicher Einstieg mit zusätzlichem Gold für deine Armee.', names:['Langbogenschützen','Königsgarde','Hofmagier','Kronenkatapult'] },
  { id:'grove', name:'Sternenbund', race:'Elben', title:'Kein Schatten durchdringt den Wald.', color:'#8cc7ab', dark:'#234e44', mark:'leaf', bonus:'+18 % Reichweite für alle Truppen', description:'Präzision aus der Ferne. Ihre Truppen kontrollieren weite Teile des Schlachtfelds.', names:['Sternenbogner','Waldhüter','Mondweber','Dornenwerfer'] },
  { id:'stone', name:'Bergclans', race:'Zwerge', title:'Aus Stein. Aus Stahl. Aus Trotz.', color:'#d3a477', dark:'#5e4232', mark:'anvil', bonus:'+25 % Belagerungsschaden · Upgrades −10 %', description:'Meister der Schmieden. Wuchtige Geschütze und günstige Verbesserungen halten jedem Ansturm stand.', names:['Armbrustwachen','Schildbrecher','Runenmeister','Eisenmörser'] },
  { id:'ash', name:'Aschenhorde', race:'Orks', title:'Unsere Bastion. Unsere Regeln.', color:'#b7c47b', dark:'#414a2a', mark:'fang', bonus:'Truppen −10 % Gold · +15 % Angriffstempo', description:'Viele Krieger, unerbittlicher Druck. Günstige Truppen machen den etwas geringeren Einzelschaden wett.', names:['Knochenbogner','Hordenwächter','Aschenschamanen','Felsenschleuder'] },
  { id:'iron', name:'Eisenschwur', race:'Schwere Orkkrieger', title:'Der Wall wird nicht fallen.', color:'#c19da7', dark:'#50353e', mark:'helm', bonus:'+5 Festungsleben · +30 % Nahkampfschaden', description:'Eine eigene Kriegerkultur aus den Eisenlanden. Schwere Infanterie sichert die Engstellen.', names:['Stahlbolzenschützen','Eidwächter','Glutschamanen','Belagerungsbrecher'] }
];
export const UNITS = {
  archer: { name:'Fernkampf', role:'Schnell & präzise', cost:80, damage:15, interval:.75, range:170, splash:0, slow:0, color:'#e2c579', icon:'bow', description:'Schnelle Einzeltreffer. Stark gegen Späher und leichte Gegner.' },
  guard: { name:'Nahkampf', role:'Hält Gegner auf', cost:100, damage:26, interval:1.0, range:105, splash:0, slow:0, color:'#afc1cb', icon:'swords', description:'Verlangsamt nahe Gegner um 45 %. Eine Engstelle vor Fernkämpfern ist ideal.' },
  mage: { name:'Magie', role:'Frost & Rüstungsbruch', cost:145, damage:27, interval:1.3, range:156, splash:33, slow:.62, color:'#9ec6e0', icon:'staff', description:'Ignoriert Rüstung. Frost verlangsamt getroffene Gegner um 38 % für 1,5 Sekunden.' },
  siege: { name:'Belagerung', role:'Schaden gegen Gruppen', cost:185, damage:57, interval:2.15, range:188, splash:62, slow:0, color:'#dd9e6f', icon:'catapult', description:'Flächenschaden. Besonders stark gegen dicht gedrängte Angriffswellen.' }
};
export const ENEMY_TYPES = {
  raider:{name:'Verlorener', hp:61, speed:54, armor:0, reward:9, hit:1, color:'#a5ad86'},
  runner:{name:'Nebelwolf', hp:43, speed:88, armor:0, reward:10, hit:1, color:'#b4bac3'},
  armored:{name:'Schildträger', hp:128, speed:43, armor:.38, reward:16, hit:2, color:'#858d97'},
  boss:{name:'Der Torbrecher', hp:850, speed:32, armor:.26, reward:90, hit:5, color:'#b48f7b'}
};
// Fixed build slots make touch controls precise and leave the path unblocked.
export const SLOTS = [
  {x:249,y:227},{x:358,y:327},{x:472,y:423},{x:426,y:285},
  {x:613,y:225},{x:691,y:338},{x:823,y:312},{x:893,y:456},
  {x:945,y:353},{x:1041,y:435},{x:1079,y:298},{x:1118,y:390}
];
// Coordinates follow the illustrated road all the way to the actual castle gate.
export const WAYPOINTS = [[-35,174],[45,198],[129,222],[155,292],[234,341],[310,401],[385,410],[450,381],[489,321],[526,273],[582,250],[628,255],[682,292],[766,326],[801,376],[853,413],[925,421],[991,400],[1053,363],[1114,334],[1153,290],[1186,246],[1193,225]];
export const PATH = [];
// Catmull-Rom sampling creates a smooth path shared by drawing and simulation.
for(let i=0;i<WAYPOINTS.length-1;i++){
  const p0=WAYPOINTS[Math.max(0,i-1)],p1=WAYPOINTS[i],p2=WAYPOINTS[i+1],p3=WAYPOINTS[Math.min(WAYPOINTS.length-1,i+2)];
  for(let j=0;j<18;j++){
    const t=j/18,t2=t*t,t3=t2*t;
    const at = k => .5*((2*p1[k])+(-p0[k]+p2[k])*t+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*t2+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*t3);
    PATH.push({x:at(0),y:at(1)});
  }
}
PATH.push({x:WAYPOINTS.at(-1)[0],y:WAYPOINTS.at(-1)[1]});
let total=0;
PATH.forEach((p,i)=>{if(i) total+=Math.hypot(p.x-PATH[i-1].x,p.y-PATH[i-1].y);p.d=total;});
export const PATH_LENGTH=total;
export function pointAt(distance){
  let low=1,high=PATH.length-1;
  while(low<high){const m=(low+high)>>1;if(PATH[m].d<distance)low=m+1;else high=m;}
  const b=PATH[low],a=PATH[low-1],t=Math.max(0,Math.min(1,(distance-a.d)/(b.d-a.d)));
  return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
}
export function seeded(seed=12345){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t^=t+Math.imul(t^t>>>7,61|t);return ((t^t>>>14)>>>0)/4294967296;};}
export function waveSpec(wave){
  const w=Math.max(1,Math.floor(wave)),rng=seeded(941+w*193);
  const count=Math.min(72,7+w*2),types=[];
  for(let i=0;i<count;i++){
    const r=rng();types.push(w>=3&&r<.23?'armored':w>=2&&r<.5?'runner':'raider');
  }
  if(w%5===0)types.push('boss');
  return {wave:w,types,interval:Math.max(.30,.95-w*.012),scale:Math.pow(1.135,Math.min(150,w-1))*(1+Math.max(0,w-151)*.045),bonus:30+6*Math.min(w,500)};
}
export class Game {
  constructor(faction='crown', onEvent=()=>{}){
    this.faction=FACTIONS.find(f=>f.id===faction)||FACTIONS[0];this.onEvent=onEvent;
    this.gold=280;this.maxLives=this.faction.id==='iron'?30:25;this.lives=this.maxLives;
    this.wave=0;this.phase='build';this.units=[];this.enemies=[];this.projectiles=[];
    this.queue=[];this.spawnClock=0;this.time=0;this.kills=0;this.earned=0;this.id=0;
    this.spellCooldown=0;
  }
  emit(type,data={}){this.onEvent({type,...data});}
  cost(type){return Math.round(UNITS[type].cost*(this.faction.id==='ash'?.9:1));}
  stats(unit){
    const d=UNITS[unit.type],f=this.faction.id;
    return {damage:Math.round(d.damage*Math.pow(1.62,unit.level-1)*(f==='ash'?.94:1)*(f==='stone'&&unit.type==='siege'?1.25:1)*(f==='iron'&&unit.type==='guard'?1.3:1)), range:d.range*(f==='grove'?1.18:1)+(unit.level-1)*9, interval:d.interval/(f==='ash'?1.15:1),splash:d.splash,slow:d.slow};
  }
  place(slot,type){
    if(this.phase==='over'||!UNITS[type]||!Number.isInteger(slot)||!SLOTS[slot]||this.units.some(u=>u.slot===slot))return false;
    const cost=this.cost(type);if(this.gold<cost)return false;
    this.gold-=cost;const unit={id:++this.id,slot,type,level:1,spent:cost,cooldown:0,angle:0,kills:0};
    this.units.push(unit);this.emit('place',{unit});return true;
  }
  upgradeCost(unit){return Math.round(this.cost(unit.type)*(.75+unit.level*.38)*(this.faction.id==='stone'?.9:1));}
  upgrade(id){
    const u=this.units.find(u=>u.id===id);if(!u||u.level>=5||this.phase==='over')return false;
    const cost=this.upgradeCost(u);if(this.gold<cost)return false;
    this.gold-=cost;u.spent+=cost;u.level++;this.emit('upgrade',{unit:u});return true;
  }
  sell(id){
    const i=this.units.findIndex(u=>u.id===id);if(i<0||this.phase==='over')return false;
    const [unit]=this.units.splice(i,1);const refund=Math.floor(unit.spent*.7);this.gold+=refund;this.emit('sell',{unit,refund});return true;
  }
  startWave(){
    if(this.phase!=='build')return false;
    this.wave++;this.spec=waveSpec(this.wave);this.queue=[...this.spec.types];this.spawnClock=.4;this.phase='wave';
    this.emit('wave',{wave:this.wave,boss:this.wave%5===0});return true;
  }
  spawn(type){
    const d=ENEMY_TYPES[type],hp=Math.round(d.hp*this.spec.scale);
    const enemy={id:++this.id,type,hp,maxHp:hp,d:0,...pointAt(0),speed:d.speed*(1+Math.min(50,this.wave-1)*.003),armor:d.armor,reward:Math.round(d.reward*(1+Math.min(300,this.wave-1)*.025)),slowUntil:0,slow:1,flash:0};
    this.enemies.push(enemy);
  }
  hit(enemy,damage,magic,unit){
    if(enemy.hp<=0)return;
    const dealt=damage*(magic?1:1-enemy.armor);
    enemy.hp-=dealt;enemy.flash=.16;
    this.emit('hit',{enemy,damage:dealt,magic,unitType:unit?.type||'spell'});
    if(enemy.hp<=0){this.gold+=enemy.reward;this.earned+=enemy.reward;this.kills++;if(unit)unit.kills++;
      this.emit('kill',{enemy});}
  }
  cast(x,y){
    if(this.phase!=='wave'||this.spellCooldown>0||!Number.isFinite(x)||!Number.isFinite(y)||x<0||x>WORLD.width||y<0||y>WORLD.height)return false;
    const radius=108,damage=Math.round(155*Math.pow(1.095,Math.min(this.wave-1,60)));
    const targets=this.enemies.filter(e=>e.hp>0&&Math.hypot(e.x-x,e.y-y)<=radius);
    this.spellCooldown=40;
    this.emit('spell',{x,y,radius,damage});
    for(const enemy of targets)this.hit(enemy,damage,true);
    return true;
  }
  update(dt){
    if(this.phase!=='wave'||!Number.isFinite(dt)||dt<=0)return;
    // Small deterministic slices prevent tunnelling during fast-forward and tests.
    let remaining=Math.min(dt,4);
    while(remaining>0&&this.phase==='wave'){const step=Math.min(remaining,1/30);this.step(step);remaining-=step;}
  }
  step(dt){
    this.time+=dt;this.spawnClock-=dt;this.spellCooldown=Math.max(0,this.spellCooldown-dt);
    if(this.queue.length&&this.spawnClock<=0){this.spawn(this.queue.shift());this.spawnClock+=this.spec.interval;}
    for(const enemy of this.enemies){
      if(enemy.hp<=0)continue;
      let slow=this.time<enemy.slowUntil?enemy.slow:1;
      for(const u of this.units)if(u.type==='guard'){
        const s=SLOTS[u.slot];if(Math.hypot(s.x-enemy.x,s.y-enemy.y)<this.stats(u).range)slow=Math.min(slow,.55);
      }
      const oldX=enemy.x,oldY=enemy.y;
      enemy.d+=enemy.speed*slow*dt;Object.assign(enemy,pointAt(enemy.d));enemy.facing=Math.atan2(enemy.y-oldY,enemy.x-oldX);enemy.flash=Math.max(0,enemy.flash-dt);
      if(enemy.d>=PATH_LENGTH){enemy.hp=0;this.lives=Math.max(0,this.lives-ENEMY_TYPES[enemy.type].hit);this.emit('leak',{enemy});
        if(this.lives<=0){this.phase='over';this.emit('over');return;}}
    }
    for(const unit of this.units){
      unit.cooldown-=dt;if(unit.cooldown>0)continue;
      const p=SLOTS[unit.slot],st=this.stats(unit);
      const target=this.enemies.filter(e=>e.hp>0&&Math.hypot(p.x-e.x,p.y-e.y)<=st.range).sort((a,b)=>b.d-a.d)[0];
      if(!target)continue;
      unit.angle=Math.atan2(target.y-p.y,target.x-p.x);unit.cooldown=st.interval;unit.lastShotAt=this.time;
      this.projectiles.push({x:p.x,y:p.y-18,tx:target.x,ty:target.y,life:0,duration:unit.type==='siege'?.3:.16,type:unit.type});
      const targets=st.splash?this.enemies.filter(e=>e.hp>0&&Math.hypot(e.x-target.x,e.y-target.y)<=st.splash):[target];
      for(const e of targets){this.hit(e,st.damage,unit.type==='mage',unit);if(st.slow){e.slowUntil=this.time+1.5;e.slow=st.slow;}}
      this.emit('shot',{unit,target});
    }
    this.enemies=this.enemies.filter(e=>e.hp>0);
    this.projectiles.forEach(p=>p.life+=dt);this.projectiles=this.projectiles.filter(p=>p.life<p.duration);
    if(!this.queue.length&&!this.enemies.length){
      this.phase='build';const bonus=Math.round(this.spec.bonus*(this.faction.id==='crown'?1.25:1));this.gold+=bonus;this.earned+=bonus;
      this.projectiles=[];this.emit('clear',{bonus,wave:this.wave});
    }
  }
  serialize(){
    // Checkpoint at the start/end of a wave: restarting never restores a partial, exploitable wave.
    return {schema:1,version:VERSION,faction:this.faction.id,gold:this.gold,lives:this.lives,wave:this.wave,kills:this.kills,earned:this.earned,units:this.units.map(u=>({...u})),id:this.id,spellCooldown:this.spellCooldown};
  }
  static restore(data,onEvent){
    if(!data||data.schema!==1||!FACTIONS.some(f=>f.id===data.faction)||!Number.isInteger(data.wave)||data.wave<0||data.wave>1000000||!Number.isInteger(data.gold)||data.gold<0||data.gold>1e12||!Number.isInteger(data.lives)||data.lives<=0||data.lives>30||!Array.isArray(data.units)||data.units.length>SLOTS.length)throw Error('Ungültiger Spielstand');
    const slots=new Set(),ids=new Set();
    for(const u of data.units){if(!UNITS[u.type]||!Number.isInteger(u.slot)||!SLOTS[u.slot]||slots.has(u.slot)||!Number.isInteger(u.level)||u.level<1||u.level>5||!Number.isSafeInteger(u.id)||u.id<1||ids.has(u.id)||!Number.isInteger(u.spent)||u.spent<1||u.spent>1e7)throw Error('Ungültige Truppen');slots.add(u.slot);ids.add(u.id);}
    const g=new Game(data.faction,onEvent);g.gold=data.gold;g.lives=Math.min(g.maxLives,data.lives);g.wave=data.wave;g.kills=Number.isSafeInteger(data.kills)&&data.kills>=0?data.kills:0;g.earned=Number.isSafeInteger(data.earned)&&data.earned>=0?data.earned:0;g.units=data.units.map(u=>({id:u.id,slot:u.slot,type:u.type,level:u.level,spent:u.spent,cooldown:0,angle:0,kills:Number.isSafeInteger(u.kills)&&u.kills>=0?u.kills:0}));g.id=Math.max(0,...ids);g.spellCooldown=Number.isFinite(data.spellCooldown)?Math.max(0,Math.min(40,data.spellCooldown)):0;return g;
  }
}
