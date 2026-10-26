# CirculArte

Dibuja lo que quieras con círculos que giran. Sube una imagen, escribe un texto o inventa una función, y mira cómo una serie de Fourier la traza sola. Cada reproducción se graba como video listo para TikTok, Reels o Facebook.

![CirculArte](og.jpg)

Dos cadenas de círculos (una para `x(t)`, otra para `y(t)`) trazan la figura mientras el número de términos sube (N = 1, 3, 6 … 200) y el error baja. Al final queda solo la imagen, con las fórmulas de la serie.

## Uso

Es un sitio estático, sin build: `index.html` más el motor en `src/engine.js` (un módulo ES). Sírvelo con cualquier servidor estático, por ejemplo `npx serve .`, y ábrelo en Chrome o Edge. Por ser un módulo, abrir `index.html` con doble clic (`file://`) ya no funciona. En Vercel se publica tal cual, sin build: `vercel.json` instala solo las dependencias de las funciones de `api/` (`@vercel/blob`); las del render (canvas, ffmpeg, fuentes, OpenAI) son `devDependencies` y Vercel las omite. Sin las variables de entorno de TikTok, el sitio funciona igual y simplemente no muestra el botón «Publicar en TikTok».

- **Funciones**: figuras listas en cuatro grupos: Amor (corazón, LOVE, amor, te amo), Animales (elefante, pulpo, dragón, araña, escorpión, jirafa…), Cosas (guitarra, rueda de la fortuna, bicicleta, Estatua de la Libertad…) y Matemáticas (copo de Koch, π, espirógrafo, rosas…). **🎲 Figura compleja al azar** elige entre las que tienen más detalle o inventa una curva compleja, lo mismo que la publicación automática.
- **Modo suspenso** (en Animación): la figura no se ve hasta el final. Apaga la imagen de guía, deja solo textos de arriba que no dicen qué es, y al publicar en TikTok propone una descripción que invita a adivinar y usa de portada un cuadro a mitad del dibujo. **Máximo detalle** sube los términos hasta N = 500.
- **Pelotas**: pelotas que rebotan dentro de un círculo, con una nota en cada rebote (sintetizada aquí, sin música con derechos). Cuatro variantes: *Crece* (una pelota que se agranda con cada rebote hasta llenar el círculo), *Se multiplica* (cada rebote suelta otra pelota), *Escapar* (el círculo gira con un hueco y cada pelota que sale suelta dos más) y *Líneas* (cada rebote deja una línea de colores hasta el centro y se va formando un dibujo). No muestra contadores: arriba va una pregunta («¿Cuántas logran escapar?») y abajo una invitación a comentar («Escribe tu apuesta antes del final 👇»), elegidas al azar entre varias. «🎲 Nueva corrida» genera otra; la grabación incluye el sonido.
- **Juegos de física** (en la misma pestaña): *Embudos* (caja con niveles en V; cada pelota que sale por abajo suelta varias más), *Anillos* (círculos uno dentro de otro que giran con un hueco; la pelota tiene que escapar de todos), *Plinko* (pelotas que caen entre clavos y se apilan en casillas) *Carrera* (pelotas de colores bajan por rampas y clavos; al final se anuncia la ganadora), *Países* (la misma carrera con banderas; Honduras corre en la mitad), *Muros* (anillos partidos en pedazos que se agrietan con cada choque hasta que la pelota se abre paso) y *Batalla* (dos pelotas con armas que giran, con barras de vida; gana la que deja a la otra en cero). También con una nota en cada choque.
- **Melodías**: 7 de cada 10 corridas tocan, nota por choque, una melodía conocida de dominio público (*Para Elisa*, *Himno a la alegría*, *Estrellita*, *Canon de Pachelbel*, *Canción de cuna de Brahms*, *La cucaracha*); en algunas el texto de arriba pregunta «¿Reconoces la canción?». En Node: `node scripts/bounce.mjs --mode batalla --melody alegria` (o `--melody none`).
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
| `npm run caption -- --meta out/<video>.json` | Escribe la descripción y los hashtags del post con plantillas propias (`--no-spoiler` para no nombrar la figura) |
| `npm run daily -- --lang es` | Encadena pick → render → caption en modo suspenso y deja el texto del post en el `.json` del video; con `--publish direct` (público por defecto) o `draft` también lo sube a TikTok |
| `npm run tiktok:connect` | Conecta tu cuenta de TikTok (una vez; `-- --status` muestra la cuenta y cuándo vence) |
| `npm run publish -- --video out/<video>.mp4 --mode draft` | Sube el video a TikTok como borrador (`--mode direct --privacy PUBLIC_TO_EVERYONE` lo publica) |

Opciones de `render` (`npm run render -- --help` las lista todas):

