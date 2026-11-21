// Estilos visuales para las historias 2D (scripts/historia.mjs). «visual_style» va en inglés porque se repite en cada
// prompt de imagen; el mismo texto sirve para retratos, poses, props y fondos, así todo se ve de la misma mano.
export const ESTILOS = {
  // Parecido al de los TikToks de historias animadas: personajes redondeados de cabeza grande y colores vivos
  cartoon3d: {
    nombre: 'Cartoon 3D de película infantil',
    visual_style: 'Cute stylized 3D-rendered cartoon in the look of a modern animated family movie: smooth rounded characters with oversized heads, simple friendly faces with big expressive eyes, soft studio lighting, saturated cheerful colors, clean simple shapes, soft depth of field in the backgrounds. Clearly a cartoon, never photorealistic, no text anywhere.',
    framing: 'Vertical 9:16 animated cartoon still. Faces and key action in the upper two thirds; the lower third is calm background (subtitles go there).',
    portrait_framing: 'Character reference sheet portrait for an animated cartoon. Waist-up, facing the camera, friendly neutral expression, plain light-gray background, soft even light, sharp focus.',
    subs: { color: '#FFFFFF', active: '#FF4FA3' }
  },
  // El de las sátiras de Honduras (caricatura de periódico)
  caricatura: {
    nombre: 'Caricatura editorial dibujada a mano',
    visual_style: 'Hand-drawn editorial newspaper caricature illustration: confident black ink outlines with slight line-weight variation, flat digital coloring with soft cel shading, hugely exaggerated heads like a Latin American political cartoonist, bright tropical colors, subtle paper grain. Clearly a drawing, never 3D, never photorealistic.',
    framing: 'Vertical 9:16 hand-drawn editorial caricature illustration. Faces and key action in the upper two thirds; the lower third is calm background (subtitles go there).',
    portrait_framing: 'Character reference portrait for an editorial caricature series. Waist-up, facing the camera, neutral expression, plain light-gray background, even light.',
    subs: {}
  },
  // Formas planas y paleta corta: sale barato y se ve limpio para datos y ciencia
  plano: {
    nombre: 'Ilustración vectorial plana',
    visual_style: 'Flat vector illustration with bold simple shapes, a limited bright palette, thick rounded outlines, no gradients, no textures, friendly characters with round heads and dot eyes. Clean modern explainer-video look, never photorealistic, no text anywhere.',
    framing: 'Vertical 9:16 flat vector illustration. Faces and key action in the upper two thirds; the lower third is calm background (subtitles go there).',
    portrait_framing: 'Character reference portrait in flat vector style. Waist-up, facing the camera, neutral expression, plain light background.',
    subs: { active: '#22D3EE' }
  }
};
