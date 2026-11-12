/** Medidores con una sola escala visual y valores accesibles acotados a su rango. */
export default function Medidor({ valor, etiqueta, tono = 'salvia' }: {
  valor: number; etiqueta: string; tono?: 'salvia' | 'ambar' | 'hielo' | 'alerta'
}) {
  const porcentaje = Math.round(Math.max(0, Math.min(1, Number.isFinite(valor) ? valor : 0)) * 100)
  return <div className={`bitacora-medidor tono-${tono}`} role="meter" aria-label={etiqueta}
    aria-valuemin={0} aria-valuemax={100} aria-valuenow={porcentaje}>
    <span style={{ width: `${porcentaje}%` }} />
  </div>
}
