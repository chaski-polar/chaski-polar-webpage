import { useEffect, useState } from 'react'
import { nombreDe, retratoDe } from '../personajes/guias'
import { useDialogo } from './estado'

const LETRAS_POR_SEGUNDO = 45
const sinMovimiento = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** Caja de diálogo con retrato. El texto aparece letra a letra; Espacio, Enter o un toque lo completan y avanzan */
export default function Dialogo() {
  const { linea, avanzar } = useDialogo()
  const [letras, setLetras] = useState(0)
  const largo = linea?.texto.length ?? 0
  const completo = letras >= largo

  useEffect(() => {
    if (!linea) return
    if (sinMovimiento()) { setLetras(linea.texto.length); return }
    setLetras(0)
    const inicio = performance.now()
    let id = 0
    const paso = (ahora: number) => {
      const n = Math.min(linea.texto.length, Math.floor(((ahora - inicio) / 1000) * LETRAS_POR_SEGUNDO))
      // si el jugador ya completó el texto, no se vuelve atrás
      setLetras((antes) => Math.max(antes, n))
      if (n < linea.texto.length) id = requestAnimationFrame(paso)
    }
    id = requestAnimationFrame(paso)
    return () => cancelAnimationFrame(id)
  }, [linea])

  useEffect(() => {
    if (!linea) return
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== ' ' && e.key !== 'Enter') return
      e.preventDefault()
      if (completo) avanzar(); else setLetras(largo)
    }
    addEventListener('keydown', tecla)
    return () => removeEventListener('keydown', tecla)
  }, [linea, completo, largo, avanzar])

  if (!linea) return null
  return <button type="button" className="juego-dialogo juego-caja" onClick={() => (completo ? avanzar() : setLetras(largo))}
    aria-label={`${nombreDe(linea.quien)}: ${linea.texto}. Pulsa para continuar`}>
    <img className="juego-dialogo-retrato" src={retratoDe(linea.quien)} alt="" width={96} height={96} />
    <span className="juego-dialogo-texto">
      <b>{nombreDe(linea.quien)}</b>
      <span aria-hidden="true">{linea.texto.slice(0, letras)}</span>
    </span>
    {completo && <span className="juego-dialogo-seguir" aria-hidden="true">▶</span>}
  </button>
}
