"""Fixtures con scipy, independientes de las fórmulas TypeScript."""
import json
from collections import defaultdict
from pathlib import Path
from scipy.stats import linregress, theilslopes

root = Path(__file__).resolve().parents[1]
data = json.loads((root / 'public/assets/data/tendencias-largas.json').read_text())
fixtures = []
for zone in ['paita', 'rey_jorge', 'chimbote']:
    years = defaultdict(list)
    year, month = map(int, data['sst_crw']['inicio'].split('-'))
    for i, value in enumerate(data['sst_crw']['zonas'][zone]):
        y = year + (month - 1 + i) // 12
        if value is not None and y <= 2025:
            years[y].append(value)
    points = [dict(x=y, y=sum(v)/len(v)) for y, v in sorted(years.items()) if len(v) >= 6]
    x, y = [p['x'] for p in points], [p['y'] for p in points]
    sen = theilslopes(y, x, alpha=.95)
    fixtures.append(dict(name=zone, points=points, ci=[sen.low_slope, sen.high_slope], pLinear=linregress(x, y).pvalue))
for name, y in [('ties', [2, 2, 3, 4, 4, 3, 5, 5, 6, 7]), ('linear', list(range(10))), ('oscillation', [1, 3, 2, 4, 0, 6, 3, 5, 2, 1])]:
    x = list(range(2000, 2010))
    sen = theilslopes(y, x, alpha=.95)
    fixtures.append(dict(name=name, points=[dict(x=a, y=b) for a, b in zip(x, y)], ci=[sen.low_slope, sen.high_slope], pLinear=linregress(x, y).pvalue))
(root / 'scripts/trend-reference.json').write_text(json.dumps(fixtures, indent=2), encoding='utf-8')
