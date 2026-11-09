import { NavLink } from 'react-router-dom'

export default function Header() {
  return <><a className="saltar" href="#contenido">Saltar al contenido</a><header className="app-header"><NavLink className="app-brand" to="/" aria-label="Mar Peruano 360, volver a la portada"><span aria-hidden="true">◌</span><span>Mar Peruano 360</span></NavLink><h1 className="titulo-barra">Del hielo antártico al mar peruano</h1><nav className="app-nav" aria-label="Secciones"><NavLink to="/" end>Portada</NavLink><NavLink to="/explorer">Explorar</NavLink><a href="#hallazgos">Hallazgos</a></nav></header></>
}
