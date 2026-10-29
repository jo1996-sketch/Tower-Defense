import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,FACTIONS,UNITS,SLOTS,PATH_LENGTH,pointAt,waveSpec} from '../dist/engine.js';

const simulate=(g,seconds=180)=>{for(let t=0;t<seconds&&g.phase==='wave';t+=1/30)g.update(1/30);};
test('Every faction can build a valid opening and finish the first wave',()=>{
 for(const f of FACTIONS){
  const g=new Game(f.id);assert.ok(g.place(1,'archer'));assert.ok(g.place(3,'guard'));assert.ok(g.place(6,'archer'));
  assert.ok(g.gold>=0);assert.ok(g.startWave());simulate(g);
  assert.equal(g.phase,'build',f.name);assert.equal(g.wave,1);assert.ok(g.lives>0);assert.ok(g.kills>0);
 }
});
test('Empty defenses lose, cannot earn leaked-enemy gold, and stop at zero lives',()=>{
 const g=new Game();for(let i=0;i<4&&g.phase!=='over';i++){g.startWave();simulate(g);}
 assert.equal(g.phase,'over');assert.equal(g.lives,0);assert.equal(g.kills,0);assert.equal(g.startWave(),false);
});
test('Costs, duplicate slots, upgrade limits and refunds preserve economy',()=>{
 const g=new Game();assert.equal(g.place(-1,'archer'),false);assert.equal(g.place(100,'archer'),false);assert.equal(g.place(0,'fake'),false);
 assert.ok(g.place(0,'archer'));assert.equal(g.place(0,'archer'),false);assert.equal(g.gold,200);
 const u=g.units[0];assert.equal(g.upgradeCost(u),90);assert.ok(g.upgrade(u.id));assert.equal(u.level,2);assert.equal(g.gold,110);
 assert.equal(g.upgrade(u.id),false);g.gold=10000;while(u.level<5)assert.ok(g.upgrade(u.id));assert.equal(g.upgrade(u.id),false);
 const before=g.gold,refund=Math.floor(u.spent*.7);assert.ok(g.sell(u.id));assert.equal(g.gold,before+refund);assert.equal(g.units.length,0);
});
test('Faction passives affect actual simulation statistics',()=>{
 const plain=new Game(),grove=new Game('grove'),stone=new Game('stone'),ash=new Game('ash'),iron=new Game('iron');
 const unit={type:'archer',level:1};assert.ok(grove.stats(unit).range>plain.stats(unit).range);
 assert.ok(ash.cost('archer')<plain.cost('archer'));assert.ok(ash.stats(unit).interval<plain.stats(unit).interval);
 assert.ok(stone.stats({type:'siege',level:1}).damage>plain.stats({type:'siege',level:1}).damage);
 assert.ok(iron.stats({type:'guard',level:1}).damage>plain.stats({type:'guard',level:1}).damage);assert.equal(iron.lives,30);
});
test('Armor reduces physical damage, magic bypasses it, and kills reward gold once',()=>{
 const g=new Game();const target={hp:100,armor:.5,reward:12};g.hit(target,20,false);assert.equal(target.hp,90);g.hit(target,20,true);assert.equal(target.hp,70);
 g.hit(target,1000,true);const after=g.gold;assert.equal(after,292);g.hit(target,1000,true);assert.equal(g.gold,after);assert.equal(g.kills,1);
});
test('Guard slow and frost are effective; splash damages multiple enemies',()=>{
 const g=new Game();g.place(0,'guard');const p=SLOTS[0];
 g.spec=waveSpec(1);g.phase='wave';g.queue=['raider'];g.spawnClock=100;
 g.enemies=[{id:1,type:'raider',hp:100,maxHp:100,d:160,x:p.x,y:p.y+80,speed:54,armor:0,reward:9,slowUntil:0,slow:1,flash:0}];
 const d=g.enemies[0].d;g.units[0].cooldown=10;g.step(.01);assert.ok(g.enemies[0].d-d<54*.01);
 const m=new Game();m.gold=1000;m.place(0,'mage');m.spec=waveSpec(1);m.phase='wave';m.queue=['raider'];m.spawnClock=100;
 m.enemies=[0,1].map((_,i)=>({id:i+1,type:'raider',hp:100,maxHp:100,d:160+i,x:p.x,y:p.y+85,speed:0,armor:.5,reward:9,slowUntil:0,slow:1,flash:0}));
 m.step(.01);assert.equal(m.enemies[0].hp,73);assert.equal(m.enemies[1].hp,73);assert.ok(m.enemies[0].slowUntil>m.time);
});
test('Checkpoint roundtrip preserves progress and rejects malformed saves',()=>{
 const g=new Game('stone');g.place(2,'archer');g.wave=3;const data=JSON.parse(JSON.stringify(g.serialize())),restored=Game.restore(data);
 assert.equal(restored.wave,3);assert.equal(restored.faction.id,'stone');assert.equal(restored.gold,g.gold);assert.equal(restored.units[0].slot,2);assert.equal(restored.phase,'build');
 assert.throws(()=>Game.restore({...data,gold:-2}));assert.throws(()=>Game.restore({...data,units:[...data.units,...data.units]}));assert.throws(()=>Game.restore({...data,faction:'unknown'}));assert.throws(()=>Game.restore({...data,lives:0}));
});
test('Wave generation scales, bosses recur, and high waves stay bounded and finite',()=>{
 assert.deepEqual(waveSpec(20),waveSpec(20));assert.ok(waveSpec(2).scale>waveSpec(1).scale);
 for(const w of [1,5,10,100,1000,1000000]){const s=waveSpec(w);assert.ok(s.types.length<=73);assert.ok(Number.isFinite(s.scale));assert.equal(s.types.includes('boss'),w%5===0);}
});
test('Path interpolation and low/fast update rates remain valid',()=>{
 assert.ok(PATH_LENGTH>1200);for(let n=0;n<20;n++){const p=pointAt(PATH_LENGTH*n/19);assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));}
 const a=new Game(),b=new Game();a.place(1,'archer');b.place(1,'archer');a.startWave();b.startWave();
 for(let i=0;i<90;i++)a.update(1);for(let i=0;i<2700;i++)b.update(1/30);
 assert.equal(a.phase,b.phase);assert.equal(a.lives,b.lives);assert.equal(a.kills,b.kills);
});
test('Bastionsfeuer targets an area, bypasses armor and respects cooldown',()=>{
 const events=[],g=new Game('crown',e=>events.push(e));
 assert.equal(g.cast(200,200),false);g.startWave();g.queue=['raider'];g.spawnClock=100;
 g.enemies=[{id:1,type:'armored',hp:500,maxHp:500,x:400,y:300,d:500,speed:0,armor:.9,reward:16,slowUntil:0,slow:1,flash:0},{id:2,type:'raider',hp:100,maxHp:100,x:900,y:300,d:1000,speed:0,armor:0,reward:9,slowUntil:0,slow:1,flash:0}];
 assert.equal(g.cast(-1,300),false);assert.equal(g.cast(NaN,300),false);assert.ok(g.cast(400,300));assert.equal(g.enemies[0].hp,345);assert.equal(g.enemies[1].hp,100);assert.equal(g.spellCooldown,40);assert.equal(g.cast(400,300),false);
 g.update(1);assert.ok(g.spellCooldown<40&&g.spellCooldown>38);assert.ok(events.some(e=>e.type==='spell'));
});
test('Older checkpoints remain compatible and new spell cooldown is preserved',()=>{
 const g=new Game();g.spellCooldown=31.4;const data=g.serialize();assert.equal(Game.restore(data).spellCooldown,31.4);delete data.spellCooldown;assert.equal(Game.restore(data).spellCooldown,0);
});
