import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useExplorerStore } from '../features/explorer/store'
import { montarPortada } from '../features/portada/montar'
import '../features/portada/portada.css'

/** Portada: descenso con scroll desde la órbita hasta el fondo del mar peruano */
export default function PortadaPage() {
  const navigate = useNavigate()

  useEffect(() => {
    document.title = 'Chaski Polar'
    // la pantalla sigue en negro mientras carga el explorador; el globo la aclara cuando está listo
    // el explorador abre en la vista Satelital: la misma foto de la Tierra que se ve en la portada
    return montarPortada(() => {
      document.documentElement.classList.add('entrando')
      useExplorerStore.getState().setView('satellite')
      navigate('/explorer')
    })
  }, [navigate])

  return <div className="portada">
    <canvas id="escena" aria-label="Descent from space to the seafloor of the Peruvian sea" />
    <div className="portada-largo" />
    <div className="medidor" aria-hidden="true"><div className="riel"><div className="marca" id="marca" /></div></div>
    <div className="portada-hud" aria-hidden="true">
      <span className="hud-region">Peruvian sea</span>
      <span className="hud-fila"><i id="mEtiqueta">ORBIT</i><b id="mValor">700 km</b></span>
      <span className="hud-fila"><i>LAYER</i><b id="mCapa">Space</b></span>
    </div>
    <main id="secciones" />
    <div className="portada-pista" id="pista">Scroll to descend ↓</div>
    <div className="portada-velo" id="velo" />
  </div>
}
