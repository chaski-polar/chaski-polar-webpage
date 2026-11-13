import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadRuntimeData } from '../data/loaders/runtime'
import Dialogo from '../features/juego/dialogo/Dialogo'
import { hayDialogo, useDialogo, type Linea } from '../features/juego/dialogo/estado'
import { escenaCardumen } from '../features/juego/escenas/cardumen'
import { escenaKiri } from '../features/juego/escenas/kiri'
import { DIVISIONES_META, escenaLumi, type EstadoLumi } from '../features/juego/escenas/lumi'
import { escenaNara, type EstadoNara } from '../features/juego/escenas/nara'
import { finalCampana, finKiri, finLumi, finNara, hitoCardumen, introCardumen, introKiri, introLumi, introNara, META_KIRI, puntoNara } from '../features/juego/guion'
import HudCardumen from '../features/juego/interfaz/HudCardumen'
import { HudKiri, HudLumi, HudNara } from '../features/juego/interfaz/HudPrologo'
import Final, { type ResultadoAnio } from '../features/juego/interfaz/Final'
import Escritorio from '../features/juego/interfaz/Escritorio'
import GaleriaSprites from '../features/juego/interfaz/GaleriaSprites'
import { ESTRATEGIAS, mesesConDatos, PECES_INICIALES, type Estrategia, type Informe as DatosInforme, type Mes } from '../features/juego/logica/cardumen'
import { crearEntrada, type Entrada } from '../features/juego/motor/entrada'
import { crearMotor, type Motor } from '../features/juego/motor/escena'
import { crearTurno } from '../features/juego/logica/escritorio'
import { crearMar, type Mar } from '../features/juego/motor/mar'
import MenuCardumen from '../features/juego/interfaz/MenuCardumen'
import { precargarSprites } from '../features/juego/personajes/sprites'
import { alCambiarSilencio, alternarSilencio, despertarAudio, detenerAmbiente, estaEnSilencio, iniciarAmbiente, sonar } from '../features/juego/motor/sonido'
import '../features/juego/juego.css'
import '../features/juego/interfaz/bitacora.css'

/** Años de la campaña: un año normal para aprender, El Niño 1997-98, la recuperación, dos Niños costeros
    y el final con El Niño 2026 en curso (hasta el último mes con datos) */
const CAMPANA = [2004, 1998, 2000, 2017, 2023, 2026] as const
const parametro = (nombre: string) => Number(new URLSearchParams(location.search).get(nombre))
// ?rapido=10 acelera el calendario del cardumen y ?generacion=2 empieza en el segundo año (solo para probar)
const RAPIDEZ = Math.min(20, Math.max(1, parametro('rapido') || 1))
const GENERACION_INICIAL = Math.min(CAMPANA.length, Math.max(1, parametro('generacion') || 1)) - 1

type EscenaPrologo = 'lumi' | 'kiri' | 'nara'
const SIGUIENTE: Record<EscenaPrologo, EscenaPrologo | null> = { lumi: 'kiri', kiri: 'nara', nara: null }

type Pantalla =
  | { tipo: 'menu' }
  /** historia: true si se juega todo seguido (prólogo y luego el cardumen) */
  | { tipo: 'prologo'; escena: EscenaPrologo; historia: boolean; intento: number }
  | { tipo: 'cardumen'; generacion: number; peces: number; estrategia: Estrategia['id']; intento: number }

const AYUDA: Record<EscenaPrologo | 'cardumen', string> = {
  lumi: 'W o Espacio: subir · S o C: bajar · A/D: a los lados',
  kiri: 'WASD o flechas: nadar · Espacio/Q: subir · C/E: bajar',
  nara: 'WASD o flechas: nadar',
  cardumen: 'WASD: nadar · Espacio: subir · C: bajar · Shift: impulso · F: juntar',
}

