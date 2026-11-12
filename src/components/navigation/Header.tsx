import { NavLink } from 'react-router-dom'

// El logo está en un solo lugar: para cambiarlo basta con reemplazar public/assets/logotipo_chaski_polar.png
const LOGO = '/assets/logotipo_chaski_polar.png'

export default function Header() {
  return <>
    <a className="saltar" href="#contenido">Skip to content</a>
    <header className="app-header fixed inset-x-0 top-0 z-30 flex items-center justify-between gap-4 px-4 py-2 pointer-events-none sm:px-8">
      <div className="flex min-w-0 items-center gap-4">
        <NavLink className="app-brand pointer-events-auto flex shrink-0 items-center gap-3 no-underline" to="/" aria-label="Chaski Polar, return to home">
          <img className="h-10 w-12 rounded-[3px] bg-white object-contain" src={LOGO} alt="" />
          <span className="hidden font-display text-[1.3rem] text-ice-100 sm:inline">Chaski Polar</span>
        </NavLink>
        <div className="titulo-barra hidden truncate font-display text-[1.05rem] font-normal text-ice-300 lg:block" role="heading" aria-level={1}>
          From the Antarctic to the Peruvian sea
        </div>
      </div>
      <nav className="app-nav pointer-events-auto ml-auto flex gap-1" aria-label="Sections">
        <NavLink className="rounded-pill px-3 py-1.5 no-underline transition-colors" to="/" end>Home</NavLink>
        <NavLink className="rounded-pill px-3 py-1.5 no-underline transition-colors" to="/explorer">Explore</NavLink>
        <a className="rounded-pill px-3 py-1.5 no-underline transition-colors" href="#hallazgos">Findings</a>
      </nav>
    </header>
  </>
}
