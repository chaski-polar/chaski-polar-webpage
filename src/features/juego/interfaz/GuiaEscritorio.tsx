import { IconoSello } from './Cabina'

export const CLAVE_GUIA_ESCRITORIO = 'cardumen-guia-escritorio-v1'

export function faltaGuiaEscritorio(): boolean {
  try { return localStorage.getItem(CLAVE_GUIA_ESCRITORIO) !== 'vista' } catch { return true }
}

export function recordarGuiaEscritorio(): void {
  try { localStorage.setItem(CLAVE_GUIA_ESCRITORIO, 'vista') } catch { /* La ayuda sigue disponible si el almacenamiento no lo está. */ }
}

export type ReferenciaGuia = 'manual' | 'reporte' | 'expediente' | 'carpeta' | 'plan'

/** Guía no bloqueante: explica acciones sin revelar la respuesta de los expedientes. */
export default function GuiaEscritorio({ paso, hayPlan, alPaso, alCerrar, alMostrar }: {
  paso: number; hayPlan: boolean; alPaso: (n: number) => void; alCerrar: () => void; alMostrar: (id: ReferenciaGuia) => void
}) {
  const pasos = [
    { titulo: 'Consulta antes de decidir', texto: 'El Manual explica las reglas. El Reporte satelital contiene los datos para comprobar cada afirmación. Puedes mover los papeles para leerlos juntos.', accion: 'reporte' as const, boton: 'Ver el reporte' },
    { titulo: 'Selecciona y sella un expediente', texto: 'Elige una solicitud, carta o nota de prensa y después usa el sello verde o rojo. Los nombres del sello cambian según el documento. El Manual y el Reporte no se sellan.', accion: 'expediente' as const, boton: 'Elegir un expediente' },
    { titulo: 'Archiva solo la carpeta del año', texto: 'No hay que meter todos los papeles en bandejas. La Carpeta resume el año: arrástrala a la categoría que corresponda. También puedes seleccionarla y tocar una bandeja.', accion: 'carpeta' as const, boton: 'Seleccionar la carpeta' },
    { titulo: hayPlan ? 'Prepara la siguiente generación' : 'Revisa lo que queda', texto: hayPlan ? 'En el Plan, elige una estrategia y pulsa Firmar. Cada estrategia tiene una ventaja y un costo; revisa el año antes de elegir.' : 'Este es el último año de la campaña. No hay un plan siguiente que firmar: revisa los expedientes y la carpeta.', accion: hayPlan ? 'plan' as const : 'manual' as const, boton: hayPlan ? 'Ver el plan' : 'Ver el manual' },
    { titulo: 'Entrega el turno completo', texto: 'Sella todos los expedientes, archiva la carpeta y firma el plan si lo hay. El contador de pendientes indica lo que falta. Entregar se activa al terminar; después podrás ver tus aciertos y citaciones.', accion: 'manual' as const, boton: 'Consultar el manual' },
  ]
  const actual = pasos[paso]!
  return <aside id="cabina-guia" className="cabina-guia" aria-labelledby="cabina-guia-titulo">
    <div className="cabina-guia-cabecera"><span>Primera guardia · {paso + 1} / {pasos.length}</span><button type="button" onClick={alCerrar}>Cerrar guía</button></div>
    <h3 id="cabina-guia-titulo" aria-live="polite">{paso === 1 && <IconoSello pequeno />}{actual.titulo}</h3>
    <p>{actual.texto}</p>
    <div className="cabina-guia-acciones">
      <button type="button" onClick={() => alMostrar(actual.accion)}>{actual.boton}</button>
      {paso > 0 && <button type="button" onClick={() => alPaso(paso - 1)}>Anterior</button>}
      {paso < pasos.length - 1 ? <button type="button" onClick={() => alPaso(paso + 1)}>Siguiente →</button>
        : <button type="button" onClick={alCerrar}>Entendido</button>}
    </div>
  </aside>
}
