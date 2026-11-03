import type { GlobeView } from '../store'

type Props = {
  value: GlobeView
  onChange: (view: GlobeView) => void
}

export function GlobeViewToggle({ value, onChange }: Props) {
  return <div className="view-toggle" role="group" aria-label="Vista del globo">
    <button className={value === 'illustrated' ? 'is-active' : ''} type="button" aria-pressed={value === 'illustrated'} onClick={() => onChange('illustrated')}><b>Ilustrativa</b><small>zonas y conexiones</small></button>
    <button className={value === 'satellite' ? 'is-active' : ''} type="button" aria-pressed={value === 'satellite'} onClick={() => onChange('satellite')}><b>Satelital</b><small>relieve y superficie</small></button>
  </div>
}
