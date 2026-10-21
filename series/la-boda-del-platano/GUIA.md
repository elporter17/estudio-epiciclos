# La boda del Plátano: guía para generar los clips a mano

Se genera con `node scripts/veo-prompts.mjs --ep 3,4,5 --md …`. Si cambias `veo.json`, vuelve a generarla.

## Pasos por clip
1. **Cuadro** (si no está hecho): en la conversación de ChatGPT que ya tiene la hoja de personajes, pega el prompt «Cuadro». Descarga la imagen y ejecuta el comando `--frame` que va debajo (toma la imagen más reciente de Descargas y la guarda en su lugar).
2. **Video**: en Gemini, Herramientas → Crear vídeo → Vertical (9:16). Adjunta el cuadro del clip y pega el prompt «Video». Si Gemini ya no te deja, usa Flow con **Veo 3.1 Quality** (pídelo en el mensaje).
3. Revisa el video: que todos sean frutas, que se digan las líneas completas y que los personajes se parezcan al cuadro. Si algo falla, genéralo de nuevo.
4. Descárgalo y ejecuta el comando `--video` que va debajo.
5. Con los 6 clips de una parte: `node scripts/veo-assemble.mjs --ep N` y revisa `out/la-boda-del-platano/la-boda-del-platano-parte-N.mp4`.
6. Para subirla como borrador: `node scripts/publish.mjs --video out/la-boda-del-platano/la-boda-del-platano-parte-N.mp4 --mode draft`.

## Parte 3: «La verdad de la Piña»

### 3-01 · Fresa: «¡Esta ecografía es de hace dos años, mentirosa!»

**Cuadro:** ya está en `out/la-boda-del-platano/ep03/frames/c01.png`

**Video** (Gemini o Flow):

```text
Animate this exact image as one continuous shot. 3D Pixar-style animated cartoon, glossy and colorful, Latin American telenovela with a comedic tone. Vertical 9:16.
IMPORTANT: every character is an anthropomorphic FRUIT with a cartoon fruit body; there are NO humans, no human faces, no human skin, no human hands at any moment. Keep every character identical to the image for the whole video. No new characters.
Characters: FRESA: a cute anthropomorphic strawberry woman, glossy red skin with tiny yellow seeds, a small green leafy cap, big green expressive eyes with long eyelashes, thin green stem-like arms and legs. Wears a white lace bridal veil with a crown of small white flowers in wedding scenes. PIÑA: an anthropomorphic pineapple woman, golden textured skin, a tall spiky green leaf crown like a hairdo, big dark oval sunglasses, red lips, a hot pink wrap dress with small yellow dots, thin yellow arms and legs, pink high heels.
Setting: A colorful Latin American market stall full of fruit crates, string lights, busy background.
Action: Fresa marches through the market and slams the ultrasound picture on Piña's fruit crate. Piña lowers her sunglasses.
Timeline: 0-8 s: FRESA says in Latin American Spanish with clear lip-sync: "¡Esta ecografía es de hace dos años, mentirosa!"
Every line must be spoken completely, word for word, and nothing else is said.
Voices: Fresa young adult woman, sweet but brave, dramatic telenovela delivery.
Camera: Tracking shot behind Fresa, then a hard stop on Piña.
Sound: Market noise stops abruptly, dramatic sting. No subtitles, no on-screen text.
```

```bash
node scripts/veo-import.mjs --ep 3 --clip c01 --video
```

### 3-02 · Piña: «Ya lo sé, Fresita. Me la dio él. Me usó a mí también.»

**Cuadro** (ChatGPT):

```text
Frame 3-02: FIRST FRAME of a video clip. Use the character sheet in this conversation exactly (same faces, colors, outfits, proportions) and the same 3D Pixar-style rendering as the previous frames.
Setting: A colorful Latin American market stall full of fruit crates, string lights, busy background.
Characters in shot: PIÑA: an anthropomorphic pineapple woman, golden textured skin, a tall spiky green leaf crown like a hairdo, big dark oval sunglasses, red lips, a hot pink wrap dress with small yellow dots, thin yellow arms and legs, pink high heels. FRESA: a cute anthropomorphic strawberry woman, glossy red skin with tiny yellow seeds, a small green leafy cap, big green expressive eyes with long eyelashes, thin green stem-like arms and legs. Wears a white lace bridal veil with a crown of small white flowers in wedding scenes.
Moment: Piña sighs, takes off her sunglasses and her eyes are sad and tired.
Vertical 9:16 portrait, faces in the upper-middle of the frame. No text, no labels, no subtitles.
```

```bash
node scripts/veo-import.mjs --ep 3 --clip c02 --frame
```

**Video** (Gemini o Flow):

```text
Animate this exact image as one continuous shot. 3D Pixar-style animated cartoon, glossy and colorful, Latin American telenovela with a comedic tone. Vertical 9:16.
IMPORTANT: every character is an anthropomorphic FRUIT with a cartoon fruit body; there are NO humans, no human faces, no human skin, no human hands at any moment. Keep every character identical to the image for the whole video. No new characters.
Characters: PIÑA: an anthropomorphic pineapple woman, golden textured skin, a tall spiky green leaf crown like a hairdo, big dark oval sunglasses, red lips, a hot pink wrap dress with small yellow dots, thin yellow arms and legs, pink high heels. FRESA: a cute anthropomorphic strawberry woman, glossy red skin with tiny yellow seeds, a small green leafy cap, big green expressive eyes with long eyelashes, thin green stem-like arms and legs. Wears a white lace bridal veil with a crown of small white flowers in wedding scenes.
Setting: A colorful Latin American market stall full of fruit crates, string lights, busy background.
Action: Piña sighs, takes off her sunglasses and her eyes are sad and tired. She sits down on a crate.
Timeline: 0-8 s: PIÑA says in Latin American Spanish with clear lip-sync: "Ya lo sé, Fresita. Me la dio él. Me usó a mí también."
Every line must be spoken completely, word for word, and nothing else is said.
Voices: Piña adult woman, loud, confident diva.
Camera: Slow push-in on Piña's face.
Sound: Soft emotional guitar. No subtitles, no on-screen text.
```

```bash
node scripts/veo-import.mjs --ep 3 --clip c02 --video
```

### 3-03 · Fresa: «¿Y por qué arruinaste mi boda, entonces?»

**Cuadro** (ChatGPT):

