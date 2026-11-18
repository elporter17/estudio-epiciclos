# Respuesta para el equipo de YouTube API (borrador, para enviar desde Gmail como respuesta al correo)

**Adjuntar:** `informe-muestra-api.md` (o su PDF) y `muestra-datos-api.csv`.

---

Hello,

Thank you for your follow-up. Here is the information you requested for our YouTube API Client (Google Cloud project "potter-play-youtube", OAuth desktop client "Subidas Potter Play", channel "Potter Play", UC-upSUghMwd2-TxjH9_tLJg).

**1. Analyzed sample report (attached: informe-muestra-api.md and muestra-datos-api.csv)**

Our application only works with our own channel. It uses these API methods:
- videos.insert (resumable upload of our own Shorts and long videos, up to ~6 per day)
- thumbnails.set (thumbnails for our own long videos)
- channels.list (mine=true, parts snippet and statistics, only to check the connection)
- videos.list (part statistics) once a day, only for the video IDs that our own application uploaded, to read viewCount

We do not use the YouTube Analytics or Reporting APIs, and we do not retrieve comments, subscriber lists or any personal data of viewers. The attached report shows the real data retrieved on 2026-11-18: the channel statistics and 56 videos uploaded by the application (video ID, title, upload and publish dates, privacy status, views, likes and comments). The only analysis we perform is comparing view counts between our own content formats and publishing times, to decide what to repeat and when to publish. The data is not shared with or sold to third parties.

**2. Content visibility after videos.insert**

[CONFIRMAR ANTES DE ENVIAR — ver nota] Yes. Every videos.insert request from our client sends status.privacyStatus = "private" (we use it as a draft workflow). Of the 56 videos uploaded by the client between 2026-11-09 and 2026-11-18, 30 were not public until we published them manually in YouTube Studio, several hours after upload. The remaining 26 appear as public within about a minute of upload. We are requesting the compliance audit and quota review so that this behavior is clearly allowed for our verified use case. Please tell us if you need screenshots of YouTube Studio showing the private state or the OAuth consent flow (we already have them prepared from our earlier submission).

If this is not the correct or preferred API contact email, or you would like us to cc other contacts, please let us know.

Best regards,
Erick Alvarado
Potter Play

---

**Nota para ti (no va en el correo):** la frase del punto 2 necesita tu confirmación. Los datos dicen que 30 videos se hicieron públicos horas después de subirlos (manual) y 26 salieron públicos a los pocos segundos, aunque el código pide «private». Antes de enviar, confirma si tú publicas a mano o si algo cambió desde el 13 de noviembre.
