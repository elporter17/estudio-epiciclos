# CirculArte · contexto para Claude Code

Web que dibuja imágenes, textos y funciones con círculos que giran (series de Fourier / epiciclos) y graba el video. En producción: https://circularte.edav-tech.com (Vercel, se despliega solo desde `main`). Historia completa y decisiones: [docs/CONTEXTO.md](docs/CONTEXTO.md).

## Reglas de trabajo
- El usuario (Erick Alvarado, edav-tech.com) escribe en español: responde en español.
- Repo personal `elporter17/estudio-epiciclos` (remoto `git@github-personal:...`). Usa solo la cuenta personal **elporter17**; nunca la cuenta de trabajo de `gh`.
- Ramas: el trabajo va en ramas (`feat/...`); `main` = producción. Antes de subir a `main`, confirma con el usuario.
- Nunca subas ni imprimas `.env`, `data/tiktok-token.json`, claves o tokens. En formularios web, los secretos los pega el usuario.
- Publicar en TikTok solo con la API oficial (Login Kit + Content Posting API). Nada de bots de login ni scraping.

## Estructura
- `index.html`: la web (UI). Importa `src/engine.js` (motor: matemática + dibujo, compartido con Node) y `src/tiktok-ui.js` (diálogo «Publicar en TikTok»).
- `api/`: funciones de Vercel (`export default { fetch(request) }`, Web Request/Response). `_tiktok.js` es compartido (cookies cifradas AES-GCM con `SESSION_SECRET`, cliente TikTok, token de Blob).
- `scripts/`: render en Node (`render.mjs`), `pick.mjs`, `caption.mjs` (plantillas, sin IA), `daily.mjs`, `publish.mjs` y `tiktok-connect.mjs` (CLI), `fonts.mjs`.
- `.github/workflows/daily.yml`: video diario como borrador a TikTok (directo cuando se audite Direct Post); la descripción queda en el resumen de la corrida.
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
- Fuentes en Linux: los subconjuntos de @fontsource se registran con alias (`node-env.mjs`); con el mismo nombre, Skia elegía uno al azar y el texto salía en cuadros en Actions.
- Pendiente: pedir la auditoría de Direct Post. Rotar el Client secret de TikTok (quedó a la vista en una terminal) y actualizarlo en `.env`, GitHub y Vercel. La clave de OpenAI también quedó a la vista: aquí ya no se usa (se puede borrar el secreto `OPEN_AI`), pero minidramas sí; rotarla allá.
