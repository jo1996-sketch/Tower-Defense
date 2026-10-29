import {WORLD,SLOTS,PATH,PATH_LENGTH,pointAt,UNITS} from './engine.js?v=0.2';

const TAU=Math.PI*2;
const rows={crown:-1,grove:0,stone:1,ash:2,iron:2};
const indexes={archer:0,guard:1,mage:2,siege:3,raider:4,runner:5,armored:6,boss:7};
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
const circle=(c,x,y,r,color)=>{c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();};
const ellipse=(c,x,y,rx,ry,color)=>{c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fill();};
const stroke=(c,points,color,width=1)=>{c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.stroke();};
function glow(c,x,y,r,color){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');circle(c,x,y,r,g);}
function loadImage(src){return new Promise((resolve,reject)=>{const im=new Image();im.decoding='async';im.onload=()=>resolve(im);im.onerror=()=>reject(Error('Bild konnte nicht geladen werden: '+src));im.src=src;});}

export class BattleRenderer {
 constructor(canvas){
  this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.ready=false;this.enhanced=true;this.time=0;
  this.reset();
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(canvas);
  this.loading=this.load();
 }
 reset(){this.effects=[];this.particles=[];this.corpses=[];this.projectiles=[];this.texts=[];this.shake=0;this.flash=0;this.time=0;}
 async load(){
  [this.map,this.atlas,this.races]=await Promise.all([loadImage('assets/battlefield.webp'),loadImage('assets/units.webp'),loadImage('assets/races.webp')]);
  this.frames=this.slice(this.atlas,4,2);this.raceFrames=this.slice(this.races,4,3);this.ready=true;this.resize();return true;
 }
 slice(image,columns,rows){
  // Trim alpha inside each grid cell at runtime, keeping artwork in one atlas.
  const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
  const c=canvas.getContext('2d',{willReadFrequently:true});c.drawImage(image,0,0);
  const data=c.getImageData(0,0,image.width,image.height).data,frames=[];
  for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
   const sx=Math.round(col*image.width/columns),sy=Math.round(row*image.height/rows),ex=Math.round((col+1)*image.width/columns),ey=Math.round((row+1)*image.height/rows);
   let left=ex,right=sx,top=ey,bottom=sy;
   for(let y=sy;y<ey;y++)for(let x=sx;x<ex;x++)if(data[(y*image.width+x)*4+3]>35){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
   frames.push(right>=left?{x:left,y:top,w:right-left+1,h:bottom-top+1}:{x:sx,y:sy,w:ex-sx,h:ey-sy});
  }
  return frames;
 }
 resize(){
  const rect=this.canvas.getBoundingClientRect();if(rect.width<1)return;
  const ratio=Math.min(2,window.devicePixelRatio||1),width=Math.round(rect.width*ratio),height=Math.round(rect.height*ratio);
  if(this.canvas.width!==width||this.canvas.height!==height){this.canvas.width=width;this.canvas.height=height;}
 }
 burst(x,y,color,count=16,force=75){
  if(!this.enhanced||reduced.matches)count=Math.min(5,count);
  for(let i=0;i<count;i++){const a=Math.random()*TAU,v=force*(.3+Math.random());this.particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v*.65-20,life:.35+Math.random()*.5,total:.85,color,r:1+Math.random()*2});}
  if(this.particles.length>550)this.particles.splice(0,this.particles.length-550);
 }
 event(e,game){
  if(e.type==='shot'){
   const s=SLOTS[e.unit.slot],type=e.unit.type;
   if(type==='guard'){this.effects.push({kind:'slash',x:e.target.x,y:e.target.y-10,life:0,duration:.25,color:'#fff3c6'});return;}
   this.projectiles.push({type,x:s.x,y:s.y-38,tx:e.target.x,ty:e.target.y-15,life:0,duration:type==='siege'?.42:type==='mage'?.24:.18});
  }
  if(e.type==='hit'){
   const color=e.unitType==='mage'?'#a4efff':e.unitType==='spell'?'#ffd198':e.unitType==='siege'?'#ffc389':'#f5dfad';
   const delay=e.unitType==='siege'||e.unitType==='spell'?.35:e.unitType==='mage'?.16:.09;
   this.effects.push({kind:'impact',x:e.enemy.x,y:e.enemy.y-10,life:-delay,duration:.3,color,size:e.unitType==='siege'?46:e.unitType==='spell'?65:18});
   if(this.texts.length<36)this.texts.push({x:e.enemy.x,y:e.enemy.y-45,value:Math.round(e.damage),life:-delay,total:.85,color});
  }
  if(e.type==='kill'){
   this.corpses.push({enemy:{...e.enemy},life:0,duration:.55});
   if(this.texts.length<36)this.texts.push({x:e.enemy.x+12,y:e.enemy.y-30,value:'+'+e.enemy.reward,life:0,total:1.1,color:'#f6d37b'});
  }
  if(e.type==='place'||e.type==='upgrade'){
   const s=SLOTS[e.unit.slot];this.effects.push({kind:'summon',...s,life:0,duration:1,color:e.type==='upgrade'?'#fff0b0':game.faction.color});this.burst(s.x,s.y-5,game.faction.color,24,55);
  }
  if(e.type==='spell'){this.effects.push({kind:'meteor',x:e.x,y:e.y,life:0,duration:1.2,color:'#ffc27d',radius:e.radius});}
  if(e.type==='leak'){this.shake=5;this.flash=.25;this.burst(1190,225,'#ff9360',22,100);}
 }
 update(dt){
  this.time+=dt;this.shake=Math.max(0,this.shake-dt*20);this.flash=Math.max(0,this.flash-dt);
  for(const p of this.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=65*dt;}
  this.particles=this.particles.filter(p=>p.life>0);
  for(const p of this.projectiles)p.life+=dt;this.projectiles=this.projectiles.filter(p=>p.life<p.duration);
  for(const p of this.corpses)p.life+=dt;this.corpses=this.corpses.filter(p=>p.life<p.duration);
  for(const p of this.texts)p.life+=dt;this.texts=this.texts.filter(p=>p.life<p.total);
  for(const e of this.effects){
   const old=e.life;e.life+=dt;
   if(e.kind==='impact'&&old<0&&e.life>=0)this.burst(e.x,e.y,e.color,e.size>30?18:7,e.size>30?120:65);
   if(e.kind==='meteor'&&old<.38&&e.life>=.38){this.burst(e.x,e.y,'#ffb765',55,200);this.shake=6;}
  }
  this.effects=this.effects.filter(e=>e.life<e.duration);
 }
 sprite(c,type,x,y,size,{faction='crown',enemy=false,flip=false,angle=0,alpha=1,flash=false,stretch=1}={}){
  const row=rows[faction],image=enemy||row===-1?this.atlas:this.races,frames=enemy||row===-1?this.frames:this.raceFrames;
  const frame=frames[enemy?indexes[type]:row===-1?indexes[type]:row*4+indexes[type]];if(!frame)return;
  const h=size,w=h*frame.w/frame.h;
  c.save();c.translate(x,y);c.rotate(angle);c.scale(flip?-1:1,stretch);c.globalAlpha=alpha;
  if(flash)c.filter='brightness(1.8)';else if(faction==='iron'&&!enemy)c.filter='saturate(.65) brightness(.8) contrast(1.15)';
  c.drawImage(image,frame.x,frame.y,frame.w,frame.h,-w/2,-h,w,h);c.restore();
 }
 shadow(c,x,y,size,alpha=.36){
  c.save();c.translate(x,y);c.scale(1,.33);const g=c.createRadialGradient(0,0,0,0,0,size);g.addColorStop(0,`rgba(8,17,14,${alpha})`);g.addColorStop(1,'transparent');circle(c,0,0,size,g);c.restore();
 }
 ring(c,x,y,r,color,alpha=1){
  c.save();c.globalAlpha=alpha;c.strokeStyle=color;c.lineWidth=1.8;c.beginPath();c.ellipse(x,y,r,r*.43,0,0,TAU);c.stroke();c.lineWidth=.5;c.beginPath();c.ellipse(x,y,r+4,(r+4)*.43,0,0,TAU);c.stroke();c.restore();
 }
 unit(c,u,game){
  const p=SLOTS[u.slot],type=u.type,t=this.time,scale=1+(u.level-1)*.035,age=game.time-(u.lastShotAt??-100),recoil=age<.22?Math.sin(age/.22*Math.PI)*3:0;
  this.shadow(c,p.x+6,p.y+6,type==='siege'?43:34,.5);
  this.ring(c,p.x,p.y+4,type==='siege'?32:28,game.faction.color,.65);
  const race=game.faction.id,size=(race==='stone'?.87:race==='ash'||race==='iron'?1.04:1)*scale;
  const flip=Math.cos(u.angle)<-.25;
  if(type==='archer'||type==='guard'){
   const positions=type==='guard'?[[-14,0],[13,-6],[4,15]]:[[-12,-2],[13,10]];
   for(let i=0;i<positions.length;i++){
    const [x,y]=positions[i],breath=Math.sin(t*2+u.id+i)*.4;
    this.sprite(c,type,p.x+x-Math.cos(u.angle)*recoil,p.y+y+breath,(type==='guard'?52:54)*size,{faction:race,flip,angle:recoil*.006,stretch:1+Math.sin(t*2+i)*.008});
   }
  }else if(type==='mage'){
   glow(c,p.x,p.y-4,37,'#6bcdd335');this.sprite(c,type,p.x,p.y+Math.sin(t*2+u.id)*1.6,77*size,{faction:race,flip,stretch:1+Math.sin(t*2)*.012});
   if(this.enhanced)for(let i=0;i<3;i++){const a=t*1.4+i*TAU/3;glow(c,p.x+Math.cos(a)*22,p.y-40+Math.sin(a)*11,7,'#c5f3ff99');}
  }else this.sprite(c,type,p.x-Math.cos(u.angle)*recoil*2,p.y+5,79*scale,{faction:race,flip,angle:recoil*.004});
  // Banners and pips communicate faction ownership and upgrade level.
  const x=p.x+29,y=p.y-42;
  stroke(c,[[x,p.y+6],[x,y]],'#c6bb91',1.7);
  c.fillStyle=game.faction.color;c.beginPath();c.moveTo(x+1,y);c.lineTo(x+18,y+2);c.lineTo(x+15,y+14);c.lineTo(x+1,y+12);c.fill();
  for(let i=0;i<u.level;i++){circle(c,p.x-(u.level-1)*4+i*8,p.y+24,2.3,'#13271b');circle(c,p.x-(u.level-1)*4+i*8,p.y+23,1.7,u.level===5?'#fff6c4':'#ebd28e');}
 }
 enemy(c,e,game,corpse=null){
  const t=this.time,id=e.id,size=e.type==='boss'?105:e.type==='armored'?61:e.type==='runner'?42:50;
  const moving=!reduced.matches&&!corpse,step=moving?Math.sin(t*(e.type==='runner'?15:10)+id):0;
  const alpha=corpse?Math.max(0,1-corpse.life/corpse.duration):1;
  this.shadow(c,e.x+4,e.y+3,e.type==='boss'?39:21,.4*alpha);
  if(e.slowUntil>game.time&&!corpse){glow(c,e.x,e.y-4,32,'#87ddff45');this.ring(c,e.x,e.y+1,18,'#9ce6ff',.6);}
  this.sprite(c,e.type,e.x,e.y-Math.abs(step)*1.8,size,{enemy:true,flip:Math.cos(e.facing||0)<-.1,angle:corpse?corpse.life*.8:step*.025,stretch:1+step*.018,alpha,flash:e.flash>0&&!corpse});
  if(!corpse&&(e.hp<e.maxHp||e.type==='boss')){
   const w=e.type==='boss'?66:29,y=e.y-size-11;
   c.fillStyle='#081710ce';c.beginPath();c.roundRect(e.x-w/2-1,y-1,w+2,5,2);c.fill();
   const g=c.createLinearGradient(e.x-w/2,0,e.x+w/2,0);g.addColorStop(0,e.type==='boss'?'#bc5d4b':'#8aa66b');g.addColorStop(1,e.type==='boss'?'#f2b680':'#d4df9a');c.fillStyle=g;c.fillRect(e.x-w/2,y,w*Math.max(0,e.hp/e.maxHp),3);
  }
 }
 ambient(c){
  if(!this.enhanced||reduced.matches)return;const t=this.time;
  c.save();c.globalCompositeOperation='screen';
  for(let i=0;i<3;i++){
   const x=145+i*420+Math.sin(t*.04+i)*60,y=88+i*218+Math.cos(t*.08+i)*13;
   const g=c.createRadialGradient(x,y,0,x,y,210);g.addColorStop(0,'#b3d5d009');g.addColorStop(1,'transparent');ellipse(c,x,y,260,75,g);
  }
  for(let i=0;i<20;i++){const x=(i*137+Math.sin(t*.3+i)*16)%1280,y=(i*211+t*3)%660;const alpha=.18+Math.sin(t+i)*.12;circle(c,x,y,.8+i%3*.3,`rgba(255,231,159,${alpha})`);}
  glow(c,1190,225,30,`rgba(255,173,71,${.11+Math.sin(t*7)*.025})`);c.restore();
 }
 drawEffects(c){
  for(const p of this.projectiles){
   const a=p.life/p.duration,arc=p.type==='siege'?80:12,x=p.x+(p.tx-p.x)*a,y=p.y+(p.ty-p.y)*a-Math.sin(a*Math.PI)*arc;
   c.save();c.globalCompositeOperation='screen';
   if(p.type==='mage'){glow(c,x,y,22,'#90d9ff99');circle(c,x,y,3,'#edfcff');stroke(c,[[x-13,y-4],[x-6,y-1],[x,y]],'#baf4ffbb',2);}
   else if(p.type==='siege'){glow(c,x,y,17,'#ffb45850');circle(c,x,y,5,'#e6b185');circle(c,x-1,y-1,2,'#fff1bb');}
   else{const angle=Math.atan2(p.ty-p.y,p.tx-p.x);stroke(c,[[x-Math.cos(angle)*21,y-Math.sin(angle)*21],[x,y]],'#fee0a9',1.5);stroke(c,[[x-3,y-5],[x,y],[x-5,y+2]],'#fff3da',1.3);}
   c.restore();
  }
  for(const e of this.effects){if(e.life<0)continue;const a=e.life/e.duration;
   c.save();
   if(e.kind==='slash'){
    c.globalAlpha=1-a;c.translate(e.x,e.y);c.rotate(-.7+a*.9);c.strokeStyle='#fff2cb';c.shadowColor='#fff2cb';c.shadowBlur=12;c.lineWidth=4*(1-a)+.4;c.beginPath();c.arc(0,0,24,-1.4,1.0);c.stroke();
   }else if(e.kind==='impact'){
    c.globalCompositeOperation='screen';glow(c,e.x,e.y,e.size*(.4+a),e.color+(a<.2?'99':'33'));this.ring(c,e.x,e.y,e.size*a,e.color,1-a);
   }else if(e.kind==='summon'){
    this.ring(c,e.x,e.y,25+a*25,e.color,1-a);glow(c,e.x,e.y-20,50,e.color+'22');
    if(this.enhanced){const g=c.createLinearGradient(0,e.y-100,0,e.y+10);g.addColorStop(0,'transparent');g.addColorStop(1,e.color+'44');c.globalAlpha=1-a;c.fillStyle=g;c.fillRect(e.x-18,e.y-100,36,105);}
   }else if(e.kind==='meteor'){
    if(e.life<.38){const v=e.life/.38,x=e.x-100*(1-v),y=e.y-260*(1-v);c.globalCompositeOperation='screen';stroke(c,[[x-55,y-110],[x,y]],'#ff9b4677',15);glow(c,x,y,45,'#ffbc77dd');circle(c,x,y,10,'#fff5cc');}
    else{const v=(e.life-.38)/.82;c.globalCompositeOperation='screen';glow(c,e.x,e.y,140*(.4+v),'#ffa957'+Math.round((1-v)*130).toString(16).padStart(2,'0'));this.ring(c,e.x,e.y,e.radius*(.5+v),e.color,1-v);this.ring(c,e.x,e.y,e.radius*v*1.7,'#ffe6b3',(1-v)*.6);}
   }
   c.restore();
  }
  c.save();c.globalCompositeOperation='screen';
  for(const p of this.particles){c.globalAlpha=Math.max(0,p.life/p.total);circle(c,p.x,p.y,p.r,p.color);}
  c.restore();
  c.save();c.font='600 13px system-ui';c.textAlign='center';c.lineWidth=3;c.lineJoin='round';
  for(const p of this.texts){if(p.life<0)continue;c.globalAlpha=Math.min(1,(p.total-p.life)*3);c.strokeStyle='#102219aa';c.fillStyle=p.color;c.strokeText(p.value,p.x,p.y-p.life*28);c.fillText(p.value,p.x,p.y-p.life*28);}
  c.restore();
 }
 paint(game,{selectedSlot=null,hoverSlot=null,selectedType=null,spellArmed=false,aim=null}={}){
  if(!this.ready)return;const c=this.ctx;
  c.setTransform(this.canvas.width/WORLD.width,0,0,this.canvas.height/WORLD.height,0,0);
  c.save();if(this.enhanced&&!reduced.matches&&this.shake>0)c.translate((Math.random()-.5)*this.shake,(Math.random()-.5)*this.shake*.6);
  c.drawImage(this.map,0,0,1280,700);
  // Warm/cold grading keeps sprites and painted environment in the same world.
  c.fillStyle='#0c211509';c.fillRect(0,0,1280,700);
  if(game.phase==='build'&&game.wave<2){
   for(let d=85;d<PATH_LENGTH-65;d+=160){const p=pointAt(d),q=pointAt(d+10),a=Math.atan2(q.y-p.y,q.x-p.x);c.save();c.translate(p.x,p.y);c.rotate(a);c.globalAlpha=.18+Math.sin(this.time*2-d)*.05;stroke(c,[[-4,-4],[1,0],[-4,4]],'#fff2cf',1.7);c.restore();}
  }
  const slot=hoverSlot??selectedSlot;
  if(slot!==null&&!spellArmed){
   const u=game.units.find(u=>u.slot===slot),type=u?.type||selectedType,p=SLOTS[slot];
   if(type){const r=game.stats(u||{type,level:1}).range;glow(c,p.x,p.y,r,game.faction.color+'18');c.strokeStyle=game.faction.color+'8c';c.lineWidth=1.3;c.setLineDash([7,6]);c.lineDashOffset=-this.time*13;c.beginPath();c.arc(p.x,p.y,r,0,TAU);c.stroke();c.setLineDash([]);}
   this.ring(c,p.x,p.y+4,34,game.faction.color,1);
  }
  for(const corpse of this.corpses)this.enemy(c,corpse.enemy,game,corpse);
  const actors=[...game.units.map(unit=>({y:SLOTS[unit.slot].y,unit})),...game.enemies.map(enemy=>({y:enemy.y,enemy}))].sort((a,b)=>a.y-b.y);
  for(const a of actors)a.unit?this.unit(c,a.unit,game):this.enemy(c,a.enemy,game);
  this.drawEffects(c);this.ambient(c);
  if(spellArmed&&aim){glow(c,aim.x,aim.y,108,'#ffbc613d');c.strokeStyle='#ffd494';c.lineWidth=2;c.setLineDash([6,7]);c.lineDashOffset=-this.time*20;c.beginPath();c.arc(aim.x,aim.y,108,0,TAU);c.stroke();c.setLineDash([]);stroke(c,[[aim.x-12,aim.y],[aim.x+12,aim.y]],'#fff0cb',1.2);stroke(c,[[aim.x,aim.y-12],[aim.x,aim.y+12]],'#fff0cb',1.2);}
  if(this.flash>0){c.fillStyle=`rgba(194,54,31,${this.flash*.25})`;c.fillRect(0,0,1280,700);}
  c.restore();
 }
}
