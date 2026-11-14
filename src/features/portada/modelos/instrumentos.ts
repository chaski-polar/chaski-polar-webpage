import * as THREE from 'three'
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'

// Geometría original, sin texturas externas. Y es el eje vertical.
function material(nombre: string, color: number, metalness = 0.2, roughness = 0.45) {
  const m = new THREE.MeshStandardMaterial({ color, metalness, roughness })
  m.name = nombre
  return m
}

function taller(nombre: string) {
  const grupo = new THREE.Group()
  grupo.name = nombre
  const pieza = (g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(g, m)
    mesh.position.set(x, y, z)
    grupo.add(mesh)
    return mesh
  }
  const barra = (a: number[], b: number[], radio: number, m: THREE.Material) => {
    const inicio = new THREE.Vector3(...a), fin = new THREE.Vector3(...b)
    const direccion = fin.clone().sub(inicio)
    const mesh = pieza(new THREE.CylinderGeometry(radio, radio, direccion.length(), 8), m)
    mesh.position.copy(inicio.add(fin).multiplyScalar(0.5))
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direccion.normalize())
  }
  // Una malla por material: los detalles no multiplican las llamadas de dibujo.
  const terminar = () => {
    grupo.updateMatrixWorld(true)
    const lotes = new Map<THREE.Material, THREE.BufferGeometry[]>()
    grupo.traverse((objeto) => {
      if (!(objeto instanceof THREE.Mesh)) return
      const m = objeto.material as THREE.Material
      const g = objeto.geometry.clone().applyMatrix4(objeto.matrixWorld)
      const plano = g.index ? g.toNonIndexed() : g
      if (plano !== g) g.dispose()
      const lote = lotes.get(m) ?? []
      lote.push(plano)
      lotes.set(m, lote)
      objeto.geometry.dispose()
    })
    grupo.clear()
    lotes.forEach((geometrias, m) => {
      const g = mergeGeometries(geometrias)
      if (!g) throw new Error(`No se pudo unir ${nombre}: ${m.name}`)
      geometrias.forEach((parte) => parte.dispose())
      const compacta = mergeVertices(g)
      g.dispose()
      const mesh = new THREE.Mesh(compacta, m)
      mesh.name = m.name
      grupo.add(mesh)
    })
    grupo.userData = { autor: 'Chaski Polar', tipo: 'Ilustración educativa, no réplica de un instrumento real' }
    return grupo
  }
  return { pieza, barra, terminar }
}

/** Satélite conceptual: aislante térmico, radiador, óptica y dos alas solares. */
export function crearSateliteObservacion() {
  const { pieza, barra, terminar } = taller('Satelite_observacion')
  const oro = material('Aislante_dorado', 0xc89b45, 0.65)
  const plata = material('Aluminio', 0xcbdde3, 0.55)
  const azul = material('Celulas_solares', 0x174e9a, 0.35, 0.3)
  const oscuro = material('Instrumentacion', 0x142639, 0.35)
  const lente = material('Optica_azul', 0x45c4e5, 0.55, 0.16)
  pieza(new THREE.BoxGeometry(1.15, 1.15, 1.1), oro)
  for (const y of [-0.6, 0.6]) pieza(new THREE.BoxGeometry(1.26, 0.08, 1.2), plata, 0, y)
  for (const x of [-0.6, 0.6]) {
    pieza(new THREE.BoxGeometry(0.04, 0.85, 0.8), plata, x)
    for (let i = 0; i < 6; i++) pieza(new THREE.BoxGeometry(0.06, 0.025, 0.72), oscuro, x, -0.32 + i * 0.13)
  }
  for (const lado of [-1, 1]) {
    barra([lado * 0.6, 0, 0], [lado * 1.25, 0, 0], 0.055, plata)
    pieza(new THREE.BoxGeometry(2.35, 0.065, 1.32), plata, lado * 2.32)
    for (let col = 0; col < 8; col++) for (let fila = 0; fila < 4; fila++) {
      pieza(new THREE.BoxGeometry(0.264, 0.018, 0.282), azul, lado * 2.32 - 1.01 + col * 0.29, 0.047, -0.465 + fila * 0.31)
    }
    barra([lado * 0.5, -0.42, 0], [lado * 1.3, -0.03, 0], 0.025, oro)
  }
  // Óptica orientada hacia el frente del visor; antena parabólica hacia arriba.
  pieza(new THREE.CylinderGeometry(0.27, 0.32, 0.55, 24), oscuro, 0, -0.1, 0.77).rotation.x = Math.PI / 2
  pieza(new THREE.CylinderGeometry(0.225, 0.225, 0.025, 24), lente, 0, -0.1, 1.06).rotation.x = Math.PI / 2
  const perfil = Array.from({ length: 12 }, (_, i) => {
    const r = 0.04 + i / 11 * 0.48
    return new THREE.Vector2(r, r * r * 0.85)
  })
  const parabola = material('Antena_ceramica', 0xe8f0f2, 0.2)
  parabola.side = THREE.DoubleSide
  pieza(new THREE.LatheGeometry(perfil, 32), parabola, 0, 0.74)
  barra([0, 0.6, 0], [0, 1.24, 0], 0.025, plata)
  pieza(new THREE.SphereGeometry(0.06, 10, 8), oro, 0, 1.24)
  for (const x of [-0.4, 0.4]) barra([x, 0.55, -0.4], [x, 1.35, -0.4], 0.015, plata)
  return terminar()
}

