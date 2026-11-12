import { useMemo } from 'react'
import { CartesianGrid, ComposedChart, Legend, ReferenceArea, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts'
import { nf } from '../../lib/formato'
import { useData } from '../../contexts/DataContext'
import type { Cruise } from '../../data/types'

const STOCKS: { id: Cruise['stock']; nombre: string; color: string }[] = [
  { id: 'toda_costa', nombre: 'Toda la costa', color: '#3fc28c' },
  { id: 'norte_centro', nombre: 'Región norte-centro', color: '#63cde8' },
  { id: 'sur', nombre: 'Región sur', color: '#f2e14c' },
]

/** Fecha "AAAA-MM(-DD)" como año con decimales */
const anioDecimal = (f: string): number => { const [a = 0, m = 1, d = 15] = f.split('-').map(Number); return a + (m - 1 + (d - 1) / 30) / 12 }
const mt = (t: number) => nf(2).format(t / 1e6)

/** Biomasa de anchoveta medida en cada crucero acústico de IMARPE */
export default function CrucerosSection({ id = 'cruceros', compacto = false, encabezado = true }: { id?: string; compacto?: boolean; encabezado?: boolean } = {}) {
  const { cruises, monitor } = useData()
  // franjas: meses seguidos con Niño 1+2 de +1 °C o más
  const ninos = useMemo(() => {
    const tramos: { de: number; a: number }[] = []
    for (const r of monitor?.records ?? []) {
      const n = r.nino12_anom_c
      const x = anioDecimal(r.date.slice(0, 7))
      if (typeof n !== 'number' || n < 1) continue
      const ultimo = tramos.at(-1)
      if (ultimo && x - ultimo.a < 0.1) ultimo.a = x + 1 / 12
      else tramos.push({ de: x, a: x + 1 / 12 })
    }
    return tramos
  }, [monitor])
  const puntos = useMemo(() => cruises.map((c) => ({ ...c, x: (anioDecimal(c.inicio) + anioDecimal(c.fin)) / 2, y: c.biomasa_t / 1e6 })), [cruises])
  if (!cruises.length) return null

  const norteCentro = cruises.filter((c) => c.stock === 'norte_centro')
  const minimo = norteCentro.reduce<Cruise | null>((m, c) => (!m || c.biomasa_t < m.biomasa_t ? c : m), null)
  const desde = Math.min(...norteCentro.map((c) => c.anio))
  const ordenados = [...cruises].sort((a, b) => a.inicio.localeCompare(b.inicio) || a.stock.localeCompare(b.stock))

  return <section className={`seccion${compacto ? ' cruceros-lateral' : ''}`} id={id} aria-labelledby={encabezado ? `t-${id}` : undefined} aria-label={encabezado ? undefined : 'Gráfico de biomasa de anchoveta por crucero de IMARPE'}>
    {encabezado && <div className="encabezado-seccion">
      <h2 id={`t-${id}`}>La anchoveta en los cruceros de IMARPE</h2>
      <p>Cada punto es la biomasa total de anchoveta que estimó un crucero acústico de IMARPE: toda la anchoveta que ve el barco, incluidos los juveniles. Las franjas naranjas marcan los meses en que el mar frente al norte del Perú (Niño 1+2) estuvo al menos 1 °C más cálido que lo normal. {minimo && <>En la región norte-centro, la cifra más baja desde {desde} es la del crucero {minimo.crucero}: <strong>{mt(minimo.biomasa_t)} millones de t</strong>{minimo.provisional ? ' (provisional)' : ''}.</>}</p>
    </div>}
    <div className="cruceros-grafico" role="img" aria-label="Biomasa de anchoveta por crucero de IMARPE, 1998 a 2026">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="rgba(36,80,122,.4)" />
          {ninos.map((n) => <ReferenceArea key={n.de} x1={n.de} x2={n.a} fill="rgba(240,138,75,.28)" stroke="none" />)}
          <XAxis type="number" dataKey="x" domain={[1998, 2027]} ticks={[1998, 2002, 2006, 2010, 2014, 2018, 2022, 2026]} tickFormatter={(x: number) => String(Math.floor(x))} tick={{ fill: '#a3bccb', fontSize: 12 }} stroke="rgba(36,80,122,.55)" />
          <YAxis type="number" dataKey="y" domain={[0, 'auto']} tick={{ fill: '#a3bccb', fontSize: 12 }} stroke="rgba(36,80,122,.55)" label={{ value: 'millones de t', angle: -90, fill: '#a3bccb', position: 'insideLeft' }} />
          <Tooltip contentStyle={{ background: 'rgba(7,30,51,.96)', border: '1px solid #24507a', borderRadius: 8 }} cursor={false}
            content={({ active, payload }) => {
              const c = active ? (payload?.[0]?.payload as (Cruise & { y: number }) | undefined) : undefined
              if (!c) return null
              return <div className="tip"><b>Crucero {c.crucero}</b><br />{c.area}: {mt(c.biomasa_t)} millones de t<br /><small>{c.inicio} a {c.fin}{c.fecha_aproximada ? ' (fechas aproximadas)' : ''}{c.provisional ? ' · cifra provisional' : ''}</small></div>
            }} />
          <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 12, color: '#a3bccb' }} />
          {STOCKS.map((s) => <Scatter key={s.id} name={s.nombre} data={puntos.filter((p) => p.stock === s.id)} fill={s.color} line={{ stroke: s.color, strokeOpacity: 0.35 }} isAnimationActive={false} />)}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
    <details className="cruceros-tabla">
      <summary>Ver los {cruises.length} registros y sus fuentes</summary>
      <div className="tabla-envoltura">
        <table className="fuentes">
          <thead><tr><th scope="col">Crucero</th><th scope="col">Fechas</th><th scope="col">Área</th><th scope="col">Biomasa (millones de t)</th><th scope="col">Fuente</th></tr></thead>
          <tbody>{ordenados.map((c) => <tr key={`${c.crucero}-${c.stock}`}>
            <td>{c.crucero}</td>
            <td className="num">{c.inicio} a {c.fin}{c.fecha_aproximada && <small> · aproximadas</small>}</td>
            <td>{c.area}</td>
            <td className="num">{mt(c.biomasa_t)}{c.provisional && <small> · provisional</small>}</td>
            <td><a href={c.enlace} target="_blank" rel="noreferrer">{c.fuente}</a></td>
          </tr>)}</tbody>
        </table>
      </div>
    </details>
    <p className="nota">Biomasa total por crucero (no es la biomasa desovante). Cuando el informe no da fechas exactas, se usa el día 15 de los meses del código del crucero. Las cifras marcadas como provisionales provienen de comunicados y pueden cambiar cuando IMARPE publique el informe.</p>
  </section>
}
