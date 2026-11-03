import { useData } from '../../contexts/DataContext'

export default function MonitorSection() {
  const { monitor } = useData()
  const records = monitor?.records || []
  const values = records.map((row) => typeof row.chlorophyll_a_mg_m3 === 'number' ? row.chlorophyll_a_mg_m3 : null)
  const latest = [...values].reverse().find((value) => value != null)
  const observed = records.filter((row) => row.biomass_observed === true).length
  return <section className="seccion"><div className="monitor"><div className="monitor-cabecera"><div><h2>Monitor de condiciones</h2><p>Explora la señal ambiental mensual que alimenta los experimentos A y B.</p></div><span className="monitor-meta">1998–2026</span></div><div className="monitor-notas"><div className="monitor-nota"><b>{latest == null ? '—' : latest.toFixed(2)}</b><span>última clorofila disponible</span></div><div className="monitor-nota"><b>{observed}</b><span>meses con biomasa observada</span></div><div className="monitor-nota"><b>{records.length}</b><span>registros mensuales</span></div></div><p className="monitor-aviso"><strong>Cómo leerlo:</strong> la biomasa solo aparece durante intervalos de crucero IMARPE; los tramos interpolados son únicamente visuales.</p></div></section>
}
