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
- **Descripciones con OpenAI** (lo pidió el usuario en lugar de Claude): Responses API con salida JSON estructurada, modelo `gpt-6-luna` (la guía de modelos de OpenAI lo recomienda para tareas acotadas de alto volumen). La clave va en `OPEN_AI` u `OPENAI_API_KEY`. Si no hay clave o la API falla, usa una plantilla local.
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
Corre a diario a las 10:00 de Honduras, o a mano. Secretos (todos cargados el 24-10-2026, con credenciales de Production): `OPEN_AI`, `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `TIKTOK_REDIRECT_URI`, `TIKTOK_TOKEN_SEED` (contenido de `data/tiktok-token.json`) y `STATE_KEY`. El token y el historial viajan cifrados en la caché de Actions.
- Las corridas #1 a #7 (17 al 23-10) fallaron a los 20 s con «La cuenta de TikTok no está conectada»: no había ningún secreto. La #8 (a mano, 24-10) funcionó: video «Flamenco» como borrador en @potter.play (`SEND_TO_USER_INBOX`).
- `scripts/secrets-to-clipboard.ps1` copia los secretos de `.env` y del token al portapapeles uno por uno, sin imprimirlos (`… .ps1 STATE_KEY` para uno solo). En la terminal solo se presiona Enter; el valor se pega en GitHub.
- Aviso sin urgencia: las actions `@v4` usan Node 20, que GitHub ya marca como obsoleto.

## 4. Pendientes
1. **Vercel**: cambiar `TIKTOK_CLIENT_KEY` y `TIKTOK_CLIENT_SECRET` por las de Production y redesplegar; reconectar la cuenta desde la web.
2. **Rotar** la clave de OpenAI y el Client secret de TikTok (quedaron a la vista en una terminal el 24-10) y actualizarlos en `.env`, GitHub y Vercel.
3. **Saldo de OpenAI**: la cuenta respondió 429 (sin créditos); mientras tanto las descripciones usan la plantilla local.
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
