import type { EstadoLumi } from '../escenas/lumi'
import { DIVISIONES_META } from '../escenas/lumi'
import type { EstadoNara } from '../escenas/nara'
import { META_KIRI } from '../guion'

function Barra({ valor, color, etiqueta }: { valor: number; color: string; etiqueta: string }) {
  return <div className="juego-barra" role="meter" aria-label={etiqueta} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(valor * 100)}>
    <div style={{ width: `${Math.max(0, Math.min(1, valor)) * 100}%`, background: color }} />
  </div>
}

export function HudLumi({ e }: { e: EstadoLumi | null }) {
  if (!e) return null
  return <div className="juego-estado-cardumen juego-caja">
    <div>Lumi se dividió <b>{e.divisiones} de {DIVISIONES_META}</b></div>
    <div>Luz</div><Barra valor={e.luz} color="#f2c14e" etiqueta="Luz" />
    <div>Nutrientes</div><Barra valor={e.nutrientes} color="#5ab4e5" etiqueta="Nutrientes" />
    <div>Crecimiento</div><Barra valor={e.crecimiento} color="#3fae6b" etiqueta="Crecimiento" />
    {e.bajoHielo && <div className="juego-alerta">Bajo el hielo casi no hay luz</div>}
    {e.nutrientes <= 0 && <div className="juego-alerta">Sin nutrientes: baja a buscar chispas azules</div>}
  </div>
}

export function HudKiri({ comidos }: { comidos: number }) {
  return <div className="juego-contador juego-caja" aria-live="polite">Kiri comió: {comidos} de {META_KIRI}</div>
}

const NOMBRE_CORRIENTE = { circumpolar: 'Corriente Circumpolar (al este)', humboldt: 'Corriente de Humboldt (al norte)' } as const

export function HudNara({ e }: { e: EstadoNara | null }) {
  if (!e) return null
  const grados = (x: number, pos: string, neg: string) => `${Math.abs(x).toFixed(0)}° ${x >= 0 ? pos : neg}`
  return <div className="juego-estado-cardumen juego-caja">
    <div>Grasa de Nara</div><Barra valor={e.grasa} color={e.grasa < 0.25 ? '#d1495b' : '#e3a33b'} etiqueta="Grasa" />
    <div>Viaje</div><Barra valor={e.avance} color="#3d7f97" etiqueta="Avance del viaje" />
    <div><small>{grados(e.lat, 'N', 'S')}, {grados(e.lon, 'E', 'O')}</small></div>
    {e.corriente && <div><b>{NOMBRE_CORRIENTE[e.corriente]}</b></div>}
  </div>
}
