# Minidramas: contexto del proyecto

Proyecto personal de Erick Alvarado (edav-tech.com). Es una fábrica de minidramas verticales para TikTok: series de ficción de 5 partes de 60 a 120 s, con voz IA, imágenes generadas que se mueven despacio y subtítulos grandes. Se suben como borradores a TikTok. Cómo se usa: [README.md](README.md). Responde en español.

## Reglas del repo
- GitHub **personal** `elporter17/minidramas`, remoto `git@github-personal:elporter17/minidramas.git` (alias SSH). Identidad local `Erick Alvarado <96088451+elporter17@users.noreply.github.com>`. Nunca uses la cuenta de trabajo ni cambies la configuración global de git.
- Trabaja en ramas, no en `main`. La rama del piloto es `feat/piloto-amor-traicion`.
- Los secretos van solo en `.env` (ignorado). El token de TikTok nunca se sube.
- Antes de gastar en la API (voz o imágenes de episodios nuevos), muestra `npm run estimate` y confirma con el usuario.
- Antes de subir algo a TikTok, pide el OK del usuario.

## Relación con CirculArte
- CirculArte (circularte.edav-tech.com, repo `elporter17/estudio-epiciclos`) es la otra herramienta. `scripts/lib/tiktok.mjs` y `scripts/tiktok-connect.mjs` vienen de allí.
- La app de TikTok es la misma: «Circularte», sandbox «circularte-dev», cuenta de prueba **@potter.play**. La app aún no está auditada.
- En la PC original, `TIKTOK_TOKEN_FILE` apunta al token de CirculArte, así que es un solo archivo para los dos proyectos. En otra PC se conecta de nuevo con `npm run tiktok:connect` (mira el README).
- Límite de TikTok: 5 borradores pendientes cada 24 h por cuenta, compartido con CirculArte.

## Lo que ya se aprendió
- **Borrador** (inbox): la API no acepta título ni `is_aigc`. El usuario activa «Contenido generado por IA» en la app y pega la descripción del `.json` de cada parte.
- **Publicación directa**: con una app sin auditar, TikTok solo la permite si la **cuenta** es privada (`unaudited_client_can_only_post_to_private_accounts`). Ya pasó con @potter.play pública.
- A veces el borrador no aparece en la bandeja aunque la API diga `SEND_TO_USER_INBOX`, sobre todo con dos subidas seguidas. Volver a subir el mismo archivo no lo arregló. Una copia con otros metadatos (`ffmpeg -c copy -metadata …`, sin recodificar) se subió como `…-parte-4-v2.mp4`.
- El filtro de imágenes de OpenAI rechaza a veces escenas inocentes (un abrazo marcado como «sexual»). `images.mjs` reintenta y luego reescribe el momento con `gpt-6-luna`.
- El ritmo real de la voz es de unos 0,46 s por palabra con pausas (250 palabras dan 116 s). El guion apunta a entre 170 y 235 palabras. Si un episodio pasa de 120 s: `node scripts/script.mjs --ep N --tighten`, luego `voice` y `assemble` (las imágenes se conservan).
- Whisper sobre el episodio completo se equivoca hasta 0,5 s después de las pausas. La sincronía real se mide con el inicio acústico de cada línea (`review`, campo `onset`).
- Las referencias (retrato de cada personaje pasado a `images.edit`) mantienen a los personajes muy parecidos entre escenas. Cada imagen cuesta $0.024 a $0.049 con referencias, ≈ $0.011 sin ellas.

## Estado de la serie 1: «La última función» (amor y traición, es)
Guion en `series/la-ultima-funcion/series.json`. En `out/la-ultima-funcion/` están subidos los retratos, las imágenes, la voz por línea y el `.json` de cada parte (descripción e historial de TikTok). Los MP4 no se suben: se rehacen con `node scripts/assemble.mjs --ep all --music none`.

| Parte | Duración | TikTok (2026-10-20) |
|---|---|---|
| 1 | 116 s | publicada |
| 2 | 115 s | publicada |
| 3 | 103 s | publicada |
| 4 | 119 s | 3 borradores en la bandeja (dos del archivo original y uno `-v2`); el usuario no los veía. Descartar los que sobren |
| 5 | 114 s | borrador en la bandeja, sin publicar |

Cada parte ya pasó la revisión (zona segura OK, subtítulos de 2 a 4 palabras, cada línea a ≤115 ms de su sonido). Costo total del piloto ≈ $2.

## Pendiente o ideas
- La parte 5 cierra con «Parte 6 en mi perfil», que todavía no existe: hay que escribir una temporada 2 o cambiar la línea final.
- No hay música (la carpeta `assets/music/` está vacía). Hay que poner pistas con licencia.
- Cuando TikTok audite la app: publicar directo con `--mode direct` (marca `is_aigc` sola). Las credenciales de Production se cambian en `.env`.
- Para ver el estado de cada subida en TikTok no hay comando todavía: usa `api('/v2/post/publish/status/fetch/', { publish_id }, token)` de `scripts/lib/tiktok.mjs` con los `publish_id` de `data/tiktok-log.json` o del `.json` de cada parte.
