import { useMemo, useRef, useState, type PointerEvent as EventoPuntero, type ReactNode } from 'react'
import { ESTRATEGIAS, type Estrategia, type Informe as DatosInforme } from '../logica/cardumen'
import { BANDEJAS, EFECTO_ACIERTO, EFECTO_ERROR, type Bandeja, type Decision, type Turno } from '../logica/escritorio'
import { sonar } from '../motor/sonido'
import Cabina, { IconoSello } from './Cabina'
import GuiaEscritorio, { faltaGuiaEscritorio, recordarGuiaEscritorio, type ReferenciaGuia } from './GuiaEscritorio'
import './cabina.css'

const n0 = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 0 })
const n1 = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 1, signDisplay: 'exceptZero' })
const ELEGIBLES: Estrategia['id'][] = ['profundo', 'costero', 'apretado']

type IdPapel = string
interface Lugar { x: number; y: number; z: number; giro: number }

/** Un papel sobre el escritorio: se arrastra desde cualquier parte que no sea un botón */
function Papel({ id, lugar, elegido, clase, titulo, children, alTomar, alMover, alSoltar }: {
  id: IdPapel; lugar: Lugar; elegido: boolean; clase?: string; titulo: string; children: ReactNode
  alTomar: (id: IdPapel) => void; alMover: (id: IdPapel, dx: number, dy: number) => void; alSoltar: (id: IdPapel, x: number, y: number) => void
}) {
  const arrastre = useRef<{ x: number; y: number } | null>(null)
  const bajar = (e: EventoPuntero<HTMLElement>) => {
    alTomar(id)
    if ((e.target as HTMLElement).closest('button, input, label')) return
    arrastre.current = { x: e.clientX, y: e.clientY }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const mover = (e: EventoPuntero<HTMLElement>) => {
    if (!arrastre.current) return
    alMover(id, e.clientX - arrastre.current.x, e.clientY - arrastre.current.y)
    arrastre.current = { x: e.clientX, y: e.clientY }
  }
  const soltar = (e: EventoPuntero<HTMLElement>) => { if (arrastre.current) alSoltar(id, e.clientX, e.clientY); arrastre.current = null }
  return <article className={`papel${clase ? ` ${clase}` : ''}${elegido ? ' elegido' : ''}`} aria-label={`${titulo}${elegido ? ', seleccionado' : ''}`}
    tabIndex={0} data-papel={id} onKeyDown={(e) => {
      if (e.target !== e.currentTarget || (e.key !== 'Enter' && e.key !== ' ')) return
      e.preventDefault(); alTomar(id)
    }}
    style={{ left: lugar.x, top: lugar.y, zIndex: lugar.z, ['--giro' as string]: `${lugar.giro}deg` }}
    onPointerDown={bajar} onPointerMove={mover} onPointerUp={soltar} onPointerCancel={soltar}>
    {children}
  </article>
}

function Sello({ texto, tipo }: { texto: string; tipo: Decision }) {
  const giro = useMemo(() => Math.round(Math.random() * 16 - 8), [])
  return <div className={`sello sello-${tipo}`} style={{ ['--giro' as string]: `${giro}deg` }} aria-label={`Sellado: ${texto}`}><IconoSello pequeno />{texto}</div>
}

/** Fin de año como en Papers, Please: papeles que se arrastran, se cruzan y se sellan */
export default function Escritorio({ turno, datos, siguiente, final, alSeguir, alRepetir, alFinal, alMenu }: {
  turno: Turno; datos: DatosInforme
  siguiente: { anio: number; peces: number } | null
  final: boolean
  alSeguir: (estrategia: Estrategia, factor: number) => void; alRepetir: () => void; alFinal: () => void; alMenu: () => void
}) {
  const ids = useMemo(() => ['manual', 'reporte', 'cardumen', 'carpeta', ...turno.expedientes.map((e) => e.id), ...(siguiente ? ['plan'] : [])], [turno, siguiente])
  // los papeles llegan apilados, un poco desordenados
  const [lugares, setLugares] = useState<Record<IdPapel, Lugar>>(() => {
    const ancho = typeof innerWidth === 'number' ? innerWidth : 1200
    const columnas = Math.max(1, Math.min(4, Math.floor((ancho - 24) / 340)))
    const paso = (ancho - 24 - 330) / Math.max(1, columnas - 1)
    return Object.fromEntries(ids.map((id, k) => [id, {
      x: 12 + (k % columnas) * Math.min(360, paso) + Math.random() * 16, y: 30 + Math.floor(k / columnas) * 210 + Math.random() * 24, z: k + 1, giro: Math.random() * 5 - 2.5,
    }]))
  })
  const [elegido, setElegido] = useState<IdPapel | null>(null)
  const [sellos, setSellos] = useState<Record<string, Decision>>({})
  const [bandeja, setBandeja] = useState<Bandeja | null>(null)
  const [estrategia, setEstrategia] = useState<Estrategia['id'] | null>(null)
  const [firmado, setFirmado] = useState(false)
  const [entregado, setEntregado] = useState(false)
  const [guia, setGuia] = useState<number | null>(() => faltaGuiaEscritorio() ? 0 : null)
  const zMax = useRef(ids.length)
  const bandejasRef = useRef<HTMLDivElement>(null)
  const escritorioRef = useRef<HTMLDivElement>(null)
  const cerrarGuia = () => { recordarGuiaEscritorio(); setGuia(null) }
  const siguientePaso = (desde: number, hasta: number) => setGuia((g) => g === desde ? hasta : g)

  const tomar = (id: IdPapel) => { setElegido(id); setLugares((l) => ({ ...l, [id]: { ...l[id]!, z: ++zMax.current } })) }
  const mover = (id: IdPapel, dx: number, dy: number) => {
    const ancho = escritorioRef.current?.clientWidth ?? 1200
    setLugares((l) => ({ ...l, [id]: { ...l[id]!, x: Math.max(8, Math.min(Math.max(8, ancho - 350), l[id]!.x + dx)), y: Math.max(16, l[id]!.y + dy) } }))
  }
  const soltar = (id: IdPapel, x: number, y: number) => {
    if (id !== 'carpeta' || !bandejasRef.current) return
    // ¿la carpeta cayó sobre una bandeja?
    for (const el of bandejasRef.current.querySelectorAll<HTMLElement>('[data-bandeja]')) {
      const r = el.getBoundingClientRect()
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) { archivar(el.dataset.bandeja as Bandeja); return }
    }
  }
  const archivar = (b: Bandeja) => { setBandeja(b); setElegido(null); siguientePaso(2, 3); sonar('boton') }
  const sellar = (d: Decision) => { if (!elegido || !turno.expedientes.some((e) => e.id === elegido)) return; setSellos((s) => ({ ...s, [elegido]: d })); siguientePaso(1, 2); sonar('golpe') }

  const expElegido = turno.expedientes.find((e) => e.id === elegido)
  const sinSello = turno.expedientes.filter((e) => !sellos[e.id])
  const visita = expElegido ?? sinSello[0]
  const pendientes = turno.expedientes.filter((e) => !sellos[e.id]).length + (bandeja ? 0 : 1) + (siguiente && !firmado ? 1 : 0)
  const mostrarPapel = (referencia: ReferenciaGuia) => {
    const id = referencia === 'expediente' ? (sinSello[0]?.id ?? turno.expedientes[0]?.id) : referencia
    if (!id) return
    if (id === 'carpeta' && bandeja) {
      const archivada = [...(bandejasRef.current?.querySelectorAll<HTMLButtonElement>('[data-bandeja]') ?? [])].find((el) => el.dataset.bandeja === bandeja)
      archivada?.focus()
      return
    }
    tomar(id)
    requestAnimationFrame(() => {
      const papel = [...(escritorioRef.current?.querySelectorAll<HTMLElement>('[data-papel]') ?? [])].find((el) => el.dataset.papel === id)
      papel?.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' })
      papel?.focus({ preventScroll: true })
    })
  }

  // resultado del turno
  const aciertos = turno.expedientes.filter((e) => sellos[e.id] === e.correcta).length + (bandeja === turno.bandejaCorrecta ? 1 : 0)
  const errores = turno.expedientes.length + 1 - aciertos
  const factor = Math.max(0.6, 1 + aciertos * EFECTO_ACIERTO + errores * EFECTO_ERROR)
  const citaciones = [
    ...turno.expedientes.filter((e) => sellos[e.id] !== e.correcta).map((e) => ({ id: e.id, texto: `${e.titulo}: sellaste «${e.sellos[sellos[e.id] ?? 'si']}». ${e.explicacion}` })),
    ...(bandeja !== turno.bandejaCorrecta ? [{ id: 'bandeja', texto: `Archivaste el año en «${BANDEJAS.find((b) => b.id === bandeja)?.texto}». Correspondía «${BANDEJAS.find((b) => b.id === turno.bandejaCorrecta)?.texto}».${turno.bandejaCorrecta === 'nino' ? ` El Niño 1+2 llegó a ${n1.format(turno.resumen.ninoMax ?? 0)} °C.` : ''}` }] : []),
  ]
  const comidaCentro = Math.round(turno.resumen.alimentoCentro * 100)

  const papeles: Record<IdPapel, { titulo: string; clase?: string; cuerpo: ReactNode }> = {
    manual: { titulo: 'Manual del analista', clase: 'manual', cuerpo: <>
      <h3>Manual del analista</h3>
      <ol>{turno.reglas.map((r, k) => <li key={r}>{k < turno.reglasNuevas && <span className="nuevo">NUEVO</span>}{r}</li>)}</ol>
    </> },
    reporte: { titulo: 'Reporte satelital', clase: 'reporte', cuerpo: <>
      <h3>Reporte satelital · {turno.anio}</h3>
      <p className="membrete">ORBI · costa central (Chimbote y Callao)</p>
      <table>
        <thead><tr><th scope="col">Mes</th><th scope="col">Comida</th><th scope="col">Niño 1+2</th></tr></thead>
        <tbody>{turno.reporte.map((f) => <tr key={f.mes}>
          <th scope="row">{f.mes}</th>
          <td><span className="barrita" style={{ width: `${Math.min(100, (f.comida ?? 0) * 50)}%` }} />{f.comida == null ? '—' : `${Math.round(f.comida * 100)} %`}</td>
          <td className={(f.nino ?? 0) >= 1 ? 'calido' : ''}>{f.nino == null ? '—' : `${n1.format(f.nino)} °C`}</td>
        </tr>)}</tbody>
      </table>
      <p className="pie">Comida: clorofila satelital frente a lo normal del mes (100 % = normal).</p>
    </> },
    cardumen: { titulo: 'Informe del cardumen', clase: 'cardumen', cuerpo: <>
      <h3>Informe del cardumen</h3>
      <dl>
        <dt>Cardumen inicial</dt><dd>{n0.format(datos.inicial)}</dd>
        <dt>Hambre</dt><dd>−{n0.format(datos.perdidas.hambre)}</dd>
        <dt>Depredadores</dt><dd>−{n0.format(datos.perdidas.depredadores)}</dd>
        <dt>Flota</dt><dd>−{n0.format(datos.perdidas.flota)}</dd>
        <dt>Sin oxígeno</dt><dd>−{n0.format(datos.perdidas.oxigeno)}</dd>
        <dt className="total">Sobrevivientes</dt><dd className="total">{n0.format(datos.sobrevivientes)}</dd>
      </dl>
    </> },
    carpeta: { titulo: `Carpeta del año ${turno.anio}`, clase: `carpeta${bandeja ? ' archivada' : ''}`, cuerpo: <>
      <h3>Carpeta {turno.anio}</h3>
      <p>¿Qué explica este año? Arrastra la carpeta a una bandeja (o elígela y toca la bandeja).</p>
      <p className="pie">Comida en la costa central: {comidaCentro} % de lo normal en promedio.</p>
      {bandeja && <p className="etiqueta">Archivada en: <b>{BANDEJAS.find((b) => b.id === bandeja)?.texto}</b></p>}
    </> },
    ...Object.fromEntries(turno.expedientes.map((e) => [e.id, { titulo: e.titulo, clase: `expediente ${e.tipo}`, cuerpo: <>
      <p className="membrete">{e.remitente}</p>
      <h3>{e.titulo}</h3>
      <p>{e.cuerpo}</p>
      {sellos[e.id] ? <Sello key={sellos[e.id]} texto={e.sellos[sellos[e.id]!]} tipo={sellos[e.id]!} /> : <p className="pie">Pendiente de sello</p>}
    </> }])),
    ...(siguiente ? { plan: { titulo: 'Plan del cardumen', clase: 'plan', cuerpo: <>
      <h3>Plan para {siguiente.anio}</h3>
      <p>Marca una estrategia para la próxima generación y firma.</p>
      {ELEGIBLES.map((id) => <label key={id} className="opcion">
        <input type="radio" name="estrategia" checked={estrategia === id} onChange={() => { setEstrategia(id); setFirmado(false) }} />
        <span><b>{ESTRATEGIAS[id].nombre}</b> · {ESTRATEGIAS[id].ventaja} <i>{ESTRATEGIAS[id].costo}</i></span>
      </label>)}
      {firmado ? <p className="firma">Anchi</p> : <button type="button" className="firmar" disabled={!estrategia} onClick={() => { setFirmado(true); siguientePaso(3, 4); sonar('boton') }}>Firmar</button>}
    </> } } : {}),
  }

  if (entregado) {
    return <div className="juego-escritorio cabina-escritorio" role="dialog" aria-modal="true" aria-labelledby="t-resultado">
      <div className="cabina-franja"><Cabina expediente={visita} revisados={turno.expedientes.length} total={turno.expedientes.length} entregado /></div>
      <div className="resultado papel" style={{ ['--giro' as string]: '-0.6deg' }}>
        <h3 id="t-resultado">Resultado del turno · {turno.anio}</h3>
        <p>Decisiones correctas: <b>{aciertos} de {turno.expedientes.length + 1}</b>.</p>
        {citaciones.length === 0 ? <p>Sin citaciones. Buen trabajo, analista.</p> : citaciones.map((c) => <p key={c.id} className="citacion"><b>CITACIÓN</b> {c.texto}</p>)}
        <p className="pie">Cada decisión correcta protege al cardumen siguiente (+{Math.round(EFECTO_ACIERTO * 100)} %); cada error lo perjudica ({Math.round(EFECTO_ERROR * 100)} %). Efecto ilustrativo.</p>
        <div className="acciones">
          {siguiente && estrategia && <button type="button" className="juego-caja principal" onClick={() => alSeguir(ESTRATEGIAS[estrategia], factor)}>
            Siguiente generación: {siguiente.anio} ({n0.format(Math.min(10000, siguiente.peces * factor))} peces) →</button>}
          {final && <button type="button" className="juego-caja principal" onClick={alFinal}>Ver el final →</button>}
          {!siguiente && !final && <button type="button" className="juego-caja principal" onClick={alMenu}>Volver al menú</button>}
          <button type="button" className="juego-caja" onClick={alRepetir}>Repetir {turno.anio}</button>
          <a className="juego-caja" href={`/explorer#mes=${turno.anio}-01&dato=clorofila&vista=satellite`}>Ver este año en el explorador</a>
        </div>
      </div>
    </div>
  }

  return <div className="juego-escritorio cabina-escritorio" ref={escritorioRef} role="dialog" aria-modal="true" aria-label={`Escritorio del analista, año ${turno.anio}`}>
    <header className="escritorio-cabecera">
      <b>Escritorio del analista · {turno.anio}</b>
      <span role="status">{pendientes > 0 ? `${pendientes} pendiente${pendientes > 1 ? 's' : ''}` : 'Todo revisado'}</span>
      <button type="button" className="juego-caja cabina-ayuda" aria-controls="cabina-guia" aria-expanded={guia !== null} onClick={() => { setGuia(0); escritorioRef.current?.scrollTo({ top: 0, behavior: 'auto' }) }}>Cómo revisar</button>
      <button type="button" className="juego-caja principal" disabled={pendientes > 0} onClick={() => { cerrarGuia(); setEntregado(true); sonar('exito') }}>Entregar</button>
    </header>

    <div className={`cabina-franja${guia !== null ? ' con-guia' : ''}`}>
      <Cabina expediente={visita} revisados={turno.expedientes.length - sinSello.length} total={turno.expedientes.length} />
      {guia !== null && <GuiaEscritorio paso={guia} hayPlan={!!siguiente} alPaso={setGuia} alCerrar={cerrarGuia} alMostrar={mostrarPapel} />}
    </div>
    <p className="cabina-instruccion">Mesa de revisión <span>Selecciona un papel con clic o con Tab y Enter. Solo la carpeta del año se archiva en las bandejas.</span></p>
    <div className="cabina-mesa" style={{ minHeight: Math.max(700, ...Object.values(lugares).map((l) => l.y + 440)) }}>
    {ids.filter((id) => !(id === 'carpeta' && bandeja)).map((id) => <Papel key={id} id={id} lugar={lugares[id]!} elegido={elegido === id} clase={papeles[id]!.clase} titulo={papeles[id]!.titulo}
      alTomar={tomar} alMover={mover} alSoltar={soltar}>{papeles[id]!.cuerpo}</Papel>)}
    </div>

    <div className="escritorio-bandejas" ref={bandejasRef} aria-label="Bandejas para archivar la carpeta del año">
      {BANDEJAS.map((b) => <button key={b.id} type="button" data-bandeja={b.id} className={`bandeja${bandeja === b.id ? ' llena' : ''}`}
        onClick={() => {
          if (elegido === 'carpeta' && !bandeja) archivar(b.id)
          else if (bandeja === b.id) { setBandeja(null); tomar('carpeta'); setLugares((l) => ({ ...l, carpeta: { ...l.carpeta!, x: 40, y: 90 } })) } // sacar la carpeta para cambiarla
        }} disabled={!(elegido === 'carpeta' && !bandeja) && bandeja !== b.id}
        title={bandeja === b.id ? 'Toca para sacar la carpeta' : undefined}>{b.texto}{bandeja === b.id && <small>Carpeta {turno.anio}</small>}</button>)}
    </div>

    <div className="escritorio-sellos" aria-label="Sellos">
      <span className="ayuda" role="status">{expElegido ? `Sellar: ${expElegido.titulo}` : 'Selecciona una solicitud, carta o nota para habilitar los sellos'}</span>
      <button type="button" className="sello-boton verde" disabled={!expElegido} onClick={() => sellar('si')}><IconoSello /><span>{expElegido?.sellos.si ?? 'SÍ'}</span></button>
      <button type="button" className="sello-boton rojo" disabled={!expElegido} onClick={() => sellar('no')}><IconoSello /><span>{expElegido?.sellos.no ?? 'NO'}</span></button>
    </div>
  </div>
}
