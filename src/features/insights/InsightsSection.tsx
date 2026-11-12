import { useMemo, type ReactNode } from 'react'
import { Bar, CartesianGrid, Cell, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { media, pearson } from '../../lib/estadistica'
import { fmtR, nf } from '../../lib/formato'
import { useExplorer } from '../explorer/ExplorerContext'
import { ZONA_CHIMBOTE, ZONA_REY_JORGE } from '../explorer/lib/modelo'
import ResultadosComprobados from './ResultadosComprobados'

const eje = { tick: { fill: '#a3bccb', fontSize: 12 }, stroke: 'rgba(36,80,122,.55)' }
const tip = { contentStyle: { background: 'rgba(7,30,51,.96)', border: '1px solid #24507a', borderRadius: 8 } }
const leyenda = { verticalAlign: 'bottom' as const, wrapperStyle: { fontSize: 12, color: '#a3bccb' } }
const n1 = (x: unknown) => (typeof x === 'number' ? nf(Math.abs(x) < 10 ? 2 : 1).format(x) : 'sin dato')

function Hallazgo({ titulo, cifra, detalle, texto, children, etiqueta }: { titulo: string; cifra: string; detalle: string; texto: string; children: ReactNode; etiqueta: string }) {
  return <article className="hallazgo">
    <div className="texto">
      <h3>{titulo}</h3>
      <div className="r num">{cifra}<small>{detalle}</small></div>
      <p>{texto}</p>
    </div>
    <div className="lienzo" role="img" aria-label={etiqueta}><ResponsiveContainer width="100%" height="100%">{children as React.ReactElement}</ResponsiveContainer></div>
  </article>
}

/** "Lo que muestran los datos": cuatro resultados con su gráfico */
export default function InsightsSection() {
  const { modelo } = useExplorer()
  const d = useMemo(() => {
    const J = modelo.anual
    const anual = J.map((j) => ({
      anio: j.anio, nino12: j.nino12, anchoveta: j.anchoveta == null ? null : j.anchoveta / 1e6, chl_rj: j.chl_rj, chl_cn: j.chl_cn,
      hielo: j.hielo, krill: (() => { const k = modelo.pescaAnio(j.anio, 'krill_mundo'); return k == null ? null : k / 1e3 })(),
    }))
    const zonas = modelo.ids.map((z) => ({
      nombre: modelo.zona(z).nombre,
      nitrato: media(modelo.D.nutrientes[z]?.nitrato ?? []),
      clorofila: media((modelo.D.series[z].clorofila_mg_m3 ?? []).slice(modelo.i0)),
    }))
    const nRJ = zonas[modelo.ids.indexOf(ZONA_REY_JORGE)]?.nitrato, nCN = zonas[modelo.ids.indexOf(ZONA_CHIMBOTE)]?.nitrato
    return {
      anual, zonas,
      r1: pearson(J.map((j) => j.nino12), J.map((j) => j.anchoveta)),
      r2: pearson(J.map((j) => j.chl_rj), J.map((j) => j.chl_cn)),
      h23: J.find((j) => j.anio === 2023)?.hielo ?? null,
      veces: nRJ && nCN ? nRJ / nCN : null,
    }
  }, [modelo])

  return <section className="seccion" id="hallazgos" aria-labelledby="t-hallazgos">
    <div className="encabezado-seccion">
      <h2 id="t-hallazgos">What the data shows</h2>
      <p>Four results calculated from this page's series (1998–2024). The large number is the <em>r</em> correlation: it ranges from −1 to 1, and values near 0 mean there is no linear relationship. These are exploratory associations, not proof of causation.</p>
    </div>

    <Hallazgo titulo="The coast leads: El Niño off Peru" cifra={`r = ${fmtR(d.r1)}`} detalle="Niño 1+2 temperature versus anchoveta landings"
      texto="When the sea off Peru warms (orange bars), less cold, nutrient-rich water rises, phytoplankton declines and anchoveta landings fall. This appears in 1998, 2015–2016 and 2023. Fishing also depends on quotas and closures."
      etiqueta="Chart: Niño 1+2 temperature anomaly bars and Peruvian anchoveta landings line, 1998 to 2024">
      <ComposedChart data={d.anual} margin={{ top: 6, right: 0, bottom: 0, left: -8 }}>
        <CartesianGrid vertical={false} stroke="rgba(36,80,122,.4)" />
        <XAxis dataKey="anio" {...eje} minTickGap={16} />
        <YAxis yAxisId="t" {...eje} label={{ value: '°C', angle: -90, fill: '#a3bccb', position: 'insideLeft' }} />
        <YAxis yAxisId="p" orientation="right" {...eje} label={{ value: 'millones de t', angle: 90, fill: '#a3bccb', position: 'insideRight' }} />
        <Tooltip {...tip} formatter={(x, n) => [n1(x), String(n)]} />
        <Legend {...leyenda} />
        <Bar yAxisId="t" dataKey="nino12" name="Niño 1+2 (°C above normal)" radius={3} isAnimationActive={false}>{d.anual.map((r) => <Cell key={r.anio} fill={(r.nino12 ?? 0) > 0 ? '#f08a4b' : '#2b6cb0'} />)}</Bar>
        <Line yAxisId="p" dataKey="anchoveta" name="Anchoveta landings (million t)" stroke="#3fc28c" strokeWidth={2.5} dot={{ r: 2.5 }} isAnimationActive={false} />
      </ComposedChart>
    </Hallazgo>

    <Hallazgo titulo="Antarctica follows its own rhythm" cifra={`r = ${fmtR(d.r2)}`} detalle="Rey Jorge phytoplankton versus Chimbote"
      texto="Years with high phytoplankton on Rey Jorge do not match Peru. In 2023 Antarctica peaked while Peru fell during El Niño. If there is a link, it is neither direct nor from the same year."
      etiqueta="Chart: chlorophyll anomaly on Rey Jorge and Chimbote, 1998 to 2024">
      <ComposedChart data={d.anual} margin={{ top: 6, right: 8, bottom: 0, left: -8 }}>
        <CartesianGrid vertical={false} stroke="rgba(36,80,122,.4)" />
        <XAxis dataKey="anio" {...eje} minTickGap={16} />
        <YAxis {...eje} label={{ value: '%', angle: -90, fill: '#a3bccb', position: 'insideLeft' }} />
        <Tooltip {...tip} formatter={(x, n) => [n1(x), String(n)]} />
        <Legend {...leyenda} />
        <Line dataKey="chl_rj" name="Rey Jorge (% sobre lo normal)" stroke="#63cde8" strokeWidth={2.4} dot={{ r: 2.5 }} isAnimationActive={false} />
        <Line dataKey="chl_cn" name="Chimbote (% sobre lo normal)" stroke="#3fc28c" strokeWidth={2.4} dot={{ r: 2.5 }} isAnimationActive={false} />
      </ComposedChart>
    </Hallazgo>

    <Hallazgo titulo="Antarctic sea ice collapsed after 2016" cifra={d.h23 == null ? '—' : nf(1).format(Math.abs(d.h23))} detalle="million km² below normal in 2023"
      texto="The ice surrounding Antarctica was stable or grew through 2015, then fell to historic lows. Krill, the base of the Antarctic food web, lives beneath that ice. Krill fishing (the line) depends more on vessels and quotas than on ice."
      etiqueta="Chart: annual Antarctic sea ice extent anomaly and global krill fishing, 1998 to 2024">
      <ComposedChart data={d.anual} margin={{ top: 6, right: 0, bottom: 0, left: -8 }}>
        <CartesianGrid vertical={false} stroke="rgba(36,80,122,.4)" />
        <XAxis dataKey="anio" {...eje} minTickGap={16} />
        <YAxis yAxisId="h" {...eje} label={{ value: 'millones de km²', angle: -90, fill: '#a3bccb', position: 'insideLeft' }} />
        <YAxis yAxisId="k" orientation="right" {...eje} label={{ value: 'miles de t', angle: 90, fill: '#a3bccb', position: 'insideRight' }} />
        <Tooltip {...tip} formatter={(x, n) => [n1(x), String(n)]} />
        <Legend {...leyenda} />
        <Bar yAxisId="h" dataKey="hielo" name="Sea ice (million km² from normal)" radius={3} isAnimationActive={false}>{d.anual.map((r) => <Cell key={r.anio} fill={(r.hielo ?? 0) < 0 ? 'rgba(99,205,232,0.45)' : '#63cde8'} />)}</Bar>
        <Line yAxisId="k" dataKey="krill" name="Krill caught worldwide (thousand t)" stroke="#eaf3f5" strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
      </ComposedChart>
    </Hallazgo>

    <Hallazgo titulo="High nitrate, little phytoplankton" cifra={d.veces == null ? '—' : `${nf(0).format(d.veces)} times`} detalle="more nitrate at Rey Jorge than at Chimbote"
      texto="Antarctic water has abundant nutrients and still less phytoplankton than the Peruvian coast. Iron and light are scarce there in winter. Off Peru, wind brings deep nutrient-rich water to the surface, and sunlight is available year-round."
      etiqueta="Bar chart: surface nitrate and average chlorophyll by zone">
      <ComposedChart data={d.zonas} margin={{ top: 6, right: 0, bottom: 0, left: -8 }}>
        <CartesianGrid vertical={false} stroke="rgba(36,80,122,.4)" />
        <XAxis dataKey="nombre" {...eje} interval={0} tick={{ fill: '#a3bccb', fontSize: 10 }} />
        <YAxis yAxisId="n" {...eje} label={{ value: 'µmol/kg', angle: -90, fill: '#a3bccb', position: 'insideLeft' }} />
        <YAxis yAxisId="c" orientation="right" {...eje} label={{ value: 'mg/m³', angle: 90, fill: '#a3bccb', position: 'insideRight' }} />
        <Tooltip {...tip} formatter={(x, n) => [n1(x), String(n)]} />
        <Legend {...leyenda} />
        <Bar yAxisId="n" dataKey="nitrato" name="Surface nitrate (µmol/kg)" fill="#63cde8" radius={3} isAnimationActive={false} />
        <Bar yAxisId="c" dataKey="clorofila" name="Average chlorophyll (mg/m³)" fill="#3fc28c" radius={3} isAnimationActive={false} />
      </ComposedChart>
    </Hallazgo>

    <ResultadosComprobados />
  </section>
}
