import { useEffect, useRef } from 'react'
import { protagonistas } from '../personajes/galeria'
import { anchovetaPixel, fitoPixel, naraPixel } from '../personajes/pixelart'
import './presentacion.css'

/** Carta ilustrada original: la cuadrícula y los dibujos comparten el mismo píxel. */
function CartaMarina() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const g = ref.current?.getContext('2d')
    if (!g) return
    g.imageSmoothingEnabled = false
    g.fillStyle = '#0b2435'; g.fillRect(0, 0, 384, 256)
    g.strokeStyle = '#16394b'; g.lineWidth = 1
    for (let x = 16; x < 384; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke() }
    for (let y = 16; y < 256; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(384, y); g.stroke() }
    // Costa esquemática. La escena ilustra el viaje; no representa datos satelitales.
    const costa = [[298, 0], [285, 30], [306, 62], [299, 92], [324, 131], [322, 160], [347, 197], [350, 256], [384, 256], [384, 0]]
    g.fillStyle = '#284650'; g.beginPath()
    costa.forEach(([x, y], i) => i ? g.lineTo(x!, y!) : g.moveTo(x!, y!)); g.closePath(); g.fill()
    g.strokeStyle = '#628781'; g.beginPath()
    costa.slice(0, 8).forEach(([x, y], i) => i ? g.lineTo(x!, y!) : g.moveTo(x!, y!)); g.stroke()
    g.strokeStyle = '#497d83'; g.setLineDash([3, 5]); g.beginPath()
    g.moveTo(54, 236); g.lineTo(118, 199); g.lineTo(191, 154); g.lineTo(255, 94); g.lineTo(276, 38); g.stroke(); g.setLineDash([])
    g.fillStyle = '#c0d3d1'
    for (const [x, y] of [[16, 238], [32, 232], [48, 241], [64, 234]]) g.fillRect(x!, y!, 20, 18)
    g.drawImage(naraPixel()[0]!, 57, 70, 216, 108)
    const pez = anchovetaPixel()[0]!
    for (const [x, y] of [[210, 188], [238, 181], [238, 202], [264, 192], [190, 208]]) g.drawImage(pez, x!, y!, 44, 20)
    g.drawImage(fitoPixel()[0]!, 58, 29, 32, 32)
    g.fillStyle = '#8cb9b5'; g.font = '9px monospace'
    g.fillText('PACIFICO SUR', 17, 19); g.fillText('PERU', 309, 30); g.fillText('ANTARTIDA', 18, 223)
    g.fillStyle = '#dfbc79'; g.fillRect(274, 36, 4, 4)
  }, [])
  return <canvas ref={ref} width={384} height={256} role="img" aria-label="Carta ilustrada del Pacífico: una ballena migra desde el hielo antártico hacia un cardumen frente al Perú" />
}

export default function MenuCardumen({ historia, cardumen, escena }: {
  historia: () => void; cardumen: () => void; escena: (id: 'lumi' | 'kiri' | 'nara') => void
}) {
  return <div className="juego-menu menu-carta">
    <div className="menu-carta-interior">
      <header className="menu-carta-marca"><span>MAR PERUANO 360</span><span>Bitácora de expedición</span></header>
      <div className="menu-carta-principal">
        <section className="menu-carta-relato" aria-labelledby="titulo-cardumen">
          <p className="menu-carta-numero">01 / DEL HIELO A LA COSTA</p>
          <h1 id="titulo-cardumen">Cardumen<span>La saga de la anchoveta</span></h1>
          <p className="menu-carta-descripcion">El mar cambia. Encuentra alimento, esquiva las redes y lleva a tu cardumen hasta la siguiente generación.</p>
          <div className="menu-carta-acciones">
            <button type="button" className="juego-caja principal" onClick={historia}>Comenzar el viaje <span aria-hidden="true">→</span></button>
            <button type="button" className="juego-caja" onClick={cardumen}>Ir al cardumen</button>
          </div>
          <p className="menu-carta-datos">Seis años del mar peruano · Condiciones basadas en datos satelitales</p>
        </section>
        <figure className="menu-carta-mapa"><CartaMarina /><figcaption>Dos mares. Una historia de vida.</figcaption></figure>
      </div>
      <ul className="menu-carta-reparto" aria-label="Etapas de la historia">
        {protagonistas().map((p, i) => <li key={p.nombre}>
          <img src={p.src} alt="" width={96} height={64} />
          <div><small>0{i + 1}</small><b>{p.nombre}</b><span>{p.que}</span></div>
        </li>)}
      </ul>
      <footer className="menu-carta-pie"><span>Explorar una escena</span><nav aria-label="Escenas del prólogo">
        <button type="button" onClick={() => escena('lumi')}>Lumi</button>
        <button type="button" onClick={() => escena('kiri')}>Kiri</button>
        <button type="button" onClick={() => escena('nara')}>Nara</button>
        <a href="/juego?sprites=1">Cuaderno de personajes ↗</a>
      </nav></footer>
    </div>
  </div>
}
