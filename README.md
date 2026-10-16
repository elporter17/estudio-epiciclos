# CirculArte

Dibuja lo que quieras con círculos que giran. Sube una imagen, escribe un texto o inventa una función, y mira cómo una serie de Fourier la traza sola. Cada reproducción se graba como video listo para TikTok, Reels o Facebook.

![CirculArte](og.jpg)

Dos cadenas de círculos (una para `x(t)`, otra para `y(t)`) trazan la figura mientras el número de términos sube (N = 1, 3, 6 … 200) y el error baja. Al final queda solo la imagen, con las fórmulas de la serie.

## Uso

Es un sitio estático, sin build: `index.html` más el motor en `src/engine.js` (un módulo ES). Sírvelo con cualquier servidor estático, por ejemplo `npx serve .`, y ábrelo en Chrome o Edge. Por ser un módulo, abrir `index.html` con doble clic (`file://`) ya no funciona. En Vercel se publica tal cual, sin build: `vercel.json` instala solo las dependencias de las funciones de `api/` (`@vercel/blob`); las del render (canvas, ffmpeg, fuentes, OpenAI) son `devDependencies` y Vercel las omite. Sin las variables de entorno de TikTok, el sitio funciona igual y simplemente no muestra el botón «Publicar en TikTok».

- **Funciones**: figuras listas en cuatro grupos: Amor (corazón, LOVE, amor, te amo), Animales (elefante, pulpo, T-Rex, flamenco…), Cosas (guitarra, violín, cohete…) y Matemáticas (copo de Koch, π, espirógrafo, rosas…).
- **Imagen**: elige, arrastra o pega (Ctrl+V) una imagen. Modo *Silueta* para logos, *Bordes* para fotos.
- **Texto**: cualquier palabra, símbolo o emoji. Los emoji se vuelven silueta plana.
- **Inventar**: genera funciones aleatorias, edítalas (`16 sin(t)^3`), mútalas y guarda tus favoritas.
- **Videos**: con «Grabar video» marcado, cada reproducción queda en *Mis videos* lista para guardar (MP4 o WebM según el navegador). Formatos 9:16, 1:1 y 16:9 en 720p o 1080p, con texto gancho arriba, rótulos a elegir y firma opcional.

Mantén la pestaña visible mientras graba; si queda oculta, el video sale entrecortado.

## Cómo funciona

1. La imagen se convierte en una máscara y se extraen sus contornos con *marching squares*.
2. Los contornos se unen en un solo recorrido cerrado y se remuestrean a 2048 puntos por longitud de arco.
3. Se calcula la serie de Fourier de `x(t)` y `y(t)` (hasta 500 términos). El error mostrado es la energía que falta según Parseval.
4. Cada término es un círculo de radio `√(a_k² + b_k²)` que gira a velocidad `k`.
5. El lienzo se graba con `MediaRecorder`. Las visitas se miden con Vercel Web Analytics.

## Videos automáticos (Node)

Los mismos videos que graba la web, pero renderizados en Node cuadro por cuadro, sin navegador: mismo motor (`src/engine.js`), mismas fuentes y mismo resultado en cada ejecución. Pensado para publicar en TikTok de forma automática.

Requisitos: Node 20 o más reciente. `ffmpeg` viene incluido (`ffmpeg-static`).

```bash
npm install
npm run fonts                                   # una vez: descarga Noto Color Emoji (25 MB) a assets/fonts/
npm run render -- --preset Violín --lang en     # → out/circularte-violin-en.mp4 + .json
```

| Script | Qué hace |
|---|---|
| `npm run render -- …` | Renderiza un MP4 H.264 (High, yuv420p, 1080×1920, 30 fps, pista de audio AAC en silencio) |
| `npm run pick` | Elige la próxima figura evitando las 12 más recientes y sin repetir grupo seguido; la anota en `data/history.json` (`--dry-run` para no anotar) |
| `npm run caption -- --meta out/<video>.json` | Escribe la descripción y los hashtags del post con OpenAI (`gpt-6-luna`) |
| `npm run daily -- --lang es` | Encadena pick → render → caption y deja el texto del post en el `.json` del video; con `--publish draft` (o `direct`) también lo sube a TikTok |
| `npm run tiktok:connect` | Conecta tu cuenta de TikTok (una vez; `-- --status` muestra la cuenta y cuándo vence) |
| `npm run publish -- --video out/<video>.mp4 --mode draft` | Sube el video a TikTok como borrador (`--mode direct` lo publica, privado) |

Opciones de `render` (`npm run render -- --help` las lista todas):