```text
Frame 3-03: FIRST FRAME of a video clip. Use the character sheet in this conversation exactly (same faces, colors, outfits, proportions) and the same 3D Pixar-style rendering as the previous frames.
Setting: A colorful Latin American market stall full of fruit crates, string lights, busy background.
Characters in shot: FRESA: a cute anthropomorphic strawberry woman, glossy red skin with tiny yellow seeds, a small green leafy cap, big green expressive eyes with long eyelashes, thin green stem-like arms and legs. Wears a white lace bridal veil with a crown of small white flowers in wedding scenes. PIÑA: an anthropomorphic pineapple woman, golden textured skin, a tall spiky green leaf crown like a hairdo, big dark oval sunglasses, red lips, a hot pink wrap dress with small yellow dots, thin yellow arms and legs, pink high heels.
Moment: Fresa crosses her tiny arms, suspicious, leaning toward Piña.
Vertical 9:16 portrait, faces in the upper-middle of the frame. No text, no labels, no subtitles.
```

```bash
node scripts/veo-import.mjs --ep 3 --clip c03 --frame
```

**Video** (Gemini o Flow):

```text
Animate this exact image as one continuous shot. 3D Pixar-style animated cartoon, glossy and colorful, Latin American telenovela with a comedic tone. Vertical 9:16.
IMPORTANT: every character is an anthropomorphic FRUIT with a cartoon fruit body; there are NO humans, no human faces, no human skin, no human hands at any moment. Keep every character identical to the image for the whole video. No new characters.
Characters: FRESA: a cute anthropomorphic strawberry woman, glossy red skin with tiny yellow seeds, a small green leafy cap, big green expressive eyes with long eyelashes, thin green stem-like arms and legs. Wears a white lace bridal veil with a crown of small white flowers in wedding scenes. PIÑA: an anthropomorphic pineapple woman, golden textured skin, a tall spiky green leaf crown like a hairdo, big dark oval sunglasses, red lips, a hot pink wrap dress with small yellow dots, thin yellow arms and legs, pink high heels.
Setting: A colorful Latin American market stall full of fruit crates, string lights, busy background.
Action: Fresa crosses her tiny arms, suspicious, leaning toward Piña.
Timeline: 0-8 s: FRESA says in Latin American Spanish with clear lip-sync: "¿Y por qué arruinaste mi boda, entonces?"
Every line must be spoken completely, word for word, and nothing else is said.
Voices: Fresa young adult woman, sweet but brave, dramatic telenovela delivery.
Camera: Two-shot, slight low angle on Fresa.
Sound: Tense strings. No subtitles, no on-screen text.
```

```bash
node scripts/veo-import.mjs --ep 3 --clip c03 --video
```

### 3-04 · Piña: «Porque escuché a Plátano. No busca tu amor, Fresa.»

**Cuadro** (ChatGPT):

```text
Frame 3-04: FIRST FRAME of a video clip. Use the character sheet in this conversation exactly (same faces, colors, outfits, proportions) and the same 3D Pixar-style rendering as the previous frames.
Setting: A colorful Latin American market stall full of fruit crates, string lights, busy background.
Characters in shot: PIÑA: an anthropomorphic pineapple woman, golden textured skin, a tall spiky green leaf crown like a hairdo, big dark oval sunglasses, red lips, a hot pink wrap dress with small yellow dots, thin yellow arms and legs, pink high heels. FRESA: a cute anthropomorphic strawberry woman, glossy red skin with tiny yellow seeds, a small green leafy cap, big green expressive eyes with long eyelashes, thin green stem-like arms and legs. Wears a white lace bridal veil with a crown of small white flowers in wedding scenes.
Moment: Piña pulls a folded contract out of her purse and hands it to Fresa.
Vertical 9:16 portrait, faces in the upper-middle of the frame. No text, no labels, no subtitles.
```

```bash
node scripts/veo-import.mjs --ep 3 --clip c04 --frame
```

**Video** (Gemini o Flow):

```text
Animate this exact image as one continuous shot. 3D Pixar-style animated cartoon, glossy and colorful, Latin American telenovela with a comedic tone. Vertical 9:16.
IMPORTANT: every character is an anthropomorphic FRUIT with a cartoon fruit body; there are NO humans, no human faces, no human skin, no human hands at any moment. Keep every character identical to the image for the whole video. No new characters.
Characters: PIÑA: an anthropomorphic pineapple woman, golden textured skin, a tall spiky green leaf crown like a hairdo, big dark oval sunglasses, red lips, a hot pink wrap dress with small yellow dots, thin yellow arms and legs, pink high heels. FRESA: a cute anthropomorphic strawberry woman, glossy red skin with tiny yellow seeds, a small green leafy cap, big green expressive eyes with long eyelashes, thin green stem-like arms and legs. Wears a white lace bridal veil with a crown of small white flowers in wedding scenes.
Setting: A colorful Latin American market stall full of fruit crates, string lights, busy background.
Action: Piña pulls a folded contract out of her purse and hands it to Fresa. Fresa unfolds it and starts reading.
Timeline: 0-8 s: PIÑA says in Latin American Spanish with clear lip-sync: "Porque escuché a Plátano. No busca tu amor, Fresa."
Every line must be spoken completely, word for word, and nothing else is said.
Voices: Piña adult woman, loud, confident diva.
Camera: Close-up of the paper being unfolded.
Sound: Paper rustle, suspense pulse. No subtitles, no on-screen text.
```

```bash
node scripts/veo-import.mjs --ep 3 --clip c04 --video
```

### 3-05 · Fresa: «¿La huerta de mi abuela? ¿Me iba a hacer firmar esto en la boda?»

**Cuadro** (ChatGPT):

```text
Frame 3-05: FIRST FRAME of a video clip. Use the character sheet in this conversation exactly (same faces, colors, outfits, proportions) and the same 3D Pixar-style rendering as the previous frames.
Setting: A colorful Latin American market stall full of fruit crates, string lights, busy background.
Characters in shot: FRESA: a cute anthropomorphic strawberry woman, glossy red skin with tiny yellow seeds, a small green leafy cap, big green expressive eyes with long eyelashes, thin green stem-like arms and legs. Wears a white lace bridal veil with a crown of small white flowers in wedding scenes.
Moment: Fresa reads the paper and her hands start trembling, her green eyes go wide.
Vertical 9:16 portrait, faces in the upper-middle of the frame. No text, no labels, no subtitles.
```

```bash
node scripts/veo-import.mjs --ep 3 --clip c05 --frame
```

**Video** (Gemini o Flow):

