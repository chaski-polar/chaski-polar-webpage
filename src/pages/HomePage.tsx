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
const CrucerosSection = lazy(() => import('../features/cruceros/CrucerosSection'))

/** Explorador: los datos se cargan solo al entrar a esta página */
export default function HomePage() {
  useEffect(() => { document.title = 'Chaski Polar · Explorer' }, [])
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
          <main id="contenido" className="bg-black">
            <section className="seccion pregunta">
              <blockquote>How are changes in Antarctic phytoplankton associated with marine life in Peru?</blockquote>
              <div className="cuerpo">
                <p>
                  <strong>Phytoplankton</strong> are microscopic algae floating in the sea. They support the food web: zooplankton eat them, anchoveta eat zooplankton, and birds, sea lions and fisheries depend on anchoveta.
                </p>
                <p>
                  Satellites estimate phytoplankton from the color of the water: greener means more <strong>chlorophyll</strong>. This explorer brings together 27 years of measurements for five Peruvian zones and two Antarctic zones, plus temperature, turbidity, wind, sea ice, nutrients and annual catches.
                </p>
                <p>
                  The goal is to find <strong>associations</strong>. Two things changing together does not prove that one causes the other, and lower catches do not mean the species has disappeared.
                </p>
              </div>
            </section>
            <CargarAlVer id="hallazgos" alto={2600}><InsightsSection /></CargarAlVer>
            <CargarAlVer id="eventos-nino" alto={760}><EventosNinoSection /></CargarAlVer>
            <CargarAlVer id="cruceros" alto={820}><CrucerosSection /></CargarAlVer>
            <section className="seccion">
              <div className="llamada">
                <div>
                  <h2>The complete journey</h2>
                  <p>Return home and descend from satellite orbit to the seafloor: phytoplankton, anchoveta schools and the oxygen minimum zone, layer by layer.</p>
                  <Link className="button-primary" to="/">Return home</Link>
                </div>
              </div>
            </section>
            <FuentesSection />
          </main>
          <footer className="pie">Chaski Polar · Open satellite data from NASA, ESA and NOAA. The relationships shown here are associations, not proof of causation.</footer>
        </ExplorerProvider>
      </DataState>
    </AppShell>
  )
}
