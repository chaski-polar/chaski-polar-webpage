"""Exporta únicamente las series y los textos autorizados; no altera observaciones existentes."""
import argparse
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--workspace', type=Path, required=True)
args = parser.parse_args()
data = ROOT / 'public/assets/data'
monitor_path = data / 'monitor-data.js'
text = monitor_path.read_text(encoding='utf-8')
monitor = json.loads(text[text.index('{'):text.rindex('}') + 1])
original_records = json.dumps(monitor['records'], sort_keys=True)
updates = {
    'asimetria': dict(titulo='Warming and cooling: an observed asymmetry', resumen='A descriptive pattern, not a better predictor. Out-of-period validation (fit: 1998–2014; test: 2015–2025) changes predictive skill versus a linear model by −1.4% to +1.6%.'),
    'zonas_vulnerables': dict(titulo='The central coast is most vulnerable to El Niño', resumen='With Niño 1+2 ≥ +1 °C, chlorophyll falls by about 45% in Chimbote and Callao, 20–23% in Pisco and Ilo, and barely changes in Paita–Sechura.'),
    'sin_tendencias': dict(titulo='No robust chlorophyll trend since 1998', resumen='None of the five Peruvian zones has a significant annual chlorophyll trend in 1998–2025. Antarctic warming over 1998–2025 loses significance with a longer record (1986–2025); another product reverses its direction.'),
    'antartida': dict(titulo='No robust Southern Ocean–Peru relationship', resumen='More than 1,100 tests found no robust relationship after multiple-testing correction, controlling for El Niño and checking period stability. The apparent 3–4-year lag reflected the El Niño cycle.'),
    'prediccion_2026': dict(titulo='El Niño 2026: scenario, not a forecast', resumen='Illustrative scenarios apply historical slopes to assumed El Niño trajectories. They do not predict what will happen in 2026.'),
}
extra = [
    dict(id='calentamiento_antartico', estado='no_robusto', titulo='Antarctic warming depends on period and product', resumen='King George Island: CRW gives +0.18 °C/decade (p = 0.002) for 1998–2025, but +0.02 (p = 0.64) for 1986–2025. ERSST gives the opposite direction. A significant result in one window is not robust evidence.'),
    dict(id='rebote_paita', estado='pendiente', titulo='A delayed rebound in Paita–Sechura', resumen='Pending / clue: OC-CCI chlorophyll rises 2–8 months after warming, peaking at 5 months (r = +0.36). MODIS-Aqua keeps the sign but is not significant (r = +0.16 to +0.22; FDR-adjusted p = 0.05–0.13).'),
]
for h in monitor['metadata']['hallazgos']:
    h.update(updates.get(h['id'], {}))
ids = {h['id'] for h in monitor['metadata']['hallazgos']}
monitor['metadata']['hallazgos'].extend(h for h in extra if h['id'] not in ids)
assert original_records == json.dumps(monitor['records'], sort_keys=True)
monitor_path.write_text(text[:text.index('{')] + json.dumps(monitor, ensure_ascii=False) + ';\n', encoding='utf-8')

# Mantiene coherente el generador compartido sin ejecutarlo ni regenerar sus otros campos.
generator = args.workspace / 'pruebas/json_pagina/construir_monitor_json.py'
source = generator.read_text(encoding='utf-8')
start, end = '# BEGIN WEB FINDINGS\n', '# END WEB FINDINGS\n'
block = start + 'actualizaciones_web = ' + repr(updates) + '\n'
block += 'for h in hallazgos:\n    h.update(actualizaciones_web.get(h["id"], {}))\n'
block += 'hallazgos.extend(' + repr(extra) + ')\n' + end + '\n'
if start in source:
    source = source[:source.index(start)] + source[source.index(end) + len(end):].lstrip('\n')
source = source.replace('salida = {', block + 'salida = {', 1)
generator.write_text(source, encoding='utf-8')

long_path = data / 'tendencias-largas.json'
long = json.loads(long_path.read_text(encoding='utf-8'))
csv_text = (args.workspace / 'datos/giovanni/paita_modisa_chl_mensual_2002-2025.csv').read_text(encoding='utf-8-sig')
rows = list(csv.reader(csv_text[csv_text.index('time,'):].splitlines()))[1:]
values = {r[0][:7]: None if float(r[1]) == -32767 else float(r[1]) for r in rows if len(r) >= 2}
first, last = min(values), max(values)
year, month = map(int, first.split('-'))
series = []
while f'{year:04}-{month:02}' <= last:
    series.append(values.get(f'{year:04}-{month:02}'))
    month += 1
    if month == 13:
        year, month = year + 1, 1
long['chl_modis']['paita'] = dict(inicio=first, valores=series)
long_path.write_text(json.dumps(long, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')

rows = [r for r in csv.DictReader((args.workspace / 'drive_aaron/connectivity_panel_monthly.csv').open(encoding='utf-8')) if r['region'] == 'peru_humboldt']
fields = {'sst': ('surface_0_5m', 'thetao_anom'), 'seaLevel': ('surface_2d', 'zos_anom'), 'deepTemperature': ('subsurface_100_200m', 'thetao_anom'), 'deepOxygen': ('subsurface_100_200m', 'o2_anom'), 'oxygen': ('surface_0_5m', 'o2_anom'), 'phosphate': ('surface_0_5m', 'po4_anom'), 'chlorophyll': ('surface_0_5m', 'chl_anom')}
monthly = {}
for row in rows:
    if not '1998' <= row['date'][:4] <= '2025':
        continue
    record = monthly.setdefault(row['date'][:7], dict(month=row['date'][:7]))
    for name, (depth, field) in fields.items():
        if row['depth_band'] == depth:
            record[name] = round(float(row[field]), 6) if row[field] else None
nino = {r['date'][:7]: r.get('nino12_psl_c') for r in monitor['records']}
for month, record in monthly.items():
    record['nino'] = nino.get(month)
(data / 'el-nino-chain.json').write_text(json.dumps(dict(source='CMEMS monthly anomalies, peru_humboldt; Niño 1+2: NOAA PSL', records=[monthly[m] for m in sorted(monthly)]), ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print(f'Paita: {len(series)} months ({first}–{last}); physical chain: {len(monthly)} months; monitor records unchanged.')
