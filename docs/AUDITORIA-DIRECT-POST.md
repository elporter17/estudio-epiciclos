# Auditoría de Direct Post (TikTok Content Posting API)

Guía para pedir la auditoría que quita las restricciones de Direct Post. Sin ella, TikTok solo deja publicar
directo en cuentas **privadas** y como `SELF_ONLY` (error `unaudited_client_can_only_post_to_private_accounts`).
La app «Circularte» ya pasó la revisión de la app (Production en vivo desde el 23-10-2026); esta auditoría es aparte.

Dónde: developers.tiktok.com → Manage apps → Circularte → Production → Products → Content Posting API →
Direct Post → **Apply**. Abre `developers.tiktok.com/application/content-posting-api`, un formulario de 4 pasos:
1. General Information · 2. API client information · 3. Supporting documents · 4. Review.

Las respuestas van en inglés (TikTok revisa en inglés). Cópialas y ajusta lo que esté entre `[corchetes]`.

---

## Antes de enviar (importante)

1. **Sin firma en el video.** Las guías prohíben marca, logo, marca de agua, enlace o texto promocional
   dentro del contenido que se sube. En la rama `feat/diario-directo-sin-ia` la firma (CirculArte +
   edav-tech.com) ya va apagada por defecto en la web, en `render` y en el diario; la web la guarda aparte para
   que nadie la tenga encendida por un ajuste viejo. **Fusiona la rama a `main` antes de grabar el demo**, para
   que la web en producción ya la tenga apagada.
2. **No menciones el diario automático.** Las guías ponen como uso NO aceptable «a utility tool to help upload
   contents to the account(s) you or your team manages». La solicitud debe describir la web pública, donde
   cualquier persona publica sus propios videos. Mientras se revisa, conviene dejar el diario en borrador.
3. **Graba un video demo nuevo** (ver la sección «Video demo»). Para que la publicación funcione en la grabación
   con la app sin auditar, pon @potter.play en **privada** durante la grabación (publicará como «Solo yo»).
   Después la vuelves a poner pública.
4. Revisa que la web en producción ya tenga las credenciales de Production (hecho el 24-10-2026).

---

## Paso 1 · General Information

**Full Name**
```
Erick Alvarado
```

**Organization name**
```
EDAV Tech (Erick Alvarado)
```

**Organization website**
```
https://edav-tech.com
```

**Describe your organization's work as it relates to TikTok**
```
EDAV Tech is an independent software studio run by Erick Alvarado, a senior full-stack developer. We build
CirculArte (https://circularte.edav-tech.com), a free public web app that turns any text, emoji, image or math
function into a short video drawn by spinning circles (Fourier series / epicycles). Anyone can create a video
in the browser, preview it and share it to their own TikTok account with the "Post to TikTok" button. We use
Login Kit so each creator connects their own account, and the Content Posting API so they can post their
original creation directly (or send it to their inbox as a draft) without downloading and re-uploading files.
```

**TikTok representative email address**: dejar vacío (no hay contacto en TikTok).

---

## Paso 2 · API client information

Los campos exactos de este paso solo se ven al pasar el paso 1. Estas son las respuestas para lo que suele
pedir; si un campo no coincide, dime qué dice y lo ajusto.

**App / client** → Circularte (App ID `7697354677700134932`). La client key la elige el formulario o la ves en
Credentials; no la pegues en ningún otro lado.

**Describe your use case / how your app uses Direct Post**
```
CirculArte is a public creative web app. A creator draws something in the browser (a word, an emoji, an
uploaded image or a math function), and the app animates it as a Fourier-series drawing made of spinning
circles and records it as an MP4 on the creator's own device. When the creator clicks "Post to TikTok":

1. They connect their own TikTok account with Login Kit (scopes user.info.basic, video.upload, video.publish).
2. We call creator_info and show their nickname, so they know which account will receive the video. If the
   creator cannot post right now, we stop and ask them to try later. We check max_video_post_duration_sec.
3. The post screen shows a preview of the video and lets them edit the title, pick the privacy level from the
   options returned by creator_info (no default value), and turn on Comment / Duet / Stitch (all off by default,
   disabled and greyed out when the account has them turned off).
4. Commercial content disclosure is off by default; "Your brand" and "Branded content" show the matching
   "Promotional content" / "Paid partnership" labels, the Post button stays disabled until one is selected, and
   "Only me" is disabled for branded content.
5. Before the Post button we show "By posting, you agree to TikTok's Music Usage Confirmation" (and the
   Branded Content Policy when applicable). Nothing is sent to TikTok until the creator clicks Post.
6. The video is uploaded with PULL_FROM_URL from our verified domain (circularte.edav-tech.com), then we poll
   publish/status/fetch and tell the creator that it may take a few minutes to appear on their profile.

Creators can also choose "Send as draft" (video.upload) to finish the post inside the TikTok app.
All content is original: it is generated by the creator in our app from their own input. We do not copy content
from other platforms, and we do not add watermarks, logos or promotional text to the video.
```

