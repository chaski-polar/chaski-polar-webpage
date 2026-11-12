import { NavLink } from 'react-router-dom'

export default function Header() {
  return <>
    <a className="saltar" href="#contenido">Skip to content</a>
    <header className="app-header fixed inset-x-0 top-0 z-30 flex items-center justify-between gap-4 px-4 py-2 pointer-events-none sm:px-8">
      <nav className="app-nav pointer-events-auto flex gap-1" aria-label="Sections">
        <NavLink className="app-brand pointer-events-auto flex items-center gap-2 font-display text-[1.3rem] text-ice-100 no-underline" to="/" aria-label="Chaski Polar, return to home">
          <img className="h-11 w-[53px] rounded-md bg-white object-contain p-0.5" src="/assets/logotipo_chaski_polar.png" alt="Chaski Polar" />
        </NavLink>
        <NavLink className="rounded-pill px-3 py-1.5 text-ice-300 no-underline transition-colors hover:bg-ocean-700/45 hover:text-ice-100" to="/explorer">
          Explore
        </NavLink>
        <a className="rounded-pill px-3 py-1.5 text-ice-300 no-underline transition-colors hover:bg-ocean-700/45 hover:text-ice-100" href="#hallazgos">
          Findings
        </a>
      </nav>
      <div className="titulo-barra hidden font-display text-lg font-normal text-ice-300 lg:block" role="heading" aria-level={1}>
        From the Antartic to the Peruvian sea
      </div>
    </header>
  </>
}
