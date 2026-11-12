import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

// El logo está en un solo lugar: para cambiarlo basta con reemplazar public/assets/logotipo_chaski_polar.png
const LOGO = '/assets/logotipo_chaski_polar.png'

type Seccion = 'explore' | 'findings'

export default function Header() {
  const { pathname } = useLocation()
  const [seccion, setSeccion] = useState<Seccion>('explore')

  // la opción activa sigue al scroll: el globo es «Explore»; desde «What the data shows» hacia abajo, «Findings»
  useEffect(() => {
    if (pathname !== '/explorer') return
    const calcular = () => {
      const h = document.getElementById('hallazgos')
      setSeccion(h && h.getBoundingClientRect().top <= window.innerHeight * 0.45 ? 'findings' : 'explore')
    }
    calcular()
    addEventListener('scroll', calcular, { passive: true })
    return () => removeEventListener('scroll', calcular)
  }, [pathname])

  const irAExplorar = (e: React.MouseEvent) => {
    // ya estamos en el explorador: se vuelve al globo sin recargar (así no se pierde el mes ni la zona elegidos)
    if (pathname !== '/explorer') return
    e.preventDefault()
    setSeccion('explore')
    scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }
  const irAHallazgos = (e: React.MouseEvent) => {
    const h = document.getElementById('hallazgos')
    if (!h) return
    e.preventDefault()
    setSeccion('findings')
    h.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }

  return <>
    <a className="saltar" href="#contenido">Skip to content</a>
    <header className="app-header fixed inset-x-0 top-0 z-30 flex items-center justify-between gap-4 px-4 py-2 pointer-events-none sm:px-8">
      <div className="flex min-w-0 items-center gap-4">
        <Link className="app-brand pointer-events-auto flex shrink-0 items-center gap-3 no-underline" to="/" aria-label="Chaski Polar, return to home">
          <img className="h-10 w-12 rounded-[3px] bg-white object-contain" src={LOGO} alt="" />
          <span className="hidden font-display text-[1.3rem] text-ice-100 sm:inline">Chaski Polar</span>
        </Link>
        <div className="titulo-barra hidden truncate font-display text-[1.05rem] font-normal text-ice-300 lg:block" role="heading" aria-level={1}>
          From the Antarctic to the Peruvian sea
        </div>
      </div>
      <nav className="app-nav pointer-events-auto ml-auto flex gap-1" aria-label="Sections">
        <Link className="rounded-pill px-3 py-1.5 no-underline transition-colors" to="/">Home</Link>
        <Link className="rounded-pill px-3 py-1.5 no-underline transition-colors" to="/explorer" onClick={irAExplorar} aria-current={seccion === 'explore' ? 'page' : undefined}>Explore</Link>
        <a className="rounded-pill px-3 py-1.5 no-underline transition-colors" href="#hallazgos" onClick={irAHallazgos} aria-current={seccion === 'findings' ? 'location' : undefined}>Findings</a>
      </nav>
    </header>
  </>
}
