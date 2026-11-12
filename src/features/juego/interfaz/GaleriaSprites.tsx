import { useEffect, useMemo, useState } from 'react'
import * as px from '../personajes/pixelart'
import { PALETA } from '../motor/pixel'
import './presentacion.css'

/** Galería de sprites ampliados (abrir /juego?sprites=1): sirve para revisar el pixel art sobre el fondo de la página */
export default function GaleriaSprites() {
  const [cuadro, setCuadro] = useState(0)
  const [animar, setAnimar] = useState(() => !matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    if (!animar) return
    const id = window.setInterval(() => setCuadro((c) => c + 1), 160)
    return () => clearInterval(id)
  }, [animar])
  const lista = useMemo(() => Object.entries({
    Nara: px.naraPixel(), Anchi: px.anchiPixel(), Anchoveta: px.anchovetaPixel(), Kiri: px.kiriPixel(), Lumi: px.lumiPixel(),
    Fito: px.fitoPixel(), Nutriente: px.nutrientePixel(), 'Pingüino': px.pinguinoPixel(), Guanay: px.guanayPixel(), Lobo: px.loboPixel(),
    ORBI: px.orbiPixel(), Gaia: px.gaiaPixel(),
  }).map(([nombre, cuadros]) => ({ nombre, srcs: cuadros.map((c) => ({ src: c.toDataURL(), w: c.width, h: c.height })) })), [])
  return <div className="juego-galeria cuaderno-sprites">
    <header className="cuaderno-cabecera">
      <a href="/juego">← Volver al juego</a>
      <h1>Habitantes del Pacífico</h1>
      <p>Pixel art original · Siluetas a escala real y ampliadas · Animación por cuadros</p>
      <button type="button" className="juego-caja" aria-pressed={animar} onClick={() => setAnimar((a) => !a)}>{animar ? 'Pausar animación' : 'Animar personajes'}</button>
      <div className="cuaderno-paleta" aria-label="Paleta de los personajes">{Object.entries(PALETA).map(([nombre, color]) => <span key={nombre} style={{ background: color }} title={`${nombre}: ${color}`} />)}</div>
    </header>
    {lista.map((s) => <figure key={s.nombre}>
      <div className="cuaderno-muestra">{(() => {
        const c = s.srcs[cuadro % s.srcs.length]!
        const escala = Math.max(1, Math.floor(Math.min(180 / c.w, 100 / c.h)))
        return <img src={c.src} alt={s.nombre} width={c.w * escala} height={c.h * escala} />
      })()}</div>
      <figcaption><b>{s.nombre}</b><span>{s.srcs[0]!.w} × {s.srcs[0]!.h} px · {s.srcs.length} cuadros</span></figcaption>
      <div className="cuaderno-cuadros">{s.srcs.map((c, k) => <a key={k} href={c.src} download={`${s.nombre.toLowerCase()}-${k + 1}.png`} aria-label={`Descargar ${s.nombre}, cuadro ${k + 1}`}><img src={c.src} alt="" width={c.w} height={c.h} /></a>)}</div>
    </figure>)}
  </div>
}
