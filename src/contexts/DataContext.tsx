import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { loadPredictions, loadRuntimeData } from '../data/loaders/runtime'
import type { MonitorData, PredictionRow, ProjectData } from '../data/types'

type DataContextValue = {
  data: ProjectData | null
  monitor: MonitorData | null
  predictions: PredictionRow[]
  loading: boolean
  error: Error | null
  reload: () => void
}

const DataContext = createContext<DataContextValue | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Omit<DataContextValue, 'reload'>>({
    data: null,
    monitor: null,
    predictions: [],
    loading: true, error: null
  })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let active = true
    setState((current) => ({
      ...current,
      loading: true,
      error: null
    }))

    Promise.all([loadRuntimeData(), loadPredictions()])
      .then(([runtime, predictions]) => {
        if (active) setState({ ...runtime, predictions, loading: false, error: null })
      })
      .catch((error: unknown) => { if (active) setState((current) => ({ ...current, loading: false, error: error instanceof Error ? error : new Error('No se pudieron cargar los datos') })) })

    return () => { active = false }
  }, [version])

  const value = useMemo(() => ({ ...state, reload: () => setVersion((current) => current + 1) }), [state])
  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const context = useContext(DataContext)
  if (!context) throw new Error('useData debe usarse dentro de DataProvider')
  return context
}
