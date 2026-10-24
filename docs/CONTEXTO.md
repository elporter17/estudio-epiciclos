# CirculArte · historia, decisiones y estado

Resumen de las dos sesiones de trabajo con Claude Code del 16 de octubre de 2026: la sesión original, que creó la web y preparó TikTok, y la sesión del render y la publicación, iniciada desde la primera. Sirve para retomar el proyecto en otra PC. No contiene secretos; esos viven en `.env` (local), en Vercel y en GitHub Secrets.

## 1. Sesión original: la web y la app de TikTok

| Commit | Qué |
|---|---|
| `190f886` | «Estudio Epiciclos»: dibujos con series de Fourier en un solo `index.html` (parser de expresiones, imagen → contornos con marching squares, Fourier con KMAX 500 y M 2048, dibujo en canvas, grabación con MediaRecorder). |
| `d400fb3` | Vercel Web Analytics. |
| `9591dd9` | Nuevo nombre **CirculArte**, créditos de Erick Alvarado / edav-tech.com, presets virales (Amor, Animales, Cosas, Matemáticas; los emoji se vuelven siluetas planas), versión móvil. |
| `6c7a14a` | `privacidad.html`, `terminos.html` y `tiktok-callback.html` para la app de TikTok. |
| `04d9c2a` | Archivo de verificación de dominio de TikTok (Production). |
| `ec68ea3` | `.env` en `.gitignore` y `.env.example` con las variables de TikTok. |

También se acordó: publicar en TikTok **solo con la API oficial** (nada de bots de login), empezar con borradores porque las apps sin auditar solo publican en privado, y crear la app en TikTok Developers. El usuario la creó («Circularte», sandbox `circularte-dev`, @potter.play como usuario de prueba).

## 2. Sesión del render y la publicación

### Fase 1: render automático (rama `feat/auto-render`)
- **`src/engine.js`**: el motor salió de `index.html` como módulo ES, usado igual por la web y por Node. Lo que depende del entorno (crear lienzos, Path2D, DOMMatrix, fuentes) pasa por `setEnv()`.
- **`scripts/render.mjs`**: render determinista cuadro por cuadro con `@napi-rs/canvas` → `ffmpeg-static` → MP4 H.264 High, yuv420p bt709, 1080×1920, 30 fps, con pista AAC en silencio. Unos 30 s de render para un video de 33 s. Deja un `.json` al lado con los datos.
- Fuentes: las de Google Fonts vía paquetes `@fontsource`. Para los emoji, `npm run fonts` descarga Noto Color Emoji (COLRv1) desde google/fonts; sin ella usa la del sistema.
- **`scripts/pick.mjs`** (elige sin repetir lo reciente, `data/history.json`) y **`scripts/caption.mjs`**.

### Fase 2: descripciones y publicación
- **Descripciones**: al principio con OpenAI (`gpt-6-luna`); el 24-10-2026 se quitó para no tener gastos y ahora salen de plantillas propias en `caption.mjs`.
- **CLI de TikTok**: `tiktok:connect` (OAuth con *state*; tokens en `data/tiktok-token.json`, que se renuevan solo al vencer) y `publish` (FILE_UPLOAD por trozos, modo draft o direct). Probado: borrador real a la bandeja de @potter.play.

