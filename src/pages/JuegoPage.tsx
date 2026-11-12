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
import Informe from '../features/juego/interfaz/Informe'
import { anioDelMar, ESTRATEGIAS, mesesConDatos, PECES_INICIALES, type Estrategia, type Informe as DatosInforme, type Mes } from '../features/juego/logica/cardumen'
import { crearEntrada, type Entrada } from '../features/juego/motor/entrada'
import { crearMotor, type Motor } from '../features/juego/motor/escena'
import { crearMar, type Mar } from '../features/juego/motor/mar'
import { protagonistas } from '../features/juego/personajes/galeria'
import { precargarSprites } from '../features/juego/personajes/sprites'
import { alCambiarSilencio, alternarSilencio, despertarAudio, detenerAmbiente, estaEnSilencio, iniciarAmbiente, sonar } from '../features/juego/motor/sonido'
import '../features/juego/juego.css'

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
  lumi: 'W/S o ↑/↓: subir y bajar · A/D o ←/→: a los lados',
  kiri: 'WASD o flechas: nadar',
  nara: 'WASD o flechas: nadar',
  cardumen: 'WASD o flechas: nadar · Q/E: subir y bajar · C: juntar',
}

/** Juego: mundo 3D con personajes dibujados en 2D */
export default function JuegoPage() {
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
  const [compacto, setCompacto] = useState(false)
  const compactoRef = useRef(false)
  const [resultados, setResultados] = useState<ResultadoAnio[]>([])
  const [verFinal, setVerFinal] = useState(false)
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

  // C junta o dispersa el cardumen
  useEffect(() => {
    if (pantalla.tipo !== 'cardumen') return
    const tecla = (e: KeyboardEvent) => { if (e.key.toLowerCase() === 'c' && !e.repeat) setCompacto((x) => !x) }
    addEventListener('keydown', tecla)
    return () => removeEventListener('keydown', tecla)
  }, [pantalla.tipo])

  const prologo = (escena: EscenaPrologo, historia: boolean) => setPantalla({ tipo: 'prologo', escena, historia, intento: Date.now() })
  const siguiente = pantalla.tipo === 'cardumen' && informe && pantalla.generacion + 1 < CAMPANA.length
    ? { anio: CAMPANA[pantalla.generacion + 1]!, peces: Math.min(PECES_INICIALES, Math.round(informe.datos.sobrevivientes * 1.8)) }
    : null
  const ayuda = pantalla.tipo === 'cardumen' ? AYUDA.cardumen : pantalla.tipo === 'prologo' ? AYUDA[pantalla.escena] : ''

  return <div className="juego" ref={contenedor}>
    <canvas className="juego-lienzo" ref={lienzo} aria-label="Escena del juego" />
    <Link className="juego-volver juego-caja" to="/">← Portada</Link>
    <button type="button" className="juego-sonido juego-caja" onClick={alternarSilencio} aria-pressed={!silencio}
      aria-label={silencio ? 'Activar el sonido' : 'Silenciar'}>{silencio ? '🔇' : '🔊'}</button>
    {pantalla.tipo !== 'menu' && <button type="button" className="juego-menu-boton juego-caja" onClick={() => { setInforme(null); setVerFinal(false); setPantalla({ tipo: 'menu' }) }}>Menú</button>}

    {pantalla.tipo === 'menu' && mar && <div className="juego-menu">
      <div className="juego-menu-caja juego-caja">
        <ul className="juego-protagonistas" aria-label="Protagonistas">
          {protagonistas().map((p, i) => <li key={p.nombre} style={{ animationDelay: `${i * 0.35}s` }}>
            <img src={p.src} alt="" width={84} height={84} /><b>{p.nombre}</b><small>{p.que}</small>
          </li>)}
        </ul>
        <h1>Cardumen</h1>
        <p>De la Antártida al mar peruano, en un océano que cambia con datos satelitales reales.</p>
        <button type="button" className="juego-caja principal" onClick={() => prologo('lumi', true)}>Jugar la historia completa</button>
        <button type="button" className="juego-caja" onClick={empezarCampana}>Solo el cardumen (1998–2026)</button>
        <p className="juego-menu-escenas">Escenas del prólogo:
          <button type="button" className="juego-caja" onClick={() => prologo('lumi', false)}>Lumi</button>
          <button type="button" className="juego-caja" onClick={() => prologo('kiri', false)}>Kiri</button>
          <button type="button" className="juego-caja" onClick={() => prologo('nara', false)}>Nara</button>
        </p>
        <p className="nota">Versión en desarrollo: personajes provisionales.</p>
      </div>
    </div>}

    {pantalla.tipo === 'prologo' && pantalla.escena === 'lumi' && <HudLumi e={estadoLumi} />}
    {pantalla.tipo === 'prologo' && pantalla.escena === 'kiri' && <HudKiri comidos={comidos} />}
    {pantalla.tipo === 'prologo' && pantalla.escena === 'nara' && <HudNara e={estadoNara} />}
    {pantalla.tipo === 'cardumen' && <HudCardumen entrada={entrada} compacto={compacto} alternar={() => setCompacto((x) => !x)} />}

    <div className={`juego-aviso${aviso ? ' visible' : ''}`} aria-live="assertive">{aviso}</div>
    {ayuda && <p className="juego-ayuda"><span className="solo-teclado">{ayuda} · </span>Arrastrar: girar la cámara</p>}
    <Dialogo />

    {pantalla.tipo === 'cardumen' && informe && mar && <Informe datos={informe.datos} historia={informe.historia}
      mar={anioDelMar(mar, informe.datos.anio, informe.datos.mesesJugados)} siguiente={siguiente}
      final={pantalla.generacion === CAMPANA.length - 1}
      alSeguir={(e) => siguiente && setPantalla({ tipo: 'cardumen', generacion: pantalla.generacion + 1, peces: siguiente.peces, estrategia: e.id, intento: Date.now() })}
      alRepetir={() => setPantalla({ ...pantalla, intento: Date.now() })}
      alFinal={() => { setInforme(null); void useDialogo.getState().decir(finalCampana(mar)).then(() => setVerFinal(true)) }}
      alMenu={() => { setInforme(null); setPantalla({ tipo: 'menu' }) }} />}

    {verFinal && <Final resultados={resultados} alRepetir={empezarCampana} alMenu={() => { setVerFinal(false); setPantalla({ tipo: 'menu' }) }} />}

    {!mar && <div className="juego-estado" role="status">{error ?? 'Cargando el mar…'}</div>}
  </div>
}
