import { Bar, BarChart, CartesianGrid, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { nf, signo } from '../../lib/formato'
import { useExplorer } from '../explorer/ExplorerContext'
import type { AsimetriaZona, ClaveZonaMonitor } from '../explorer/lib/tipos'

const ESTADOS: Record<string, string> = { comprobado: 'Comprobado', pendiente: 'Pendiente' }
const pct = (x: number) => `${signo(x)}${nf(1).format(Math.abs(x))} %`

/** Resultados del análisis con su estado; la asimetría muestra el detalle por zona */
export default function ResultadosComprobados() {
  const { modelo } = useExplorer()
  const hallazgos = modelo.metadataMonitor.hallazgos ?? []
  const zonas = modelo.metadataMonitor.zonas ?? {}
  if (!hallazgos.length) return null

  return <div className="resultados" aria-labelledby="t-resultados">
    <h3 id="t-resultados">Estado de cada resultado</h3>
    <p className="nota">Lo que el análisis estadístico de las series ya comprobó y lo que sigue pendiente.</p>
    <div className="resultados-lista">
      {hallazgos.map((h) => {
        const filas = h.resultados
          ? (Object.entries(h.resultados) as [ClaveZonaMonitor, AsimetriaZona][]).map(([c, r]) => ({
            zona: zonas[c]?.nombre ?? c, calido: r.pct_por_grado_calido, frio: r.pct_por_grado_frio, significativa: r.p_asimetria < 0.05,
          }))
          : null
        const centrales = filas?.filter((f) => f.calido <= -10) ?? []
        return <article key={h.id} className={`resultado${filas ? ' con-grafico' : ''}`}>
          <span className={`estado estado-${h.estado}`}>{ESTADOS[h.estado] ?? h.estado}</span>
          <h4>{h.titulo}</h4>
          {h.resumen && <p>{h.resumen}</p>}
          {filas && <>
            <p>Por cada grado que el mar se calienta, la clorofila cae entre {nf(0).format(Math.min(...centrales.map((f) => -f.calido)))} % y {nf(0).format(Math.max(...centrales.map((f) => -f.calido)))} % en {centrales.map((f) => f.zona).join(', ')}. Cuando se enfría, casi no se recupera.</p>
            <div className="resultado-grafico" role="img" aria-label="Cambio de la clorofila por cada grado más cálido y más frío en cada zona">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filas} margin={{ top: 6, right: 6, bottom: 0, left: -10 }}>
                  <CartesianGrid vertical={false} stroke="rgba(36,80,122,.4)" />
                  <XAxis dataKey="zona" tick={{ fill: '#a3bccb', fontSize: 11 }} stroke="rgba(36,80,122,.55)" interval={0} />
                  <YAxis tick={{ fill: '#a3bccb', fontSize: 12 }} stroke="rgba(36,80,122,.55)" unit=" %" />
                  <ReferenceLine y={0} stroke="rgba(234,243,245,.5)" />
                  <Tooltip contentStyle={{ background: 'rgba(7,30,51,.96)', border: '1px solid #24507a', borderRadius: 8 }} formatter={(x, n) => [pct(Number(x)), String(n)]} />
                  <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 12, color: '#a3bccb' }} />
                  <Bar dataKey="calido" name="Por cada °C más cálido" fill="#f08a4b" radius={3} isAnimationActive={false} />
                  <Bar dataKey="frio" name="Por cada °C más frío" fill="#63cde8" radius={3} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="nota">La diferencia entre calentar y enfriar es estadísticamente significativa (p &lt; 0,05) en {filas.filter((f) => f.significativa).map((f) => f.zona).join(', ') || 'ninguna zona'}.</p>
          </>}
        </article>
      })}
    </div>
  </div>
}
