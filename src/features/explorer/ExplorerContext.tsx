import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useData } from '../../contexts/DataContext'
import { adaptarDatos } from './lib/adaptador'
import { MapaSatelital, type EstadoMapa } from './lib/mapa'
import { Modelo } from './lib/modelo'

type ExplorerContextValue = {
  modelo: Modelo
  mapa: MapaSatelital
  /** cambia cuando el mapa del satélite termina de cargar (o falla) */
  mapaEstado: EstadoMapa
  pedirMapa: () => void
}

const ExplorerContext = createContext<ExplorerContextValue | null>(null)

/** Arma el modelo de datos y el mapa del satélite a partir de lo que cargó DataContext */
export function ExplorerProvider({ children }: { children: ReactNode }) {
  const { data, monitor, predictions } = useData()
  const modelo = useMemo(() => (data ? new Modelo(adaptarDatos(data, monitor, predictions)) : null), [data, monitor, predictions])
  const mapa = useMemo(() => (modelo ? new MapaSatelital(modelo) : null), [modelo])
  const [mapaEstado, setMapaEstado] = useState<EstadoMapa>('esperando')
  const [pedido, setPedido] = useState(false)

  useEffect(() => {
    if (!mapa || !pedido) return
    let activo = true
    setMapaEstado('cargando')
    void mapa.cargar().then(() => { if (activo) setMapaEstado(mapa.estado) })
    return () => { activo = false }
  }, [mapa, pedido])

  const value = useMemo(() => (modelo && mapa ? { modelo, mapa, mapaEstado, pedirMapa: () => setPedido(true) } : null), [modelo, mapa, mapaEstado])
  if (!value) return null
  return <ExplorerContext.Provider value={value}>{children}</ExplorerContext.Provider>
}

export function useExplorer() {
  const context = useContext(ExplorerContext)
  if (!context) throw new Error('useExplorer debe usarse dentro de ExplorerProvider')
  return context
}
