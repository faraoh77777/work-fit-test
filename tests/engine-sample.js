const E=require('../fit-engine.js');
const profile={gender:'male',height:172,weight:66,pref:'fit',m:{chest:96,shoulder:44,waist:78,foot:255}};
const top={fabric:'stretch',measureType:'flat',sizes:[
 {label:'S',chest:52,shoulder:44,length:66,sleeve:60},
 {label:'M',chest:55,shoulder:46,length:69,sleeve:62},
 {label:'L',chest:58,shoulder:48,length:72,sleeve:64}]};
const bot={fabric:'normal',measureType:'flat',sizes:[
 {label:'S',waist:39,thigh:28,rise:26,inseam:74},
 {label:'M',waist:42,thigh:30,rise:27,inseam:76},
 {label:'L',waist:45,thigh:32,rise:28,inseam:78}]};
const shoe={sizes:[{label:'250'},{label:'260',inner:268},{label:'270'}]};
const r=E.evaluate({profile,items:[{cat:'top',garment:top,size:'M'},{cat:'bottom',garment:bot,size:null},{cat:'shoe',garment:shoe,size:'260'}]});
console.log(JSON.stringify(r.body.vals));
for(const x of r.results){console.log(x.cat,'chosen',x.chosen,'rec',x.recommended);
 for(const p of x.current.parts)console.log('  ',p.label,p.grade||'',p.ease??'',p.text||'',p.detail||'');
 console.log('  all:',x.all.map(e=>e.size+':'+(e.primary&&e.primary.grade)+'('+(e.primary&&e.primary.ease)+')').join(' '));}
console.log(r.note);
