import { useEffect, useMemo } from 'react'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { colorDiverge, colorRampa, DEGRADADO_DIVERGE, tClorofila } from '../../../lib/color'
import { etiquetaMes, mesLargo, nf } from '../../../lib/formato'
import { useExplorer } from '../ExplorerContext'
import { VARIABLES, variablePorId } from '../lib/variables'
import { useExplorerStore } from '../store'

/** Línea de tiempo: dato, mes, reproducción, saltos a cada El Niño y barra con el histórico del dato elegido */
export function TimelinePanel() {
  const { modelo } = useExplorer()
  const { variable, month, playing, setVariable, setMonth, setPlaying } = useExplorerStore()
  const v = variablePorId(variable)
  const { i0, ultimo } = modelo
  const eventos = useMemo(() => modelo.eventosNino(), [modelo])
  const escenario = modelo.esEscenario(month)

  // barras: el dato frente a lo normal, promedio de la región (los meses de escenario, más tenues)
  const serie = useMemo(() => modelo.meses.slice(i0, ultimo + 1).map((_, k) => {
    const i = i0 + k, t = modelo.anomaliaRegional(v, i)
    return { month: i, value: t, color: t == null ? 'transparent' : v.escala === 'rampa' ? colorRampa((t + 1) / 2, modelo.esEscenario(i) ? 0.45 : 0.9) : colorDiverge(t, modelo.esEscenario(i) ? 0.45 : 0.9) }
  }), [modelo, v, i0, ultimo])

  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => {
      const actual = useExplorerStore.getState().month
      setMonth(actual >= ultimo ? i0 : actual + 1)
    }, 320)
    return () => window.clearInterval(timer)
  }, [i0, ultimo, playing, setMonth])

  const posicion = (i: number) => `${((i - i0) / (ultimo - i0)) * 100}%`

  return <section className="timeline-panel" aria-label="Línea de tiempo del globo">
    <div className="timeline-topline">
      <label className="timeline-variable"><span>Dato</span><select value={variable} onChange={(e) => setVariable(e.target.value)}>{VARIABLES.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}</select></label>
      <strong className={`timeline-date${escenario ? ' es-escenario' : ''}`} title={escenario ? 'Escenario de El Niño, no es una observación' : undefined}>{etiquetaMes(modelo.mes(month))}</strong>
    </div>
    <div className="timeline-controls">
      <button className="play-button" type="button" aria-label={playing ? 'Pausar animación' : 'Reproducir meses'} onClick={() => setPlaying(!playing)}>{playing ? 'Ⅱ' : '▶'}</button>
      <div className="timeline-track">
        <div className="timeline-events" role="group" aria-label="Saltar a un evento de El Niño">{eventos.map((e) =>
          <button key={e.anio} type="button" style={{ left: posicion(e.i) }} aria-current={month === e.i} title={`${e.nombre} (pico en ${mesLargo(modelo.mes(e.i))})`}
            onClick={() => { if (!v.mapa) setVariable('temperatura_superficial_C'); setPlaying(false); setMonth(e.i) }}>{e.anio}</button>)}
        </div>
        <div className="timeline-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={serie} margin={{ top: 14, right: 0, bottom: 0, left: 0 }} barCategoryGap={0}>
          <XAxis dataKey="month" hide />
          <Tooltip cursor={false} formatter={(x) => [typeof x === 'number' ? `${x >= 0 ? '+' : '−'}${nf(2).format(Math.abs(x))}` : 'sin dato', `${v.nombre} frente a lo normal`]} labelFormatter={(i) => etiquetaMes(modelo.mes(Number(i)))} />
          <Bar dataKey="value" isAnimationActive={false}>{serie.map((d) => <Cell key={d.month} fill={d.color} />)}</Bar>
        </BarChart></ResponsiveContainer></div>
        <input className="timeline-range" type="range" min={i0} max={ultimo} step={1} value={month} aria-label="Mes" onChange={(e) => { setPlaying(false); setMonth(Number(e.target.value)) }} />
      </div>
    </div>
    <Leyenda />
  </section>
}

function Leyenda() {
  const v = variablePorId(useExplorerStore((s) => s.variable))
  const clorofila = v.mapa === 'clorofila' || v.mapa === 'monitor-clorofila'
  const [min, max] = clorofila
    ? v.mapa === 'monitor-clorofila' ? ['menos clorofila', 'más clorofila'] : ['poco fitoplancton', 'mucho fitoplancton (alimento)']
    : v.mapa === 'temperatura' ? ['más frío que lo normal', 'más caliente que lo normal']
      : v.modo === 'monitor' ? ['valor bajo en el monitor', 'valor alto en el monitor'] : ['por debajo de lo normal', 'por encima']
  const valores = [0.03, 0.1, 0.3, 1, 3, 10]
  return <div className="timeline-legend" aria-hidden="true">
    <span>{min}</span>
    <div className="ley-escala">
      <div className="rampa" style={{ background: clorofila ? 'var(--rampa)' : DEGRADADO_DIVERGE }} />
      <div className="ley-marcas">
        {clorofila && valores.map((x, k) => <span key={x} style={{ left: `${(tClorofila(x) * 100).toFixed(1)}%`, transform: k === 0 ? 'none' : k === valores.length - 1 ? 'translateX(-100%)' : undefined }}>{nf(x < 0.1 ? 2 : x < 1 ? 1 : 0).format(x)}</span>)}
        {v.mapa === 'temperatura' && <><span style={{ left: 0, transform: 'none' }}>−3 °C</span><span style={{ left: '50%' }}>0</span><span style={{ left: '100%', transform: 'translateX(-100%)' }}>+3 °C</span></>}
      </div>
    </div>
    <span>{max}</span>
  </div>
}
