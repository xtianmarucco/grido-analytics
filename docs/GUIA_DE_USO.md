# Guía de uso

Esta guía explica cómo usar Grido Analytics para analizar el reporte semanal de cierre de turnos.
No hace falta instalar nada: la aplicación se abre en el navegador (Chrome, Safari o Firefox).

## Antes de empezar

- Tenga a mano el Excel semanal de cierre de turnos (archivo `.xlsx`, de hasta 4 MB).
- Abra la dirección de la aplicación que le indicaron. Si el acceso está protegido, el navegador
  le pedirá primero que inicie sesión en Vercel con su cuenta.
- El archivo se procesa al momento y no se guarda: cada vez que abra la aplicación debe volver a
  cargarlo.

## 1. Cargar el archivo

1. En **Reporte semanal de turnos**, arrastre el Excel sobre el recuadro o use **Seleccionar
   archivo**.
2. Espere unos segundos mientras se procesa. Al terminar se muestra el panel de resultados.
3. Si algunas filas del archivo no se pudieron usar, un aviso lo indica. El detalle está en
   **Datos importados**, al final de la página.

## 2. Elegir la vista

Debajo del título, el selector **Vista** permite ver una sucursal o **Ambas sucursales** (la vista
inicial). Cambiar de vista no vuelve a cargar el archivo.

## 3. Leer los resultados

La página se lee de arriba hacia abajo:

| Sección                | Qué muestra                                                                                    |
| ---------------------- | ---------------------------------------------------------------------------------------------- |
| Tarjetas de resumen    | Totales de la semana: tickets, activadas, aceptadas y efectividad.                             |
| Podio                  | Los tres primeros puestos entre los cajeros que cumplen los requisitos.                        |
| Observaciones          | Dato, interpretación y recomendación sobre los resultados.                                     |
| Ranking                | Todos los cajeros. Puede buscar por nombre y ordenar columnas; el puesto oficial no cambia.    |
| Control de caja        | Participación del efectivo y de Club Grido, diferencias de caja y puntos "Señal para revisar". |
| Efectividad por cajero | Gráfico de la efectividad de cada cajero.                                                      |
| Datos importados       | Turnos leídos del archivo y filas que no se incluyeron, con el motivo (sección plegada).       |

Una "Señal para revisar" no es una falta: indica un dato que conviene mirar con más atención.

## 4. Descargar los informes

1. Elija la vista que quiere exportar.
2. Use **Descargar PDF · {vista}** o **Descargar Excel · {vista}**.
3. Mientras se genera el informe, los botones y el selector de vista quedan deshabilitados y se
   muestra "Generando…". Al terminar, el navegador descarga el archivo, por ejemplo
   `grido-informe-ambas-sucursales-2026-10-19-al-2026-10-25.pdf`.

El PDF está pensado para imprimir en A4. El Excel tiene las hojas Resumen, Ranking, Podio,
Observaciones y Control de caja.

En Safari, el archivo queda en la carpeta Descargas; si el navegador pregunta si permite la
descarga, elija **Permitir**.

## 5. Analizar otro archivo

Use **Analizar otro archivo** para cargar otra semana. El resultado anterior se reemplaza por
completo.

## Mensajes frecuentes

| Mensaje                                                     | Qué hacer                                                                                                     |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| El archivo supera el tamaño máximo de 4 MB.                 | Verifique que sea el reporte semanal. Si lo es, exporte el reporte de nuevo solo con las columnas necesarias. |
| El archivo debe ser un Excel .xlsx (el reporte de cierre…). | Cargue el archivo `.xlsx` original, no un PDF, una imagen ni un `.xls` antiguo.                               |
| No se pudo leer el archivo…                                 | El archivo puede estar dañado. Descárguelo otra vez desde el sistema de origen.                               |
| Faltan columnas obligatorias: …                             | El reporte no tiene el formato esperado. Use el reporte de cierre de turnos completo.                         |
| El archivo contiene más de un período…                      | Cargue un reporte de una sola semana.                                                                         |
| Ninguna fila del archivo es válida…                         | Revise las advertencias de **Datos importados** y corrija el archivo.                                         |
| No se pudo conectar con el servidor…                        | Verifique su conexión a internet y vuelva a intentarlo en unos minutos.                                       |
| Ocurrió un error inesperado… Intente nuevamente.            | Vuelva a intentarlo. Si se repite, avise a quien administra la aplicación.                                    |

## Privacidad

El Excel se envía a la aplicación solo para calcular los resultados y generar los informes; no se
guarda en ningún servidor ni en el navegador. Los informes descargados quedan en su equipo:
guárdelos en un lugar seguro, porque contienen nombres de cajeros y datos de ventas.
