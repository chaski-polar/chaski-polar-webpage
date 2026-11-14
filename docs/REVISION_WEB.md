# Revisión local de la web — 14/11/2026

Rama: `feat/web-hallazgos-2026`. Carpeta: `D:/hackathon/NASA/repos/chaski-polar-web-review`.
Base: `main` local y referencia `origin/main` en `a91ff81`. El fetch inicial falló por conexión a GitHub (puerto 443); no se afirma que sea el último estado remoto. No hubo push ni integración en main. Se dejó intacta la rama `prediccion-validacion` de la carpeta estética.

## Cambios

- Tendencias: MODIS-Aqua de Paita; intervalo de Sen al 95%; test t bilateral de la pendiente de regresión; preguntas en tres pasos, modo libre, glosario y tabla anual accesible.
- Comparación OC-CCI/MODIS en Chimbote y Paita: ambas curvas, pruebas en paralelo sobre años compartidos. Se conservó la regla anterior: al menos 6 meses por año o 3 por estación. Por ello 2002 puede aparecer como año parcial de MODIS; elegir 2003 permite compararlo con el periodo del informe.
- Hallazgos actualizados: más de 1.100 pruebas; asimetría descriptiva; escenario de 2026; calentamiento antártico no robusto; rebote de Paita pendiente.
- Cadena física: siete asociaciones, capas de superficie y 100–200 m, 336 meses de anomalías CMEMS/NOAA, selección de variable y tabla paginada. No se desplazan las curvas por el desfase publicado; se indica expresamente.
- Fuentes y método con referencias estadísticas, NASA Giovanni, NASA POWER y las tres lecturas del reto.
- Navegación Trends, enlaces al ejemplo antártico, carga diferida con anclas estables, textos en inglés y corrección de la historia de Chimbote a 2004.
- Azules y familias tipográficas existentes. La transparencia se limita al encabezado; sombra leve en el gráfico. Sin nuevas dependencias, imágenes ni fuentes.

## Comprobaciones

TypeScript y build correctos antes de cada commit. `oxlint src`: sin errores ni avisos nuevos; se mantienen avisos preexistentes en `juego/motor/pixel.ts` y `portada/escena/submarino.ts`. Vite conserva el aviso por chunks grandes del globo/Three.js.

El pnpm instalado intenta verificar dependencias en una ubicación del perfil inaccesible. Se usó `--config.verifyDepsBeforeRun=false` con las dependencias existentes, sin instalar ni actualizar paquetes. El `node_modules` local es una junction al del checkout principal.

```powershell
corepack pnpm --config.verifyDepsBeforeRun=false exec tsc -b
corepack pnpm --config.verifyDepsBeforeRun=false run build
corepack pnpm --config.verifyDepsBeforeRun=false exec oxlint src
node scripts/check-trends.mjs
corepack pnpm --config.verifyDepsBeforeRun=false exec vite preview --host 127.0.0.1 --port 5195 --strictPort
```

Playwright MCP en Chromium, escritorio 1536 × 960 y móvil 390 × 844:

- Selección de variable, región, fuente, años y estación; asistente completo; comparación de ambas fuentes en Paita y Chimbote; glosario; aviso de menos de 8 años.
- Los dos ejemplos antárticos dan significancia en 1998–2025 y no significancia en 1986–2025.
- Los estados Confirmed, Pending y Not robust se muestran; el enlace del hallazgo preselecciona el ejemplo antártico.
- Selección de oxígeno profundo, leyenda/unidades y paginación de 24 meses en la cadena física.
- Teclado: Enter abre el asistente, el foco pasa al título de la pregunta y Tab al primer control, con contorno visible. Movimiento reducido respetado.
- Selectores y gráficos dentro del viewport móvil. Sin desborde horizontal en ambos tamaños. Las anclas directas quedan a unos 88 px del borde superior, bajo el encabezado, incluso al terminar de cargar el globo y las fuentes.
- Recarga final del explorador sin errores ni avisos de consola. Durante las compilaciones, una pestaña antigua pidió un chunk ya reemplazado y produjo un 404; se recargó contra la compilación final. No es un fallo persistente.

Capturas locales fuera del repositorio, en `D:/hackathon/NASA/pruebas/`:

- `web-review-desktop-final.png` y `web-review-mobile-final.png`.
- `web-review-mobile-chart.png`.
- `web-review-desktop-chain.png` y `web-review-mobile-chain-layers.png`.

## Contraste numérico

`scripts/check-trends.mjs` verifica tres casos de `pruebas/fitoplancton/tablas/tendencias_resumen.csv`:

| CRW, 1986–2025 | p web | p tabla | Pendiente/década web |
|---|---:|---:|---:|
| Paita | 0.861264 | 0.8521 | −0.042963 °C |
| Rey Jorge | 0.649548 | 0.6412 | +0.018799 °C |
| Chimbote | 0.717963 | 0.7093 | +0.053869 °C |

La web conserva la corrección de continuidad de Mann–Kendall (`S − sign(S)`); la tabla coincide con el cálculo sin esa corrección. Diferencias menores de 0,01, sin cambio de veredicto. No se alteraron las observaciones para hacer coincidir cifras.

Se verifican además seis fixtures independientes generados con SciPy 1.18.1: tres series reales, empates, recta y oscilación. Intervalos coinciden con `scipy.stats.theilslopes`, y p de regresión con `linregress`, con tolerancia de 1e-10. También se cubren serie constante, pocos puntos, fechas iguales y cobertura insuficiente.

Otras diferencias observadas respecto al resumen narrativo: Rey Jorge 1998–2025 da p web ≈ 0.003 frente a 0.002 en la guía; OC-CCI Chimbote 2003–2025 da ≈ 0.039 frente a 0.033. MODIS Chimbote da ≈ 0.673 frente a 0.68. Se muestran los cálculos de las series disponibles; las cifras del hallazgo mantienen el informe y estas diferencias quedan anotadas.

## Datos y trabajo compartido

Se comprobó por comparación estructural con `a91ff81` que **solo cambia `metadata.hallazgos` en monitor-data.js**: records y los demás metadatos son idénticos. Tampoco se modificaron los valores previos de CRW ni MODIS Chimbote.

Paita procede del CSV indicado: julio 2002–noviembre 2025, 281 meses. `−32767` se transforma en null, sin interpolar. La cadena ocupa unos 61 kB y se descarga únicamente con su sección; no se añade a la portada.

Se actualizó también, exclusivamente en su bloque de hallazgos, el generador compartido `D:/hackathon/NASA/pruebas/json_pagina/construir_monitor_json.py`, sin ejecutarlo. `scripts/prepare-evidence.py --workspace D:/hackathon/NASA` reproduce la preparación y mantiene ese bloque coherente. El archivo externo no pertenece a esta rama: debe conservarse al trasladar la entrega.

**Sin cambios en `src/features/juego/**`, `src/pages/JuegoPage.tsx`, estilos del juego o assets del juego.** La lógica, controles y contenido del juego no se editaron. No se publicó nada. Antes de una integración futura se debe volver a sincronizar con main y revisar posibles cambios del equipo.
