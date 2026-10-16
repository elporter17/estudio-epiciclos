// GET: datos del creador para la pantalla de publicación (nickname, privacidad permitida, interacciones, duración máxima).
import { route, json, session, tiktok } from './_tiktok.js';

export default route(async (request) => {
  const { session: s, cookie } = await session(request);
  const d = await tiktok('/v2/post/publish/creator_info/query/', undefined, s);
  return json({
    nickname: d.creator_nickname, username: d.creator_username, avatar: d.creator_avatar_url,
    privacy_level_options: d.privacy_level_options || [], comment_disabled: !!d.comment_disabled,
    duet_disabled: !!d.duet_disabled, stitch_disabled: !!d.stitch_disabled, max_video_post_duration_sec: d.max_video_post_duration_sec || null
  }, 200, cookie ? { 'set-cookie': cookie } : {});
});