```text
Animate this exact image as one continuous shot. 3D Pixar-style animated cartoon, glossy and colorful, Latin American telenovela with a comedic tone. Vertical 9:16.
IMPORTANT: every character is an anthropomorphic FRUIT with a cartoon fruit body; there are NO humans, no human faces, no human skin, no human hands at any moment. Keep every character identical to the image for the whole video. No new characters.
Characters: FRESA: a cute anthropomorphic strawberry woman, glossy red skin with tiny yellow seeds, a small green leafy cap, big green expressive eyes with long eyelashes, thin green stem-like arms and legs. Wears a white lace bridal veil with a crown of small white flowers in wedding scenes.
Setting: A colorful Latin American market stall full of fruit crates, string lights, busy background.
Action: Fresa reads the paper and her hands start trembling, her green eyes go wide.
Timeline: 0-8 s: FRESA says in Latin American Spanish with clear lip-sync: "¿La huerta de mi abuela? ¿Me iba a hacer firmar esto en la boda?"
Every line must be spoken completely, word for word, and nothing else is said.
Voices: Fresa young adult woman, sweet but brave, dramatic telenovela delivery.
Camera: Over-the-shoulder on the paper, then rack focus to Fresa's face.
Sound: Heartbeat, low drone. No subtitles, no on-screen text.
```

```bash
node scripts/veo-import.mjs --ep 3 --clip c05 --video
```

### 3-06 · Piña: «Tú me odias y yo a ti. Pero a él lo odiamos más. ¿Trato?»

**Cuadro** (ChatGPT):

```text
Frame 3-06: FIRST FRAME of a video clip. Use the character sheet in this conversation exactly (same faces, colors, outfits, proportions) and the same 3D Pixar-style rendering as the previous frames.
Setting: A colorful Latin American market stall full of fruit crates, string lights, busy background.
Characters in shot: PIÑA: an anthropomorphic pineapple woman, golden textured skin, a tall spiky green leaf crown like a hairdo, big dark oval sunglasses, red lips, a hot pink wrap dress with small yellow dots, thin yellow arms and legs, pink high heels. FRESA: a cute anthropomorphic strawberry woman, glossy red skin with tiny yellow seeds, a small green leafy cap, big green expressive eyes with long eyelashes, thin green stem-like arms and legs. Wears a white lace bridal veil with a crown of small white flowers in wedding scenes.
Moment: Piña puts her sunglasses back on, stands up and offers her tiny hand to Fresa for a handshake.
Vertical 9:16 portrait, faces in the upper-middle of the frame. No text, no labels, no subtitles.
```

```bash
node scripts/veo-import.mjs --ep 3 --clip c06 --frame
```

**Video** (Gemini o Flow):

```text
Animate this exact image as one continuous shot. 3D Pixar-style animated cartoon, glossy and colorful, Latin American telenovela with a comedic tone. Vertical 9:16.
IMPORTANT: every character is an anthropomorphic FRUIT with a cartoon fruit body; there are NO humans, no human faces, no human skin, no human hands at any moment. Keep every character identical to the image for the whole video. No new characters.
Characters: PIÑA: an anthropomorphic pineapple woman, golden textured skin, a tall spiky green leaf crown like a hairdo, big dark oval sunglasses, red lips, a hot pink wrap dress with small yellow dots, thin yellow arms and legs, pink high heels. FRESA: a cute anthropomorphic strawberry woman, glossy red skin with tiny yellow seeds, a small green leafy cap, big green expressive eyes with long eyelashes, thin green stem-like arms and legs. Wears a white lace bridal veil with a crown of small white flowers in wedding scenes.
Setting: A colorful Latin American market stall full of fruit crates, string lights, busy background.
Action: Piña puts her sunglasses back on, stands up and offers her tiny hand to Fresa for a handshake.
Timeline: 0-8 s: PIÑA says in Latin American Spanish with clear lip-sync: "Tú me odias y yo a ti. Pero a él lo odiamos más. ¿Trato?"
Every line must be spoken completely, word for word, and nothing else is said.
Voices: Piña adult woman, loud, confident diva.
Camera: Slow orbit around the two of them, ending on the hands about to shake.
Sound: Epic telenovela music sting. No subtitles, no on-screen text.
```

```bash
node scripts/veo-import.mjs --ep 3 --clip c06 --video
```

## Parte 4: «La otra»

### 4-01 · Fresa: «Te perdono, mi amor. ¿Nos casamos otra vez?»

**Cuadro** (ChatGPT):

```text
Frame 4-01: FIRST FRAME of a video clip. Use the character sheet in this conversation exactly (same faces, colors, outfits, proportions) and the same 3D Pixar-style rendering as the previous frames.
Setting: The same kitchen counter at night, dim moonlight through the window, a phone glowing on the counter.
Characters in shot: FRESA: a cute anthropomorphic strawberry woman, glossy red skin with tiny yellow seeds, a small green leafy cap, big green expressive eyes with long eyelashes, thin green stem-like arms and legs. Wears a white lace bridal veil with a crown of small white flowers in wedding scenes. PLÁTANO: a tall anthropomorphic banana man, bright yellow peel with a few brown freckles, big round brown eyes, thin dark eyebrows, a black bow tie, thin yellow arms with yellow cartoon gloves, always slightly sweating.
Moment: Plátano opens the kitchen door and finds Fresa waiting on the counter with candles.
Vertical 9:16 portrait, faces in the upper-middle of the frame. No text, no labels, no subtitles.
```

```bash
node scripts/veo-import.mjs --ep 4 --clip c01 --frame
```

**Video** (Gemini o Flow):

```text
Animate this exact image as one continuous shot. 3D Pixar-style animated cartoon, glossy and colorful, Latin American telenovela with a comedic tone. Vertical 9:16.
IMPORTANT: every character is an anthropomorphic FRUIT with a cartoon fruit body; there are NO humans, no human faces, no human skin, no human hands at any moment. Keep every character identical to the image for the whole video. No new characters.
Characters: FRESA: a cute anthropomorphic strawberry woman, glossy red skin with tiny yellow seeds, a small green leafy cap, big green expressive eyes with long eyelashes, thin green stem-like arms and legs. Wears a white lace bridal veil with a crown of small white flowers in wedding scenes. PLÁTANO: a tall anthropomorphic banana man, bright yellow peel with a few brown freckles, big round brown eyes, thin dark eyebrows, a black bow tie, thin yellow arms with yellow cartoon gloves, always slightly sweating.
Setting: The same kitchen counter at night, dim moonlight through the window, a phone glowing on the counter.
Action: Plátano opens the kitchen door and finds Fresa waiting on the counter with candles. She smiles sweetly, a little too sweetly.
Timeline: 0-8 s: FRESA says in Latin American Spanish with clear lip-sync: "Te perdono, mi amor. ¿Nos casamos otra vez?"
Every line must be spoken completely, word for word, and nothing else is said.
Voices: Fresa young adult woman, sweet but brave, dramatic telenovela delivery.
Camera: Slow push-in on Fresa's fake smile.
Sound: Romantic music with a slightly creepy undertone. No subtitles, no on-screen text.
```