**Who are your users? / Intended audience**
```
The general public: students, teachers, math and art enthusiasts and content creators who want to share
satisfying math-art videos they made themselves. The site is free and open to anyone; each user posts only to
their own TikTok account.
```

**Estimated usage** (si pide números; el tope diario de creadores se fija con esto, así que mejor no quedarse
corto ni exagerar)
```
Estimated daily active creators posting through the API: [50]
Estimated posts per day: [100]
Expected growth over the next 6 months: [up to 500 daily creators]
```

**How do you ensure users have control over what is posted?**
```
Every post starts with an explicit click by the creator on our post screen, which shows a preview of the exact
video, the target account nickname and all editable metadata (title, privacy, interactions, commercial
disclosure). We never post automatically, never post to accounts other than the one the creator connected, and
creators can disconnect at any time (we revoke the token). Session data is stored only in an encrypted cookie;
we keep no database of user tokens.
```

---

## Paso 3 · Supporting documents

Sube:
1. **Video demo** del flujo completo (ver abajo). MP4/MOV; si es largo, en partes.
2. **Capturas** (si pide imágenes o documentos):
   - La pantalla «Publicar en TikTok» con el nickname, la vista previa, el selector de privacidad sin valor
     elegido y las casillas de interacción apagadas.
   - La divulgación de contenido comercial encendida con «Your brand» y con «Branded content», mostrando la
     etiqueta y la frase de consentimiento.
   - El mensaje de estado final («Puede tardar unos minutos en aparecer en tu perfil»).
   - Las páginas de Privacidad y Términos: `https://circularte.edav-tech.com/privacidad.html` y
     `https://circularte.edav-tech.com/terminos.html`.

### Video demo (guion, 2 a 4 minutos)

Graba la pantalla del navegador con la barra de direcciones visible (el dominio debe ser
`circularte.edav-tech.com`, igual que el de la app). Pon la web en inglés con el selector ES/EN, porque lo revisan
en inglés. Revisa que «Signature on the video» esté apagada. Pon @potter.play en privada mientras grabas.

1. Abre `https://circularte.edav-tech.com`. Muestra el sitio y los enlaces a Privacy y Terms.
2. Crea una figura (por ejemplo, un emoji o un texto) y deja que se dibuje. Muestra que el video se graba.
3. Pulsa **Post to TikTok**. Se abre la ventana de **Login Kit**: inicia sesión y autoriza los permisos
   (se deben ver `user.info.basic`, `video.upload` y `video.publish`).
4. En la pantalla de publicación, muestra despacio:
   - el **nickname** de la cuenta;
   - la **vista previa** del video;
   - el **título** editable (cámbialo);
   - el menú de **privacidad sin valor elegido** y luego elige una opción a mano;
   - **Comment / Duet / Stitch** apagados y enciende uno a mano;
   - la **divulgación comercial**: enciéndela, muestra que Post queda desactivado sin opción, marca
     «Your brand» (etiqueta «Promotional content»), luego «Branded content» (etiqueta «Paid partnership», «Only me»
     desactivado y la frase con Branded Content Policy); vuelve a apagarla;
   - la frase **«By posting, you agree to TikTok's Music Usage Confirmation»** encima del botón.
5. Pulsa **Post**. Muestra los mensajes de estado y el aviso de que puede tardar unos minutos.
6. Abre TikTok (app o web) en la cuenta y muestra el video publicado.
7. Repite con **Send as draft** (video.upload) y muestra la notificación en la bandeja de TikTok.
8. Muestra cómo **desconectar** la cuenta.

---

## Paso 4 · Review

Revisa todo y envía. La respuesta llega en el portal (Review comments) y por correo. Si piden cambios, los
pedirán ahí; tráelos y los resolvemos.

## Después de la aprobación

- La publicación directa en público funcionará en la web y en la CLI (`npm run publish -- --mode direct
  --privacy PUBLIC_TO_EVERYONE`).
- El diario directo vuelve a ser posible técnicamente, pero sigue siendo el uso que las guías no aceptan; si
  TikTok lo detecta, puede retirar el acceso a la app y con eso dejaría de funcionar también la web.
