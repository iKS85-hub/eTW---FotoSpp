
// Separate durable autosave in IndexedDB; legacy localStorage drafts remain untouched.
(function(){
const status=document.createElement('p');status.className='hint';status.id='autosaveStatus';status.textContent='Automatische lokale Sicherung wird vorbereitet…';
const draftButton=document.getElementById('draft');draftButton.parentNode.insertBefore(status,draftButton);
let dbPromise;
function db(){return dbPromise||(dbPromise=new Promise((resolve,reject)=>{const request=indexedDB.open('etw-foto-projects',1);request.onupgradeneeded=()=>{const database=request.result;if(!database.objectStoreNames.contains('drafts'))database.createObjectStore('drafts')};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)}))}
function save(key,value){return db().then(database=>new Promise((resolve,reject)=>{const tx=database.transaction('drafts','readwrite');tx.objectStore('drafts').put(value,key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)}))}
function load(key){return db().then(database=>new Promise((resolve,reject)=>{const tx=database.transaction('drafts','readonly');const req=tx.objectStore('drafts').get(key);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)}))}
function originalImage(p){const canvas=document.createElement('canvas');canvas.width=p.img.naturalWidth||p.img.width;canvas.height=p.img.naturalHeight||p.img.height;canvas.getContext('2d').drawImage(p.img,0,0);return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Bild konnte nicht gespeichert werden')),'image/png'))}
let timer,working=false,again=false;
async function persist(){if(working){again=true;return}const project=document.getElementById('project').value.trim();if(!project||!pages.length){status.textContent='Projektbezeichnung eingeben, damit die automatische Sicherung startet.';return}
working=true;status.textContent='Entwurf wird lokal gesichert…';
try{const records=[];for(const p of pages){records.push({image:await originalImage(p),strokes:structuredClone(p.strokes),name:p.name})}
await save('current',{project,notes:document.getElementById('notes').value,pages:records,savedAt:new Date().toISOString()});
status.textContent='Lokal gesichert: '+new Date().toLocaleTimeString('de-DE')+' · Google Drive noch nicht verbunden';
}catch(err){status.textContent='Sicherung fehlgeschlagen: '+(err.message||err)}finally{working=false;if(again){again=false;schedule()}}}
function schedule(){clearTimeout(timer);timer=setTimeout(persist,1200)}
['project','notes','photo','tool','color','width'].forEach(id=>document.getElementById(id)?.addEventListener('change',schedule));
document.getElementById('canvas')?.addEventListener('pointerup',schedule);
['undo','clear','remove','prev','next'].forEach(id=>document.getElementById(id)?.addEventListener('click',schedule));
document.getElementById('overlaySave')?.addEventListener('click',schedule);
const button=document.createElement('button');button.type='button';button.className='secondary';button.textContent='Lokalen Entwurf öffnen (offline)';draftButton.parentNode.insertBefore(button,status.nextSibling);
button.addEventListener('click',async()=>{try{const d=await load('current');if(!d)return alert('Noch kein automatisch gesicherter Entwurf vorhanden.');if(!confirm('Aktuelle Fotos durch den automatisch gespeicherten Entwurf ersetzen?'))return;const restored=[];for(const p of d.pages){const url=URL.createObjectURL(p.image);const im=new Image();im.src=url;await im.decode();URL.revokeObjectURL(url);restored.push({img:im,strokes:p.strokes||[],name:p.name||''})}pages=restored;current=0;document.getElementById('project').value=d.project;document.getElementById('notes').value=d.notes||'';render();status.textContent='Entwurf vom '+new Date(d.savedAt).toLocaleString('de-DE')+' wiederhergestellt.'}catch(err){alert('Wiederherstellung fehlgeschlagen: '+(err.message||err))}});
window.addEventListener('pagehide',()=>{if(timer){clearTimeout(timer);persist()}});
status.textContent='Automatische lokale Sicherung bereit. Projektbezeichnung erforderlich.';
})();
