import { useEffect, useMemo } from 'react'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import type { PredictionRow, ProjectData } from '../../../data/types'
import { formatValue, getMonthLabel, predictionValueFor, timelineMax, timelineSeries, variableLabels, variableUnits } from '../model'
import { useExplorerStore, type ExplorerVariable } from '../store'

type Props = {
  data: ProjectData
  predictions: PredictionRow[]
}

const options: Array<{ value: ExplorerVariable; label: string }> = [
  { value: 'clorofila_mg_m3', label: 'Fitoplancton (clorofila-a)' },
  { value: 'temperatura_superficial_C', label: 'Temperatura del mar' },
  { value: 'hielo', label: 'Hielo marino antártico' },
]

const events = [
  { month: 60, label: '1998' },
  { month: 228, label: '2016' },
  { month: 240, label: '2017' },
  { month: 312, label: '2023' },
]

export function TimelinePanel({ data, predictions }: Props) {
  const { variable, month, playing, setVariable, setMonth, setPlaying } = useExplorerStore()
  const maxMonth = timelineMax(data, predictions)
  const safeMonth = Math.min(month, maxMonth)
  const series = useMemo(() => timelineSeries(data, predictions, variable), [data, predictions, variable])
  const monthLabel = getMonthLabel(data, safeMonth)

  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => {
      const current = useExplorerStore.getState().month
      if (current >= maxMonth) {
        setPlaying(false)
        return
      }
      setMonth(current + 1)
    }, 320)
    return () => window.clearInterval(timer)
  }, [maxMonth, playing, setMonth, setPlaying])

  return <section className="timeline-panel" aria-label="Línea de tiempo del globo">
    <div className="timeline-topline">
      <label className="timeline-variable"><span>Dato</span><select value={variable} onChange={(event) => setVariable(event.target.value as ExplorerVariable)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <strong className="timeline-date">{monthLabel}{predictionValueFor(predictions, variable, monthLabel) != null ? ' · escenario central' : ''}</strong>
    </div>
    <div className="timeline-controls">
      <button className="play-button" type="button" aria-label={playing ? 'Pausar animación' : 'Reproducir meses'} onClick={() => setPlaying(!playing)}>{playing ? 'Ⅱ' : '▶'}</button>
      <div className="timeline-track">
        <div className="timeline-events" aria-hidden="true">{events.filter((event) => event.month <= maxMonth).map((event) => <span key={event.label} style={{ left: `${(event.month / maxMonth) * 100}%` }}>{event.label}</span>)}</div>
        <div className="timeline-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={series} margin={{ top: 14, right: 0, bottom: 0, left: 0 }}><XAxis dataKey="month" hide /><Tooltip cursor={false} formatter={(value) => [formatValue(value), variableLabels[variable]]} labelFormatter={(value) => getMonthLabel(data, Number(value))} /><Bar dataKey="value" fill="#f08a4b" isAnimationActive={false} /></BarChart></ResponsiveContainer></div>
        <input className="timeline-range" type="range" min={0} max={maxMonth} step={1} value={safeMonth} aria-label="Mes" onChange={(event) => { setPlaying(false); setMonth(Number(event.target.value)) }} />
      </div>
    </div>
    <div className="timeline-legend"><span>poco {variableLabels[variable].toLowerCase()}</span><div className="timeline-gradient" /><span>mucho {variableLabels[variable].toLowerCase()} ({variableUnits[variable]})</span></div>
  </section>
}
