(function(root){
'use strict';
const DEFAULT='浏览器: Chrome | Firefox | Safari\n登录: 已登录 | 未登录\n网络: 正常 | 断网\n屏幕: 桌面 | 手机';
function validate(fs){
 if(!Array.isArray(fs)||fs.length<2||fs.length>6)throw Error('请填写2–6个因素，每个因素单独一行。');
 const text=v=>typeof v==='string'&&[...v].length>=1&&[...v].length<=24&&v===v.trim()&&!/[\x00-\x1f\x7f:：|]/u.test(v);
 const names=new Set();
 for(const f of fs){if(!f||!text(f.name)||names.has(f.name))throw Error('因素名称须为1–24字且不重复，不能含分隔符或控制字符。');names.add(f.name);if(!Array.isArray(f.values)||f.values.length<2||f.values.length>5||!f.values.every(text)||new Set(f.values).size!==f.values.length)throw Error('每个因素需2–5个不同值，每个值1–24字，不含分隔符或控制字符。');}
 return fs.map(f=>({name:f.name,values:[...f.values]}));
}
function parse(s){if(typeof s!=='string'||s.length>5000)throw Error('输入过长或格式错误。');return validate(s.split(/\r?\n/).filter(x=>x.trim()).map(line=>{const m=line.match(/^([^:：]+)[:：](.*)$/u);if(!m)throw Error('请按「因素: 值 | 值」逐行填写。');return{name:m[1].trim(),values:m[2].split('|').map(v=>v.trim())};}));}
function format(fs){return validate(fs).map(f=>f.name+': '+f.values.join(' | ')).join('\n');}
function generate(input){const factors=validate(input);const groups=[];let totalPairs=0;for(let i=0;i<factors.length;i++)for(let j=i+1;j<factors.length;j++){groups.push({i,j,offset:totalPairs,total:factors[i].values.length*factors[j].values.length});totalPairs+=groups.at(-1).total;}
 let combos=[[]];for(const f of factors)combos=combos.flatMap(row=>f.values.map((_,i)=>[...row,i]));
 const ids=row=>groups.map(g=>g.offset+row[g.i]*factors[g.j].values.length+row[g.j]);
 const candidates=combos.map(row=>({row,ids:ids(row)}));const seen=new Uint8Array(totalPairs),rows=[];let left=totalPairs;
 while(left){let best=null,score=-1;for(const c of candidates){let n=0;for(const id of c.ids)n+=!seen[id];if(n>score){best=c;score=n;}}if(score<1)throw Error('覆盖生成失败');rows.push(best.row);for(const id of best.ids)if(!seen[id]){seen[id]=1;left--;}}
 return{factors,rows,groups,totalPairs,full:combos.length};}
function stats(plan,statuses){if(!Array.isArray(statuses)||statuses.length!==plan.rows.length||statuses.some(x=>!['pending','pass','fail'].includes(x)))throw Error('执行记录格式错误');const done=new Set();let pass=0,fail=0;statuses.forEach((s,r)=>{if(s==='pending')return;s==='pass'?pass++:fail++;for(const g of plan.groups)done.add(g.offset+plan.rows[r][g.i]*plan.factors[g.j].values.length+plan.rows[r][g.j]);});return{pass,fail,pending:statuses.length-pass-fail,covered:done.size,total:plan.totalPairs,groups:plan.groups.map(g=>({...g,covered:[...done].filter(id=>id>=g.offset&&id<g.offset+g.total).length}))};}
function restore(s){if(typeof s!=='string'||s.length>100000)throw Error('备份过大或格式错误');let data;try{data=JSON.parse(s);}catch{throw Error('不是有效JSON备份');}if(!data||data.schema!=='pairwise-workbench/1')throw Error('不支持此备份版本');const plan=generate(data.factors);stats(plan,data.statuses);return{plan,statuses:[...data.statuses]};}
function backup(plan,statuses){stats(plan,statuses);return JSON.stringify({schema:'pairwise-workbench/1',factors:plan.factors,statuses},null,2);}
function csv(plan,statuses){stats(plan,statuses);const esc=v=>'"'+String(v).replace(/^[=+@\-\t\r]/,"'$&").replaceAll('"','""')+'"';return '\uFEFF'+[['用例',...plan.factors.map(f=>f.name),'人工记录'],...plan.rows.map((r,i)=>['T'+String(i+1).padStart(2,'0'),...r.map((v,j)=>plan.factors[j].values[v]),({pending:'待执行',pass:'通过',fail:'失败'})[statuses[i]]])].map(r=>r.map(esc).join(',')).join('\r\n');}
root.AppCore={DEFAULT,validate,parse,format,generate,stats,restore,backup,csv};if(typeof module!=='undefined')module.exports=root.AppCore;
})(typeof globalThis!=='undefined'?globalThis:this);
