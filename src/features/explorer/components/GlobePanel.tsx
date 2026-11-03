import { useMemo, useRef } from 'react'
import Globe from 'react-globe.gl'
import { useData } from '../../../contexts/DataContext'
import type { PredictionRow } from '../../../data/types'
import { formatValue, getMonthLabel, predictionValueFor, timelineMax, valueFor, variableLabels, variableUnits } from '../model'
import { useExplorerStore, type ExplorerVariable } from '../store'
import { useLegacyAtlas } from '../hooks/useLegacyAtlas'

const variableOptions: Array<{ value: ExplorerVariable; label: string }> = [
  { value: 'clorofila_mg_m3', label: 'Fitoplancton (clorofila-a)' },
  { value: 'temperatura_superficial_C', label: 'Temperatura del mar' },
  { value: 'hielo', label: 'Hielo marino antártico' },
]

export default function GlobePanel() {
  const { data, predictions } = useData()
  const globeRef = useRef<any>(null)
  useLegacyAtlas(globeRef)
  const { variable, month, selectedZone, setVariable, setMonth, setSelectedZone } = useExplorerStore()

  const zones = useMemo(() => data ? Object.entries(data.zonas) : [], [data])
  const monthLabel = data ? getMonthLabel(data, month) : '—'
  const futureValue = predictionValueFor(predictions, variable, monthLabel)
  const points = useMemo(() => zones.map(([key, zone]) => ({
    ...zone,
    key,
    measurement: valueFor(data!, key, variable, month) ?? futureValue ?? 0,
  })), [data, futureValue, month, variable, zones])
  const max = Math.max(...points.map((point) => Math.abs(point.measurement)), 1)
  const selected = selectedZone ? data?.zonas[selectedZone] : null
  const selectedSeries = selectedZone ? data?.series[selectedZone] : null
  const selectedNutrients = selectedZone ? data?.nutrientes?.[selectedZone] : null
  const maxMonth = timelineMax(data!, predictions)

  if (!data) return <section className="escenario"><div className="lienzo-globo"><p className="globe-status">Cargando el atlas y las zonas de estudio…</p></div></section>

  return <section className="escenario" aria-label="Explorador del globo">
    <div className="lienzo-globo">
      <Globe
        ref={globeRef}
        width={undefined}
        height={undefined}
        backgroundColor="rgba(0,0,0,0)"
        globeImageUrl="/assets/globe/earth-blue-marble.jpg"
        showAtmosphere
        atmosphereColor="#4a8fbf"
        atmosphereAltitude={0.14}
        pointsData={points}
        pointLat="lat"
        pointLng="lon"
        pointLabel={(point: any) => `<b>${point.nombre}</b><br/>${point.region}<br/>${variableLabels[variable]}: ${formatValue(point.measurement)}`}
        pointColor={(point: any) => point.key === selectedZone ? '#eaf3f5' : variable === 'temperatura_superficial_C' ? `hsl(${205 - Math.round(Math.abs(point.measurement) / max * 165)} 78% 62%)` : `hsl(${165 - Math.round(Math.abs(point.measurement) / max * 110)} 62% 56%)`}
        pointRadius={(point: any) => point.key === selectedZone ? 1.2 : 0.7}
        pointAltitude={(point: any) => point.key === selectedZone ? 0.045 : 0.02}
        onPointClick={(point: any) => setSelectedZone(point.key)}
      />
      <div className="mando" role="group" aria-label="Controles del globo">
        <label className="fila var">Dato<select value={variable} onChange={(event) => setVariable(event.target.value as ExplorerVariable)}>{variableOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label className="fila tiempo">Mes<input type="range" min="0" max={maxMonth} value={Math.min(month, maxMonth)} onChange={(event) => setMonth(Number(event.target.value))} /></label>
        <span className="mes-actual num">{monthLabel}{futureValue != null ? ' · escenario central' : ''}</span>
        <div className="zonas-inferior" role="group" aria-label="Zonas de estudio">{zones.map(([key, zone]) => <button key={key} className="zona-punto" type="button" aria-pressed={selectedZone === key} onClick={() => setSelectedZone(key)}><span className="punto" />{zone.nombre}</button>)}</div>
        <div className="leyenda"><span>menos que lo normal</span><div className="rampa" /><span>más que lo normal</span></div>
      </div>
    </div>
    <aside className="relato"><div className="relato-contenido">
      {selected ? <ZoneDetails data={data} zoneKey={selectedZone!} month={month} variable={variable} series={selectedSeries ?? undefined} nutrients={selectedNutrients ?? undefined} predictions={predictions} onBack={() => setSelectedZone(null)} /> : <ZoneIndex zones={zones} month={month} variable={variable} data={data} onSelect={setSelectedZone} />}
    </div></aside>
  </section>
}

function ZoneIndex({ zones, data, month, variable, onSelect }: { zones: Array<[string, any]>; data: any; month: number; variable: ExplorerVariable; onSelect: (key: string) => void }) {
  return <><h2>Datos del globo</h2><p>Selecciona una zona para consultar sus señales ambientales y pesqueras.</p><h3>Las {zones.length} zonas</h3><ul className="lista-zonas">{zones.map(([key, zone]) => <li key={key}><button className="fila-zona" type="button" onClick={() => onSelect(key)}><span className="punto" /><span>{zone.nombre}<small>{zone.region}</small></span><span className="valor num">{formatValue(valueFor(data, key, variable, month))}</span></button></li>)}</ul></>
}

function ZoneDetails({ data, zoneKey, month, variable, series, nutrients, predictions, onBack }: { data: any; zoneKey: string; month: number; variable: ExplorerVariable; series?: Record<string, any>; nutrients?: Record<string, number[]>; predictions: PredictionRow[]; onBack: () => void }) {
  const zone = data.zonas[zoneKey]
  const selectedValue = valueFor(data, zoneKey, variable, month) ?? predictionValueFor(predictions, variable, getMonthLabel(data, month))
  return <><button className="volver" type="button" onClick={onBack}>← Volver al resumen</button><h2>{zone.nombre}</h2><p className="region">{zone.region} · {getMonthLabel(data, month)}</p><h3>Dato seleccionado</h3><div className="cifras"><div className="cifra"><b className="num">{formatValue(selectedValue)}</b><span>{variableLabels[variable]} · {variableUnits[variable]}{selectedValue != null && valueFor(data, zoneKey, variable, month) == null ? ' · escenario central' : ''}</span></div></div><h3>Dataset mensual</h3><div className="metric-grid">{Object.entries(series || {}).map(([key, values]) => <div className="metric-row" key={key}><span>{key}</span><b className="num">{formatValue((values as any[])?.[month])}</b></div>)}</div><h3>Nutrientes históricos</h3><div className="metric-grid">{Object.entries(nutrients || {}).map(([key, values]) => <div className="metric-row" key={key}><span>{key}</span><b className="num">{formatValue((values as number[]).reduce((sum, value) => sum + value, 0) / (values as number[]).length)}</b></div>)}</div><h3>Escenarios</h3>{predictions.length ? <div className="prediction-table">{predictions.filter((row) => row.scenario === 'central').slice(0, 6).map((row, index) => <details className="prediction-card" key={`${String(row.scenario)}-${index}`}><summary>{String(row.scenario || 'Escenario')} · {String(row.date || row.horizon_month || '')}</summary>{Object.entries(row).map(([key, value]) => <div className="metric-row" key={key}><span>{key}</span><b className="num">{typeof value === 'number' ? value.toFixed(2) : value == null ? 'sin dato' : String(value)}</b></div>)}</details>)}</div> : <p className="nota">No hay escenarios disponibles.</p>}</>
}
