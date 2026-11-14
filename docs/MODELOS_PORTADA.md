# Modelos originales para la portada

Trabajo local en `feat/web-hallazgos-2026`, sin publicación ni cambios en el juego o en los GLB del equipo.

## Revisar

- Portada: `http://127.0.0.1:5195/`.
- Visor: `http://127.0.0.1:5195/modelos-portada`.
- Seleccionar una pieza, arrastrar para orbitar, desplazar/pellizcar para acercar, o utilizar los botones de rotación y reinicio. La rotación automática empieza únicamente al activarla.
- Los enlaces de descarga entregan los GLB que utiliza el propio visor.

| Modelo | Integración | Bytes | Triángulos | Mallas |
| --- | --- | ---: | ---: | ---: |
| Satélite de observación | Sustituye al satélite procedural anterior de la portada | 114624 | 2256 | 6 |
| Boya oceanográfica | Superficie, junto a la bolichera existente | 62320 | 1676 | 5 |
| Diatomea céntrica estilizada | Estudio ampliado en el visor; no se inserta a escala gigante en el mar | 455048 | 12608 | 3 |

Son ilustraciones educativas originales, no réplicas de una misión o especie concreta. El satélite tiene paneles solares, antena, radiadores, aislante y óptica; la boya incluye flotador, panel solar, baliza y sensor sumergido. La diatomea representa una frústula con ornamentación radial; los poros son detalles de superficie, no perforaciones volumétricas.

## Archivos y reproducción

- Geometrías y materiales: `src/features/portada/modelos/instrumentos.ts`.
- Assets: `public/assets/portada/modelos/*.glb`.
- Exportación reproducible con Node 24: `node scripts/exportar-modelos-portada.mjs`.
- Construcción: `corepack pnpm --config.verifyDepsBeforeRun=false run build`.
- Vista local: `corepack pnpm --config.verifyDepsBeforeRun=false exec vite preview --host 127.0.0.1 --port 5195 --strictPort` (no abrir otro servidor si ya está activo).

No se agregaron dependencias ni texturas externas. Los materiales se agrupan y los vértices se indexan para reducir tamaño y llamadas de dibujo. La portada construye el satélite y la boya desde las mismas funciones que generan los GLB; no descarga el asset de la diatomea. El visor carga únicamente el GLB seleccionado y libera recursos al cambiar de pieza o salir. Conserva Atkinson Hyperlegible y Newsreader y usa la paleta azul existente.

El encuadre del satélite es ilustrativo, frente al globo, y se adapta al ancho de pantalla; no simula una trayectoria orbital real. La boya también adapta su posición horizontal. Sus nuevas oscilaciones respetan la preferencia de movimiento reducido. Las animaciones previas de la portada no se modifican.

## Verificación

- TypeScript y compilación de producción correctos.
- Exportación y lectura posterior de los tres GLB con `GLTFLoader`: cabecera, longitud, coordenadas finitas y límites espaciales conservados.
- Lint de `src`: solo los dos avisos previos de `pixel.ts` y `submarino.ts`.
- Playwright MCP: visor y portada a 1536 × 960 y 390 × 844; selección de los tres modelos, giro manual, rotación automática, pausa, reinicio y descarga GLB (HTTP 200).
- Sin desbordamiento horizontal. Sin errores de consola; la portada conserva el aviso previo de obsolescencia de `THREE.Clock`.
- Capturas locales en `D:/hackathon/NASA/pruebas/`: `modelos-*-desktop.png`, `modelos-*-390.png`, `portada-modelos-*.png`.
- No se midieron FPS en dispositivos físicos. Los avisos de tamaño de chunks del explorador siguen presentes.
