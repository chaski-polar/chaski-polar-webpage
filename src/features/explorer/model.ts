import type { PredictionRow, ProjectData } from '../../data/types'
import type { ExplorerVariable } from './store'

export const variableLabels: Record<string, string> = {
  clorofila_mg_m3: 'Clorofila-a',
  temperatura_superficial_C: 'Temperatura superficial',
  hielo: 'Hielo marino',
}

export const variableUnits: Record<string, string> = {
  clorofila_mg_m3: 'mg/m³',
  temperatura_superficial_C: '°C',
  hielo: 'M km²',
}

export function getMonthLabel(data: ProjectData, month: number) {
  const startYear = Number(data.meses_inicio?.slice(0, 4) || 1998)
  return `${startYear + Math.floor(month / 12)}-${String((month % 12) + 1).padStart(2, '0')}`
}

export function valueFor(data: ProjectData, zoneKey: string, variable: ExplorerVariable, month: number) {
  if (variable === 'hielo') return Array.isArray(data.indices?.hielo) ? data.indices.hielo[month] : null
  return data.series[zoneKey]?.[variable]?.[month] ?? null
}

export function timelineMax(data: ProjectData, predictions: PredictionRow[]) {
  const seriesLength = data.series[Object.keys(data.series)[0]]?.[Object.keys(data.series[Object.keys(data.series)[0]] || {})[0]]?.length || 1
  const startYear = Number(data.meses_inicio?.slice(0, 4) || 1998)
  const predictionIndexes = predictions.map((row) => {
    const date = typeof row.date === 'string' ? row.date : ''
    const [year, month] = date.split('-').map(Number)
    return year && month ? (year - startYear) * 12 + month - 1 : -1
  })
  return Math.max(seriesLength - 1, ...predictionIndexes)
}

export function predictionValueFor(predictions: PredictionRow[], variable: ExplorerVariable, monthLabel: string) {
  const row = predictions.find((item) => item.date === `${monthLabel}-01` && item.scenario === 'central')
  if (!row) return null
  if (variable === 'clorofila_mg_m3') return typeof row.chlorophyll_a === 'number' ? row.chlorophyll_a : null
  if (variable === 'temperatura_superficial_C') return typeof row.sst === 'number' ? row.sst : null
  return null
}

export function formatValue(value: unknown, digits = 2) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString('es-PE', { maximumFractionDigits: digits }) : 'sin dato'
}