- Qué dibujar: `--preset <nombre>` (cualquier preset de la web, en español o inglés: `Corazón`, `Heart`, `Violín`…), `--random <tipo>` (`any`, `fourier`, `polar`, `rosa`, `spiro`, `lissa`, `super`) con `--seed <n>` para repetirla, o `--text <texto>` con `--font cursiva|elegante|bloque|clasica|emoji`.
- Cómo se ve: `--labels full|n|top`, `--style xy|z`, `--fps 30|60`, `--format 9:16|1:1|16:9`, `--quality 1080|720`, `--rev`, `--nseq`, `--accent`, `--no-reveal`, `--no-formulas`, `--no-signature`.
- Texto gancho de arriba: `--caption auto` (por defecto, elige uno de los de la web según `--lang`), `--caption none` o `--caption "tu texto"`.
- `--lang es|en` cambia el texto gancho y el nombre del archivo. `--out` cambia la ruta. `--still <segundos>` guarda un PNG de ese instante en lugar del video, útil para revisar el encuadre.

Junto a cada MP4 queda un `.json` con la figura, la semilla, la duración y el texto gancho; `caption` agrega ahí el texto del post y `publish` lo usa como descripción y anota el resultado de cada subida.

**Emoji.** Los presets de animales y cosas son siluetas de emoji, así que el render necesita una fuente de emoji a color. `npm run fonts` descarga Noto Color Emoji desde google/fonts (licencia OFL; no se sube al repo) y con ella el resultado es idéntico en Windows, macOS y Linux. Sin ella se usa la del sistema (Segoe UI Emoji en Windows, Apple Color Emoji en macOS); en un Linux sin fuentes de emoji esos presets fallan con un aviso y `pick` los salta. También puedes apuntar a otra fuente con `CIRCULARTE_EMOJI_FONT=/ruta/fuente.ttf`.

**Descripciones con OpenAI.** `caption` lee la clave de `OPEN_AI` (o `OPENAI_API_KEY`), del entorno o de un `.env` en la raíz (copia `.env.example`; `.env` está en `.gitignore` y nunca se sube). Usa la Responses API con salida JSON estructurada y el modelo `gpt-6-luna`, el que la guía de modelos de OpenAI recomienda para tareas acotadas y de alto volumen; cámbialo con `CIRCULARTE_CAPTION_MODEL` (por ejemplo `gpt-6-astra`). Si no hay clave o la API falla, usa una plantilla local y lo avisa, para que el flujo no se detenga (`--no-fallback` para que falle en su lugar).

## Publicar en TikTok