/** Juego: mundo 3D con personajes dibujados en 2D */
export default function JuegoPage() {
  const dialogoAbierto = useDialogo((s) => s.linea !== null)
  const contenedor = useRef<HTMLDivElement>(null)
  const lienzo = useRef<HTMLCanvasElement>(null)
  const motorRef = useRef<Motor | null>(null)
  const [entrada, setEntrada] = useState<Entrada | null>(null)
  const [mar, setMar] = useState<Mar | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pantalla, setPantalla] = useState<Pantalla>({ tipo: 'menu' })
  const [informe, setInforme] = useState<{ datos: DatosInforme; historia: Mes[] } | null>(null)
  const [comidos, setComidos] = useState(0)
  const [estadoLumi, setEstadoLumi] = useState<EstadoLumi | null>(null)
  const [estadoNara, setEstadoNara] = useState<EstadoNara | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [cartel, setCartel] = useState<{ mes: string; detalle: string } | null>(null)
  const temporizadorCartel = useRef(0)
  const [compacto, setCompacto] = useState(false)
  const compactoRef = useRef(false)
  const [resultados, setResultados] = useState<ResultadoAnio[]>([])
  const [verFinal, setVerFinal] = useState(false)
  const [pausado, setPausado] = useState(false)
  const [teclas, setTeclas] = useState<Set<string>>(new Set())
  const hitos = useRef(new Set<string>())
  const presentado = useRef(false)

  useEffect(() => { document.title = 'Mar Peruano 360 · Juego' }, [])

  // sonido: el navegador lo habilita recién con el primer gesto del jugador
  const [silencio, setSilencio] = useState(estaEnSilencio)
  useEffect(() => {
    const despertar = () => { despertarAudio(); iniciarAmbiente() }
    addEventListener('pointerdown', despertar)
    addEventListener('keydown', despertar)
    const quitar = alCambiarSilencio(setSilencio)
    return () => { removeEventListener('pointerdown', despertar); removeEventListener('keydown', despertar); quitar(); detenerAmbiente() }
  }, [])
  useEffect(() => { compactoRef.current = compacto }, [compacto])
  useEffect(() => { motorRef.current?.pausar(pausado); entrada?.soltar() }, [pausado, entrada])
  useEffect(() => { setPausado(false); setTeclas(new Set()) }, [pantalla])
  useEffect(() => {
    const bajar = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.repeat && pantalla.tipo !== 'menu' && !informe && !verFinal) { e.preventDefault(); setPausado((p) => !p); return }
      if (pausado || dialogoAbierto || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      setTeclas((t) => new Set(t).add(e.key.toLowerCase()))
    }
    const subir = (e: KeyboardEvent) => setTeclas((t) => { const siguiente = new Set(t); siguiente.delete(e.key.toLowerCase()); return siguiente })
    const limpiar = () => setTeclas(new Set())
    addEventListener('keydown', bajar); addEventListener('keyup', subir); addEventListener('blur', limpiar)
    return () => { removeEventListener('keydown', bajar); removeEventListener('keyup', subir); removeEventListener('blur', limpiar) }
  }, [pantalla.tipo, pausado, dialogoAbierto, informe, verFinal])
  useEffect(() => { if (pausado || dialogoAbierto) setTeclas(new Set()) }, [pausado, dialogoAbierto])

  // los datos del mar son los mismos que usa el explorador
  useEffect(() => {
    let activo = true
    // los dibujos de los personajes (PNG si existen) se cargan junto con los datos
    Promise.all([loadRuntimeData(), precargarSprites()])
      .then(([{ monitor }]) => { if (activo) setMar(crearMar(monitor)) })
      .catch(() => { if (activo) setError('No se pudieron cargar los datos del mar.') })
    return () => { activo = false }
  }, [])

  // motor y controles: se crean una vez
  useEffect(() => {
    if (!mar || !lienzo.current || !contenedor.current) return
    const motor = crearMotor(lienzo.current)
    const e = crearEntrada(contenedor.current)
    motorRef.current = motor
    setEntrada(e)
    return () => { useDialogo.getState().cerrar(); e.destruir(); motor.destruir(); motorRef.current = null; setEntrada(null) }
  }, [mar])

  const temporizador = useRef(0)
  const avisar = useCallback((texto: string) => {
    setAviso(texto)
    clearTimeout(temporizador.current)
    temporizador.current = window.setTimeout(() => setAviso(null), 1600)
  }, [])

  const empezarCampana = useCallback(() => {
    hitos.current.clear()
    presentado.current = false
    setResultados([])
    setVerFinal(false)
    setPantalla({ tipo: 'cardumen', generacion: GENERACION_INICIAL, peces: PECES_INICIALES, estrategia: 'ninguna', intento: Date.now() })
  }, [])

  // escena según la pantalla (solo cambia cuando cambia la clave)
  const clave = pantalla.tipo === 'cardumen' ? `cardumen-${pantalla.generacion}-${pantalla.intento}`
    : pantalla.tipo === 'prologo' ? `${pantalla.escena}-${pantalla.intento}` : 'menu'
  useEffect(() => {
    const motor = motorRef.current
    if (!mar || !motor || !entrada) return
    const dialogo = useDialogo.getState()
    dialogo.cerrar()

    if (pantalla.tipo === 'prologo') {
      const { escena, historia } = pantalla
      let terminada = false
      // al terminar una escena del prólogo: diálogo de cierre y luego la siguiente (o el menú si se jugó suelta)
      const terminar = (cierre: Linea[]) => {
        if (terminada) return
        terminada = true
        void useDialogo.getState().decir(cierre).then(() => {
          if (!historia) { setPantalla({ tipo: 'menu' }); return }
          const sig = SIGUIENTE[escena]
          if (sig) setPantalla({ tipo: 'prologo', escena: sig, historia, intento: Date.now() })
          else empezarCampana()
        })
      }
      if (escena === 'lumi') {
        setEstadoLumi(null)
        void dialogo.decir(introLumi(mar))
        motor.usar(escenaLumi(entrada, {
          estado: setEstadoLumi,
          division: (n) => avisar(`¡Lumi se dividió! ${n} de ${DIVISIONES_META}`),
          terminado: () => terminar(finLumi),
        }, hayDialogo))
      } else if (escena === 'kiri') {
        setComidos(0)
        void dialogo.decir(introKiri())
        motor.usar(escenaKiri(entrada, {
          comio: (n) => {
            setComidos(n)
            if (n >= META_KIRI) terminar(finKiri)
            else if (n > 0 && n % 5 === 0) avisar(`¡Ñam! ${n}`)
          },
          golpe: () => avisar('¡Pingüino!'),
        }, hayDialogo))
      } else {
        setEstadoNara(null)
        void dialogo.decir(introNara)
        motor.usar(escenaNara(entrada, {
          estado: setEstadoNara,
          punto: (id) => void useDialogo.getState().decir(puntoNara[id]),
          agotada: () => avisar('Nara está agotada: descansa un momento'),
          llego: () => terminar(finNara),
        }, hayDialogo))
      }
    } else if (pantalla.tipo === 'cardumen') {
      const anio = CAMPANA[pantalla.generacion]!
      setInforme(null)
      setCompacto(false)
      // la presentación va primero; los avisos que la escena dé al empezar (El Niño, veda…) se encolan detrás
      void dialogo.decir(introCardumen(mar, anio, !presentado.current))
      presentado.current = true
      motor.usar(escenaCardumen(mar, entrada, {
        aviso: avisar,
        mes: (k, m) => {
          const nombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
          const nino = m.nino12 == null ? '' : `Niño 1+2: ${m.nino12 > 0 ? '+' : ''}${m.nino12.toFixed(1).replace('.', ',')} °C`
          setCartel({ mes: `${nombres[k]} ${anio}`, detalle: [nino, m.temporada === 'veda' ? 'veda de pesca' : m.temporada === 'abierta' ? 'temporada de pesca' : ''].filter(Boolean).join(' · ') })
          clearTimeout(temporizadorCartel.current)
          temporizadorCartel.current = window.setTimeout(() => setCartel(null), 2200)
        },
        hito: (id, m) => {
          if (hitos.current.has(id)) return
          hitos.current.add(id)
          const lineas = hitoCardumen(id, m)
          if (lineas.length) void useDialogo.getState().decir(lineas)
        },
        fin: (datos, historia) => {
          sonar('exito')
          setInforme({ datos, historia })
          const r: ResultadoAnio = { anio, inicial: datos.inicial, sobrevivientes: datos.sobrevivientes, estrategia: datos.estrategia }
          setResultados((rs) => [...rs.filter((x) => x.anio !== anio), r])
        },
      }, { anio, peces: pantalla.peces, pausa: hayDialogo, compacto: () => compactoRef.current, rapidez: RAPIDEZ,
        estrategia: ESTRATEGIAS[pantalla.estrategia], mesFin: mesesConDatos(mar, anio) }))
    } else {
      motor.usar(() => ({ actualizar: () => {}, destruir: () => {} }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, mar, entrada])

  // F junta o dispersa; C queda libre para bajar.
  useEffect(() => {
    if (pantalla.tipo !== 'cardumen') return
    const tecla = (e: KeyboardEvent) => { if (e.key.toLowerCase() === 'f' && !e.repeat && !pausado && !hayDialogo() && !informe) setCompacto((x) => !x) }
    addEventListener('keydown', tecla)
    return () => removeEventListener('keydown', tecla)
  }, [pantalla.tipo, pausado, informe])

  const prologo = (escena: EscenaPrologo, historia: boolean) => setPantalla({ tipo: 'prologo', escena, historia, intento: Date.now() })
  const siguiente = pantalla.tipo === 'cardumen' && informe && pantalla.generacion + 1 < CAMPANA.length
    ? { anio: CAMPANA[pantalla.generacion + 1]!, peces: Math.min(PECES_INICIALES, Math.round(informe.datos.sobrevivientes * 1.8)) }
    : null
  const ayuda = pantalla.tipo === 'cardumen' ? AYUDA.cardumen : pantalla.tipo === 'prologo' ? AYUDA[pantalla.escena] : ''

  if (new URLSearchParams(location.search).has('sprites')) return <div className="juego bitacora"><GaleriaSprites /></div>
  return <div className={`juego bitacora${dialogoAbierto ? ' bitacora-con-dialogo' : ''}`} ref={contenedor}
    data-modal={Boolean(informe || verFinal)} data-etapa={pantalla.tipo === 'prologo' ? pantalla.escena : pantalla.tipo}>
    <canvas className="juego-lienzo" ref={lienzo} aria-label="Escena del juego" />
    <nav className="bitacora-navegacion" aria-label="Navegación del juego">
      <Link className="bitacora-nav-enlace" to="/">← Portada</Link>
      {pantalla.tipo !== 'menu' && <button type="button" className="bitacora-nav-enlace" onClick={() => { setInforme(null); setVerFinal(false); setPantalla({ tipo: 'menu' }) }}>Menú</button>}
      {ayuda && <details className="bitacora-controles"><summary title="Recordar controles">Controles</summary>
        <p>{ayuda}<br />Ratón: arrastra para girar la cámara y usa la rueda para acercar. En pantalla táctil, usa la palanca y los botones.</p>
      </details>}
      <span className="bitacora-marca">Cardumen</span>
      <button type="button" className="bitacora-nav-enlace bitacora-nav-sonido" onClick={alternarSilencio} aria-pressed={!silencio}
        >{silencio ? 'Sonido: no' : 'Sonido: sí'}</button>
    </nav>

    {pantalla.tipo === 'menu' && mar && <MenuCardumen historia={() => prologo('lumi', true)} cardumen={empezarCampana}
      escena={(id) => prologo(id, false)} />}

    {pantalla.tipo === 'prologo' && pantalla.escena === 'lumi' && <HudLumi e={estadoLumi} />}
    {pantalla.tipo === 'prologo' && pantalla.escena === 'kiri' && <HudKiri comidos={comidos} />}
    {pantalla.tipo === 'prologo' && pantalla.escena === 'nara' && <HudNara e={estadoNara} />}
    {pantalla.tipo === 'cardumen' && <HudCardumen entrada={entrada} compacto={compacto} alternar={() => setCompacto((x) => !x)} />}
    {pantalla.tipo === 'prologo' && pantalla.escena === 'kiri' && <div className="bitacora-acciones kiri-vertical" aria-label="Controles de profundidad">
      {(['subir', 'bajar'] as const).map((accion) => <button key={accion} type="button" className="juego-caja bitacora-tactil"
        onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); if (entrada) entrada.botones[accion] = true }}
        onPointerUp={() => { if (entrada) entrada.botones[accion] = false }} onPointerCancel={() => { if (entrada) entrada.botones[accion] = false }} onLostPointerCapture={() => { if (entrada) entrada.botones[accion] = false }}>{accion === 'subir' ? '↑ Subir' : '↓ Bajar'}</button>)}
    </div>}
    {pantalla.tipo !== 'menu' && !dialogoAbierto && !informe && !verFinal && !pausado && <div className="visor-teclas" aria-hidden="true">
      <span>CONTROLES</span><div className="visor-grupos">
        {[ [['W', 'w'], ['A', 'a'], ['S', 's'], ['D', 'd']], [['↑', 'arrowup'], ['←', 'arrowleft'], ['↓', 'arrowdown'], ['→', 'arrowright']] ].map((grupo, i) => <div className="visor-cruz" key={i}>{grupo.map(([label, key], posicion) => <kbd key={key} className={`${posicion === 0 ? 'tecla-arriba ' : ''}${teclas.has(key) ? 'pulsada' : ''}`}>{label}</kbd>)}</div>)}
        <div className="visor-acciones">{(pantalla.tipo === 'cardumen' || pantalla.escena === 'kiri' ? [['ESPACIO', ' '], ['Q', 'q'], ['C', 'c'], ['E', 'e'], ...(pantalla.tipo === 'cardumen' ? [['SHIFT', 'shift'], ['F', 'f']] : [])] : pantalla.escena === 'lumi' ? [['ESPACIO', ' '], ['C', 'c']] : []).map(([label, key]) => <kbd key={key} className={teclas.has(key) ? 'pulsada' : ''}>{label}</kbd>)}</div>
      </div>
    </div>}
    {pausado && <div className="pausa-velo" role="dialog" aria-modal="true" aria-labelledby="pausa-titulo"><div className="pausa-panel juego-caja"><span>BITÁCORA · EN ESPERA</span><h2 id="pausa-titulo">Juego en pausa</h2><p>La expedición está detenida. Tómate un momento.</p><button autoFocus type="button" className="juego-caja principal" onClick={() => setPausado(false)}>Continuar <kbd>ESC</kbd></button></div></div>}

    <div className={`juego-aviso${aviso ? ' visible' : ''}`} aria-live="assertive">{aviso}</div>
    {pantalla.tipo === 'cardumen' && cartel && <div className="juego-cartel" role="status"><b>{cartel.mes}</b>{cartel.detalle && <span>{cartel.detalle}</span>}</div>}
    {!pausado && <Dialogo />}

    {pantalla.tipo === 'cardumen' && informe && mar && <Escritorio key={clave} datos={informe.datos}
      turno={crearTurno(mar, informe.datos.anio, informe.datos.mesesJugados, pantalla.generacion)} siguiente={siguiente}
      final={pantalla.generacion === CAMPANA.length - 1}
      alSeguir={(e, factor) => siguiente && setPantalla({ tipo: 'cardumen', generacion: pantalla.generacion + 1, peces: Math.round(Math.min(PECES_INICIALES, siguiente.peces * factor)), estrategia: e.id, intento: Date.now() })}
      alRepetir={() => setPantalla({ ...pantalla, intento: Date.now() })}
      alFinal={() => { setInforme(null); void useDialogo.getState().decir(finalCampana(mar)).then(() => setVerFinal(true)) }}
      alMenu={() => { setInforme(null); setPantalla({ tipo: 'menu' }) }} />}

    {verFinal && <Final resultados={resultados} alRepetir={empezarCampana} alMenu={() => { setVerFinal(false); setPantalla({ tipo: 'menu' }) }} />}

    {!mar && <div className="juego-estado" role="status">{error ?? 'Cargando el mar…'}</div>}
  </div>
}
