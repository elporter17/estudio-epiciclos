# Historias 2D: cómo escribir una

Una historia es **un solo archivo JSON** en esta carpeta. El generador (`scripts/historia.mjs`) lo valida, calcula la duración y el costo, y lo convierte en la serie que usa el resto del pipeline (retratos → recursos → voz → video).

```bash
node scripts/historia.mjs historias/mateo-daltonico.json                  # valida, estima duración y costo, escribe series.json (no gasta)
node scripts/historia.mjs historias/mateo-daltonico.json --prueba         # vista previa GRATIS: figuras de relleno y voz en silencio, cuadros PNG
node scripts/historia.mjs historias/mateo-daltonico.json --prueba --cuadros 4,20,45
node scripts/historia.mjs historias/mateo-daltonico.json --hacer          # genera todo (GASTA API: pide el OK del usuario antes)
node scripts/historia.mjs historias/mateo-daltonico.json --hacer --hasta voz   # retratos | recursos | voz | video
```

El video queda en `out/<slug>/<slug>-animado.mp4`. Lo ya generado no se vuelve a pedir (usa `--force` para rehacer).

## Campos de la historia

| Campo | Qué es |
|---|---|
| `slug`, `titulo`, `gancho` | Identificador, título y el texto de los primeros 3 s (máx. 7 palabras, que dé curiosidad) |
| `estilo` | `cartoon3d` (película infantil, por defecto), `caricatura` (la de las sátiras) o `plano` (vectorial, barato) → `scripts/lib/estilos.mjs` |
| `descripcion`, `hashtags` | Texto del post |
| `narrador` | `{ voz, instrucciones }`: voz de OpenAI (alloy, ash, ballad, coral, echo, fable, nova, onyx, sage, shimmer, verse, marin, cedar) |
| `personajes` | `[{ id, nombre, visual, voz }]`: **`visual` va en inglés** y es la descripción fija que se repite en cada imagen |
| `poses` | `{ "mateo_triste": ["mateo", "Standing with head down…"] }`: una imagen por pose, con fondo transparente |
| `props` | `{ "balon": "A black and white soccer ball. " }`: objetos sueltos |
| `fondos` | `{ "bg_cancha": "A bright green soccer field…" }`: sin gente y con el tercio de abajo tranquilo (ahí van los subtítulos) |
| `boca` | Opcional: `{ "mateo_balon": [0.5, 0.3] }` = dónde está la boca de una pose (fracción del ancho y el alto) para animarla con la voz |
| `subtitulos` | Opcional: `{ color, active }` para cambiar el color de los subtítulos y de la palabra que se está diciendo |
| `escenas` | La lista de escenas (abajo) |

## Cada escena

```json
{ "id": "s2", "texto": "Lo que dice la narración en esta escena.",
  "fondo": "bg_cancha", "cam": "cortes",
  "personajes": [{ "pose": "mateo_curioso", "x": 0.5, "h": 1000, "enter": "pop", "t0": 0.6 }],
  "objetos": [{ "id": "balon", "de": [-0.3, 0.6], "a": [0.3, 0.62], "dur": 1.4, "h": 640 }],
  "hud": [{ "tipo": "sello", "texto": "DALTONISMO", "x": 0.5, "y": 0.24, "t0": 0.4, "color": "#BE185D" }],
  "pov": [{ "tipo": "deutan", "t0": 4.2, "etiqueta": "ASÍ LO VE MATEO" }],
  "efectos": [{ "tipo": "confeti", "t0": 3 }] }
```

- **Texto:** `texto` = narración. Para diálogos usa `lineas: [{ "hablante": "doctora", "texto": "…" }]` (el hablante debe estar en `personajes`; `narrador` es la voz en off).
- **Cámara** (`cam`): `cortes` (zoom que salta cada ~2,4 s; `foco` 0–1 mueve hacia dónde), `acerca` (zoom lento) o `quieta`. También puedes poner keyframes `[[seg, zoom, fx, fy], …]`.
- **Personajes:** `x` (0–1), `foot` (dónde pisa, 0,97), `h` (alto en px sobre 1920), `enter`: `pop`, `left`, `right`, `rise`, `drop`; `salto`, `bob`, `tilt`, `flip`, `hablante` (para mover la boca).
- **Objetos:** `x`, `y` fijos o `de` → `a` (se mueven en `dur` s); `pop`, `flota`, `rot`, `flip`.
- **HUD:** `sello` (cartel inclinado), `texto` (texto grande que da un golpe), `comentario` (tarjeta tipo comentario, con `t1`), `etiqueta` (pastilla de arriba).
- **POV («cómo lo ve…»):** `deutan`, `protan`, `tritan` (daltonismos reales), `verde-azul` (estilizado: el pasto se ve azul), `grises`, `miopia`, `tunel`. `t0`/`t1` en segundos de la escena (sin `t1` dura hasta el final); entra y sale con un fundido.
- **Efectos:** `confeti`, `chispas`, `rayos`; `sacudida: [t0, t1, fuerza]`.

## Ritmo y costo

- La voz dice ~0,46 s por palabra con pausas: 170 a 235 palabras dan 80 a 110 s. Si pasa de 120 s el generador avisa.
- Un episodio de 10 escenas con 4 personajes cuesta ~$0,40 a $1,10 (imágenes de calidad media + voz). Las poses y los retratos son lo más caro: reutiliza poses entre escenas.
- Antes de `--hacer`, muestra el costo al usuario (regla de `CLAUDE.md`).

## Para otras historias

Cambia el tema, no el formato: un dato curioso contado como mini-historia (una pregunta del personaje, un momento en que se descubre y un cierre con el dato y su fuente), con el filtro POV cuando el tema es «cómo se ve o se oye» (miopía, visión de túnel, acromatopsia). Si es un tema de salud, cita fuentes y no dramatices.
