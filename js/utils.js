export const el=id=>document.getElementById(id);
export const peso=(n=0)=>new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(Number(n)||0).replace(/\s/g,'');
export const datePretty=(raw)=>{
  if(!/^\d{4}-\d{2}-\d{2}$/.test(raw||''))return raw||'Por confirmar';
  const [y,m,d]=raw.split('-').map(Number);
  const date=new Date(y,m-1,d,12,0,0);
  return new Intl.DateTimeFormat('es-CO',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(date);
};
export const sold=s=>s==='pendiente'||s==='pagado';
export const publicState=s=>s==='apartado'?'Apartado':sold(s)?'Vendido':'Disponible';
export const counts=rows=>({free:rows.filter(x=>x.status==='disponible').length,held:rows.filter(x=>x.status==='apartado').length,pending:rows.filter(x=>x.status==='pendiente').length,paid:rows.filter(x=>x.status==='pagado').length});
export const contactNumber=s=>String(s||'').replace(/\D/g,'');
export function notify(message){const node=el('toast');node.textContent=message;node.classList.add('show');clearTimeout(notify.timer);notify.timer=setTimeout(()=>node.classList.remove('show'),3500);}
export function safeText(str){return String(str??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));}
export function downloadBlob(blob,name){const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
export function saveCSV(rows){const head=['Número','Estado','Comprador','Celular','Abonado COP','Observaciones'];const body=rows.map(r=>[r.number,r.status,r.buyer_name,r.buyer_phone,r.amount_paid,r.notes]);const quote=v=>'"'+String(v??'').replace(/"/g,'""')+'"';const csv='\ufeff'+[head,...body].map(line=>line.map(quote).join(';')).join('\r\n');downloadBlob(new Blob([csv],{type:'text/csv;charset=utf-8'}),'rifa-respaldo-privado.csv');}

export async function exportTalonarioPNG(rows,settings,authorized=false){
  await document.fonts?.ready;
  const width=2400,height=2980,canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const cx=canvas.getContext('2d');
  const fill=(color,x,y,w,h)=>{cx.fillStyle=color;cx.fillRect(x,y,w,h);};
  function rounded(x,y,w,h,r,color,stroke=null){cx.beginPath();cx.roundRect(x,y,w,h,r);cx.fillStyle=color;cx.fill();if(stroke){cx.lineWidth=2;cx.strokeStyle=stroke;cx.stroke();}}
  function write(str,x,y,size,color,weight='700',align='left',family='DM Sans, Arial'){cx.textAlign=align;cx.textBaseline='middle';cx.fillStyle=color;cx.font=`${weight} ${size}px ${family}`;cx.fillText(str,x,y);}
  fill('#eaf6fb',0,0,width,height);
  rounded(95,72,2210,370,42,'#fff');
  write('✳   UNA NOBLE CAUSA · UNA GRAN ILUSIÓN',165,135,28,'#d04a91','700');
  const headline=settings.title||'Sensacional Rifa';
  write(headline,160,230,112,'#28334b','700','left','Fraunces, Georgia');
  write('Cada número cuenta ♡',165,337,37,'#8794a5','500');
  rounded(1610,125,596,250,31,'#ffe4f0');
  write('PREMIO PROPUESTO',1670,182,27,'#ac6d96','700');
  write(settings.prize||'$700.000',1670,255,79,'#d93989','800');
  write(`Sorteo: ${datePretty(settings.draw_date)}`,120,530,47,'#28334b','800');
  write(settings.lottery||'Lotería de Boyacá',120,595,36,'#7a8a9e','600');
  write(`Boleta: ${peso(settings.ticket_price)}`,2280,552,48,'#d13d8a','800','right');
  write('DEL 00 AL 99  ·  ELIGE TU NÚMERO',120,688,32,'#a45b89','800');
  const gx=120,gy=746,gap=13,cw=(2160-9*gap)/10,ch=167;
  const map=new Map(rows.map(x=>[x.number,x]));
  for(let i=0;i<100;i++){
    const number=String(i).padStart(2,'0'),item=map.get(number)||{status:'disponible',emoji:''};
    const x=gx+(i%10)*(cw+gap),y=gy+Math.floor(i/10)*(ch+gap);
    const colors={disponible:['#f8fcff','#536d86','#dce7ee'],apartado:['#eee6ff','#9478b5','#ddcbf7'],pendiente:['#ec7bb3','#ffffff','#ec7bb3'],pagado:['#da388a','#ffffff','#da388a']};
    const [background,text,border]=colors[item.status]||colors.disponible;
    rounded(x,y,cw,ch,21,background,border);
    write(number,x+cw/2,y+ch/2+2,75,text,'800','center');
    if(item.emoji){write(item.emoji,x+cw-13,y+22,34,'#dd3e91','700','right','Arial');}
  }
  const c=counts(rows),soldCount=c.paid+c.pending;
  rounded(120,2614,2160,208,27,'#fff');
  write(`Disponibles: ${c.free}`,176,2689,44,'#566b82','800');
  write(`Apartados: ${c.held}`,775,2689,44,'#8867a5','800');
  write(`Vendidos: ${soldCount}`,1370,2689,44,'#d13a88','800');
  write('♥',2190,2689,65,'#dc388d','700','right');
  const foot=authorized?`Información: ${settings.organizer||'Organización'}${settings.whatsapp?' · '+settings.whatsapp:''}`:'BOCETO · SIN VENTAS HABILITADAS · VALIDAR AUTORIZACIÓN Y PREMIO';
  write(foot,120,2889,32,'#7d91a2','700');
  return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(downloadBlob(b,'talonario-rifa-HD.png')):reject(Error('No se pudo crear el archivo PNG')),'image/png'));
}
