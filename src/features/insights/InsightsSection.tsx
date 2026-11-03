import { useMemo } from 'react'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useData } from '../../contexts/DataContext'

function pearson(xs: number[], ys: number[]) {
  const pairs = xs.map((x, i) => [x, ys[i]]).filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y))
  if (pairs.length < 3) return null
  const mx = pairs.reduce((sum, [x]) => sum + x, 0) / pairs.length
  const my = pairs.reduce((sum, [, y]) => sum + y, 0) / pairs.length
  const numerator = pairs.reduce((sum, [x, y]) => sum + (x - mx) * (y - my), 0)
  const denominator = Math.sqrt(pairs.reduce((sum, [x]) => sum + (x - mx) ** 2, 0) * pairs.reduce((sum, [, y]) => sum + (y - my) ** 2, 0))
  return denominator ? numerator / denominator : null
}

export default function InsightsSection() {
  const { data } = useData()
  const rows = useMemo(() => data?.juego || [], [data])
  const correlation = pearson(rows.map((row) => row.nino12), rows.map((row) => row.anchoveta))
  return <section className="seccion" id="hallazgos"><div className="encabezado-seccion"><h2>Lo que muestran los datos</h2><p>Resultados calculados con las series cargadas. Son asociaciones exploratorias, no pruebas de causalidad.</p></div><article className="hallazgo"><div className="texto"><h3>La costa manda: El Niño frente al Perú</h3><div className="r num">{correlation == null ? 'sin comparación' : `r = ${correlation.toFixed(2)}`}<small>temperatura de Niño 1+2 frente a la pesca de anchoveta</small></div><p>Los años más cálidos suelen coincidir con menos anchoveta, aunque la pesca también depende de cuotas y vedas.</p></div><div className="lienzo data-chart-wrap"><ResponsiveContainer width="100%" height="100%"><LineChart data={rows}><XAxis dataKey="anio" /><YAxis /><Tooltip /><Line type="monotone" dataKey="nino12" stroke="#f08a4b" dot={false} /><Line type="monotone" dataKey="anchoveta" stroke="#3fc28c" dot={false} /></LineChart></ResponsiveContainer></div></article></section>
}
