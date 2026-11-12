import { ESTRATEGIAS, type Estrategia } from '../logica/cardumen'

const n0 = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 0 })

export interface ResultadoAnio { anio: number; inicial: number; sobrevivientes: number; estrategia: Estrategia['id'] }

/** Lo que el jugador aprendió sin tutoriales (propuesta del juego, sección 6) */
const APRENDIZAJES = [
  'El Niño golpea fuerte y la recuperación es lenta: el calor resta mucho fitoplancton y el frío devuelve poco.',
  'No toda la costa sufre igual: Chimbote y Callao son los más frágiles; Paita casi no cambia.',
  'La vida une la Antártida y el Perú por los animales que migran, pero cada mar tiene su propio motor.',
  'Que dos cosas pasen juntas no prueba que una cause la otra.',
  'La pesca también es una presión sobre el cardumen.',
]

/** Cierre de la campaña: resumen de cada generación y lo aprendido */
export default function Final({ resultados, alRepetir, alMenu }: { resultados: ResultadoAnio[]; alRepetir: () => void; alMenu: () => void }) {
  return <div className="juego-informe-fondo" role="dialog" aria-modal="true" aria-labelledby="t-final">
    <article className="juego-informe">
      <h2 id="t-final">La saga del cardumen</h2>
      <table className="juego-diario">
        <thead><tr><th scope="col">Año</th><th scope="col">Inicial</th><th scope="col">Sobrevivientes</th><th scope="col">Estrategia</th></tr></thead>
        <tbody>{resultados.map((r) => <tr key={r.anio}>
          <th scope="row">{r.anio}</th><td>{n0.format(r.inicial)}</td><td>{n0.format(r.sobrevivientes)}</td><td>{r.estrategia === 'ninguna' ? '—' : ESTRATEGIAS[r.estrategia].nombre}</td>
        </tr>)}</tbody>
      </table>
      <h3>Lo que muestran los datos</h3>
      <ul className="juego-aprendizajes">{APRENDIZAJES.map((a) => <li key={a}>{a}</li>)}</ul>
      <p><b>Esta historia aún no termina: los satélites siguen midiendo.</b></p>
      <div className="acciones">
        <a className="juego-caja principal" href="/explorer#tema=nino2026&vista=satellite">Ver El Niño 2026 en el explorador</a>
        <button type="button" className="juego-caja" onClick={alRepetir}>Jugar otra vez</button>
        <button type="button" className="juego-caja" onClick={alMenu}>Menú</button>
      </div>
    </article>
  </div>
}
