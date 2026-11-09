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

  if (!capa) return <><BotonVolver /><p>Elige fitoplancton o temperatura para comparar dos años.</p></>
  const esChl = capa.esClorofila
  const va = mapa.promedioRegion(capa, reg, miDe(a), comparison.mes), vb = mapa.promedioRegion(capa, reg, miDe(b), comparison.mes)
  const mesN = MESES_LARGOS[comparison.mes] ?? ''
  const nomA = a === 'prom' ? `Un ${mesN} promedio` : `${mayus(mesN)} de ${a}`
  const nomB = `${mayus(mesN)} de ${b}`
  const fmtV = (x: number | null) => (x == null ? 'sin dato' : esChl ? `${nf(x < 1 ? 2 : 1).format(x)} mg/m³ en promedio` : `${signo(x)}${nf(1).format(Math.abs(x))} °C frente a lo normal`)
  let conclusion = null
  if (va != null && vb != null) {
    if (esChl) { const p = (vb / va - 1) * 100; conclusion = <>En {nomB.toLowerCase()}, {reg.frase} tuvo <strong>{nf(0).format(Math.abs(p))} % {p >= 0 ? 'más' : 'menos'} clorofila</strong> que en {nomA.toLowerCase()}, en promedio de todas sus celdas con dato.</> }
    else { const d = vb - va; conclusion = <>Frente a lo normal, en {nomB.toLowerCase()} {reg.mar} estuvo en promedio <strong>{nf(1).format(Math.abs(d))} °C {d >= 0 ? 'más cálido' : 'más frío'}</strong> que en {nomA.toLowerCase()}.</> }
  }
  const opciones = (conPromedio: boolean) => <>{conPromedio && esChl && <option value="prom">Promedio 1998–2020</option>}{anios.map((x) => <option key={x} value={x}>{x}</option>)}</>

  return <>
    <BotonVolver />
    <h2>Comparar dos años</h2>
    <p>El mismo mes en dos años distintos, celda por celda. {esChl ? 'Los colores son los del mapa del globo: amarillo y verde es mucho fitoplancton; morado, poco.' : 'Naranja es más cálido que lo normal; azul, más frío.'} El gris es un mes sin dato (nubes o hielo) y el verde grisáceo, tierra.</p>
    <div className="selectores">
      <label>Lugar<select value={comparison.region} onChange={(e) => acciones.comparar({ region: e.target.value as IdRegion })}>{Object.entries(REGIONES).map(([k, r]) => <option key={k} value={k}>{r.nombre}</option>)}</select></label>
      <label>Mes<select value={comparison.mes} onChange={(e) => acciones.comparar({ mes: Number(e.target.value) })}>{MESES_LARGOS.map((m, k) => <option key={m} value={k}>{m}</option>)}</select></label>
      <label>Mapa de la izquierda<select value={String(a)} onChange={(e) => acciones.comparar({ a: e.target.value === 'prom' ? 'prom' : Number(e.target.value) })}>{opciones(true)}</select></label>
      <label>Mapa de la derecha<select value={b} onChange={(e) => acciones.comparar({ b: Number(e.target.value) })}>{opciones(false)}</select></label>
    </div>
    <div className="comparar">
      <figure><canvas ref={izquierda} role="img" aria-label={`Mapa de ${nomA.toLowerCase()}: ${fmtV(va)}`} /><figcaption><b>{nomA}</b>{fmtV(va)}</figcaption></figure>
      <figure><canvas ref={derecha} role="img" aria-label={`Mapa de ${nomB.toLowerCase()}: ${fmtV(vb)}`} /><figcaption><b>{nomB}</b>{fmtV(vb)}</figcaption></figure>
    </div>
    <p>{conclusion}</p>
    <div className="chips">
      <button className="chip" type="button" aria-pressed={capa.clave === 'clorofila'} onClick={() => setVariable('clorofila_mg_m3')}>Fitoplancton</button>
      <button className="chip" type="button" aria-pressed={capa.clave === 'temperatura'} onClick={() => setVariable('temperatura_superficial_C')}>Temperatura</button>
      <button className="chip" type="button" onClick={() => acciones.fijarMes(modelo.idxMes(b, comparison.mes))}>Ver {nomB.toLowerCase()} en el globo</button>
    </div>
    <p className="nota" style={{ marginTop: 16 }}>{esChl ? 'Clorofila-a de ESA OC-CCI v6 en celdas de medio grado; el promedio es la media geométrica de 1998 a 2020.' : 'Anomalía de la temperatura de NOAA Coral Reef Watch en celdas de un grado, frente al promedio 1998–2020 de cada mes.'}</p>
  </>
}
