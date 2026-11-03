import type { ProjectData } from '../../data/types'
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

export function formatValue(value: unknown, digits = 2) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString('es-PE', { maximumFractionDigits: digits }) : 'sin dato'
}
