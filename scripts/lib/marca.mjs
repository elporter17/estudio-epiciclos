// Nombre de la marca que se dibuja en los videos y tarjetas. Por defecto «Potter Play»; para el perfil personal
// se genera con MARCA=EA (variable de entorno) y todo sale con esa firma y sin «Potter Play».
export const MARCA = (process.env.MARCA || 'Potter Play').trim() || 'Potter Play';
export const ES_PERSONAL = MARCA !== 'Potter Play';
