import type { EstadoLumi } from '../escenas/lumi'
import { DIVISIONES_META } from '../escenas/lumi'
import type { EstadoNara } from '../escenas/nara'
import { META_KIRI } from '../guion'
import Medidor from './Medidor'

export function HudLumi({ e }: { e: EstadoLumi | null }) {
  if (!e) return null
  return <section className="bitacora-prologo juego-caja" aria-label="Estado y objetivo de Lumi">
    <span className="bitacora-sobretitulo">01 · La vida empieza aquí</span>
    <h2>Lumi <span>{e.divisiones} / {DIVISIONES_META} divisiones</span></h2>
    <p className="bitacora-objetivo">Recoge nutrientes y vuelve a la luz.</p>
    <div className="bitacora-recurso"><span>Luz</span><Medidor valor={e.luz} tono="ambar" etiqueta="Luz disponible" /></div>
    <div className="bitacora-recurso"><span>Nutrientes</span><Medidor valor={e.nutrientes} tono="hielo" etiqueta="Nutrientes de Lumi" /></div>
    <div className="bitacora-recurso"><span>Crecimiento</span><Medidor valor={e.crecimiento} etiqueta="Crecimiento de Lumi" /></div>
    {(e.nutrientes <= 0 || e.bajoHielo) && <p className="bitacora-alerta" role="status">{e.nutrientes <= 0 ? 'Baja a buscar las chispas azules.' : 'Busca un claro: el hielo tapa la luz.'}</p>}
  </section>
}

export function HudKiri({ comidos }: { comidos: number }) {
  return <section className="bitacora-prologo juego-caja" aria-label="Objetivo de Kiri">
    <span className="bitacora-sobretitulo">02 · La cadena de la vida</span>
    <h2>Kiri <span>{comidos} / {META_KIRI} alimentos</span></h2>
    <p className="bitacora-objetivo">Come las manchas verdes. Esquiva a los pingüinos.</p>
    <Medidor valor={comidos / META_KIRI} etiqueta="Alimentos recogidos por Kiri" />
  </section>
}

const NOMBRE_CORRIENTE = { circumpolar: 'Circumpolar · hacia el este', humboldt: 'Humboldt · hacia el norte' } as const

export function HudNara({ e }: { e: EstadoNara | null }) {
  if (!e) return null
  const grados = (x: number, pos: string, neg: string) => `${Math.abs(x).toFixed(0)}° ${x >= 0 ? pos : neg}`
  return <section className="bitacora-prologo juego-caja" aria-label="Estado y objetivo de Nara">
    <span className="bitacora-sobretitulo">03 · Un viaje hacia el norte</span>
    <h2>Nara <span>{Math.round(e.avance * 100)} % del viaje</span></h2>
    <p className="bitacora-objetivo">Llega al anillo frente a Piura. Aprovecha las corrientes.</p>
    <div className="bitacora-recurso"><span>Reserva de grasa</span><Medidor valor={e.grasa} tono={e.grasa < 0.25 ? 'alerta' : 'ambar'} etiqueta="Reserva de grasa de Nara" /></div>
    <div className="bitacora-recurso"><span>Recorrido</span><Medidor valor={e.avance} tono="hielo" etiqueta="Avance del viaje" /></div>
    <p className="bitacora-coordenadas">{grados(e.lat, 'N', 'S')} · {grados(e.lon, 'E', 'O')}{e.corriente && <span>{NOMBRE_CORRIENTE[e.corriente]}</span>}</p>
  </section>
}
