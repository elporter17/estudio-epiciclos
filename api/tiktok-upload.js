// POST: tokens de subida directa del navegador a Vercel Blob (el video no pasa por esta función).
// Solo con una sesión de TikTok válida; solo videos, en la carpeta media/, con nombre aleatorio.
// La confirmación final la manda Vercel Blob sin cookie, por eso la sesión se valida al generar el token.
import { handleUpload } from '@vercel/blob/client';
import { route, json, session, MEDIA_PREFIX, HttpError } from './_tiktok.js';

export default route(async (request) => {
  if (request.method !== 'POST') return json({ error: 'Usa POST.' }, 405);
  const body = await request.json();
  const result = await handleUpload({
    body, request,
    onBeforeGenerateToken: async (pathname) => {
      const { session: s } = await session(request);
      if (!pathname.startsWith(MEDIA_PREFIX) || !/\.(mp4|webm|mov)$/i.test(pathname)) throw new HttpError(400, 'Nombre de archivo no permitido.');
      return {
        allowedContentTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
        maximumSizeInBytes: 300 * 1024 * 1024,
        addRandomSuffix: true,
        validUntil: Date.now() + 15 * 60e3,
        tokenPayload: JSON.stringify({ open_id: s.open_id })
      };
    },
    onUploadCompleted: async () => {}
  });
  return json(result);
});
