import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadRuntimeData } from '../data/loaders/runtime'
import Dialogo from '../features/juego/dialogo/Dialogo'
import { hayDialogo, useDialogo, type Linea } from '../features/juego/dialogo/estado'
import { escenaKiri } from '../features/juego/escenas/kiri'
import { crearEntrada } from '../features/juego/motor/entrada'
import { crearMotor } from '../features/juego/motor/escena'
import { crearMar, type Mar } from '../features/juego/motor/mar'
import '../features/juego/juego.css'

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

/** Presentación de la escena de Kiri. ORBI cita la clorofila real del último verano antártico medido */
function presentacion(mar: Mar): Linea[] {
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

/** Juego: mundo 3D con personajes dibujados en 2D. Por ahora, la escena de Kiri en la Antártida */
export default function JuegoPage() {
  const contenedor = useRef<HTMLDivElement>(null)
  const lienzo = useRef<HTMLCanvasElement>(null)
  const [mar, setMar] = useState<Mar | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [comidos, setComidos] = useState(0)
  const [aviso, setAviso] = useState<string | null>(null)

  useEffect(() => { document.title = 'Mar Peruano 360 · Juego' }, [])

  // los datos del mar son los mismos que usa el explorador
  useEffect(() => {
    let activo = true
    loadRuntimeData()
      .then(({ monitor }) => { if (activo) setMar(crearMar(monitor)) })
      .catch(() => { if (activo) setError('No se pudieron cargar los datos del mar.') })
    return () => { activo = false }
  }, [])

  useEffect(() => {
    if (!mar || !lienzo.current || !contenedor.current) return
    const motor = crearMotor(lienzo.current)
    const entrada = crearEntrada(contenedor.current)
    let temporizador = 0
    const avisar = (texto: string) => {
      setAviso(texto)
      clearTimeout(temporizador)
      temporizador = window.setTimeout(() => setAviso(null), 1400)
    }
    motor.usar(escenaKiri(entrada, {
      comio: (n) => { setComidos(n); if (n > 0 && n % 5 === 0) avisar(`¡Ñam! ${n}`) },
      golpe: () => avisar('¡Pingüino!'),
    }, hayDialogo))
    void useDialogo.getState().decir(presentacion(mar))
    return () => { clearTimeout(temporizador); useDialogo.getState().cerrar(); entrada.destruir(); motor.destruir() }
  }, [mar])

  return <div className="juego" ref={contenedor}>
    <canvas className="juego-lienzo" ref={lienzo} aria-label="Escena del juego: Kiri, el krill, nada bajo el hielo antártico" />
    <Link className="juego-volver juego-caja" to="/">← Portada</Link>
    <div className="juego-contador juego-caja" aria-live="polite">Kiri comió: {comidos}</div>
    <div className="juego-objetivo juego-caja"><b>Objetivo</b>Come las manchas verdes de fitoplancton y esquiva a los pingüinos.</div>
    <div className={`juego-aviso${aviso ? ' visible' : ''}`} aria-live="assertive">{aviso}</div>
    <p className="juego-ayuda"><span className="solo-teclado">WASD o flechas: nadar · </span>Arrastrar: girar la cámara · Rueda o pellizco: acercar</p>
    <Dialogo />
    {!mar && <div className="juego-estado" role="status">{error ?? 'Cargando el mar…'}</div>}
  </div>
}
