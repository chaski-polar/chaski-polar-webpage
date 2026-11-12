import { useMemo } from 'react'
import { media, pendiente } from '../../../../lib/estadistica'
import { etiquetaMes, fmtR, mayus, nf, signo } from '../../../../lib/formato'
import { useExplorer } from '../../ExplorerContext'
import { useAcciones } from '../../hooks/useAcciones'
import { esPeru, ZONA_REY_JORGE } from '../../lib/modelo'
import type { NotaHistoria } from '../../lib/estado'
import type { IdZona, Nutriente } from '../../lib/tipos'
import { esRegional, variablePorId } from '../../lib/variables'
import { useExplorerStore } from '../../store'
import { SerieMensual } from '../SerieMensual'
import { BotonVolver, ChipsVariables } from './comun'

const NUTRIENTES: readonly Nutriente[] = ['nitrato', 'fosfato', 'silicato']

/** Detalle de una zona: valor del mes, tendencia, serie, parecido con otras zonas y nutrientes */
export default function Zona({ z, nota }: { z: IdZona; nota?: NotaHistoria }) {
  const { modelo, mapaEstado } = useExplorer()
  const acciones = useAcciones()
  const { section, variable, month: i } = useExplorerStore()
  const v = variablePorId(variable)
  const p = modelo.zona(z)

  const serie = useMemo(() => modelo.serieZona(z, v).slice(modelo.i0, modelo.ultimo + 1), [modelo, z, v])

  const tendencia = useMemo(() => {
    const anios: number[] = [], vals: (number | null)[] = []
    for (let y = 1998; y <= modelo.mes(modelo.ultimoObservado).anio; y++) {
      const t = serie.filter((_, k) => modelo.mes(modelo.i0 + k).anio === y)
      if (t.filter((q) => q != null).length >= 6) { anios.push(y); vals.push(media(t)) }
    }
    const pend = pendiente(anios, vals), m = media(vals)
    if (pend == null) return '—'
    return v.modo === 'log' ? `${signo(pend)}${nf(1).format(Math.abs(((pend * 10) / (m || 1)) * 100))} %` : `${signo(pend)}${nf(v.dec).format(Math.abs(pend * 10))} ${v.unidad}`
  }, [modelo, serie, v])

  const x = modelo.valorZona(z, v, i), a = modelo.anomaliaTxt(z, v, i)
  const invierno = x == null && !esPeru(z) && /clorofila|turbidez/.test(v.id) && [4, 5, 6, 7].includes(modelo.mes(i).mes)
  const nut = modelo.D.nutrientes[z] ?? {}
  const maximos = Object.fromEntries(NUTRIENTES.map((n) => [n, Math.max(...modelo.ids.map((k) => media(modelo.D.nutrientes[k]?.[n] ?? []) ?? 0))])) as Record<Nutriente, number>
  const con = modelo.conexionesDe(z, v)

  if (section === 'pacifico_sur') return <>
    <BotonVolver />
    <h2>{p.nombre}</h2>
    <div className="region">{p.region}</div>
    <p>This zone belongs to the loaded data domain, not to the South Pacific regional boxes. Its values are not shown as South Pacific values.</p>
  </>

  return <>
    <BotonVolver />
    {nota && <div className="nota-historia"><b>{nota.titulo}</b><p>{nota.texto}</p></div>}
    <h2>{p.nombre}</h2>
    <div className="region">{p.region}</div>
    <div className="cifras">
      <div className="cifra"><b className="num">{x == null ? 'no data' : modelo.valorTxt(v, x)}</b><span>{etiquetaMes(modelo.mes(i))}{a ? `, ${a.frase}` : invierno ? ': Antarctic winter; the satellite cannot see sea color' : ''}</span></div>
      <div className="cifra"><b className="num">{tendencia}</b><span>decade trend (1998–{modelo.mes(modelo.ultimoObservado).anio})</span></div>
    </div>
    <div className="grafico" aria-label={`Serie mensual de ${v.nombre} en ${p.nombre}`}>
      <SerieMensual modelo={modelo} serie={serie} color={v.escala === 'rampa' ? '#3fc28c' : '#63cde8'} mesActual={i} alElegirMes={acciones.fijarMes} decimales={v.dec} />
    </div>
    <p className="nota">{v.fuente} Period: {v.periodo}. Coverage: {v.cobertura}. Tap the chart to jump to that month.</p>
    {modelo.claveMonitor(z) && <div className="acciones-relato" style={{ marginTop: 10 }}><button className="btn" type="button" onClick={() => { useExplorerStore.getState().setMonitorZone(z); document.getElementById('monitor')?.scrollIntoView({ behavior: 'smooth' }) }}>View {p.nombre} in the monitor</button></div>}
    <h3>Change variable</h3>
    <ChipsVariables zona={z} />
    <h3>Jump in time</h3>
    <div className="chips">
      <button className="chip" type="button" onClick={() => acciones.fijarMes(modelo.mesExtremo(z, v, null, 1))}>Highest month</button>
      <button className="chip" type="button" onClick={() => acciones.fijarMes(modelo.mesExtremo(z, v, null, -1))}>Lowest month</button>
      <button className="chip" type="button" onClick={() => acciones.fijarMes(modelo.idxMes(2023, 4))}>May 2023</button>
      {mapaEstado === 'listo' && <button className="chip" type="button" onClick={() => { const m = modelo.mes(i); acciones.comparar({ region: esPeru(z) ? 'peru' : 'antartida', mes: m.mes, b: m.anio }) }}>Compare two years</button>}
    </div>
    <h3>What is it similar to?</h3>
    {esRegional(v)
      ? <p>This value represents the entire {v.modo === 'indice' ? 'Antarctic' : 'Peruvian coastal'} region, not each zone separately, so zones cannot be compared. Choose another variable to see connections.</p>
      : <>
        <p>Globe lines connect this zone to the others. Green means its {v.corto} rises and falls together; orange means the opposite. {con[0] && <>The most similar is <strong>{modelo.zona(con[0].o).nombre}</strong>.</>}</p>
        <ul className="conexiones">{con.map(({ o, r }) => <li key={o}><button type="button" onClick={() => acciones.irAZona(o)}>
          <span>{modelo.zona(o).nombre}</span>
          <span className="eje"><i style={{ width: `${Math.abs(r) * 100}%`, background: r >= 0 ? 'var(--fito)' : 'var(--nino)' }} /></span>
          <span className="r">{fmtR(r)}</span>
        </button></li>)}</ul>
      </>}
    <h3>Surface nutrients</h3>
    <div className="barras-nut">{NUTRIENTES.map((n) => {
      const m = media(nut[n] ?? [])
      return <div key={n}><span>{mayus(n)}</span><i style={{ width: `${m == null ? 0 : ((m / (maximos[n] || 1)) * 100).toFixed(0)}%` }} /><span className="valor">{m == null ? '—' : nf(1).format(m)}</span></div>
    })}</div>
    <p className="nota">Historical average 1955–2022 in µmol/kg (World Ocean Atlas 2023).</p>
    {z === ZONA_REY_JORGE && <div className="acciones-relato"><button className="btn" type="button" onClick={acciones.base}>View Machu Picchu Base</button></div>}
  </>
}

