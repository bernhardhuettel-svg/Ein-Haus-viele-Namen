import {getFirestore,collection,query,where,orderBy,limit,getDocs} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';
const $=id=>document.getElementById(id);let session=0;
export function resetTraffic(){session++;$('trafficRows').replaceChildren();$('trafficSummary').textContent=window.HOUSE_TRAFFIC_CONFIG?.enabled?'Statistik noch nicht geladen.':'Aufrufstatistik vorbereitet, noch nicht aktiviert. Es liegen keine gemessenen Besucherzahlen vor.';}
export async function loadTraffic(){
 const turn=session; if(!window.HOUSE_TRAFFIC_CONFIG?.enabled)return;
 $('trafficSummary').textContent='Aufrufstatistik wird geladen …';
 try{const first=Number(window.HouseTraffic.dayId())-29;const result=await getDocs(query(collection(getFirestore(),'trafficDaily'),where('day','>=',first),orderBy('day'),limit(30)));if(turn!==session)return;
 const report=window.HouseTraffic.summarize(result.docs.map(d=>d.data()));
 $('trafficSummary').textContent=report.observedDays?report.total.toLocaleString('de-DE')+' gezählte Aufrufe in den letzten 30 UTC-Tagen.'+(report.capped?' Mindestens ein Tageslimit wurde erreicht; zusätzliche Aufrufe fehlen.':''):'Noch keine Messdaten vorhanden. Das ist kein Nachweis für null Besucher.';
 const table=document.createElement('table');const header=table.createTHead().insertRow();for(const name of ['Tag (UTC)','Gezählte Aufrufe']){const th=document.createElement('th');th.scope='col';th.textContent=name;header.append(th);}const body=table.createTBody();for(const d of report.days.toReversed()){const row=body.insertRow();row.insertCell().textContent=d.label;row.insertCell().textContent=d.count===null?'Keine Messdaten':d.count.toLocaleString('de-DE')+(d.capped?' (Limit erreicht)':'');}$('trafficRows').replaceChildren(table);
 }catch(_){if(turn===session){$('trafficRows').replaceChildren();$('trafficSummary').textContent='Statistik nicht abrufbar. Berechtigung oder Verbindung prüfen; kein Nullwert angenommen.';}}
}
