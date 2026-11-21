// components/Iconos.jsx
// Iconos SVG inline compartidos por toda la app (sin librería de iconos).
// Heredan el color del texto (currentColor), así que se adaptan solos al tema y al estado
// (activo, hover, error). Todos llevan aria-hidden="true": van siempre junto a un texto o dentro
// de un botón con title/aria-label, por lo que un lector de pantalla no necesita leerlos.

// ─── Acciones (14×14) ───
export const IcoEdit = () => (
  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5z"/>
  </svg>
);
export const IcoTrash = () => (
  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3.5h10M5 3.5V2h4v1.5M4 3.5l.667 8h4.666L10 3.5H4z"/>
  </svg>
);
export const IcoEye = () => (
  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"/>
    <circle cx="8" cy="8" r="2"/>
  </svg>
);
export const IcoEyeOff = () => (
  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 6.5C13 6.5 11.5 10 8 10c-3.5 0-5-3.5-5-3.5M2 2l12 12"/>
    <path d="M6.5 6.6A2 2 0 009.4 9.5"/>
  </svg>
);
export const IcoCheck = () => (
  <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 6l3 3 5-5"/>
  </svg>
);
export const IcoWarning = () => (
  <svg aria-hidden="true" width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6.5 1L12 11H1L6.5 1z"/>
    <path d="M6.5 5v3M6.5 9.5v.5"/>
  </svg>
);
export const IcoSend = () => (
  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2L2 7l5 2 2 5 5-12z"/>
  </svg>
);

// Punto de color semántico: reemplaza al emoji en los labels de las cards
export const Dot = ({ color }) => (
  <span aria-hidden="true" style={{display:"inline-block",width:6,height:6,borderRadius:"50%",background:color,marginRight:6,verticalAlign:"middle"}}/>
);

// ─── Navegación del sidebar (16×16) ───
export const IcoDashboard = () => (
  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/>
    <rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/>
  </svg>
);
export const IcoIngresos = () => (
  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 12V4M4 8l4-4 4 4"/>
  </svg>
);
export const IcoGastos = () => (
  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 4v8M4 8l4 4 4-4"/>
  </svg>
);
export const IcoPresupuesto = () => (
  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="8" r="6"/><path d="M8 5v3l2 2"/>
  </svg>
);
export const IcoResumen = () => (
  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12l3-4 3 2 3-5 3 3"/>
  </svg>
);
export const IcoUSD = () => (
  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 2v12M5.5 4.5h4a2 2 0 010 4h-3a2 2 0 000 4H11"/>
  </svg>
);
export const IcoAsistente = () => (
  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 10V6a6 6 0 1112 0v4"/><path d="M1 10h3v3H1zM12 10h3v3h-3z"/>
  </svg>
);
export const IcoSalir = () => (
  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M10 11l3-3-3-3M13 8H6"/>
  </svg>
);

// ─── Toggle de tema (14×14) ───
export const IcoSol = () => (
  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="7" cy="7" r="2.5"/>
    <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.9 2.9l1 1M10.1 10.1l1 1M10.1 2.9l-1 1M2.9 10.1l1-1"/>
  </svg>
);
// Media luna en viewBox 24 (el trazo de la lista original se dibujaba como un garabato). Con
// strokeWidth 2.57 en este viewBox el grosor equivale a 1.5 en un viewBox de 14, igual que el sol.
export const IcoLuna = () => (
  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.57" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

// ─── Avatares del Asistente (20×20) ───
export const AvatarIA = () => (
  <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="6" width="14" height="10" rx="2"/>
    <path d="M7 6V4a3 3 0 016 0v2"/><circle cx="7.5" cy="11" r="1"/><circle cx="12.5" cy="11" r="1"/>
    <path d="M7.5 14h5"/>
  </svg>
);
export const AvatarUser = () => (
  <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10" cy="7" r="3"/><path d="M3 18a7 7 0 0114 0"/>
  </svg>
);

// ─── Tipos de movimiento en Ahorros USD (14×14) ───
export const IcoDeposito = () => (
  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 2v10M3 8l4 4 4-4"/>
  </svg>
);
export const IcoRetiro = () => (
  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 12V2M3 6l4-4 4 4"/>
  </svg>
);
export const IcoAjuste = () => (
  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 1v12M1 7h12"/>
  </svg>
);
