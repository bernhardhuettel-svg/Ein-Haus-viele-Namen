/* Only aggregate request counts; never an identity or payment signal. */
(function(root){
'use strict';
const DAY_MS=86400000, CAP=2000;
function dayId(now=Date.now()){return String(Math.floor(now/DAY_MS));}
function commit(project,now=Date.now()){
 if(!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(project))throw Error('Ungültiges Projekt');
 const name='projects/'+project+'/databases/(default)/documents/trafficDaily/'+dayId(now);
 return {writes:[{update:{name,fields:{day:{integerValue:dayId(now)}}},updateMask:{fieldPaths:['day']},updateTransforms:[{fieldPath:'count',increment:{integerValue:'1'}}]}]};
}
function summarize(rows,now=Date.now()){
 const today=Number(dayId(now));const data=new Map();
 for(const row of rows){if(!Number.isSafeInteger(row.day)||!Number.isSafeInteger(row.count)||row.count<1||row.count>CAP||row.day>today||row.day<today-29||data.has(row.day))throw Error('Ungültige Statistikdaten');data.set(row.day,row.count);}
 const days=Array.from({length:30},(_,i)=>{const day=today-29+i;return {day,label:new Date(day*DAY_MS).toISOString().slice(0,10),count:data.has(day)?data.get(day):null,capped:data.get(day)===CAP};});
 return {days,total:days.reduce((n,d)=>n+(d.count||0),0),today:data.get(today)??null,capped:days.some(d=>d.capped),observedDays:data.size};
}
const api={DAY_MS,CAP,dayId,commit,summarize};if(typeof module==='object'&&module.exports)module.exports=api;else root.HouseTraffic=api;
})(typeof window==='object'?window:globalThis);
