/**
 * Paso final: pega aquí URL y anon/publishable key del proyecto de Supabase.
 * NUNCA agregues una service_role key: GitHub Pages publica este archivo.
 */
window.RIFA_CONFIG = {
  supabaseUrl: 'PON_AQUI_TU_SUPABASE_URL',
  supabasePublishableKey: 'PON_AQUI_TU_PUBLISHABLE_O_ANON_KEY',
  publicacionAutorizada: false,
  defaults: {
    title: 'Sensacional Rifa',
    subtitle: 'Una noble causa, una gran ilusión',
    prize: '$700.000',
    draw_date: '2026-12-19',
    lottery: 'Lotería de Boyacá',
    ticket_price: 20000,
    organizer: 'Organización de la rifa',
    whatsapp: ''
  }
};
