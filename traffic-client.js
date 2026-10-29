/* Staged: opt-in only, no cookies, storage, visitor ID or automatic retries. */
(function(){
'use strict';
const config=window.HOUSE_TRAFFIC_CONFIG;
if(!config?.enabled||location.origin!=='https://bernhardhuettel-svg.github.io'||!['/Ein-Haus-viele-Namen/','/Ein-Haus-viele-Namen/index.html'].includes(location.pathname))return;
const box=document.getElementById('trafficConsent');if(!box)return;
const allow=document.getElementById('trafficAllow'),decline=document.getElementById('trafficDecline'),status=document.getElementById('trafficStatus');
// Partial downloads or mismatched cached markup must not expose broken consent controls.
if(!allow||!decline||!status||typeof window.HouseTraffic?.commit!=='function')return;
box.hidden=false;let attempted=false;
decline.onclick=()=>{attempted=true;box.hidden=true;};
allow.onclick=async()=>{if(attempted)return;attempted=true;allow.disabled=true;decline.disabled=true;
 try{const response=await fetch('https://firestore.googleapis.com/v1/projects/'+config.project+'/databases/(default)/documents:commit',{method:'POST',credentials:'omit',referrerPolicy:'no-referrer',headers:{'Content-Type':'application/json'},body:JSON.stringify(window.HouseTraffic.commit(config.project)),signal:AbortSignal.timeout(5000)});if(!response.ok)throw Error('Nicht gezählt');status.textContent='Danke. Dieser Seitenaufruf wurde mitgezählt.';}
 catch(_){status.textContent='Der Aufruf konnte nicht gezählt werden. Du kannst die Seite weiterhin uneingeschränkt nutzen.';}
};
})();