```bash
node scripts/veo-import.mjs --ep 4 --clip c01 --video
```

### 4-02 · Plátano: «¡Sí! Mañana mismo, mi Fresita. Y firmamos todo de una vez.»

**Cuadro** (ChatGPT):

```text
Frame 4-02: FIRST FRAME of a video clip. Use the character sheet in this conversation exactly (same faces, colors, outfits, proportions) and the same 3D Pixar-style rendering as the previous frames.
Setting: The same kitchen counter at night, dim moonlight through the window, a phone glowing on the counter.
Characters in shot: PLÁTANO: a tall anthropomorphic banana man, bright yellow peel with a few brown freckles, big round brown eyes, thin dark eyebrows, a black bow tie, thin yellow arms with yellow cartoon gloves, always slightly sweating. FRESA: a cute anthropomorphic strawberry woman, glossy red skin with tiny yellow seeds, a small green leafy cap, big green expressive eyes with long eyelashes, thin green stem-like arms and legs. Wears a white lace bridal veil with a crown of small white flowers in wedding scenes.
Moment: Plátano jumps with joy, hugs Fresa from the side and secretly winks at the camera.
Vertical 9:16 portrait, faces in the upper-middle of the frame. No text, no labels, no subtitles.
```

```bash
node scripts/veo-import.mjs --ep 4 --clip c02 --frame
```

**Video** (Gemini o Flow):

```text
Animate this exact image as one continuous shot. 3D Pixar-style animated cartoon, glossy and colorful, Latin American telenovela with a comedic tone. Vertical 9:16.
IMPORTANT: every character is an anthropomorphic FRUIT with a cartoon fruit body; there are NO humans, no human faces, no human skin, no human hands at any moment. Keep every character identical to the image for the whole video. No new characters.
Characters: PLÁTANO: a tall anthropomorphic banana man, bright yellow peel with a few brown freckles, big round brown eyes, thin dark eyebrows, a black bow tie, thin yellow arms with yellow cartoon gloves, always slightly sweating. FRESA: a cute anthropomorphic strawberry woman, glossy red skin with tiny yellow seeds, a small green leafy cap, big green expressive eyes with long eyelashes, thin green stem-like arms and legs. Wears a white lace bridal veil with a crown of small white flowers in wedding scenes.
Setting: The same kitchen counter at night, dim moonlight through the window, a phone glowing on the counter.
Action: Plátano jumps with joy, hugs Fresa from the side and secretly winks at the camera.
Timeline: 0-8 s: PLÁTANO says in Latin American Spanish with clear lip-sync: "¡Sí! Mañana mismo, mi Fresita. Y firmamos todo de una vez."
Every line must be spoken completely, word for word, and nothing else is said.
Voices: Plátano adult man, smooth talker, gets squeaky when nervous.
Camera: Medium shot, quick zoom on his wink.
Sound: Comedic sting on the wink. No subtitles, no on-screen text.
```

```bash
node scripts/veo-import.mjs --ep 4 --clip c02 --video
```

### 4-03 · Limón: «Cayó redondito.» / Piña: «Como buen plátano: resbaloso pero tonto.»

**Cuadro** (ChatGPT):

```text
Frame 4-03: FIRST FRAME of a video clip. Use the character sheet in this conversation exactly (same faces, colors, outfits, proportions) and the same 3D Pixar-style rendering as the previous frames.
Setting: The same kitchen counter at night, dim moonlight through the window, a phone glowing on the counter.
Characters in shot: LIMÓN: a small anthropomorphic lemon man, bright yellow bumpy skin, a tiny green leaf on top, thick black rectangular glasses, a green cardigan, tiny arms and legs, sarcastic half-smile. PIÑA: an anthropomorphic pineapple woman, golden textured skin, a tall spiky green leaf crown like a hairdo, big dark oval sunglasses, red lips, a hot pink wrap dress with small yellow dots, thin yellow arms and legs, pink high heels.
Moment: Hidden behind the sugar jar, Limón and Piña spy on them with tiny binoculars.
Vertical 9:16 portrait, faces in the upper-middle of the frame. No text, no labels, no subtitles.
```

```bash
node scripts/veo-import.mjs --ep 4 --clip c03 --frame
```

**Video** (Gemini o Flow):

```text
Animate this exact image as one continuous shot. 3D Pixar-style animated cartoon, glossy and colorful, Latin American telenovela with a comedic tone. Vertical 9:16.
IMPORTANT: every character is an anthropomorphic FRUIT with a cartoon fruit body; there are NO humans, no human faces, no human skin, no human hands at any moment. Keep every character identical to the image for the whole video. No new characters.
Characters: LIMÓN: a small anthropomorphic lemon man, bright yellow bumpy skin, a tiny green leaf on top, thick black rectangular glasses, a green cardigan, tiny arms and legs, sarcastic half-smile. PIÑA: an anthropomorphic pineapple woman, golden textured skin, a tall spiky green leaf crown like a hairdo, big dark oval sunglasses, red lips, a hot pink wrap dress with small yellow dots, thin yellow arms and legs, pink high heels.
Setting: The same kitchen counter at night, dim moonlight through the window, a phone glowing on the counter.
Action: Hidden behind the sugar jar, Limón and Piña spy on them with tiny binoculars.
Timeline: 0-2 s: LIMÓN says in Latin American Spanish with clear lip-sync: "Cayó redondito." 2-8 s: PIÑA says in Latin American Spanish with clear lip-sync: "Como buen plátano: resbaloso pero tonto."
Every line must be spoken completely, word for word, and nothing else is said.
Voices: Limón young adult man, sarcastic and loyal; Piña adult woman, loud, confident diva.
Camera: Peek shot from behind the sugar jar.
Sound: Spy music, whispers. No subtitles, no on-screen text.
```

```bash
node scripts/veo-import.mjs --ep 4 --clip c03 --video
```

### 4-04 · Plátano: «Mañana firmo y la huerta es mía. Y luego nos vamos tú y yo...»

**Cuadro** (ChatGPT):

```text
Frame 4-04: FIRST FRAME of a video clip. Use the character sheet in this conversation exactly (same faces, colors, outfits, proportions) and the same 3D Pixar-style rendering as the previous frames.
Setting: The same kitchen counter at night, dim moonlight through the window, a phone glowing on the counter.
Characters in shot: PLÁTANO: a tall anthropomorphic banana man, bright yellow peel with a few brown freckles, big round brown eyes, thin dark eyebrows, a black bow tie, thin yellow arms with yellow cartoon gloves, always slightly sweating.
Moment: Later that night, Plátano sneaks to the corner of the counter, picks up the glowing phone and whispers into it with a smirk.
Vertical 9:16 portrait, faces in the upper-middle of the frame. No text, no labels, no subtitles.
```