Usa solo la API oficial de TikTok (Login Kit + Content Posting API); nada de bots ni scraping. Necesitas en `.env` las credenciales de la app (`TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `TIKTOK_REDIRECT_URI`) con los permisos `user.info.basic`, `video.upload` y `video.publish`. En el sandbox, tu cuenta tiene que estar agregada como *Target User*.

1. `npm run tiktok:connect` imprime la URL de autorización. Ábrela, autoriza, y la página `tiktok-callback.html` te muestra un código y un *state*: pégalos en la terminal. Los tokens quedan en `data/tiktok-token.json` (en `.gitignore`); el de acceso dura 24 h y se renueva solo con el de refresco, que dura 365 días.
2. `npm run publish -- --video out/<video>.mp4 --mode draft` lo manda a tu bandeja de TikTok como borrador: abres la notificación en la app, pegas la descripción que imprime el script y publicas.
3. `--mode direct` lo publica directo con la descripción del `.json`. Mientras la app no pase la auditoría de TikTok, todo lo publicado por la API queda privado (`SELF_ONLY`, solo tú lo ves) y la cuenta debe ser privada.

Límites de la API que respeta el script: video de hasta 4 GB, subido en trozos de 5 a 64 MB (uno solo si pesa hasta 64 MB); el enlace de subida dura una hora; 6 inicios de subida por minuto; 30 consultas de estado por minuto; como mucho 5 borradores pendientes cada 24 horas. TikTok acepta MP4/MOV/WebM, H.264, de 23 a 60 fps.

## Publicar desde la web (producción)

Cada video de «Mis videos» tiene un botón **Publicar en TikTok** que publica directo, en un paso, en la cuenta que el visitante conecte. La pantalla cumple las [Content Sharing Guidelines](https://developers.tiktok.com/doc/content-sharing-guidelines) de TikTok, que se revisan en la auditoría: muestra la cuenta, una vista previa, la descripción editable, la privacidad elegida a mano y sin valor por defecto, las interacciones apagadas por defecto (y bloqueadas si la cuenta las desactivó), la divulgación de contenido comercial con sus etiquetas y la declaración de consentimiento.

Cómo funciona: la conexión con TikTok se abre en una ventana emergente (así no se pierden los videos grabados), `tiktok-callback.html` canjea el código en `/api/tiktok-session` y la sesión queda en una cookie cifrada, sin base de datos. El navegador no puede subir a TikTok directamente (su servidor de subida no admite CORS), así que sube el video a **Vercel Blob**, TikTok lo descarga desde `https://circularte.edav-tech.com/media/…` (`PULL_FROM_URL`, dominio verificado) y la copia se borra al terminar o a las 24 horas.

| Función | Para qué |
|---|---|
| `api/tiktok-config` | Si la publicación está configurada y hay cuenta conectada |
| `api/tiktok-login`, `api/tiktok-session`, `api/tiktok-logout` | Conectar (OAuth con *state*) y desconectar (revoca el token) |
| `api/tiktok-creator` | Nickname, privacidad permitida, interacciones y duración máxima |
| `api/tiktok-upload` | Token de subida directa a Blob (solo con sesión; solo videos, máx. 300 MB) |
| `api/tiktok-publish`, `api/tiktok-status` | Publicar (revalida todo contra `creator_info`) y consultar el estado |

### Configurar en Vercel (una vez)

1. **Almacén Blob:** en el proyecto de Vercel → *Storage* → *Create* → *Blob*, con acceso **Public**, conectado a *Production* (y *Preview* si quieres probar ahí). Esto crea `BLOB_READ_WRITE_TOKEN`.
2. **Proxy de `/media`:** en `vercel.json`, reemplaza `BLOB_STORE_HOST` por el identificador de tu almacén: es la primera parte del dominio de cualquier archivo subido (`<identificador>.public.blob.vercel-storage.com`).
3. **Variables de entorno** (*Settings* → *Environment Variables*, en *Production*):
   - `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`: las credenciales de la app (sandbox para probar, producción cuando la aprueben).
   - `TIKTOK_REDIRECT_URI`: `https://circularte.edav-tech.com/tiktok-callback.html`
   - `SESSION_SECRET`: una cadena aleatoria larga para cifrar las cookies, por ejemplo la salida de `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`.
   - Opcional: `PUBLIC_MEDIA_BASE` si el sitio vive en otro dominio (por defecto `https://circularte.edav-tech.com/media/`).
4. **TikTok Developers:** en la app, el dominio `circularte.edav-tech.com` tiene que estar verificado como *URL property* (para `PULL_FROM_URL`) y el redirect URI registrado en Login Kit.

### Auditoría de TikTok

Sin auditoría, todo lo que se publica por la API queda privado («Solo yo») y la cuenta tiene que ser privada; además, como mucho 5 usuarios distintos pueden publicar cada día. Para publicar en público hay que pedir la auditoría en el portal de TikTok Developers (app *Circularte* → *Production* → enviar a revisión con Login Kit y Content Posting API con *Direct Post*), con un video que muestre el flujo completo en la web: grabar un video, «Publicar en TikTok», conectar la cuenta, elegir la privacidad y publicar. Ojo: TikTok aprueba esta API para apps abiertas al público, no para herramientas que solo suben a las cuentas propias; por eso la publicación directa vive en la web, donde cualquiera publica sus propios videos.

## Publicación diaria (GitHub Actions)

`.github/workflows/daily.yml` genera un video cada día a las 10:00 (Honduras) y lo manda a tu bandeja de TikTok como **borrador**: abres la notificación en la app y publicas. Las reglas de TikTok no permiten la publicación directa automática, así que este flujo no la usa. También se puede lanzar a mano desde *Actions* → *Video diario a TikTok* → *Run workflow*, y cada corrida deja el video como artefacto durante 7 días.

Secretos del repositorio (*Settings* → *Secrets and variables* → *Actions*):

| Secreto | Valor |
|---|---|
| `OPEN_AI` | La clave de OpenAI |
| `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `TIKTOK_REDIRECT_URI` | Los mismos de tu `.env` |
| `TIKTOK_TOKEN_SEED` | El contenido completo de `data/tiktok-token.json` después de `npm run tiktok:connect` (solo se usa en la primera corrida) |
| `STATE_KEY` | Una cadena aleatoria larga: cifra el token y el historial que el flujo guarda en la caché de Actions entre corridas |

El token se renueva solo y el nuevo se guarda cifrado en la caché. Si el flujo deja de correr más de 7 días, GitHub borra la caché: vuelve a conectar con `npm run tiktok:connect` y actualiza `TIKTOK_TOKEN_SEED`.

**PowerShell.** Windows PowerShell 5.1 se come el `--` de `npm run render -- --preset …`. Usa `npm.cmd run render -- …` o directamente `node scripts/render.mjs --preset …`.

## Créditos

Creado por **Erick Alvarado**, Senior Full Stack Dev · Tech Lead.

- Sitio: [edav-tech.com](https://edav-tech.com/)
- ¿Quieres una app a la medida? [Iniciar un proyecto](https://www.edav-tech.com/start-project)
- [GitHub](https://github.com/elporter17) · [LinkedIn](https://www.linkedin.com/in/edav/)
