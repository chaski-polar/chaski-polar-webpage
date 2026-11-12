// Comprobación de las vistas de entrada: primera visita, ayuda recordada y último año.
// No sustituye una prueba de arrastre o de interacción en navegador.
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import React from 'react'
import { renderToString } from 'react-dom/server'

const root = fileURLToPath(new URL('../', import.meta.url))
const almacenamiento = new Map()
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
  getItem: (k) => almacenamiento.get(k) ?? null,
  setItem: (k, v) => almacenamiento.set(k, v),
} })
const server = await createServer({ root, server: { middlewareMode: true }, appType: 'custom' })
try {
  const { default: Escritorio } = await server.ssrLoadModule('/src/features/juego/interfaz/Escritorio.tsx')
  const guia = await server.ssrLoadModule('/src/features/juego/interfaz/GuiaEscritorio.tsx')
  const { default: Cabina } = await server.ssrLoadModule('/src/features/juego/interfaz/Cabina.tsx')
  const expediente = { id: 'flota', tipo: 'solicitud', remitente: 'Flota Norte-Centro', titulo: 'Solicitud de temporada', cuerpo: 'Solicitud para revisar.', sellos: { si: 'APROBADO', no: 'DENEGADO' }, correcta: 'no', explicacion: 'Explicación al terminar.' }
  const turno = { anio: 1998, reporte: [{ mes: 'enero', comida: 0.5, nino: 1.5 }], resumen: { alimentoCentro: 0.5, ninoMax: 1.5 }, expedientes: [expediente], bandejaCorrecta: 'nino', reglas: ['Contrasta las cifras con el reporte.'], reglasNuevas: 1 }
  const datos = { anio: 1998, inicial: 10000, sobrevivientes: 7000, perdidas: { hambre: 1000, depredadores: 1000, flota: 800, oxigeno: 200 }, alimentoPromedio: 0.5, mesesObservados: 12, vedas: 2, mesesTemporada: 6, ninoPromedio: 1.5, mesesJugados: 12, estrategia: 'ninguna' }
  const props = { turno, datos, siguiente: { anio: 2000, peces: 9000 }, final: false, alSeguir() {}, alRepetir() {}, alFinal() {}, alMenu() {} }
  assert(guia.faltaGuiaEscritorio())
  const primera = renderToString(React.createElement(Escritorio, props))
  assert(primera.includes('Primera guardia'))
  assert(primera.includes('Cabina del puerto'))
  assert(primera.includes('Representante de la flota'))
  assert(primera.includes('Solo la carpeta del año'))
  assert(primera.includes('cabina-icono-sello'))
  assert(primera.includes('data-papel="plan"'))
  assert(!primera.includes('Explicación al terminar.'), 'La guía no debe revelar respuestas de expedientes')
  guia.recordarGuiaEscritorio()
  assert(!guia.faltaGuiaEscritorio())
  const recurrente = renderToString(React.createElement(Escritorio, props))
  assert(!recurrente.includes('Primera guardia'))
  assert(recurrente.includes('Cómo revisar'), 'La guía debe poder reabrirse')
  const ultimo = renderToString(React.createElement(Escritorio, { ...props, final: true, siguiente: null }))
  assert(!ultimo.includes('data-papel="plan"'), 'El último año no exige un plan inexistente')
  const cierre = renderToString(React.createElement(Cabina, { expediente, revisados: 1, total: 1, entregado: true }))
  assert(cierre.includes('Documentos devueltos'))
  console.log('Cabina: primera visita, ayuda recordada/reabrible, sello SVG, expediente sin respuesta revelada, plan opcional y cierre: correctos.')
} finally {
  await server.close()
}
