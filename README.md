# Estudio Epiciclos

Dibuja cualquier imagen, texto o función con epiciclos de Fourier y graba cada reproducción como video.

Dos cadenas de círculos (una para `x(t)`, otra para `y(t)`) trazan la figura mientras el número de términos sube (N = 1, 3, 6 … 200) y el error baja. Al final queda solo la imagen, con las fórmulas de la serie.

## Uso

Abre `index.html` en Chrome o Edge. Es un solo archivo, sin instalación ni servidor.

- **Imagen**: elige, arrastra o pega (Ctrl+V) una imagen. Modo *Silueta* para logos, *Bordes* para fotos.
- **Funciones**: corazón, LOVE, amor, infinito, mariposa, espirógrafo y otras figuras clásicas.
- **Texto**: cualquier palabra, símbolo o emoji en cuatro tipos de letra.
- **Inventar**: genera funciones aleatorias, edítalas (`16 sin(t)^3`), mútalas y guarda tus favoritas.
- **Videos**: con «Grabar video» marcado, cada reproducción queda en *Mis videos* lista para guardar (MP4 o WebM según el navegador). Formatos 9:16, 1:1 y 16:9 en 720p o 1080p.

Mantén la pestaña visible mientras graba; si queda oculta, el video sale entrecortado.

## Cómo funciona

1. La imagen se convierte en una máscara y se extraen sus contornos con *marching squares*.
2. Los contornos se unen en un solo recorrido cerrado y se remuestrean a 2048 puntos por longitud de arco.
3. Se calcula la serie de Fourier de `x(t)` y `y(t)` (hasta 500 términos). El error mostrado es la energía que falta según Parseval.
4. Cada término es un círculo de radio `√(a_k² + b_k²)` que gira a velocidad `k`.
5. El lienzo se graba con `MediaRecorder`.
