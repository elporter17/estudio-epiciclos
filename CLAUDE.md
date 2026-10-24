# CirculArte · contexto para Claude Code

Web que dibuja imágenes, textos y funciones con círculos que giran (series de Fourier / epiciclos) y graba el video. En producción: https://circularte.edav-tech.com (Vercel, se despliega solo desde `main`). Historia completa y decisiones: [docs/CONTEXTO.md](docs/CONTEXTO.md).

## Reglas de trabajo
- El usuario (Erick Alvarado, edav-tech.com) escribe en español: responde en español.
- Repo personal `elporter17/estudio-epiciclos` (remoto `git@github-personal:...`). Usa solo la cuenta personal **elporter17**; nunca la cuenta de trabajo de `gh`.
- Ramas: el trabajo va en ramas (`feat/...`); `main` = producción. Antes de subir a `main`, confirma con el usuario.
- Nunca subas ni imprimas `.env`, `data/tiktok-token.json`, claves o tokens. En formularios web, los secretos los pega el usuario.
- Publicar en TikTok solo con la API oficial (Login Kit + Content Posting API). Nada de bots de login ni scraping.

## Estructura
- `index.html`: la web (UI). Importa `src/engine.js` (motor: matemática + dibujo, compartido con Node), `src/captions.js` (descripciones y hashtags con plantillas, compartido con `caption.mjs`) y `src/tiktok-ui.js` (diálogo «Publicar en TikTok»).
- La web tiene lo mismo que la publicación automática: **Modo suspenso** (guía 0, ganchos sin el nombre, descripción sin spoiler, portada al 45 % con `cover_ms` → `video_cover_timestamp_ms`), **Máximo detalle** (`NSEQ_DETAIL`, hasta N = 500) y **🎲 Figura compleja al azar** (presets sin `simple` y `COMPLEX_TYPES`).
- `data/biblioteca.json` (500 nombres, 100 parejas, 100 figuras de emoji revisadas a ojo) alimenta la publicación automática: `catalog({ complex: true })` usa esas figuras en vez de los presets de emoji, cada elemento lleva `cat` y `pick.mjs` reparte con `SHARES` (40/25/15/20) y evita las últimas 60 corridas (las inventadas no se bloquean). Las parejas van en tres líneas (`textCanvas` admite `
- **Pelotas** (`src/bounce.js`, compartido): simulación determinista con semilla (fotos a 60 fps + lista de rebotes), dibujo y síntesis de notas (pentatónica, cuerda pulsada). `scripts/bounce.mjs` las renderiza con audio AAC; en la web, la pestaña Pelotas suena con Web Audio (el reloj del audio manda la animación) y la grabación lleva la pista por un `MediaStreamDestination`. En la publicación automática son la categoría `pelotas` (20 %), con ganchos y hashtags propios (`pelotas-<modo>` en `captions.js`).
`) y `captions.js` tiene ganchos propios para nombres y parejas.
- `api/`: funciones de Vercel (`export default { fetch(request) }`, Web Request/Response). `_tiktok.js` es compartido (cookies cifradas AES-GCM con `SESSION_SECRET`, cliente TikTok, token de Blob).
- `scripts/`: render en Node (`render.mjs`), `pick.mjs`, `caption.mjs` (plantillas, sin IA), `daily.mjs`, `publish.mjs` y `tiktok-connect.mjs` (CLI), `fonts.mjs`.
- `.github/workflows/daily.yml`: video cada 4 horas como borrador a TikTok (cron `17 */4 * * *`; máximo 5 borradores pendientes por día) (directo cuando se audite Direct Post); la descripción queda en el resumen de la corrida.
- Páginas legales: `privacidad.html`, `terminos.html`; callback OAuth: `tiktok-callback.html` (modo web y modo terminal).

## Comandos
```bash
npm install && npm run fonts          # una vez (Noto Color Emoji)
npm run render -- --preset Violín --lang en
npm run caption -- --meta out/<video>.json
npm run tiktok:connect                 # CLI, cuenta del sandbox
npm run publish -- --video out/<video>.mp4 --mode draft
npm run daily -- --publish direct      # público, con descripción (draft = bandeja)
```
En PowerShell 5.1 usa `npm.cmd run … -- …` (PowerShell se come el `--`).

## Estado (2026-10-24)
- App de TikTok «Circularte» **aprobada: Production en vivo desde el 23-10-2026**. El `.env` local y los secretos de GitHub ya usan las credenciales de Production; @potter.play está conectada con ellas (puede publicar en público).
- `daily.yml` **funciona**: los secretos están en GitHub y la corrida #8 (a mano, 24-10-2026) mandó el borrador «Flamenco» a la bandeja de @potter.play. Para cargar o rotar secretos: `scripts/secrets-to-clipboard.ps1` (los copia al portapapeles uno por uno, sin imprimirlos).
- **Sin IA (24-10-2026)**: el usuario no quiere gastos. Se quitó OpenAI; las descripciones salen de plantillas propias (`caption.mjs`). Todo el video sale del proyecto, por eso no se marca `is_aigc`. El secreto `OPEN_AI` de GitHub ya no se usa.
- **Diario en modo suspenso, en borrador hasta la auditoría de Direct Post** (después el usuario quiere directo y público, sabiendo que las reglas de TikTok no aceptan herramientas que suben a las propias cuentas): solo figuras complejas (`simple: true` marca los presets que se saltan; `COMPLEX_TYPES` en el motor), `--guide 0`, texto gancho y descripción sin nombrar la figura, portada a mitad del dibujo y N hasta 500.
- **Direct Post sigue sin auditar**: la app pasó la revisión, pero publicar directo da `403 unaudited_client_can_only_post_to_private_accounts` (probado el 24-10 en Actions y en local). Hasta la auditoría, el diario directo falla; borradores sí. Guía para pedirla: [docs/AUDITORIA-DIRECT-POST.md](docs/AUDITORIA-DIRECT-POST.md).
- **Firma apagada por defecto** (web, `render --signature`, diario): las guías de TikTok no aceptan marcas, logos ni enlaces dentro del video. En la web se guarda aparte (`signatureOn`) para ignorar ajustes viejos.
- Vercel ya tiene las credenciales de Production (24-10-2026) y se redesplegó.
- **No desconectar @potter.play en la web** («Switch account» / desconectar): llama a `/v2/oauth/revoke/` y revoca **todos** los tokens de la cuenta con la app, también el del diario (pasó el 24-10 al grabar el demo: 401 `access_token_invalid`). Para recuperarlo: `npm run tiktok:connect`, actualizar `TIKTOK_TOKEN_SEED` y lanzar el workflow a mano con **reseed** marcado.
- Fuentes en Linux (resuelto el 24-10): STIX Two Text va completa desde `assets/fonts` (`npm run fonts`) y las demás solo con el subconjunto latino; `setupNode` falla si alguna dibuja cuadros. Lo de los alias no funcionó en Linux.
- Fuentes en Linux (historia): los subconjuntos de @fontsource se registran con alias (`node-env.mjs`); con el mismo nombre, Skia elegía uno al azar y el texto salía en cuadros en Actions.
- Pendiente: pedir la auditoría de Direct Post. Rotar el Client secret de TikTok (quedó a la vista en una terminal) y actualizarlo en `.env`, GitHub y Vercel. La clave de OpenAI también quedó a la vista: aquí ya no se usa (se puede borrar el secreto `OPEN_AI`), pero minidramas sí; rotarla allá.
