import type { GlobeView } from '../store'

type Props = {
  value: GlobeView
  onChange: (view: GlobeView) => void
}

const VISTAS: { id: GlobeView; nombre: string; detalle: string }[] = [
  { id: 'illustrated', nombre: 'Ilustrativa', detalle: 'zonas y conexiones' },
  { id: 'detailed', nombre: 'Detallada', detalle: 'relieve y mapa del satélite' },
  { id: 'satellite', nombre: 'Satelital', detalle: 'foto de la Tierra' },
]

export function GlobeViewToggle({ value, onChange }: Props) {
  return <div className="view-toggle" role="group" aria-label="Vista del globo">
    {VISTAS.map((v) => <button key={v.id} className={value === v.id ? 'is-active' : ''} type="button" aria-pressed={value === v.id} onClick={() => onChange(v.id)}><b>{v.nombre}</b><small>{v.detalle}</small></button>)}
  </div>
}
