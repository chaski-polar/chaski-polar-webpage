import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadRuntimeData } from '../data/loaders/runtime'
import Dialogo from '../features/juego/dialogo/Dialogo'
import { hayDialogo, useDialogo, type Linea } from '../features/juego/dialogo/estado'
import { escenaCardumen } from '../features/juego/escenas/cardumen'
import { escenaKiri } from '../features/juego/escenas/kiri'
import HudCardumen from '../features/juego/interfaz/HudCardumen'
import Informe from '../features/juego/interfaz/Informe'
import { PECES_INICIALES, type Informe as DatosInforme, type Mes } from '../features/juego/logica/cardumen'
import { crearEntrada, type Entrada } from '../features/juego/motor/entrada'
import { crearMotor, type Motor } from '../features/juego/motor/escena'
import { crearMar, type Mar } from '../features/juego/motor/mar'
import '../features/juego/juego.css'

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
/** Años de la campaña: primero un año normal para aprender, luego El Niño 1997-98 */
const CAMPANA = [2004, 1998] as const
// ?rapido=10 acelera el calendario del cardumen (solo para probar)
const RAPIDEZ = Math.min(20, Math.max(1, Number(new URLSearchParams(location.search).get('rapido')) || 1))
// ?generacion=2 empieza la campaña en el segundo año (solo para probar)
const GENERACION_INICIAL = Math.min(CAMPANA.length, Math.max(1, Number(new URLSearchParams(location.search).get('generacion')) || 1)) - 1
const n1 = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 1, signDisplay: 'exceptZero' })

type Pantalla =
  | { tipo: 'menu' }
  | { tipo: 'kiri' }
  | { tipo: 'cardumen'; generacion: number; peces: number; intento: number }

/** Presentación de la escena de Kiri. ORBI cita la clorofila real del último verano antártico medido */
function presentacionKiri(mar: Mar): Linea[] {
  let dato = ''
  for (let i = mar.fechas.length - 1; i >= 0; i--) {
    const e = mar.estado('peninsula_antartica', i)
    const mes = Number(e.fecha.slice(5, 7))
    if (e.clorofila != null && (mes <= 3 || mes >= 11)) {
      dato = `En ${MESES[mes - 1]} de ${e.fecha.slice(0, 4)} medí ${e.clorofila.toLocaleString('es-PE', { maximumFractionDigits: 2 })} mg/m³ de clorofila frente a la Península Antártica. Ese verde es tu comida.`
      break
    }
  }
  return [
    { quien: 'orbi', texto: '¡Hola, Kiri! Soy ORBI, un satélite. Desde aquí arriba mido el color del mar todos los días.' },
    ...(dato ? [{ quien: 'orbi' as const, texto: dato }] : []),
    { quien: 'gaia', texto: 'El fitoplancton crece en verano, cuando vuelve la luz y se abre el hielo. Kiri, come todo lo que puedas.' },
    { quien: 'kiri', texto: '¡Entendido! Y nada de acercarme a los pingüinos.' },
  ]
}

/** Lo que dicen los guías al empezar cada año del cardumen, con los datos reales de enero frente a Chimbote */
function presentacionCardumen(mar: Mar, anio: number, primera: boolean): Linea[] {
  const e = mar.estado('chimbote', mar.indice(anio, 1))
  const temp = e.anomaliaTemp == null ? '' : ` el mar estaba ${n1.format(e.anomaliaTemp)} °C frente a lo normal y`
  const lineas: Linea[] = [{ quien: 'orbi', texto: `Año ${anio}. En enero, frente a Chimbote,${temp} la comida estaba al ${Math.round(e.alimento * 100)} % de lo normal.` }]
  if (primera) lineas.unshift(
    { quien: 'gaia', texto: 'Anchi, tú guías al cardumen durante un año. Come las manchas verdes: es el fitoplancton que mide ORBI desde el espacio.' },
    { quien: 'gaia', texto: 'Nada con WASD o flechas; Q sube y E baja. Con C juntas al cardumen: así se protege de los depredadores, pero come menos.' },
    { quien: 'gaia', texto: 'Cada zona de la costa tiene su propia comida cada mes. Si una zona se queda sin alimento, busca en otra.' },
  )
  return lineas
}