```bash
node scripts/veo-import.mjs --ep 4 --clip c04 --frame
```

**Video** (Gemini o Flow):

```text
Animate this exact image as one continuous shot. 3D Pixar-style animated cartoon, glossy and colorful, Latin American telenovela with a comedic tone. Vertical 9:16.
IMPORTANT: every character is an anthropomorphic FRUIT with a cartoon fruit body; there are NO humans, no human faces, no human skin, no human hands at any moment. Keep every character identical to the image for the whole video. No new characters.
Characters: PLÁTANO: a tall anthropomorphic banana man, bright yellow peel with a few brown freckles, big round brown eyes, thin dark eyebrows, a black bow tie, thin yellow arms with yellow cartoon gloves, always slightly sweating.
Setting: The same kitchen counter at night, dim moonlight through the window, a phone glowing on the counter.
Action: Later that night, Plátano sneaks to the corner of the counter, picks up the glowing phone and whispers into it with a smirk.
Timeline: 0-8 s: PLÁTANO says in Latin American Spanish with clear lip-sync: "Mañana firmo y la huerta es mía. Y luego nos vamos tú y yo..."
Every line must be spoken completely, word for word, and nothing else is said.
Voices: Plátano adult man, smooth talker, gets squeaky when nervous.
Camera: Slow creeping dolly toward Plátano from behind.
Sound: Sinister low strings. No subtitles, no on-screen text.
```

```bash
node scripts/veo-import.mjs --ep 4 --clip c04 --video
```

### 4-05 · Uva: «No me falles, Platanito. Tu Uvita te espera.»

**Cuadro** (ChatGPT):

```text
Frame 4-05: FIRST FRAME of a video clip. Use the character sheet in this conversation exactly (same faces, colors, outfits, proportions) and the same 3D Pixar-style rendering as the previous frames.
Setting: The same kitchen counter at night, dim moonlight through the window, a phone glowing on the counter.
Characters in shot: UVA: an anthropomorphic purple grape woman made of a small cluster of shiny grapes, a curly vine like a ponytail, long eyelashes, purple lipstick, a gold necklace, tiny arms and legs.
Moment: Split-screen style: on the other side of the call, Uva lies on a silk pillow in a fruit bowl, twirling her vine ponytail.
Vertical 9:16 portrait, faces in the upper-middle of the frame. No text, no labels, no subtitles.
```

```bash
node scripts/veo-import.mjs --ep 4 --clip c05 --frame
```

**Video** (Gemini o Flow):

```text
Animate this exact image as one continuous shot. 3D Pixar-style animated cartoon, glossy and colorful, Latin American telenovela with a comedic tone. Vertical 9:16.
IMPORTANT: every character is an anthropomorphic FRUIT with a cartoon fruit body; there are NO humans, no human faces, no human skin, no human hands at any moment. Keep every character identical to the image for the whole video. No new characters.
Characters: UVA: an anthropomorphic purple grape woman made of a small cluster of shiny grapes, a curly vine like a ponytail, long eyelashes, purple lipstick, a gold necklace, tiny arms and legs.
Setting: The same kitchen counter at night, dim moonlight through the window, a phone glowing on the counter.
Action: Split-screen style: on the other side of the call, Uva lies on a silk pillow in a fruit bowl, twirling her vine ponytail.
Timeline: 0-8 s: UVA says in Latin American Spanish with clear lip-sync: "No me falles, Platanito. Tu Uvita te espera."
Every line must be spoken completely, word for word, and nothing else is said.
Voices: Uva adult woman, sly and whispery.
Camera: Close-up of Uva with purple moody lighting.
Sound: Seductive saxophone. No subtitles, no on-screen text.
```

```bash
node scripts/veo-import.mjs --ep 4 --clip c05 --video
```

### 4-06 · Piña: «¿UVA? ¿También hay una uva?» / Fresa: «Mañana... va a ser la boda del año.»

**Cuadro** (ChatGPT):

```text
Frame 4-06: FIRST FRAME of a video clip. Use the character sheet in this conversation exactly (same faces, colors, outfits, proportions) and the same 3D Pixar-style rendering as the previous frames.
Setting: The same kitchen counter at night, dim moonlight through the window, a phone glowing on the counter.
Characters in shot: FRESA: a cute anthropomorphic strawberry woman, glossy red skin with tiny yellow seeds, a small green leafy cap, big green expressive eyes with long eyelashes, thin green stem-like arms and legs. Wears a white lace bridal veil with a crown of small white flowers in wedding scenes. LIMÓN: a small anthropomorphic lemon man, bright yellow bumpy skin, a tiny green leaf on top, thick black rectangular glasses, a green cardigan, tiny arms and legs, sarcastic half-smile. PIÑA: an anthropomorphic pineapple woman, golden textured skin, a tall spiky green leaf crown like a hairdo, big dark oval sunglasses, red lips, a hot pink wrap dress with small yellow dots, thin yellow arms and legs, pink high heels.
Moment: Fresa, Limón and Piña have heard everything from the dark.
Vertical 9:16 portrait, faces in the upper-middle of the frame. No text, no labels, no subtitles.
```

```bash
node scripts/veo-import.mjs --ep 4 --clip c06 --frame
```

**Video** (Gemini o Flow):

```text
Animate this exact image as one continuous shot. 3D Pixar-style animated cartoon, glossy and colorful, Latin American telenovela with a comedic tone. Vertical 9:16.
IMPORTANT: every character is an anthropomorphic FRUIT with a cartoon fruit body; there are NO humans, no human faces, no human skin, no human hands at any moment. Keep every character identical to the image for the whole video. No new characters.
Characters: FRESA: a cute anthropomorphic strawberry woman, glossy red skin with tiny yellow seeds, a small green leafy cap, big green expressive eyes with long eyelashes, thin green stem-like arms and legs. Wears a white lace bridal veil with a crown of small white flowers in wedding scenes. LIMÓN: a small anthropomorphic lemon man, bright yellow bumpy skin, a tiny green leaf on top, thick black rectangular glasses, a green cardigan, tiny arms and legs, sarcastic half-smile. PIÑA: an anthropomorphic pineapple woman, golden textured skin, a tall spiky green leaf crown like a hairdo, big dark oval sunglasses, red lips, a hot pink wrap dress with small yellow dots, thin yellow arms and legs, pink high heels.
Setting: The same kitchen counter at night, dim moonlight through the window, a phone glowing on the counter.
Action: Fresa, Limón and Piña have heard everything from the dark. Fresa steps into the moonlight, furious and determined.
Timeline: 0-3 s: PIÑA says in Latin American Spanish with clear lip-sync: "¿UVA? ¿También hay una uva?" 3-8 s: FRESA says in Latin American Spanish with clear lip-sync: "Mañana... va a ser la boda del año."
Every line must be spoken completely, word for word, and nothing else is said.
Voices: Piña adult woman, loud, confident diva; Fresa young adult woman, sweet but brave, dramatic telenovela delivery.
Camera: Crash zoom on Fresa's eyes in the moonlight.
Sound: Thunder, dramatic telenovela sting. No subtitles, no on-screen text.
```

