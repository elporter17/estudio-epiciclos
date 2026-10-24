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
- `scripts/`: render en Node (`render.mjs`), `pick.mjs`, `caption.mjs` (OpenAI), `daily.mjs`, `publish.mjs` y `tiktok-connect.mjs` (CLI), `fonts.mjs`.
- `.github/workflows/daily.yml`: video diario como borrador a TikTok.
- Páginas legales: `privacidad.html`, `terminos.html`; callback OAuth: `tiktok-callback.html` (modo web y modo terminal).

## Comandos
```bash
npm install && npm run fonts          # una vez (Noto Color Emoji)
npm run render -- --preset Violín --lang en
npm run caption -- --meta out/<video>.json
npm run tiktok:connect                 # CLI, cuenta del sandbox
npm run publish -- --video out/<video>.mp4 --mode draft
npm run daily -- --publish draft
```
En PowerShell 5.1 usa `npm.cmd run … -- …` (PowerShell se come el `--`).

## Estado (2026-10-24)
- App de TikTok «Circularte» **aprobada: Production en vivo desde el 23-10-2026**. El `.env` local y los secretos de GitHub ya usan las credenciales de Production; @potter.play está conectada con ellas (puede publicar en público).
- `daily.yml` **funciona**: los 6 secretos están en GitHub y la corrida #8 (a mano, 24-10-2026) mandó el borrador «Flamenco» a la bandeja de @potter.play. Para cargar o rotar secretos: `scripts/secrets-to-clipboard.ps1` (los copia al portapapeles uno por uno, sin imprimirlos).
- La cuenta de OpenAI se quedó sin saldo (429): las descripciones salen de la plantilla local hasta que se recargue.
- Pendiente: Vercel sigue con las credenciales del **sandbox**; poner las de Production y redesplegar. Rotar la clave de OpenAI y el Client secret de TikTok (quedaron a la vista en una terminal) y actualizarlos en `.env`, GitHub y Vercel.
