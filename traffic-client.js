/* Remember consent locally; count at most once per page load. */
(function(){
'use strict';
const config=window.HOUSE_TRAFFIC_CONFIG;
if(!config?.enabled||location.origin!=='https://bernhardhuettel-svg.github.io'||!['/Ein-Haus-viele-Namen/','/Ein-Haus-viele-Namen/index.html'].includes(location.pathname))return;
const box=document.getElementById('trafficConsent');if(!box)return;
const allow=document.getElementById('trafficAllow'),decline=document.getElementById('trafficDecline'),status=document.getElementById('trafficStatus');
// Partial downloads or mismatched cached markup must not expose broken consent controls.
if(!allow||!decline||!status||typeof window.HouseTraffic?.commit!=='function')return;
box.hidden=false;let attempted=false;let choice=null;
const key='house-traffic-choice-v1';
try{const saved=JSON.parse(localStorage.getItem(key));if(saved&&saved.expires>Date.now()&&['yes','no'].includes(saved.value))choice=saved.value;}catch(_){}
function remember(value){choice=value;try{localStorage.setItem(key,JSON.stringify({value,expires:Date.now()+180*86400000}));}catch(_){status.textContent='Dein Browser kann die Entscheidung nicht speichern; sie gilt nur für diesen Aufruf.';}}
const settings=document.getElementById('trafficSettings'),navCount=document.getElementById('trafficNavCount');
if(settings)settings.onclick=()=>{box.hidden=false;allow.disabled=false;decline.disabled=false;box.scrollIntoView({block:'center'});};
const countNode=document.getElementById('trafficCount'),availability=document.getElementById('trafficAvailability');
if(availability)availability.textContent='Mit deiner Zustimmung wird dieser Aufruf gezählt und die aktuelle Tageszahl angezeigt.';
decline.onclick=()=>{remember('no');attempted=true;box.hidden=true;if(availability)availability.textContent='Zählung in diesem Browser ausgeschaltet. Über Aufrufstatistik kannst du deine Entscheidung ändern.';};
allow.onclick=async()=>{if(choice==='no'){remember('yes');box.hidden=true;status.textContent='Zählung ab dem nächsten Laden aktiviert.';return;}if(attempted){box.hidden=true;return;}remember('yes');attempted=true;allow.disabled=true;decline.disabled=true;
 try{const response=await fetch('https://firestore.googleapis.com/v1/projects/'+config.project+'/databases/(default)/documents:commit',{method:'POST',credentials:'omit',referrerPolicy:'no-referrer',headers:{'Content-Type':'application/json'},body:JSON.stringify(window.HouseTraffic.commit(config.project)),signal:AbortSignal.timeout(5000)});if(!response.ok)throw Error('Nicht gezählt');status.textContent='Danke. Dieser Seitenaufruf wurde mitgezählt.';
 // The committed transform result is authoritative and needs no public database read.
 if(countNode){
  try{const result=await response.json();const raw=result.writeResults?.[0]?.transformResults?.[0]?.integerValue;const total=Number(raw);
   if(typeof raw!=='string'||!/^\d+$/.test(raw)||!Number.isSafeInteger(total)||total<1||total>window.HouseTraffic.CAP)throw Error('Ungültiger Zähler');
   countNode.textContent=(total===window.HouseTraffic.CAP?'≥ ':'')+total.toLocaleString('de-DE');
   if(navCount)navCount.textContent=countNode.textContent;
   if(availability)availability.textContent='Tagesstand nach deinem Aufruf (UTC). Weitere Aufrufe erscheinen beim nächsten bestätigten Zählvorgang.';
  }catch(_){countNode.textContent='—';if(availability)availability.textContent='Dein Aufruf wurde gezählt; die aktuelle Tageszahl konnte nicht angezeigt werden.';}
 }}
 catch(_){status.textContent='Der Aufruf konnte nicht gezählt werden. Du kannst die Seite weiterhin uneingeschränkt nutzen.';}
};
if(choice==='yes'){box.hidden=true;allow.onclick();}else if(choice==='no'){box.hidden=true;if(availability)availability.textContent='Zählung in diesem Browser ausgeschaltet.';}
})();
