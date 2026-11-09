import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { pintar } from '../../../lib/atlas'
import { esAngosto } from '../lib/entorno'
import { RELIEVE } from '../lib/mapa'
import type { GlobeView } from '../store'

const FOTO_SATELITAL = '/assets/globe/earth-blue-marble.jpg'

// una textura por vista, pintada una sola vez y guardada (sirve también al volver a entrar al explorador)
const texturas = new Map<GlobeView, Promise<THREE.Texture>>()

function texturaDe(vista: GlobeView): Promise<THREE.Texture> {
  let t = texturas.get(vista)
  if (!t) {
    t = (vista === 'satellite'
      ? new THREE.TextureLoader().loadAsync(FOTO_SATELITAL)
      : pintar({ paleta: 'noche', detalle: vista === 'detailed', ancho: esAngosto() ? 2048 : 4096, relieveSrc: RELIEVE }).then((c) => new THREE.CanvasTexture(c))
    ).then((tex) => {
      tex.colorSpace = THREE.SRGBColorSpace
      tex.anisotropy = 4
      return tex
    })
    t.catch(() => texturas.delete(vista))
    texturas.set(vista, t)
  }
  return t
}

/** Pone en el material del globo el atlas de la vista elegida. Devuelve true cuando ya tiene textura */
export function useAtlas(vista: GlobeView, material: THREE.MeshPhongMaterial): boolean {
  const [listo, setListo] = useState(false)
  useEffect(() => {
    let activo = true
    texturaDe(vista).then((tex) => {
      if (!activo) return
      material.map = tex
      material.color.set(0xffffff)
      material.needsUpdate = true
      setListo(true)
    }).catch((e: unknown) => console.warn('No se pudo preparar el globo', e))
    return () => { activo = false }
  }, [vista, material])
  return listo
}
