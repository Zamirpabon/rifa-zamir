import {getStore} from './store.js';
import {el,peso,datePretty,counts,sold,publicState,contactNumber,notify,exportTalonarioPNG} from './utils.js';
let store,rows=[],settings={},busy=false;
const authorized=()=>window.RIFA_CONFIG?.publicacionAutorizada===true;
const canContact=()=>authorized()&&Boolean(contactNumber(settings.whatsapp))&&settings.draw_date>=todayBogota();
function todayBogota(){const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));return `${p.year}-${p.month}-${p.day}`;}
function whatsApp(number){return `https://wa.me/${contactNumber(settings.whatsapp)}?text=${encodeURIComponent(`Hola, quiero consultar el número ${number} de la rifa.`)}`;}
function renderSettings(){
  el('prize').textContent=settings.prize;
  el('draw-date').textContent=datePretty(settings.draw_date);
  el('ticket-price').textContent=peso(settings.ticket_price);
  el('lottery').textContent=settings.lottery;
  el('organizer').textContent=settings.organizer || 'Organización de la rifa';
  document.title=`${settings.title} · Una noble causa`;
  const link=el('wa-link');
  if(canContact()){link.href=whatsApp('disponible');link.textContent='Consultar por WhatsApp ↗';link.classList.remove('is-disabled');link.removeAttribute('aria-disabled');}
  else{link.href='#';link.textContent=settings.draw_date<todayBogota()?'Sorteo finalizado':'Participación no habilitada';link.classList.add('is-disabled');link.setAttribute('aria-disabled','true');}
  el('draft-notice').hidden=authorized();
  el('footer-desc').textContent=settings.draw_date<todayBogota()?'Sorteo finalizado':'00–99';
}
function modalFor(row){
  el('dialog-number').textContent=row.number;
  const label=publicState(row.status);
  el('dialog-title').textContent=label;
  const desc=row.status==='disponible'?'¡Este número todavía está libre!':row.status==='apartado'?'Este número está reservado. Puedes consultar otro del talonario.':'Este número ya tiene comprador. Puedes elegir otro disponible.';
  el('dialog-description').textContent=desc;
  const action=el('dialog-action');action.hidden=!canContact()||row.status!=='disponible';
  if(!action.hidden)action.href=whatsApp(row.number);
  const dlg=el('number-dialog');if(!dlg.open)dlg.showModal();
}
function renderNumbers(){
  const host=el('number-grid');const fragment=document.createDocumentFragment();
  rows.forEach(row=>{
    const b=document.createElement('button');b.type='button';b.className=`number-cell ${row.status}`;b.dataset.number=row.number;
    b.title=`Número ${row.number} · ${publicState(row.status)}`;
    b.setAttribute('aria-label',b.title);
    const number=document.createElement('span');number.textContent=row.number;b.append(number);
    if(row.emoji){const em=document.createElement('span');em.className='emoji';em.textContent=row.emoji;em.setAttribute('aria-hidden','true');b.append(em);}
    b.addEventListener('click',()=>modalFor(row));fragment.append(b);
  });host.replaceChildren(fragment);applyFilter();
  const c=counts(rows),used=c.pending+c.paid;
  el('free-count').textContent=c.free;el('held-count').textContent=c.held;el('sold-count-small').textContent=used;
  el('sold-count').textContent=`${used} vendidos`;
  el('progress-pct').textContent=`${used}%`;el('progress-bar').style.width=`${used}%`;
  el('stats-line').textContent=`${c.free} libres · ${c.held} apartados · ${used} vendidos`;
  el('last-update').textContent='Actualizado '+new Intl.DateTimeFormat('es-CO',{hour:'2-digit',minute:'2-digit'}).format(new Date());
}
function applyFilter(){const q=el('search-number').value.trim();const normalized=/^\d{1,2}$/.test(q)?q.padStart(2,'0'):q;document.querySelectorAll('#number-grid .number-cell').forEach(b=>b.classList.toggle('is-hidden',Boolean(q)&&!b.dataset.number.includes(normalized)));}
async function refresh(){if(busy)return;busy=true;try{rows=await store.publicList();renderNumbers();}catch(e){notify('No se pudieron cargar los números: '+e.message);el('stats-line').textContent='Error de conexión. Usa ↻ para reintentar.';}finally{busy=false;}}
async function main(){
  try{
    store=await getStore();el('demo-notice').hidden=!store.demo;
    if(store.preview)el('demo-notice').innerHTML='<strong>Vista previa sin base de datos.</strong> Estos números son ilustrativos y no representan ventas reales. El registro de compradores se habilitará al conectar el sistema.';
    settings=await store.getSettings();renderSettings();await refresh();
    el('search-number').addEventListener('input',applyFilter);
    el('refresh').addEventListener('click',()=>refresh());
    el('download-png').addEventListener('click',async()=>{const b=el('download-png');b.disabled=true;b.textContent='Preparando imagen...';try{await exportTalonarioPNG(rows,settings,authorized());notify('Imagen HD descargada · 2400 × 2980 px');}catch(e){notify('Error al generar imagen: '+e.message);}finally{b.disabled=false;b.textContent='↓ Descargar imagen HD';}});
    el('wa-link').addEventListener('click',e=>{if(!canContact())e.preventDefault();});
    window.addEventListener('storage',e=>{if(store.demo&&e.key==='rifa-pastel-numbers-v2')refresh();});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
    setInterval(()=>{if(!document.hidden)refresh();},30000);
  }catch(e){el('demo-notice').hidden=false;el('demo-notice').textContent='Error al conectar la base de datos: '+e.message;notify(e.message);}
}
main();
