import { useEffect, useState } from 'react'

let atlasPromise: Promise<void> | null = null

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`)
    if (existing) {
      if (existing.dataset.loaded === 'true') return resolve()
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error(`No se pudo cargar ${src}`)), { once: true })
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.onload = () => { script.dataset.loaded = 'true'; resolve() }
    script.onerror = () => reject(new Error(`No se pudo cargar ${src}`))
    document.body.appendChild(script)
  })
}

export function useLegacyAtlas(globeRef: React.MutableRefObject<any>) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!atlasPromise) atlasPromise = loadScript('/assets/data/paises.js').then(() => loadScript('/legacy/atlas.js'))
    let active = true
    atlasPromise.then(() => { if (active) setReady(true) }).catch(console.error)
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!ready || !globeRef.current || !window.ATLAS) return
    let active = true
    window.ATLAS.pintar({ paleta: 'noche', detalle: false, ancho: window.innerWidth <= 900 ? 2048 : 4096 }).then((canvas) => {
      const apply = (attempts: number) => {
        if (!active || !globeRef.current) return
        const material = globeRef.current.globeMaterial?.()
        const Texture = material?.map?.constructor
        if (!material || !Texture) {
          if (attempts > 0) window.setTimeout(() => apply(attempts - 1), 100)
          return
        }
        const texture = new Texture(canvas)
        texture.colorSpace = material.map?.colorSpace || 'srgb'
        texture.anisotropy = 4
        texture.needsUpdate = true
        material.map = texture
        material.needsUpdate = true
        material.color?.setRGB(1, 1, 1)
        material.specular?.setRGB(0.03, 0.03, 0.03)
        material.shininess = 4
      }
      apply(50)
    }).catch(console.error)
    return () => { active = false }
  }, [globeRef, ready])

  return ready
}