/** Boya conceptual, con línea de flotación en Y=0 y sensor sumergido. */
export function crearBoyaOceanografica() {
  const { pieza, barra, terminar } = taller('Boya_oceanografica')
  const amarillo = material('Flotador_amarillo', 0xf1b83e, 0.15)
  const azul = material('Instrumentos_azules', 0x216aa5, 0.3)
  const blanco = material('Estructura_marina', 0xd5e6eb, 0.45)
  const oscuro = material('Panel_solar', 0x153960, 0.35)
  const luz = material('Baliza', 0xf27337)
  pieza(new THREE.CylinderGeometry(0.9, 0.65, 0.42, 32), amarillo, 0, 0.06)
  pieza(new THREE.TorusGeometry(0.78, 0.17, 8, 32), amarillo, 0, -0.02).rotation.x = Math.PI / 2
  pieza(new THREE.CylinderGeometry(0.62, 0.7, 0.12, 32), blanco, 0, 0.32)
  pieza(new THREE.CylinderGeometry(0.26, 0.3, 0.75, 16), azul, 0, 0.7)
  for (const x of [-0.42, 0.42]) for (const z of [-0.42, 0.42]) {
    barra([x, 0.35, z], [x * 0.4, 1.75, z * 0.4], 0.027, blanco)
  }
  pieza(new THREE.BoxGeometry(0.9, 0.06, 0.72), blanco, 0, 1.35, 0.25).rotation.x = 0.35
  pieza(new THREE.BoxGeometry(0.82, 0.025, 0.64), oscuro, 0, 1.39, 0.26).rotation.x = 0.35
  for (let i = 0; i < 5; i++) pieza(new THREE.BoxGeometry(0.012, 0.025, 0.62), blanco, -0.32 + i * 0.16, 1.41, 0.26).rotation.x = 0.35
  barra([0, 1, 0], [0, 2.55, 0], 0.035, blanco)
  pieza(new THREE.CylinderGeometry(0.11, 0.11, 0.18, 16), luz, 0, 2.05)
  barra([0, 2.35, 0], [0.44, 2.35, 0], 0.025, blanco)
  pieza(new THREE.ConeGeometry(0.12, 0.28, 12), azul, 0.44, 2.35).rotation.z = -Math.PI / 2
  barra([0, -0.15, 0], [0, -1.05, 0], 0.045, blanco)
  pieza(new THREE.CylinderGeometry(0.14, 0.14, 0.45, 16), azul, 0, -0.88)
  pieza(new THREE.TorusGeometry(0.48, 0.035, 8, 24), blanco, 0, 0.55).rotation.x = Math.PI / 2
  return terminar()
}

/** Diatomea céntrica estilizada; escala ampliada, sin pretensión taxonómica. */
export function crearDiatomea() {
  const { pieza, barra, terminar } = taller('Diatomea_ampliada')
  const silice = material('Frustula_silice', 0x8ed4ce, 0.15, 0.4)
  const poros = material('Poros', 0x174f62, 0.15)
  const pigmento = material('Pigmento_dorado', 0xc3a854, 0.15)
  pieza(new THREE.CylinderGeometry(1.34, 1.34, 0.36, 64), silice)
  for (const y of [-0.19, 0.19]) {
    for (const radio of [0.45, 0.87, 1.3]) pieza(new THREE.TorusGeometry(radio, 0.025, 6, 64), pigmento, 0, y).rotation.x = Math.PI / 2
    pieza(new THREE.SphereGeometry(0.22, 16, 8), pigmento, 0, y).scale.y = 0.26
    for (let anillo = 1; anillo <= 4; anillo++) {
      const n = anillo * 12, radio = anillo * 0.27
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2 + anillo * 0.04
        pieza(new THREE.CylinderGeometry(0.032, 0.032, 0.008, 6), poros, Math.cos(a) * radio, y, Math.sin(a) * radio)
      }
    }
  }
  for (let i = 0; i < 48; i++) {
    const a = i / 48 * Math.PI * 2
    barra([Math.cos(a) * 1.345, -0.16, Math.sin(a) * 1.345], [Math.cos(a) * 1.345, 0.16, Math.sin(a) * 1.345], 0.018, pigmento)
  }
  return terminar()
}

export const modelosPortada = [
  { id: 'satelite', nombre: 'Observation satellite', crear: crearSateliteObservacion, descripcion: 'Solar arrays, thermal insulation and an optical instrument. A conceptual companion to the orbital scene.', ubicacion: 'Orbit', archivo: 'satelite-observacion.glb' },
  { id: 'boya', nombre: 'Oceanographic buoy', crear: crearBoyaOceanografica, descripcion: 'A floating station with solar power, a beacon and a submerged sensor. Placed at the ocean surface.', ubicacion: 'Ocean surface', archivo: 'boya-oceanografica.glb' },
  { id: 'diatomea', nombre: 'Diatom', crear: crearDiatomea, descripcion: 'An enlarged, stylized view of a centric diatom. Radial pores and a patterned silica shell reveal the structure of this microscopic organism.', ubicacion: 'Enlarged study', archivo: 'diatomea.glb' },
] as const
