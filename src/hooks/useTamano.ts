import { useEffect, useState, type RefObject } from 'react'

/** Ancho y alto de un elemento, actualizados cuando cambia de tamaño */
export function useTamano(ref: RefObject<HTMLElement | null>): { width: number; height: number } {
  const [tamano, setTamano] = useState({ width: 0, height: 0 })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const medir = () => setTamano({ width: el.clientWidth, height: el.clientHeight })
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return tamano
}
