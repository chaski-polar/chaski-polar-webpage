import type { Informe as DatosInforme, Mes } from '../logica/cardumen'
import { NOMBRE_ZONA, type ZonaMar } from '../motor/mar'
import { MESES } from './HudCardumen'

const n0 = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 0 })

// zonas del explorador para el enlace "Ver este año en el explorador"
const ZONA_EXPLORADOR: Partial<Record<ZonaMar, string>> = {
  paita: 'peru_norte_paita_sechura', chimbote: 'peru_centro_norte_chimbote', callao: 'peru_centro_callao', pisco: 'peru_sur_pisco', ilo: 'peru_sur_ilo',
}

function Fila({ texto, valor, signo }: { texto: string; valor: number; signo?: '-' }) {
  return <div className="fila"><span>{texto}</span><span className="puntos" aria-hidden="true" /><span>{signo}{n0.format(Math.round(valor))}</span></div>
}

/** Informe de la temporada, como el balance nocturno de Papers, Please */
export default function Informe({ datos, historia, siguiente, alSeguir, alRepetir, alMenu }: {
  datos: DatosInforme; historia: Mes[]; siguiente: { anio: number; peces: number } | null
  alSeguir: () => void; alRepetir: () => void; alMenu: () => void
}) {
  const peor = historia.reduce<{ k: number; m: Mes } | null>((a, m, k) => (!a || m.alimento < a.m.alimento ? { k, m } : a), null)
  const comida = Math.round(datos.alimentoPromedio * 100)
  const enlace = peor ? `/explorer#mes=${datos.anio}-${String(peor.k + 1).padStart(2, '0')}&dato=clorofila&zona=${ZONA_EXPLORADOR[peor.m.zona] ?? ''}&vista=satellite&estilo=bandas` : '/explorer'
  const temporada = datos.vedas === 0 ? 'normal' : datos.vedas >= datos.mesesTemporada ? 'cancelada' : `recortada (${datos.vedas} de ${datos.mesesTemporada} meses en veda)`

  return <div className="juego-informe-fondo" role="dialog" aria-modal="true" aria-labelledby="t-informe">
    <article className="juego-informe">
      <h2 id="t-informe">Informe de la temporada {datos.anio}</h2>
      <Fila texto="Cardumen inicial" valor={datos.inicial} />
      <Fila texto="Perdidos por hambre" valor={datos.perdidas.hambre} signo="-" />
      <Fila texto="Perdidos por depredadores" valor={datos.perdidas.depredadores} signo="-" />
      <Fila texto="Capturados por la flota" valor={datos.perdidas.flota} signo="-" />
      <Fila texto="Perdidos por falta de oxígeno" valor={datos.perdidas.oxigeno} signo="-" />
      <div className="total"><Fila texto="Sobrevivientes" valor={datos.sobrevivientes} /></div>
      <p>Comida que encontró el cardumen: <b>{comida} % de lo normal</b>{comida < 80 ? ' (año de hambre)' : comida > 120 ? ' (año generoso)' : ''}.</p>
      {peor && <p>El peor mes fue <b>{MESES[peor.k]?.toLowerCase()}</b> en {NOMBRE_ZONA[peor.m.zona]}: {Math.round(peor.m.alimento * 100)} % de la comida normal.</p>}
      <p>Temporada de pesca: <b>{temporada}</b>.</p>
      <p className="nota">El mar es real: clorofila satelital (ESA OC-CCI, con satélites de la NASA) y El Niño 1+2 (NOAA), {datos.mesesObservados} de 12 meses con clorofila medida. Las cifras del cardumen, los depredadores y las vedas del juego son ilustrativas.</p>
      <div className="acciones">
        {siguiente
          ? <button type="button" className="juego-caja principal" onClick={alSeguir}>Siguiente generación: {siguiente.anio} ({n0.format(siguiente.peces)} peces) →</button>
          : <button type="button" className="juego-caja principal" onClick={alMenu}>Volver al menú</button>}
        <button type="button" className="juego-caja" onClick={alRepetir}>Repetir {datos.anio}</button>
        <a className="juego-caja" href={enlace}>Ver este año en el explorador</a>
      </div>
    </article>
  </div>
}
