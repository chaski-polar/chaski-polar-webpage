import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'

// cada página se descarga por separado: la portada no carga el globo, los gráficos ni los datos del explorador
const PortadaPage = lazy(() => import('./pages/PortadaPage'))
const HomePage = lazy(() => import('./pages/HomePage'))
const JuegoPage = lazy(() => import('./pages/JuegoPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const ModelosPortadaPage = lazy(() => import('./pages/ModelosPortadaPage'))

function AppRoutes() {
  return (
    <Suspense fallback={<div className="data-state"><p>Loading…</p></div>}>
      <Routes>
        <Route path="/" element={<PortadaPage />} />
        <Route path="/explorer" element={<HomePage />} />
        <Route path="/modelos-portada" element={<ModelosPortadaPage />} />
        <Route path="/juego" element={<JuegoPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
