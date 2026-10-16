# CirculArte

Dibuja lo que quieras con círculos que giran. Sube una imagen, escribe un texto o inventa una función, y mira cómo una serie de Fourier la traza sola. Cada reproducción se graba como video listo para TikTok, Reels o Facebook.

![CirculArte](og.jpg)

Dos cadenas de círculos (una para `x(t)`, otra para `y(t)`) trazan la figura mientras el número de términos sube (N = 1, 3, 6 … 200) y el error baja. Al final queda solo la imagen, con las fórmulas de la serie.

## Uso

Es un sitio estático, sin build: `index.html` más el motor en `src/engine.js` (un módulo ES). Sírvelo con cualquier servidor estático, por ejemplo `npx serve .`, y ábrelo en Chrome o Edge. Por ser un módulo, abrir `index.html` con doble clic (`file://`) ya no funciona. En Vercel se publica tal cual; `vercel.json` evita que instale las dependencias de Node, que solo usan los scripts de render.

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
| `npm run caption -- --meta out/<video>.json` | Escribe la descripción y los hashtags del post con Claude (`claude-sonnet-5-5`) |
| `npm run daily -- --lang es` | Encadena pick → render → caption y deja el texto del post en el `.json` del video |

Opciones de `render` (`npm run render -- --help` las lista todas):

- Qué dibujar: `--preset <nombre>` (cualquier preset de la web, en español o inglés: `Corazón`, `Heart`, `Violín`…), `--random <tipo>` (`any`, `fourier`, `polar`, `rosa`, `spiro`, `lissa`, `super`) con `--seed <n>` para repetirla, o `--text <texto>` con `--font cursiva|elegante|bloque|clasica|emoji`.
- Cómo se ve: `--labels full|n|top`, `--style xy|z`, `--fps 30|60`, `--format 9:16|1:1|16:9`, `--quality 1080|720`, `--rev`, `--nseq`, `--accent`, `--no-reveal`, `--no-formulas`, `--no-signature`.
- Texto gancho de arriba: `--caption auto` (por defecto, elige uno de los de la web según `--lang`), `--caption none` o `--caption "tu texto"`.
- `--lang es|en` cambia el texto gancho y el nombre del archivo. `--out` cambia la ruta. `--still <segundos>` guarda un PNG de ese instante en lugar del video, útil para revisar el encuadre.

Junto a cada MP4 queda un `.json` con la figura, la semilla, la duración y el texto gancho; `caption` y la fase de publicación lo leen de ahí.

**Emoji.** Los presets de animales y cosas son siluetas de emoji, así que el render necesita una fuente de emoji a color. `npm run fonts` descarga Noto Color Emoji desde google/fonts (licencia OFL; no se sube al repo) y con ella el resultado es idéntico en Windows, macOS y Linux. Sin ella se usa la del sistema (Segoe UI Emoji en Windows, Apple Color Emoji en macOS); en un Linux sin fuentes de emoji esos presets fallan con un aviso y `pick` los salta. También puedes apuntar a otra fuente con `CIRCULARTE_EMOJI_FONT=/ruta/fuente.ttf`.

**Descripciones con Claude.** `caption` lee la clave de `ANTHROPIC_API_KEY` (nunca la guardes en el repo). Si no hay clave o la API falla, usa una plantilla local y lo avisa, para que el flujo no se detenga (`--no-fallback` para que falle en su lugar). El modelo se cambia con `CIRCULARTE_CAPTION_MODEL`.

**PowerShell.** Windows PowerShell 5.1 se come el `--` de `npm run render -- --preset …`. Usa `npm.cmd run render -- …` o directamente `node scripts/render.mjs --preset …`.

## Créditos

Creado por **Erick Alvarado**, Senior Full Stack Dev · Tech Lead.

- Sitio: [edav-tech.com](https://edav-tech.com/)
- ¿Quieres una app a la medida? [Iniciar un proyecto](https://www.edav-tech.com/start-project)
- [GitHub](https://github.com/elporter17) · [LinkedIn](https://www.linkedin.com/in/edav/)
