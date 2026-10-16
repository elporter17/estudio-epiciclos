// GET: ¿está configurada la publicación y hay una cuenta conectada? La web decide con esto si muestra el botón.
import { config, json, cookies, unseal, SESSION_COOKIE } from './_tiktok.js';

export default async function handler(request) {
  const c = config();
  const s = c.enabled ? unseal(cookies(request)[SESSION_COOKIE] || '') : null;
  return json({ enabled: c.enabled, connected: !!(s && s.rexp > Date.now()) });
}
