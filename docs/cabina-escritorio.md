# Cabina y primera guardia

Rama `feat/juego-cabina`, trabajo local para integrar después con `feat/juego`.

## Cambios

- Cabina del puerto con una ventanilla ilustrada en SVG y un representante esperando la revisión del expediente seleccionado (o del siguiente sin sello). Sin temporizador ni penalización por tardar. La visita recoge sus documentos al entregar.
- Guía de cinco pasos la primera vez: consultar Manual/Reporte, seleccionar y sellar un expediente, archivar **solo la carpeta del año**, firmar el plan y entregar. Explica arrastre y alternativa de seleccionar carpeta + tocar bandeja.
- La guía se recuerda al cerrarla o entregar mediante `cardumen-guia-escritorio-v1`. «Cómo revisar» permite abrirla otra vez. Si el almacenamiento está bloqueado, la ayuda funciona igualmente.
- Botones para localizar cada papel sin revelar la respuesta correcta. Los documentos se pueden seleccionar con Tab y Enter/Espacio, además del ratón/táctil. Los papeles no se pueden arrastrar fuera del borde superior/izquierdo o fuera del ancho de la mesa.
- Símbolo propio de sello en los dos botones y en las marcas sobre papel. No depende de emojis o imágenes externas.
- La cabina y la guía ocupan una franja distinta de la mesa, para evitar que los papeles aparezcan encima del personaje. En móvil pasan a una columna.

La lógica de expedientes, reglas, respuestas, puntaje y efecto sobre la generación siguiente no cambia. El escritorio conserva los papeles cálidos y los controles marinos opacos, de esquinas discretas y sin sombras de botón.

## Referencia de diseño

[Lucas Pope: Cramming Papers, Please Onto Phones](https://dukope.com/devlogs/papers-please/mobile/) explica la separación entre visita/cabina/documentos y la prioridad de la lectura y manipulación en pantallas pequeñas. Esta adaptación conserva el arrastre en escritorio y la alternativa de botones ya disponible en móvil; no copia los personajes ni los gráficos del juego de referencia.

## Validación

```powershell
node node_modules/typescript/bin/tsc -p tsconfig.app.json --incremental --tsBuildInfoFile node_modules/.tmp/cabina.app.tsbuildinfo
node scripts/comprobar-cabina.mjs
node node_modules/vite/bin/vite.js build
```

La comprobación SSR cubre primera visita, ayuda recordada y reabrible, presencia del sello SVG, que la guía no revele respuestas, plan opcional en el último año y cierre de la cabina. No sustituye la revisión de arrastre, foco real, móvil y apariencia en navegador. Este entorno no dispone de un navegador permitido para esa revisión.
