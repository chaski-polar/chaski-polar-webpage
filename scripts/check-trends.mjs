// Verificación independiente contra las tablas publicadas y scipy (fixtures verificables).
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { tendencia, promediosAnuales } from '../src/lib/tendencias.ts'

const data = JSON.parse(readFileSync(new URL('../public/assets/data/tendencias-largas.json', import.meta.url)))
const monthly = (start, values) => values.map((valor, i) => ({ mes: new Date(Date.UTC(Number(start.slice(0, 4)), Number(start.slice(5, 7)) - 1 + i)).toISOString().slice(0, 7), valor }))
const cases = [
  { zone: 'paita', p: 0.8521, slope: -0.043 },
  { zone: 'rey_jorge', p: 0.6412, slope: 0.0188 },
  { zone: 'chimbote', p: 0.7093, slope: 0.0539 },
]
for (const c of cases) {
  const result = tendencia(promediosAnuales(monthly(data.sst_crw.inicio, data.sst_crw.zonas[c.zone]), 'year').filter(p => p.x <= 2025))
  assert.ok(result)
  // La web aplica corrección de continuidad (S-sign(S)); la tabla coincide con S sin esa
  // corrección. La diferencia es <0.01 en estos casos y no cambia ningún veredicto.
  assert.ok(Math.abs(result.p - c.p) < .01, `${c.zone}: ${result.p} vs ${c.p}`)
  assert.ok(Math.abs(result.pendiente * 10 - c.slope) < .0002)
  console.log(`${c.zone}: p=${result.p.toFixed(6)}, table=${c.p}; slope/decade=${(result.pendiente * 10).toFixed(6)}`)
}

// scipy.stats.theilslopes y linregress, generados para estas observaciones, no para la implementación.
const fixture = JSON.parse(readFileSync(new URL('./trend-reference.json', import.meta.url)))
for (const { name, points, ci, pLinear } of fixture) {
  const r = tendencia(points)
  assert.ok(r, name)
  assert.ok(Math.abs(r.intervalo95[0] - ci[0]) < 1e-10, name)
  assert.ok(Math.abs(r.intervalo95[1] - ci[1]) < 1e-10, name)
  assert.ok(Math.abs(r.pLineal - pLinear) < 1e-10, `${name}: regression p`)
}
assert.equal(tendencia([{ x: 2000, y: 1 }]), null)
assert.equal(tendencia(Array.from({ length: 10 }, (_, x) => ({ x: 2000 + x, y: 3 }))).pLineal, 1)
assert.deepEqual(tendencia(Array.from({ length: 10 }, (_, x) => ({ x: 2000 + x, y: 3 }))).intervalo95, [0, 0])
assert.equal(tendencia(Array.from({ length: 10 }, () => ({ x: 2000, y: 3 }))), null)
assert.equal(promediosAnuales(monthly('2000-01', [1, 2, null, null, null, 3]), 'year').length, 0)
assert.ok(data.chl_modis.paita.valores.every(v => v === null || v !== -32767))
console.log(`${fixture.length} independent scipy references and edge cases passed.`)
