import type { Entrada } from '../motor/entrada'
import { NOMBRE_ZONA } from '../motor/mar'
import { useHud } from '../escenas/cardumen'

// cada unidad de la escena equivale a unos 10 m; el fondo está a 14 unidades
const METROS = 10, FONDO = 14

export const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const n0 = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 0 })
const n1 = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 1, signDisplay: 'exceptZero' })

const TEXTO_TEMPORADA = { abierta: 'temporada abierta: salen las bolicheras', veda: 'veda: la flota no sale', fuera: 'fuera de temporada' } as const
const TEXTO_ORIGEN = { observado: 'medida por satélite', estimado: 'estimada por la temperatura', normal: 'sin dato: se asume normal' } as const

function Barra({ valor, color, etiqueta }: { valor: number; color: string; etiqueta: string }) {
  return <div className="juego-barra" role="meter" aria-label={etiqueta} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(valor * 100)}>
    <div style={{ width: `${Math.max(0, Math.min(1, valor)) * 100}%`, background: color }} />
  </div>
}

/** Datos del mes y estado del cardumen, más los botones táctiles */
export default function HudCardumen({ entrada, compacto, alternar }: { entrada: Entrada | null; compacto: boolean; alternar: () => void }) {
  const hud = useHud((s) => s.hud)
  if (!hud) return null
  const pctComida = Math.round(hud.alimento * 100)
  const tocar = (boton: 'subir' | 'bajar', activo: boolean) => { if (entrada) entrada.botones[boton] = activo }

  return <>
    <div className="juego-profundidad" aria-label={`Profundidad: ${Math.round(-hud.y * METROS)} metros; la zona sin oxígeno empieza a ${Math.round(-hud.yOxigeno * METROS)} metros`}>
      <span className="etiqueta">0 m</span>
      <div className="riel">
        <div className="sin-oxigeno" style={{ top: `${(-hud.yOxigeno / FONDO) * 100}%` }}><span>sin oxígeno</span></div>
        <div className="anchi" style={{ top: `${(-hud.y / FONDO) * 100}%` }}><span>{Math.round(-hud.y * METROS)} m</span></div>
      </div>
      <span className="etiqueta">{Math.round(FONDO * METROS)} m</span>
    </div>
    <div className="juego-fecha juego-caja">
      <b>{MESES[hud.mes]} {hud.anio}</b> · {NOMBRE_ZONA[hud.zona]}
      <Barra valor={hud.avanceMes} color="#a3bccb" etiqueta="Avance del mes" />
    </div>

    <div className="juego-estado-cardumen juego-caja">
      <div>Cardumen <b>{n0.format(hud.peces)}</b> <small>({Math.round((hud.peces / hud.inicial) * 100)} %)</small></div>
      <Barra valor={hud.peces / hud.inicial} color="#63cde8" etiqueta="Tamaño del cardumen" />
      <div>Energía</div>
      <Barra valor={hud.energia} color={hud.energia < 0.25 ? '#d1495b' : '#3fc28c'} etiqueta="Energía" />
      {hud.energia < 0.25 && <div className="juego-alerta">¡Hambre! Busca fitoplancton</div>}
      {hud.bajoOxigeno && <div className="juego-alerta">¡Sin oxígeno! Sube</div>}
    </div>

    <div className="juego-mar juego-caja">
      <b>El mar en {NOMBRE_ZONA[hud.zona]}</b>
      <div className={pctComida < 60 ? 'malo' : pctComida > 120 ? 'bueno' : ''}>Comida: {pctComida} % de lo normal <small>({TEXTO_ORIGEN[hud.origen]})</small></div>
      {hud.anomaliaTemp != null && <div>Temperatura: {n1.format(hud.anomaliaTemp)} °C frente a lo normal</div>}
      {hud.nino12 != null && <div className={hud.nino12 >= 1 ? 'malo' : ''}>Niño 1+2: {n1.format(hud.nino12)} °C{hud.nino12 >= 1 ? ' · El Niño' : ''}</div>}
      <div>Pesca: {TEXTO_TEMPORADA[hud.temporada]}</div>
      <div className="juego-radar" aria-label="Radar de ORBI: comida de cada zona este mes">
        <span className="juego-radar-titulo">Radar de ORBI · comida por zona</span>
        {hud.radar.map((r) => <div key={r.zona} className={`fila${r.zona === hud.zona ? ' aqui' : ''}`}>
          <span>{NOMBRE_ZONA[r.zona]}</span>
          <span className="pista"><span style={{ width: `${Math.min(100, r.alimento * 50)}%`, background: r.alimento < 0.6 ? '#ff9b85' : r.alimento > 1.2 ? '#3fc28c' : '#63cde8' }} /></span>
          <b>{Math.round(r.alimento * 100)} %</b>
        </div>)}
      </div>
    </div>

    <div className="juego-botones">
      <button type="button" className="juego-caja juego-impulso" disabled={hud.impulsoEspera > 0} onClick={() => entrada?.pedirImpulso()}
        style={{ ['--carga' as string]: `${(1 - hud.impulsoEspera) * 100}%` }}>Impulso <small>(Shift)</small></button>
      <button type="button" className={`juego-caja${compacto ? ' activo' : ''}`} onClick={alternar} aria-pressed={compacto}>
        {compacto ? 'Compacto' : 'Disperso'} <small>(F)</small>
      </button>
      <button type="button" className="juego-caja solo-tactil" aria-label="Subir"
        onPointerDown={() => tocar('subir', true)} onPointerUp={() => tocar('subir', false)} onPointerLeave={() => tocar('subir', false)}>▲</button>
      <button type="button" className="juego-caja solo-tactil" aria-label="Bajar"
        onPointerDown={() => tocar('bajar', true)} onPointerUp={() => tocar('bajar', false)} onPointerLeave={() => tocar('bajar', false)}>▼</button>
    </div>
  </>
}
