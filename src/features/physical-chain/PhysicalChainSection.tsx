import { useEffect, useState } from 'react'
import { CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import './physical-chain.css'

const LINKS = [
  { id: 'sst', name: 'Sea surface temperature', r: '+0.84', lag: 0, unit: '°C', depth: 'surface', detail: 'A warmer surface accompanies coastal El Niño.' },
  { id: 'seaLevel', name: 'Sea level', r: '+0.68', lag: 0, unit: 'm', depth: 'surface', detail: 'Higher sea level is another expression of El Niño, not an advance warning of chlorophyll change.' },
  { id: 'deepTemperature', name: 'Temperature at 100–200 m', r: '+0.64', lag: 2, unit: '°C', depth: 'deep', detail: 'Subsurface warming follows the surface signal by about 2 months.' },
  { id: 'deepOxygen', name: 'Oxygen at 100–200 m', r: '+0.60', lag: 0, unit: 'mmol/m³', depth: 'deep', detail: 'Oxygen increases at depth as the oxygen minimum zone sinks.' },
  { id: 'oxygen', name: 'Surface oxygen', r: '−0.66', lag: 1, unit: 'mmol/m³', depth: 'surface', detail: 'Surface oxygen decreases while oxygen at 100–200 m increases.' },
  { id: 'phosphate', name: 'Surface phosphate', r: '−0.54', lag: 2, unit: 'mmol/m³', depth: 'surface', detail: 'Lower surface phosphate accompanies warmer conditions.' },
  { id: 'chlorophyll', name: 'Chlorophyll (model)', r: '−0.32', lag: 0, unit: 'mg/m³', depth: 'surface', detail: 'Model chlorophyll decreases; this is distinct from the satellite chlorophyll used in Trends.' },
] as const
type RecordMonth = { month: string; nino: number | null } & Partial<Record<typeof LINKS[number]['id'], number | null>>

/** Corte de capas y series originales: los coeficientes publicados no se recalculan al seleccionar. */
export default function PhysicalChainSection() {
  const [selected, setSelected] = useState<typeof LINKS[number]>(LINKS[0])
  const [data, setData] = useState<RecordMonth[] | null>(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [tablePage, setTablePage] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    fetch('/assets/data/el-nino-chain.json', { signal: controller.signal }).then((r) => { if (!r.ok) throw new Error('data'); return r.json() }).then((d: { records: RecordMonth[] }) => { setData(d.records); setError(false) }).catch((e: Error) => { if (e.name !== 'AbortError') setError(true) })
    return () => controller.abort()
  }, [attempt])
  return <section className="seccion physical-chain" id="physical-chain" aria-labelledby="t-chain">
    <div className="encabezado-seccion"><h2 id="t-chain">El Niño, from the surface to depth</h2><p>Follow the ocean’s response off Peru. Select a link to compare its monthly anomaly with Niño 1+2 over 1998–2025. The coefficients describe associations in the Peru CMEMS panel.</p></div>
    <div className="chain-ocean">
      <div className="chain-origin"><span>Niño 1+2</span><p>Coastal warming</p></div>
      {(['surface', 'deep'] as const).map((depth) => <div className={`chain-layer chain-${depth}`} key={depth}>
        <h3>{depth === 'surface' ? 'Surface' : '100–200 m'}<span>{depth === 'surface' ? 'Heat, sea level and nutrients' : 'The oxygen minimum zone sinks'}</span></h3>
        <div className="chain-links" role="group" aria-label={`${depth} associations`}>{LINKS.filter((l) => l.depth === depth).map((l) => <button type="button" key={l.id} aria-pressed={selected.id === l.id} onClick={() => setSelected(l)}><span>{l.name}</span><strong>r = {l.r}</strong><small>{l.lag === 0 ? 'Same month' : `${l.lag}-month delay`}</small></button>)}</div>
      </div>)}
    </div>
    <div className="chain-series">
      <h3>{selected.name}</h3><p aria-live="polite">{selected.detail} Reported association: r = {selected.r}, {selected.lag === 0 ? 'same month' : `${selected.lag}-month delay`}.</p>
      {error ? <p role="alert">Monthly series could not be loaded. <button className="btn" onClick={() => setAttempt(attempt + 1)}>Retry loading</button></p> : !data ? <p role="status">Loading monthly series…</p> : <>
        <p className="chain-legend">Solid blue: {selected.name} ({selected.unit}, left axis). Dashed orange: Niño 1+2 (°C, right axis).</p>
        <div role="group" aria-label={`Monthly anomalies of ${selected.name} and Niño 1+2`}>
          <ResponsiveContainer width="100%" height={300}><ComposedChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 12 }}>
            <CartesianGrid stroke="rgba(163,188,203,.16)" /><XAxis dataKey="month" minTickGap={48} tick={{ fill: '#a3bccb', fontSize: 12 }} />
            <YAxis yAxisId="variable" width={48} tick={{ fill: '#63cde8', fontSize: 12 }} tickFormatter={(v: number) => new Intl.NumberFormat('en', { maximumFractionDigits: 2 }).format(v)} />
            <YAxis yAxisId="nino" orientation="right" width={40} tick={{ fill: '#f08a4b', fontSize: 12 }} />
            <Tooltip contentStyle={{ background: '#0c2c4a', border: '1px solid #24507a', borderRadius: 6 }} formatter={(v, name) => [`${new Intl.NumberFormat('en', { maximumFractionDigits: 3 }).format(Number(v))} ${name === 'Niño 1+2' ? '°C' : selected.unit}`, name]} />
            <Line yAxisId="variable" dataKey={selected.id} name={selected.name} stroke="#63cde8" dot={false} isAnimationActive={false} />
            <Line yAxisId="nino" dataKey="nino" name="Niño 1+2" stroke="#f08a4b" strokeDasharray="5 3" dot={false} isAnimationActive={false} />
          </ComposedChart></ResponsiveContainer>
        </div>
        <details><summary>View monthly values as a table</summary><div className="chain-table"><table><caption>Calendar-month anomalies; no lag applied</caption><thead><tr><th scope="col">Month</th><th scope="col">{selected.name} ({selected.unit})</th><th scope="col">Niño 1+2 (°C)</th></tr></thead><tbody>{data.slice(tablePage * 24, (tablePage + 1) * 24).map((r) => <tr key={r.month}><th scope="row">{r.month}</th><td>{r[selected.id] ?? 'Not available'}</td><td>{r.nino ?? 'Not available'}</td></tr>)}</tbody></table></div><div className="chain-pagination"><button className="btn" disabled={tablePage === 0} onClick={() => setTablePage(tablePage - 1)}>Previous months</button><span role="status">Page {tablePage + 1} of {Math.ceil(data.length / 24)}</span><button className="btn" disabled={(tablePage + 1) * 24 >= data.length} onClick={() => setTablePage(tablePage + 1)}>Next months</button></div></details>
      </>}
      <p className="nota">Both lines use calendar months, without shifting by the reported delay. Anomalies are departures from each month’s normal; axes use different units. Missing values remain gaps. Source: CMEMS reanalysis and NOAA PSL Niño 1+2.</p>
    </div>
    <p className="monitor-aviso">These links are well known; here they are confirmed with our own series. After controlling for El Niño, none of these variables explains chlorophyll on its own.</p>
    <p className="nota">All seven reported links pass FDR correction and retain their direction without 1998 and in both halves of the period. They describe the physical mechanism; they do not isolate an independent mediator or establish causation.</p>
  </section>
}
