import type { Expediente } from '../logica/escritorio'

/** Herramienta de sellar, no un emoji dependiente del sistema operativo. */
export function IconoSello({ pequeno = false }: { pequeno?: boolean }) {
  return <svg className={`cabina-icono-sello${pequeno ? ' pequeno' : ''}`} viewBox="0 0 32 32" width={pequeno ? 18 : 26} height={pequeno ? 18 : 26} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="M12 5h8v5l-2 3v5h-4v-5l-2-3z" fill="currentColor" />
    <path d="M8 18h16l3 6H5zM5 24h22v4H5zM10 31h12" />
  </svg>
}

function Representante({ tipo }: { tipo: Expediente['tipo'] | undefined }) {
  const chaqueta = tipo === 'solicitud' ? '#697d70' : tipo === 'prensa' ? '#49647d' : '#3e7780'
  return <svg viewBox="0 0 248 122" width={248} height={122} className="cabina-personaje" role="img" aria-label="Representante del puerto esperando frente a la ventanilla">
    <g shapeRendering="crispEdges">
      <path fill="#153647" d="M0 0h248v122H0z" />
      <path fill="#315b66" d="M0 61h248v34H0z" />
      <path fill="#678e92" d="M0 68h38v2H0zm52 9h32v2H52zm120-5h46v2h-46zm29 13h47v2h-47z" />
      <path fill="#283e48" d="M18 41h7v30h-7zm-6 27h30v5H12zm194-33h7v37h-7zm-13 33h36v5h-36z" />
      <path fill="#122936" d="M32 53h28l-8 8H39zM182 56h31l-7 8h-18z" />
      <path fill="#14242e" d="M96 99V65h8V45h8V33h25v8h8v18h8v40z" />
      <path fill="#ae795a" d="M109 45h30v27h-7v6h-18v-6h-5z" />
      <path fill="#cc9a75" d="M109 45h23v25h-18v-5h-5z" />
      <path fill="#2a3841" d="M106 36h31v7h12v5h-47v-5h4z" />
      <path fill="#6d8990" d="M109 36h25v3h-25z" />
      <path fill="#172b37" d="M114 54h3v3h-3zm15 0h3v3h-3z" />
      <path fill="#855b49" d="M120 63h7v2h-7z" />
      <path fill={chaqueta} d="M103 75h13l7 7 8-7h13l11 15v25H92V90z" />
      <path fill="#bdcbbd" d="M116 75h15l-8 10z" />
      <path fill="#293f49" d="M120 86h4v27h-4zm-17 7h11v9h-11zm30 0h11v9h-11z" />
      <path fill="#c6a36d" d="M145 89h18v23h-18z" />
      <path fill="#eadfc6" d="M149 88h18v23h-18z" />
      <path fill="#687a75" d="M152 94h12v2h-12zm0 5h10v2h-10z" />
      <path fill="#b88765" d="M139 106h16v7h-16z" />
      <path fill="#55717b" d="M0 109h248v4H0z" />
      <path fill="#0a202e" d="M0 113h248v9H0z" />
      <path fill="#42616a" d="M0 0h7v113H0zm241 0h7v113h-7zM7 0h234v6H7z" />
    </g>
  </svg>
}

/** La visita espera sin temporizador. Sus documentos siguen siendo los mismos expedientes del juego. */
export default function Cabina({ expediente, revisados, total, entregado = false }: {
  expediente?: Expediente; revisados: number; total: number; entregado?: boolean
}) {
  const rol = expediente?.tipo === 'solicitud' ? 'Representante de la flota'
    : expediente?.tipo === 'prensa' ? 'Mensajero de prensa' : 'Representante técnico'
  return <section className="cabina-ventanilla" aria-label="Ventanilla de la cabina">
    <div className="cabina-vista"><span className="cabina-placa">Cabina del puerto</span><Representante tipo={expediente?.tipo} /></div>
    <div className="cabina-visita">
      <p className="cabina-rotulo">{entregado ? 'Revisión terminada' : 'En la ventanilla'}</p>
      <h3>{entregado ? 'Documentos devueltos' : rol}</h3>
      <p>{entregado ? 'El turno ha concluido. Ya puedes revisar tus decisiones.'
        : expediente ? `${expediente.remitente} espera la revisión de «${expediente.titulo}».` : 'Los expedientes ya tienen sello. Falta cerrar el turno.'}</p>
      <p className="cabina-estado" role="status">{revisados} de {total} expedientes sellados{!entregado && ' · Sin límite de tiempo'}</p>
    </div>
  </section>
}