/** Diálogos que aparecen la primera vez que ocurre algo durante la partida */
function lineasHito(id: string, m: Mes): Linea[] {
  switch (id) {
    case 'nino': return [
      { quien: 'orbi', texto: `El índice Niño 1+2 está en ${n1.format(m.nino12 ?? 0)} °C: es El Niño. El agua cálida trae pocos nutrientes y el fitoplancton cae, sobre todo en Chimbote y Callao.` },
      { quien: 'gaia', texto: 'Con El Niño la zona sin oxígeno se hunde: hay más espacio abajo, pero menos comida. Paita casi no cambia: puede ser un refugio.' },
    ]
    case 'oxigeno_alto': return [{ quien: 'gaia', texto: 'La zona sin oxígeno subió y nos aprieta hacia la superficie, donde cazan los guanayes. Si ves una sombra arriba, baja.' }]
    case 'veda': return [{ quien: 'orbi', texto: 'La comida en la costa central cayó a menos de la mitad: este mes hay veda y las bolicheras no salen.' }]
    case 'red': return [{ quien: 'gaia', texto: '¡Una bolichera tiende su red! Sal del círculo o baja más hondo de lo que llega la red. Juntos, el cardumen es más fácil de atrapar.' }]
    default: return []
  }
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
  const [aviso, setAviso] = useState<string | null>(null)
  const [compacto, setCompacto] = useState(false)
  const compactoRef = useRef(false)
  const hitos = useRef(new Set<string>())
  const presentado = useRef(false)

  useEffect(() => { document.title = 'Mar Peruano 360 · Juego' }, [])
  useEffect(() => { compactoRef.current = compacto }, [compacto])

  // los datos del mar son los mismos que usa el explorador
  useEffect(() => {
    let activo = true
    loadRuntimeData()
      .then(({ monitor }) => { if (activo) setMar(crearMar(monitor)) })
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

  // escena según la pantalla
  const clave = pantalla.tipo === 'cardumen' ? `cardumen-${pantalla.generacion}-${pantalla.intento}` : pantalla.tipo
  useEffect(() => {
    const motor = motorRef.current
    if (!mar || !motor || !entrada) return
    useDialogo.getState().cerrar()
    if (pantalla.tipo === 'kiri') {
      setComidos(0)
      motor.usar(escenaKiri(entrada, {
        comio: (n) => { setComidos(n); if (n > 0 && n % 5 === 0) avisar(`¡Ñam! ${n}`) },
        golpe: () => avisar('¡Pingüino!'),
      }, hayDialogo))
      void useDialogo.getState().decir(presentacionKiri(mar))
    } else if (pantalla.tipo === 'cardumen') {
      const anio = CAMPANA[pantalla.generacion]!
      setInforme(null)
      setCompacto(false)
      // la presentación va primero; los avisos que la escena dé al empezar (El Niño, veda…) se encolan detrás
      void useDialogo.getState().decir(presentacionCardumen(mar, anio, !presentado.current))
      presentado.current = true
      motor.usar(escenaCardumen(mar, entrada, {
        aviso: avisar,
        hito: (id, m) => {
          if (hitos.current.has(id)) return
          hitos.current.add(id)
          const lineas = lineasHito(id, m)
          if (lineas.length) void useDialogo.getState().decir(lineas)
        },
        fin: (datos, historia) => setInforme({ datos, historia }),
      }, { anio, peces: pantalla.peces, pausa: hayDialogo, compacto: () => compactoRef.current, rapidez: RAPIDEZ }))
    } else {
      motor.usar(() => ({ actualizar: () => {}, destruir: () => {} }))
    }
    // la escena solo cambia cuando cambia la clave
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, mar, entrada])

  // C junta o dispersa el cardumen
  useEffect(() => {
    if (pantalla.tipo !== 'cardumen') return
    const tecla = (e: KeyboardEvent) => { if (e.key.toLowerCase() === 'c' && !e.repeat) setCompacto((x) => !x) }
    addEventListener('keydown', tecla)
    return () => removeEventListener('keydown', tecla)
  }, [pantalla.tipo])

  const empezarCampana = () => { hitos.current.clear(); presentado.current = false; setPantalla({ tipo: 'cardumen', generacion: GENERACION_INICIAL, peces: PECES_INICIALES, intento: Date.now() }) }
  const siguiente = pantalla.tipo === 'cardumen' && informe && pantalla.generacion + 1 < CAMPANA.length
    ? { anio: CAMPANA[pantalla.generacion + 1]!, peces: Math.min(PECES_INICIALES, Math.round(informe.datos.sobrevivientes * 1.8)) }
    : null

  return <div className="juego" ref={contenedor}>
    <canvas className="juego-lienzo" ref={lienzo} aria-label="Escena del juego" />
    <Link className="juego-volver juego-caja" to="/">← Portada</Link>
    {pantalla.tipo !== 'menu' && <button type="button" className="juego-menu-boton juego-caja" onClick={() => { setInforme(null); setPantalla({ tipo: 'menu' }) }}>Menú</button>}

    {pantalla.tipo === 'menu' && mar && <div className="juego-menu">
      <div className="juego-menu-caja juego-caja">
        <h1>Cardumen</h1>
        <p>Sigue a la anchoveta en un mar que cambia con datos satelitales reales.</p>
        <button type="button" className="juego-caja principal" onClick={empezarCampana}>Jugar: el cardumen (2004 y El Niño 1998)</button>
        <button type="button" className="juego-caja" onClick={() => setPantalla({ tipo: 'kiri' })}>Prólogo de prueba: Kiri en la Antártida</button>
        <p className="nota">Versión en desarrollo: personajes provisionales.</p>
      </div>
    </div>}

    {pantalla.tipo === 'kiri' && <>
      <div className="juego-contador juego-caja" aria-live="polite">Kiri comió: {comidos}</div>
      <div className="juego-objetivo juego-caja"><b>Objetivo</b>Come las manchas verdes de fitoplancton y esquiva a los pingüinos.</div>
    </>}

    {pantalla.tipo === 'cardumen' && <HudCardumen entrada={entrada} compacto={compacto} alternar={() => setCompacto((x) => !x)} />}

    <div className={`juego-aviso${aviso ? ' visible' : ''}`} aria-live="assertive">{aviso}</div>
    {pantalla.tipo !== 'menu' && <p className="juego-ayuda"><span className="solo-teclado">WASD o flechas: nadar{pantalla.tipo === 'cardumen' ? ' · Q/E: subir y bajar · C: juntar' : ''} · </span>Arrastrar: girar la cámara</p>}
    <Dialogo />

    {pantalla.tipo === 'cardumen' && informe && <Informe datos={informe.datos} historia={informe.historia} siguiente={siguiente}
      alSeguir={() => siguiente && setPantalla({ tipo: 'cardumen', generacion: pantalla.generacion + 1, peces: siguiente.peces, intento: Date.now() })}
      alRepetir={() => setPantalla({ ...pantalla, intento: Date.now() })}
      alMenu={() => { setInforme(null); setPantalla({ tipo: 'menu' }) }} />}

    {!mar && <div className="juego-estado" role="status">{error ?? 'Cargando el mar…'}</div>}
  </div>
}

