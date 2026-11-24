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

## Serie 2: «La boda del Plátano» (formato Veo, frutas, rama `feat/frutas-boda-platano`)
Clips de video con diálogo hechos a mano en el navegador, sin API: **ChatGPT** hace el primer cuadro de cada clip y **Gemini → Crear vídeo** (Veo, vertical 9:16, unos 10 s) lo anima con el diálogo. Guion y prompts en `series/la-boda-del-platano/veo.json` (`node scripts/veo-prompts.mjs --ep N`). Montaje: `node scripts/veo-assemble.mjs --ep N` (Whisper para los tiempos de los subtítulos, unos $0.006/min).
- El usuario genera los clips a mano en su navegador para no gastar tokens. La guía con todos los prompts, paso a paso, está en `series/la-boda-del-platano/GUIA.md` (`node scripts/veo-prompts.mjs --ep 2-5 --md series/la-boda-del-platano/GUIA.md`). Lo que descarga lo mueve a su lugar con `node scripts/veo-import.mjs --ep N --clip cNN --video|--frame`.
- Hoja de personajes: `out/la-boda-del-platano/characters/sheet.png`. Los cuadros salen de una sola conversación de ChatGPT que ya tiene la hoja: https://chatgpt.com/c/6ad7f046-9fec-83e8-b1b0-4f5aea85a997
- Cuadros: hechos 1-02 a 1-06, 2-01 a 2-06 y 3-01 (`epNN/frames/`). En la conversación de ChatGPT quedó generado también el 3-02, sin guardar todavía.
- Clips: **partes 1 y 2 completas**. Parte 2: 2-01 a 2-04 de Gemini, 2-05 y 2-06 de Flow con Quality. En el 2-06 Veo metió una frase sin sentido en medio; los subtítulos la saltan, pero se oye. Faltan las partes 3 a 5.
- TikTok: parte 1 (58,5 s, publicada por el usuario) y parte 2 (58,6 s, borrador del 2026-10-21) en @potter.play (`publish_id` en el `.json` de cada parte). En esta PC el token está en `data/tiktok-token.json` (el `.env` tiene `TIKTOK_TOKEN_FILE` vacío).
- Cómo pasar archivos: los botones de descarga a veces no bajan nada al primer intento (hay que esperar 10 a 15 s). Para las imágenes sirve «Copy image» en ChatGPT, guardar desde el portapapeles y pegar con Ctrl+V en Gemini (la primera vez Gemini pide permiso del portapapeles).
- **Límite de Gemini Pro: unos 5 videos por día.** Después «Crear vídeo» queda desactivado.
- **Google Flow** (flow.google.com, proyecto «oct 20 - 17:14»), solo cuando Gemini se queda sin cupo. Veo 3.1 **Fast** (20 puntos, 8 s) se salió del diseño: puso un cura humano y le dio cara de persona a Piña, y se comió una línea (esos clips están en `ep01/clips/descartados-flow/`). Veo 3.1 **Quality** (100 puntos por clip) sí funciona con un prompt largo: «every character is an anthropomorphic FRUIT, NO humans», cada personaje descrito de nuevo y el diálogo repartido por segundos («0-4 s: … 4-8 s: …»). Hay que pedirle Quality al agente en el mensaje, porque si no usa Fast. Al 2026-10-20 quedan unos 610 puntos de 1.050. A veces falla sin cobrar; un prompt más corto y simple funcionó. **Nunca uses Ctrl+A ni Supr en Flow:** seleccionan todos los elementos del proyecto y los mandan a la papelera (pasó una vez y se deshizo).
- Gemini permite 2 o 3 videos a la vez en pestañas distintas (la preparación con JavaScript sí funciona: Herramientas → Crear vídeo → Vertical); a veces responde «demasiadas solicitudes» y se arregla con «Rehacer».
- Veo a veces mete palabras de relleno. `veo-assemble` alinea las palabras del guion con lo que oye Whisper y deja fuera el relleno; los subtítulos van por línea de diálogo.

## Historias 2D (generador, rama `feat/historias-2d`)
Formato de historias narradas con personajes animados, fondos que cambian, subtítulos palabra por palabra y filtro de «cómo lo ve…» (daltonismo, miopía, túnel). Se escribe **un JSON** en `historias/<slug>.json` y `node scripts/historia.mjs historias/<slug>.json` lo valida, estima duración y costo y lo compila a `series/<slug>/series.json`. Guía completa en [historias/README.md](historias/README.md).
- `--prueba`: vista previa **gratis** (figuras de relleno y voz en silencio, PNG de los segundos que pidas con `--cuadros`). `--hacer`: genera retratos, recursos, voz y video (**gasta API**: muestra el costo y confirma antes).
- Motor: `scripts/animate.mjs` lee `series.anim.escenas` (escenas declarativas, sin código por serie); el filtro está en `scripts/lib/pov.mjs`; los estilos visuales en `scripts/lib/estilos.mjs`.
- Piloto: `historias/mateo-daltonico.json` («Mateo y el equipo rojo contra el verde», ≈ 89 s, costo estimado ≈ $0,70). Aún sin generar: falta el OK del usuario para gastar.

## Pendiente o ideas
- La parte 5 cierra con «Parte 6 en mi perfil», que todavía no existe: hay que escribir una temporada 2 o cambiar la línea final.
- No hay música (la carpeta `assets/music/` está vacía). Hay que poner pistas con licencia.
- Cuando TikTok audite la app: publicar directo con `--mode direct` (marca `is_aigc` sola). Las credenciales de Production se cambian en `.env`.
- Para ver el estado de cada subida en TikTok no hay comando todavía: usa `api('/v2/post/publish/status/fetch/', { publish_id }, token)` de `scripts/lib/tiktok.mjs` con los `publish_id` de `data/tiktok-log.json` o del `.json` de cada parte.
