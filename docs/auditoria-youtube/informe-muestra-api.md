# Informe de muestra del uso de la YouTube Data API v3 — Potter Play

Proyecto de Google Cloud: «potter-play-youtube» · Cliente OAuth de escritorio: «Subidas Potter Play» · Canal: Potter Play (UC-upSUghMwd2-TxjH9_tLJg) · Fecha del informe: 2026-11-18

## 1. Qué datos de YouTube obtiene la aplicación
| Método de la API | Partes pedidas | Para qué | Frecuencia | Cuota |
|---|---|---|---|---|
| videos.insert (subida reanudable) | snippet, status | Subir Shorts y videos largos propios | hasta 6 al día | 1.600 por subida |
| thumbnails.set | — | Miniatura de los videos largos propios | unas pocas por semana | 50 |
| channels.list (mine=true) | snippet, statistics | Comprobar que el canal está conectado | al conectar y en pruebas | 1 |
| videos.list | statistics | Leer el conteo de vistas (viewCount) de los videos que la propia aplicación subió | una vez al día | 1 por lote de hasta 50 ids |

Alcances OAuth: youtube.upload y youtube.force-ssl. La aplicación **no usa** YouTube Analytics API ni YouTube Reporting API, **no lee comentarios, suscriptores ni datos personales de espectadores**, y solo consulta videos del canal propietario (el del usuario que autorizó).

## 2. Datos recuperados (muestra real, 2026-11-18)
Canal: 25 suscriptores · 28931 vistas · 85 videos.
Videos subidos por la aplicación y consultados: **56** (del 2026-11-09 al 2026-11-18); vistas acumuladas: **18304**; promedio por video: **326.9**.
La lista completa (id, título, fechas, privacidad, vistas, me gusta y comentarios) está en el archivo adjunto `muestra-datos-api.csv`.

## 3. Análisis que se hace con esos datos
- Se guarda solo el número de vistas de cada video propio junto a su fecha (tabla «envios» en la base de datos del proyecto) para comparar formatos y horarios de publicación de nuestro propio contenido.
- Resumen por tipo de contenido (de la muestra): short: 56 videos, 326.9 vistas de promedio.
- Uso: decidir qué formatos repetir, a qué hora publicar y cuáles videos reenviar a otras plataformas. No se hace perfilado de personas, no se venden ni comparten los datos con terceros y no se descargan datos de otros canales.
- Retención: las vistas se actualizan una vez al día y los registros se conservan mientras el canal esté activo; el usuario puede revocar el acceso en https://myaccount.google.com/permissions y los tokens se eliminan.

## 4. Visibilidad de los videos subidos con videos.insert
Ver la respuesta del correo: se describe tal como aparece en los datos (columna «privacidad» y fechas del archivo CSV).
