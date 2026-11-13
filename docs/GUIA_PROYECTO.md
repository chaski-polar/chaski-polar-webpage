# Guía del proyecto: Chaski Polar

Documento de trabajo para el equipo. Resume qué es la plataforma, cómo está organizada, qué decisiones de diseño se tomaron y qué falta. Actualizado el 12/11/2026.

## 1. Qué es

Plataforma web para explorar la relación entre el fitoplancton, El Niño y la anchoveta frente al Perú, con datos satelitales abiertos (NASA, ESA, NOAA) de 1998 a 2026. Tiene tres partes:

| Ruta | Qué es |
|---|---|
| `/` | Portada: descenso en 3D desde la órbita hasta el fondo del mar peruano |
| `/explorer` | Explorador: globo, línea de tiempo, cuatro apartados de estudio, hallazgos, eventos de El Niño, cruceros y fuentes |
| `/juego` | Cardumen: juego educativo que usa los mismos datos |

Publicación: Vercel, desde la rama `main` del repositorio `chaski-polar/chaski-polar-webpage`. Cada push a `main` se publica solo en 1–3 minutos.

## 2. Mensaje científico (no cambiar sin consenso)

- Todo lo que muestra la página son **asociaciones, no pruebas de causa**.
- Resultado principal: el calentamiento del mar (El Niño) reduce el fitoplancton frente a la costa central; la pérdida es mayor con calor que lo que se recupera con frío (**asimetría**).
- No se encontró una relación robusta entre el fitoplancton antártico y el peruano (más de 900 pruebas con corrección por comparaciones múltiples). La Antártida y el Perú se conectan por los animales que migran (por ejemplo, la ballena jorobada), no por el mar.
- No hay tendencias significativas de clorofila desde 1998; dominan los golpes de El Niño.
- Los resultados sobre la anchoveta dependen mucho del año 1998; deben presentarse con cautela.
- Los desembarques son actividad pesquera, **no biomasa**.
- Nunca se inventan datos: lo que falta se rotula «not available».

## 3. Los cuatro apartados del explorador

Se elige uno y el selector solo muestra sus parámetros.

| Apartado | Parámetros |
|---|---|
| Southern Ocean & Antarctica | hielo marino, temperatura, SAM/AAO, circulación, clorofila, salinidad |
| South Pacific | previstos: temperatura, salinidad, corrientes, oxígeno subsuperficial, nivel del mar, clorofila. **Sin datos cargados todavía** |
| Humboldt system & Peruvian sea | temperatura, clorofila, oxígeno, viento, salinidad, nivel del mar, nitrato, fosfato. Falta el índice de surgencia |
| Anchoveta biological response | biomasa por cruceros IMARPE y desembarques. No disponibles: RAM Legacy, biomasa desovante, distribución espacial, NASC |

## 4. Reglas de diseño

- Fondo azul oscuro (`#071e33`). El negro (`#02040a`) solo en la zona del globo.
- Paneles azules con transparencia (variables `--panel-*` en `src/estilos.css`); no usar negro puro en paneles.
- Botones con esquinas de 6 px, sin sombras ni líneas gruesas. El elemento activo se marca con fondo claro y texto azul oscuro; los demás, sin borde, en gris azulado.
- Dos familias de letra en toda la página: Atkinson Hyperlegible (texto) y Newsreader (títulos). La portada usa además Rajdhani, solo para su estilo técnico.
- Textos en inglés en toda la página (la traducción aún está incompleta en algunos puntos).
- El logo actual es provisional: se reemplaza cambiando el archivo `public/assets/logotipo_chaski_polar.png`.

## 5. El juego Cardumen

Historia: el jugador recorre la cadena de la vida desde la Antártida hasta el Perú y guía a un cardumen de anchovetas durante años reales.

- **Prólogo:** Lumi (fitoplancton), Kiri (krill), Nara (ballena jorobada).
- **Campaña:** 2004, 1998, 2000, 2017, 2023 y 2026 (hasta el último mes con datos).
- **Cada año:** nadar buscando comida según la clorofila real de cada zona, evitar guanayes, lobo marino y bolicheras, y vigilar la zona sin oxígeno.
- **Escritorio de fin de año** (estilo «Papers, Please»): se cruzan el reporte satelital y los expedientes, se sellan, se clasifica el año y se firma la estrategia para la siguiente generación.
- Controles: WASD nadar, Espacio/Q subir, C/E bajar, Shift impulso, F juntar o dispersar, ratón para girar la cámara.
- Arte: pixel art dibujado en código, con la paleta de azules de la hoja de sprites de la ballena.
- Cifras del cardumen, depredadores, vedas y estrategias son **ilustrativas**; el mar es real.

## 6. Regla del hackathon

Las bases del evento (14 y 15 de noviembre) indican que no se puede empezar a trabajar en el reto antes del evento, que todo el contenido debe ser de código abierto y que hay que citar las fuentes. Antes de hacer público el repositorio o presentar, conviene confirmarlo.

## 7. Pendientes

- Datos para South Pacific, índice de surgencia, RAM Legacy, biomasa desovante, distribución espacial y NASC.
- Predicción en tiempo real de El Niño 2026 y mapa de vulnerabilidad por zona.
- Simulador con datos en Supabase (hoy los datos se leen de archivos estáticos).
- Juego: ajustar la dificultad jugando, probar en celular, arte final de los personajes.
- Terminar la traducción al inglés y elegir una licencia para el código.
- Verificar las citas del documento de diseño del juego.

## 8. Cómo colaborar sin pisarse

- Antes de empezar: `git fetch` y partir del `main` más reciente.
- Un cambio, un commit, con mensaje en español que diga qué cambia.
- Si dos personas editan el mismo archivo, avisar antes. El juego y la web comparten algunos estilos.
- Probar localmente antes de subir: `corepack pnpm run build` debe terminar sin errores.
