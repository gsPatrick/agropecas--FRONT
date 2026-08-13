import { SiWhatsapp } from 'react-icons/si';
import styles from './Icon.module.css';

// Marcas registradas vêm da biblioteca oficial (Simple Icons via react-icons):
// o glifo do WhatsApp é forma cheia e não pode ser redesenhado em contorno.
const brands = {
  whatsapp: SiWhatsapp,
};

const GEAR_TEETH = Array.from({ length: 8 }, (_, i) => i * 45);
const BEARING_BALLS = Array.from({ length: 8 }, (_, i) => {
  const angle = (i * Math.PI * 2) / 8;
  return {
    cx: Number((12 + Math.cos(angle) * 6).toFixed(2)),
    cy: Number((12 + Math.sin(angle) * 6).toFixed(2)),
  };
});
const GRID_DOTS = [7, 12, 17].flatMap((cy) => [7, 12, 17].map((cx) => ({ cx, cy })));

const paths = {
  tractor: (
    <>
      <circle cx="7.6" cy="16.4" r="4.6" />
      <circle cx="7.6" cy="16.4" r="1.7" />
      <circle cx="18" cy="18.2" r="2.8" />
      <circle cx="18" cy="18.2" r="0.9" />
      <path d="M4.4 14.2v-2.7h3.4V7h4.4l1.7 4.5H19v4.3" />
      <path d="M9.4 7V4.4" />
      <path d="M12.1 17.6h3.2" />
    </>
  ),
  store: (
    <>
      <path d="M3.4 5.2h17.2v3.4H3.4z" />
      <path d="M3.4 8.6c.9 1.5 2.5 1.5 3.4 0 .9 1.5 2.5 1.5 3.4 0 .9 1.5 2.5 1.5 3.4 0 .9 1.5 2.5 1.5 3.4 0 .9 1.5 2.5 1.5 3.4 0" />
      <path d="M5.2 10.4V20.4h13.6V10.4" />
      <path d="M9.8 20.4v-5.2h4.4v5.2" />
      <path d="M7.2 12.6h2.2M14.6 12.6h2.2" />
    </>
  ),
  wrench: (
    <>
      <path d="M14.8 3.4a4.6 4.6 0 0 0-5.6 6.2L4 14.8a1.6 1.6 0 0 0 0 2.3l2.9 2.9a1.6 1.6 0 0 0 2.3 0l5.2-5.2a4.6 4.6 0 0 0 6.2-5.6l-3 3-3.2-.6-.6-3.2z" />
    </>
  ),
  search: (
    <>
      <circle cx="10.4" cy="10.4" r="6.2" />
      <path d="M15 15l4.8 4.8" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21.4s6.6-6.9 6.6-11.4a6.6 6.6 0 1 0-13.2 0c0 4.5 6.6 11.4 6.6 11.4z" />
      <circle cx="12" cy="9.8" r="2.4" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="7.1" />
      <circle cx="12" cy="12" r="3.2" />
      {GEAR_TEETH.map((angle) => (
        <rect
          key={angle}
          x="10.9"
          y="1.5"
          width="2.2"
          height="3.2"
          rx="0.7"
          transform={`rotate(${angle} 12 12)`}
        />
      ))}
    </>
  ),
  belt: (
    <>
      <path d="M8.6 8.1h6.6a3.9 3.9 0 0 1 0 7.8H8.6a3.9 3.9 0 0 1 0-7.8z" />
      <circle cx="8.6" cy="12" r="1.4" />
      <circle cx="15.2" cy="12" r="2.3" />
      <circle cx="15.2" cy="12" r="0.8" />
    </>
  ),
  bearing: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3.1" />
      {BEARING_BALLS.map((ball) => (
        <circle key={`${ball.cx}-${ball.cy}`} cx={ball.cx} cy={ball.cy} r="1.25" />
      ))}
    </>
  ),
  filter: (
    <>
      <path d="M8 5.2V3.6h8v1.6" />
      <path d="M6.9 5.2h10.2v13.4a1.8 1.8 0 0 1-1.8 1.8H8.7a1.8 1.8 0 0 1-1.8-1.8z" />
      <path d="M6.9 17.2h10.2" />
      <path d="M10 8.4v6.2M12 8.4v6.2M14 8.4v6.2" />
    </>
  ),
  pump: (
    <>
      <rect x="5.6" y="5.6" width="12.8" height="12.8" rx="2.2" />
      <circle cx="12" cy="12" r="3.6" />
      <circle cx="12" cy="12" r="1.3" />
      <path d="M9.2 5.6V3.8M14.8 5.6V3.8M18.4 9.6h1.9M18.4 14.4h1.9" />
    </>
  ),
  cross: (
    <>
      <path d="M10.4 13.6H7.6v-3.2h2.8V7.6h3.2v2.8h2.8v3.2h-2.8v2.8h-3.2z" />
      <rect x="9.5" y="3.2" width="5" height="3.4" rx="1.3" />
      <rect x="9.5" y="17.4" width="5" height="3.4" rx="1.3" />
      <rect x="3.2" y="9.5" width="3.4" height="5" rx="1.3" />
      <rect x="17.4" y="9.5" width="3.4" height="5" rx="1.3" />
    </>
  ),
  grid: (
    <>
      {GRID_DOTS.map((dot) => (
        <circle key={`${dot.cx}-${dot.cy}`} cx={dot.cx} cy={dot.cy} r="1.15" fill="currentColor" stroke="none" />
      ))}
    </>
  ),
  phone: (
    <>
      <path d="M6 3.5h3l1.5 4-2 1.5a12 12 0 0 0 6.5 6.5l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4 5.7 2 2 0 0 1 6 3.5z" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="M3.5 7l8.5 6 8.5-6" />
    </>
  ),
  'arrow-right': (
    <>
      <path d="M4 12h15M13 6l6 6-6 6" />
    </>
  ),
  'chevron-right': (
    <>
      <path d="M9 5l7 7-7 7" />
    </>
  ),
  check: (
    <>
      <path d="M4.5 12.5l5 5 10-11" />
    </>
  ),
  close: (
    <>
      <path d="M5.5 5.5l13 13M18.5 5.5l-13 13" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3.1" />
    </>
  ),
  'eye-off': (
    <>
      <path d="M9.9 6.1A8.9 8.9 0 0 1 12 5.8c6 0 9.5 6.2 9.5 6.2a17 17 0 0 1-3.3 4" />
      <path d="M6.3 7.9A17.4 17.4 0 0 0 2.5 12S6 18.2 12 18.2c1.4 0 2.6-.3 3.7-.8" />
      <path d="M9.9 9.9a3.1 3.1 0 0 0 4.3 4.3" />
      <path d="M4 4l16 16" />
    </>
  ),
  leaf: (
    <>
      <path d="M20 4C10 4 4 9 4 16v4" />
      <path d="M20 4c0 8-5 12-11 12" />
    </>
  ),

  /* ── PAINEL ─────────────────────────────────────────────
     Traço e proporção iguais aos de cima: 24×24, contorno de 1.6,
     cantos arredondados. Um ícone com peso diferente denuncia o
     remendo antes de qualquer coisa. */

  home: (
    <>
      <path d="M3.6 10.4 12 3.8l8.4 6.6" />
      <path d="M5.6 9v10.4h12.8V9" />
      <path d="M9.8 19.4v-5.6h4.4v5.6" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  heart: (
    <path d="M12 19.6S4 15 4 9.8A3.8 3.8 0 0 1 12 7.6a3.8 3.8 0 0 1 8 2.2c0 5.2-8 9.8-8 9.8Z" />
  ),
  bell: (
    <>
      <path d="M18 9a6 6 0 0 0-12 0c0 5-2 6.4-2 6.4h16S18 14 18 9Z" />
      <path d="M13.7 19a2 2 0 0 1-3.4 0" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.4" r="3.8" />
      <path d="M4.8 20a7.2 7.2 0 0 1 14.4 0" />
    </>
  ),
  logout: (
    <>
      <path d="M15 4.8h3.2A1.8 1.8 0 0 1 20 6.6v10.8a1.8 1.8 0 0 1-1.8 1.8H15" />
      <path d="M10.4 15.6 14 12l-3.6-3.6" />
      <path d="M14 12H4" />
    </>
  ),
  chart: (
    <>
      <path d="M4 19.4h16" />
      <path d="M7.2 19.4V12" />
      <path d="M12 19.4V6.4" />
      <path d="M16.8 19.4v-5.2" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.2" />
      <path d="M12 7.4V12l3.2 2" />
    </>
  ),
  image: (
    <>
      <rect x="3.6" y="5.2" width="16.8" height="13.6" rx="2.2" />
      <circle cx="8.6" cy="10" r="1.4" />
      <path d="M4.6 16.4 9.4 12l3 2.6 2.8-2.2 3.6 3.2" />
    </>
  ),
  menu: (
    <>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </>
  ),
  'chevron-left': <path d="M14.6 6 9 12l5.6 6" />,
  'panel-left': (
    <>
      <rect x="3.4" y="4.6" width="17.2" height="14.8" rx="2.4" />
      <path d="M9.6 4.6v14.8" />
    </>
  ),
  edit: (
    <>
      <path d="M4.6 19.4h4l9.2-9.2a2.1 2.1 0 0 0-3-3L5.6 16.4Z" />
      <path d="M14.4 5.8l3.8 3.8" />
    </>
  ),
  trash: (
    <>
      <path d="M4.6 7h14.8" />
      <path d="M9.4 7V5.4A1.4 1.4 0 0 1 10.8 4h2.4a1.4 1.4 0 0 1 1.4 1.4V7" />
      <path d="M6.6 7l.9 11.2A1.8 1.8 0 0 0 9.3 20h5.4a1.8 1.8 0 0 0 1.8-1.8L17.4 7" />
    </>
  ),
};

export const iconNames = [...Object.keys(paths), ...Object.keys(brands)];

export default function Icon({ name, size = 24, title, className = '', ...rest }) {
  const Brand = brands[name];
  if (Brand) {
    return (
      <Brand
        className={`${styles.root} ${className}`}
        size={size}
        role={title ? 'img' : undefined}
        aria-hidden={title ? undefined : true}
        title={title}
        {...rest}
      />
    );
  }

  const shape = paths[name];
  if (!shape) return null;

  return (
    <svg
      className={`${styles.root} ${className}`}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {shape}
    </svg>
  );
}
