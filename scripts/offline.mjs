import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
let html=fs.readFileSync(path.join(root,'dist/index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'dist/style.css'),'utf8')+'\n'+fs.readFileSync(path.join(root,'dist/polish.css'),'utf8');
const engine=fs.readFileSync(path.join(root,'dist/engine.js'),'utf8').replace(/^export /gm,'');
const renderer=fs.readFileSync(path.join(root,'dist/renderer.js'),'utf8').replace(/^import .*;\n/gm,'').replace(/^export /gm,'');
const script=fs.readFileSync(path.join(root,'dist/game.js'),'utf8').replace(/^import .*;\n/gm,'');
html=html.replace('<link rel="icon" type="image/svg+xml" href="icon.svg">','').replace('<link rel="stylesheet" href="style.css">',()=>`<style>${css}</style>`).replace('<link rel="stylesheet" href="polish.css">','').replace(/<script type="module" src="game.js(?:\?v=[^"]+)?"><\/script>/,()=>`<script type="module">${engine}\n${renderer}\n${script}</script>`);
for(const file of fs.readdirSync(path.join(root,'dist/assets'))){
 if(!file.endsWith('.webp'))continue;
 const data='data:image/webp;base64,'+fs.readFileSync(path.join(root,'dist/assets',file)).toString('base64');
 html=html.split('assets/'+file).join(data);
}
const out=process.argv[2]||path.join(root,'Bastion_Demo_Offline.html');
fs.writeFileSync(out,html);console.log(`Offline demo: ${out}`);
