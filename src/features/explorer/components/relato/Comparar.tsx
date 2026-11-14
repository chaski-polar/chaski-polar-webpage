import { useEffect, useRef } from 'react'
import { MESES_LARGOS, mayus, nf, signo } from '../../../../lib/formato'
import { useExplorer } from '../../ExplorerContext'
import { useAcciones } from '../../hooks/useAcciones'
import type { IdRegion } from '../../lib/estado'
import { REGIONES, type CapaMapa } from '../../lib/mapa'
import type { Modelo } from '../../lib/modelo'
import { variablePorId } from '../../lib/variables'
import { useExplorerStore } from '../../store'
import { BotonVolver } from './comun'

/** Años que tiene el mapa del satélite para un mes */
function aniosDisponibles(modelo: Modelo, mes: number, capa: CapaMapa): number[] {
  const fin = modelo.mes(capa.i0 + capa.nM - 1).anio
  return Array.from({ length: fin - 1998 + 1 }, (_, k) => 1998 + k).filter((a) => { const i = modelo.idxMes(a, mes); return i >= 0 && i - capa.i0 < capa.nM })
}

/** El mismo mes en dos años distintos, celda por celda */
export default function Comparar() {
  const { modelo, mapa } = useExplorer()
  const acciones = useAcciones()
  const { variable, comparison, setVariable } = useExplorerStore()
  const capa = mapa.capaDe(variablePorId(variable))
  const izquierda = useRef<HTMLCanvasElement>(null), derecha = useRef<HTMLCanvasElement>(null)

  // los años elegidos tienen que existir en el mapa (la temperatura no tiene "promedio")
  const anios = capa ? aniosDisponibles(modelo, comparison.mes, capa) : []
  const a = capa && !capa.esClorofila && comparison.a === 'prom' ? 2013 : comparison.a
  const b = anios.includes(comparison.b) ? comparison.b : anios.at(-1) ?? 2023
  const reg = REGIONES[comparison.region]
  const miDe = (x: number | 'prom'): number | 'prom' => (x === 'prom' || !capa ? 'prom' : modelo.idxMes(x, comparison.mes) - capa.i0)

  useEffect(() => {
    if (!capa) return
    if (izquierda.current) mapa.dibujarRegion(izquierda.current, capa, reg, miDe(a), comparison.mes)
    if (derecha.current) mapa.dibujarRegion(derecha.current, capa, reg, miDe(b), comparison.mes)
  })

  if (!capa) return <><BotonVolver /><p>Choose phytoplankton or temperature to compare two years.</p></>
  const esChl = capa.esClorofila
  const va = mapa.promedioRegion(capa, reg, miDe(a), comparison.mes), vb = mapa.promedioRegion(capa, reg, miDe(b), comparison.mes)
  const mesN = MESES_LARGOS[comparison.mes] ?? ''
  const nomA = a === 'prom' ? `An average ${mesN}` : `${mayus(mesN)} ${a}`
  const nomB = `${mayus(mesN)} ${b}`
  const fmtV = (x: number | null) => (x == null ? 'Not available' : esChl ? `${nf(x < 1 ? 2 : 1).format(x)} mg/m³ on average` : `${signo(x)}${nf(1).format(Math.abs(x))} °C from normal`)
  let conclusion = null
  if (va != null && vb != null) {
    if (esChl) { const p = (vb / va - 1) * 100; conclusion = <>In {nomB}, {reg.frase} had <strong>{nf(0).format(Math.abs(p))}% {p >= 0 ? 'more' : 'less'} chlorophyll</strong> than in {nomA}, averaged over cells with data.</> }
    else { const d = vb - va; conclusion = <>In {nomB}, {reg.mar} was on average <strong>{nf(1).format(Math.abs(d))} °C {d >= 0 ? 'warmer' : 'colder'}</strong> than in {nomA}, relative to normal.</> }
  }
  const opciones = (conPromedio: boolean) => <>{conPromedio && esChl && <option value="prom">Average 1998–2020</option>}{anios.map((x) => <option key={x} value={x}>{x}</option>)}</>

  return <>
    <BotonVolver />
    <h2>Compare two years</h2>
    <p>The same month in two different years, cell by cell. {esChl ? 'The colors match the globe map: yellow and green mean lots of phytoplankton; purple, little.' : 'Orange is warmer than normal; blue, colder.'} Gray means no data for the month (clouds or ice), and gray-green means land.</p>
    <div className="selectores">
      <label>Place<select value={comparison.region} onChange={(e) => acciones.comparar({ region: e.target.value as IdRegion })}>{Object.entries(REGIONES).map(([k, r]) => <option key={k} value={k}>{r.nombre}</option>)}</select></label>
      <label>Month<select value={comparison.mes} onChange={(e) => acciones.comparar({ mes: Number(e.target.value) })}>{MESES_LARGOS.map((m, k) => <option key={m} value={k}>{m}</option>)}</select></label>
      <label>Left map<select value={String(a)} onChange={(e) => acciones.comparar({ a: e.target.value === 'prom' ? 'prom' : Number(e.target.value) })}>{opciones(true)}</select></label>
      <label>Right map<select value={b} onChange={(e) => acciones.comparar({ b: Number(e.target.value) })}>{opciones(false)}</select></label>
    </div>
    <div className="comparar">
      <figure><canvas ref={izquierda} role="img" aria-label={`Map of ${nomA.toLowerCase()}: ${fmtV(va)}`} /><figcaption><b>{nomA}</b>{fmtV(va)}</figcaption></figure>
      <figure><canvas ref={derecha} role="img" aria-label={`Map of ${nomB.toLowerCase()}: ${fmtV(vb)}`} /><figcaption><b>{nomB}</b>{fmtV(vb)}</figcaption></figure>
    </div>
    <p>{conclusion}</p>
    <div className="chips">
      <button className="chip" type="button" aria-pressed={capa.clave === 'clorofila'} onClick={() => setVariable('clorofila_mg_m3')}>Phytoplankton</button>
      <button className="chip" type="button" aria-pressed={capa.clave === 'temperatura'} onClick={() => setVariable('temperatura_superficial_C')}>Temperature</button>
      <button className="chip" type="button" onClick={() => acciones.fijarMes(modelo.idxMes(b, comparison.mes))}>View {nomB.toLowerCase()} on the globe</button>
    </div>
    <p className="nota" style={{ marginTop: 16 }}>{esChl ? 'ESA OC-CCI v6 chlorophyll-a in half-degree cells; the average is the geometric mean from 1998 to 2020.' : 'NOAA Coral Reef Watch temperature anomaly in one-degree cells, relative to the 1998–2020 average for each month.'}</p>
  </>
}
