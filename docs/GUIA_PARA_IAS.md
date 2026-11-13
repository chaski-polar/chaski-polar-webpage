# Guía para asistentes de IA: Chaski Polar

Lee este archivo completo antes de tocar el código. Está fuera del repositorio a propósito: no lo copies ni lo agregues al repo. Complementa a `GUIA_PROYECTO.md` (visión general) y a `COORDINACION_JUEGO.md` (reparto de trabajo del juego).

## Repositorio y carpetas

- Repositorio: `chaski-polar/chaski-polar-webpage` (GitHub). `main` se publica en Vercel: **todo push a `main` queda público**.
- Carpeta de la web: `D:\hackathon\NASA\repos\chaski-polar-estetica`. Carpeta del juego: `D:\hackathon\NASA\repos\chaski-polar-webpage`. Son dos copias de trabajo del mismo repositorio (worktrees); no cambies de rama dentro de una carpeta que otra herramienta esté editando.
- Datos y análisis: repositorio `data-treatment` (Python y R) en `D:\hackathon\NASA\repos\data-treatment`; archivos locales en `D:\hackathon\NASA\datos` y `D:\hackathon\NASA\punto1_anchoveta`.
- Una persona del equipo sube cambios a `main` en cualquier momento: haz `git fetch` antes de empezar y antes de publicar.

## Stack

React 19 + Vite 8 + TypeScript estricto, Tailwind v4 (poco usado; casi todo es CSS propio), zustand, react-globe.gl y three.js, recharts. Gestor de paquetes: `corepack pnpm` (no `npm`).

Comandos (dentro de la carpeta del repositorio):
- `corepack pnpm run build`: tsc + vite. Debe terminar sin errores (falla con variables sin usar).
- `corepack pnpm exec oxlint src`: lint. Los avisos de `monitor-data.js` y `pixel.ts` ya existían.
- `corepack pnpm exec vite preview --port 5195 --strictPort`: servir la compilación. Abre solo un servidor a la vez; la computadora se queda con poca memoria y el sistema cierra los servidores en segundo plano.

## Mapa del código (`src/`)

- `pages/`: `PortadaPage`, `HomePage` (explorador), `JuegoPage`. Rutas en `App.tsx`, todas con `lazy`.
- `components/navigation/Header.tsx`: encabezado. La opción activa sigue al scroll.
- `features/portada/`: escena Three.js del descenso (`escena/`, `scroll.ts`, `interfaz.ts`, `contenido.ts` con los textos, `portada.css`).
- `features/explorer/`: `lib/variables.ts` (cada variable declara sus `secciones`), `lib/regiones.ts` (los 4 apartados y `NO_DISPONIBLE`), `components/RegionesPanel.tsx`, `TimelinePanel.tsx`, `GlobePanel.tsx`, `relato/` (panel derecho; `Biologia.tsx` es el apartado de la anchoveta), `store.ts` (estado), `lib/modelo.ts` (acceso a los datos).
- `features/insights`, `eventos`, `cruceros`, `fuentes`, `monitor`: secciones de la página del explorador.
- `contexts/DataContext.tsx` y `data/loaders/runtime.ts`: carga de `public/assets/data/` (`datos.js`, `monitor-data.js`, `cruceros.json`, `mapas/`).
- `features/juego/`: `motor/` (mar con datos reales, escena, cámara, entrada, sonido, pixel), `logica/` (cardumen y escritorio), `escenas/` (cardumen, Lumi, Kiri, Nara), `interfaz/`, `personajes/` (pixel art en código), `dialogo/`, `guion.ts` (todos los textos).

## Reglas que no se discuten

**Ciencia**
- Asociación no es causa. No escribas frases que sugieran que la Antártida causa cambios en el fitoplancton o la anchoveta del Perú.
- No inventes datos ni rellenes huecos. Lo que falta se rotula «not available».
- Desembarques ≠ biomasa. Las cifras del juego son ilustrativas y debe decirse.

**Diseño**
- Azul oscuro de fondo; negro solo en la zona del globo. Usa las variables `--panel-*`, `--hielo`, `--niebla`, `--frio`, `--fito`, `--nino` de `src/estilos.css`.
- Botones: radio de 6 px, sin sombras ni líneas gruesas. Activo = fondo claro y texto azul oscuro; inactivos = sin borde, gris azulado.
- Dos familias de letra (Atkinson Hyperlegible y Newsreader). Rajdhani solo en la portada. No agregues más.
- Textos de la interfaz en inglés. Comentarios de código en español.
- Sin emojis en la interfaz.

**Trabajo**
- Pide confirmación antes de publicar en `main`, borrar archivos o cambiar datos.
- Commits con la identidad ya configurada en git, un tema por commit, mensajes en español, **sin coautores ni marcas de IA**. No subas este archivo ni los de `D:\hackathon\NASA\guias\`.
- No abras, listes ni muestres archivos `.env`.
- Si ves cambios sin commit que no son tuyos, no los toques ni los reviertas.

## Trampas conocidas

- CSS sin capa le gana a CSS dentro de `@layer`: la regla global `a:hover` de `estilos.css` pisó los estilos de Tailwind del encabezado. Pon las reglas nuevas sin capa o con más especificidad.
- Los tooltips de recharts parpadean si interceptan el cursor: ya hay una regla global (`.recharts-tooltip-wrapper { pointer-events: none }`). No la quites.
- `MeshToonMaterial` no acepta `flatShading`. Los scripts de Python largos con comillas dentro de un `bash` heredoc fallan: guárdalos en un archivo y ejecútalos.
- El juego mide los cuadros por segundo con `/juego?depurar=1` (guarda `window.__juego`). Con Chrome automatizado la ventana puede ir muy lenta si no está al frente; prueba lógica con los parámetros de abajo.
- Para probar celular sin redimensionar la ventana, carga la página en `<iframe width=390>`.
- El cambio de tamaño de la ventana del navegador automatizado no funciona.

## Parámetros de prueba del juego (URL)

`/juego?rapido=12` acelera solo el calendario · `?generacion=2` empieza en 1998 · `?sprites=1` galería de personajes · `?depurar=1` métricas de dibujo · `?arte=png` imágenes rechazadas (solo prueba).

## Cómo verificar un cambio

1. `build` y `oxlint` sin errores nuevos.
2. Abrir la página en Chrome a ~1536 px y a 390 px (iframe), sin errores en la consola.
3. Revisar lo que se tocó y lo vecino: encabezado, globo, línea de tiempo, panel derecho, secciones de abajo, portada, juego.
4. Comprobar que ningún dato cambió.
5. Antes de publicar: `git fetch`, confirmar que `main` no avanzó o rebasar, y pedir confirmación.

## Estado al 12/11/2026

Hecho: portada 3D con estilo técnico; explorador con cuatro apartados; estética azul; encabezado con logo; juego completo (prólogo, campaña de seis años, escritorio de fin de año, sonido, pixel art) integrado a `main`.

Pendiente: ver la sección 7 de `GUIA_PROYECTO.md`. Lo más urgente antes del 14/11: datos reales para los apartados «no disponibles», probar el juego a mano (dificultad y celular) y terminar la traducción.
