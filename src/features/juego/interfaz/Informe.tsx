import { useState } from 'react'
import { diagnosticar, ESTRATEGIAS, type AnioDelMar, type Diagnostico, type Estrategia, type Informe as DatosInforme, type Mes } from '../logica/cardumen'
import { NOMBRE_ZONA, type ZonaMar } from '../motor/mar'
import { MESES } from './HudCardumen'

const n0 = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 0 })
const n1 = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 1, signDisplay: 'exceptZero' })

// zonas del explorador para el enlace "Ver este año en el explorador"
const ZONA_EXPLORADOR: Partial<Record<ZonaMar, string>> = {
  paita: 'peru_norte_paita_sechura', chimbote: 'peru_centro_norte_chimbote', callao: 'peru_centro_callao', pisco: 'peru_sur_pisco', ilo: 'peru_sur_ilo',
}

type Respuesta = 'nino' | 'suerte' | 'tendencia'
const OPCIONES: { id: Respuesta; texto: string }[] = [
  { id: 'nino', texto: 'El Niño' },
  { id: 'suerte', texto: 'Mala suerte: el mar varía de un año a otro' },
  { id: 'tendencia', texto: 'Una tendencia: el mar empeora poco a poco' },
]

function Fila({ texto, valor, signo }: { texto: string; valor: number; signo?: '-' }) {
  return <div className="fila"><span>{texto}</span><span className="puntos" aria-hidden="true" /><span>{signo}{n0.format(Math.round(valor))}</span></div>
}

/** Diario del científico: qué se observó, qué se sugiere y qué no está demostrado */
function diarioCientifico(d: Diagnostico, a: AnioDelMar): [string, string, string] {
  const comida = `La comida en la costa central (Chimbote y Callao) estuvo al ${Math.round(a.alimentoCentro * 100)} % de lo normal`
  if (d === 'nino') return [
    `${comida}; el índice Niño 1+2 llegó a ${n1.format(a.ninoMax ?? 0)} °C.`,
    'La caída coincidió con El Niño: el agua cálida trae menos nutrientes y el fitoplancton cae.',
    'Que la Antártida haya causado el cambio.',
  ]
  if (d === 'suerte') return [
    `${comida}, sin un Niño fuerte.`,
    'El mar varía de un año a otro aunque no haya El Niño.',
    'Que sea una tendencia: desde 1998 la clorofila frente al Perú no muestra tendencias significativas.',
  ]
  return [
    `${comida}; Niño 1+2 promedio de ${n1.format(a.nino ?? 0)} °C.`,
    'Con agua fría el afloramiento trae nutrientes y el fitoplancton abunda.',
    'Que el año siguiente vaya a ser igual.',
  ]
}

function diarioCardumen(pct: number, d: Diagnostico): string {
  if (d !== 'bueno' && pct >= 0.6) return '«La comida escaseó, pero el cardumen resistió.»'
  if (pct >= 0.7) return '«Este año el mar fue generoso. Las mayores dicen que así era antes.»'
  if (pct >= 0.4) return '«Perdimos a muchos, pero el cardumen sigue unido.»'
  return '«El mar tardó en volver. Somos pocos, pero seguimos nadando.»'
}

const ELEGIBLES: Estrategia['id'][] = ['profundo', 'costero', 'apretado']

