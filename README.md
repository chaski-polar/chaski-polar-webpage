# Mar Peruano 360

Sitio con tres páginas sobre el mar peruano y los datos satelitales que lo describen:

- **Portada (`/`):** un descenso con scroll desde la órbita del satélite hasta el fondo del mar. En cada capa aparece un resultado del análisis de datos.
- **Explorador (`/explorer`):** un globo 3D con datos mes a mes de 1998 a 2026 (y escenarios de El Niño hasta febrero de 2027), mapa del satélite, recorrido guiado, historias, comparación de años, hallazgos y monitor de condiciones de la costa peruana.
- **Juego (`/juego`):** Cardumen, con prólogo antártico, supervivencia de anchovetas e interfaz de bitácora oceanográfica. Entre generaciones se revisan expedientes en una cabina del puerto, con guía inicial, sellos y clasificación de documentos.

Desde la portada se pasa al explorador con una transición continua: la cámara se acerca al globo y el explorador arranca con el mismo globo, el mismo giro y el mismo encuadre.

| Profundidad | Capa | Contenido |
|---|---|---|
| Órbita | Espacio | Globo terrestre y satélite: qué se mide desde el espacio |
| Superficie | Costa peruana | Afloramiento: por qué este mar es tan productivo |
| 0–50 m | Fitoplancton | Respuesta del fitoplancton al calentamiento del mar |
| 25–45 m | Cardumen | La anchoveta y su alimento |
| 50–150 m | Zona sin oxígeno | Cómo cambia con El Niño |
| 200 m | Fondo | Acceso al explorador de datos |

## Ejecución

Requiere [Node.js](https://nodejs.org) 20 o superior y [pnpm](https://pnpm.io) (incluido con Node mediante `corepack`).

```bash
corepack pnpm install
corepack pnpm dev       # servidor de desarrollo
corepack pnpm build     # revisión de tipos y versión para publicar, en dist/
corepack pnpm lint      # revisión de estilo del código
corepack pnpm preview   # vista previa de la versión publicada
```

Para publicarlo en Vercel basta con importar el repositorio. `vercel.json` hace que las rutas (`/explorer`) funcionen también al recargar la página.

## Estructura

```
index.html                      punto de entrada de la aplicación
public/assets/
  data/                         series, monitor, escenarios de El Niño y mapas del satélite
  globe/                        relieve y foto de la Tierra para el globo
src/
  App.tsx                       rutas; cada página se descarga por separado
  pages/                        PortadaPage, HomePage (explorador) y NotFoundPage
  contexts/DataContext.tsx      carga de datos del explorador
  data/                         lectura y validación de los archivos de datos
  lib/                          atlas del globo, colores, estadística y formatos compartidos
  features/
    portada/                    escena 3D (Three.js), scroll, textos y transición
    explorer/
      ExplorerContext.tsx       modelo de datos y mapa del satélite para los componentes
      store.ts                  estado del explorador (zustand)
      lib/                      modelo, variables, mapa del satélite, recorrido e historias
      hooks/                    acciones de navegación, atlas, enlace compartible
      components/               globo, línea de tiempo y panel lateral (relato/)
    insights/                   hallazgos
    monitor/                    monitor de condiciones
    fuentes/                    tabla de fuentes
```

- Textos de la portada: `src/features/portada/contenido.ts`.
- Duración de cada tramo del descenso: `src/features/portada/scroll.ts`.
- Datos que se pueden mostrar en el globo: `src/features/explorer/lib/variables.ts`.
- Toda la carga de datos pasa por `src/contexts/DataContext.tsx` y `src/data/loaders/`, así que cambiar de fuente (por ejemplo, a una base de datos) no afecta a los componentes.

## Datos y fuentes

- **Clorofila:** [ESA Ocean Colour CCI v6](https://climate.esa.int/en/projects/ocean-colour/) (incluye sensores SeaWiFS y MODIS-Aqua de la NASA).
- **Temperatura del mar:** [NOAA Coral Reef Watch](https://coralreefwatch.noaa.gov/) v3.1.
- **El Niño 1+2 y SAM:** [NOAA PSL](https://psl.noaa.gov/data/climateindices/).
- **Hielo marino antártico:** [NSIDC Sea Ice Index G02135](https://nsidc.org/data/g02135).
- **Aire en la Antártida y la costa:** [NASA POWER](https://power.larc.nasa.gov/).
- **Nutrientes:** [World Ocean Atlas 2023](https://www.ncei.noaa.gov/access/world-ocean-atlas-2023/).
- **Pesca:** [FAO Global Production](https://www.fao.org/fishery/en/collection/global_production).
- **Monitor de condiciones:** reanálisis CMEMS, OC-CCI, ICEN (IGP/ENFEN) y biomasa de anchoveta en cruceros de IMARPE.
- **Escenarios de El Niño:** construidos con la climatología mensual y las pendientes históricas frente al ICEN, siguiendo una trayectoria asumida. Son escenarios, no pronósticos.
- **Contornos de países:** [Natural Earth](https://www.naturalearthdata.com/), escala 1:110m (dominio público).
- **Foto de la Tierra y relieve:** NASA Blue Marble y mapa de alturas, en la versión de [three-globe](https://github.com/vasturiano/three-globe).

Las cifras son asociaciones estadísticas, no relaciones de causa.

## Tecnología

[React](https://react.dev) y [TypeScript](https://www.typescriptlang.org) con [Vite](https://vite.dev), [Three.js](https://threejs.org) para la portada, [react-globe.gl](https://github.com/vasturiano/react-globe.gl) para el globo, [Recharts](https://recharts.org) para los gráficos, [zustand](https://zustand.docs.pmnd.rs) para el estado y [Tailwind CSS](https://tailwindcss.com).
