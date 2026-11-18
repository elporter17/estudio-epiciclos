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

Yes, we are experiencing this. Every video uploaded through videos.insert by our client stays Private after the upload. To publish it, we have to open YouTube Studio, review and approve each video, and manually change its visibility to Public. All 56 videos uploaded between 2026-11-09 and 2026-11-18 followed this flow, and none became public automatically.

If this is not the correct or preferred API contact email, or you would like us to cc other contacts, please let us know.

Best regards,
Erick Alvarado
Potter Play

---

**ENVIADO el 2026-11-18** desde el Gmail de Erick, como respuesta al segundo aviso, con los adjuntos informe-muestra-api.md y muestra-datos-api.csv. El punto 2 refleja lo que confirmó Erick: todos los videos subidos por API quedan privados y los publica a mano desde Studio.
