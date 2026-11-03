import { lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import { DataState } from '../components/ui/DataState'
import { useData } from '../contexts/DataContext'
import InsightsSection from '../features/insights/InsightsSection'
import MonitorSection from '../features/monitor/MonitorSection'
import AppShell from '../layouts/AppShell'

const GlobePanel = lazy(() => import('../features/explorer/components/GlobePanel'))

export default function HomePage() {
  const { loading, error } = useData()
  return <AppShell><DataState loading={loading} error={error}><Suspense fallback={<div className="data-state"><p>Preparando el globo interactivo…</p></div>}><GlobePanel /></Suspense><main id="contenido"><section className="seccion pregunta"><blockquote>¿Cómo se asocian los cambios del fitoplancton antártico con la vida marina del Perú?</blockquote><div className="cuerpo"><p>El <strong>fitoplancton</strong> son algas microscópicas que flotan en el mar. Son la base de la cadena alimenticia.</p><p>Los satélites miden el fitoplancton por el color del agua: más verde quiere decir más <strong>clorofila</strong>.</p><p>La idea es buscar <strong>asociaciones</strong>. Que dos cosas cambien juntas no prueba que una cause a la otra.</p></div></section><InsightsSection /><MonitorSection /><section className="seccion"><div className="llamada"><div><h2>¿Puedes predecir la pesca leyendo satélites?</h2><p>Observa señales de la Antártida y del Perú y decide si la anchoveta subió o bajó.</p><Link className="btn btn-claro" to="/juego">Empezar el juego</Link></div></div></section></main><footer>Borrador de idea para el equipo de NASA Space Apps Challenge 2026.</footer></DataState></AppShell>
}