```bash
node scripts/veo-import.mjs --ep 4 --clip c06 --video
```

## Parte 5: «La segunda boda»

### 5-01 · Padre Coco: «Otra vez... Si alguien se opone a esta boda, que hable ahora.»

**Cuadro** (ChatGPT):

```text
Frame 5-01: FIRST FRAME of a video clip. Use the character sheet in this conversation exactly (same faces, colors, outfits, proportions) and the same 3D Pixar-style rendering as the previous frames.
Setting: A wedding on a sunny kitchen counter: the altar is a decorated fruit bowl with white flowers, small apple and grape guests sit on rows of matchboxes, a wooden kitchen door in the background.
Characters in shot: PADRE COCO: a round hairy brown coconut man, small round wire glasses, bushy gray eyebrows, a black priest cassock with a white collar, holding a small black book with a gold cross, tiny brown arms. FRESA: a cute anthropomorphic strawberry woman, glossy red skin with tiny yellow seeds, a small green leafy cap, big green expressive eyes with long eyelashes, thin green stem-like arms and legs. Wears a white lace bridal veil with a crown of small white flowers in wedding scenes. PLÁTANO: a tall anthropomorphic banana man, bright yellow peel with a few brown freckles, big round brown eyes, thin dark eyebrows, a black bow tie, thin yellow arms with yellow cartoon gloves, always slightly sweating.
Moment: The same wedding altar again.
Vertical 9:16 portrait, faces in the upper-middle of the frame. No text, no labels, no subtitles.
```

```bash
node scripts/veo-import.mjs --ep 5 --clip c01 --frame
```

**Video** (Gemini o Flow):

```text
Animate this exact image as one continuous shot. 3D Pixar-style animated cartoon, glossy and colorful, Latin American telenovela with a comedic tone. Vertical 9:16.
IMPORTANT: every character is an anthropomorphic FRUIT with a cartoon fruit body; there are NO humans, no human faces, no human skin, no human hands at any moment. Keep every character identical to the image for the whole video. No new characters.
Characters: PADRE COCO: a round hairy brown coconut man, small round wire glasses, bushy gray eyebrows, a black priest cassock with a white collar, holding a small black book with a gold cross, tiny brown arms. FRESA: a cute anthropomorphic strawberry woman, glossy red skin with tiny yellow seeds, a small green leafy cap, big green expressive eyes with long eyelashes, thin green stem-like arms and legs. Wears a white lace bridal veil with a crown of small white flowers in wedding scenes. PLÁTANO: a tall anthropomorphic banana man, bright yellow peel with a few brown freckles, big round brown eyes, thin dark eyebrows, a black bow tie, thin yellow arms with yellow cartoon gloves, always slightly sweating.
Setting: A wedding on a sunny kitchen counter: the altar is a decorated fruit bowl with white flowers, small apple and grape guests sit on rows of matchboxes, a wooden kitchen door in the background.
Action: The same wedding altar again. Padre Coco sighs and reads from his book. Plátano grins with a pen and a contract ready on the altar.
Timeline: 0-8 s: PADRE COCO says in Latin American Spanish with clear lip-sync: "Otra vez... Si alguien se opone a esta boda, que hable ahora."
Every line must be spoken completely, word for word, and nothing else is said.
Voices: Padre Coco older man, calm, slow and solemn.
Camera: Slow push-in on the altar, same as the first wedding.
Sound: Wedding organ, guests whispering. No subtitles, no on-screen text.
```

```bash
node scripts/veo-import.mjs --ep 5 --clip c01 --video
```

### 5-02 · Fresa: «Yo me opongo... a mi propia boda.»

**Cuadro** (ChatGPT):

```text
Frame 5-02: FIRST FRAME of a video clip. Use the character sheet in this conversation exactly (same faces, colors, outfits, proportions) and the same 3D Pixar-style rendering as the previous frames.
Setting: A wedding on a sunny kitchen counter: the altar is a decorated fruit bowl with white flowers, small apple and grape guests sit on rows of matchboxes, a wooden kitchen door in the background.
Characters in shot: FRESA: a cute anthropomorphic strawberry woman, glossy red skin with tiny yellow seeds, a small green leafy cap, big green expressive eyes with long eyelashes, thin green stem-like arms and legs. Wears a white lace bridal veil with a crown of small white flowers in wedding scenes. PLÁTANO: a tall anthropomorphic banana man, bright yellow peel with a few brown freckles, big round brown eyes, thin dark eyebrows, a black bow tie, thin yellow arms with yellow cartoon gloves, always slightly sweating.
Moment: Fresa lifts her veil herself, looks at Plátano and raises her tiny hand.
Vertical 9:16 portrait, faces in the upper-middle of the frame. No text, no labels, no subtitles.
```

```bash
node scripts/veo-import.mjs --ep 5 --clip c02 --frame
```

**Video** (Gemini o Flow):

```text
Animate this exact image as one continuous shot. 3D Pixar-style animated cartoon, glossy and colorful, Latin American telenovela with a comedic tone. Vertical 9:16.
IMPORTANT: every character is an anthropomorphic FRUIT with a cartoon fruit body; there are NO humans, no human faces, no human skin, no human hands at any moment. Keep every character identical to the image for the whole video. No new characters.
Characters: FRESA: a cute anthropomorphic strawberry woman, glossy red skin with tiny yellow seeds, a small green leafy cap, big green expressive eyes with long eyelashes, thin green stem-like arms and legs. Wears a white lace bridal veil with a crown of small white flowers in wedding scenes. PLÁTANO: a tall anthropomorphic banana man, bright yellow peel with a few brown freckles, big round brown eyes, thin dark eyebrows, a black bow tie, thin yellow arms with yellow cartoon gloves, always slightly sweating.
Setting: A wedding on a sunny kitchen counter: the altar is a decorated fruit bowl with white flowers, small apple and grape guests sit on rows of matchboxes, a wooden kitchen door in the background.
Action: Fresa lifts her veil herself, looks at Plátano and raises her tiny hand.
Timeline: 0-8 s: FRESA says in Latin American Spanish with clear lip-sync: "Yo me opongo... a mi propia boda."
Every line must be spoken completely, word for word, and nothing else is said.
Voices: Fresa young adult woman, sweet but brave, dramatic telenovela delivery.
Camera: Close-up of Fresa, then quick cut to Plátano's shocked face.
Sound: Organ stops with a wrong note, guests gasp. No subtitles, no on-screen text.
```

