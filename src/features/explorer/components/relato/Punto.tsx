import { fmtCoord, MESES_LARGOS, mesLargo, nf, signo } from '../../../../lib/formato'
import { useExplorer } from '../../ExplorerContext'
import { useAcciones } from '../../hooks/useAcciones'
import { BASE_MACHU_PICCHU, distanciaKm, zonasCercanas } from '../../lib/modelo'
import { useExplorerStore } from '../../store'
import { SerieMensual } from '../SerieMensual'
import { BotonVolver } from './comun'

const km = (d: number): string => nf(0).format(Math.round(d / 10) * 10)

/** Un punto cualquiera del mar: si cae dentro del mapa, sus datos de satélite */
export default function Punto({ lat, lng }: { lat: number; lng: number }) {
  const { modelo, mapa } = useExplorer()
  const acciones = useAcciones()
  const i = useExplorerStore((s) => s.month)
  const cerca = zonasCercanas(modelo, lat, lng)
  const dBase = distanciaKm(lat, lng, BASE_MACHU_PICCHU.lat, BASE_MACHU_PICCHU.lng)
  const dp = mapa.datosPunto(lat, lng, i)
  const pc = dp?.chl != null && dp.chlNormal ? (dp.chl / dp.chlNormal - 1) * 100 : null

  return <>
    <BotonVolver />
    <h2>{fmtCoord(lat, lng)}</h2>
    {dp && !dp.tierra && <>
      <div className="cifras">
        <div className="cifra"><b className="num">{dp.chl == null ? 'no data' : `${nf(dp.chl < 1 ? 2 : 1).format(dp.chl)} mg/m³`}</b><span>chlorophyll in {mesLargo(modelo.mes(i))}{pc != null && `, ${nf(0).format(Math.abs(pc))} % ${pc >= 0 ? 'more' : 'less'} than a normal ${MESES_LARGOS[modelo.mes(i).mes]}`}</span></div>
        <div className="cifra"><b className="num">{dp.sst == null ? 'no data' : `${nf(1).format(dp.sst)} °C`}</b><span>sea temperature{dp.anom != null && `, ${signo(dp.anom)}${nf(1).format(Math.abs(dp.anom))} °C from normal`}</span></div>
      </div>
      {dp.serie && <>
        <div className="grafico" aria-label="Monthly chlorophyll at this point"><SerieMensual modelo={modelo} serie={dp.serie} color="#3fc28c" mesActual={i} alElegirMes={acciones.fijarMes} logaritmica /></div>
        <p className="nota">Chlorophyll from the map's half-degree cell (ESA OC-CCI v6), on a logarithmic scale. Tap the chart to jump to that month.</p>
      </>}
    </>}
    {dp?.tierra && <p>This point falls on land or where the satellite never sees the sea, such as permanent ice.</p>}
    <p>
      {dp ? `This is not one of the ${modelo.ids.length} study zones.` : 'No satellite map or study zone is available here.'}
      {cerca[0] && <> The nearest zone is <strong>{modelo.zona(cerca[0].z).nombre}</strong>, about {km(cerca[0].d)} km.</>}
      {dBase < 3000 && ` Machu Picchu Base is ${km(dBase)} km away.`}
    </p>
    <h3>Go to a nearby zone</h3>
    <div className="chips">{cerca.slice(0, 3).map(({ z, d }) => <button key={z} className="chip" type="button" onClick={() => acciones.irAZona(z)}>{modelo.zona(z).nombre} ({km(d)} km)</button>)}</div>
    <p className="nota" style={{ marginTop: 18 }}>The satellite map extends from the equator to south of the Antarctic Peninsula, between 92° and 52° W.</p>
  </>
}
