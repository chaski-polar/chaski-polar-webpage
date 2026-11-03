import { useEffect, useState } from 'react'

let atlasPromise: Promise<string> | null = null

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

export function useLegacyAtlas() {
  const [illustratedUrl, setIllustratedUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!atlasPromise) {
      atlasPromise = loadScript('/assets/data/paises.js')
        .then(() => loadScript('/legacy/atlas.js'))
        .then(() => window.ATLAS!.pintar({ paleta: 'noche', detalle: false, ancho: window.innerWidth <= 900 ? 2048 : 4096 }))
        .then((canvas) => canvas.toDataURL('image/png'))
    }
    let active = true
    atlasPromise.then((url) => { if (active) setIllustratedUrl(url) }).catch(console.error)
    return () => { active = false }
  }, [])

  return illustratedUrl
}
