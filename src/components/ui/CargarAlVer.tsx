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
  const [visible, setVisible] = useState(false)
  const espacio = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = espacio.current
    if (!el || visible) return
    const io = new IntersectionObserver(([e]) => { if (e?.isIntersecting) setVisible(true) }, { rootMargin: '800px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [visible])

  const reserva = <div ref={visible ? undefined : espacio} id={visible ? undefined : id} style={{ minHeight: alto }} aria-hidden="true" />
  return visible ? <Suspense fallback={reserva}>{children}</Suspense> : reserva
}
