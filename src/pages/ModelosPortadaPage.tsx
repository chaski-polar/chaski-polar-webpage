import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { modelosPortada } from '../features/portada/modelos/instrumentos'
import './modelos-portada.css'

function Visor({ archivo, nombre }: { archivo: string; nombre: string }) {
  const contenedor = useRef<HTMLDivElement>(null)
  const controles = useRef<OrbitControls | null>(null)
  const reiniciar = useRef<() => void>(() => {})
  const [girando, setGirando] = useState(false)
  const [estado, setEstado] = useState('Loading model…')
  useEffect(() => {
    const lugar = contenedor.current!
    let renderer: THREE.WebGLRenderer
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }) }
    catch { setEstado('3D preview is unavailable. You can still download the model below.'); return }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75))
    renderer.setClearColor(0x071e33, 0)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.4
    renderer.domElement.setAttribute('aria-label', `Interactive 3D view: ${nombre}`)
    renderer.domElement.setAttribute('role', 'img')
    lugar.appendChild(renderer.domElement)
    const escena = new THREE.Scene()
    const camara = new THREE.PerspectiveCamera(38, 1, 0.01, 100)
    const control = new OrbitControls(camara, renderer.domElement)
    controles.current = control
    control.enableDamping = true
    control.enablePan = false
    control.autoRotateSpeed = 0.8
    const ambiente = new THREE.HemisphereLight(0xd8f5ff, 0x42617f, 2.5)
    const principal = new THREE.DirectionalLight(0xfff4df, 3.5)
    principal.position.set(4, 7, 5)
    const borde = new THREE.DirectionalLight(0x62bfff, 2)
    borde.position.set(-5, 2, -3)
    escena.add(ambiente, principal, borde)
    let radio = 2, activo = true
    const liberar = (raiz: THREE.Object3D) => raiz.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose()
        for (const m of [o.material].flat()) m.dispose()
      }
    })
    const encuadrar = () => {
      const angulo = Math.min(camara.fov * Math.PI / 360, Math.atan(Math.tan(camara.fov * Math.PI / 360) * camara.aspect))
      const distancia = radio / Math.sin(angulo) * 1.12
      camara.position.copy(new THREE.Vector3(1.5, 1.1, 2.2).normalize().multiplyScalar(distancia))
      control.target.set(0, 0, 0)
      control.minDistance = radio * 1.5
      control.maxDistance = distancia * 2
      control.update()
    }
    reiniciar.current = encuadrar
    const ajustar = () => {
      const { width, height } = lugar.getBoundingClientRect()
      camara.aspect = width / Math.max(1, height)
      camara.updateProjectionMatrix()
      renderer.setSize(width, height)
      encuadrar()
    }
    const observador = new ResizeObserver(ajustar)
    observador.observe(lugar)
    new GLTFLoader().load(`/assets/portada/modelos/${archivo}`, (gltf) => {
      if (!activo) { liberar(gltf.scene); return }
      const caja = new THREE.Box3().setFromObject(gltf.scene)
      radio = caja.getBoundingSphere(new THREE.Sphere()).radius
      gltf.scene.position.sub(caja.getCenter(new THREE.Vector3()))
      escena.add(gltf.scene)
      encuadrar()
      setEstado('')
    }, undefined, () => { if (activo) setEstado('The model could not load. Reload the page to try again.') })
    renderer.setAnimationLoop(() => {
      if (document.hidden) return
      control.update()
      renderer.render(escena, camara)
    })
    return () => {
      activo = false
      renderer.setAnimationLoop(null)
      observador.disconnect()
      controles.current = null
      control.dispose()
      liberar(escena)
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [archivo, nombre])
  useEffect(() => { if (controles.current) controles.current.autoRotate = girando }, [girando])
  const girar = (angulo: number) => {
    const control = controles.current
    if (!control) return
    control.object.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), angulo)
    control.update()
  }
  return <div className="modelos-visor">
    <div ref={contenedor} className="modelos-canvas" />
    {estado && <p className="modelos-estado" role="status">{estado}</p>}
    <div className="modelos-controles" aria-label="Model view controls">
      <button onClick={() => girar(-Math.PI / 6)} aria-label="Rotate left">↶</button>
      <button onClick={() => girar(Math.PI / 6)} aria-label="Rotate right">↷</button>
      <button onClick={() => setGirando(!girando)} aria-pressed={girando}>{girando ? 'Pause rotation' : 'Auto rotate'}</button>
      <button onClick={() => reiniciar.current()}>Reset view</button>
    </div>
  </div>
}

export default function ModelosPortadaPage() {
  const [indice, setIndice] = useState(0)
  const modelo = modelosPortada[indice]!
  useEffect(() => {
    const idioma = document.documentElement.lang, titulo = document.title
    document.documentElement.lang = 'en'
    document.title = '3D collection · Chaski Polar'
    return () => { document.documentElement.lang = idioma; document.title = titulo }
  }, [])
  return <main className="modelos-pagina">
    <header className="modelos-cabecera"><Link to="/">Chaski Polar</Link><Link to="/">Back to the ocean ↗</Link></header>
    <div className="modelos-intro"><h1>From orbit to a single cell.</h1><p>Explore three original models for the Chaski Polar journey.</p></div>
    <div className="modelos-layout">
      <Visor key={modelo.id} archivo={modelo.archivo} nombre={modelo.nombre} />
      <aside className="modelos-detalle">
        <nav aria-label="Choose a model" className="modelos-selector">{modelosPortada.map((m, i) => <button key={m.id} aria-pressed={i === indice} onClick={() => setIndice(i)}>{m.nombre}</button>)}</nav>
        <div aria-live="polite"><p className="modelos-ubicacion">{modelo.ubicacion}</p><h2>{modelo.nombre}</h2><p>{modelo.descripcion}</p></div>
        <p className="modelos-nota">Conceptual educational models. Shapes and proportions are illustrative.</p>
        <a className="modelos-descarga" href={`/assets/portada/modelos/${modelo.archivo}`} download>Download 3D model <span>GLB ↓</span></a>
      </aside>
    </div>
    <p className="modelos-ayuda">Drag to orbit · Pinch or scroll to zoom · Use the buttons for keyboard control</p>
  </main>
}