```bash
node scripts/veo-import.mjs --ep 5 --clip c02 --video
```

### 5-03 · Piña: «¡Y traje a una invitada especial!» / Uva: «¿Platanito? ¿Te ibas a casar?»

**Cuadro** (ChatGPT):

```text
Frame 5-03: FIRST FRAME of a video clip. Use the character sheet in this conversation exactly (same faces, colors, outfits, proportions) and the same 3D Pixar-style rendering as the previous frames.
Setting: A wedding on a sunny kitchen counter: the altar is a decorated fruit bowl with white flowers, small apple and grape guests sit on rows of matchboxes, a wooden kitchen door in the background.
Characters in shot: PIÑA: an anthropomorphic pineapple woman, golden textured skin, a tall spiky green leaf crown like a hairdo, big dark oval sunglasses, red lips, a hot pink wrap dress with small yellow dots, thin yellow arms and legs, pink high heels. LIMÓN: a small anthropomorphic lemon man, bright yellow bumpy skin, a tiny green leaf on top, thick black rectangular glasses, a green cardigan, tiny arms and legs, sarcastic half-smile. UVA: an anthropomorphic purple grape woman made of a small cluster of shiny grapes, a curly vine like a ponytail, long eyelashes, purple lipstick, a gold necklace, tiny arms and legs.
Moment: The kitchen door bursts open: Piña and Limón walk in, dragging a surprised Uva between them.
Vertical 9:16 portrait, faces in the upper-middle of the frame. No text, no labels, no subtitles.
```

```bash
node scripts/veo-import.mjs --ep 5 --clip c03 --frame
```

**Video** (Gemini o Flow):

```text
Animate this exact image as one continuous shot. 3D Pixar-style animated cartoon, glossy and colorful, Latin American telenovela with a comedic tone. Vertical 9:16.
IMPORTANT: every character is an anthropomorphic FRUIT with a cartoon fruit body; there are NO humans, no human faces, no human skin, no human hands at any moment. Keep every character identical to the image for the whole video. No new characters.
Characters: PIÑA: an anthropomorphic pineapple woman, golden textured skin, a tall spiky green leaf crown like a hairdo, big dark oval sunglasses, red lips, a hot pink wrap dress with small yellow dots, thin yellow arms and legs, pink high heels. LIMÓN: a small anthropomorphic lemon man, bright yellow bumpy skin, a tiny green leaf on top, thick black rectangular glasses, a green cardigan, tiny arms and legs, sarcastic half-smile. UVA: an anthropomorphic purple grape woman made of a small cluster of shiny grapes, a curly vine like a ponytail, long eyelashes, purple lipstick, a gold necklace, tiny arms and legs.
Setting: A wedding on a sunny kitchen counter: the altar is a decorated fruit bowl with white flowers, small apple and grape guests sit on rows of matchboxes, a wooden kitchen door in the background.
Action: The kitchen door bursts open: Piña and Limón walk in, dragging a surprised Uva between them.
Timeline: 0-4 s: PIÑA says in Latin American Spanish with clear lip-sync: "¡Y traje a una invitada especial!" 4-8 s: UVA says in Latin American Spanish with clear lip-sync: "¿Platanito? ¿Te ibas a casar?"
Every line must be spoken completely, word for word, and nothing else is said.
Voices: Piña adult woman, loud, confident diva; Uva adult woman, sly and whispery.
Camera: Whip pan to the door, slow-motion entrance.
Sound: Epic entrance music. No subtitles, no on-screen text.
```

```bash
node scripts/veo-import.mjs --ep 5 --clip c03 --video
```

### 5-04 · Fresa: «La huerta de mi abuela no se vende. Y yo tampoco.»

**Cuadro** (ChatGPT):

```text
Frame 5-04: FIRST FRAME of a video clip. Use the character sheet in this conversation exactly (same faces, colors, outfits, proportions) and the same 3D Pixar-style rendering as the previous frames.
Setting: A wedding on a sunny kitchen counter: the altar is a decorated fruit bowl with white flowers, small apple and grape guests sit on rows of matchboxes, a wooden kitchen door in the background.
Characters in shot: FRESA: a cute anthropomorphic strawberry woman, glossy red skin with tiny yellow seeds, a small green leafy cap, big green expressive eyes with long eyelashes, thin green stem-like arms and legs. Wears a white lace bridal veil with a crown of small white flowers in wedding scenes. PLÁTANO: a tall anthropomorphic banana man, bright yellow peel with a few brown freckles, big round brown eyes, thin dark eyebrows, a black bow tie, thin yellow arms with yellow cartoon gloves, always slightly sweating.
Moment: Fresa takes the contract from the altar and tears it in half in front of Plátano.
Vertical 9:16 portrait, faces in the upper-middle of the frame. No text, no labels, no subtitles.
```

```bash
node scripts/veo-import.mjs --ep 5 --clip c04 --frame
```

**Video** (Gemini o Flow):

```text
Animate this exact image as one continuous shot. 3D Pixar-style animated cartoon, glossy and colorful, Latin American telenovela with a comedic tone. Vertical 9:16.
IMPORTANT: every character is an anthropomorphic FRUIT with a cartoon fruit body; there are NO humans, no human faces, no human skin, no human hands at any moment. Keep every character identical to the image for the whole video. No new characters.
Characters: FRESA: a cute anthropomorphic strawberry woman, glossy red skin with tiny yellow seeds, a small green leafy cap, big green expressive eyes with long eyelashes, thin green stem-like arms and legs. Wears a white lace bridal veil with a crown of small white flowers in wedding scenes. PLÁTANO: a tall anthropomorphic banana man, bright yellow peel with a few brown freckles, big round brown eyes, thin dark eyebrows, a black bow tie, thin yellow arms with yellow cartoon gloves, always slightly sweating.
Setting: A wedding on a sunny kitchen counter: the altar is a decorated fruit bowl with white flowers, small apple and grape guests sit on rows of matchboxes, a wooden kitchen door in the background.
Action: Fresa takes the contract from the altar and tears it in half in front of Plátano. Paper pieces fly in slow motion.
Timeline: 0-8 s: FRESA says in Latin American Spanish with clear lip-sync: "La huerta de mi abuela no se vende. Y yo tampoco."
Every line must be spoken completely, word for word, and nothing else is said.
Voices: Fresa young adult woman, sweet but brave, dramatic telenovela delivery.
Camera: Low angle on Fresa tearing the paper, slow motion.
Sound: Paper tear, music swells. No subtitles, no on-screen text.
```

