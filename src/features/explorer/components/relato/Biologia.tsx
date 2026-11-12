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
    <h2>Respuesta biológica</h2>
    <p>No hay datos de anchoveta para las zonas antárticas. La biomasa hidroacústica disponible corresponde a cruceros y stocks del Perú.</p>
  </>

  return <>
    <h2>Respuesta biológica de la anchoveta</h2>
    {zona && <p className="region">Datos disponibles a escala de Perú/stock, no como medición propia de {modelo.zona(zona).nombre}.</p>}
    <CrucerosSection id="cruceros-lateral" compacto={true} encabezado={false} />
    <div className="cifras">
      <div className="cifra"><b className="num">{cruises.length}</b><span>registros de biomasa total por crucero IMARPE</span></div>
      <div className="cifra"><b className="num">{ultimo ? `${nf(1).format(ultimo.biomasa_t / 1e6)} M t` : 'sin dato'}</b><span>{ultimo ? `último registro ${ultimo.crucero}` : 'biomasa hidroacústica'}</span></div>
    </div>
    <p className="nota">La biomasa de crucero es una observación irregular y no se interpola como una medición mensual. El gráfico detallado se conserva también en la sección inferior.</p>
    <h3>Actividad pesquera</h3>
    <p>{pesca == null ? 'No hay desembarque anual disponible para 2024.' : `Desembarques de anchoveta del Perú: ${nf(0).format(pesca)} t en 2024.`} Es actividad pesquera y no equivale a biomasa.</p>
    <h3>Datos aún no disponibles</h3>
    <p className="nota">Biomasa evaluada RAM Legacy, biomasa desovante histórica, distribución espacial de anchoveta y NASC/densidad acústica no están cargados en los archivos del explorador.</p>
  </>
}
