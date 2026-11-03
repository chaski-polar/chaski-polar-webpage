import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './App.css'
import './estilos.css'
import { DataProvider } from './contexts/DataContext'
import GamePage from './pages/GamePage'
import HomePage from './pages/HomePage'
import NotFoundPage from './pages/NotFoundPage'

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/explorer" element={<HomePage />} />
      <Route path="/juego" element={<GamePage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <DataProvider>
        <AppRoutes />
      </DataProvider>
    </BrowserRouter>
  )
}
