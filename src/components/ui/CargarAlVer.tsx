import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react'

type Props = {
  /** id de la sección: el espacio reservado lo lleva mientras tanto, así los enlaces (#monitor) siguen funcionando */
  id: string
  /** alto aproximado de la sección, para que la página no salte al cargarla */
  alto: number
  children: ReactNode
}

/** Dibuja su contenido solo cuando el usuario se acerca a él (las secciones con gráficos pesan) */
export function CargarAlVer({ id, alto, children }: Props) {
  const [visible, setVisible] = useState(() => location.hash === `#${id}`)
  const espacio = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = espacio.current
    if (!el || visible) return
    const io = new IntersectionObserver(([e]) => { if (e?.isIntersecting) setVisible(true) }, { rootMargin: '800px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [visible])

  const reserva = <div ref={visible ? undefined : espacio} id={visible ? undefined : id} style={{ minHeight: alto }} aria-hidden="true" />
  return visible ? <Suspense fallback={reserva}><SeccionCargada id={id}>{children}</SeccionCargada></Suspense> : reserva
}

/** El ancla se resuelve después de montar el contenido asíncrono, no sobre su reserva. */
function SeccionCargada({ id, children }: { id: string; children: ReactNode }) {
  useEffect(() => {
    if (location.hash !== `#${id}`) return
    let frame = 0
    let activo = true
    const alinear = () => {
      if (!activo) return
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        if (location.hash === `#${id}`) document.getElementById(id)?.scrollIntoView({ block: 'start', behavior: 'instant' })
      })
    }
    // Las secciones vecinas y las fuentes pueden cambiar el alto después del primer dibujo.
    // Se conserva el ancla solo hasta la primera interacción de la persona.
    const observer = new ResizeObserver(alinear)
    // El globo está fuera de main y también puede desplazar el ancla al montarse.
    observer.observe(document.body)
    const cancelar = () => { activo = false; observer.disconnect(); cancelAnimationFrame(frame) }
    const eventos = ['wheel', 'pointerdown', 'touchstart', 'keydown'] as const
    eventos.forEach((event) => addEventListener(event, cancelar, { passive: true, once: true }))
    addEventListener('load', alinear, { once: true })
    addEventListener('pageshow', alinear, { once: true })
    void document.fonts.ready.then(alinear)
    alinear()
    return () => {
      cancelar()
      eventos.forEach((event) => removeEventListener(event, cancelar))
      removeEventListener('load', alinear)
      removeEventListener('pageshow', alinear)
    }
  }, [id])
  return <>{children}</>
}
