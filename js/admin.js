import {getStore,asNumber} from './store.js';
import {el,peso,counts,notify,saveCSV,exportTalonarioPNG} from './utils.js';
let store,rows=[],settings={},selected=new Set(['00']),filter='todos';
const selectedRows=()=>rows.filter(r=>selected.has(r.number));
const authorized=()=>window.RIFA_CONFIG?.publicacionAutorizada===true;
const getRow=num=>rows.find(r=>r.number===num);
function fillEdit(){
  const arr=selectedRows(),first=arr[0];
  el('selected-number').textContent=arr.length===1?first.number:arr.length?String(arr.length)+'×':'—';
  el('editing-title').textContent=arr.length===1?'Número '+first.number:arr.length?`${arr.length} números seleccionados`:'Sin selección';
  el('editing-subtitle').textContent=arr.length>1?'Los cambios se aplicarán a TODOS los seleccionados':'Edita los datos privados de este número';
  const ids=['ticket-status','buyer-name','buyer-phone','amount-received','number-emoji','buyer-notes'];
  const values=arr.length===1?[
    first.status,first.buyer_name||'',first.buyer_phone||'',first.amount_paid||0,first.emoji||'',first.notes||''
  ]:['disponible','','',0,'',''];
  ids.forEach((id,i)=>el(id).value=values[i]);
  el('save-ticket').disabled=arr.length===0;
  el('save-result').textContent='';updatePaymentHelp();
  el('selection-count').textContent=`${selected.size} seleccionado${selected.size===1?'':'s'}`;
}
function updatePaymentHelp(){const received=Number(el('amount-received').value)||0;const diff=Math.max(0,Number(settings.ticket_price||0)-received);el('payment-helper').textContent=diff?`Faltan ${peso(diff)} para completar cada boleta.`:'Importe completo registrado.';}
function choose(number){
  if(el('multi-mode').checked){selected.has(number)?selected.delete(number):selected.add(number);}else{selected=new Set([number]);}
  renderGrid();fillEdit();
}
function renderGrid(){
  const search=el('admin-search').value.trim().toLocaleLowerCase('es-CO');const host=el('admin-grid');const fragment=document.createDocumentFragment();
  rows.filter(row=>(filter==='todos'||row.status===filter)&&(!search||row.number.includes(search)||(row.buyer_name||'').toLocaleLowerCase('es-CO').includes(search))).forEach(row=>{
    const b=document.createElement('button');b.type='button';b.className=`number-cell ${row.status}${selected.has(row.number)?' is-selected':''}`;
    const desc={disponible:'Libre',apartado:'Apartado',pendiente:'Por cobrar',pagado:'Pagado'};
    b.title=`${row.number} · ${desc[row.status]||row.status}${row.buyer_name?' · '+row.buyer_name:''}`;
    b.setAttribute('aria-label',b.title);b.setAttribute('aria-pressed',String(selected.has(row.number)));
    const n=document.createElement('span');n.textContent=row.number;b.append(n);
    if(row.emoji){const e=document.createElement('span');e.className='emoji';e.setAttribute('aria-hidden','true');e.textContent=row.emoji;b.append(e);}
    b.addEventListener('click',()=>choose(row.number));fragment.append(b);
  });host.replaceChildren(fragment);
  if(!fragment.childNodes.length&&!host.children.length){const p=document.createElement('p');p.textContent='No hay números con este filtro.';p.style.color='#9aa4b4';host.append(p);}
}
function renderStats(){const c=counts(rows);el('a-free').textContent=c.free;el('a-held').textContent=c.held;el('a-pending').textContent=c.pending;el('a-earned').textContent=peso(rows.reduce((s,r)=>s+Number(r.amount_paid||0),0));}
async function refresh(){rows=await store.adminList();renderStats();renderGrid();fillEdit();}
async function saveTicket(event){
  event.preventDefault();
  if(!selected.size)return notify('Primero selecciona un número.');
  let data={status:el('ticket-status').value,buyer_name:el('buyer-name').value.trim(),buyer_phone:el('buyer-phone').value.trim(),amount_paid:Number(el('amount-received').value)||0,emoji:el('number-emoji').value,notes:el('buyer-notes').value.trim()};
  if(data.status!=='disponible'&&!data.buyer_name)return notify('Escribe de quién es el número.');
  if(data.amount_paid<0||data.amount_paid>10000000||!Number.isSafeInteger(data.amount_paid))return notify('El dinero recibido debe ser un valor válido en pesos.');
  if(data.status==='pagado'&&data.amount_paid<Number(settings.ticket_price))return notify('Para marcar pagado, registra el valor completo de la boleta.');
  if(data.status==='disponible')data={...data,buyer_name:'',buyer_phone:'',amount_paid:0,notes:'',emoji:''};
  if(selected.size>1&&!window.confirm(`¿Aplicar estado «${data.status}» y estos datos a ${selected.size} números?`))return;
  const btn=el('save-ticket');btn.disabled=true;btn.textContent='Guardando...';
  try{await store.saveMany([...selected],data);await refresh();el('save-result').textContent=`✓ ${selected.size} número${selected.size===1?'':'s'} actualizado${selected.size===1?'':'s'}.`;notify('Cambios guardados correctamente');}
  catch(e){el('save-result').textContent='No se pudo guardar: '+e.message;notify(e.message);}finally{btn.disabled=false;btn.textContent='Guardar cambios ✓';}
}
function fillSettings(){[['s-title','title'],['s-prize','prize'],['s-date','draw_date'],['s-price','ticket_price'],['s-lottery','lottery'],['s-organizer','organizer'],['s-whatsapp','whatsapp']].forEach(([id,key])=>el(id).value=settings[key]||'');}
async function saveSettings(event){event.preventDefault();const b=el('settings-form').querySelector('button[type=submit]');const data={title:el('s-title').value.trim(),prize:el('s-prize').value.trim(),draw_date:el('s-date').value,ticket_price:Number(el('s-price').value),lottery:el('s-lottery').value.trim(),organizer:el('s-organizer').value.trim(),whatsapp:el('s-whatsapp').value.replace(/\D/g,'')};
  if(!data.title||!data.prize||!/^\d{4}-\d{2}-\d{2}$/.test(data.draw_date)||data.ticket_price<1000){notify('Completa los datos del sorteo correctamente.');return;}
  b.disabled=true;try{settings={...settings,...await store.saveSettings(data)};el('settings-result').textContent='✓ Datos guardados';notify('Datos generales actualizados');updatePaymentHelp();}catch(e){el('settings-result').textContent=e.message;notify(e.message);}finally{b.disabled=false;}
}
async function showPanel(){
  settings=await store.getSettings();rows=await store.adminList();
  el('login-view').hidden=true;el('dashboard').hidden=false;el('logout').hidden=store.demo;
  fillSettings();renderStats();renderGrid();fillEdit();
}
async function main(){
  try{
    store=await getStore();el('demo-notice').hidden=!store.demo;el('draft-notice').hidden=authorized();
    if(store.preview){
      el('login-view').hidden=false;
      el('login-form').hidden=true;
      el('login-error').textContent='El panel de administración se habilitará al conectar una base de datos y crear el acceso privado.';
      el('demo-notice').innerHTML='<strong>Vista previa pública.</strong> Los compradores y los pagos no se pueden registrar todavía.';
    }else if(store.demo||await store.getCurrentAdmin())await showPanel();else el('login-view').hidden=false;
    el('login-form').addEventListener('submit',async(e)=>{e.preventDefault();const button=e.currentTarget.querySelector('button');button.disabled=true;el('login-error').textContent='';try{await store.login(el('email').value.trim(),el('password').value);await showPanel();}catch(err){el('login-error').textContent=err.message;}finally{button.disabled=false;}});
    el('logout').addEventListener('click',async()=>{try{await store.logout();el('dashboard').hidden=true;el('login-view').hidden=false;el('logout').hidden=true;notify('Sesión cerrada');}catch(e){notify(e.message);}});
    el('filter').addEventListener('change',e=>{filter=e.target.value;renderGrid();});
    el('admin-search').addEventListener('input',renderGrid);
    el('multi-mode').addEventListener('change',()=>{if(!el('multi-mode').checked&&selected.size>1)selected=new Set([[...selected][0]]);renderGrid();fillEdit();});
    el('clear-selection').addEventListener('click',()=>{selected.clear();renderGrid();fillEdit();});
    el('select-numbers').addEventListener('click',()=>{
      const list=el('quick-numbers').value.split(/[;,\s]+/).filter(Boolean).map(asNumber);
      if(!list.length||list.includes(null))return notify('Introduce números válidos de 00 a 99 separados por comas.');
      selected=new Set(list);el('multi-mode').checked=selected.size>1;
      filter='todos';el('filter').value='todos';el('admin-search').value='';renderGrid();fillEdit();notify(`${selected.size} números seleccionados`);
    });
    el('amount-received').addEventListener('input',updatePaymentHelp);
    el('ticket-form').addEventListener('submit',saveTicket);
    el('settings-toggle').addEventListener('click',()=>{const form=el('settings-form');form.hidden=!form.hidden;el('settings-toggle').setAttribute('aria-expanded',String(!form.hidden));});
    el('settings-form').addEventListener('submit',saveSettings);
    el('export-csv').addEventListener('click',()=>{saveCSV(rows);notify('Respaldo privado descargado');});
    el('export-png').addEventListener('click',async()=>{const b=el('export-png');b.disabled=true;try{await exportTalonarioPNG(rows,settings,authorized());notify('Talonario PNG HD descargado');}catch(e){notify(e.message);}finally{b.disabled=false;}});
    window.addEventListener('storage',e=>{if(store.demo&&e.key==='rifa-pastel-numbers-v2'&&!el('dashboard').hidden)refresh().catch(e=>notify(e.message));});
  }catch(e){el('login-view').hidden=false;el('login-error').textContent='No fue posible conectar con la base de datos: '+e.message;notify(e.message);}
}
main();
