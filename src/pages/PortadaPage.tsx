import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useExplorerStore } from '../features/explorer/store'
import { montarPortada } from '../features/portada/montar'
import '../features/portada/portada.css'

/** Portada: descenso con scroll desde la órbita hasta el fondo del mar peruano */
export default function PortadaPage() {
  const navigate = useNavigate()

  useEffect(() => {
    document.title = 'Mar Peruano 360'
    // la pantalla sigue en negro mientras carga el explorador; el globo la aclara cuando está listo
    // el explorador abre en la vista Satelital: la misma foto de la Tierra que se ve en la portada
    return montarPortada(() => {
      document.documentElement.classList.add('entrando')
      useExplorerStore.getState().setView('satellite')
      navigate('/explorer')
    })
  }, [navigate])

  return <div className="portada">
    <canvas id="escena" aria-label="Descenso desde el espacio hasta el fondo del mar peruano" />
    <div className="portada-largo" />
    <div className="medidor izq" aria-hidden="true"><span id="mEtiqueta">ÓRBITA</span><div className="riel"><div className="marca" id="marca" /></div><b id="mValor">700 km</b></div>
    <div className="medidor der" aria-hidden="true"><span>CAPA</span><div className="riel" /><b id="mCapa">Espacio</b></div>
    <main id="secciones" />
    <div className="portada-pista" id="pista">Desliza para descender ↓</div>
    <div className="portada-velo" id="velo" />
  </div>
}
