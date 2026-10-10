# Rifa Zamir · Talonario digital

Página pública y administración privada de una rifa de **100 números (00–99)**.
Diseño responsivo: azul celeste muy claro, tonos pastel y fucsia para los vendidos.

## Lo que ya incluye

- Página pública con talonario, filtros, números en fucsia al venderse y estadísticas.
- Panel privado para consultar el **número 48**, comprador, celular, abono y notas.
- Estados: **Disponible / Apartado / Por cobrar / Pagado**.
- Selección de uno o varios números (`08, 14, 48`) y edición por lote.
- Emojis decorativos opcionales sobre cada número.
- Fecha de sorteo, premio, valor de boleta, lotería y WhatsApp editables.
- Descarga de **PNG HD 2400 × 2980 px** sin exponer datos personales.
- Respaldo CSV privado, compatible con Excel (separado por punto y coma).
- Demostración sin base de datos mediante `localStorage` (datos solo del navegador).
- Supabase PostgreSQL, autenticación y políticas RLS listas para uso real.

## 1. Probar el diseño sin pagar nada

Abre la carpeta en VS Code, ejecuta una extensión como **Live Server**, o desde una
terminal con Python ejecuta `python -m http.server 8000` dentro de esta carpeta.

Entra a:

- `http://localhost:8000/index.html` (vista pública)
- `http://localhost:8000/admin.html` (panel de administración de demostración)

**Importante:** sin Supabase, el panel funciona solo en `localhost` en modo prueba,
sin contraseña, y los datos quedan únicamente en ese navegador. En GitHub Pages,
sin Supabase, la vista pública es un **boceto no interactivo** y el panel está
deshabilitado para evitar confundir los datos locales con ventas reales. No
registres información personal real en modo demo.
**No basta con publicar la página en GitHub para que exista una base de datos real.**

## 2. Crear base de datos gratuita en Supabase

1. Regístrate en https://supabase.com y crea un proyecto **Free**.
2. Abre **SQL Editor** y ejecuta íntegro `sql/01-esquema.sql`.
3. En **Authentication → Users**, crea una usuaria administradora con correo y contraseña segura. Si aparece la opción, marca el correo como confirmado (solo para una persona administradora de confianza).
4. En `sql/02-habilitar-admin.sql`, cambia `PON_AQUI_CORREO_ADMIN@ejemplo.com` por ese correo y ejecuta el archivo en **SQL Editor**. La consulta final debe mostrar la cuenta autorizada.
5. En **Authentication → Providers → Email**, desactiva el registro público de usuarios cuando no sea necesario. No compartas la contraseña.
6. En **Project Settings → API** (o **Connect → Project API**), copia **Project URL** y **anon/public publishable key**.
7. Abre `config.js` y sustituye `supabaseUrl` y `supabasePublishableKey` con esos valores. Guarda.
8. Prueba `admin.html`. Ahora debe pedir correo y contraseña y guardar los cambios en la nube.

**Seguridad:** La clave publishable/anon se puede mostrar en la web si las políticas RLS
están correctamente configuradas, como en el SQL incluido. **Jamás publiques la clave
`service_role`, `sb_secret` o la contraseña de la cuenta.** Las notas y teléfonos solo son
visibles a una sesión autorizada. GitHub Pages sirve archivos públicos; NO uses GitHub
para guardar una lista con teléfonos y compradores.

## 3. Publicar gratis en GitHub Pages

1. En https://github.com/new crea un repositorio **público** llamado `rifa-zamir` bajo `Zamirpabon`, con rama `main`.
2. Sube el contenido de esta carpeta en la raíz del repositorio (incluidos `index.html`,
   `admin.html`, `styles.css`, `config.js`, `js/` y `sql/`).
3. En GitHub: **Settings → Pages → Build and deployment → Deploy from a branch**.
4. Selecciona **Branch: main**, **Folder: /(root)** y **Save**.
5. Tu dirección quedará similar a:
   `https://zamirpabon.github.io/rifa-zamir/`
6. El acceso privado estará en:
   `https://zamirpabon.github.io/rifa-zamir/admin.html`

Puedes compartir el enlace de **consulta** para mostrar el avance cuando los requisitos
legales de operación estén resueltos. Publicar no significa que ya esté habilitada la
venta. Conserva `publicacionAutorizada: false` mientras se verifica la rifa.

## 4. Editar la rifa

Dentro del panel se pueden actualizar fecha, premio propuesto, valor, lotería,
responsable y WhatsApp. Inicialmente, para la demostración, se configuró:

- Título: Sensacional Rifa.
- Premio propuesto (a validar): **$700.000 COP**.
- Sorteo: **sábado 19 de diciembre de 2026** con Lotería de Boyacá.
- Boleta: **$20.000 COP**.
- Números: **00 al 99** (100 números exactos).
- Teléfono: **por definir**; el campo se puede configurar en el panel.

La pantalla pública muestra `Apartado` si está reservado y `Vendido` si el estado
privado es `Por cobrar` o `Pagado`. No publica nombres, celulares ni deudas.

La fecha se muestra en la web y el botón de contacto deja de estar disponible después
del día del sorteo. Si necesitas **bloquear nuevos registros** automáticamente al
llegar una hora determinada, debes añadir esa regla al procedimiento SQL.

## 5. Respaldo y límites del plan gratis

Haz clic en **Exportar Excel (CSV)** de forma periódica y guarda el archivo en un
lugar privado, fuera del repositorio. En Supabase Free, un proyecto con baja actividad
puede ser pausado; se reanuda desde el panel de Supabase. El servicio gratuito tiene
límites y no implica disponibilidad ilimitada de por vida.

## ⚠ Aviso legal (Colombia)

Este proyecto se entrega en modo **borrador**. Antes de vender o cobrar boletas hay que
verificar con la autoridad competente la autorización de la rifa. Coljuegos recuerda
que las rifas reguladas no pueden ofrecer premios en efectivo, salvo excepciones legales.
Confirma el alcance particular de la actividad y adapta el premio y los términos antes
de habilitar ventas. Consulta la información oficial de la Lotería de Boyacá sobre
permisos de rifas: https://loteriadeboyaca.gov.co/contacto/preguntas-frecuentes/

---

**Para adaptar:** Falta el número de WhatsApp/responsable, y confirmar legalmente
premio y fecha. No hay credenciales ni claves reales incluidas en esta entrega.
