import { useMemo } from 'react'
import { ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { mediaMovil } from '../../../lib/estadistica'
import { etiquetaMes, nf } from '../../../lib/formato'
import type { Modelo } from '../lib/modelo'
import type { Serie } from '../lib/tipos'

type Props = {
  modelo: Modelo
  /** valores desde el primer mes (enero de 1998) hasta el último del calendario */
  serie: Serie
  color: string
  mesActual: number
  alElegirMes: (i: number) => void
  logaritmica?: boolean
  decimales?: number
}

/** Serie mensual: cada mes, promedio de 12 meses y línea vertical en el mes elegido. Tocar el gráfico salta a ese mes */
export function SerieMensual({ modelo, serie, color, mesActual, alElegirMes, logaritmica, decimales = 2 }: Props) {
  const { i0 } = modelo
  const datos = useMemo(() => {
    const media = mediaMovil(serie)
    return serie.map((valor, k) => ({ k, valor, media: media[k] }))
  }, [serie])
  const marcas = useMemo(() => datos.filter((d) => { const m = modelo.mes(i0 + d.k); return m.mes === 0 && m.anio % 5 === 0 }).map((d) => d.k), [datos, modelo, i0])
  const fmt = (x: unknown) => (typeof x === 'number' ? nf(x < 1 ? decimales : Math.min(decimales, 1)).format(x) : 'Not available')

  return <ResponsiveContainer width="100%" height="100%">
    <ComposedChart data={datos} margin={{ top: 6, right: 6, bottom: 0, left: -12 }}
      onClick={(e) => { const k = Number(e?.activeTooltipIndex); if (Number.isFinite(k)) alElegirMes(i0 + k) }}>
      <XAxis dataKey="k" type="number" domain={[0, datos.length - 1]} ticks={marcas} tickFormatter={(k: number) => String(modelo.mes(i0 + k).anio)} tick={{ fill: '#a3bccb', fontSize: 12 }} stroke="rgba(36,80,122,.55)" />
      <YAxis scale={logaritmica ? 'log' : 'auto'} domain={logaritmica ? [0.03, 'auto'] : ['auto', 'auto']} allowDataOverflow={logaritmica} tick={{ fill: '#a3bccb', fontSize: 12 }} stroke="rgba(36,80,122,.55)" tickCount={5} tickFormatter={(x: number) => nf(Math.abs(x) < 1 ? 2 : 0).format(x)} width={52} />
      <Tooltip labelFormatter={(k) => etiquetaMes(modelo.mes(i0 + Number(k)))} formatter={(x, nombre) => [fmt(x), String(nombre)]} contentStyle={{ background: 'rgba(7,30,51,.96)', border: '1px solid #24507a', borderRadius: 8 }} />
      <Legend verticalAlign="bottom" height={24} wrapperStyle={{ fontSize: 12, color: '#a3bccb' }} />
      <Line name="Cada mes" dataKey="valor" stroke="rgba(163,188,203,0.45)" strokeWidth={1} dot={false} isAnimationActive={false} connectNulls={false} />
      <Line name="12-month average" dataKey="media" stroke={color} strokeWidth={2.4} dot={false} isAnimationActive={false} connectNulls />
      <ReferenceLine x={mesActual - i0} stroke="rgba(234,243,245,0.75)" strokeDasharray="3 3" />
    </ComposedChart>
  </ResponsiveContainer>
}
