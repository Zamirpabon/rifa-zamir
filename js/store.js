const cfg = () => window.RIFA_CONFIG || {};
const K_NUMBERS = 'rifa-pastel-numbers-v2';
const K_SETTINGS = 'rifa-pastel-settings-v2';

export const allNumbers = () => Array.from({length:100}, (_,i) => String(i).padStart(2,'0'));
export const isConfigured = () => {
  const c = cfg();
  return /^https:\/\/[\w-]+\.supabase\.co\/?$/.test(c.supabaseUrl || '') &&
    c.supabasePublishableKey && !c.supabasePublishableKey.includes('PON_AQUI');
};
export const asNumber = (raw) => {
  const v=String(raw??'').trim();
  if(!/^\d{1,2}$/.test(v))return null;
  const n=Number(v);
  return n>=0&&n<=99?String(n).padStart(2,'0'):null;
};
export const settingsDefaults = () => ({...cfg().defaults});

function sampleNumbers(){return allNumbers().map(number=>({number,status:'disponible',emoji:'',updated_at:null,buyer_name:'',buyer_phone:'',amount_paid:0,notes:''}));}
function readLocal(k,fallback){try{let val=JSON.parse(localStorage.getItem(k));return val??fallback;}catch{return fallback;}}
function demoNumbers(){const old=readLocal(K_NUMBERS,null);return Array.isArray(old)&&old.length===100?old:sampleNumbers();}
function demoSettings(){return {...settingsDefaults(),...readLocal(K_SETTINGS,{})};}
function errText(err){return err?.message || 'No se pudo completar la operación';}

export async function getStore(){
  if(!isConfigured()){
    // En GitHub Pages solo se muestra una vista previa: nunca se presentan datos
    // guardados en el navegador como si fueran registros oficiales.
    const localDemo = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    return {
      demo:true, preview:!localDemo,
      async publicList(){return (localDemo?demoNumbers():sampleNumbers()).map(({number,status,emoji,updated_at})=>({number,status,emoji,updated_at}));},
      async adminList(){if(!localDemo)throw Error('Panel deshabilitado hasta conectar la base de datos.');return demoNumbers();},
      async getSettings(){return demoSettings();},
      async getCurrentAdmin(){return localDemo;},
      async login(){if(!localDemo)throw Error('Primero conecta la base de datos.');return true;},
      async logout(){return true;},
      async saveMany(numbers,data){
        if(!localDemo)throw Error('Modo demostración no editable en internet.');
        if(!numbers.length)throw Error('Selecciona un número');
        const next=demoNumbers();
        numbers.forEach(number=>{const item=next.find(x=>x.number===number);if(!item)return;
          Object.assign(item,{status:data.status,emoji:data.emoji||'',updated_at:new Date().toISOString()});
          if(data.status==='disponible')Object.assign(item,{buyer_name:'',buyer_phone:'',amount_paid:0,notes:''});
          else Object.assign(item,{buyer_name:data.buyer_name||'',buyer_phone:data.buyer_phone||'',amount_paid:data.amount_paid||0,notes:data.notes||''});
        });
        localStorage.setItem(K_NUMBERS,JSON.stringify(next));
        return next;
      },
      async saveSettings(next){if(!localDemo)throw Error('Modo demostración no editable en internet.');const s={...demoSettings(),...next};localStorage.setItem(K_SETTINGS,JSON.stringify(s));return s;}
    };
  }
  const {createClient} = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  const c=cfg();
  const supabase=createClient(c.supabaseUrl,c.supabasePublishableKey,{auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:false}});
  async function check(res){if(res.error)throw Error(errText(res.error));return res.data;}
  const authCheck=async()=>{
    const {data:{user},error}=await supabase.auth.getUser();
    if(error||!user)return false;
    const {data, error:e}=await supabase.from('raffle_admins').select('user_id').eq('user_id',user.id).maybeSingle();
    if(e)throw Error(errText(e));
    return Boolean(data);
  };
  return {
    demo:false,
    async publicList(){return check(await supabase.from('raffle_numbers').select('number,status,emoji,updated_at').order('number'));},
    async adminList(){
      const [slots,buyers]=await Promise.all([
        check(await supabase.from('raffle_numbers').select('number,status,emoji,updated_at').order('number')),
        check(await supabase.from('raffle_buyers').select('number,buyer_name,buyer_phone,amount_paid,notes'))
      ]);
      const byId=new Map(buyers.map(p=>[p.number,p]));
      return slots.map(n=>({...n,buyer_name:'',buyer_phone:'',amount_paid:0,notes:'',...(byId.get(n.number)||{})}));
    },
    async getSettings(){const s=await check(await supabase.from('raffle_settings').select('title,subtitle,prize,draw_date,lottery,ticket_price,organizer,whatsapp').eq('id',1).single());return {...settingsDefaults(),...s};},
    getCurrentAdmin:authCheck,
    async login(email,password){await check(await supabase.auth.signInWithPassword({email,password}));if(!await authCheck()){await supabase.auth.signOut();throw Error('Esta cuenta no tiene permiso de administración.');}return true;},
    async logout(){await check(await supabase.auth.signOut());},
    async saveMany(numbers,data){return check(await supabase.rpc('save_raffle_numbers',{p_numbers:numbers,p_status:data.status,p_buyer_name:data.buyer_name||'',p_buyer_phone:data.buyer_phone||'',p_amount_paid:data.amount_paid||0,p_emoji:data.emoji||'',p_notes:data.notes||''}));},
    async saveSettings(input){return check(await supabase.from('raffle_settings').update(input).eq('id',1).select('title,subtitle,prize,draw_date,lottery,ticket_price,organizer,whatsapp').single());}
  };
}
