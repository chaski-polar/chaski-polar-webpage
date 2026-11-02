import { useEffect, useMemo, useRef, useState } from 'react'
import explorerHtml from './legacy/index.html?raw'
import gameHtml from './legacy/juego.html?raw'
import './App.css'

type LegacyPageProps = {
  html: string
  stylesheet: string
  scripts: string[]
}

function bodyMarkup(html: string) {
  const parsed = new DOMParser().parseFromString(html, 'text/html')
  parsed.querySelectorAll('script').forEach((script) => script.remove())
  return parsed.body.innerHTML
}

function LegacyPage({ html, stylesheet, scripts }: LegacyPageProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const markup = useMemo(() => bodyMarkup(html), [html])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = `/legacy/${stylesheet}`
    link.dataset.legacyAsset = 'true'
    document.head.appendChild(link)

    let cancelled = false
    const loadedScripts: HTMLScriptElement[] = []

    const load = async () => {
      try {
        for (const source of scripts) {
          await new Promise<void>((resolve, reject) => {
            if (cancelled) return resolve()
            const script = document.createElement('script')
            script.src = `/legacy/${source}`
            script.dataset.legacyAsset = 'true'
            script.onload = () => resolve()
            script.onerror = () => reject(new Error(`No se pudo cargar ${source}`))
            document.body.appendChild(script)
            loadedScripts.push(script)
          })
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Error cargando la página')
        }
      }
    }

    void load()

    return () => {
      cancelled = true
      link.remove()
      loadedScripts.forEach((script) => script.remove())
      document.querySelectorAll('[data-legacy-asset="true"]').forEach((node) => node.remove())
      root.replaceChildren()
    }
  }, [scripts, stylesheet])

  return (
    <div className="legacy-page" ref={rootRef}>
      <div dangerouslySetInnerHTML={{ __html: markup }} />
      {error && <p className="legacy-error">{error}</p>}
    </div>
  )
}

const explorerScripts = [
  'vendor/globe.gl.min.js',
  'vendor/chart.umd.min.js',
  'img/earth-topology.js',
  'datos.js?v=13',
  'comun.js?v=13',
  'paises.js',
  'atlas.js?v=5',
  'monitor-data.js',
  'monitor-mapas.js',
  'explorador.js?v=30',
  'monitor.js?v=1',
]

const gameScripts = [
  'datos.js?v=8',
  'comun.js?v=8',
  'juego-sprites.js?v=2',
  'juego-pixel.js?v=5',
  'juego-escena.js?v=5',
  'juego.js?v=22',
]

function App() {
  const [path, setPath] = useState(window.location.pathname)

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  if (path === '/juego' || path === '/juego.html') {
    return <LegacyPage html={gameHtml} stylesheet="juego.css" scripts={gameScripts} />
  }

  return <LegacyPage html={explorerHtml} stylesheet="estilos.css" scripts={explorerScripts} />
}

export default App
