import { useMemo } from 'react'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { colorDiverge } from '../../../../lib/color'
import { media, pendiente } from '../../../../lib/estadistica'
import { nf, signo } from '../../../../lib/formato'
import { useExplorer } from '../../ExplorerContext'
import { BotonVolver } from './comun'
import { useAcciones } from '../../hooks/useAcciones'

/** Base Machu Picchu: temperatura anual del aire (NASA POWER) */
export default function Base() {
  const { modelo } = useExplorer()
  const acciones = useAcciones()
  const { filas, prom, pend } = useMemo(() => {
    const P = modelo.D.power
    const serie = P.sitios.base_machu_picchu?.T2M ?? []
    const a0 = Number(P.inicio.slice(0, 4))
    const filas: { anio: number; t: number }[] = []
    for (let k = 0; k * 12 < serie.length; k++) {
      const t = serie.slice(k * 12, k * 12 + 12), m = media(t)
      if (t.filter((x) => x != null).length === 12 && m != null) filas.push({ anio: a0 + k, t: m })
    }
    const prom = media(filas.map((f) => f.t)) ?? 0
    return { filas, prom, pend: pendiente(filas.map((f) => f.anio), filas.map((f) => f.t)) ?? 0 }
  }, [modelo])

  return <>
    <BotonVolver />
    <h2>Base Machu Picchu</h2>
    <div className="region">Mackellar Inlet, King George Island, Antarctica</div>
    <p>It is Peru's scientific base in Antarctica. It operates during the austral summer, when Peruvian expeditions arrive to study the sea, ice and Antarctic life.</p>
    <div className="cifras">
      <div className="cifra"><b className="num">{prom < 0 ? '−' : ''}{nf(1).format(Math.abs(prom))} °C</b><span>average air temperature, {filas[0]?.anio ?? '—'}–{filas.at(-1)?.anio ?? '—'}</span></div>
      <div className="cifra"><b className="num">{signo(pend)}{nf(2).format(Math.abs(pend * 10))} °C</b><span>tendencia por década</span></div>
    </div>
    <div className="grafico" aria-label="Temperatura anual del aire en la Base Machu Picchu">
      <ResponsiveContainer width="100%" height="100%"><BarChart data={filas} margin={{ top: 6, right: 6, bottom: 0, left: -12 }}>
        <XAxis dataKey="anio" tick={{ fill: '#a3bccb', fontSize: 12 }} stroke="rgba(36,80,122,.55)" minTickGap={24} />
        <YAxis tick={{ fill: '#a3bccb', fontSize: 12 }} stroke="rgba(36,80,122,.55)" tickCount={5} width={44} />
        <Tooltip formatter={(x) => [`${nf(1).format(Number(x))} °C`, 'Temperatura del aire']} contentStyle={{ background: 'rgba(7,30,51,.96)', border: '1px solid #24507a', borderRadius: 8 }} />
        <Bar dataKey="t" radius={2} isAnimationActive={false}>{filas.map((f) => <Cell key={f.anio} fill={colorDiverge((f.t - prom) / 1.2, 0.9)} />)}</Bar>
      </BarChart></ResponsiveContainer>
    </div>
    <p className="nota">Air at 2 m above ground, NASA POWER (MERRA-2). The trend is weak: winters vary greatly from year to year.</p>
    <h3>¿Qué quieres ver?</h3>
    <div className="chips">
      <button className="chip" type="button" onClick={() => acciones.irAZona('antartida_rey_jorge')}>King George waters</button>
      <button className="chip" type="button" onClick={() => acciones.irAZona('antartida_peninsula')}>Antarctic Peninsula</button>
      <button className="chip" type="button" onClick={() => acciones.historia('antartida2023')}>Antarctica in 2023</button>
    </div>
  </>
}
