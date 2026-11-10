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
      <h2 id="t-hallazgos">Lo que muestran los datos</h2>
      <p>Cuatro resultados calculados con las series de esta página (1998–2024). El número grande es la correlación <em>r</em>: va de −1 a 1, y cerca de 0 significa que no hay relación lineal. Son asociaciones exploratorias, no pruebas de causa.</p>
    </div>

    <Hallazgo titulo="La costa manda: El Niño frente al Perú" cifra={`r = ${fmtR(d.r1)}`} detalle="temperatura de Niño 1+2 frente a la pesca de anchoveta"
      texto="Cuando el mar frente al Perú se calienta (barras naranjas), sube menos agua fría y rica en nutrientes, hay menos fitoplancton y la pesca de anchoveta cae. Se ve en 1998, 2015–2016 y 2023. La pesca también depende de cuotas y vedas."
      etiqueta="Gráfico: anomalía de temperatura Niño 1+2 en barras y pesca de anchoveta del Perú en línea, 1998 a 2024">
      <ComposedChart data={d.anual} margin={{ top: 6, right: 0, bottom: 0, left: -8 }}>
        <CartesianGrid vertical={false} stroke="rgba(36,80,122,.4)" />
        <XAxis dataKey="anio" {...eje} minTickGap={16} />
        <YAxis yAxisId="t" {...eje} label={{ value: '°C', angle: -90, fill: '#a3bccb', position: 'insideLeft' }} />
        <YAxis yAxisId="p" orientation="right" {...eje} label={{ value: 'millones de t', angle: 90, fill: '#a3bccb', position: 'insideRight' }} />
        <Tooltip {...tip} formatter={(x, n) => [n1(x), String(n)]} />
        <Legend {...leyenda} />
        <Bar yAxisId="t" dataKey="nino12" name="Niño 1+2 (°C sobre lo normal)" radius={3} isAnimationActive={false}>{d.anual.map((r) => <Cell key={r.anio} fill={(r.nino12 ?? 0) > 0 ? '#f08a4b' : '#2b6cb0'} />)}</Bar>
        <Line yAxisId="p" dataKey="anchoveta" name="Anchoveta pescada (millones de t)" stroke="#3fc28c" strokeWidth={2.5} dot={{ r: 2.5 }} isAnimationActive={false} />
      </ComposedChart>
    </Hallazgo>

    <Hallazgo titulo="La Antártida va a su propio ritmo" cifra={`r = ${fmtR(d.r2)}`} detalle="fitoplancton de Rey Jorge frente al de Chimbote"
      texto="Los años con mucho fitoplancton en la isla Rey Jorge no coinciden con los del Perú. En 2023 la Antártida tuvo un pico y el Perú, por El Niño, una caída. Si hay un vínculo, no es directo ni del mismo año."
      etiqueta="Gráfico: anomalía de clorofila en Rey Jorge y en Chimbote, 1998 a 2024">
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

    <Hallazgo titulo="El hielo marino antártico se desplomó desde 2016" cifra={d.h23 == null ? '—' : nf(1).format(Math.abs(d.h23))} detalle="millones de km² por debajo de lo normal en 2023"
      texto="El hielo que rodea la Antártida fue estable o creció hasta 2015 y luego cayó a mínimos históricos. Bajo ese hielo vive el krill, la base de la cadena antártica. La pesca de krill (línea) depende más de los barcos y las cuotas que del hielo."
      etiqueta="Gráfico: anomalía anual de la extensión del hielo marino antártico y pesca mundial de krill, 1998 a 2024">
      <ComposedChart data={d.anual} margin={{ top: 6, right: 0, bottom: 0, left: -8 }}>
        <CartesianGrid vertical={false} stroke="rgba(36,80,122,.4)" />
        <XAxis dataKey="anio" {...eje} minTickGap={16} />
        <YAxis yAxisId="h" {...eje} label={{ value: 'millones de km²', angle: -90, fill: '#a3bccb', position: 'insideLeft' }} />
        <YAxis yAxisId="k" orientation="right" {...eje} label={{ value: 'miles de t', angle: 90, fill: '#a3bccb', position: 'insideRight' }} />
        <Tooltip {...tip} formatter={(x, n) => [n1(x), String(n)]} />
        <Legend {...leyenda} />
        <Bar yAxisId="h" dataKey="hielo" name="Hielo marino (millones de km² frente a lo normal)" radius={3} isAnimationActive={false}>{d.anual.map((r) => <Cell key={r.anio} fill={(r.hielo ?? 0) < 0 ? 'rgba(99,205,232,0.45)' : '#63cde8'} />)}</Bar>
        <Line yAxisId="k" dataKey="krill" name="Krill pescado en el mundo (miles de t)" stroke="#eaf3f5" strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
      </ComposedChart>
    </Hallazgo>

    <Hallazgo titulo="Mucho nitrato, poco fitoplancton" cifra={d.veces == null ? '—' : `${nf(0).format(d.veces)} veces`} detalle="más nitrato en Rey Jorge que en Chimbote"
      texto="El agua antártica tiene muchísimos nutrientes y aun así menos fitoplancton que la costa peruana. Allí falta hierro y luz en invierno. Frente al Perú el viento hace subir agua profunda con nutrientes y hay sol todo el año."
      etiqueta="Gráfico de barras: nitrato en superficie y clorofila promedio por zona">
      <ComposedChart data={d.zonas} margin={{ top: 6, right: 0, bottom: 0, left: -8 }}>
        <CartesianGrid vertical={false} stroke="rgba(36,80,122,.4)" />
        <XAxis dataKey="nombre" {...eje} interval={0} tick={{ fill: '#a3bccb', fontSize: 10 }} />
        <YAxis yAxisId="n" {...eje} label={{ value: 'µmol/kg', angle: -90, fill: '#a3bccb', position: 'insideLeft' }} />
        <YAxis yAxisId="c" orientation="right" {...eje} label={{ value: 'mg/m³', angle: 90, fill: '#a3bccb', position: 'insideRight' }} />
        <Tooltip {...tip} formatter={(x, n) => [n1(x), String(n)]} />
        <Legend {...leyenda} />
        <Bar yAxisId="n" dataKey="nitrato" name="Nitrato en superficie (µmol/kg)" fill="#63cde8" radius={3} isAnimationActive={false} />
        <Bar yAxisId="c" dataKey="clorofila" name="Clorofila promedio (mg/m³)" fill="#3fc28c" radius={3} isAnimationActive={false} />
      </ComposedChart>
    </Hallazgo>

    <ResultadosComprobados />
  </section>
}