```bash
node scripts/veo-import.mjs --ep 5 --clip c04 --video
```

### 5-05 · Plátano: «¡Nooo, mi cáscara!»

**Cuadro** (ChatGPT):

```text
Frame 5-05: FIRST FRAME of a video clip. Use the character sheet in this conversation exactly (same faces, colors, outfits, proportions) and the same 3D Pixar-style rendering as the previous frames.
Setting: A wedding on a sunny kitchen counter: the altar is a decorated fruit bowl with white flowers, small apple and grape guests sit on rows of matchboxes, a wooden kitchen door in the background.
Characters in shot: PLÁTANO: a tall anthropomorphic banana man, bright yellow peel with a few brown freckles, big round brown eyes, thin dark eyebrows, a black bow tie, thin yellow arms with yellow cartoon gloves, always slightly sweating.
Moment: Plátano tries to run away down the aisle, steps on a banana peel and slips comically, sliding across the counter into the fruit bowl.
Vertical 9:16 portrait, faces in the upper-middle of the frame. No text, no labels, no subtitles.
```

```bash
node scripts/veo-import.mjs --ep 5 --clip c05 --frame
```

**Video** (Gemini o Flow):

```text
Animate this exact image as one continuous shot. 3D Pixar-style animated cartoon, glossy and colorful, Latin American telenovela with a comedic tone. Vertical 9:16.
IMPORTANT: every character is an anthropomorphic FRUIT with a cartoon fruit body; there are NO humans, no human faces, no human skin, no human hands at any moment. Keep every character identical to the image for the whole video. No new characters.
Characters: PLÁTANO: a tall anthropomorphic banana man, bright yellow peel with a few brown freckles, big round brown eyes, thin dark eyebrows, a black bow tie, thin yellow arms with yellow cartoon gloves, always slightly sweating.
Setting: A wedding on a sunny kitchen counter: the altar is a decorated fruit bowl with white flowers, small apple and grape guests sit on rows of matchboxes, a wooden kitchen door in the background.
Action: Plátano tries to run away down the aisle, steps on a banana peel and slips comically, sliding across the counter into the fruit bowl. Guests laugh.
Timeline: 0-8 s: PLÁTANO says in Latin American Spanish with clear lip-sync: "¡Nooo, mi cáscara!"
Every line must be spoken completely, word for word, and nothing else is said.
Voices: Plátano adult man, smooth talker, gets squeaky when nervous.
Camera: Wide tracking shot of the slip, ends on a comedic freeze.
Sound: Cartoon slip sound, guests laughing. No subtitles, no on-screen text.
```

```bash
node scripts/veo-import.mjs --ep 5 --clip c05 --video
```

### 5-06 · Fresa: «Aquí la que manda en la huerta... soy yo.» / Piña: «¡Y la madrina también!»

**Cuadro** (ChatGPT):

```text
Frame 5-06: FIRST FRAME of a video clip. Use the character sheet in this conversation exactly (same faces, colors, outfits, proportions) and the same 3D Pixar-style rendering as the previous frames.
Setting: A wedding on a sunny kitchen counter: the altar is a decorated fruit bowl with white flowers, small apple and grape guests sit on rows of matchboxes, a wooden kitchen door in the background.
Characters in shot: FRESA: a cute anthropomorphic strawberry woman, glossy red skin with tiny yellow seeds, a small green leafy cap, big green expressive eyes with long eyelashes, thin green stem-like arms and legs. Wears a white lace bridal veil with a crown of small white flowers in wedding scenes. PIÑA: an anthropomorphic pineapple woman, golden textured skin, a tall spiky green leaf crown like a hairdo, big dark oval sunglasses, red lips, a hot pink wrap dress with small yellow dots, thin yellow arms and legs, pink high heels. LIMÓN: a small anthropomorphic lemon man, bright yellow bumpy skin, a tiny green leaf on top, thick black rectangular glasses, a green cardigan, tiny arms and legs, sarcastic half-smile.
Moment: Fresa, Piña and Limón stand together at the altar, smiling.
Vertical 9:16 portrait, faces in the upper-middle of the frame. No text, no labels, no subtitles.
```

```bash
node scripts/veo-import.mjs --ep 5 --clip c06 --frame
```

**Video** (Gemini o Flow):

```text
Animate this exact image as one continuous shot. 3D Pixar-style animated cartoon, glossy and colorful, Latin American telenovela with a comedic tone. Vertical 9:16.
IMPORTANT: every character is an anthropomorphic FRUIT with a cartoon fruit body; there are NO humans, no human faces, no human skin, no human hands at any moment. Keep every character identical to the image for the whole video. No new characters.
Characters: FRESA: a cute anthropomorphic strawberry woman, glossy red skin with tiny yellow seeds, a small green leafy cap, big green expressive eyes with long eyelashes, thin green stem-like arms and legs. Wears a white lace bridal veil with a crown of small white flowers in wedding scenes. PIÑA: an anthropomorphic pineapple woman, golden textured skin, a tall spiky green leaf crown like a hairdo, big dark oval sunglasses, red lips, a hot pink wrap dress with small yellow dots, thin yellow arms and legs, pink high heels. LIMÓN: a small anthropomorphic lemon man, bright yellow bumpy skin, a tiny green leaf on top, thick black rectangular glasses, a green cardigan, tiny arms and legs, sarcastic half-smile.
Setting: A wedding on a sunny kitchen counter: the altar is a decorated fruit bowl with white flowers, small apple and grape guests sit on rows of matchboxes, a wooden kitchen door in the background.
Action: Fresa, Piña and Limón stand together at the altar, smiling. Fresa throws her bouquet toward the camera.
Timeline: 0-6 s: FRESA says in Latin American Spanish with clear lip-sync: "Aquí la que manda en la huerta... soy yo." 6-8 s: PIÑA says in Latin American Spanish with clear lip-sync: "¡Y la madrina también!"
Every line must be spoken completely, word for word, and nothing else is said.
Voices: Fresa young adult woman, sweet but brave, dramatic telenovela delivery; Piña adult woman, loud, confident diva.
Camera: Slow dolly-out, bouquet flies at the lens.
Sound: Happy telenovela finale music, applause. No subtitles, no on-screen text.
```

```bash
node scripts/veo-import.mjs --ep 5 --clip c06 --video
```
