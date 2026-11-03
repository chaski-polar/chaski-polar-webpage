import type { ReactNode } from 'react'

export function DataState({ loading, error, children }: { loading: boolean; error: Error | null; children: ReactNode }) {
  if (loading) return <div className="data-state"><p>Cargando los datos del proyecto…</p></div>
  if (error) return <div className="data-state"><h2 className="font-display text-3xl">No se pudieron cargar los datos</h2><p>{error.message}</p></div>
  return <>{children}</>
}
