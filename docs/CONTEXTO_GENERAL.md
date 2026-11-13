# Contexto general del proyecto: Chaski Polar

Documento de contexto para quien se incorpora al trabajo. Actualizado el 12/11/2026.

## 1. Marco: el concurso

- **Evento:** NASA Space Apps Challenge 2026, hackathon global de 48 horas, el 14 y 15 de noviembre de 2026.
- **Equipo:** máximo 6 personas. Puede participarse de forma presencial (por ejemplo, sedes de Lima o Arequipa) o virtual.
- **Retos:** 14 retos oficiales, iguales en todas las sedes. La lista se obtiene de la API pública del concurso (`https://api.spaceappschallenge.org/graphql`, evento 2026 = `aWQ6NA==`).
- **Reto elegido:** *Be An Earth System Trend Detective!* (nivel avanzado): identificar qué variables de la Tierra cambian, dónde, cuánto y si el cambio es significativo, a partir de datos de la NASA.
- **Evaluación:** primero una etapa local (jueces de la sede) y luego una global (expertos de la NASA y agencias aliadas, con premios por categoría, no por reto). Criterios habituales: impacto, creatividad, validez, relevancia y presentación. La categoría **Impacto local** es la más alcanzable para un proyecto peruano con problema y usuario concretos.
- **Reglas relevantes (FAQ oficial):**
  - No se permite empezar a trabajar en los retos antes del hackathon.
  - Todo el contenido original debe ser de código abierto.
  - Deben citarse todas las fuentes.
  - Antes de hacer público el repositorio o presentar, conviene confirmar estos puntos.

## 2. Qué se decidió y por qué

Durante octubre se evaluaron varias rutas (incendios con FIRMS, radar NISAR, análogos de Marte en La Joya, fitoplancton). Se descartaron incendios y se eligió la línea del **fitoplancton y el ecosistema marino peruano**, con una pregunta inicial: ¿el fitoplancton antártico se asocia con el fitoplancton y la pesca frente al Perú?

Tras más de 900 pruebas estadísticas la respuesta fue negativa para la Antártida, de modo que el núcleo científico quedó en:

**Fitoplancton + El Niño frente al Perú, con la anchoveta como respuesta biológica.**

## 3. Mensaje científico (no cambiar sin consenso)

- Todo lo que muestra el proyecto son **asociaciones, no pruebas de causa**.
- El calentamiento del mar (El Niño) reduce la clorofila frente a la costa central. La pérdida con calor es mayor que lo que se recupera con frío (**asimetría**): aproximadamente de −18 % a −33 % por °C según la zona, y casi nulo con frío. Las zonas más vulnerables son Chimbote y Callao.
- No se halló una relación robusta entre el fitoplancton antártico y el peruano (superficie, profundidad, altimetría, reglas de asociación, corrección por comparaciones múltiples). La Antártida y el Perú se conectan por **animales migratorios** (por ejemplo, la ballena jorobada), no por el agua.
- No hay tendencias significativas de clorofila entre 1998 y 2025; dominan los golpes de El Niño.
- Los resultados sobre la anchoveta dependen mucho del año 1998 y deben presentarse con cautela (sin ese crucero, el efecto de Niño 1+2 casi desaparece).
- Los desembarques son actividad pesquera, **no biomasa**.
- Nunca se inventan datos: lo que falta se rotula «not available».
- El Niño 2026 está en curso (Niño 1+2 de +3,15 °C en julio de 2026), lo que da actualidad al proyecto.

## 4. Datos y fuentes

| Tema | Fuente |
|---|---|
| Clorofila, turbidez | OC-CCI v6 (ESA) / MODIS, vía ERDDAP |
| Temperatura del mar | Coral Reef Watch / NOAA |
| Niño 1+2, SAM/AAO | NOAA PSL |
| Hielo marino | NSIDC G02135 |
| Oxígeno, nitrato, nivel del mar | Copernicus Marine (requiere cuenta gratuita) |
| Viento | CCMP / ERA5 |
| Biomasa de anchoveta | IMARPE (cruceros acústicos) |
| Desembarques | BCRP (2003–2026) y Bouchon 2018 (1998–2002) |
| Capturas a escala mundial | FAO GlobalProduction 2026.1.0 |
| Producción de concha de abanico | Anuarios de PRODUCE |
| Registros de especies | GBIF |

