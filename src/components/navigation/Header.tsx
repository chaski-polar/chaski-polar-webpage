import { NavLink } from 'react-router-dom'

export default function Header() {
  return <>
    <a className="saltar" href="#contenido">Skip to content</a>
    <header className="app-header fixed inset-x-0 top-0 z-30 flex items-center justify-between gap-4 px-4 py-3 pointer-events-none sm:px-8">
      <div className="titulo-barra hidden truncate font-display text-[1.12rem] font-normal text-ice-300 sm:block" role="heading" aria-level={1}>
        From the Antarctic to the Peruvian sea
      </div>
      <nav className="app-nav pointer-events-auto ml-auto flex gap-1" aria-label="Sections">
        <NavLink className="rounded-pill px-3 py-1.5 no-underline transition-colors" to="/" end>Home</NavLink>
        <NavLink className="rounded-pill px-3 py-1.5 no-underline transition-colors" to="/explorer">Explore</NavLink>
        <a className="rounded-pill px-3 py-1.5 no-underline transition-colors" href="#hallazgos">Findings</a>
      </nav>
    </header>
  </>
}
