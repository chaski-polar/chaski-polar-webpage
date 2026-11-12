import { Bar, BarChart, CartesianGrid, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { nf, signo } from '../../lib/formato'
import { useExplorer } from '../explorer/ExplorerContext'
import type { AsimetriaZona, ClaveZonaMonitor } from '../explorer/lib/tipos'

const ESTADOS: Record<string, string> = { comprobado: 'Confirmed', pendiente: 'Pending' }
const HALLAZGO_EN: Record<string, { titulo: string; resumen?: string }> = {
  asimetria: { titulo: 'Warming reduces phytoplankton; cooling barely restores it' },
  zonas_vulnerables: { titulo: 'The central coast is most vulnerable to El Niño', resumen: 'With Niño 1+2 >= +1 °C, chlorophyll falls by about 45% in Chimbote and Callao, 20–23% in Pisco and Ilo, and barely changes in Paita-Sechura.' },
  sin_tendencias: { titulo: 'No significant chlorophyll trends since 1998' },
  antartida: { titulo: 'No robust relationship between the Southern Ocean and Peruvian phytoplankton', resumen: 'More than 900 tests found no significant relationship after FDR correction; positive controls confirm the method.' },
  prediccion_2026: { titulo: 'Prediction of the phytoplankton decline during El Niño 2026' },
}
const pct = (x: number) => `${signo(x)}${nf(1).format(Math.abs(x))} %`

/** Resultados del análisis con su estado; la asimetría muestra el detalle por zona */
export default function ResultadosComprobados() {
  const { modelo } = useExplorer()
  const hallazgos = modelo.metadataMonitor.hallazgos ?? []
  const zonas = modelo.metadataMonitor.zonas ?? {}
  if (!hallazgos.length) return null

  return <div className="resultados" aria-labelledby="t-resultados">
    <h3 id="t-resultados">Status of each result</h3>
    <p className="nota">What the statistical analysis of the series has confirmed and what remains pending.</p>
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
          <h4>{HALLAZGO_EN[h.id]?.titulo ?? h.titulo}</h4>
          {(HALLAZGO_EN[h.id]?.resumen ?? h.resumen) && <p>{HALLAZGO_EN[h.id]?.resumen ?? h.resumen}</p>}
          {filas && <>
            <p>For each degree the sea warms, chlorophyll falls between {nf(0).format(Math.min(...centrales.map((f) => -f.calido)))}% and {nf(0).format(Math.max(...centrales.map((f) => -f.calido)))}% in {centrales.map((f) => f.zona).join(', ')}. When it cools, it barely recovers.</p>
            <div className="resultado-grafico" role="img" aria-label="Chlorophyll change per warmer and colder degree in each zone">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filas} margin={{ top: 6, right: 6, bottom: 0, left: -10 }}>
                  <CartesianGrid vertical={false} stroke="rgba(36,80,122,.4)" />
                  <XAxis dataKey="zona" tick={{ fill: '#a3bccb', fontSize: 11 }} stroke="rgba(36,80,122,.55)" interval={0} />
                  <YAxis tick={{ fill: '#a3bccb', fontSize: 12 }} stroke="rgba(36,80,122,.55)" unit=" %" />
                  <ReferenceLine y={0} stroke="rgba(234,243,245,.5)" />
                  <Tooltip contentStyle={{ background: 'rgba(7,30,51,.96)', border: '1px solid #24507a', borderRadius: 8 }} formatter={(x, n) => [pct(Number(x)), String(n)]} />
                  <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 12, color: '#a3bccb' }} />
                  <Bar dataKey="calido" name="Warming response (per °C)" fill="#f08a4b" radius={3} isAnimationActive={false} />
                  <Bar dataKey="frio" name="Cooling response (per °C)" fill="#63cde8" radius={3} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="nota">The difference between warming and cooling is statistically significant (p &lt; 0.05) in {filas.filter((f) => f.significativa).map((f) => f.zona).join(', ') || 'no zones'}.</p>
          </>}
        </article>
      })}
    </div>
  </div>
}