- Qué dibujar: `--preset <nombre>` (cualquier preset de la web, en español o inglés: `Corazón`, `Heart`, `Violín`…), `--random <tipo>` (`any`, `fourier`, `polar`, `rosa`, `spiro`, `lissa`, `super`, `simetria`) con `--seed <n>` para repetirla, o `--text <texto>` con `--font cursiva|elegante|bloque|clasica|emoji`.
- Cómo se ve: `--labels full|n|top`, `--style xy|z`, `--fps 30|60`, `--format 9:16|1:1|16:9`, `--quality 1080|720`, `--rev`, `--nseq`, `--accent`, `--guide 0-60` (opacidad de la figura de guía mientras dibuja; `0` = no se ve hasta el final), `--no-reveal`, `--no-formulas`, `--signature` (la firma CirculArte + edav-tech.com va apagada por defecto: las guías de TikTok no aceptan marcas, logos ni enlaces dentro del video).
- Texto gancho de arriba: `--caption auto` (por defecto, elige uno de los de la web según `--lang`; con `--no-spoiler`, solo los que no nombran la figura), `--caption none` o `--caption "tu texto"`.
- `--lang es|en` cambia el texto gancho y el nombre del archivo. `--out` cambia la ruta. `--still <segundos>` guarda un PNG de ese instante en lugar del video, útil para revisar el encuadre.

Junto a cada MP4 queda un `.json` con la figura, la semilla, la duración y el texto gancho; `caption` agrega ahí el texto del post y `publish` lo usa como descripción y anota el resultado de cada subida.

**Emoji.** Los presets de animales y cosas son siluetas de emoji, así que el render necesita una fuente de emoji a color. `npm run fonts` descarga Noto Color Emoji desde google/fonts (licencia OFL; no se sube al repo) y con ella el resultado es idéntico en Windows, macOS y Linux. Sin ella se usa la del sistema (Segoe UI Emoji en Windows, Apple Color Emoji en macOS); en un Linux sin fuentes de emoji esos presets fallan con un aviso y `pick` los salta. También puedes apuntar a otra fuente con `CIRCULARTE_EMOJI_FONT=/ruta/fuente.ttf`.

**Descripciones.** `caption` arma la descripción y los hashtags con plantillas propias, sin IA ni APIs de pago: la misma figura y semilla dan siempre el mismo texto. Con `--no-spoiler` no dice qué figura es (invita a adivinar en los comentarios).

**Sin IA.** Todo el video sale del proyecto: las figuras son fórmulas, texto o siluetas de emoji de la fuente Noto Color Emoji, y el dibujo es la serie de Fourier calculada aquí. Por eso las publicaciones no llevan la etiqueta de contenido generado por IA.

## Publicar en TikTok

