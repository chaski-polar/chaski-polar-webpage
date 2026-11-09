import { useMemo, useState } from 'react'
import { Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts'
import { media } from '../../lib/estadistica'
import { claveMes } from '../../lib/formato'
import { useExplorer } from '../explorer/ExplorerContext'
import type { CampoMonitor } from '../explorer/lib/tipos'

const VARIABLES: { campo: CampoMonitor; nombre: string; unidad: string; color: string; dec: number }[] = [
  { campo: 'chlorophyll_a_mg_m3', nombre: 'Clorofila-a / fitoplancton', unidad: 'mg/m³', color: '#3fc28c', dec: 2 },
  { campo: 'sst_c', nombre: 'Temperatura superficial', unidad: '°C', color: '#f08a4b', dec: 1 },
  { campo: 'nitrate_mmol_m3', nombre: 'Nitrato', unidad: 'mmol/m³', color: '#63cde8', dec: 2 },
  { campo: 'phytoplankton_carbon_mg_c_m3', nombre: 'Carbono fitoplanctónico', unidad: 'mg C/m³', color: '#a9dc6e', dec: 2 },
  { campo: 'nino12_anom_c', nombre: 'Anomalía Niño 1+2', unidad: '°C', color: '#ff9a62', dec: 1 },
  { campo: 'biomass_total_t', nombre: 'Biomasa observada en cruceros', unidad: 't', color: '#eaf3f5', dec: 0 },
]

const fmt = (x: unknown, dec: number): string => {
  if (Array.isArray(x)) return x.map((y) => fmt(y, dec)).join(' – ')
  return typeof x === 'number' ? new Intl.NumberFormat('es', { maximumFractionDigits: dec }).format(x) : 'sin dato'
}

/** Monitor de condiciones: serie mensual de la costa peruana y, al final, los escenarios de El Niño */
export default function MonitorSection() {
  const { modelo } = useExplorer()
  const [campo, setCampo] = useState<CampoMonitor>('chlorophyll_a_mg_m3')
  const [anomalia, setAnomalia] = useState(false)
  const registros = modelo.registrosMonitor
  const v = VARIABLES.find((x) => x.campo === campo) ?? VARIABLES[0]!
  const esBiomasa = campo === 'biomass_total_t'

  const { datos, conDato, hayEscenario } = useMemo(() => {
    const primero = registros[0]
    const inicio = primero ? modelo.idxMes(Number(primero.date.slice(0, 4)), Number(primero.date.slice(5, 7)) - 1) : modelo.i0
    const meses = modelo.meses.slice(inicio).map((_, k) => inicio + k)
    const linea: CampoMonitor = esBiomasa ? 'biomass_total_t_interpolated' : campo
    // anomalía: diferencia con el promedio de cada mes calendario (solo meses observados)
    const normal = Array.from({ length: 12 }, (_, m) => media(meses.filter((i) => modelo.mes(i).mes === m && !modelo.esEscenario(i)).map((i) => modelo.registroMonitor(i)?.[campo])))
    const ajustar = (x: number | null | undefined, i: number) => {
      if (x == null) return null
      if (!anomalia) return x
      const n = normal[modelo.mes(i).mes]
      return n == null ? null : x - n
    }
    const central = modelo.serieEscenario(campo, 'central'), debil = modelo.serieEscenario(campo, 'weak'), intenso = modelo.serieEscenario(campo, 'intense')
    const datos = meses.map((i) => {
      const r = modelo.registroMonitor(i)
      const d = ajustar(debil[i], i), n = ajustar(intenso[i], i)
      return {
        mes: claveMes(modelo.mes(i)),
        valor: ajustar(r?.[linea], i),
        observada: esBiomasa && r?.biomass_observed ? ajustar(r.biomass_total_t, i) : null,
        central: ajustar(central[i], i),
        banda: d != null && n != null ? [Math.min(d, n), Math.max(d, n)] : null,
      }
    })
    return { datos, conDato: datos.filter((d) => d.valor != null).length, hayEscenario: central.some((x) => x != null) }
  }, [modelo, registros, campo, anomalia, esBiomasa])

  if (!registros.length) return null
  const ultimo = modelo.ultimoMonitor(esBiomasa ? 'biomass_total_t_interpolated' : campo)
  const nino = modelo.ultimoMonitor('nino12_anom_c')
  const nEscenario = datos.length - registros.length

  return <section className="seccion">
    <div className="monitor" id="monitor" aria-labelledby="t-monitor">
      <div className="monitor-cabecera">
        <div>
          <h2 id="t-monitor">Monitor de condiciones</h2>
          <p>La señal ambiental mensual frente a la costa peruana: temperatura, clorofila, nutrientes, Niño 1+2 y biomasa observada en cruceros. Al final se suman escenarios de El Niño hasta febrero de 2027.</p>
        </div>
        <span className="monitor-meta">{registros[0]?.date.slice(0, 7)} → {registros.at(-1)?.date.slice(0, 7)} · {registros.length} meses{nEscenario > 0 ? ` + ${nEscenario} de escenario` : ''}</span>
      </div>
      <div className="monitor-controles" role="group" aria-label="Filtros del monitor">
        <label>Variable <select value={campo} onChange={(e) => setCampo(e.target.value as CampoMonitor)}>{VARIABLES.map((x) => <option key={x.campo} value={x.campo}>{x.nombre}</option>)}</select></label>
        <label>Escala <select value={anomalia ? 'anomaly' : 'absolute'} onChange={(e) => setAnomalia(e.target.value === 'anomaly')}><option value="absolute">Valores</option><option value="anomaly">Anomalía frente al promedio mensual</option></select></label>
      </div>
      <p className="monitor-estado" aria-live="polite">
        {conDato} de {registros.length} meses con dato para {v.nombre.toLowerCase()}. {esBiomasa ? 'La línea une observaciones de crucero solo para visualización; los puntos claros son los meses observados.' : 'La serie ambiental es continua dentro del periodo descargado.'}
        {hayEscenario && ' La línea discontinua naranja son escenarios de El Niño (septiembre de 2026 a febrero de 2027), no observaciones.'}
      </p>
      <div className="monitor-grafico" role="img" aria-label="Serie mensual del monitor ambiental">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={datos} margin={{ top: 6, right: 8, bottom: 0, left: 4 }}>
            <CartesianGrid vertical={false} stroke="rgba(36,80,122,.4)" />
            <XAxis dataKey="mes" tick={{ fill: '#a3bccb', fontSize: 12 }} stroke="rgba(36,80,122,.55)" minTickGap={60} />
            <YAxis tick={{ fill: '#a3bccb', fontSize: 12 }} stroke="rgba(36,80,122,.55)" tickFormatter={(x: number) => fmt(x, v.dec)} width={72} />
            <Tooltip contentStyle={{ background: 'rgba(7,30,51,.96)', border: '1px solid #24507a', borderRadius: 8 }} formatter={(x, n) => [fmt(x, v.dec), String(n)]} />
            <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 12, color: '#a3bccb' }} />
            <Area dataKey="valor" name={`${v.nombre} (${anomalia ? `${v.unidad} · anomalía mensual` : v.unidad})`} stroke={v.color} fill={`${v.color}22`} strokeWidth={2} isAnimationActive={false} />
            {esBiomasa && <Scatter dataKey="observada" name="Observada en crucero" fill="#eaf3f5" isAnimationActive={false} />}
            {hayEscenario && <Area dataKey="banda" name="Escenarios débil a intenso" stroke="none" fill="rgba(240,138,75,0.22)" isAnimationActive={false} />}
            {hayEscenario && <Line dataKey="central" name="Escenario central de El Niño" stroke="#f08a4b" strokeDasharray="5 4" strokeWidth={2} dot={false} isAnimationActive={false} />}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="monitor-notas" aria-label="Resumen del monitor">
        <div className="monitor-nota"><b>{ultimo ? `${fmt(ultimo[esBiomasa ? 'biomass_total_t_interpolated' : campo], v.dec)} ${v.unidad}` : '—'}</b><span>último valor observado</span></div>
        <div className="monitor-nota"><b>{registros.filter((r) => r.biomass_observed).length}</b><span>meses con biomasa observada</span></div>
        <div className="monitor-nota"><b>{nino ? `${fmt(nino.nino12_anom_c, 1)} °C` : '—'}</b><span>Niño 1+2 en el último mes observado</span></div>
      </div>
      <p className="monitor-aviso"><strong>Cómo leerlo:</strong> las variables ambientales provienen de reanálisis/modelos y OC-CCI; la biomasa solo aparece durante intervalos de crucero IMARPE. Los escenarios de El Niño se construyen con la climatología mensual y las pendientes históricas frente al ICEN: no son observaciones ni pronósticos. Este monitor describe asociaciones y cobertura de datos, no es una alerta ni una predicción pesquera.</p>
    </div>
  </section>
}