/** Informe de la temporada, como el balance nocturno de Papers, Please */
export default function Informe({ datos, historia, mar, siguiente, final, alSeguir, alRepetir, alFinal, alMenu }: {
  datos: DatosInforme; historia: Mes[]; mar: AnioDelMar
  siguiente: { anio: number; peces: number } | null
  /** true si es el último año de la campaña */
  final: boolean
  alSeguir: (estrategia: Estrategia) => void; alRepetir: () => void; alFinal: () => void; alMenu: () => void
}) {
  const [respuesta, setRespuesta] = useState<Respuesta | null>(null)
  const [estrategia, setEstrategia] = useState<Estrategia['id'] | null>(null)
  const diag = diagnosticar(mar)
  const preguntar = diag !== 'bueno'
  const [observado, sugerido, noDemostrado] = diarioCientifico(diag, mar)

  const peor = historia.reduce<{ k: number; m: Mes } | null>((a, m, k) => (!a || m.alimento < a.m.alimento ? { k, m } : a), null)
  const comida = Math.round(datos.alimentoPromedio * 100)
  const enlace = peor ? `/explorer#mes=${datos.anio}-${String(peor.k + 1).padStart(2, '0')}&dato=clorofila&zona=${ZONA_EXPLORADOR[peor.m.zona] ?? ''}&vista=satellite&estilo=bandas` : '/explorer'
  const temporada = datos.mesesTemporada === 0 ? 'sin meses de temporada' : datos.vedas === 0 ? 'normal' : datos.vedas >= datos.mesesTemporada ? 'cancelada' : `recortada (${datos.vedas} de ${datos.mesesTemporada} meses en veda)`
  const titulo = datos.mesesJugados < 12 ? `Informe de ${datos.anio} (enero a ${MESES[datos.mesesJugados - 1]?.toLowerCase()})` : `Informe de la temporada ${datos.anio}`

  return <div className="juego-informe-fondo" role="dialog" aria-modal="true" aria-labelledby="t-informe">
    <article className="juego-informe">
      <h2 id="t-informe">{titulo}</h2>
      <Fila texto="Cardumen inicial" valor={datos.inicial} />
      <Fila texto="Perdidos por hambre" valor={datos.perdidas.hambre} signo="-" />
      <Fila texto="Perdidos por depredadores" valor={datos.perdidas.depredadores} signo="-" />
      <Fila texto="Capturados por la flota" valor={datos.perdidas.flota} signo="-" />
      <Fila texto="Perdidos por falta de oxígeno" valor={datos.perdidas.oxigeno} signo="-" />
      <div className="total"><Fila texto="Sobrevivientes" valor={datos.sobrevivientes} /></div>
      <p>Comida que encontró el cardumen: <b>{comida} % de lo normal</b>.
        {peor && <> El peor mes fue <b>{MESES[peor.k]?.toLowerCase()}</b> en {NOMBRE_ZONA[peor.m.zona]} ({Math.round(peor.m.alimento * 100)} %).</>}
        {' '}Temporada de pesca: <b>{temporada}</b>.</p>
      <p className="cita">{diarioCardumen(datos.sobrevivientes / Math.max(1, datos.inicial), diag)}</p>

      {preguntar && !respuesta && <section className="juego-pregunta" aria-labelledby="t-pregunta">
        <h3 id="t-pregunta">¿Qué explica este año?</h3>
        <div className="opciones">{OPCIONES.map((o) => <button key={o.id} type="button" className="juego-caja" onClick={() => setRespuesta(o.id)}>{o.texto}</button>)}</div>
      </section>}

      {(!preguntar || respuesta) && <section aria-labelledby="t-diario">
        {respuesta && <p className={respuesta === diag ? 'acierto' : 'error'} role="status">
          {respuesta === diag ? '¡Bien visto! ' : 'No exactamente. '}
          {respuesta === 'tendencia' ? 'Un mal año no es una tendencia: hace falta mirar muchos años, y desde 1998 la clorofila frente al Perú no muestra una tendencia significativa.' : ''}
          {diag === 'nino' && respuesta !== 'nino' ? ' Ese año hubo El Niño: el índice Niño 1+2 pasó de +1 °C.' : ''}
          {diag === 'suerte' && respuesta === 'nino' ? ' Ese año no hubo un Niño fuerte: el mar también varía sin El Niño.' : ''}
        </p>}
        <h3 id="t-diario">Diario del científico</h3>
        <table className="juego-diario">
          <tbody>
            <tr><th scope="row">Observado</th><td>{observado}</td></tr>
            <tr><th scope="row">Sugerido</th><td>{sugerido}</td></tr>
            <tr><th scope="row">No demostrado</th><td>{noDemostrado}</td></tr>
          </tbody>
        </table>
      </section>}

      {siguiente && (!preguntar || respuesta) && <section className="juego-estrategias" aria-labelledby="t-estrategia">
        <h3 id="t-estrategia">Estrategia para la generación de {siguiente.anio}</h3>
        <div className="opciones">{ELEGIBLES.map((id) => {
          const e = ESTRATEGIAS[id]
          return <button key={id} type="button" className={`juego-caja${estrategia === id ? ' activo' : ''}`} aria-pressed={estrategia === id} onClick={() => setEstrategia(id)}>
            <b>{e.nombre}</b><span>+ {e.ventaja}</span><span>− {e.costo}</span>
          </button>
        })}</div>
        <p className="nota">No hay una estrategia perfecta: un año cálido favorece a unas y castiga a otras.</p>
      </section>}

      <p className="nota">El mar es real: clorofila satelital (ESA OC-CCI, con satélites de la NASA) y El Niño 1+2 (NOAA); {datos.mesesObservados} de {datos.mesesJugados} meses con clorofila medida. Las cifras del cardumen, los depredadores, las vedas y las estrategias son ilustrativas.</p>
      <div className="acciones">
        {siguiente && <button type="button" className="juego-caja principal" disabled={!estrategia}
          onClick={() => estrategia && alSeguir(ESTRATEGIAS[estrategia])}>Siguiente generación: {siguiente.anio} ({n0.format(siguiente.peces)} peces) →</button>}
        {final && (!preguntar || respuesta) && <button type="button" className="juego-caja principal" onClick={alFinal}>Ver el final →</button>}
        {!siguiente && !final && <button type="button" className="juego-caja principal" onClick={alMenu}>Volver al menú</button>}
        <button type="button" className="juego-caja" onClick={alRepetir}>Repetir {datos.anio}</button>
        <a className="juego-caja" href={enlace}>Ver este año en el explorador</a>
      </div>
    </article>
  </div>
}
