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
import { AvisoEscenario, BotonVolver, ChipsVariables } from './comun'

const NUTRIENTES: readonly Nutriente[] = ['nitrato', 'fosfato', 'silicato']

/** Detalle de una zona: valor del mes, tendencia, serie, parecido con otras zonas y nutrientes */
export default function Zona({ z, nota }: { z: IdZona; nota?: NotaHistoria }) {
  const { modelo, mapaEstado } = useExplorer()
  const acciones = useAcciones()
  const { variable, month: i } = useExplorerStore()
  const v = variablePorId(variable)
  const p = modelo.zona(z)

  // serie observada (los meses de escenario van aparte, como banda y línea discontinua)
  const serie = useMemo(() => modelo.serieZona(z, v).map((y, k) => (modelo.esEscenario(k) ? null : y)).slice(modelo.i0, modelo.ultimo + 1), [modelo, z, v])
  const escenario = useMemo(() => {
    if (v.modo !== 'monitor' || modelo.inicioEscenario == null || !esPeru(z)) return undefined
    const tramo = (e: 'weak' | 'central' | 'intense') => modelo.serieEscenario(v.campo, e).slice(modelo.i0, modelo.ultimo + 1)
    const central = tramo('central')
    return central.some((x) => x != null) ? { central, debil: tramo('weak'), intenso: tramo('intense') } : undefined
  }, [modelo, v, z])

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

  return <>
    <BotonVolver />
    {nota && <div className="nota-historia"><b>{nota.titulo}</b><p>{nota.texto}</p></div>}
    <h2>{p.nombre}</h2>
    <div className="region">{p.region}</div>
    <AvisoEscenario />
    <div className="cifras">
      <div className="cifra"><b className="num">{x == null ? 'sin dato' : modelo.valorTxt(v, x)}</b><span>{etiquetaMes(modelo.mes(i))}{a ? `, ${a.frase}` : invierno ? ': invierno antártico, el satélite no ve el color del mar' : ''}</span></div>
      <div className="cifra"><b className="num">{tendencia}</b><span>tendencia por década (1998–{modelo.mes(modelo.ultimoObservado).anio})</span></div>
    </div>
    <div className="grafico" aria-label={`Serie mensual de ${v.nombre} en ${p.nombre}`}>
      <SerieMensual modelo={modelo} serie={serie} color={v.escala === 'rampa' ? '#3fc28c' : '#63cde8'} mesActual={i} alElegirMes={acciones.fijarMes} escenario={escenario} decimales={v.dec} />
    </div>
    <p className="nota">{v.fuente} Toca el gráfico para saltar a ese mes.</p>
    <h3>Cambiar el dato</h3>
    <ChipsVariables zona={z} />
    <h3>Saltar en el tiempo</h3>
    <div className="chips">
      <button className="chip" type="button" onClick={() => acciones.fijarMes(modelo.mesExtremo(z, v, null, 1))}>Su mes más alto</button>
      <button className="chip" type="button" onClick={() => acciones.fijarMes(modelo.mesExtremo(z, v, null, -1))}>Su mes más bajo</button>
      <button className="chip" type="button" onClick={() => acciones.fijarMes(modelo.idxMes(2023, 4))}>Mayo de 2023</button>
      {mapaEstado === 'listo' && v.mapa !== 'monitor-clorofila' && <button className="chip" type="button" onClick={() => { const m = modelo.mes(i); acciones.comparar({ region: esPeru(z) ? 'peru' : 'antartida', mes: m.mes, b: m.anio }) }}>Comparar dos años</button>}
    </div>
    <h3>¿Con quién se parece?</h3>
    {esRegional(v)
      ? <p>Este dato es de toda la región{v.modo === 'indice' ? ' antártica' : ' costera del Perú'}, no de cada zona por separado: no se compara entre zonas. Elige otro dato para ver las conexiones.</p>
      : <>
        <p>Las líneas del globo unen esta zona con las otras. Verde quiere decir que su {v.corto} sube y baja al mismo tiempo; naranja, que va al revés. {con[0] && <>La más parecida es <strong>{modelo.zona(con[0].o).nombre}</strong>.</>}</p>
        <ul className="conexiones">{con.map(({ o, r }) => <li key={o}><button type="button" onClick={() => acciones.irAZona(o)}>
          <span>{modelo.zona(o).nombre}</span>
          <span className="eje"><i style={{ width: `${Math.abs(r) * 100}%`, background: r >= 0 ? 'var(--fito)' : 'var(--nino)' }} /></span>
          <span className="r">{fmtR(r)}</span>
        </button></li>)}</ul>
      </>}
    <h3>Nutrientes en la superficie</h3>
    <div className="barras-nut">{NUTRIENTES.map((n) => {
      const m = media(nut[n] ?? [])
      return <div key={n}><span>{mayus(n)}</span><i style={{ width: `${m == null ? 0 : ((m / (maximos[n] || 1)) * 100).toFixed(0)}%` }} /><span className="valor">{m == null ? '—' : nf(1).format(m)}</span></div>
    })}</div>
    <p className="nota">Promedio histórico 1955–2022 en µmol/kg (World Ocean Atlas 2023).</p>
    {z === ZONA_REY_JORGE && <div className="acciones-relato"><button className="btn" type="button" onClick={acciones.base}>Ver la Base Machu Picchu</button></div>}
  </>
}

