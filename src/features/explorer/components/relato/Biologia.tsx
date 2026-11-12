import { useData } from '../../../../contexts/DataContext'
import { nf } from '../../../../lib/formato'
import { useExplorer } from '../../ExplorerContext'
import { esPeru } from '../../lib/modelo'
import type { IdZona } from '../../lib/tipos'
import CrucerosSection from '../../../cruceros/CrucerosSection'

/** Respuesta biológica mostrada en el panel lateral sin sustituir biomasa por desembarques. */
export default function Biologia({ zona }: { zona?: IdZona }) {
  const { modelo } = useExplorer()
  const { cruises } = useData()
  const disponible = zona == null || esPeru(zona)
  const ultimo = cruises.at(-1)
  const pesca = modelo.pescaAnio(2024)

  if (!disponible) return <>
    <h2>Anchoveta biological response</h2>
    <p>No anchoveta data is available for Antarctic zones. The available hydroacoustic biomass comes from Peruvian surveys and stocks.</p>
  </>

  return <>
    <h2>Anchoveta biological response</h2>
    {zona && <p className="region">Data is available at the Peru/stock scale, not as a measurement specific to {modelo.zona(zona).nombre}.</p>}
    <CrucerosSection id="cruceros-lateral" compacto={true} encabezado={false} />
    <div className="cifras">
      <div className="cifra"><b className="num">{cruises.length}</b><span>total biomass records from IMARPE surveys</span></div>
      <div className="cifra"><b className="num">{ultimo ? `${nf(1).format(ultimo.biomasa_t / 1e6)} M t` : 'no data'}</b><span>{ultimo ? `latest record: ${ultimo.crucero}` : 'hydroacoustic biomass'}</span></div>
    </div>
    <p className="nota">Survey biomass is an irregular observation and is not interpolated as a monthly measurement. The detailed chart is also kept in the lower section.</p>
    <h3>Fishing activity</h3>
    <p>{pesca == null ? 'No annual landing data is available for 2024.' : `Peruvian anchoveta landings: ${nf(0).format(pesca)} t in 2024.`} This is fishing activity, not biomass.</p>
    <h3>Indicators in this section</h3>
    <ul className="indicadores">
      <li data-ok="true"><b>Hydroacoustic biomass by survey</b><span>IMARPE surveys · shown above</span></li>
      <li data-ok="true"><b>Landings (fishing activity, not biomass)</b><span>FAO annual series · shown above</span></li>
      <li data-ok="false"><b>RAM Legacy assessed biomass</b><span>Not available: not loaded in the explorer</span></li>
      <li data-ok="false"><b>Historical spawning biomass</b><span>Not available: not loaded in the explorer</span></li>
      <li data-ok="false"><b>Spatial distribution of anchoveta</b><span>Not available: no spatial data loaded</span></li>
      <li data-ok="false"><b>NASC / acoustic density</b><span>Not available: no acoustic density data loaded</span></li>
    </ul>
  </>
}