### Fase 3: producción (publicar desde la web)
El usuario quería publicar **directo y en un paso**. Hallazgos que definieron el diseño:
- Las [Content Sharing Guidelines](https://developers.tiktok.com/doc/content-sharing-guidelines) de TikTok exigen auditoría para publicar en público, consentimiento del usuario en cada publicación y una pantalla con privacidad sin valor por defecto, interacciones, divulgación comercial y declaración. Además ponen como uso **no aceptable** «una herramienta para subir contenido a tus propias cuentas». Por eso:
  - la **publicación directa vive en la web**, abierta al público, donde cada persona publica sus propios videos;
  - la **automatización diaria solo manda borradores** (GitHub Actions).
- El servidor de subida de TikTok **no admite CORS** y las funciones de Vercel aceptan como máximo 4.5 MB por petición (TikTok pide trozos de al menos 5 MB). Por eso el navegador sube el video a **Vercel Blob**, que se sirve desde `https://circularte.edav-tech.com/media/…` (proxy en `vercel.json`), y TikTok lo descarga con **PULL_FROM_URL** desde el dominio verificado. La copia se borra al terminar o a las 24 horas.
- La sesión de TikTok de cada visitante vive en una **cookie cifrada** (sin base de datos). La conexión se abre en una **ventana emergente** para no perder los videos grabados, que están en memoria.
- La pantalla tiene **«Publicar ahora»** (`video.publish`) y **«Enviar como borrador»** (`video.upload`). Este último existe porque Content Posting API incluye `video.upload` sin poder quitarlo y la auditoría exige demostrar todos los permisos.
- Funciones de Vercel: tienen que exportar `export default { fetch(request) }`. Un `export default function (request)` se trata como `(req, res)` y se queda colgado (pasó y se corrigió en `f096348`).

Commits de esta etapa en `main`: `43f41ca` (merge), `f096348`, `c1ce6b1`, `86a0ae5`, `7a254d5`.

## 3. Cómo está configurado todo

### Vercel (proyecto `estudio-epiciclos`, equipo de elporter17)
- Dominio: `circularte.edav-tech.com`. `main` despliega a producción.
- `vercel.json`: instala solo `@vercel/blob` (`npm install --omit=dev --ignore-scripts`; el render es `devDependencies`), proxy `/media/*` al almacén Blob público y `no-store` en `/api/*`.
- Almacenes Blob: **`circularte-media-2` (público, el que se usa)**, conectado con el prefijo `circulate_`, así que su token es `circulate_READ_WRITE_TOKEN` (el código lo detecta solo). `circularte-media` (privado) no se usa; se puede borrar.
- Variables (Production): `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` (**las del sandbox** por ahora), `TIKTOK_REDIRECT_URI` = `https://circularte.edav-tech.com/tiktok-callback.html`, `SESSION_SECRET`.

### TikTok Developers (app «Circularte»)
- **Sandbox `circularte-dev`**: Login Kit (redirect web anterior), Content Posting API con Direct Post, permisos `user.info.basic`, `video.upload` y `video.publish`, usuario de prueba **@potter.play**, URL prefix `https://circularte.edav-tech.com/` verificado (archivo `tiktokqyFPVb9B6QLImbWaKsH7UqDIs4NF38YT.txt`).
- **Production**: importada del sandbox, URL prefix verificado (archivo `tiktoki7iOt9g1qJGR0ExsTyOHhaUfqDLlFaU9.txt`), texto de revisión en inglés y 3 videos demo. Enviada a revisión el 16-10-2026 y **en vivo desde el 23-10-2026**.
- Con la app aprobada, @potter.play (conectada con las credenciales de Production el 24-10-2026) admite `PUBLIC_TO_EVERYONE`, `MUTUAL_FOLLOW_FRIENDS` y `SELF_ONLY`. Antes, sin auditoría, todo quedaba en «Solo yo» y la cuenta tenía que ser privada (`unaudited_client_can_only_post_to_private_accounts`).

### GitHub Actions (`.github/workflows/daily.yml`)
Corre a diario a las 10:00 de Honduras, o a mano. Secretos (cargados el 24-10-2026, con credenciales de Production): `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `TIKTOK_REDIRECT_URI`, `TIKTOK_TOKEN_SEED` (contenido de `data/tiktok-token.json`) y `STATE_KEY`. El token y el historial viajan cifrados en la caché de Actions.
- Las corridas #1 a #7 (17 al 23-10) fallaron a los 20 s con «La cuenta de TikTok no está conectada»: no había ningún secreto. La #8 (a mano, 24-10) funcionó: video «Flamenco» como borrador en @potter.play (`SEND_TO_USER_INBOX`).
- `scripts/secrets-to-clipboard.ps1` copia los secretos de `.env` y del token al portapapeles uno por uno, sin imprimirlos (`… .ps1 STATE_KEY` para uno solo). En la terminal solo se presiona Enter; el valor se pega en GitHub.
- Aviso sin urgencia: las actions `@v4` usan Node 20, que GitHub ya marca como obsoleto.
- En el borrador de la #8 las fórmulas y la firma salieron en cuadros: en Linux, los subconjuntos de STIX (latín, latín extendido, griego) tenían el mismo nombre de familia y Skia tomó el griego. Ahora cada subconjunto se registra con su alias (`node-env.mjs`) y el motor los pide como respaldo (`env.stix`); `∼` pasa a `~` en Node porque ningún subconjunto lo trae.

### Rama `feat/diario-directo-sin-ia` (24-10-2026)
Lo pidió el usuario después de ver el primer borrador:
- **Sin IA ni gastos**: fuera OpenAI (`caption.mjs` con plantillas). Todo el video ya salía del proyecto (fórmulas, texto y siluetas de Noto Color Emoji), así que no se marca `is_aigc`.
- **Suspenso**: `render --guide 0` (sin figura de guía mientras dibuja) y `--no-spoiler` (texto gancho sin el nombre); la descripción invita a adivinar y la portada es un cuadro al 45 % del video.
- **Figuras más complejas**: presets nuevos (dragón, araña, escorpión, langosta, ciervo, gallo, jirafa, águila, canguro, rueda de la fortuna, bicicleta, carrusel, Estatua de la Libertad), `simple: true` en los básicos (corazón, π, infinito…) para que el diario los salte, tipo nuevo `simetria` (curvas misteriosas de Farris, también en la web) y N hasta 500.
- **Publicación directa y pública** en el diario, con descripción. Decisión consciente del usuario: las reglas de TikTok para desarrolladores no aceptan herramientas que suben a las propias cuentas, y podrían quitarle el permiso a la app.
- **Resultado**: la corrida #9 (rama, direct + SELF_ONLY) y una prueba local en público dieron `403 unaudited_client_can_only_post_to_private_accounts`. La revisión de la app no incluye Direct Post: hace falta su auditoría aparte (Content Posting API → Direct Post → Apply). Guía: [AUDITORIA-DIRECT-POST.md](AUDITORIA-DIRECT-POST.md).
- **Firma apagada por defecto** en la web, `render` y el diario, porque las guías de TikTok no aceptan marcas ni enlaces dentro del video (requisito para la auditoría).
- Vercel pasó a las credenciales de Production y se redesplegó; la web ya pide la client key de Production.

## 4. Pendientes
1. **Auditoría de Direct Post**: pedirla con [AUDITORIA-DIRECT-POST.md](AUDITORIA-DIRECT-POST.md). ~~Vercel con credenciales de Production~~: hecho el 24-10.
2. **Rotar** el Client secret de TikTok (quedó a la vista en una terminal el 24-10) y actualizarlo en `.env`, GitHub y Vercel. La clave de OpenAI también quedó a la vista; aquí ya no se usa (borrar el secreto `OPEN_AI`), pero sí en minidramas.
3. ~~Saldo de OpenAI~~: ya no hace falta, el proyecto no usa OpenAI.
4. ~~Bug previo: en formato 1:1 la firma se encima con la línea «N = … error = …».~~ Resuelto: el bloque de fórmulas se escala si no cabe sobre la firma.
5. Opcional: borrar el almacén Blob privado sin usar.

## 5. Para retomar en otra PC
```bash
git clone https://github.com/elporter17/estudio-epiciclos.git
cd estudio-epiciclos
npm install
npm run fonts
```
Crea `.env` a partir de `.env.example` (las claves están en el portal de TikTok Developers y en la cuenta de OpenAI). Para conectar la cuenta en la CLI: `npm run tiktok:connect`.