Usa solo la API oficial de TikTok (Login Kit + Content Posting API); nada de bots ni scraping. Necesitas en `.env` las credenciales de la app (`TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `TIKTOK_REDIRECT_URI`) con los permisos `user.info.basic`, `video.upload` y `video.publish`. En el sandbox, tu cuenta tiene que estar agregada como *Target User*.

1. `npm run tiktok:connect` imprime la URL de autorización. Ábrela, autoriza, y la página `tiktok-callback.html` te muestra un código y un *state*: pégalos en la terminal. Los tokens quedan en `data/tiktok-token.json` (en `.gitignore`); el de acceso dura 24 h y se renueva solo con el de refresco, que dura 365 días.
2. `npm run publish -- --video out/<video>.mp4 --mode draft` lo manda a tu bandeja de TikTok como borrador: abres la notificación en la app, pegas la descripción que imprime el script y publicas.
3. `--mode direct` lo publica directo con la descripción del `.json` y la privacidad de `--privacy` (`SELF_ONLY` por defecto; `PUBLIC_TO_EVERYONE` para público). La app está aprobada en Production desde el 23-10-2026, así que ya admite público.

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

La app ya pasó la revisión (Production en vivo desde el 23-10-2026). Antes, sin auditoría, todo lo que se publicaba por la API quedaba privado («Solo yo»), la cuenta tenía que ser privada y como mucho 5 usuarios distintos podían publicar cada día. La revisión se pidió en el portal de TikTok Developers (app *Circularte* → *Production* → enviar a revisión con Login Kit y Content Posting API con *Direct Post*), con un video que muestre el flujo completo en la web: grabar un video, «Publicar en TikTok», conectar la cuenta, elegir la privacidad y publicar. Ojo: TikTok aprueba esta API para apps abiertas al público, no para herramientas que solo suben a las cuentas propias; por eso la publicación directa vive en la web, donde cualquiera publica sus propios videos.

## Publicación diaria (GitHub Actions)

`.github/workflows/daily.yml` genera un video **cada 4 horas** (en Honduras: 18:17, 22:17, 2:17, 6:17, 10:17 y 14:17; GitHub puede atrasar las corridas programadas varias horas) y lo manda a tu bandeja de TikTok como **borrador**; la descripción con hashtags queda en el resumen de la corrida (*Actions* → la corrida → *Summary*) para copiarla y pegarla en la app. Va en **modo suspenso**: elige solo figuras complejas (sin los presets marcados `simple`), no muestra la figura de guía mientras dibuja, ni el texto gancho ni la descripción dicen qué es, y la portada es un cuadro a mitad del dibujo. La figura completa aparece solo al final. TikTok admite como mucho 5 borradores pendientes cada 24 horas por cuenta: publica los que lleguen o el sexto del día fallará.


**Dos workflows.** `daily.yml` hace los dibujos (figuras, nombres, parejas, inventadas) cada 4 horas al minuto 17; `fisica.yml` hace los videos de física (las 3 variantes de pelotas y los 4 juegos) cada 4 horas al minuto 47, intercalado. `fisica.yml` reutiliza `daily.yml` (con `cats: fisica`), así que comparten token, historial y nunca corren a la vez. Juntos mandan 12 borradores al día: cuando TikTok ya tiene 5 pendientes, la corrida no falla, solo avisa y deja el video como artefacto para descargarlo.

**Aviso por WhatsApp** (opcional, gratis con [CallMeBot](https://www.callmebot.com/blog/free-api-whatsapp-messages/)): al terminar cada corrida manda un mensaje con el estado, la figura, la descripción para pegar y el enlace. Para activarlo: sigue los pasos de esa página (agregar su número de WhatsApp, que aparece ahí, y mandarle «I allow callmebot to send me messages»), y guarda en GitHub los secretos `CALLMEBOT_PHONE` (tu número con código de país, por ejemplo +504…) y `CALLMEBOT_APIKEY` (la clave que te responde). Sin esos secretos el paso se salta. Por **correo**: GitHub → Settings → Notifications → Actions, desmarca «Only notify for failed workflows».
**Biblioteca** ([data/biblioteca.json](data/biblioteca.json)): de ahí elige la publicación automática, además de los presets sin emoji y las curvas inventadas. Tiene **500 nombres** y **100 parejas** («Ana & Luis», escritas apiladas en tres líneas) en letra cursiva, y **100 figuras** de emoji revisadas una por una para que la silueta se reconozca. El reparto es 32 % figuras, 20 % nombres, 12 % parejas, 16 % curvas inventadas y 20 % pelotas que rebotan (`SHARES` en `scripts/pick.mjs`; las pelotas se hacen con `scripts/bounce.mjs`, con sonido), y no repite nada de las últimas 60 corridas (unos 10 días). Para agregar más, edita el JSON; los nombres deben usar solo letras del alfabeto latino (con tildes y ñ), porque la letra cursiva no trae otros símbolos.

Va en borrador porque publicar directo necesita la auditoría de Direct Post de TikTok (aparte de la revisión de la app); sin ella da `403 unaudited_client_can_only_post_to_private_accounts`. Cómo pedirla: [docs/AUDITORIA-DIRECT-POST.md](docs/AUDITORIA-DIRECT-POST.md). Cuando la aprueben, se puede pasar a directo cambiando `draft` por `direct` en `daily.yml` (y elegir la privacidad). Ojo: las reglas de TikTok para desarrolladores no aceptan herramientas que suben contenido a las propias cuentas, y TikTok podría quitarle el permiso a la app (con eso dejaría de funcionar también la web).

También se puede lanzar a mano desde *Actions* → *Video diario a TikTok* → *Run workflow* (eliges idioma, `direct`/`draft`/`none` y la privacidad), y cada corrida deja el video como artefacto durante 7 días. En local: `npm run daily -- --publish direct` (o `--spoiler` para el modo anterior, con guía y nombre).

Secretos del repositorio (*Settings* → *Secrets and variables* → *Actions*):

| Secreto | Valor |
|---|---|
| `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `TIKTOK_REDIRECT_URI` | Los mismos de tu `.env` |
| `TIKTOK_TOKEN_SEED` | El contenido completo de `data/tiktok-token.json` después de `npm run tiktok:connect` (solo se usa en la primera corrida) |
| `STATE_KEY` | Una cadena aleatoria larga: cifra el token y el historial que el flujo guarda en la caché de Actions entre corridas |

Para cargarlos sin copiarlos a mano: `powershell -ExecutionPolicy Bypass -File scripts/secrets-to-clipboard.ps1` pone cada valor en el portapapeles (de `.env` y del token), tú lo pegas en GitHub y en la terminal solo presionas Enter.

El token se renueva solo y el nuevo se guarda cifrado en la caché. Si el flujo deja de correr más de 7 días, GitHub borra la caché: vuelve a conectar con `npm run tiktok:connect` y actualiza `TIKTOK_TOKEN_SEED`.

**PowerShell.** Windows PowerShell 5.1 se come el `--` de `npm run render -- --preset …`. Usa `npm.cmd run render -- …` o directamente `node scripts/render.mjs --preset …`.

## Créditos

Creado por **Erick Alvarado**, Senior Full Stack Dev · Tech Lead.

- Sitio: [edav-tech.com](https://edav-tech.com/)
- ¿Quieres una app a la medida? [Iniciar un proyecto](https://www.edav-tech.com/start-project)
- [GitHub](https://github.com/elporter17) · [LinkedIn](https://www.linkedin.com/in/edav/)
