import { useMemo, useState } from 'react'
import { Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts'
import { media } from '../../lib/estadistica'
import { claveMes } from '../../lib/formato'
import { useExplorer } from '../explorer/ExplorerContext'
import type { Modelo } from '../explorer/lib/modelo'
import type { CampoMonitor, CampoSerieMonitor, IdZona } from '../explorer/lib/tipos'
import { esPeru } from '../explorer/lib/modelo'
import { useExplorerStore } from '../explorer/store'

type VariableMonitor = {
  campo: CampoSerieMonitor
  /** campo con la anomalía ya calculada (si no hay, se calcula frente al promedio de cada mes) */
  anomalia?: CampoSerieMonitor
  nombre: string
  unidad: string
  unidadAnomalia?: string
  color: string
  dec: number
  grupo?: string
}

const REGIONALES: VariableMonitor[] = [
  { campo: 'chlorophyll_a_mg_m3', nombre: 'Clorofila-a / fitoplancton', unidad: 'mg/m³', color: '#3fc28c', dec: 2 },
  { campo: 'sst_c', nombre: 'Temperatura superficial', unidad: '°C', color: '#f08a4b', dec: 1 },
  { campo: 'sss_psu', nombre: 'Salinidad', unidad: 'PSU', color: '#9fe0f2', dec: 2 },
  { campo: 'nitrate_mmol_m3', nombre: 'Nitrato', unidad: 'mmol/m³', color: '#63cde8', dec: 2 },
  { campo: 'phosphate_mmol_m3', nombre: 'Fosfato', unidad: 'mmol/m³', color: '#a9dc6e', dec: 2 },
  { campo: 'oxygen_ml_l', nombre: 'Oxígeno disuelto', unidad: 'ml/L', color: '#dde9f0', dec: 2 },
  { campo: 'phytoplankton_carbon_mg_c_m3', nombre: 'Carbono fitoplanctónico', unidad: 'mg C/m³', color: '#a9dc6e', dec: 2 },
  { campo: 'biomass_total_t', nombre: 'Biomasa observada en cruceros', unidad: 't', color: '#eaf3f5', dec: 0 },
  { campo: 'nino12_anom_c', nombre: 'Anomalía Niño 1+2', unidad: '°C', color: '#ff9a62', dec: 1, grupo: 'Índices climáticos' },
  { campo: 'oni_c', nombre: 'Índice ONI (Pacífico central)', unidad: '°C', color: '#ffb47a', dec: 2, grupo: 'Índices climáticos' },
  { campo: 'sam_index', nombre: 'Modo Anular del Sur (SAM)', unidad: 'índice', color: '#9fe0f2', dec: 2, grupo: 'Índices climáticos' },
  { campo: 'sea_ice_antarctic_mkm2', anomalia: 'sea_ice_antarctic_anom_mkm2', nombre: 'Hielo marino antártico', unidad: 'millones de km²', unidadAnomalia: 'millones de km²', color: '#dde9f0', dec: 2, grupo: 'Índices climáticos' },
]

/** Clorofila y temperatura de una zona, con su anomalía ya calculada */
function variablesDeZona(modelo: Modelo, z: IdZona): VariableMonitor[] {
  const c = modelo.claveMonitor(z)
  if (!c) return []
  return [
    { campo: `chl_${c}_mg_m3`, anomalia: `chl_${c}_anom_pct`, nombre: 'Clorofila-a / fitoplancton', unidad: 'mg/m³', unidadAnomalia: '% frente a lo normal', color: '#3fc28c', dec: 2 },
    { campo: `sst_${c}_c`, anomalia: `sst_${c}_anom_c`, nombre: 'Temperatura superficial', unidad: '°C', unidadAnomalia: '°C frente a lo normal', color: '#f08a4b', dec: 1 },
  ]
}

const CAMPOS_ESCENARIO = new Set<CampoSerieMonitor>(['chlorophyll_a_mg_m3', 'sst_c', 'nitrate_mmol_m3', 'phytoplankton_carbon_mg_c_m3', 'nino12_anom_c'])

const fmt = (x: unknown, dec: number): string => {
  if (Array.isArray(x)) return x.map((y) => fmt(y, dec)).join(' – ')
  return typeof x === 'number' ? new Intl.NumberFormat('es', { maximumFractionDigits: dec }).format(x) : 'sin dato'
}

/** Monitor de condiciones: serie mensual de la costa peruana o de cada zona y, al final, los escenarios de El Niño */
export default function MonitorSection() {
  const { modelo } = useExplorer()
  const { section, monitorZone: zona, setMonitorZone } = useExplorerStore()
  // se guarda el nombre del dato: así, al cambiar de lugar, se conserva (por ejemplo, la clorofila)
  const [elegida, setElegida] = useState('Clorofila-a / fitoplancton')
  const [anomalia, setAnomalia] = useState(false)
  const registros = modelo.registrosMonitor
  const zonasConDatos = useMemo(() => modelo.ids.filter((z) => modelo.claveMonitor(z) && (section === 'austral' ? !esPeru(z) : section === 'humboldt' ? esPeru(z) : false)), [modelo, section])
  const regionales = section === 'austral'
    ? REGIONALES.filter((x) => ['chlorophyll_a_mg_m3', 'sst_c', 'sam_index', 'sea_ice_antarctic_mkm2'].includes(x.campo))
    : section === 'humboldt'
      ? REGIONALES.filter((x) => ['chlorophyll_a_mg_m3', 'sst_c', 'sss_psu', 'nitrate_mmol_m3', 'phosphate_mmol_m3', 'oxygen_ml_l', 'biomass_total_t'].includes(x.campo))
      : REGIONALES.filter((x) => x.campo === 'biomass_total_t')
  const variables = zona ? variablesDeZona(modelo, zona) : regionales
  if (section === 'pacifico_sur') return <section className="seccion"><div className="monitor monitor-vacio"><h2>Monitor del Pacífico Sur</h2><p>Las cajas del Pacífico Sur intermedio, subtropical y de transición hacia Humboldt todavía no están descargadas en este dataset. No se muestran series de otra región como reemplazo.</p></div></section>
  const v = variables.find((x) => x.nombre === elegida) ?? variables[0]!
  const esBiomasa = v.campo === 'biomass_total_t'
  const nombreLugar = zona ? modelo.zona(zona).nombre : 'la costa peruana'

  const { datos, conDato, hayEscenario } = useMemo(() => {
    const primero = registros[0]
    const inicio = primero ? modelo.idxMes(Number(primero.date.slice(0, 4)), Number(primero.date.slice(5, 7)) - 1) : modelo.i0
    const meses = modelo.meses.slice(inicio).map((_, k) => inicio + k)
    const linea: CampoSerieMonitor = esBiomasa ? 'biomass_total_t_interpolated' : anomalia && v.anomalia ? v.anomalia : v.campo
    // anomalía calculada: diferencia con el promedio de cada mes calendario (solo meses observados)
    const calcular = anomalia && !v.anomalia
    const normal = Array.from({ length: 12 }, (_, m) => media(meses.filter((i) => modelo.mes(i).mes === m && !modelo.esEscenario(i)).map((i) => modelo.registroMonitor(i)?.[v.campo])))
    const ajustar = (x: number | null | undefined, i: number) => {
      if (x == null) return null
      if (!calcular) return x
      const n = normal[modelo.mes(i).mes]
      return n == null ? null : x - n
    }
    const conEscenario = !zona && CAMPOS_ESCENARIO.has(v.campo) && !(anomalia && v.anomalia)
    const esc = (e: 'central' | 'weak' | 'intense') => (conEscenario ? modelo.serieEscenario(v.campo as CampoMonitor, e) : [])
    const central = esc('central'), debil = esc('weak'), intenso = esc('intense')
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
  }, [modelo, registros, v, anomalia, esBiomasa, zona])

  if (!registros.length) return null
  const unidad = anomalia ? v.unidadAnomalia ?? `${v.unidad} · anomalía mensual` : v.unidad
  const ultimo = modelo.ultimoMonitor(esBiomasa ? 'biomass_total_t_interpolated' : v.campo)
  const nino = modelo.ultimoMonitor('nino12_anom_c')
  const nEscenario = datos.length - registros.length
  const grupos = [...new Set(variables.map((x) => x.grupo ?? ''))]

  return <section className="seccion">
    <div className="monitor" id="monitor" aria-labelledby="t-monitor">
      <div className="monitor-cabecera">
        <div>
          <h2 id="t-monitor">Monitor de condiciones</h2>
          <p>La señal ambiental mensual frente a la costa peruana, en promedio o zona por zona: temperatura, clorofila, nutrientes, biomasa observada en cruceros e índices climáticos. Al final se suman escenarios de El Niño hasta febrero de 2027.</p>
        </div>
        <span className="monitor-meta">{registros[0]?.date.slice(0, 7)} → {registros.at(-1)?.date.slice(0, 7)} · {registros.length} meses{nEscenario > 0 ? ` + ${nEscenario} de escenario` : ''}</span>
      </div>
      <div className="monitor-controles" role="group" aria-label="Filtros del monitor">
        <label>Lugar <select value={zona ?? ''} onChange={(e) => setMonitorZone(modelo.esZona(e.target.value) ? e.target.value : null)}>
          <option value="">Costa peruana (promedio)</option>
          <optgroup label="Zonas">{zonasConDatos.map((z) => <option key={z} value={z}>{modelo.zona(z).nombre}</option>)}</optgroup>
        </select></label>
        <label>Variable <select value={v.nombre} onChange={(e) => setElegida(e.target.value)}>
          {grupos.map((g) => {
            const opciones = variables.filter((x) => (x.grupo ?? '') === g).map((x) => <option key={x.campo} value={x.nombre}>{x.nombre}</option>)
            return g ? <optgroup key={g} label={g}>{opciones}</optgroup> : opciones
          })}
        </select></label>
        <label>Escala <select value={anomalia ? 'anomaly' : 'absolute'} onChange={(e) => setAnomalia(e.target.value === 'anomaly')}><option value="absolute">Valores</option><option value="anomaly">Diferencia con lo normal de cada mes</option></select></label>
      </div>
      <p className="monitor-estado" aria-live="polite">
        {conDato} de {datos.length - nEscenario} meses con dato de {v.nombre.toLowerCase()} en {nombreLugar}. {esBiomasa ? 'La línea une observaciones de crucero solo para visualización; los puntos claros son los meses observados.' : zona ? 'Mediana mensual de los píxeles del satélite dentro de la zona.' : 'La serie ambiental es continua dentro del periodo descargado.'}
        {hayEscenario && ' La línea discontinua naranja son escenarios de El Niño (septiembre de 2026 a febrero de 2027), no observaciones.'}
        {zona && ' Los escenarios de El Niño solo existen para el promedio de la costa.'}
      </p>
      <div className="monitor-grafico" role="img" aria-label={`Serie mensual de ${v.nombre.toLowerCase()} en ${nombreLugar}`}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={datos} margin={{ top: 6, right: 8, bottom: 0, left: 4 }}>
            <CartesianGrid vertical={false} stroke="rgba(36,80,122,.4)" />
            <XAxis dataKey="mes" tick={{ fill: '#a3bccb', fontSize: 12 }} stroke="rgba(36,80,122,.55)" minTickGap={60} />
            <YAxis tick={{ fill: '#a3bccb', fontSize: 12 }} stroke="rgba(36,80,122,.55)" tickFormatter={(x: number) => fmt(x, v.dec)} width={72} />
            <Tooltip contentStyle={{ background: 'rgba(7,30,51,.96)', border: '1px solid #24507a', borderRadius: 8 }} formatter={(x, n) => [fmt(x, v.dec), String(n)]} />
            <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 12, color: '#a3bccb' }} />
            <Area dataKey="valor" name={`${v.nombre} (${unidad})`} stroke={v.color} fill={`${v.color}22`} strokeWidth={2} isAnimationActive={false} />
            {esBiomasa && <Scatter dataKey="observada" name="Observada en crucero" fill="#eaf3f5" isAnimationActive={false} />}
            {hayEscenario && <Area dataKey="banda" name="Escenarios débil a intenso" stroke="none" fill="rgba(240,138,75,0.22)" isAnimationActive={false} />}
            {hayEscenario && <Line dataKey="central" name="Escenario central de El Niño" stroke="#f08a4b" strokeDasharray="5 4" strokeWidth={2} dot={false} isAnimationActive={false} />}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="monitor-notas" aria-label="Resumen del monitor">
        <div className="monitor-nota"><b>{ultimo ? `${fmt(ultimo[esBiomasa ? 'biomass_total_t_interpolated' : v.campo], v.dec)} ${v.unidad}` : '—'}</b><span>último valor observado{ultimo ? ` (${ultimo.date.slice(0, 7)})` : ''}</span></div>
        <div className="monitor-nota"><b>{registros.filter((r) => r.biomass_observed).length}</b><span>meses con biomasa observada</span></div>
        <div className="monitor-nota"><b>{nino ? `${fmt(nino.nino12_anom_c, 1)} °C` : '—'}</b><span>Niño 1+2 en el último mes observado{nino ? ` (${nino.date.slice(0, 7)})` : ''}</span></div>
      </div>
      <p className="monitor-aviso"><strong>Cómo leerlo:</strong> las variables ambientales de la costa provienen de reanálisis/modelos y OC-CCI; las de cada zona, de la clorofila OC-CCI y la temperatura de NOAA Coral Reef Watch. La biomasa solo aparece durante intervalos de crucero IMARPE. Los escenarios de El Niño se construyen con la climatología mensual y las pendientes históricas frente al ICEN: no son observaciones ni pronósticos. Este monitor describe asociaciones y cobertura de datos, no es una alerta ni una predicción pesquera.</p>
    </div>
  </section>
}