Los datos de la página cubren de 1998 hasta 2026 (con rezago según la variable). Los scripts de descarga y actualización están en `datos/actualizacion_pagina/`.

## 5. La plataforma web

Publicada en Vercel desde la rama `main` del repositorio `chaski-polar/chaski-polar-webpage` (React, Vite, TypeScript, globe.gl, recharts, zustand; gestor de paquetes pnpm). Cada push a `main` se publica solo en 1–3 minutos.

| Ruta | Contenido |
|---|---|
| `/` | Portada: descenso en 3D desde la órbita hasta el fondo del mar peruano |
| `/explorer` | Globo, línea de tiempo, cuatro apartados de estudio, hallazgos, eventos de El Niño, cruceros, panel de El Niño 2026 y fuentes |
| `/juego` | Cardumen: juego educativo con los mismos datos |

**Cuatro apartados del explorador:** Southern Ocean & Antarctica, South Pacific (aún sin datos cargados), Humboldt system & Peruvian sea y Anchoveta biological response.

**Reglas de diseño:** fondo azul oscuro (`#071e33`; el negro solo en la zona del globo), paneles azules con transparencia (variables `--panel-*`), botones con esquinas de 6 px sin sombras, tipografías Atkinson Hyperlegible (texto) y Newsreader (títulos), página en inglés.

## 6. El juego Cardumen

El jugador recorre la cadena de la vida desde la Antártida hasta el Perú y guía un cardumen de anchovetas durante años reales.

- **Prólogo:** Lumi (fitoplancton), Kiri (krill) y Nara (ballena jorobada).
- **Campaña:** 2004, 1998, 2000, 2017, 2023 y 2026.
- **Mecánica:** nadar buscando comida según la clorofila real de cada zona, evitar guanayes, lobo marino y bolicheras, y vigilar la zona sin oxígeno.
- **Escritorio de fin de año** (estilo *Papers, Please*): se cruzan el reporte satelital y los expedientes, se clasifica el año (El Niño, variabilidad, tendencia) y se firma la estrategia de la siguiente generación.
- **Arte:** pixel art con paleta de azules.
- Las cifras del cardumen, los depredadores, las vedas y las estrategias son **ilustrativas**; el mar es real.

## 7. Repositorios y carpetas

| Recurso | Ubicación |
|---|---|
| Organización en GitHub | `chaski-polar` |
| Web y juego | `chaski-polar/chaski-polar-webpage` |
| Análisis de datos (Python/R) | `chaski-polar/data-treatment` |
| Material de trabajo local | `D:\hackathon\NASA\` (`datos\`, `pruebas\`, `punto1_anchoveta\`, `guias\`) |

Flujo de colaboración: `git fetch` y partir del `main` más reciente; un cambio por commit, con mensaje en español; avisar antes de editar un archivo que otra persona esté tocando; `pnpm run build` debe terminar sin errores antes de subir.

## 8. Pendientes

- Datos para South Pacific, índice de surgencia, RAM Legacy, biomasa desovante, distribución espacial y NASC.
- Predicción en tiempo real de El Niño 2026 y mapa de vulnerabilidad por zona.
- Simulador con datos en Supabase (hoy los datos son archivos estáticos).
- Juego: ajustar la dificultad, probarlo en celular y definir el arte final.
- Completar la traducción al inglés y elegir una licencia para el código.
- Verificar las citas del documento de diseño del juego.
- Confirmar la regla de preparación previa y de código abierto antes de hacer público el repositorio.
- Corregir la historia «2013, año más verde» (los datos indican que el máximo en Chimbote es 2004).

## 9. Documentos de apoyo

- `guias/GUIA_PROYECTO.md`: guía operativa del proyecto.
- `guias/GUIA_PARA_IAS.md`: guía para asistentes de IA que trabajen en el repositorio.
- `pruebas/fitoplancton/INFORME.md` y `Fitoplancton360_resultados.pdf`: resultados estadísticos.
- `pruebas/juego/Cardumen_propuesta_juego.pdf`: propuesta del juego.
