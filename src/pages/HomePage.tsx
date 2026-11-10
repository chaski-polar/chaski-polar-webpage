import { lazy, Suspense, useEffect } from 'react'
import { Link } from 'react-router-dom'
import '../App.css'
import '../estilos.css'
import '../features/explorer/explorer.css'
import { DataState } from '../components/ui/DataState'
import { DataProvider, useData } from '../contexts/DataContext'
import { ExplorerProvider } from '../features/explorer/ExplorerContext'
import { CargarAlVer } from '../components/ui/CargarAlVer'
import FuentesSection from '../features/fuentes/FuentesSection'
import AppShell from '../layouts/AppShell'

const GlobePanel = lazy(() => import('../features/explorer/components/GlobePanel'))
// las secciones con gráficos se descargan cuando el usuario se acerca a ellas
const InsightsSection = lazy(() => import('../features/insights/InsightsSection'))
const EventosNinoSection = lazy(() => import('../features/eventos/EventosNinoSection'))
const MonitorSection = lazy(() => import('../features/monitor/MonitorSection'))
const CrucerosSection = lazy(() => import('../features/cruceros/CrucerosSection'))

/** Explorador: los datos se cargan solo al entrar a esta página */
export default function HomePage() {
  useEffect(() => { document.title = 'Mar Peruano 360 · Explorador' }, [])
  return <DataProvider><Explorador /></DataProvider>
}

function Explorador() {
  const { loading, error } = useData()
  return (
    <AppShell>
      <DataState loading={loading} error={error}>
        <ExplorerProvider>
          <Suspense fallback={<div className="data-state">
            <p>Preparando el globo interactivo…</p>
          </div>}>
            <GlobePanel />
          </Suspense>
          <main id="contenido">
            <section className="seccion pregunta">
              <blockquote>¿Cómo se asocian los cambios del fitoplancton antártico con la vida marina del Perú?</blockquote>
              <div className="cuerpo">
                <p>
                  El <strong>fitoplancton</strong> son algas microscópicas que flotan en el mar. Son la base de la cadena: las come el zooplancton, al zooplancton lo come la anchoveta y a la anchoveta, las aves, los lobos marinos y la pesca.
                </p>
                <p>
                  Los satélites miden el fitoplancton por el color del agua: más verde quiere decir más <strong>clorofila</strong>. Aquí se juntan 27 años de esas mediciones para cinco zonas del Perú y dos de la Antártida, más temperatura, turbidez, viento, hielo marino, nutrientes y la pesca de cada año.
                </p>
                <p>
                  La idea es buscar <strong>asociaciones</strong>. Que dos cosas cambien juntas no prueba que una cause a la otra, y una pesca más baja tampoco significa que la especie desaparezca.
                </p>
              </div>
            </section>
            <CargarAlVer id="hallazgos" alto={2600}><InsightsSection /></CargarAlVer>
            <CargarAlVer id="eventos-nino" alto={760}><EventosNinoSection /></CargarAlVer>
            <CargarAlVer id="monitor" alto={980}><MonitorSection /></CargarAlVer>
            <CargarAlVer id="cruceros" alto={820}><CrucerosSection /></CargarAlVer>
            <section className="seccion">
              <div className="llamada">
                <div>
                  <h2>El viaje completo</h2>
                  <p>Vuelve a la portada y desciende desde la órbita del satélite hasta el fondo del mar peruano: fitoplancton, cardumen de anchoveta y la zona sin oxígeno, capa por capa.</p>
                  <Link className="button-primary" to="/">Volver a la portada</Link>
                </div>
              </div>
            </section>
            <FuentesSection />
          </main>
          <footer className="pie">Mar Peruano 360 · Datos satelitales abiertos de la NASA, la ESA y la NOAA. Las relaciones que muestra esta página son asociaciones, no pruebas de causa.</footer>
        </ExplorerProvider>
      </DataState>
    </AppShell>
  )
}
