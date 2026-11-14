import { mkdir, writeFile } from 'node:fs/promises'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { Box3, Vector3 } from 'three'
import { modelosPortada } from '../src/features/portada/modelos/instrumentos.ts'

// Adaptación mínima de FileReader para el exportador de Three en Node.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buffer) => { this.result = buffer; this.onloadend?.() })
  }
}
const destino = new URL('../public/assets/portada/modelos/', import.meta.url)
await mkdir(destino, { recursive: true })
for (const modelo of modelosPortada) {
  const raiz = modelo.crear()
  const glb = await new GLTFExporter().parseAsync(raiz, { binary: true })
  const datos = Buffer.from(glb)
  if (datos.readUInt32LE(0) !== 0x46546c67 || datos.readUInt32LE(8) !== datos.length) throw new Error('GLB inválido')
  // Comprueba el archivo real tras exportarlo, incluidas sus dimensiones y coordenadas.
  const recuperado = await new GLTFLoader().parseAsync(glb, '')
  const original = new Box3().setFromObject(raiz)
  const copia = new Box3().setFromObject(recuperado.scene)
  if (original.min.distanceTo(copia.min) > 0.0001 || original.max.distanceTo(copia.max) > 0.0001) throw new Error('Dimensiones alteradas en la exportación')
  if (copia.getSize(new Vector3()).toArray().some((n) => !Number.isFinite(n) || n <= 0)) throw new Error('Dimensiones inválidas')
  recuperado.scene.traverse((o) => {
    if (!o.isMesh) return
    if (!Array.from(o.geometry.attributes.position.array).every(Number.isFinite)) throw new Error('Vértices inválidos')
  })
  let triangulos = 0
  raiz.traverse((o) => { if (o.isMesh) triangulos += (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3 })
  await writeFile(new URL(modelo.archivo, destino), datos)
  console.log(`${modelo.archivo}: ${datos.length} bytes, ${triangulos} triángulos, ${raiz.children.length} mallas`)
}
