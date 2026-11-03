import { z } from 'zod'

const numericArray = z.array(z.number().nullable())

export const ProjectDataSchema = z.object({
  generado: z.string().optional(),
  meses_inicio: z.string().optional(),
  zonas: z.record(z.string(), z.object({
    nombre: z.string(),
    region: z.string(),
    lat: z.number(),
    lon: z.number(),
  }).passthrough()),
  series: z.record(z.string(), z.record(z.string(), numericArray)),
  nutrientes: z.record(z.string(), z.record(z.string(), z.array(z.number()))).optional(),
  indices: z.record(z.string(), z.union([numericArray, z.number(), z.string()])).optional(),
  power: z.object({ inicio: z.string().optional(), sitios: z.record(z.string(), z.record(z.string(), numericArray)).optional() }).optional(),
  pesca: z.record(z.string(), z.union([z.array(z.number()), z.number()])).optional(),
  juego: z.array(z.record(z.string(), z.number())).optional(),
}).passthrough()

export const MonitorDataSchema = z.object({
  records: z.array(z.object({ date: z.string() }).passthrough()),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).passthrough()
