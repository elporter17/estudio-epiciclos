# Minidramas

Fábrica de minidramas verticales para TikTok: series de ficción de 5 partes de 60 a 120 s, narradas con voz IA sobre imágenes generadas que se mueven despacio, con subtítulos grandes. Al final se suben como borradores a TikTok.

Todo corre en Node (ESM). OpenAI escribe el guion, pone la voz y genera las imágenes. El montaje se hace en local con canvas y ffmpeg, y la subida usa la Content Posting API oficial de TikTok, igual que [CirculArte](https://circularte.edav-tech.com).

Primera serie: **«La última función»** (amor y traición, español). Alma administra el cine de barrio que heredó de su madre y firma un papel que le trae su prometido. Esa misma noche descubre que lo firmó para que le quitaran el cine, y que su mejor amiga lo sabía. El guion está en [`series/la-ultima-funcion/series.json`](series/la-ultima-funcion/series.json).

## Pasos

Cada paso tiene su propio comando, y `all` los encadena. Lo que ya está hecho no se vuelve a pagar: la voz y las imágenes se guardan en `out/` y solo se regeneran con `--force`.

| Comando | Qué hace |
|---|---|
| `npm run script` | Escribe la **biblia** de la serie (premisa, personajes con una descripción visual fija, estilo visual, voces) y los 5 episodios en JSON con sus escenas. Cada episodio sigue la estructura gancho en los primeros 3 s → desarrollo → giro → cliffhanger → «Parte N+1 en mi perfil». |
| `npm run estimate` | Calcula el costo de voz, tiempos e imágenes a partir del guion real. Cuando ya hay imágenes hechas, usa su costo medio real. |
| `npm run voice` | Narra cada línea con el TTS de OpenAI, recorta los silencios y saca los tiempos de cada palabra con Whisper. Arma `episode.wav` y `timeline.json`. |
| `npm run images` | Genera un retrato de referencia de cada personaje y después una imagen vertical por escena. Cada prompt repite el estilo visual y la descripción fija de los personajes que salen en cuadro, y además se pasan sus retratos para que se parezcan entre escenas (`--no-refs` usa solo el texto). |
| `npm run assemble` | Arma el MP4 en 1080×1920 a 30 fps: zoom o paneo lento por imagen, fundidos sincronizados con la voz, subtítulos de 2 a 4 palabras con la palabra que se está diciendo en amarillo, «PARTE N» arriba, el gancho escrito durante los primeros 3 s y una tarjeta final. La música es opcional. Si algún texto queda fuera de la zona segura, **falla**. |
| `npm run review` | Revisa el MP4 terminado: saca hojas de contacto con la zona segura marcada y el texto que se espera en cada cuadro, mide la sincronía y comprueba la duración. |
| `npm run publish` | Sube los episodios a TikTok como borrador (o publicación directa privada). |
| `npm run all` | Encadena guion → estimación → **confirmación** → voz → imágenes → montaje → revisión, y publica si pasas `--publish`. |

Ejemplos:

```bash
npm run all
```

```bash
node scripts/all.mjs --series la-ultima-funcion --ep 1
```

```bash
node scripts/script.mjs --genre "venganza" --idea "una chef humillada que vuelve como dueña del restaurante"
```

```bash
node scripts/script.mjs --ep 5 --tighten
```

```bash
node scripts/assemble.mjs --ep 1 --still 2.5 --safe-overlay
```

```bash
node scripts/publish.mjs --ep 1-5 --mode draft
```

> **PowerShell 5.1** se come el `--` de `npm run x -- --opción`. Usa `npm.cmd run x -- --opción` o llama directo a `node scripts/x.mjs --opción`.

Opciones comunes: `--series <slug>` (por defecto, la serie que se modificó por última vez), `--ep 1 | 1,3 | 2-5 | all` y `--force` para regenerar.

## Instalación

```bash
npm install
```

```bash
cp .env.example .env
```

Después pon las claves en `.env`. El archivo está en `.gitignore` y nunca se sube.

- `OPEN_AI` (o `OPENAI_API_KEY`).
- `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` y `TIKTOK_REDIRECT_URI`: son los mismos de la app «Circularte» (sandbox «circularte-dev»).
- `TIKTOK_TOKEN_FILE`: apunta al `data/tiktok-token.json` de CirculArte. **La conexión de la cuenta se comparte**, así que no hay que volver a autorizar. Hay un solo archivo de token, fuera de los dos repos de git, y cuando un proyecto lo renueva el otro no se queda con uno vencido. Si lo dejas vacío, se usa `data/tiktok-token.json` de este repo y tienes que conectar la cuenta con `npm run tiktok:connect`.

Para comprobar la conexión: `node scripts/tiktok-connect.mjs --status`.

### Música (opcional)

Pon archivos `.mp3`, `.m4a` o `.wav` en `assets/music/`. Cada episodio elige uno de forma estable. La música baja de volumen cuando habla la voz (sidechain), el audio se normaliza a −14 LUFS y la pista se desvanece al final. Usa solo música con licencia para redes. `--music none` la quita y `--music <archivo>` fuerza una pista concreta. Los archivos de música no se suben a git.

## Modelos y costo

Los modelos se pueden cambiar en `.env` (mira `.env.example`):

| Uso | Modelo por defecto |
|---|---|
| Guion | `gpt-6-sol` |
| Voz | `gpt-4o-mini-tts` (voces distintas por personaje; la narradora es la protagonista) |
| Tiempos por palabra | `whisper-1` |
| Imágenes | `gpt-image-2.5-flare`, 1088×1920, calidad `medium` |
| Reescritura de escenas que rechaza el filtro | `gpt-6-luna` |

Costo real del piloto (5 episodios, 2026-10-19): guion ≈ $0.25, voz + tiempos ≈ $0.15 y imágenes ≈ $1.50 (cada imagen sale por ≈ $0.011 sin referencias y entre $0.024 y $0.049 con 1 a 3 retratos de referencia). En total, **unos $0.40 por episodio**. El montaje es local y tarda unos 5 minutos por episodio en esta PC. Los precios están en `scripts/lib/pricing.mjs`.

## Zona segura y revisión

El texto se centra en la zona segura de TikTok: x de 6 a 84 % de W, y de 15 a 78 % de H, lejos de los botones de la derecha y de la descripción de abajo. `assemble` mide cada texto (con su contorno) y aborta si alguno se sale. `review` lo vuelve a comprobar sobre el MP4 final:

- **Hojas de contacto** (`out/<serie>/review/parte-N-hoja-*.png`): cuadros de los primeros 3,5 s (el gancho), del centro de cada subtítulo, de cada fundido y del cierre. Cada cuadro lleva marcada la zona segura y, debajo, el texto que debería verse.
- **Sincronía**: mide el inicio real del sonido de cada línea en el audio y lo compara con su primer subtítulo. Además vuelve a transcribir el MP4 con Whisper y compara palabra por palabra. Whisper se equivoca después de las pausas, así que la medida acústica es la que cuenta.

Resultado de la parte 1: 116 s, primera palabra a los 0,08 s, 81 subtítulos de 2 a 4 palabras, nada fuera de la zona segura. Cada línea arranca entre 0 y 100 ms antes de su sonido, y la mediana de desfase por palabra es de 20 ms.

## TikTok: borradores y etiqueta de IA

- `--mode draft` (por defecto): el video llega a la bandeja de TikTok (permiso `video.upload`) y desde la app terminas de publicarlo. TikTok permite **5 borradores pendientes cada 24 h por cuenta**, y los de CirculArte cuentan para el mismo límite. `publish` lleva la cuenta en `data/tiktok-log.json` y se detiene antes de pasarse (`--force` se salta la comprobación).
- **Etiqueta de contenido IA**: la API de bandeja no admite título ni la marca `is_aigc`. Al publicar un borrador desde la app hay que activar **«Contenido generado por IA»** en Más opciones. `publish` lo recuerda e imprime la descripción para pegarla, que ya incluye «Ficción · hecho con IA».
- `--mode direct`: publica directo con `is_aigc: true`, la etiqueta oficial de IA. Mientras la app no esté auditada, solo funciona como privado (`SELF_ONLY`).
- La cuenta de prueba es @potter.play, en el sandbox «circularte-dev». Las reglas de TikTok no permiten publicar automáticamente en cuentas propias con una app sin auditar, por eso el flujo por defecto es el borrador.

## Reglas de contenido

El guion se pide con estas reglas: historias 100 % originales, sin personas, marcas ni hechos reales; todos los personajes son adultos; nada de sexo explícito, violencia gráfica ni autolesiones; ambientación latinoamericana genérica. Si el filtro de imágenes rechaza una escena, se reintenta una versión sobria y después se reescribe el momento sin contacto físico (la tensión queda en la distancia, las miradas y la luz).

## Estructura

```
series/<slug>/series.json   guion: biblia + 5 episodios (se commitea)
out/<slug>/characters/      retratos de referencia            (ignorado)
out/<slug>/epNN/audio/      voz por línea, episode.wav, timeline.json
out/<slug>/epNN/images/     una imagen por escena + images.json (prompts y costo)
out/<slug>/<slug>-parte-N.mp4 / .json   video final + descripción para TikTok
out/<slug>/review/          hojas de contacto e informe de revisión
scripts/                    un archivo por paso; lib/ con env, cli, serie, precios y cliente de TikTok
```
