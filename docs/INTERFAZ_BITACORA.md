# Interfaz de Cardumen: bitácora oceanográfica

La usuaria eligió esta dirección antes de implementarla. Trabajo local en `feat/juego-interfaz`, sobre la base visual `97d4cca`; no modifica los fondos, la cámara ni las reglas del juego.

## Decisiones aplicadas

- Paleta: azul tinta `#071b29`, azul pizarra `#143445`, marfil `#edf1e7`, salvia `#afcfba`, ámbar `#dfbc79`. Los avisos de peligro tienen texto y color coral, además de los sonidos existentes.
- Tipografía: Atkinson Hyperlegible para lectura y controles; cifras tabulares para mediciones; Newsreader para nombres/títulos. No se añadieron fuentes ni dependencias.
- Un bloque agrupa tamaño del cardumen, energía y profundidad. El límite de oxígeno y la posición de Anchi comparten una regla horizontal con cifras aproximadas, manteniendo la escala ilustrativa del juego.
- El «Parte del mar» se abre a voluntad. Cerrado muestra alimento de la zona; abierto muestra procedencia del dato, temperatura, Niño 1+2, temporada y radar de las cinco zonas. No se oculta el radar en móvil cuando el parte está abierto.
- El prólogo muestra una tarea corta por personaje y medidores consistentes. La pantalla de diálogo reduce el retrato, distingue al hablante y muestra cómo completar el texto o continuar.
- Portada, menú, controles y sonido comparten una navegación. La ayuda de controles se consulta desde ahí. El HUD y las acciones quedan ocultos mientras un diálogo detiene el juego y mientras se muestra el balance/final.
- Los controles táctiles conservan subir/bajar y liberan la pulsación cuando se cancela o pierde la captura del puntero. Botones de al menos 44 px, sin vidrio, pastillas ni sombras.
- Los documentos, el arrastre, las bandejas, los sellos y las respuestas del escritorio no se modificaron. Son responsabilidad de otra tarea paralela.

## Investigación que orientó el diseño

- [Lucas Pope: adaptar Papers, Please a teléfonos](https://dukope.com/devlogs/papers-please/mobile/). Referencia directa del autor para pensar una disposición móvil propia sin perder la interacción con documentos.
- [In Other Waters, presentación del editor](https://www.fellowtraveller.games/in-other-waters/). Referencia de exploración oceánica mediante señales, navegación y una interfaz de instrumentos. La adaptación aquí conserva el mundo 3D: no lo sustituye por un mapa.
- [Game Accessibility Guidelines](https://gameaccessibilityguidelines.com/full-list/). Texto claro, objetivos y controles recordables, elementos táctiles espaciados, valores accesibles de los medidores y respeto a reducir movimiento.

La paleta y la distribución concreta son decisiones propias para este proyecto; no se copiaron ilustraciones, código ni fuentes de los juegos de referencia.

## Archivos

- `src/features/juego/interfaz/bitacora.css`: estilos propios del HUD, prólogo, comunicación y navegación; se carga después del estilo legado.
- `Medidor.tsx`, `HudCardumen.tsx`, `HudPrologo.tsx`: estado de juego y consultas del mar.
- `src/features/juego/dialogo/Dialogo.tsx`: lectura y continuación explícitas.
- `src/pages/JuegoPage.tsx`: navegación y estado visual de diálogo/balance.
- `MenuCardumen.tsx`: membrete de expedición; conserva el menú y el arte anteriores.

## Validación

- TypeScript y diff de espacios comprobados.
- La compilación de producción pasó (1.078 módulos) y comprobó también imports y CSS. Se conserva el aviso de paquete grande del globo, ajeno a esta UI.
- No se dispone de navegador en esta tarea; no se intentó ejecutar Edge porque su ejecución ya fue rechazada en la tarea principal. Sigue pendiente la revisión visual y táctil a 390 px, escritorio y horizontal. No se han medido FPS.

Después de unir las ramas, comprobar que la profundidad siga correspondiendo al fondo optimizado: se conserva el contrato de estado `hud.y` y `hud.yOxigeno` del juego actual.
