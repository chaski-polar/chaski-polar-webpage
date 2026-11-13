import { useState, type PointerEvent } from 'react'
import type { Entrada } from '../motor/entrada'
import { NOMBRE_ZONA } from '../motor/mar'
import { useHud } from '../escenas/cardumen'
import Medidor from './Medidor'

// Escala ilustrativa de la escena: cada unidad representa unos 10 m.
const METROS = 10, FONDO = 14
export const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const n0 = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 0 })
const n1 = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 1, signDisplay: 'exceptZero' })
const TEXTO_TEMPORADA = { abierta: 'Abierta: salen las bolicheras', veda: 'Veda: la flota no sale', fuera: 'Fuera de temporada' } as const
const TEXTO_ORIGEN = { observado: 'Clorofila medida por satélite', estimado: 'Alimento estimado por temperatura', normal: 'Sin dato: se asume un mes normal' } as const
const limitar = (n: number) => Math.max(0, Math.min(100, n))

/** Lo necesario para sobrevivir permanece visible; el parte científico se consulta a voluntad. */
export default function HudCardumen({ entrada, compacto, alternar }: { entrada: Entrada | null; compacto: boolean; alternar: () => void }) {
  const hud = useHud((s) => s.hud)
  const [parteAbierto, setParteAbierto] = useState(false)
  if (!hud) return null
  const pctComida = Math.round(hud.alimento * 100)
  const supervivencia = hud.inicial > 0 ? hud.peces / hud.inicial : 0
  const profundidad = Math.max(0, Math.round(-hud.y * METROS))
  const limiteOxigeno = Math.max(0, Math.round(-hud.yOxigeno * METROS))
  const alerta = hud.bajoOxigeno ? 'Sin oxígeno. Sube a aguas menos profundas.'
    : hud.energia < 0.25 ? 'Energía baja. Busca las manchas verdes de alimento.' : null
  const tocar = (boton: 'subir' | 'bajar', activo: boolean) => { if (entrada) entrada.botones[boton] = activo }
  const sostener = (e: PointerEvent<HTMLButtonElement>, boton: 'subir' | 'bajar') => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    tocar(boton, true)
  }

  return <>
    <div className="bitacora-hud">
      <section className="bitacora-fecha juego-caja" aria-label="Fecha y zona de la expedición">
        <span className="bitacora-sobretitulo">Bitácora de temporada</span>
        <div><b>{MESES[hud.mes]} {hud.anio}</b><span>{NOMBRE_ZONA[hud.zona]}</span></div>
        <Medidor valor={hud.avanceTemporada} tono="hielo" etiqueta="Avance de la temporada" />
        <div className="bitacora-temporada-extremos"><span>Ene {hud.anio}</span><span>{MESES[hud.mesFin - 1]} {hud.anio}</span></div>
      </section>

      <section className="bitacora-supervivencia juego-caja" aria-label="Estado del cardumen">
        <div className="bitacora-indicadores">
          <div className="bitacora-indicador">
            <span>Cardumen</span><b>{n0.format(hud.peces)} <small>peces</small></b>
            <Medidor valor={supervivencia} tono="hielo" etiqueta="Supervivencia del cardumen" />
            <small>{Math.round(supervivencia * 100)} % de la generación inicial</small>
          </div>
          <div className="bitacora-indicador">
            <span>Energía</span><b>{Math.round(hud.energia * 100)} <small>%</small></b>
            <Medidor valor={hud.energia} tono={hud.energia < 0.25 ? 'alerta' : 'salvia'} etiqueta="Energía del cardumen" />
            <small>{hud.energia < 0.25 ? 'Necesitas alimento' : 'Busca alimento para mantenerla'}</small>
          </div>
        </div>
        <div className="bitacora-profundidad" aria-label={`Profundidad aproximada: ${profundidad} metros; sin oxígeno desde ${limiteOxigeno} metros`}>
          <div className="bitacora-profundidad-titulo"><span>Profundidad</span><b>~{profundidad} m</b></div>
          <div className="bitacora-profundidad-escala" aria-hidden="true">
            <div className="bitacora-profundidad-riel">
              <span className="bitacora-profundidad-zona" style={{ top: `${limitar(-hud.yOxigeno / FONDO * 100)}%` }} />
              <span className="bitacora-profundidad-marca" style={{ top: `${limitar(-hud.y / FONDO * 100)}%` }} />
            </div>
            <div className="bitacora-profundidad-pie"><span>Superficie</span><span>Sin oxígeno desde ~{limiteOxigeno} m</span></div>
          </div>
        </div>
        {alerta && <p className="bitacora-alerta" role="status">{alerta}</p>}
      </section>

      <section className={`bitacora-parte${parteAbierto ? ' abierto' : ''} juego-caja`} aria-label="Parte del mar">
        <button type="button" className="bitacora-parte-boton" aria-expanded={parteAbierto} aria-controls="bitacora-parte-contenido"
          onClick={() => setParteAbierto((a) => !a)}>
          <span><span className="bitacora-sobretitulo">ORBI · {NOMBRE_ZONA[hud.zona]}</span><b>Parte del mar</b></span>
          <span className="bitacora-parte-resumen">{pctComida} % <small>alimento</small></span>
          <span className="bitacora-parte-signo" aria-hidden="true">{parteAbierto ? '−' : '+'}</span>
        </button>
        <div id="bitacora-parte-contenido" className="bitacora-parte-contenido" hidden={!parteAbierto}>
          <p className="bitacora-origen">{TEXTO_ORIGEN[hud.origen]}. El 100 % representa lo normal de este mes.</p>
          <dl className="bitacora-lecturas">
            <div><dt>Alimento</dt><dd className={pctComida < 60 ? 'lectura-alerta' : ''}>{pctComida} %</dd></div>
            <div><dt>Temperatura</dt><dd>{hud.anomaliaTemp == null ? 'Sin dato' : `${n1.format(hud.anomaliaTemp)} °C`}</dd></div>
            <div><dt>Niño 1+2</dt><dd>{hud.nino12 == null ? 'Sin dato' : `${n1.format(hud.nino12)} °C`}</dd></div>
          </dl>
          <p className="bitacora-temporada"><b>Pesca</b> {TEXTO_TEMPORADA[hud.temporada]}</p>
          <div className="bitacora-radar" aria-label="Alimento por zona este mes">
            <span className="bitacora-sobretitulo">Dónde hay alimento</span>
            {hud.radar.map((r) => <div key={r.zona} className={`bitacora-radar-fila${r.zona === hud.zona ? ' aqui' : ''}`}>
              <span>{NOMBRE_ZONA[r.zona]}{r.zona === hud.zona && <small> · aquí</small>}</span>
              <span className="bitacora-radar-pista" aria-hidden="true"><span style={{ width: `${limitar(r.alimento * 50)}%` }} /></span>
              <b>{Math.round(r.alimento * 100)} %</b>
            </div>)}
          </div>
          <p className="bitacora-origen">Temperatura y Niño 1+2: diferencia frente a lo normal.</p>
        </div>
      </section>
    </div>

    <div className="bitacora-acciones" aria-label="Acciones del cardumen">
      <button type="button" className="juego-caja bitacora-impulso" disabled={hud.impulsoEspera > 0 || !entrada}
        onClick={() => entrada?.pedirImpulso()} style={{ ['--carga' as string]: `${limitar((1 - hud.impulsoEspera) * 100)}%` }}>
        <b>{hud.impulsoEspera > 0 ? 'Recargando' : 'Impulso'}</b><kbd>Shift</kbd>
      </button>
      <button type="button" className={`juego-caja${compacto ? ' activo' : ''}`} onClick={alternar} aria-pressed={compacto}>
        <b>{compacto ? 'Compacto' : 'Disperso'}</b><kbd>F</kbd>
      </button>
      <button type="button" className="juego-caja bitacora-tactil" aria-label="Mantener para subir"
        onPointerDown={(e) => sostener(e, 'subir')} onPointerUp={() => tocar('subir', false)}
        onPointerCancel={() => tocar('subir', false)} onLostPointerCapture={() => tocar('subir', false)}>↑ Subir</button>
      <button type="button" className="juego-caja bitacora-tactil" aria-label="Mantener para bajar"
        onPointerDown={(e) => sostener(e, 'bajar')} onPointerUp={() => tocar('bajar', false)}
        onPointerCancel={() => tocar('bajar', false)} onLostPointerCapture={() => tocar('bajar', false)}>↓ Bajar</button>
    </div>
  </>
}
